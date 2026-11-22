"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Mic } from "./icons";

// The Web Speech API isn't in TypeScript's DOM types yet.
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};
type SpeechWindow = { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

const getRecognition = () => {
  const speech = window as unknown as SpeechWindow;
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
};
const subscribe = () => () => {};

/** Renders nothing without browser speech support, which leaves the text box as the way in. */
export function VoiceInput({ onText, onListening }: { onText: (text: string) => void; onListening?: (on: boolean) => void }) {
  const supported = useSyncExternalStore(subscribe, () => Boolean(getRecognition()), () => false);
  const [listening, setListening] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const recognition = useRef<Recognition>(null);

  useEffect(() => () => recognition.current?.stop(), []);
  if (!supported) return null;

  function setOn(on: boolean) {
    setListening(on);
    onListening?.(on);
  }

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Constructor = getRecognition();
    if (!Constructor) return;
    const next = new Constructor();
    next.continuous = true;
    next.interimResults = false;
    next.lang = "en-US";
    next.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) onText(event.results[i][0].transcript.trim());
      }
    };
    next.onend = () => setOn(false);
    next.onerror = (event) => setBlocked(event.error !== "no-speech" && event.error !== "aborted");
    recognition.current = next;
    setBlocked(false);
    next.start();
    setOn(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={listening ? "Stop recording" : "Answer by voice"}
      aria-pressed={listening}
      title={blocked ? "Microphone unavailable. Type instead." : undefined}
      className={`flex size-[52px] shrink-0 items-center justify-center rounded-full ${listening ? "bg-blue text-white" : blocked ? "bg-empty text-muted" : "bg-wash text-blue"}`}
    >
      <Mic />
    </button>
  );
}
