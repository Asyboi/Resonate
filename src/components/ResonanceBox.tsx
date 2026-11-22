"use client";

import { useState } from "react";
import type { Loop } from "@/lib/run";
import type { Person } from "@/lib/types";
import { ArrowDown, ArrowRight, Lock, ResonanceDot } from "./icons";
import { Primary } from "./ui";

export function ResonanceBox({ disabled, onSubmit }: { disabled: boolean; onSubmit: (comment: string) => void }) {
  const [comment, setComment] = useState("");
  return (
    <form
      className="flex h-16 w-full shrink-0 items-center gap-4 rounded-full border border-line bg-white pr-2 pl-6 focus-within:border-resonance"
      onSubmit={(event) => {
        event.preventDefault();
        if (!comment.trim() || disabled) return;
        onSubmit(comment.trim());
        setComment("");
      }}
    >
      <ResonanceDot className="size-6 shrink-0" />
      <input
        aria-label="Paste a comment that resonated"
        placeholder="Paste a comment that resonated"
        maxLength={5000}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[19px] leading-6 outline-none placeholder:text-muted"
      />
      <button
        type="submit"
        aria-label="Find more like this"
        disabled={disabled}
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-resonance-wash text-navy disabled:opacity-40"
      >
        <ArrowRight />
      </button>
    </form>
  );
}

export function LoopPanel({
  loop,
  people,
  running,
  onWrite,
}: {
  loop: Loop;
  people: Person[];
  running: boolean;
  onWrite: (() => void) | null;
}) {
  const fresh = people.filter((person) => loop.personIds.includes(person.id));
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="shrink-0 rounded-field bg-white p-5 short:p-3">
          <p className="text-[15px] text-muted">Their comment</p>
          <p className="mt-2 line-clamp-3 font-display text-[21px] leading-8 short:mt-1 short:line-clamp-2 short:text-[17px] short:leading-6">“{loop.comment}”</p>
        </div>
        <ArrowDown className="my-2 size-8 shrink-0 self-center text-sky short:my-1 short:size-5" />
        <div className="shrink-0 rounded-field bg-resonance-wash p-5 short:p-3">
          <p className="text-[21px] leading-7 font-bold short:text-[18px] short:leading-6">{loop.found?.situation ?? (running ? "Removing identity" : "No search made")}</p>
          {loop.found && (
            <p className="mt-2 flex items-center gap-2 text-[16px]">
              <Lock className="size-5" /> Identity removed
            </p>
          )}
        </div>
        {loop.found && (
          <>
            <ArrowDown className="my-2 size-8 shrink-0 self-center text-sky short:my-1 short:size-5" />
            <p className="mb-2 text-[16px] font-bold text-blue short:mb-1">You.com</p>
            <ul className="flex flex-col gap-2 short:gap-1">
              {loop.found.queries.map((query) => {
                const count = fresh.filter((person) => person.foundBy === query).length;
                return (
                  <li key={query} className="flex min-h-[52px] short:min-h-11 short:py-1 items-center justify-between gap-2 rounded-[26px] bg-white py-2 pr-3 pl-5">
                    <span className="line-clamp-2 text-[15px] leading-5 short:line-clamp-1">“{query}”</span>
                    <span
                      className={`flex h-8 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-[16px] font-bold ${count ? "bg-resonance-wash" : "text-muted"}`}
                    >
                      {count ? `+${count}` : running ? "…" : "0"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {onWrite && (
        <Primary className="mt-4 w-full short:mt-2 short:h-14" onClick={onWrite}>
          Write for them <ArrowRight className="size-7" />
        </Primary>
      )}
    </>
  );
}
