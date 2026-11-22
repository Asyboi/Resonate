"use client";

import { useEffect, useState } from "react";
import { buildBrief } from "@/lib/brief";
import { errorText, postJson } from "@/lib/client";
import { rankFor } from "@/lib/graph";
import type { Stanley } from "@/lib/stanley-client";
import type { Brief, Lesson, Match, NicheLine, Person } from "@/lib/types";
import { BriefReview, useSendBrief } from "./BriefReview";
import { ArrowRight, Copy, Mail, Pencil } from "./icons";
import { CopyButton, ErrorLine, Primary, Secondary } from "./ui";
import { VoiceInput } from "./VoiceInput";

const FALLBACK_QUESTION = "When did you live this yourself?";
const BARS = [10, 22, 16, 30, 20, 12, 26, 34, 18, 28, 14, 24, 32, 16, 22, 12, 28, 18, 30, 14, 20, 10];

const siteOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

function Bars({ moving }: { moving: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-[5px] overflow-hidden" aria-hidden="true">
      {BARS.map((height, index) => (
        <span
          key={index}
          style={{ height, animationDelay: `${index * -90}ms` }}
          className={`w-1 shrink-0 rounded-full bg-sky ${moving ? "motion-safe:animate-bar" : ""}`}
        />
      ))}
    </span>
  );
}

export function Composer({
  lesson,
  person,
  matches,
  people,
  brief,
  stanley,
  onChange,
}: {
  lesson: Lesson;
  person: Person;
  matches: Match[];
  people: Person[];
  brief: Brief;
  stanley: Stanley;
  onChange: (patch: Partial<Brief> | ((current: Brief) => Partial<Brief>)) => void;
}) {
  const [angleError, setAngleError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [editingTake, setEditingTake] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noting, setNoting] = useState(false);
  const { sending, send } = useSendBrief(stanley, onChange);

  // The person chosen first, then up to two others who need the same lesson.
  const others = rankFor(lesson.id, matches).filter((match) => match.personId !== person.id).slice(0, 2);
  const situations = [person.situation, ...others.flatMap((match) => people.find((item) => item.id === match.personId)?.situation ?? [])]
    .map((situation) => situation.slice(0, 100));
  const needsAngle = !brief.question;
  const situationsKey = JSON.stringify(situations);

  useEffect(() => {
    if (!needsAngle) return;
    const controller = new AbortController();
    postJson<{ niche: NicheLine[]; angle: string; question: string }>(
      "angle",
      { lesson, situations: JSON.parse(situationsKey) },
      controller.signal,
    )
      .then((found) => {
        setAngleError(null);
        onChange({ ...found, question: found.question || FALLBACK_QUESTION });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setAngleError(errorText(cause));
      });
    return () => controller.abort();
    // The composer is remounted per lesson and person, so this runs once for each unless retried.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAngle, attempt]);

  const take = brief.take.trim();
  const showTranscript = editingTake || !brief.post;

  async function writePost() {
    setWriting(true);
    setError(null);
    try {
      const { post } = await postJson<{ post: string }>("post", {
        lesson: lesson.lesson,
        evidence: lesson.evidence.map((item) => item.quote),
        angle: brief.angle,
        take,
        situations,
        // Only the short niche lines, never the cited excerpts, so no one's words reach the post.
        nicheSummary: brief.niche.map((line) => line.text).join("\n"),
      });
      // A new post means the old brief and note no longer match the take.
      onChange({ post, text: "", note: "", handoff: "none" });
      setEditingTake(false);
      setNoteOpen(false);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setWriting(false);
    }
  }

  function reviewBrief() {
    try {
      if (!brief.text) {
        onChange({ text: buildBrief({ lesson: lesson.lesson, situation: person.situation, angle: brief.angle, take }) });
      }
      setReviewing(true);
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  async function toggleNote() {
    const opening = !noteOpen;
    setNoteOpen(opening);
    if (!opening || brief.note || noting || !take) return;
    setNoting(true);
    try {
      const { note } = await postJson<{ note: string }>("note", {
        evidence: lesson.evidence.map((item) => item.quote),
        take,
        situation: person.situation,
        quote: person.quote,
      });
      onChange({ note });
    } catch (cause) {
      setError(errorText(cause));
      setNoteOpen(false);
    } finally {
      setNoting(false);
    }
  }

  return (
    <main className="flex min-h-0 flex-1 gap-8 pt-2 pr-8 pb-6 pl-10">
      <section className="flex w-[clamp(360px,33.4vw,480px)] shrink-0 flex-col gap-5 overflow-y-auto pt-4 short:gap-2.5 short:pt-1">
        <h1 className="shrink-0 font-display text-[clamp(30px,4.6dvh,40px)] leading-[1.2] font-semibold short:text-[25px]">{person.situation}</h1>

        <div className="my-auto flex shrink-0 flex-col gap-5 short:gap-2.5">
          <div>
            <p className="text-[15px] text-muted">
              Your niche this week, via <span className="font-bold text-blue">You.com</span>
            </p>
            {brief.question && brief.niche.length > 0 && (
              <ul className="mt-2 short:mt-1">
                {brief.niche.map((line) => (
                  <li key={`${line.text}${line.source}`} className="grid min-h-12 grid-cols-[1fr_44%] items-center gap-3 py-1 short:min-h-9 short:py-0.5">
                    <span className="text-[18px] leading-6 short:text-[16px] short:leading-5">{line.text}</span>
                    <a
                      href={line.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[15px] font-semibold text-blue underline underline-offset-4"
                    >
                      {siteOf(line.source)} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {brief.question && brief.niche.length === 0 && <p className="mt-3 text-[18px]">No sources found</p>}
            {!brief.question && !angleError && <p className="mt-3 animate-pulse text-[18px] text-blue">Answer: reading your niche</p>}
            {!brief.question && angleError && (
              <p className="mt-3 flex items-center gap-3 text-[16px]">
                {angleError}
                <button
                  type="button"
                  className="font-semibold text-blue"
                  onClick={() => {
                    setAngleError(null);
                    setAttempt((n) => n + 1);
                  }}
                >
                  Retry
                </button>
              </p>
            )}
          </div>

          {brief.angle && (
            <div className="rounded-panel bg-navy px-7 py-6 text-white short:px-5 short:py-3">
              <p className="text-[15px] text-sky">Only you can say</p>
              <p className="mt-2 font-display text-[clamp(24px,3.6dvh,32px)] leading-[1.25] font-semibold short:mt-1 short:text-[22px]">{brief.angle}</p>
            </div>
          )}
        </div>

        <div className="shrink-0">
          <h2 className="mb-3 font-display text-[24px] leading-8 font-semibold short:mb-2 short:text-[19px] short:leading-6">{brief.question || FALLBACK_QUESTION}</h2>
          <div className={`flex gap-4 bg-panel p-3 ${showTranscript ? "items-end rounded-[28px]" : "items-center rounded-full"}`}>
            <VoiceInput
              onListening={setListening}
              onText={(part) => onChange((current) => ({ take: `${current.take} ${part}`.trim() }))}
            />
            {listening ? (
              <Bars moving />
            ) : showTranscript ? (
              <textarea
                aria-label="Your answer"
                placeholder="Say it or type it"
                rows={4}
                maxLength={7000}
                value={brief.take}
                onChange={(event) => onChange({ take: event.target.value })}
                className="min-w-0 flex-1 resize-none bg-transparent py-2 text-[18px] leading-6 outline-none placeholder:text-muted short:h-[88px] short:text-[16px] short:leading-5"
              />
            ) : (
              <>
                <Bars moving={false} />
                <button type="button" aria-label="Edit your answer" onClick={() => setEditingTake(true)} className="shrink-0 p-3 text-muted">
                  <Pencil />
                </button>
              </>
            )}
          </div>
          {editingTake && brief.post && (
            <button
              type="button"
              onClick={writePost}
              disabled={writing || !take}
              className="mt-2 px-3 py-1 text-[16px] font-semibold text-blue disabled:opacity-50"
            >
              {writing ? "Writing" : "Rewrite post"}
            </button>
          )}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-panel bg-panel p-8 short:p-5">
          <h2 className="shrink-0 font-display text-[38px] leading-[46px] font-semibold short:text-[28px] short:leading-8">Your post</h2>
          {brief.post ? (
            <textarea
              aria-label="Your post"
              value={brief.post}
              onChange={(event) => onChange({ post: event.target.value })}
              className="mt-5 min-h-0 flex-1 resize-none rounded-field bg-white p-[clamp(20px,4dvh,40px)] short:mt-3 short:p-5 text-[clamp(19px,2.7dvh,24px)] leading-[1.46]"
            />
          ) : (
            <div className="mt-5 flex min-h-0 flex-1 items-center justify-center rounded-field bg-white text-[19px] text-muted">
              {writing ? <span className="animate-pulse">Writing your post</span> : "Answer, then write"}
            </div>
          )}
          <div className="mt-2">
            <ErrorLine message={error} />
          </div>
          <div className="mt-3 flex shrink-0 items-center gap-3">
            {brief.post ? (
              <CopyButton primary text={brief.post} className="min-w-0 flex-1 !px-4">
                <Copy className="size-7" /> Copy post
              </CopyButton>
            ) : (
              <Primary className="min-w-0 flex-1" onClick={writePost} disabled={!take || writing}>
                {writing ? "Writing" : "Write post"} <ArrowRight className="size-7" />
              </Primary>
            )}
            {take && (
              <Secondary onClick={reviewBrief}>
                {sending.busy ? "Stanley is saving" : brief.handoff === "sent" ? "Sent to Stanley" : stanley.available ? "Send to Stanley" : "Stanley brief"}
              </Secondary>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-[28px] border border-dashed border-line">
          <div className="flex h-[66px] items-center gap-3 pr-3 pl-6">
            <button
              type="button"
              onClick={toggleNote}
              disabled={!take}
              aria-expanded={noteOpen}
              className="flex h-full flex-1 items-center gap-3 text-left text-[17px] font-semibold"
            >
              <Mail /> Personal note
            </button>
            <span className="text-[15px] text-muted">{noting ? "Writing" : "Not sent to Stanley"}</span>
            {brief.note && (
              <CopyButton text={brief.note} className="!h-11">
                Copy
              </CopyButton>
            )}
          </div>
          {noteOpen && brief.note && (
            <textarea
              aria-label="Personal note"
              rows={3}
              value={brief.note}
              onChange={(event) => onChange({ note: event.target.value })}
              className="w-full resize-none rounded-b-[28px] px-6 pb-4 text-[17px] leading-6"
            />
          )}
        </div>
      </section>

      {reviewing && (
        <BriefReview
          brief={brief}
          stanley={stanley}
          sending={sending}
          onSend={(text) => void send(text)}
          onChange={onChange}
          onClose={() => setReviewing(false)}
        />
      )}
    </main>
  );
}
