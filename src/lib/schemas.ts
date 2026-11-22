import { z } from "zod";

export const JudgeOutput = z.object({
  keeps: z.array(
    z.object({
      index: z.number().int(),
      situation: z.string(),
      quote: z.string(),
      matches: z.array(z.object({ lessonId: z.string(), strength: z.number().int(), why: z.string() })),
    }),
  ),
});

export const LessonInput = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  lesson: z.string().min(1).max(1000),
  moment: z.string().max(1000).nullable(),
  whoItsFor: z.string().min(1).max(500),
  evidence: z.array(z.object({ contextId: z.string().max(100), quote: z.string().max(2000) })).max(10),
  queries: z.array(z.string().min(1).max(300)).min(1).max(3),
});

export const DiscoverBody = z.object({ lessons: z.array(LessonInput).min(1).max(6) });

export const PostOutput = z.object({ post: z.string() });

// Unknown fields are stripped, so a found person's name, quote and link can't reach the model.
export const PostBody = z.object({
  lesson: z.string().min(1).max(1000),
  evidence: z.array(z.string().max(2000)).max(10),
  angle: z.string().max(2000),
  take: z.string().trim().min(1).max(10_000),
  situations: z.array(z.string().min(1).max(100)).min(1).max(5),
  nicheSummary: z.string().max(10_000),
});
