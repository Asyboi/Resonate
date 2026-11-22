import { expect, test } from "vitest";
import { anonymousQueries } from "../src/lib/anonymize";

const comment = "This is me. I'm Jordan, team captain at Northfield State, and everyone leans on me every single day.";

test("keeps an anonymous search", () =>
  expect(anonymousQueries(comment, ["I feel guilty resting when others rely on me"])).toHaveLength(1));
test("drops a search with a name", () => expect(anonymousQueries(comment, ["jordan feels tired of helping"])).toEqual([]));
test("drops a search with a school", () => expect(anonymousQueries(comment, ["burnout at northfield"])).toEqual([]));
test("drops a handle, email or number from the comment", () =>
  expect(anonymousQueries("so true @kay class of 2028", ["kay feels behind", "graduating 2028 and behind"])).toEqual([]));
test("drops a search that repeats a distinctive phrase", () =>
  expect(anonymousQueries(comment, ["everyone leans on me every single day"])).toEqual([]));
test("keeps searches that only share ordinary sentence starters", () =>
  expect(anonymousQueries("Thanks. This helped. I feel behind.", ["this feeling of being behind"])).toHaveLength(1));
