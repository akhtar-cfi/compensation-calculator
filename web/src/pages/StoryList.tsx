import { useRef, useState } from "preact/hooks";
import { ChevronDown, ExternalLink } from "lucide-preact";
import { summariseJourney } from "../../../src/cases/match.js";
import type { Case } from "../../../src/cases/schema.js";
import stories from "../generated/stories.json";
import { useLang, useT } from "../i18n";
import { CaseTimeline } from "../components/result";

/**
 * The start page's real stories (picked in stories.ts, baked in at build time), each told whole: a few at a time,
 * nothing cut off. Its own small file, fetched after the welcome page.
 */

/** How many stories show before "Show more" (each tells a whole journey, so a phone shows a few at a time). */
const FIRST = 3;

export function StoryList() {
  const t = useT();
  const all = stories as unknown as Case[];
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const shown = open ? all : all.slice(0, FIRST);
  const more = () => {
    setOpen(true);
    // The first new story takes the focus, so a keyboard or screen-reader user carries on from there.
    requestAnimationFrame(() =>
      list.current?.querySelectorAll<HTMLElement>("[data-story] h3")[FIRST]?.focus(),
    );
  };
  return (
    <>
      <ul ref={list} class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((c) => (
          <Story key={c.id} c={c} />
        ))}
      </ul>
      {!open && all.length > FIRST && (
        <button
          type="button"
          onClick={more}
          data-action="more-stories"
          class="mt-6 flex min-h-11 w-fit items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground shadow-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t("story.more", { n: all.length - FIRST })}
        </button>
      )}
    </>
  );
}

/** Judgments write "Rs 2.42 lakh"; the page writes ₹, as in the timeline beside it. */
const rupees = (s: string) => s.replace(/\bRs\.?\s?/g, "₹");

/** One real case, whole: the story, each step's amount and year, how long it took, and what made the difference. */
function Story(props: { c: Case }) {
  const t = useT();
  const lang = useLang();
  const { c } = props;
  const j = summariseJourney(c);
  const en = lang === "hi" ? "en" : undefined;
  const year = c.facts.accident_date?.slice(0, 4);
  // The card says death or injury in the page's language, so the title need not.
  const title = c.title.replace(/\s*\((death|injury)\)$/, "").replace(/\((death|injury); /, "(");
  const outcome = [
    j.years !== undefined ? t("res.cases.years", { y: j.years }) : undefined,
    j.multiple !== undefined
      ? t(j.finalForum === "mact" ? "res.cases.multOffer" : "res.cases.multTribunal", {
          x: j.multiple.toFixed(1),
        })
      : undefined,
  ].filter(Boolean);
  return (
    <li
      data-story={c.id}
      class="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
    >
      <p class="flex flex-wrap items-center gap-2 text-xs font-medium">
        <span
          class={`rounded-full px-2.5 py-0.5 ${c.kind === "death" ? "bg-muted text-foreground" : "bg-brand-tint text-brand"}`}
        >
          {t(`story.kind.${c.kind}`)}
        </span>
        {year && <span class="text-muted-foreground">{t("story.year", { y: year })}</span>}
      </p>
      <h3
        tabIndex={-1}
        class="mt-3 font-heading text-lg leading-snug font-bold text-foreground outline-none"
        lang="en"
      >
        {title}
      </h3>
      <p class="mt-2 text-sm leading-relaxed text-muted-foreground" lang={en}>
        {rupees(c.summary)}
      </p>
      <CaseTimeline c={c} />
      {outcome.length > 0 && (
        <p
          class="mt-3 rounded-lg bg-brand-lite px-3 py-2 text-sm font-semibold text-foreground"
          data-outcome=""
        >
          {outcome.join(" · ")}
        </p>
      )}
      <details class="group mt-3 text-sm">
        <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-foreground hover:underline [&::-webkit-details-marker]:hidden">
          {t("story.mattered")}
          <ChevronDown
            aria-hidden="true"
            class="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <ul class="mt-1 list-disc space-y-1 pl-5 text-muted-foreground" lang={en}>
          {c.what_mattered.map((w) => (
            <li key={w}>{rupees(w)}</li>
          ))}
        </ul>
      </details>
      <a
        href={c.source_url}
        target="_blank"
        rel="noopener noreferrer"
        class="mt-auto inline-flex min-h-11 items-center gap-1 pt-2 text-sm text-brand underline underline-offset-4 hover:no-underline"
      >
        {t("res.cases.read")}
        <ExternalLink aria-hidden="true" class="h-4 w-4" />
      </a>
    </li>
  );
}
