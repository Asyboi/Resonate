// Pure: what we say to Stanley and how we read the prose that comes back. Safe to import in the browser.

import { isAudienceLine, MAX_AUDIENCE } from "./audience";

export const MAX_MESSAGE = 8000;
export const MESSAGE_ID = /mcp-\d{13}-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/;

// The tool has no draft or publish field, so the wording is a second guard beside the chat-only scope.
export const SAVE_ONLY = "Save it as an unscheduled draft. Do not schedule it. Do not publish it.";

const MARKER = "---POST---";

export const PULL = `List my 10 most recent LinkedIn posts word for word, with dates. This is read-only: do not summarize, rewrite, draft, schedule or publish anything.
Put a line with only ${MARKER} before each post, then a line "Date: " with its date, then the post's exact text.
If you cannot see the text, reply only: UNAVAILABLE`;

export const PULL_AUDIENCE = `Read-only. Do not create, change, schedule, publish or send anything. Run audience_spotlight on my LinkedIn posts for the last 30 days. Return only aggregates: no names, handles, links, companies, schools or individual headlines. Group the engagers' headlines into broad roles of at least 3 people each, and put everyone else in Other. Write one line per group, exactly in this format:
GROUP: <broad role> | <count>
Don't estimate and don't infer from my posts. If you can't see this, reply only: UNAVAILABLE`;

// A smaller group could point at one person.
const MIN_GROUP = 3;
const MAX_ROLE_WORDS = 7;

export type PulledAudience = { line: string; total: number };

export type StanleyResult = { status: "pending"; id: string } | { status: "done"; reply: string };
export type PulledPost = { date: string | null; text: string };

export function pendingId(reply: string): string | null {
  return reply.match(MESSAGE_ID)?.[0] ?? null;
}

export function safeBrief(text: string): string {
  const brief = text.trim();
  const safe = brief.endsWith(SAVE_ONLY) ? brief : `${brief}\n\n${SAVE_ONLY}`;
  if (safe.length > MAX_MESSAGE) throw new Error("That brief is too long for Stanley. Shorten it.");
  return safe;
}

/** Only counted groups in the format we asked for. Stanley's prose never becomes an audience. */
export function parseAudience(reply: string): PulledAudience | null {
  const groups = [...reply.replaceAll("*", "").matchAll(/^[ \t>-]*GROUP:[ \t]*([^|\n]+?)[ \t]*\|[ \t]*(\d{1,4})\b/gm)].map(
    ([, role, count]) => ({ role, count: Number(count) }),
  );
  const broad = groups
    .filter(({ role, count }) => count >= MIN_GROUP && !/^others?(?:$|\s*[(:])/i.test(role))
    .filter(({ role }) => isAudienceLine(role) && role.split(/\s+/).length <= MAX_ROLE_WORDS)
    .sort((a, b) => b.count - a.count);

  let line = "";
  for (const { role } of broad) {
    // Mid-line, "Product designers" reads lowercase but "UX students" keeps its capitals.
    const next = line ? `${line}, ${role.replace(/^\p{Lu}(?=\p{Ll})|^\p{Lu}(?=\p{Ll}*-)/u, (first) => first.toLowerCase())}` : role;
    if (next.length > MAX_AUDIENCE) break;
    line = next;
  }
  return line ? { line, total: groups.reduce((sum, group) => sum + group.count, 0) } : null;
}

/** Only clearly delimited posts. A summary must never become the creator's evidence. */
export function parsePosts(reply: string): PulledPost[] {
  const numbered = /^[ \t]*(?:\*\*)?\d+\.[ \t]*(?:\*\*)?[ \t]*(?=Date:)/gm;
  const marked = reply.includes(MARKER) ? reply : reply.replace(numbered, `${MARKER}\n`);
  return marked
    .split(MARKER)
    .slice(1)
    .flatMap((chunk): PulledPost[] => {
      let text = chunk.trim().replace(/(?:\n\s*)?\*{3}\s*$/, "").trim();
      const dated = text.match(/^(?:\*\*)?Date:(?:\*\*)?[ \t]*([^\n]+?)(?:\*\*)?[ \t]*(?:\n|$)/);
      if (dated) text = text.slice(dated[0].length).trim();
      return text ? [{ date: dated?.[1] ?? null, text }] : [];
    });
}
