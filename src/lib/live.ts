// The real dependencies for the discovery pipeline.
import type { DiscoverDeps } from "./discover";
import { structured } from "./llm";
import { JUDGE } from "./prompts";
import { JudgeOutput } from "./schemas";
import * as you from "./you";

export const liveDeps: DiscoverDeps = {
  now: () => new Date(),
  search: you.search,
  contents: you.contents,
  research: you.research,
  async judge(lessons, candidates, signal) {
    const { keeps } = await structured({
      system: JUDGE,
      effort: "low",
      schema: JudgeOutput,
      signal,
      input: {
        lessons: lessons.map(({ id, lesson, whoItsFor }) => ({ id, lesson, whoItsFor })),
        untrustedCandidates: candidates.map(({ url, title, highlights }, index) => ({ index, url, title, highlights })),
      },
    });
    return keeps;
  },
};
