import { guard } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { ANGLE } from "@/lib/prompts";
import { AngleBody, AngleOutput } from "@/lib/schemas";
import type { Citation, NicheLine } from "@/lib/types";
import { answer } from "@/lib/you";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, AngleBody);
  if ("response" in checked) return checked.response;
  const { lesson, situations } = checked.data;

  let found: { summary: string; citations: Citation[] } = { summary: "", citations: [] };
  try {
    found = await answer(`What are people saying about "${lesson.label}" for ${lesson.whoItsFor}?`, request.signal);
  } catch (error) {
    // No niche is not fatal: the creator's own story still carries the post.
    console.error("answer:", error instanceof Error ? error.message : error);
  }
  const sources = found.citations.filter((citation) => /^https?:\/\//.test(citation.source));

  try {
    const output = await structured({
      system: ANGLE,
      input: {
        lesson: lesson.lesson,
        evidence: lesson.evidence.map((item) => item.quote),
        situations,
        untrustedNiche: {
          summary: sources.length ? found.summary : "",
          sources: sources.map((citation, index) => ({ index, ...citation })),
        },
      },
      schema: AngleOutput,
      effort: "low",
      signal: request.signal,
    });
    const niche = output.niche.flatMap(({ text, sourceIndex }): NicheLine[] =>
      sources[sourceIndex] ? [{ text, source: sources[sourceIndex].source }] : [],
    );
    return Response.json({ niche: niche.slice(0, 3), angle: output.angle, question: output.question });
  } catch (error) {
    console.error("angle:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't find your angle." }, { status: 502 });
  }
}
