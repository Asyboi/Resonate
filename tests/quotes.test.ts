import { expect, test } from "vitest";
import { isOwnQuote, quoteAppears } from "../src/lib/quotes";

const page = "I don’t want to **keep repeating** the same\nmistakes in every hackathon.";

test("tolerates markdown, curly quotes and line breaks", () =>
  expect(quoteAppears("I don't want to keep repeating the same mistakes", page)).toBe(true));
test("rejects a paraphrase", () =>
  expect(quoteAppears("I hate making the same mistakes every time", page)).toBe(false));
test("rejects fragments under 6 words", () => expect(quoteAppears("the same mistakes", page)).toBe(false));
test("rejects a match that starts mid-word", () =>
  expect(quoteAppears("ant to keep repeating the same mistakes", page)).toBe(false));
test("a creator's whole note can be under 6 words", () =>
  expect(isOwnQuote("Solo hackathons taught me confidence", "Solo hackathons taught me confidence.")).toBe(true));
test("a short fragment of a longer note is still rejected", () =>
  expect(isOwnQuote("taught me confidence", "Solo hackathons taught me confidence and I kept going")).toBe(false));
test("a short paraphrase is still rejected", () =>
  expect(isOwnQuote("Solo hackathons built my confidence", "Solo hackathons taught me confidence")).toBe(false));
test("one or two words are not a lesson", () => expect(isOwnQuote("Be brave", "Be brave")).toBe(false));
