// Every You.com call lives in this file.
import type { Citation } from "./types";
import { RESEARCH } from "./prompts";

export type Hit = { url: string; title: string; pageAge?: string; highlights: string[] };
export type Page = { url: string; html?: string | null; markdown?: string | null };

const ENDPOINTS = {
  search: "https://ydc-index.io/v1/search",
  contents: "https://ydc-index.io/v1/contents",
  research: "https://api.you.com/v1/research",
  answer: "https://api.you.com/v1/answer",
} as const;

type Endpoint = keyof typeof ENDPOINTS;

// The default limit is 10 requests/second per endpoint. Stay just under it.
const MIN_GAP_MS = 125;
const RETRIES = 2;
const nextSlot: Partial<Record<Endpoint, number>> = {};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSlot(endpoint: Endpoint) {
  const now = Date.now();
  const at = Math.max(now, nextSlot[endpoint] ?? 0);
  nextSlot[endpoint] = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

export class YouError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`You.com ${endpoint} failed with ${status}`);
  }
}

async function post<T>(endpoint: Endpoint, body: object, signal?: AbortSignal): Promise<T> {
  const key = process.env.YOU_API_KEY;
  if (!key) throw new Error("YOU_API_KEY is not set");
  const timeoutMs = endpoint === "research" ? 45_000 : 15_000;

  for (let attempt = 0; ; attempt++) {
    await waitForSlot(endpoint);
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(timeoutMs);
    const res = await fetch(ENDPOINTS[endpoint], {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (res.ok) return (await res.json()) as T;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= RETRIES) throw new YouError(endpoint, res.status);
    await sleep(Number(res.headers.get("retry-after")) * 1000 || 500 * 2 ** attempt);
  }
}

export async function search(query: string, signal?: AbortSignal): Promise<Hit[]> {
  const data = await post<{
    results?: {
      web?: { url: string; title?: string; page_age?: string; snippets?: string[]; contents?: { highlights?: string[] } }[];
    };
  }>("search", { query, freshness: "week", count: 20, extraction: { extraction_mode: "highlights" } }, signal);

  return (data.results?.web ?? []).map((result) => ({
    url: result.url,
    title: result.title ?? "",
    pageAge: result.page_age,
    highlights: result.contents?.highlights ?? result.snippets ?? [],
  }));
}

export async function contents(urls: string[], signal?: AbortSignal): Promise<Page[]> {
  return post<Page[]>("contents", { urls, formats: ["html", "markdown"], crawl_timeout: 10 }, signal);
}

export async function research(
  audiences: string[],
  signal?: AbortSignal,
): Promise<{ lessonIndex: number; query: string }[]> {
  const data = await post<{ output: { content: { searches?: { lessonIndex: number; query: string }[] } | string } }>(
    "research",
    {
      input: `${RESEARCH}\n\n${audiences.map((audience, index) => `${index}. ${audience}`).join("\n")}`,
      research_effort: "standard",
      source_control: { freshness: "week" },
      output_schema: {
        type: "object",
        additionalProperties: false,
        required: ["searches"],
        properties: {
          searches: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["lessonIndex", "query"],
              properties: { lessonIndex: { type: "integer" }, query: { type: "string" } },
            },
          },
        },
      },
    },
    signal,
  );
  return typeof data.output.content === "string" ? [] : (data.output.content.searches ?? []);
}

export async function answer(query: string, signal?: AbortSignal): Promise<{ summary: string; citations: Citation[] }> {
  const data = await post<{ answer: string; citations?: Citation[] }>("answer", { query, freshness: "week" }, signal);
  return { summary: data.answer, citations: data.citations ?? [] };
}
