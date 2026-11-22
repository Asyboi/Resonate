"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorText, NEEDS_CODE, postEvents, saveDemoCode } from "@/lib/client";
import { defaultSelection, topMatches, type Selection } from "@/lib/graph";
import { countCall, IDLE, type Run } from "@/lib/run";
import { CONNECT_NOTICE, useStanley, type Stanley } from "@/lib/stanley-client";
import { EMPTY, load, save, type Saved } from "@/lib/store";
import type { Brief, DiscoverEvent, Lesson, Match, Person } from "@/lib/types";
import { Composer } from "./Composer";
import { Mark } from "./icons";
import { LessonsScreen } from "./LessonsScreen";
import { MapScreen } from "./MapScreen";
import { field, Modal, Primary } from "./ui";

type Stage = "lessons" | "map" | "post";
const STAGES: [Stage, string][] = [
  ["lessons", "Lessons"],
  ["map", "Map"],
  ["post", "Post"],
];
const ARRIVAL_GAP_MS = 150;
const NOTICE_MS = 8000;
const RETURN_KEY = "resonate:return-to";

/** Where the creator was before leaving to sign in to Stanley. */
function takeReturn(): { stage?: Stage; writingFor?: Selection | null } {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

const briefKey = (selection: Selection) => `${selection.lessonId}:${selection.personId}`;

const newBrief = (selection: Selection): Brief => ({
  lessonId: selection.lessonId,
  personIds: [selection.personId],
  niche: [],
  angle: "",
  question: "",
  take: "",
  post: "",
  text: "",
  note: "",
  handoff: "none",
});

function addFound(saved: Saved, person: Person, matches: Match[]): Saved {
  const key = (match: Match) => `${match.lessonId}:${match.personId}`;
  const incoming = new Set(matches.map(key));
  const known = saved.people.some((item) => item.id === person.id);
  return {
    ...saved,
    people: known ? saved.people : [...saved.people, person],
    matches: [...saved.matches.filter((match) => !incoming.has(key(match))), ...matches],
  };
}

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [stage, setStage] = useState<Stage>("lessons");
  const [run, setRun] = useState<Run>(IDLE);
  const [picked, setPicked] = useState<Selection | null>(null);
  const [writingFor, setWritingFor] = useState<Selection | null>(null);
  const [askCode, setAskCode] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const controller = useRef<AbortController>(null);
  const stanleyState = useStanley();

  useEffect(() => {
    let live = true;
    void load().then((stored) => {
      if (!live) return;
      setSaved(stored);
      setRun({ ...IDLE, saved: Boolean(stored.runAt) });
      const result = new URLSearchParams(window.location.search).get("stanley");
      if (result) {
        const back = takeReturn();
        if (back.stage) setStage(back.stage);
        if (back.writingFor) setWritingFor(back.writingFor);
        setNotice(CONNECT_NOTICE[result] ?? null);
        window.history.replaceState(null, "", "/");
      }
      setHydrated(true);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void save(saved), 250);
    return () => clearTimeout(timer);
  }, [hydrated, saved]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const ask = () => setAskCode(true);
    window.addEventListener(NEEDS_CODE, ask);
    return () => {
      window.removeEventListener(NEEDS_CODE, ask);
      controller.current?.abort();
    };
  }, []);

  const shown = useMemo(() => {
    const lessonIds = new Set(saved.lessons.map((lesson) => lesson.id));
    const matches = topMatches(
      saved.people,
      saved.matches.filter((match) => lessonIds.has(match.lessonId)),
    );
    const personIds = new Set(matches.map((match) => match.personId));
    return { matches, people: saved.people.filter((person) => personIds.has(person.id)) };
  }, [saved.lessons, saved.people, saved.matches]);

  // Follows the strongest cluster until the creator picks someone.
  const selection = useMemo(() => {
    const stillThere = picked && shown.matches.some((m) => m.lessonId === picked.lessonId && m.personId === picked.personId);
    return stillThere ? picked : defaultSelection(shown.matches);
  }, [picked, shown.matches]);

  function begin(next: Partial<Run>): AbortController {
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setRun({ ...IDLE, running: true, ...next });
    return active;
  }

  function onCommonEvent(event: DiscoverEvent) {
    if (event.type === "status") setRun((current) => countCall(current, event.message, event.you));
    if (event.type !== "error") return;
    const { lessonId, message } = event;
    setRun((current) =>
      lessonId
        ? { ...current, failed: [...new Set([...current.failed, lessonId])] }
        : { ...current, error: message },
    );
  }

  /** A full run replaces the last map once it finds someone. A retry adds to it. */
  async function findPeople(lessons: Lesson[], replace: boolean) {
    if (!lessons.length) return;
    const hadRun = Boolean(saved.runAt);
    const active = begin({});
    setStage("map");
    if (replace) setPicked(null);

    let found = 0;
    let finished = false;
    let failed = false;
    try {
      for await (const event of postEvents("discover", { lessons, audience: saved.audience || undefined }, active.signal)) {
        if (active.signal.aborted) return;
        onCommonEvent(event);
        if (event.type === "error") failed = true;
        if (event.type === "done") finished = true;
        if (event.type === "person") {
          const first = found++ === 0;
          const at = new Date().toISOString();
          setSaved((current) =>
            addFound(
              first && replace ? { ...current, people: [], matches: [], runAt: at } : { ...current, runAt: at },
              event.person,
              event.matches,
            ),
          );
        }
      }
      if (!finished) throw new Error("Connection lost. Try again.");
      if (found === 0 && !failed) {
        const at = new Date().toISOString();
        setSaved((current) => (replace ? { ...current, people: [], matches: [], runAt: at } : { ...current, runAt: at }));
      }
      setRun((current) => ({
        ...current,
        running: false,
        saved: failed && found === 0 && hadRun,
        error: failed && found === 0 ? "Search failed. Try again." : current.error,
      }));
    } catch (cause) {
      if (active.signal.aborted) return;
      // Nothing new arrived, so the last real run is still on screen, labeled with its time.
      setRun((current) => ({ ...current, running: false, error: errorText(cause), saved: found === 0 && hadRun }));
    }
  }

  async function resonate(comment: string) {
    const active = begin({ loop: { comment, found: null, personIds: [], pulseAt: null } });
    setPicked(null);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const body = {
        comment,
        lessons: saved.lessons,
        audience: saved.audience || undefined,
        exclude: saved.people.map((person) => person.url).slice(-300),
      };
      for await (const event of postEvents("resonate", body, active.signal)) {
        if (active.signal.aborted) return;
        onCommonEvent(event);
        if (event.type === "resonance") {
          const { lessonId, situation, queries } = event;
          const pulseAt = Date.now();
          setRun((current) => ({
            ...current,
            loop: current.loop && { ...current.loop, found: { lessonId, situation, queries }, pulseAt },
          }));
        }
        if (event.type === "person") {
          const { person, matches } = event;
          setSaved((current) => addFound({ ...current, runAt: current.runAt ?? new Date().toISOString() }, person, matches));
          setRun((current) => ({
            ...current,
            loop: current.loop && { ...current.loop, personIds: [...current.loop.personIds, person.id], pulseAt: Date.now() },
          }));
          // Staggered, so each new person visibly springs out.
          if (!reduced) await new Promise((resolve) => setTimeout(resolve, ARRIVAL_GAP_MS));
        }
      }
      setRun((current) => ({ ...current, running: false }));
    } catch (cause) {
      if (!active.signal.aborted) setRun((current) => ({ ...current, running: false, error: errorText(cause) }));
    }
  }

  function changeAudience(audience: string) {
    if (audience === saved.audience) return;
    // A run still going was aimed at the old line, and its marks belong to that line.
    if (run.running) {
      controller.current?.abort();
      setRun((current) => ({ ...current, running: false }));
    }
    setSaved((current) => ({ ...current, audience, people: current.people.map((person) => ({ ...person, likeAudience: undefined })) }));
  }

  const changeBrief = useCallback((target: Selection, patch: Partial<Brief> | ((current: Brief) => Partial<Brief>)) => {
    setSaved((current) => {
      const key = briefKey(target);
      const brief = current.briefs[key] ?? newBrief(target);
      return { ...current, briefs: { ...current.briefs, [key]: { ...brief, ...(typeof patch === "function" ? patch(brief) : patch) } } };
    });
  }, []);

  const target = writingFor ?? selection;

  async function connectStanley() {
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ stage, writingFor: target }));
    } catch {
      // Without storage, sign-in returns to Lessons.
    }
    // Saves are debounced, so finish this one before leaving the page.
    await save(saved);
    // An OAuth redirect needs a full page load, so the router can't do this.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/api/stanley/connect");
  }
  const stanley: Stanley = { ...stanleyState, connect: () => void connectStanley() };
  const targetLesson = saved.lessons.find((lesson) => lesson.id === target?.lessonId);
  const targetPerson = saved.people.find((person) => person.id === target?.personId);

  return (
    <div className="flex h-dvh min-w-[1024px] flex-col overflow-hidden">
      <header className="grid h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center px-10">
        <p className="flex items-center gap-3 font-display text-[26px] font-semibold">
          <Mark /> Resonate
        </p>
        <nav className="flex items-center gap-1">
          {STAGES.map(([id, name]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStage(id)}
              aria-current={stage === id ? "page" : undefined}
              className={`h-11 w-28 rounded-full text-[18px] ${stage === id ? "bg-wash font-bold text-blue" : "text-muted hover:text-navy"}`}
            >
              {name}
            </button>
          ))}
        </nav>
      </header>

      {hydrated && stage === "lessons" && (
        <LessonsScreen
          contexts={saved.contexts}
          lessons={saved.lessons}
          audience={saved.audience}
          stanley={stanley}
          onFound={(contexts, lessons) =>
            setSaved((current) => ({ ...current, contexts: [...current.contexts, ...contexts], lessons: [...current.lessons, ...lessons].slice(0, 6) }))
          }
          onLessons={(lessons) => setSaved((current) => ({ ...current, lessons }))}
          onAudience={changeAudience}
          onFind={() => void findPeople(saved.lessons, true)}
        />
      )}

      {hydrated && stage === "map" && (
        <MapScreen
          lessons={saved.lessons}
          people={shown.people}
          matches={shown.matches}
          run={run}
          runAt={saved.runAt}
          selection={selection}
          onSelect={(next) => {
            setPicked(next);
            setRun((current) => ({ ...current, loop: null }));
          }}
          onSearch={() => void findPeople(saved.lessons, true)}
          onRetry={(ids) => void findPeople(saved.lessons.filter((lesson) => ids.includes(lesson.id)), false)}
          onResonate={(comment) => void resonate(comment)}
          onWrite={(next) => {
            setWritingFor(next);
            setPicked(next);
            setStage("post");
          }}
          onLessons={() => setStage("lessons")}
        />
      )}

      {hydrated &&
        stage === "post" &&
        (target && targetLesson && targetPerson ? (
          <Composer
            key={briefKey(target)}
            lesson={targetLesson}
            person={targetPerson}
            people={shown.people}
            matches={shown.matches}
            stanley={stanley}
            brief={saved.briefs[briefKey(target)] ?? newBrief(target)}
            onChange={(patch) => changeBrief(target, patch)}
          />
        ) : (
          <main className="flex flex-1 flex-col items-center justify-center gap-8">
            <h1 className="font-display text-[44px] font-semibold">Pick someone first</h1>
            <Primary onClick={() => setStage("map")}>Open the map</Primary>
          </main>
        ))}

      {notice && (
        <p role="status" className="fixed top-4 right-6 z-10 max-w-[380px] rounded-[24px] bg-navy px-5 py-3 text-[16px] text-white">
          {notice}
        </p>
      )}

      {askCode && (
        <Modal title="Demo code" onClose={() => setAskCode(false)}>
          <form
            className="flex items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              saveDemoCode(String(new FormData(event.currentTarget).get("code") ?? ""));
              setAskCode(false);
            }}
          >
            <input name="code" aria-label="Demo code" autoFocus autoComplete="off" className={field} />
            <Primary type="submit">Save</Primary>
          </form>
        </Modal>
      )}
    </div>
  );
}
