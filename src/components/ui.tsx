"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Close } from "./icons";

export function Primary({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={`flex h-[68px] shrink-0 items-center justify-center gap-3 rounded-full bg-blue px-10 text-[22px] leading-7 font-bold text-white hover:bg-[#164fc0] disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export const outline =
  "flex h-14 shrink-0 items-center justify-center rounded-full border border-line bg-white px-7 text-[17px] font-semibold text-blue hover:bg-wash";

export function Secondary({ className = "", ...props }: ComponentProps<"button">) {
  return <button type="button" className={`${outline} disabled:opacity-50 ${className}`} {...props} />;
}

export function CopyButton({
  text,
  children,
  primary = false,
  className = "",
  onCopied,
}: {
  text: string;
  children: ReactNode;
  primary?: boolean;
  className?: string;
  onCopied?: () => void;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const Button = primary ? Primary : Secondary;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      onCopied?.();
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <Button onClick={copy} disabled={!text} className={className} aria-live="polite">
      {state === "copied" ? "Copied" : state === "failed" ? "Select and copy" : children}
    </Button>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
      className="m-auto max-h-[88dvh] w-[640px] max-w-[92vw] overflow-y-auto rounded-panel bg-white p-8 text-navy backdrop:bg-navy/30"
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-[28px] font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-navy">
          <Close />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export const field = "w-full rounded-field border border-line bg-white px-4 py-3 text-[17px] leading-6 text-navy";

export function ErrorLine({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-[15px] font-semibold text-[#b3261e]">
      {message}
    </p>
  ) : null;
}
