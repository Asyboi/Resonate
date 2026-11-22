// A second line of defense after the model: nothing identifying from a pasted comment reaches You.com.
const PHRASE_WORDS = 6;

const words = (text: string): string[] => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

function identifiers(comment: string): Set<string> {
  const found = new Set<string>();
  for (const match of comment.matchAll(/[@#]([\p{L}\p{N}_]+)|([\p{L}\p{N}._-]+)@[\p{L}\p{N}.-]+|(\d{2,})/gu)) {
    for (const part of words(match.slice(1).find(Boolean) ?? "")) found.add(part);
  }
  // An all-caps comment carries no capitalization signal.
  if (!/\p{Ll}/u.test(comment)) return found;
  for (const sentence of comment.split(/[.!?\n]+/)) {
    const tokens = sentence.match(/[\p{L}\p{N}'’]+/gu) ?? [];
    for (const token of tokens.slice(1)) {
      // "I", "I'm" and "I've" are capitalized without being names.
      if (/^I(['’]|$)/.test(token)) continue;
      if (/^\p{Lu}[\p{L}\p{N}]+/u.test(token)) found.add(words(token)[0]);
    }
  }
  return found;
}

export function anonymousQueries(comment: string, queries: string[]): string[] {
  const banned = identifiers(comment);
  const source = ` ${words(comment).join(" ")} `;
  return queries.filter((query) => {
    const tokens = words(query);
    if (tokens.length === 0 || tokens.some((token) => banned.has(token))) return false;
    for (let i = 0; i + PHRASE_WORDS <= tokens.length; i++) {
      if (source.includes(` ${tokens.slice(i, i + PHRASE_WORDS).join(" ")} `)) return false;
    }
    return true;
  });
}
