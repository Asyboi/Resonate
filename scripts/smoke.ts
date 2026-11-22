// One real call to each dependency: pnpm smoke
import { z } from "zod";
import { structured } from "../src/lib/llm";
import * as you from "../src/lib/you";

const checks: Record<string, () => Promise<string>> = {
  search: async () => `${(await you.search("I feel behind everyone in college personal essay")).length} results`,
  contents: async () => `${(await you.contents(["https://you.com/docs/quickstart"])).length} page`,
  answer: async () => `${(await you.answer("What are college students saying about burnout?")).citations.length} citations`,
  research: async () => `${(await you.research(["college students juggling recruiting and classes"])).length} searches`,
  openai: async () =>
    (await structured({ system: "Reply with ok set to true.", input: "ping", schema: z.object({ ok: z.boolean() }), effort: "low" })).ok
      ? "structured output"
      : "unexpected output",
};

async function main() {
  await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      const start = Date.now();
      try {
        const detail = await check();
        console.log(`${name.padEnd(9)} ok   ${Date.now() - start}ms  ${detail}`);
      } catch (error) {
        process.exitCode = 1;
        console.log(`${name.padEnd(9)} FAIL ${Date.now() - start}ms  ${error instanceof Error ? error.message : error}`);
      }
    }),
  );
}

void main();
