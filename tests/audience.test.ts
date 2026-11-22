import { expect, test } from "vitest";
import { audienceSeeds, isAudienceLine } from "../src/lib/audience";
import { PULL_AUDIENCE, parseAudience } from "../src/lib/stanley-protocol";
import type { Lesson } from "../src/lib/types";

const lesson = (queries: string[]): Lesson => ({ id: "a", label: "a", lesson: "a", moment: null, whoItsFor: "a", evidence: [], queries });

test("accepts one line of broad groups", () =>
  expect(isAudienceLine("Design students, including UX, and product designers")).toBe(true));
test.each([
  ["empty", "  "],
  ["several lines", "students\nengineers"],
  ["a count", "20 students"],
  ["a handle", "students like @someone"],
  ["a link", "students from https://example.com"],
  ["too long", "students ".repeat(30)],
])("rejects %s as an audience line", (_, text) => expect(isAudienceLine(text)).toBe(false));

test("aims exactly one of three searches", () =>
  expect(audienceSeeds([lesson(["one", "two", "three"])], [{ lessonId: "a", query: "aimed" }]).map((seed) => seed.query)).toEqual([
    "aimed",
    "one",
    "two",
  ]));
test("keeps every search when a lesson got no aimed one", () =>
  expect(audienceSeeds([lesson(["one", "two", "three"])], []).map((seed) => seed.query)).toEqual(["one", "two", "three"]));
test.each(["", "class of 2027 burnout", "@someone burnout", "x".repeat(301)])("ignores an unsafe aimed search: %s", (query) =>
  expect(audienceSeeds([lesson(["one"])], [{ lessonId: "a", query }]).map((seed) => seed.query)).toEqual(["one"]));

test("turns Stanley's groups into one editable line", () =>
  expect(
    parseAudience(
      "GROUP: UX students | 8\n- **GROUP: Non-UX design students | 7**\nGROUP: Product designers and design leads | 4\nGROUP: Other | 2",
    ),
  ).toEqual({ line: "UX students, non-UX design students, product designers and design leads", total: 21 }));
test("drops groups under three", () =>
  expect(parseAudience("GROUP: Students | 4\nGROUP: Founders | 2")).toEqual({ line: "Students", total: 6 }));
test("keeps a role that only starts with Other", () =>
  expect(parseAudience("GROUP: Other university students | 4")?.line).toBe("Other university students"));
test("drops Other with its breakdown", () =>
  expect(parseAudience("GROUP: Students | 4\nGROUP: Other (founders, analysts) | 5")?.line).toBe("Students"));
test("never carries a handle or link into the line", () =>
  expect(parseAudience("GROUP: @someone | 4\nGROUP: https://example.com | 4\nGROUP: Students | 4")?.line).toBe("Students"));
test.each(["UNAVAILABLE", "Your audience is mostly students.", "GROUP: Other | 20"])("no groups means no audience: %s", (reply) =>
  expect(parseAudience(reply)).toBeNull());
test("the pull's own example can't become an audience", () => expect(parseAudience(PULL_AUDIENCE)).toBeNull());
test("reads the pull format with a preamble and CRLF", () =>
  expect(
    parseAudience("Here are the groups:\r\n\r\nGROUP: UX students | 8\r\nGROUP: Product designers | 4\r\nGROUP: Other | 2\r\n"),
  ).toEqual({ line: "UX students, product designers", total: 14 }));
