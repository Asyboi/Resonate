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

// You.com Contents returns body HTML only: no <head>, no meta tags, no JSON-LD.
test("reads the byline under the headline when there is no head", () =>
  expect(extractPublished('<h1>November burnout</h1><div><time datetime="2026-11-14T22:00:00-05:00">Nov 14</time></div>')).toBe(
    "2026-11-15T03:00:00.000Z",
  ));
test("skips the publication's own h1", () =>
  expect(
    extractPublished(
      '<h1>My Newsletter</h1><h1>The post</h1><h3>Subtitle</h3><time datetime="2026-11-17T17:00:19.087Z">Nov 17</time>' +
        '<p>Body</p><time datetime="2026-09-29T18:34:46.721Z">Sep 29</time>',
    ),
  ).toBe("2026-11-17T17:00:19.087Z"));
test("does not take a comment's date as the byline", () =>
  expect(
    extractPublished(`<h1>The post</h1><p>${"word ".repeat(100)}</p><time datetime="2026-11-21T14:12:42Z">Nov 21</time>`),
  ).toBeNull());
test("does not take a sidebar date far from the headline", () =>
  expect(
    extractPublished(`<h1>The post</h1>${"<div></div>".repeat(600)}<time datetime="2026-11-21T14:12:42Z">Nov 21</time>`),
  ).toBeNull());
test("reads a time with no zone as UTC, wherever the server runs", () =>
  expect(extractPublished('<h1>The post</h1><time datetime="2026-11-17T21:04:37">4:04 p.m. ET</time>')).toBe(
    "2026-11-17T21:04:37.000Z",
  ));
