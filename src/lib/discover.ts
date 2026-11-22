import { createHash } from "node:crypto";
import { extractPublished, isRecent } from "./dates";
import { quoteAppears } from "./quotes";
import type { DiscoverEvent, Lesson, Match, Origin } from "./types";
import type { Hit, Page } from "./you";

const MAX_CANDIDATES = 15;
const MAX_FINALISTS = 5;
const MIN_STRENGTH = 3;

export type Seed = { lessonId: string; query: string; origin: Origin };

export type Keep = {
  index: number;
  situation: string;
  quote: string;
  matches: { lessonId: string; strength: number; why: string }[];
};

export type DiscoverDeps = {
  now(): Date;
  search(query: string, signal?: AbortSignal): Promise<Hit[]>;
  contents(urls: string[], signal?: AbortSignal): Promise<Page[]>;
  research(audiences: string[], signal?: AbortSignal): Promise<{ lessonIndex: number; query: string }[]>;
  judge(lessons: Lesson[], candidates: Hit[], signal?: AbortSignal): Promise<Keep[]>;
};

export function seedsFrom(lessons: Lesson[]): Seed[] {
  return lessons.flatMap((lesson) =>
    lesson.queries.map((query): Seed => ({ lessonId: lesson.id, query, origin: "discovery" })),
  );
}

function canonical(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

/** Takes the best of each search in turn, so one query can't fill every slot. */
function interleave(lists: Hit[][]): Hit[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, i) => lists.flatMap((list) => list[i] ?? [])).flat();
}

export async function* discover(
  args: { lessons: Lesson[]; seeds: Seed[]; withResearch: boolean; signal: AbortSignal },
  deps: DiscoverDeps,
): AsyncGenerator<DiscoverEvent> {
  const { lessons, seeds, withResearch } = args;
  const stop = new AbortController();
  const signal = AbortSignal.any([args.signal, stop.signal]);

  const queue: DiscoverEvent[] = [];
  let wake = () => {};
  const emit = (event: DiscoverEvent) => {
    queue.push(event);
    wake();
  };

  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const claimed = new Set<string>();

  async function runLesson(lessonId: string, group: Seed[]) {
    if (signal.aborted) return;

    const lists = await Promise.all(
      group.map(async ({ query }) => {
        emit({ type: "status", lessonId, message: `Searching: ${query}` });
        try {
          return await deps.search(query, signal);
        } catch {
          if (!signal.aborted) emit({ type: "error", lessonId, message: `Search failed: ${query}` });
          return [];
        }
      }),
    );
    if (signal.aborted) return;

    const now = deps.now();
    const candidates: Hit[] = [];
    for (const hit of interleave(lists)) {
      if (candidates.length >= MAX_CANDIDATES) break;
      const key = canonical(hit.url);
      if (!key || claimed.has(key) || !isRecent(hit.pageAge, now)) continue;
      claimed.add(key);
      candidates.push(hit);
    }
    const total = lists.reduce((sum, list) => sum + list.length, 0);
    emit({ type: "status", lessonId, message: `${total} pages found, ${candidates.length} new and recent` });
    if (candidates.length === 0) return;

    const best = (keep: Keep) => Math.max(...keep.matches.map((match) => match.strength));
    const finalists = (await deps.judge(lessons, candidates, signal))
      .filter((keep) => candidates[keep.index])
      .map((keep) => ({
        ...keep,
        matches: keep.matches.filter(
          (match) => lessonIds.has(match.lessonId) && match.strength >= MIN_STRENGTH && match.strength <= 5,
        ),
      }))
      .filter((keep) => keep.matches.length > 0)
      .sort((a, b) => best(b) - best(a))
      .slice(0, MAX_FINALISTS);
    if (finalists.length === 0 || signal.aborted) return;

    emit({ type: "status", lessonId, message: `Checking quote and date on ${finalists.length} pages` });
    let pages: Page[] = [];
    try {
      pages = await deps.contents(
        finalists.map((keep) => candidates[keep.index].url),
        signal,
      );
    } catch {
      emit({ type: "status", lessonId, message: "Couldn't open pages, checking against search highlights" });
    }
    if (signal.aborted) return;

    for (const keep of finalists) {
      const hit = candidates[keep.index];
      const url = canonical(hit.url)!;
      const page = pages.find((candidate) => canonical(candidate.url) === url);
      const sources = page?.markdown ? [page.markdown] : hit.highlights;
      if (!sources.some((source) => quoteAppears(keep.quote, source))) continue;

      const pageDate = page?.html ? extractPublished(page.html) : null;
      const publishedAt = pageDate ?? hit.pageAge!;
      if (!isRecent(publishedAt, now)) continue;

      const id = createHash("sha256").update(url).digest("hex").slice(0, 16);
      emit({
        type: "person",
        person: {
          id,
          situation: keep.situation,
          quote: keep.quote,
          url,
          site: new URL(url).hostname.replace(/^www\./, ""),
          publishedAt,
          dateSource: pageDate ? "page" : "search",
          origin: group[0].origin,
        },
        matches: keep.matches.map(
          ({ lessonId, strength, why }): Match => ({
            personId: id,
            lessonId,
            strength: strength as Match["strength"],
            why,
          }),
        ),
      });
    }
  }

  async function runWave(wave: Seed[]) {
    const groups = Map.groupBy(wave, (seed) => seed.lessonId);
    await Promise.all(
      [...groups].map(([lessonId, group]) =>
        runLesson(lessonId, group).catch((error: unknown) => {
          if (signal.aborted) return;
          console.error("discover:", lessonId, error instanceof Error ? error.message : error);
          emit({ type: "error", lessonId, message: "Couldn't finish this lesson. Try it again." });
        }),
      ),
    );
  }

  async function runResearch() {
    if (!withResearch || signal.aborted) return;
    emit({ type: "status", message: "Researching what these people are dealing with" });
    let found: { lessonIndex: number; query: string }[];
    try {
      found = await deps.research(
        lessons.map((lesson) => lesson.whoItsFor),
        signal,
      );
    } catch {
      emit({ type: "status", message: "Research was unavailable, showing what Search found" });
      return;
    }
    const wave = lessons.flatMap((lesson, index) =>
      found
        .filter((item) => item.lessonIndex === index)
        .slice(0, 2)
        .map((item): Seed => ({ lessonId: lesson.id, query: item.query, origin: "research" })),
    );
    await runWave(wave);
  }

  let finished = false;
  void Promise.all([runWave(seeds), runResearch()]).finally(() => {
    finished = true;
    wake();
  });

  try {
    for (;;) {
      if (queue.length > 0) yield queue.shift()!;
      else if (finished) break;
      else await new Promise<void>((resolve) => (wake = resolve));
    }
    if (!signal.aborted) yield { type: "done" };
  } finally {
    stop.abort();
  }
}
