import { expect, test } from "vitest";
import { open, seal } from "../src/lib/sealed";
import { parsePosts, pendingId, safeBrief, SAVE_ONLY } from "../src/lib/stanley-protocol";

const ID = "mcp-1795366084689-39621f7f-8a82-4f9f-b720-5ab76c540039";
const SECRET = "a-test-secret-for-cookies";

test("finds the id in Stanley's still-working reply", () =>
  expect(pendingId(`Stanley is still working on this. Call check_stanley_reply with message_id "${ID}" to get his reply.`)).toBe(ID));
test("a finished reply has no pending id", () => expect(pendingId("Saved as an unscheduled draft.")).toBeNull());

test("reads marked posts, with dates", () =>
  expect(parsePosts("Here you go\n---POST---\nDate: Nov 21, 2026\nFirst post.\n\nMore.\n---POST---\nSecond post.")).toEqual([
    { date: "Nov 21, 2026", text: "First post.\n\nMore." },
    { date: null, text: "Second post." },
  ]));
test("reads the numbered format Stanley actually returned", () =>
  expect(parsePosts("Here are your posts:\n\n1. Date: November 21, 2026 (23:53 UTC)\n\nFirst post.\n\n***\n\n2. Date: November 19, 2026\n\nSecond.")).toEqual([
    { date: "November 21, 2026 (23:53 UTC)", text: "First post." },
    { date: "November 19, 2026", text: "Second." },
  ]));
test("UNAVAILABLE is no posts", () => expect(parsePosts("UNAVAILABLE")).toEqual([]));
test("a summary is never turned into posts", () => expect(parsePosts("You mostly write about hackathons and balance.")).toEqual([]));

test("keeps a brief that already says save only", () => expect(safeBrief(`Write it.\n\n${SAVE_ONLY}`)).toBe(`Write it.\n\n${SAVE_ONLY}`));
test("restores save only when it was edited out", () => expect(safeBrief("Write it.").endsWith(SAVE_ONLY)).toBe(true));
test("an edited brief stays within Stanley's limit", () => expect(() => safeBrief("x".repeat(7990))).toThrow());

test("a sealed cookie round-trips and hides its value", () => {
  const sealed = seal("tokens", { access_token: "abc" }, SECRET);
  expect(sealed).not.toContain("abc");
  expect(open("tokens", sealed, SECRET)).toEqual({ access_token: "abc" });
});
test("a cookie can't be moved, altered or opened with another secret", () => {
  const sealed = seal("tokens", { access_token: "abc" }, SECRET);
  expect(open("state", sealed, SECRET)).toBeUndefined();
  expect(open("tokens", `A${sealed.slice(1)}x`, SECRET)).toBeUndefined();
  expect(open("tokens", sealed, "another-secret")).toBeUndefined();
});
