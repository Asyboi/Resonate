import { expect, test, vi } from "vitest";
import { discover, seedsFrom, type DiscoverDeps } from "../src/lib/discover";
import type { DiscoverEvent, Lesson } from "../src/lib/types";

const NOW = new Date("2026-11-22T17:00:00Z");
const QUOTE = "I feel guilty every time I stop to rest";
const URL_A = "https://example.com/essay";

const lesson = (id: string, queries = [`query ${id}`]): Lesson => ({
  id,
  label: id,
  lesson: id,
  moment: null,
  whoItsFor: `people who need ${id}`,
  evidence: [],
  queries,
});

const hit = (url = URL_A, pageAge: string | undefined = "2026-11-20T12:00:00Z") => ({
  url,
  title: "Essay",
  pageAge,
  highlights: [QUOTE],
});

function fakes(overrides: Partial<DiscoverDeps> = {}): DiscoverDeps {
  return {
    now: () => NOW,
    search: vi.fn(async () => [hit()]),
    contents: vi.fn(async (urls: string[]) =>
      urls.map((url) => ({
        url,
        html: '<meta property="article:published_time" content="2026-11-19T12:00:00Z">',
        markdown: QUOTE,
      })),
    ),
    research: vi.fn(async () => []),
    judge: vi.fn(async (_lessons, candidates) =>
      candidates.map((_: unknown, index: number) => ({
        index,
        label: "Afraid to rest",
        situation: "Afraid to rest",
        quote: QUOTE,
        matches: [{ lessonId: "a", strength: 4, why: "Same situation" }],
      })),
    ),
    ...overrides,
  };
}

async function run(
  deps: DiscoverDeps,
  { lessons = [lesson("a")], withResearch = false, signal = new AbortController().signal } = {},
) {
  const events: DiscoverEvent[] = [];
  for await (const event of discover({ lessons, seeds: seedsFrom(lessons), withResearch, signal }, deps)) {
    events.push(event);
  }
  return events;
}

const people = (events: DiscoverEvent[]) => events.flatMap((event) => (event.type === "person" ? [event] : []));

test("never judges a hit with no date", async () => {
  const deps = fakes({ search: async () => [{ ...hit(), pageAge: undefined }] });
  await run(deps);
  expect(deps.judge).not.toHaveBeenCalled();
});

test("never judges a hit older than 7 days", async () => {
  const deps = fakes({ search: async () => [hit(URL_A, "2026-11-01T12:00:00Z")] });
  await run(deps);
  expect(deps.judge).not.toHaveBeenCalled();
});

test("drops a page whose own date is old", async () => {
  const deps = fakes({
    contents: async () => [{ url: URL_A, html: '{"datePublished":"2026-11-14T22:00:00-05:00"}', markdown: QUOTE }],
  });
  expect(people(await run(deps))).toHaveLength(0);
});

test("labels the date as from search when the page has none", async () => {
  const deps = fakes({ contents: async () => [{ url: URL_A, html: "<p>hello</p>", markdown: QUOTE }] });
  expect(people(await run(deps))[0].person.dateSource).toBe("search");
});

test("carries the short node label", async () => {
  expect(people(await run(fakes()))[0].person.label).toBe("Afraid to rest");
});

test("prefers the page's own date", async () => {
  const { person } = people(await run(fakes()))[0];
  expect(person.dateSource).toBe("page");
  expect(person.publishedAt).toBe("2026-11-19T12:00:00.000Z");
});

test("drops a quote that is not on the page", async () => {
  const deps = fakes({ contents: async () => [{ url: URL_A, html: "", markdown: "Something else entirely" }] });
  expect(people(await run(deps))).toHaveLength(0);
});

test("falls back to highlights when Contents fails", async () => {
  const deps = fakes({
    contents: async () => {
      throw new Error("down");
    },
  });
  expect(people(await run(deps))[0].person.dateSource).toBe("search");
});

test("drops an invented quote when Contents fails", async () => {
  const deps = fakes({
    contents: async () => {
      throw new Error("down");
    },
    judge: async () => [
      {
        index: 0,
        label: "Invented",
        situation: "Invented",
        quote: "I never wrote any of these words at all",
        matches: [{ lessonId: "a", strength: 5, why: "x" }],
      },
    ],
  });
  expect(people(await run(deps))).toHaveLength(0);
});

test("judges the same URL once across searches", async () => {
  const deps = fakes({ search: async (query) => [hit(query === "one" ? `${URL_A}?utm_source=x` : `${URL_A}/`)] });
  await run(deps, { lessons: [lesson("a", ["one", "two"])] });
  expect(vi.mocked(deps.judge).mock.calls[0][1]).toHaveLength(1);
});

test("links one person to two lessons and ignores invalid matches", async () => {
  const deps = fakes({
    judge: async () => [
      {
        index: 0,
        label: "Afraid to rest",
        situation: "Afraid to rest",
        quote: QUOTE,
        matches: [
          { lessonId: "a", strength: 5, why: "x" },
          { lessonId: "b", strength: 3, why: "y" },
          { lessonId: "made-up", strength: 5, why: "z" },
        ],
      },
    ],
  });
  const found = people(await run(deps, { lessons: [lesson("a"), lesson("b")] }));
  expect(found).toHaveLength(1);
  expect(found[0].matches.map((match) => match.lessonId)).toEqual(["a", "b"]);
});

test("ignores matches below strength 3", async () => {
  const deps = fakes({
    judge: async () => [
      { index: 0, label: "x", situation: "x", quote: QUOTE, matches: [{ lessonId: "a", strength: 2, why: "weak" }] },
    ],
  });
  expect(people(await run(deps))).toHaveLength(0);
});

test("reports a failed search and keeps the others", async () => {
  const deps = fakes({
    search: async (query) => {
      if (query === "bad") throw new Error("down");
      return [hit()];
    },
  });
  const events = await run(deps, { lessons: [lesson("a", ["bad", "good"])] });
  expect(events).toContainEqual(expect.objectContaining({ type: "error", lessonId: "a" }));
  expect(people(events)).toHaveLength(1);
});

test("streams the first wave before Research returns", async () => {
  let finish!: (value: []) => void;
  const deps = fakes({ research: () => new Promise<[]>((resolve) => (finish = resolve)) });
  const lessons = [lesson("a")];
  const events = discover(
    { lessons, seeds: seedsFrom(lessons), withResearch: true, signal: new AbortController().signal },
    deps,
  );
  let sawPerson = false;
  for await (const event of events) {
    if (event.type === "person") {
      sawPerson = true;
      finish([]);
    }
  }
  expect(sawPerson).toBe(true);
});

test("runs Research searches as a second wave", async () => {
  const deps = fakes({
    research: async () => [{ lessonIndex: 0, query: "wave two" }],
    search: async (query) => (query === "wave two" ? [hit("https://example.com/second")] : []),
  });
  expect(people(await run(deps, { withResearch: true }))[0].person.origin).toBe("research");
});

test("a Research failure is never fatal", async () => {
  const deps = fakes({
    research: async () => {
      throw new Error("down");
    },
  });
  const events = await run(deps, { withResearch: true });
  expect(people(events)).toHaveLength(1);
  expect(events.at(-1)).toEqual({ type: "done" });
});

test("makes no calls once aborted", async () => {
  const deps = fakes();
  await run(deps, { signal: AbortSignal.abort(), withResearch: true });
  expect(deps.search).not.toHaveBeenCalled();
  expect(deps.research).not.toHaveBeenCalled();
});

test("does not report zero pages when every search failed", async () => {
  const deps = fakes({
    search: async () => {
      throw new Error("down");
    },
  });
  expect(await run(deps)).not.toContainEqual(expect.objectContaining({ message: "0 pages found, 0 new and recent" }));
});

test("regression: drops an old page that Search dated inside the window", async () => {
  const deps = fakes({
    search: async () => [hit(URL_A, "2026-11-15T19:59:00Z")],
    contents: async () => [
      { url: URL_A, html: '<h1>Burnout</h1><time datetime="2026-11-14T22:00:00-05:00">Nov 14</time>', markdown: QUOTE },
    ],
  });
  expect(people(await run(deps))).toHaveLength(0);
});

test("an unverified date near the 7-day edge is not trusted", async () => {
  const deps = fakes({
    search: async () => [hit(URL_A, "2026-11-15T19:59:00Z")],
    contents: async () => [{ url: URL_A, html: "<p>hello</p>", markdown: QUOTE }],
  });
  expect(people(await run(deps))).toHaveLength(0);
});
