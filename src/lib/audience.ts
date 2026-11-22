// Pure rules for the creator's audience line. Safe to import in the browser.
import type { Seed } from "./discover";
import type { Lesson } from "./types";

export const MAX_AUDIENCE = 160;
const MAX_QUERY = 300;
const SEARCHES_PER_LESSON = 3;

// Counts, handles and links are the parts of analytics and comments that can identify someone.
const IDENTIFYING = /[\d@]|https?:|www\./i;

/** One line of broad groups, short enough to read before it's searched. */
export function isAudienceLine(text: string): boolean {
  const line = text.trim();
  return line.length >= 3 && line.length <= MAX_AUDIENCE && !/[\r\n]/.test(line) && !IDENTIFYING.test(line);
}

/** The aimed search takes one of each lesson's three slots. The other two stay broad. */
export function audienceSeeds(lessons: Lesson[], aimed: { lessonId: string; query: string }[]): Seed[] {
  return lessons.flatMap((lesson) => {
    const query = aimed.find((item) => item.lessonId === lesson.id)?.query.trim();
    const usable = query && query.length <= MAX_QUERY && !IDENTIFYING.test(query);
    const queries = usable ? [query, ...lesson.queries.slice(0, SEARCHES_PER_LESSON - 1)] : lesson.queries;
    return queries.map((text): Seed => ({ lessonId: lesson.id, query: text, origin: "discovery" }));
  });
}
