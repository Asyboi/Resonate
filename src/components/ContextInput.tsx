"use client";

import { useState } from "react";
import type { Context } from "@/lib/types";
import { Plus } from "./icons";
import { VoiceInput } from "./VoiceInput";

const MAX_CHARS = 10_000;
const MAX_ITEMS = 20;
const POST_CHARS = 280;

/** A long paste of many posts is split at paragraph breaks to fit the route's limits. */
function split(text: string): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > MAX_CHARS) {
    const at = rest.lastIndexOf("\n", MAX_CHARS);
    const cut = at > 0 ? at : MAX_CHARS;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  return [...parts, rest].filter(Boolean).slice(0, MAX_ITEMS);
}

export function ContextInput({ busy, onAdd }: { busy: boolean; onAdd: (items: Context[]) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const [spoken, setSpoken] = useState(false);
  const tall = text.length > 70 || text.includes("\n");

  async function add() {
    const kind = spoken ? "voice" : text.length > POST_CHARS ? "post" : "note";
    const items = split(text).map((part): Context => ({ id: crypto.randomUUID(), kind, text: part }));
    if (items.length && (await onAdd(items))) {
      setText("");
      setSpoken(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
      className={`flex w-[960px] max-w-full gap-2 border border-line bg-white py-3 pr-3 pl-7 focus-within:border-blue ${tall ? "items-end rounded-[28px]" : "items-center rounded-full"}`}
    >
      <textarea
        aria-label="Paste a post or jot a note"
        placeholder={busy ? "Finding your lessons" : "Paste a post or jot a note"}
        value={text}
        rows={tall ? 5 : 1}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void add();
          }
        }}
        className="min-w-0 flex-1 resize-none bg-transparent py-3 text-[19px] leading-6 outline-none placeholder:text-muted"
      />
      <VoiceInput
        onText={(part) => {
          setSpoken(true);
          setText((current) => `${current} ${part}`.trim());
        }}
      />
      <button
        type="submit"
        aria-label="Find lessons"
        disabled={busy || !text.trim()}
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-navy text-white"
      >
        <Plus className={busy ? "size-7 animate-spin" : "size-7"} />
      </button>
    </form>
  );
}
