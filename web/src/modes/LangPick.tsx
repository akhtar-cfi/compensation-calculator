import type { Lang } from "../translate";

/**
 * The first question of the step-by-step and chat flows: the language, in both languages, as two big buttons.
 */
export function LangPick(props: { onPick: (l: Lang) => void; current: Lang }) {
  const btn =
    "flex min-h-16 w-full items-center justify-center rounded-2xl border px-6 text-xl font-semibold shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  return (
    <div data-slow="lang" data-chat-lang="">
      <h1
        id="page-title"
        tabIndex={-1}
        class="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
      >
        <span lang="hi">भाषा चुनें</span> <span class="text-muted-foreground">/</span>{" "}
        <span lang="en">Choose a language</span>
      </h1>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          lang="hi"
          data-value="hi"
          onClick={() => props.onPick("hi")}
          class={`${btn} border-input bg-background hover:border-brand hover:bg-brand-lite`}
        >
          हिंदी
        </button>
        <button
          type="button"
          lang="en"
          data-value="en"
          onClick={() => props.onPick("en")}
          class={`${btn} border-input bg-background hover:border-brand hover:bg-brand-lite`}
        >
          English
        </button>
      </div>
    </div>
  );
}
