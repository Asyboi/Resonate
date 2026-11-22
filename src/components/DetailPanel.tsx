import type { Match, Person } from "@/lib/types";
import { ArrowRight, Verified } from "./icons";
import { Primary } from "./ui";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function DetailPanel({ person, match, onWrite }: { person: Person; match: Match; onWrite: () => void }) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(12px,calc(10dvh_-_54px),44px)] overflow-y-auto">
        <h2 className="font-display text-[clamp(25px,4dvh,36px)] leading-[1.2] font-semibold">{person.situation}</h2>
        <blockquote className="line-clamp-5 shrink-0 font-display text-[clamp(18px,2.9dvh,27px)] leading-[1.42]">“{person.quote}”</blockquote>
        <div className="rounded-field bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <a
              href={person.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-[18px] font-bold text-blue underline underline-offset-4"
            >
              {person.site} ↗
            </a>
            <time dateTime={person.publishedAt} className="shrink-0 text-[17px]">
              {day(person.publishedAt)}
            </time>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[16px] text-muted">
            {person.dateSource === "page" && <Verified className="size-5 text-blue" />}
            {person.dateSource === "page" ? "Date verified on page" : "Date from search"}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[16px] text-muted">Why you</p>
            <p className="flex gap-2" role="img" aria-label={`Match ${match.strength} of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`size-3 rounded-full ${n <= match.strength ? "bg-blue" : "bg-line"}`} />
              ))}
            </p>
          </div>
          <p className="mt-2 text-[clamp(17px,2.2dvh,19px)] leading-[1.4] font-bold">{match.why}</p>
        </div>
      </div>
      <Primary className="mt-5 w-full" onClick={onWrite}>
        Write for them <ArrowRight className="size-7" />
      </Primary>
    </>
  );
}
