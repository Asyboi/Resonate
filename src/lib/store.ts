// The creator's data stays in this browser. The demo code is kept separately.
import { get, set } from "idb-keyval";
import type { Brief, Context, Lesson, Match, Person } from "./types";

const KEY = "resonate:v1";

export type Saved = {
  contexts: Context[];
  lessons: Lesson[];
  people: Person[];
  matches: Match[];
  runAt: string | null;
  briefs: Record<string, Brief>;
};

export const EMPTY: Saved = { contexts: [], lessons: [], people: [], matches: [], runAt: null, briefs: {} };

export async function load(): Promise<Saved> {
  try {
    return { ...EMPTY, ...(await get<Partial<Saved>>(KEY)) };
  } catch {
    return EMPTY;
  }
}

export async function save(saved: Saved): Promise<void> {
  try {
    await set(KEY, saved);
  } catch (error) {
    console.error("store:", error);
  }
}
