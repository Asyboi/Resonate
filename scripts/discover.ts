// Runs the real pipeline in the terminal: pnpm discover private/lessons.json ["audience line"]
import { readFileSync } from "node:fs";
import { discover, seedsFrom } from "../src/lib/discover";
import { liveDeps } from "../src/lib/live";
import { DiscoverBody } from "../src/lib/schemas";

async function main() {
  const file = process.argv[2] ?? "private/lessons.json";
  const { lessons, audience } = DiscoverBody.parse({ lessons: JSON.parse(readFileSync(file, "utf8")), audience: process.argv[3] });
  const start = Date.now();
  const elapsed = () => `${((Date.now() - start) / 1000).toFixed(1)}s`;
  const perLesson = new Map(lessons.map((lesson) => [lesson.id, 0]));

  const events = discover(
    { lessons, seeds: seedsFrom(lessons), withResearch: true, signal: new AbortController().signal, audience },
    liveDeps,
  );
  for await (const event of events) {
    if (event.type === "status") console.log(`${elapsed()}  ${event.message}`);
    else if (event.type === "error") console.log(`${elapsed()}  ERROR ${event.message}`);
    else if (event.type === "person") {
      const { person, matches } = event;
      console.log(`\n${elapsed()}  * ${person.label}: ${person.situation} [${person.origin}]${person.likeAudience ? " (like your audience)" : ""}`);
      console.log(`   "${person.quote}"`);
      console.log(`   ${person.publishedAt.slice(0, 10)} (date from ${person.dateSource})  ${person.url}`);
      for (const match of matches) {
        perLesson.set(match.lessonId, (perLesson.get(match.lessonId) ?? 0) + 1);
        console.log(`   -> ${match.lessonId} ${match.strength}/5: ${match.why}`);
      }
      console.log();
    }
  }
  console.log(`Done in ${elapsed()}`);
  for (const [id, count] of perLesson) console.log(`  ${id}: ${count} people`);
}

void main();
