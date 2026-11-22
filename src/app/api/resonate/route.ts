import { anonymousQueries } from "@/lib/anonymize";
import { discover, type Seed } from "@/lib/discover";
import { guard } from "@/lib/guard";
import { liveDeps } from "@/lib/live";
import { structured } from "@/lib/llm";
import { RESONATE } from "@/lib/prompts";
import { ResonateBody, ResonateOutput } from "@/lib/schemas";
import { eventStream } from "@/lib/sse";
import type { DiscoverEvent } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const checked = await guard(request, ResonateBody);
  if ("response" in checked) return checked.response;
  const { comment, lessons, exclude, audience } = checked.data;

  async function* events(): AsyncGenerator<DiscoverEvent> {
    try {
      const output = await structured({
        system: RESONATE,
        input: {
          untrustedComment: comment,
          lessons: lessons.map(({ id, lesson, whoItsFor }) => ({ id, lesson, whoItsFor })),
        },
        schema: ResonateOutput,
        effort: "low",
        signal: request.signal,
      });
      const lesson = lessons.find((item) => item.id === output.lessonId);
      const queries = anonymousQueries(comment, output.queries).slice(0, 3);
      if (!lesson || queries.length === 0) {
        yield { type: "error", message: "Couldn't make a safe search from that comment." };
        return;
      }
      // The situation is shown and the queries are sent, so both pass the same check.
      const [situation = lesson.label] = anonymousQueries(comment, [output.situation]);
      yield { type: "resonance", lessonId: lesson.id, situation, queries };

      const seeds = queries.map((query): Seed => ({ lessonId: lesson.id, query, origin: "resonance" }));
      yield* discover({ lessons, seeds, withResearch: false, signal: request.signal, exclude, audience }, liveDeps);
    } catch (error) {
      console.error("resonate:", error instanceof Error ? error.message : error);
      yield { type: "error", message: "Couldn't read that comment. Try again." };
    }
  }

  return eventStream(events());
}
