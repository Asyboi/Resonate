"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Selection } from "@/lib/graph";
import type { Run } from "@/lib/run";
import type { Lesson, Match, Person } from "@/lib/types";
import { DetailPanel } from "./DetailPanel";
import { ResonanceBox, LoopPanel } from "./ResonanceBox";
import { ErrorLine, Primary, Secondary } from "./ui";

const LessonGraph = dynamic(() => import("./LessonGraph"), { ssr: false });

const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const plural = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

function heading(run: Run): string {
  if (!run.loop) return "Who needs you today?";
  const count = run.loop.personIds.length;
  if (count) return `${count} more ${count === 1 ? "needs" : "need"} you`;
  return run.running ? "Who else feels this?" : "No one new found";
}

function YouPill({ run, runAt }: { run: Run; runAt: string | null }) {
  const totals = [
    run.searches && `Search ×${run.searches}`,
    run.research && `Research ×${run.research}`,
    run.checks && `Contents ×${run.checks}`,
    run.pages && plural(run.pages, "page"),
  ]
    .filter(Boolean)
    .join(" · ");
  const text = run.running
    ? (run.ticker ?? "Connecting")
    : run.saved && runAt
      ? `Saved run from ${clock(runAt)}`
      : totals || "Ready to search";

  return (
    <p className="flex h-10 max-w-full min-w-0 items-center gap-3 rounded-full bg-panel px-4 text-[16px]" aria-live="polite">
      <span className={`size-2.5 shrink-0 rounded-full bg-blue ring-4 ring-line ${run.running ? "animate-pulse" : ""}`} />
      <span className="shrink-0 font-bold text-blue">You.com</span>
      <span className="truncate text-muted">{text}</span>
      {run.running && run.pages > 0 && <span className="shrink-0 font-semibold">{plural(run.pages, "page")}</span>}
    </p>
  );
}

export function MapScreen({
  lessons,
  people,
  matches,
  run,
  runAt,
  selection,
  onSelect,
  onSearch,
  onRetry,
  onResonate,
  onWrite,
  onLessons,
}: {
  lessons: Lesson[];
  people: Person[];
  matches: Match[];
  run: Run;
  runAt: string | null;
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  onSearch: () => void;
  onRetry: (lessonIds: string[]) => void;
  onResonate: (comment: string) => void;
  onWrite: (selection: Selection) => void;
  onLessons: () => void;
}) {
  const { loop } = run;
  const highlight = useMemo(
    () => (loop?.found ? { lessonId: loop.found.lessonId, personIds: loop.personIds } : null),
    [loop],
  );
  const pulse = useMemo(
    () => (loop?.found && loop.pulseAt ? { lessonId: loop.found.lessonId, at: loop.pulseAt } : null),
    [loop],
  );

  const person = people.find((item) => item.id === selection?.personId);
  const match = matches.find((item) => item.personId === selection?.personId && item.lessonId === selection?.lessonId);

  const loopMatch = loop?.found
    ? matches
        .filter((item) => loop.personIds.includes(item.personId))
        .sort((a, b) => Number(b.lessonId === loop.found?.lessonId) - Number(a.lessonId === loop.found?.lessonId) || b.strength - a.strength)[0]
    : undefined;

  function emptyText(lessonId: string): string {
    if (run.failed.includes(lessonId)) return "Search failed";
    if (run.running && !loop) return "Searching";
    return runAt ? "No one found this week" : "Not searched yet";
  }

  if (lessons.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-8">
        <h1 className="font-display text-[44px] font-semibold">Start with your lessons</h1>
        <Primary onClick={onLessons}>Add lessons</Primary>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 gap-10 pt-2 pr-8 pb-6 pl-10">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-5 pt-2">
          <h1 className="font-display text-[clamp(34px,3.1vw,44px)] leading-[54px] font-semibold">{heading(run)}</h1>
          <ul className="flex shrink-0 items-center gap-5 text-[16px] text-muted">
            <li className="flex items-center gap-2">
              <span className="size-3.5 rounded-full bg-sky" /> Live
            </li>
            <li className="flex items-center gap-2">
              <ResonanceLegend /> Resonance
            </li>
          </ul>
        </div>
        <div className="mt-3 flex min-w-0 shrink-0 items-center gap-2">
          <YouPill run={run} runAt={runAt} />
          {!run.running && (
            <button
              type="button"
              onClick={run.failed.length ? () => onRetry(run.failed) : onSearch}
              className="h-10 shrink-0 rounded-full px-3 text-[16px] font-semibold text-blue hover:bg-wash"
            >
              {run.failed.length ? "Retry failed" : "Search again"}
            </button>
          )}
        </div>
        <ErrorLine message={run.error} />

        <div className="relative min-h-0 flex-1">
          <LessonGraph
            lessons={lessons}
            people={people}
            matches={matches}
            selection={selection}
            highlight={highlight}
            pulse={pulse}
            emptyText={emptyText}
            onSelect={onSelect}
          />
          {/* The canvas isn't reachable by keyboard or screen reader. */}
          <ul className="sr-only">
            {matches.map((item) => (
              <li key={`${item.lessonId}:${item.personId}`}>
                <button type="button" onClick={() => onSelect({ lessonId: item.lessonId, personId: item.personId })}>
                  {people.find((p) => p.id === item.personId)?.label}, for {lessons.find((l) => l.id === item.lessonId)?.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <ResonanceBox disabled={run.running} onSubmit={onResonate} />
      </section>

      <aside className="flex w-[clamp(360px,30.5vw,440px)] shrink-0 flex-col rounded-panel bg-panel p-[clamp(24px,4dvh,36px)] short:p-5">
        {loop ? (
          <LoopPanel
            loop={loop}
            people={people}
            running={run.running}
            onWrite={loopMatch ? () => onWrite({ lessonId: loopMatch.lessonId, personId: loopMatch.personId }) : null}
          />
        ) : person && match && selection ? (
          <DetailPanel person={person} match={match} onWrite={() => onWrite(selection)} />
        ) : (
          <div className="flex flex-1 flex-col justify-between">
            <h2 className="font-display text-[36px] leading-[44px] font-semibold">
              {run.running ? "Finding who needs you" : runAt ? "No one found this week" : "Not searched yet"}
            </h2>
            {!run.running && <Secondary onClick={onSearch}>Search now</Secondary>}
          </div>
        )}
      </aside>
    </main>
  );
}

function ResonanceLegend() {
  return <span className="m-1 size-3 rounded-full bg-resonance ring-2 ring-resonance ring-offset-3 ring-offset-white" />;
}
