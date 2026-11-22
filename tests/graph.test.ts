import { expect, test } from "vitest";
import { betweenEdges, defaultSelection, rankFor, strongestLesson, toGraph, topMatches } from "../src/lib/graph";
import type { Lesson, Match, Person } from "../src/lib/types";

const lesson = (id: string): Lesson => ({ id, label: id, lesson: id, moment: null, whoItsFor: id, evidence: [], queries: ["q"] });
const person = (id: string, origin: Person["origin"] = "discovery"): Person => ({
  id,
  label: id,
  situation: id,
  quote: id,
  url: `https://example.com/${id}`,
  site: "example.com",
  publishedAt: "2026-11-20T00:00:00Z",
  dateSource: "page",
  foundBy: "q",
  origin,
});
const match = (personId: string, lessonId: string, strength: Match["strength"] = 4): Match => ({ personId, lessonId, strength, why: "" });

test("caps each lesson at 5", () => {
  const people = [1, 2, 3, 4, 5, 6, 7].map((n) => person(`p${n}`));
  expect(topMatches(people, people.map((p) => match(p.id, "a")))).toHaveLength(5);
});
test("never caps away someone found through resonance", () => {
  const people = [...[1, 2, 3, 4, 5].map((n) => person(`p${n}`)), person("new", "resonance")];
  const kept = topMatches(people, people.map((p) => match(p.id, "a", p.id === "new" ? 3 : 5)));
  expect(kept.map((m) => m.personId)).toContain("new");
});
test("strongest uses the top 3 only", () => {
  const many = [1, 2, 3, 4, 5].map((n) => match(`a${n}`, "a", 3));
  const few = [1, 2, 3].map((n) => match(`b${n}`, "b", 4));
  expect(strongestLesson([...many, ...few])).toBe("b");
});
test("no matches has no strongest lesson", () => expect(strongestLesson([])).toBeNull());
test("ranks a lesson's people by strength", () =>
  expect(rankFor("a", [match("low", "a", 3), match("high", "a", 5), match("x", "b", 5)]).map((m) => m.personId)).toEqual(["high", "low"]));
test("opens on the top person of the strongest lesson", () =>
  expect(defaultSelection([match("low", "a", 3), match("high", "a", 5)])).toEqual({ lessonId: "a", personId: "high" }));
test("a shared person is one node with two links", () => {
  const { nodes, links } = toGraph([lesson("a"), lesson("b")], [person("p")], [match("p", "a"), match("p", "b")]);
  expect(nodes.filter((node) => node.kind === "person")).toHaveLength(1);
  expect(links).toHaveLength(2);
});
test("an unmatched lesson stays a node", () =>
  expect(toGraph([lesson("a")], [], []).nodes).toMatchObject([{ id: "a", kind: "lesson", connections: 0 }]));
test("someone like the audience wins a tie", () => {
  const people = [...[1, 2, 3, 4, 5].map((n) => person(`p${n}`)), { ...person("like"), likeAudience: true }];
  const shown = topMatches(people, people.map((p) => match(p.id, "a")));
  expect(shown[0].personId).toBe("like");
  expect(defaultSelection(shown)?.personId).toBe("like");
});
test("being like the audience never beats a stronger match", () => {
  const people = [person("strong"), { ...person("like"), likeAudience: true }];
  expect(topMatches(people, [match("strong", "a", 5), match("like", "a", 4)])[0].personId).toBe("strong");
});
test("the map knows who is like the audience", () => {
  const { nodes } = toGraph([lesson("a")], [{ ...person("like"), likeAudience: true }, person("other")], [match("like", "a"), match("other", "a")]);
  expect(nodes.slice(1)).toMatchObject([{ likeAudience: true }, { likeAudience: false }]);
});
test("a line runs from one dot's edge to the other's", () =>
  expect(betweenEdges({ x: 0, y: 0 }, { x: 60, y: 80 }, 20, 10)).toEqual([{ x: 12, y: 16 }, { x: 54, y: 72 }]));
test("touching dots have no line between them", () => expect(betweenEdges({ x: 0, y: 0 }, { x: 20, y: 0 }, 12, 10)).toBeNull());
test("dots in the same place have no line", () => expect(betweenEdges({ x: 5, y: 5 }, { x: 5, y: 5 }, 0, 0)).toBeNull());
