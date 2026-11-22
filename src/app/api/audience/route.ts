import { isAudienceLine } from "@/lib/audience";
import { guard } from "@/lib/guard";
import { structured } from "@/lib/llm";
import { AUDIENCE } from "@/lib/prompts";
import { AudienceBody, AudienceOutput } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  const checked = await guard(request, AudienceBody);
  if ("response" in checked) return checked.response;
  try {
    const output = await structured({
      system: AUDIENCE,
      input: { untrustedPaste: checked.data.text },
      schema: AudienceOutput,
      effort: "low",
      signal: request.signal,
    });
    const line = output.line.trim().replace(/\.$/, "");
    // A second check after the model, because this line goes to You.com.
    if (!isAudienceLine(line)) return Response.json({ error: "No clear groups there. Type them instead." }, { status: 422 });
    return Response.json({ line });
  } catch (error) {
    console.error("audience:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Couldn't read that. Type your audience instead." }, { status: 502 });
  }
}
