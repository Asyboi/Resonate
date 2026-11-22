"use client";

import { useState } from "react";
import { errorText, postJson } from "@/lib/client";
import { waitForReply, type Stanley } from "@/lib/stanley-client";
import type { StanleyResult } from "@/lib/stanley-protocol";
import type { Brief } from "@/lib/types";
import { CopyButton, ErrorLine, field, Modal, outline, Primary, Secondary } from "./ui";

const STANLEY_URL = "https://app.getstanley.ai/";

export type Sending = { busy: boolean; reply: string | null; error: string | null };
export const NOT_SENDING: Sending = { busy: false, reply: null, error: null };

/** Lives in the composer, so closing the review doesn't lose a send in progress. */
export function useSendBrief(stanley: Stanley, onChange: (patch: Partial<Brief>) => void) {
  const [sending, setSending] = useState<Sending>(NOT_SENDING);

  async function send(text: string) {
    setSending({ ...NOT_SENDING, busy: true });
    try {
      const first = await postJson<StanleyResult>("stanley/send", { text });
      // Accepted. Marked now, so leaving the screen can't lead to a second draft.
      onChange({ handoff: "sent" });
      setSending({ ...NOT_SENDING, reply: await waitForReply(first) });
    } catch (error) {
      setSending({ ...NOT_SENDING, error: errorText(error) });
      stanley.refresh();
    }
  }

  return { sending, send };
}

export function BriefReview({
  brief,
  stanley,
  sending,
  onSend,
  onChange,
  onClose,
}: {
  brief: Brief;
  stanley: Stanley;
  sending: Sending;
  onSend: (text: string) => void;
  onChange: (patch: Partial<Brief>) => void;
  onClose: () => void;
}) {
  const sent = brief.handoff === "sent";
  const canSend = stanley.available && stanley.connected;
  const copied = () => {
    if (!sent) onChange({ handoff: "copied" });
  };

  return (
    <Modal title="Stanley brief" onClose={onClose}>
      <textarea
        aria-label="Stanley brief"
        rows={12}
        maxLength={8000}
        disabled={sending.busy}
        className={field}
        value={brief.text}
        onChange={(event) => onChange({ text: event.target.value, handoff: "none" })}
      />

      <div aria-live="polite" className="mt-3">
        {sending.busy && <p className="animate-pulse text-[16px] font-semibold text-blue">Stanley is saving a draft, about a minute</p>}
        {!sending.busy && sending.reply && (
          <p className="max-h-28 overflow-y-auto rounded-field bg-panel p-3 text-[15px] leading-5 whitespace-pre-wrap">{sending.reply}</p>
        )}
        <ErrorLine message={sending.error} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {canSend ? (
          <>
            <CopyButton text={brief.text} onCopied={copied}>
              Copy brief
            </CopyButton>
            {sent && !sending.busy ? (
              <a href={STANLEY_URL} target="_blank" rel="noopener noreferrer" className={outline}>
                Open Stanley ↗
              </a>
            ) : (
              <Primary disabled={sending.busy || !brief.text.trim()} onClick={() => onSend(brief.text)}>
                {sending.busy ? "Sending" : "Send to Stanley"}
              </Primary>
            )}
          </>
        ) : (
          <>
            {stanley.available ? (
              <Secondary onClick={stanley.connect}>Connect Stanley</Secondary>
            ) : (
              <a href={STANLEY_URL} target="_blank" rel="noopener noreferrer" className={outline}>
                Open Stanley ↗
              </a>
            )}
            <CopyButton primary text={brief.text} onCopied={copied}>
              Copy brief
            </CopyButton>
          </>
        )}
      </div>
    </Modal>
  );
}
