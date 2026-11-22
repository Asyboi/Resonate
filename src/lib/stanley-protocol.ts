// Pure: what we say to Stanley and how we read the prose that comes back. Safe to import in the browser.

export const MAX_MESSAGE = 8000;
export const MESSAGE_ID = /mcp-\d{13}-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/;

// The tool has no draft or publish field, so the wording is a second guard beside the chat-only scope.
export const SAVE_ONLY = "Save it as an unscheduled draft. Do not schedule it. Do not publish it.";

const MARKER = "---POST---";

export const PULL = `List my 10 most recent LinkedIn posts word for word, with dates. This is read-only: do not summarize, rewrite, draft, schedule or publish anything.
Put a line with only ${MARKER} before each post, then a line "Date: " with its date, then the post's exact text.
If you cannot see the text, reply only: UNAVAILABLE`;

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
