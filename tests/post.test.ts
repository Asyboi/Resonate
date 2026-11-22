import { expect, test, vi } from "vitest";
import { writePost, type PostInput } from "../src/lib/post";
import { PostBody } from "../src/lib/schemas";

const input: PostInput = {
  lesson: "Balance comes in seasons",
  evidence: ["move other things to maintenance"],
  angle: "Maintenance is a choice",
  take: "I paused pottery while studying for exams.",
  situations: ["Afraid to rest"],
  nicheSummary: "",
};

test("writes a post with no niche summary and no Stanley", async () => {
  const generate = vi.fn(async () => "I paused pottery.");
  expect(await writePost(input, generate)).toBe("I paused pottery.");
});

test("removes em dashes", async () => {
  expect(await writePost(input, async () => "Balance—not perfection")).toBe("Balance - not perfection");
});

test("fails loudly on an empty post", async () => {
  await expect(writePost(input, async () => "  ")).rejects.toThrow();
});

test("a found person's name, quote and link never reach the model", () => {
  const parsed = PostBody.parse({ ...input, name: "A Person", quote: "their words", url: "https://example.com" });
  expect(parsed).toEqual(input);
});

test("requires the creator's take", () => {
  expect(PostBody.safeParse({ ...input, take: "  " }).success).toBe(false);
});

test("requires someone who needs it", () => {
  expect(PostBody.safeParse({ ...input, situations: [] }).success).toBe(false);
});
