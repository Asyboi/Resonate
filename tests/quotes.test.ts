import { expect, test } from "vitest";
import { quoteAppears } from "../src/lib/quotes";

const page = "I don’t want to **keep repeating** the same\nmistakes in every hackathon.";

test("tolerates markdown, curly quotes and line breaks", () =>
  expect(quoteAppears("I don't want to keep repeating the same mistakes", page)).toBe(true));
test("rejects a paraphrase", () =>
  expect(quoteAppears("I hate making the same mistakes every time", page)).toBe(false));
test("rejects fragments under 6 words", () => expect(quoteAppears("the same mistakes", page)).toBe(false));
test("rejects a match that starts mid-word", () =>
  expect(quoteAppears("ant to keep repeating the same mistakes", page)).toBe(false));
