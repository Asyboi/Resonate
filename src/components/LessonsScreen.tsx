"use client";

import { useState } from "react";
import sample from "@/fixtures/sample-profile.json";
import { errorText, postJson } from "@/lib/client";
import type { Stanley } from "@/lib/stanley-client";
import type { Context, Lesson } from "@/lib/types";
import { ContextInput } from "./ContextInput";
import { ArrowRight, Pencil } from "./icons";
import { LessonEditor } from "./LessonEditor";
import { PullFromStanley, ReviewPosts } from "./StanleyConnect";
import { ErrorLine, Primary } from "./ui";

const MAX_LESSONS = 6;
const KIND = { post: "Post", note: "Note", voice: "Voice" } as const;

export function LessonsScreen({
  contexts,
  lessons,
  stanley,
  onFound,
  onLessons,
  onFind,
}: {
  contexts: Context[];
  lessons: Lesson[];
  stanley: Stanley;
  onFound: (contexts: Context[], lessons: Lesson[]) => void;
  onLessons: (lessons: Lesson[]) => void;
  onFind: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);

  async function add(items: Context[]): Promise<boolean> {
    if (lessons.length >= MAX_LESSONS) {
      setError("6 lessons max. Delete one first.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const existing = lessons.map((lesson) => lesson.lesson);
      const { lessons: found } = await postJson<{ lessons: Lesson[] }>("lessons", { contexts: items, existing });
      if (found.length === 0) {
        setError("No new lesson there. Add a moment you lived.");
        return false;
      }
      onFound(items, found);
      return true;
    } catch (cause) {
      setError(errorText(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function trySample() {
    void add(sample.contexts.map((item) => ({ id: crypto.randomUUID(), kind: item.kind as Context["kind"], text: item.text })));
  }

  return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto px-14 pb-6">
      <h1 className="mt-[clamp(8px,5dvh,52px)] shrink-0 text-center font-display text-[48px] leading-[58px] font-semibold">
        What have you lived through?
      </h1>
      <div className="mt-7 flex w-full shrink-0 flex-col items-center gap-3">
        <ContextInput busy={busy} onAdd={add} extra={<PullFromStanley stanley={stanley} />} />
        <ErrorLine message={error ?? stanley.pullError} />
      </div>

      {lessons.length === 0 ? (
        <button type="button" onClick={trySample} disabled={busy} className="mt-10 text-[17px] text-blue underline-offset-4 hover:underline">
          {busy ? "Reading your words" : "Try a sample creator"}
        </button>
      ) : (
        <ul
          className={`mt-[clamp(20px,5dvh,56px)] grid w-full max-w-[1328px] shrink-0 gap-7 ${lessons.length === 1 ? "max-w-[424px] grid-cols-1" : lessons.length === 2 ? "max-w-[876px] grid-cols-2" : "grid-cols-3"}`}
        >
          {lessons.map((lesson) => {
            const evidence = lesson.evidence[0];
            const source = contexts.find((context) => context.id === evidence?.contextId);
            return (
              <li key={lesson.id}>
                <button
                  type="button"
                  onClick={() => setEditing(lesson)}
                  className="flex h-full min-h-[clamp(220px,34dvh,328px)] w-full flex-col justify-between gap-6 rounded-panel border-2 border-transparent bg-panel p-8 text-left hover:border-blue"
                >
                  <span className="flex w-full items-start justify-between gap-4">
                    <span className="font-display text-[31px] leading-[39px] font-semibold">{lesson.label}</span>
                    <Pencil className="mt-1 size-6 shrink-0 text-muted" />
                  </span>
                  {evidence && (
                    <span className="block w-full rounded-field bg-white p-5">
                      <span className="line-clamp-4 font-display text-[19px] leading-7">“{evidence.quote}”</span>
                      <span className="mt-2 block text-[15px] font-semibold text-blue">{KIND[source?.kind ?? "note"]}</span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto flex shrink-0 flex-col items-center gap-4 pt-8">
        {lessons.length > 0 && (
          <Primary className="w-[360px]" disabled={busy} onClick={onFind}>
            Find who needs this <ArrowRight className="size-7" />
          </Primary>
        )}
        <p className="text-[15px] text-muted">Saved here. Read by OpenAI. Searches go to You.com.</p>
      </div>

      {stanley.reviewing && <ReviewPosts stanley={stanley} contexts={contexts} busy={busy} onUse={add} />}

      {editing && (
        <LessonEditor
          lesson={editing}
          onClose={() => setEditing(null)}
          onDelete={() => {
            onLessons(lessons.filter((lesson) => lesson.id !== editing.id));
            setEditing(null);
          }}
          onSave={(next) => {
            onLessons(lessons.map((lesson) => (lesson.id === next.id ? next : lesson)));
            setEditing(null);
          }}
        />
      )}
    </main>
  );
}
