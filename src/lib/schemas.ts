import { z } from "zod";
import { isAudienceLine } from "./audience";
import { MAX_MESSAGE, MESSAGE_ID } from "./stanley-protocol";

const Keep = z.object({
  index: z.number().int(),
  label: z.string(),
  situation: z.string(),
  quote: z.string(),
  matches: z.array(z.object({ lessonId: z.string(), strength: z.number().int(), why: z.string() })),
});

export const JudgeOutput = z.object({ keeps: z.array(Keep) });
export const JudgeWithAudienceOutput = z.object({ keeps: z.array(Keep.extend({ likeAudience: z.boolean() })) });
export const AimOutput = z.object({ searches: z.array(z.object({ lessonId: z.string(), query: z.string() })) });

export const LessonInput = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  lesson: z.string().min(1).max(1000),
  moment: z.string().max(1000).nullable(),
  whoItsFor: z.string().min(1).max(500),
  evidence: z.array(z.object({ contextId: z.string().max(100), quote: z.string().max(2000) })).max(10),
  queries: z.array(z.string().min(1).max(300)).min(1).max(3),
});

// Only a short confirmed line reaches You.com, never pasted analytics or comments.
const AudienceLine = z.string().trim().refine(isAudienceLine).optional();

export const DiscoverBody = z.object({ lessons: z.array(LessonInput).min(1).max(6), audience: AudienceLine });

export const AudienceBody = z.object({ text: z.string().trim().min(3).max(10_000) });
export const AudienceOutput = z.object({ line: z.string() });

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

export const LessonsBody = z.object({
  contexts: z
    .array(z.object({ id: z.string().min(1).max(100), kind: z.enum(["post", "note", "voice"]), text: z.string().trim().min(1).max(10_000) }))
    .min(1)
    .max(20),
  existing: z.array(z.string().max(1000)).max(6),
});

export const LessonsOutput = z.object({
  lessons: z.array(
    z.object({
      label: z.string(),
      lesson: z.string(),
      moment: z.string().nullable(),
      whoItsFor: z.string(),
      evidence: z.array(z.object({ contextId: z.string(), quote: z.string() })),
      queries: z.array(z.string()),
    }),
  ),
});

export const AngleBody = z.object({
  lesson: LessonInput,
  situations: z.array(z.string().min(1).max(100)).min(1).max(5),
});

export const AngleOutput = z.object({
  niche: z.array(z.object({ text: z.string(), sourceIndex: z.number().int() })),
  angle: z.string(),
  question: z.string(),
});

export const NoteBody = z.object({
  evidence: z.array(z.string().max(2000)).max(10),
  take: z.string().trim().min(1).max(10_000),
  situation: z.string().min(1).max(100),
  quote: z.string().min(1).max(1000),
});

export const NoteOutput = z.object({ note: z.string() });

export const ResonateBody = z.object({
  comment: z.string().trim().min(1).max(5000),
  lessons: z.array(LessonInput).min(1).max(6),
  exclude: z.array(z.string().max(2000)).max(300),
  audience: AudienceLine,
});

export const ResonateOutput = z.object({ lessonId: z.string(), situation: z.string(), queries: z.array(z.string()) });

export const EmptyBody = z.object({});
export const SendBody = z.object({ text: z.string().trim().min(1).max(MAX_MESSAGE) });
export const CheckBody = z.object({ id: z.string().regex(new RegExp(`^${MESSAGE_ID.source}$`)) });
