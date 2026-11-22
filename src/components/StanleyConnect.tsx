"use client";

import { useState } from "react";
import type { Stanley } from "@/lib/stanley-client";
import type { Context } from "@/lib/types";
import { Modal, Primary, Secondary } from "./ui";

/** The text button inside the Lessons input. */
export function PullFromStanley({ stanley }: { stanley: Stanley }) {
  if (!stanley.available) return null;
  const { connected, posts, pulling } = stanley;

  function click() {
    if (!connected) stanley.connect();
    else if (posts.length) stanley.setReviewing(true);
    else void stanley.pull();
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pulling}
      className={`h-[52px] shrink-0 px-4 text-[17px] text-blue hover:underline ${pulling ? "animate-pulse" : ""}`}
    >
      {pulling ? "Pulling, about 2 min" : connected ? "Pull from Stanley" : "Connect Stanley"}
    </button>
  );
}

// The lessons route takes 10,000 characters per post.
const MAX_POST = 10_000;

/** Imports are confirmed by the creator, because Stanley's text isn't proven word for word. */
export function ReviewPosts({
  stanley,
  contexts,
  busy,
  onUse,
}: {
  stanley: Stanley;
  contexts: Context[];
  busy: boolean;
  onUse: (items: Context[]) => Promise<boolean>;
}) {
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const used = new Set(contexts.map((context) => context.text));
  const chosen = stanley.posts.filter((post, index) => !skipped.has(index) && !used.has(post.text.slice(0, MAX_POST)));

  function toggle(index: number) {
    const next = new Set(skipped);
    if (!next.delete(index)) next.add(index);
    setSkipped(next);
  }

  async function add() {
    const items = chosen.map((post): Context => ({ id: crypto.randomUUID(), kind: "post", text: post.text.slice(0, MAX_POST) }));
    stanley.setReviewing(false);
    await onUse(items);
  }

  return (
    <Modal title="Did you write these?" onClose={() => stanley.setReviewing(false)}>
      <ul className="flex max-h-[52dvh] flex-col gap-2 overflow-y-auto">
        {stanley.posts.map((post, index) => {
          const added = used.has(post.text.slice(0, MAX_POST));
          return (
            <li key={index} className="flex shrink-0 gap-3 rounded-field bg-panel p-4">
              <input
                type="checkbox"
                aria-label={`Use post ${index + 1}`}
                checked={!added && !skipped.has(index)}
                disabled={added}
                onChange={() => toggle(index)}
                className="mt-1 size-5 shrink-0 accent-blue"
              />
              <details className="min-w-0 flex-1">
                <summary className="cursor-pointer text-[16px] font-semibold">{post.text.split("\n")[0].slice(0, 100)}</summary>
                <p className="mt-3 text-[16px] leading-6 whitespace-pre-wrap">{post.text}</p>
              </details>
              <span className="max-w-[130px] shrink-0 text-right text-[15px] text-muted">
                {added ? "Added" : post.date?.replace(/\s*\(.*\)$/, "")}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex items-center justify-between gap-3">
        <Secondary onClick={() => void stanley.pull()}>Pull again</Secondary>
        <Primary disabled={busy || !chosen.length} onClick={add}>
          Use {chosen.length} {chosen.length === 1 ? "post" : "posts"}
        </Primary>
      </div>
    </Modal>
  );
}
