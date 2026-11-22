const DAY_MS = 24 * 60 * 60 * 1000;
// Allows for clock and timezone slop on pages published in the last few minutes.
const FUTURE_SLOP_MS = 60 * 60 * 1000;
// A byline sits just under its headline. Measured on real pages: 300 to 3,700 characters of markup.
const BYLINE_MAX_CHARS = 5000;
// A paragraph longer than a subtitle means we've reached the article body.
const BODY_PARAGRAPH_CHARS = 300;

function toIso(value: string | undefined): string | null {
  if (!value) return null;
  // Date.parse reads a time with no zone as local, which differs between a laptop and the server.
  const time = Date.parse(/T\d\d:\d\d(:\d\d(\.\d+)?)?$/.test(value) ? `${value}Z` : value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/**
 * The <time> directly under a headline, before the next headline or any body text.
 * Other <time> tags are usually comments, sidebars or related posts.
 */
function bylineDate(html: string): string | null {
  const headlines = [...html.matchAll(/<h1\b[^>]*>/gi)].map((match) => match.index);
  for (const [i, start] of headlines.entries()) {
    const end = Math.min(headlines[i + 1] ?? html.length, start + BYLINE_MAX_CHARS);
    const header = html.slice(start, end);
    const time = header.match(/<time\b[^>]*\bdatetime=["']([^"']+)["']/i);
    if (time?.index === undefined) continue;
    const inBody = [...header.slice(0, time.index).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].some(
      ([, inner]) => inner.replace(/<[^>]+>/g, "").length > BODY_PARAGRAPH_CHARS,
    );
    if (inBody) continue;
    const iso = toIso(time[1]);
    if (iso) return iso;
  }
  return null;
}

/**
 * The article's own publish date: meta tag, then JSON-LD, then byline.
 * You.com Contents strips <head>, so in practice it is almost always the byline.
 */
export function extractPublished(html: string): string | null {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\b(?:property|name)=["']article:published_time["']/i.test(tag)) continue;
    const iso = toIso(tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]);
    if (iso) return iso;
  }
  return toIso(html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1]) ?? bylineDate(html);
}

export function isRecent(iso: string | null | undefined, now: Date, days = 7): boolean {
  if (!iso) return false;
  const age = now.getTime() - Date.parse(iso);
  return age >= -FUTURE_SLOP_MS && age <= days * DAY_MS;
}
