// Pure ranking and shaping for the map.
import type { Lesson, Match, Person } from "./types";

export type GraphNode =
  | { id: string; kind: "lesson"; text: string; connections: number }
  | { id: string; kind: "person"; text: string; origin: Person["origin"] };

export type GraphLink = { source: string; target: string; lessonId: string; personId: string; strength: Match["strength"] };

export type Selection = { lessonId: string; personId: string };

const PER_LESSON = 5;

export function rankFor(lessonId: string, matches: Match[]): Match[] {
  return matches.filter((match) => match.lessonId === lessonId).sort((a, b) => b.strength - a.strength);
}

/** The best 5 per lesson, plus everyone found through resonance, so a cluster can always grow. */
export function topMatches(people: Person[], matches: Match[], perLesson = PER_LESSON): Match[] {
  const resonant = new Set(people.filter((person) => person.origin === "resonance").map((person) => person.id));
  return [...new Set(matches.map((match) => match.lessonId))].flatMap((lessonId) => {
    const ranked = rankFor(lessonId, matches);
    return [
      ...ranked.filter((match) => !resonant.has(match.personId)).slice(0, perLesson),
      ...ranked.filter((match) => resonant.has(match.personId)),
    ];
  });
}

export function strongestLesson(matches: Match[]): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const lessonId of new Set(matches.map((match) => match.lessonId))) {
    const score = rankFor(lessonId, matches)
      .slice(0, 3)
      .reduce((sum, match) => sum + match.strength, 0);
    if (score > bestScore) [best, bestScore] = [lessonId, score];
  }
  return best;
}

export function defaultSelection(matches: Match[]): Selection | null {
  const lessonId = strongestLesson(matches);
  return lessonId ? { lessonId, personId: rankFor(lessonId, matches)[0].personId } : null;
}

export function toGraph(lessons: Lesson[], people: Person[], matches: Match[]): { nodes: GraphNode[]; links: GraphLink[] } {
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const personIds = new Set(people.map((person) => person.id));
  const valid = matches.filter((match) => lessonIds.has(match.lessonId) && personIds.has(match.personId));
  const linked = new Set(valid.map((match) => match.personId));
  return {
    nodes: [
      ...lessons.map(
        (lesson): GraphNode => ({
          id: lesson.id,
          kind: "lesson",
          text: lesson.label,
          connections: valid.filter((match) => match.lessonId === lesson.id).length,
        }),
      ),
      ...people
        .filter((person) => linked.has(person.id))
        .map((person): GraphNode => ({ id: person.id, kind: "person", text: person.label, origin: person.origin })),
    ],
    links: valid.map(({ lessonId, personId, strength }) => ({ source: lessonId, target: personId, lessonId, personId, strength })),
  };
}
