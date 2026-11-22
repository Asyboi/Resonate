import { zodTextFormat } from "openai/helpers/zod";
import { expect, test } from "vitest";
import { JudgeOutput, PostOutput } from "../src/lib/schemas";

test.each([
  ["judge", JudgeOutput],
  ["post", PostOutput],
])("%s output is a valid strict schema for OpenAI", (name, schema) => {
  const format = zodTextFormat(schema, name);
  expect(format.strict).toBe(true);
  expect(format.schema).toMatchObject({ type: "object", additionalProperties: false });
});
