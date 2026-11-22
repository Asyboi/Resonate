const DAY_MS = 24 * 60 * 60 * 1000;
// Allows for clock and timezone slop on pages published in the last few minutes.
const FUTURE_SLOP_MS = 60 * 60 * 1000;

function toIso(value: string | undefined): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** The article's own publish date. Deliberately ignores <time> tags, which often belong to comments or sidebars. */
export function extractPublished(html: string): string | null {
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\b(?:property|name)=["']article:published_time["']/i.test(tag)) continue;
    const iso = toIso(tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]);
    if (iso) return iso;
  }
  return toIso(html.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1]);
}

export function isRecent(iso: string | null | undefined, now: Date, days = 7): boolean {
  if (!iso) return false;
  const age = now.getTime() - Date.parse(iso);
  return age >= -FUTURE_SLOP_MS && age <= days * DAY_MS;
}
