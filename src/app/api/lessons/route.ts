import { guard } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { LESSONS } from "@/lib/prompts";
import { isOwnQuote } from "@/lib/quotes";
import { LessonsBody, LessonsOutput } from "@/lib/schemas";
import type { Lesson } from "@/lib/types";

export const maxDuration = 120;

const MAX_LESSONS = 6;

export async function POST(request: Request) {
  const checked = await guard(request, LessonsBody);
  if ("response" in checked) return checked.response;
  const { contexts, existing } = checked.data;
  try {
    const output = await structured({
      system: LESSONS,
      input: { contexts, existingLessons: existing },
      schema: LessonsOutput,
      effort: "low",
      signal: request.signal,
    });
    const textOf = new Map(contexts.map((context) => [context.id, context.text]));
    const lessons = output.lessons.flatMap((found): Lesson[] => {
      // A lesson with no real quote from the creator's own words is not their lesson.
      const evidence = found.evidence.filter((item) => isOwnQuote(item.quote, textOf.get(item.contextId) ?? ""));
      const queries = found.queries.filter(Boolean).slice(0, 3);
      return evidence.length && queries.length ? [{ ...found, id: crypto.randomUUID(), evidence, queries }] : [];
    });
    return Response.json({ lessons: lessons.slice(0, Math.max(0, MAX_LESSONS - existing.length)) });
  } catch (error) {
    console.error("lessons:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't find lessons. Try again." }, { status: 502 });
  }
}
