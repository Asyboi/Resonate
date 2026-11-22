import { expect, test } from "vitest";
import { extractPublished, isRecent } from "../src/lib/dates";

const now = new Date("2026-11-22T17:00:00Z");

test("reads the article meta tag", () =>
  expect(extractPublished('<meta property="article:published_time" content="2026-11-18T11:07:10-05:00" />')).toBe(
    "2026-11-18T16:07:10.000Z",
  ));
test("reads the meta tag with attributes reversed", () =>
  expect(extractPublished('<meta content="2026-11-18T11:07:10-05:00" property="article:published_time">')).toBe(
    "2026-11-18T16:07:10.000Z",
  ));
test("reads JSON-LD", () =>
  expect(extractPublished('{"datePublished":"2026-11-20T16:51:25Z"}')).toBe("2026-11-20T16:51:25.000Z"));
test("ignores unrelated time tags", () =>
  expect(extractPublished('<time datetime="2026-11-22">comment</time>')).toBeNull());
test("ignores invalid dates", () => expect(extractPublished('{"datePublished":"soon"}')).toBeNull());
test("keeps 4 days old", () => expect(isRecent("2026-11-18T16:07:10Z", now)).toBe(true));
test("drops 7.5 days old", () => expect(isRecent("2026-11-15T03:00:00Z", now)).toBe(false));
test("drops a missing date", () => expect(isRecent(null, now)).toBe(false));
test("drops a future date", () => expect(isRecent("2026-12-25T00:00:00Z", now)).toBe(false));
