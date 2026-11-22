export type Context = { id: string; kind: "post" | "note" | "voice"; text: string };

export type Lesson = {
  id: string;
  label: string;
  lesson: string;
  moment: string | null;
  whoItsFor: string;
  evidence: { contextId: string; quote: string }[];
  queries: string[];
};

export type Origin = "discovery" | "research" | "resonance";

export type Person = {
  /** Hash of the canonical URL. */
  id: string;
  /** Node label: 2-3 words. Never a name. */
  label: string;
  /** Longer wording for the panel. Never a name. */
  situation: string;
  quote: string;
  url: string;
  site: string;
  publishedAt: string;
  dateSource: "page" | "search";
  /** The search that found them. */
  foundBy: string;
  origin: Origin;
  /** Their own page shows they're in one of the creator's audience groups. */
  likeAudience?: boolean;
};

export type Match = { personId: string; lessonId: string; strength: 1 | 2 | 3 | 4 | 5; why: string };

export type Citation = { source: string; excerpts: string[] };

export type NicheLine = { text: string; source: string };

export type Brief = {
  lessonId: string;
  /** Stays local, never in the brief text. */
  personIds: string[];
  niche: NicheLine[];
  angle: string;
  question: string;
  take: string;
  /** Always produced. Never depends on Stanley. */
  post: string;
  /** Exactly what is copied or sent. */
  text: string;
  /** Never sent to Stanley. */
  note: string;
  handoff: "none" | "copied" | "sent";
};

export type Resonance = { lessonId: string; situation: string; queries: string[] };

/** Which You.com call a status is reporting, so the screen can show the work. */
export type YouCall = { endpoint: "Search" | "Contents" | "Research"; calls?: number; pages?: number };

export type DiscoverEvent =
  | { type: "status"; lessonId?: string; message: string; you?: YouCall }
  | ({ type: "resonance" } & Resonance)
  | { type: "person"; person: Person; matches: Match[] }
  | { type: "error"; lessonId?: string; message: string }
  | { type: "done" };
