"use client";

import { useState, type ReactNode } from "react";
import type { Lesson } from "@/lib/types";
import { field, Modal, Primary, Secondary } from "./ui";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[15px] text-muted">
      {label}
      {children}
    </label>
  );
}

export function LessonEditor({
  lesson,
  onSave,
  onDelete,
  onClose,
}: {
  lesson: Lesson;
  onSave: (lesson: Lesson) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(lesson);
  const [searches, setSearches] = useState(lesson.queries.join("\n"));
  const queries = searches
    .split("\n")
    .map((query) => query.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 3);
  const valid = draft.label.trim() && draft.lesson.trim() && draft.whoItsFor.trim() && queries.length > 0;

  return (
    <Modal title="Edit lesson" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <input className={field} maxLength={100} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
        </Field>
        <Field label="Lesson">
          <textarea className={field} rows={3} maxLength={1000} value={draft.lesson} onChange={(e) => setDraft({ ...draft, lesson: e.target.value })} />
        </Field>
        <Field label="Learned when">
          <input
            className={field}
            maxLength={1000}
            value={draft.moment ?? ""}
            onChange={(e) => setDraft({ ...draft, moment: e.target.value || null })}
          />
        </Field>
        <Field label="Who it's for">
          <textarea className={field} rows={2} maxLength={500} value={draft.whoItsFor} onChange={(e) => setDraft({ ...draft, whoItsFor: e.target.value })} />
        </Field>
        <Field label="You.com searches">
          <textarea className={field} rows={4} value={searches} onChange={(e) => setSearches(e.target.value)} />
        </Field>
        <div className="mt-2 flex items-center justify-between">
          <Secondary onClick={onDelete}>Delete</Secondary>
          <Primary disabled={!valid} onClick={() => onSave({ ...draft, queries })}>
            Save
          </Primary>
        </div>
      </div>
    </Modal>
  );
}
