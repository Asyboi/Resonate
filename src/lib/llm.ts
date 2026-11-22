// Every model call lives in this file.
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

const MODEL = "gpt-6.2-sol";

let client: OpenAI | undefined;

export async function structured<S extends z.ZodType>(args: {
  system: string;
  input: unknown;
  schema: S;
  effort: "low" | "medium";
  signal?: AbortSignal;
}): Promise<z.infer<S>> {
  client ??= new OpenAI();
  const res = await client.responses.parse(
    {
      model: MODEL,
      // Creators' stories and found people's words should not be kept as stored responses.
      store: false,
      // A developer message rather than `instructions`, which GPT-6.2 appends after the untrusted input.
      input: [
        { role: "developer", content: args.system },
        { role: "user", content: JSON.stringify(args.input) },
      ],
      reasoning: { effort: args.effort },
      text: { format: zodTextFormat(args.schema, "result") },
    },
    { signal: args.signal, timeout: 60_000, maxRetries: 1 },
  );
  // Null on a refusal or an incomplete response.
  if (res.output_parsed == null) throw new Error("No usable model output");
  return res.output_parsed as z.infer<S>;
}
