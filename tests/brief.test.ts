import { expect, test } from "vitest";
import { buildBrief } from "../src/lib/brief";

const input = { lesson: "Balance has seasons", situation: "Cannot rest", angle: "Pausing is not quitting", take: "I paused pottery." };

test("includes the lesson, situation, angle and take", () => {
  const text = buildBrief(input);
  for (const value of Object.values(input)) expect(text).toContain(value);
});
test("ends by forbidding scheduling and publishing", () =>
  expect(buildBrief(input).endsWith("Save it as an unscheduled draft. Do not schedule it. Do not publish it.")).toBe(true));
test("needs a take", () => expect(() => buildBrief({ ...input, take: " " })).toThrow());
test("stays inside Stanley's limit", () => expect(() => buildBrief({ ...input, take: "x".repeat(8000) })).toThrow());
test("works without an angle", () => expect(buildBrief({ ...input, angle: "" })).not.toContain("The angle only I have"));
