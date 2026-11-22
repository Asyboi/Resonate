const MIN_WORDS = 6;
const MIN_NOTE_WORDS = 3;

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

/** A creator's note can be shorter than a web quote, as long as the quote is that whole note. */
export function isOwnQuote(quote: string, context: string): boolean {
  const whole = normalize(quote);
  if (whole === normalize(context) && whole.split(" ").length >= MIN_NOTE_WORDS) return true;
  return quoteAppears(quote, context);
}
