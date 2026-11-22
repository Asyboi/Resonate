// The state of one discovery or resonance run, as the map shows it.
import type { Resonance, YouCall } from "./types";

export type Loop = { comment: string; found: Resonance | null; personIds: string[]; pulseAt: number | null };

export type Run = {
  running: boolean;
  ticker: string | null;
  searches: number;
  pages: number;
  checks: number;
  research: number;
  failed: string[];
  error: string | null;
  /** Showing results from an earlier run. */
  saved: boolean;
  loop: Loop | null;
};

export const IDLE: Run = {
  running: false,
  ticker: null,
  searches: 0,
  pages: 0,
  checks: 0,
  research: 0,
  failed: [],
  error: null,
  saved: false,
  loop: null,
};

export function countCall(run: Run, message: string, you: YouCall | undefined): Run {
  if (!you) return { ...run, ticker: message };
  const calls = you.calls ?? 0;
  return {
    ...run,
    ticker: `${you.endpoint}: ${message.replace(/^Searching: /, "")}`,
    searches: run.searches + (you.endpoint === "Search" ? calls : 0),
    checks: run.checks + (you.endpoint === "Contents" ? calls : 0),
    research: run.research + (you.endpoint === "Research" ? calls : 0),
    pages: run.pages + (you.pages ?? 0),
  };
}
