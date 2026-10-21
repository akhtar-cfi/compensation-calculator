import { useRef, useState } from "preact/hooks";
import type { Case } from "../../../src/cases/schema.js";
import stories from "../generated/stories.json";
import { useT } from "../i18n";
import { CaseStory } from "../components/story";

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
          <CaseStory key={c.id} c={c} role="story" />
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
