// The real dependencies for the discovery pipeline.
import type { DiscoverDeps } from "./discover";
import { structured } from "./llm";
import { AIM, JUDGE, JUDGE_AUDIENCE } from "./prompts";
import { AimOutput, JudgeOutput, JudgeWithAudienceOutput } from "./schemas";
import * as you from "./you";

export const liveDeps: DiscoverDeps = {
  now: () => new Date(),
  search: you.search,
  contents: you.contents,
  research: you.research,
  async aim(lessons, audience, signal) {
    const { searches } = await structured({
      system: AIM,
      effort: "low",
      schema: AimOutput,
      signal,
      input: { audience, lessons: lessons.map(({ id, lesson, whoItsFor }) => ({ id, lesson, whoItsFor })) },
    });
    return searches;
  },
  async judge(lessons, candidates, signal, audience) {
    const { keeps } = await structured({
      system: audience ? `${JUDGE}\n${JUDGE_AUDIENCE}` : JUDGE,
      effort: "low",
      schema: audience ? JudgeWithAudienceOutput : JudgeOutput,
      signal,
      input: {
        ...(audience && { audience }),
        lessons: lessons.map(({ id, lesson, whoItsFor }) => ({ id, lesson, whoItsFor })),
        untrustedCandidates: candidates.map(({ url, title, highlights }, index) => ({ index, url, title, highlights })),
      },
    });
    return keeps;
  },
};
