// Every Claude call lives in this file.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

let client: Anthropic | undefined;

export async function structured<S extends z.ZodType>(args: {
  system: string;
  input: unknown;
  schema: S;
  effort: "low" | "medium";
  signal?: AbortSignal;
}): Promise<z.infer<S>> {
  client ??= new Anthropic();
  const res = await client.beta.messages.parse(
    {
      model: "claude-opus-5-5",
      max_tokens: 16000,
      system: args.system,
      messages: [{ role: "user", content: JSON.stringify(args.input) }],
      output_config: { effort: args.effort, format: betaZodOutputFormat(args.schema) },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    },
    { signal: args.signal, timeout: 60_000, maxRetries: 1 },
  );
  if (res.stop_reason === "refusal" || res.parsed_output == null) throw new Error("No usable model output");
  return res.parsed_output;
}
