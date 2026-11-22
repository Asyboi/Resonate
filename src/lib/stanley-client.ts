"use client";

// The browser's side of Stanley: connection status, slow replies and the pulled posts.
import { get, set } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import { errorText, postJson } from "./client";
import { parsePosts, type PulledPost, type StanleyResult } from "./stanley-protocol";

const POSTS_KEY = "resonate:stanley-posts";
const DEADLINE_MS = 180_000;
const POLL_GAP_MS = 2000;
const POLL_RETRIES = 3;

export const CONNECT_NOTICE: Record<string, string> = {
  connected: "Stanley connected",
  denied: "Stanley wasn't connected",
  publish: "Not connected: choose chat only, without publish",
  failed: "Stanley sign-in failed. Paste and Copy brief still work",
  unavailable: "Stanley isn't set up here",
};

/** Polls from the browser, so no single request waits out Stanley's 98 seconds. */
export async function waitForReply(first: StanleyResult): Promise<string> {
  const deadline = Date.now() + DEADLINE_MS;
  let result = first;
  let failures = 0;
  while (result.status === "pending") {
    if (Date.now() > deadline) throw new Error("Stanley is still working. Check Stanley before trying again.");
    await new Promise((resolve) => setTimeout(resolve, POLL_GAP_MS));
    try {
      result = await postJson<StanleyResult>("stanley/check", { id: result.id });
      failures = 0;
    } catch (error) {
      // Polling is safe to retry. Sending never is.
      if (++failures >= POLL_RETRIES) throw error;
    }
  }
  return result.reply;
}

export function useStanley() {
  const [status, setStatus] = useState({ available: false, connected: false });
  const [posts, setPosts] = useState<PulledPost[]>([]);
  const [pulling, setPulling] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/stanley/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((next: { available: boolean; connected: boolean } | null) => {
        if (next) setStatus(next);
      })
      .catch(() => {
        // Offline: the paste box and Copy brief don't need Stanley.
      });
  }, []);

  useEffect(() => {
    refresh();
    get<PulledPost[]>(POSTS_KEY)
      .then((cached) => {
        if (cached) setPosts(cached);
      })
      .catch(() => {});
  }, [refresh]);

  async function pull() {
    setPulling(true);
    setPullError(null);
    setReviewing(false);
    try {
      const found = parsePosts(await waitForReply(await postJson<StanleyResult>("stanley/posts", {})));
      if (!found.length) throw new Error("Stanley didn't return exact posts. Paste them instead.");
      setPosts(found);
      setReviewing(true);
      // Cached, so a demo doesn't wait on Stanley twice.
      await set(POSTS_KEY, found).catch(() => {});
    } catch (error) {
      setPullError(errorText(error));
      refresh();
    } finally {
      setPulling(false);
    }
  }

  return { ...status, posts, pulling, reviewing, setReviewing, pullError, pull, refresh };
}

export type Stanley = ReturnType<typeof useStanley> & { connect: () => void };
