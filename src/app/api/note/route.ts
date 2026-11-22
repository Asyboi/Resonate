import { guard } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { NOTE } from "@/lib/prompts";
import { NoteBody, NoteOutput } from "@/lib/schemas";

export const maxDuration = 120;

// The personal note is the only output that sees the person's quote. It never goes to Stanley.
export async function POST(request: Request) {
  const checked = await guard(request, NoteBody);
  if ("response" in checked) return checked.response;
  try {
    const { note } = await structured({
      system: NOTE,
      input: checked.data,
      schema: NoteOutput,
      effort: "low",
      signal: request.signal,
    });
    return Response.json({ note: note.replace(/\s*\u2014\s*/g, " - ").trim() });
  } catch (error) {
    console.error("note:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't write the note. Try again." }, { status: 502 });
  }
}
