import { zodTextFormat } from "openai/helpers/zod";
import { expect, test } from "vitest";
import { AimOutput, AudienceOutput, DiscoverBody, JudgeOutput, JudgeWithAudienceOutput, PostOutput, ResonateBody } from "../src/lib/schemas";

test.each([
  ["judge", JudgeOutput],
  ["post", PostOutput],
  ["aim", AimOutput],
  ["audience", AudienceOutput],
  ["judge_with_audience", JudgeWithAudienceOutput],
])("%s output is a valid strict schema for OpenAI", (name, schema) => {
  const format = zodTextFormat(schema, name);
  expect(format.strict).toBe(true);
  expect(format.schema).toMatchObject({ type: "object", additionalProperties: false });
});

const lessons = [{ id: "a", label: "a", lesson: "a", moment: null, whoItsFor: "a", evidence: [], queries: ["q"] }];
test("discovery keeps a confirmed audience", () =>
  expect(DiscoverBody.parse({ lessons, audience: "University students" }).audience).toBe("University students"));
test("discovery works with no audience", () => expect(DiscoverBody.safeParse({ lessons }).success).toBe(true));
test("raw analytics can't be sent as an audience", () => {
  expect(DiscoverBody.safeParse({ lessons, audience: "Students 40%\nEngineers 12%" }).success).toBe(false);
  expect(ResonateBody.safeParse({ lessons, comment: "c", exclude: [], audience: "Students 40%" }).success).toBe(false);
});
