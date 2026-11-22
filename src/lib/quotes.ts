const MIN_WORDS = 6;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function quoteAppears(quote: string, source: string): boolean {
  const needle = normalize(quote);
  if (needle.split(" ").length < MIN_WORDS) return false;
  return ` ${normalize(source)} `.includes(` ${needle} `);
}
