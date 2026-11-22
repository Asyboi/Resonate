"use client";

import { useState } from "react";
import { isAudienceLine, MAX_AUDIENCE } from "@/lib/audience";
import { errorText, postJson } from "@/lib/client";
import type { Stanley } from "@/lib/stanley-client";
import { Pencil, Plus } from "./icons";
import { ErrorLine, field, Modal, Primary, Secondary } from "./ui";

const MAX_PASTE = 10_000;

/** The optional line under the lessons. Nothing is searched with it until the creator confirms it. */
export function AudienceLine({
  audience,
  stanley,
  onChange,
}: {
  audience: string;
  stanley: Stanley;
  onChange: (audience: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(audience);
  const [pasted, setPasted] = useState(false);
  const [engagers, setEngagers] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = reading || stanley.pullingAudience;
  // A paste can hold names or companies, so it always becomes broad groups first.
  const ready = !pasted && isAudienceLine(text);

  function show() {
    if (!busy) {
      setText(audience);
      setPasted(false);
      setEngagers(null);
      setError(null);
    }
    setOpen(true);
  }

  function confirm(next: string) {
    onChange(next.trim());
    setOpen(false);
  }

  async function pull() {
    setError(null);
    try {
      const found = await stanley.pullAudience();
      setText(found.line);
      setEngagers(found.total);
      setPasted(false);
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  async function summarize() {
    setReading(true);
    setError(null);
    try {
      const { line } = await postJson<{ line: string }>("audience", { text });
      setText(line);
      setPasted(false);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setReading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={`flex h-14 max-w-[520px] min-w-0 items-center gap-3 rounded-full px-6 text-[17px] ${audience ? "bg-panel hover:bg-wash" : "border border-line bg-white font-semibold text-blue hover:bg-wash"}`}
      >
        {audience ? (
          <>
            <span className="shrink-0 font-bold text-blue">Your audience</span>
            <span className="min-w-0 truncate">{audience}</span>
            <Pencil className="size-5 shrink-0 text-muted" />
          </>
        ) : (
          <>
            <Plus className="size-5" /> Your audience
          </>
        )}
      </button>

      {open && (
        <Modal title="Who reads you?" onClose={() => setOpen(false)}>
          <textarea
            aria-label="Your audience"
            placeholder="Type who reads you, or paste LinkedIn demographics or comments"
            className={`${field} resize-none`}
            rows={3}
            maxLength={MAX_PASTE}
            value={text}
            disabled={busy}
            onPaste={() => setPasted(true)}
            onChange={(event) => {
              setText(event.target.value);
              setEngagers(null);
              if (!event.target.value) setPasted(false);
            }}
          />
          <div className="mt-2 flex min-h-6 items-start justify-between gap-4 text-[15px] text-muted">
            <p aria-live="polite">
              {engagers
                ? `From ${engagers} recent engagers. You.com will search with this`
                : ready
                  ? "You.com will search with this"
                  : text.length > MAX_AUDIENCE || pasted
                    ? "Names and numbers come out first"
                    : null}
            </p>
            {audience && (
              <button type="button" onClick={() => confirm("")} disabled={busy} className="shrink-0 text-blue hover:underline">
                Remove
              </button>
            )}
          </div>
          <ErrorLine message={error} />
          <div className="mt-5 flex items-center justify-between gap-3">
            {stanley.available ? (
              <Secondary
                disabled={busy}
                onClick={stanley.connected ? pull : stanley.connect}
                className={stanley.pullingAudience ? "animate-pulse" : ""}
              >
                {stanley.pullingAudience ? "Asking Stanley" : stanley.connected ? "Pull from Stanley" : "Connect Stanley"}
              </Secondary>
            ) : (
              <span />
            )}
            <Primary disabled={busy || text.trim().length < 3} onClick={ready ? () => confirm(text) : summarize}>
              {reading ? "Reading" : ready || !text.trim() ? "Use this" : "Make it one line"}
            </Primary>
          </div>
        </Modal>
      )}
    </>
  );
}
