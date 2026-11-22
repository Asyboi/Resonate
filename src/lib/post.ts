import type { z } from "zod";
import type { PostBody } from "./schemas";

export type PostInput = z.infer<typeof PostBody>;

export async function writePost(input: PostInput, generate: (input: PostInput) => Promise<string>): Promise<string> {
  const post = (await generate(input)).replace(/\s*\u2014\s*/g, " - ").trim();
  if (!post) throw new Error("The post came back empty");
  return post;
}
