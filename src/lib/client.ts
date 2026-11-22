// Every browser request to our own routes lives in this file.
import { readEvents } from "./sse";
import type { DiscoverEvent } from "./types";

const CODE_KEY = "resonate-demo-code";
export const NEEDS_CODE = "resonate:needs-code";

export function saveDemoCode(code: string) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    // Private windows can refuse storage. The next request will ask again.
  }
}

function demoCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

async function request(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-demo-code": demoCode() },
    body: JSON.stringify(body),
    signal,
  }).catch((error: unknown) => {
    if (signal?.aborted) throw error;
    throw new Error("You're offline. Try again.");
  });
  if (res.ok) return res;
  if (res.status === 401) window.dispatchEvent(new Event(NEEDS_CODE));
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new Error(data?.error ?? "Something went wrong. Try again.");
}

export async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return (await request(path, body, signal)).json() as Promise<T>;
}

export async function* postEvents(path: string, body: unknown, signal?: AbortSignal): AsyncGenerator<DiscoverEvent> {
  const res = await request(path, body, signal);
  if (!res.body) throw new Error("No response. Try again.");
  yield* readEvents(res.body);
}

export const errorText = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong. Try again.");
