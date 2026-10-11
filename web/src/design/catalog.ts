/**
 * The UI design system for the calculator: principles and every component, with when to use it and when not.
 * One source for both the live gallery (#/design) and docs/ui-design-system.md (generated; a test keeps them in
 * step). Visual tokens come from the Crashfree India design system; deviations are listed with their reason.
 */

export interface Principle {
  title: string;
  body: string;
  source?: string;
}

export interface ComponentSpec {
  name: string;
  /** Where it lives in web/src. */
  file: string;
  use: string;
  avoid: string;
  rules: string[];
}

export const EVIDENCE: { finding: string; source: string; consequence: string }[] = [
  {
    finding:
      "The most common phone screen in India is 360×800 CSS pixels (15.3%); the next are 393, 384 and 385 px wide.",
    source: "StatCounter, mobile screen resolution, India, Sept 2026",
    consequence: "Every page is designed and tested at 360 px first, and at 320 px (the WCAG reflow width).",
  },
  {
    finding:
      "Ask one question per page; give every question page a back link, a heading and a Continue button; prefer a simple caption to a step bar; use three boxes for dates; avoid sliders; mark optional questions '(optional)'.",
    source: "GOV.UK Design System, question pages pattern",
    consequence: "The estimate is asked as short question pages ending in 'Check your answers'.",
  },
  {
    finding:
      "India's government design system covers patterns Indian users meet in public services (OTP, steppers, grievances).",
    source: "UX4G Design System 3.0, NeGD / MeitY (ux4g.gov.in)",
    consequence:
      "Used as a reference for familiar patterns; the Crashfree India design system stays the visual authority.",
  },
];

export const PRINCIPLES: Principle[] = [
  {
    title: "One topic per page",
    body: "Each page asks one thing; answers that belong together (state and area, proof and amount, the family) share a page. About 12 pages for a death claim and 15 for an injury, with branches skipped.",
    source: "GOV.UK question pages",
  },
  {
    title: "Nothing pre-selected",
    body: "No answer is filled in for the person. Where 'I don't know' is a valid answer it is offered as 'Not sure', which is recorded as no answer, never as a guess.",
  },
  {
    title: "Phone first, thumb reach",
    body: "Designed at 360 px. Controls are at least 48 px tall; the main button is full width on a phone and sits directly under the answers (no sticky bars: they cover the field being typed into when the keyboard opens).",
  },
  {
    title: "The answer first, the working on demand",
    body: "The result opens with the amount in lakh, its range and how far real awards land. How it is built, what could move it, what to prove, real cases and sources open on demand, and always print in full.",
  },
  {
    title: "Back always works",
    body: "Every question page is its own entry in the browser history, so the phone's back gesture goes to the previous question with answers kept. 'Check your answers' is the hub for changes.",
  },
  {
    title: "Private by design",
    body: "Answers stay in this browser tab (they survive a reload, and vanish when the tab is closed). Nothing typed is sent anywhere; visit counts never include answers.",
  },
  {
    title: "Colour is never the only signal",
    body: "Status colours mark bars, borders and icons; text stays dark and says what it is ('Stop', 'Caution', 'Error'). Red is used only for a stop or an error.",
  },
  {
    title: "Plain, empirical words",
    body: "Short sentences, numbers first, no emoji, no 'victim' (people affected). Hindi is offered on every page and labelled as a draft until reviewed by a native legal-language reviewer.",
  },
];

export const DEVIATIONS: { what: string; why: string }[] = [
  {
    what: "Body grey #6c6a7e instead of #777589",
    why: "#777589 is 4.48:1 on white, just under WCAG AA (4.5:1) for body text; #6c6a7e is about 5.2:1.",
  },
  {
    what: "Orange #F57C00 used for icons and decorative bars only",
    why: "It is 2.7:1 on white, below the 3:1 needed for a meaningful border and the 4.5:1 for text.",
  },
  {
    what: "Red #F10015 marks form errors (border and icon) as well as stops",
    why: "An error is a stop for that question. It is about 4.4:1, so error text stays dark.",
  },
  {
    what: "Tool pages: a max-w-2xl content column inside the max-w-7xl container, with py-8 / py-12 padding",
    why: "A readable line length for questions, and the question stays in the first screen of a 360×800 phone (py-24 would use a quarter of it).",
  },
  {
    what: "Form field borders in grey at 80%, not the hairline border token",
    why: "A field's edge must be visible (WCAG 1.4.11 asks for 3:1; the hairline token is about 1.2:1).",
  },
];

export const COMPONENTS: ComponentSpec[] = [
  {
    name: "Phase banner (DRAFT)",
    file: "components/chrome.tsx",
    use: "Every page until legal sign-off.",
    avoid: "Removing it before the rules are signed off.",
    rules: ["One line at 360 px.", "Hindi pages add a second line saying the translation is a draft."],
  },
  {
    name: "Header",
    file: "components/chrome.tsx",
    use: "Wordmark, language switch and, outside the questions, the menu.",
    avoid: "Showing the menu on question pages (it distracts and competes with Continue).",
    rules: ["48 px targets.", "The language switch keeps every answer.", "Skip link to the main content."],
  },
  {
    name: "Back link",
    file: "pages/Questions.tsx",
    use: "Top of every question, Check and stop page.",
    avoid: "Start and result pages.",
    rules: [
      "Goes to the previous question on the person's path, answers kept.",
      "From a change made on Check, goes back to Check.",
    ],
  },
  {
    name: "Question page",
    file: "pages/Questions.tsx",
    use: "One topic: the section caption, the question as the h1, the answers, then Continue.",
    avoid: "Several unrelated questions on one page.",
    rules: [
      "When the page asks one question, its label or legend is the h1, so screen readers hear it once.",
      "Caption shows the section ('The person · part 2 of 4'), which stays stable when the path branches.",
      "Continue is left-aligned under the answers; full width on a phone.",
    ],
  },
  {
    name: "Radios (large / compact)",
    file: "components/form.tsx",
    use: "Up to about 7 either/or choices. Large for a page's main choice (whole card tappable, optional hint); compact for Yes / No.",
    avoid: "Long lists (use Select) or choices that are not exclusive (use Checkbox).",
    rules: [
      "Rows at least 48 px (large: 56 px).",
      "'Not sure' last, where it is a valid answer.",
      "Nothing pre-selected.",
    ],
  },
  {
    name: "Select",
    file: "components/form.tsx",
    use: "Long lists: state, occupation.",
    avoid: "Short lists (use Radios).",
    rules: [
      "Native select: it is the most usable list on Android.",
      "First option is 'Choose' or 'Not in this list'.",
    ],
  },
  {
    name: "Date input (day / month / year)",
    file: "components/form.tsx",
    use: "Dates people know: the accident, the claim.",
    avoid: "The phone's date picker (month-first on many devices, slow for dates years back).",
    rules: [
      "Three numeric boxes with labels.",
      "Hint 'For example, 15 6 2025'.",
      "Rejects dates that do not exist (31 2 2025) and future dates.",
    ],
  },
  {
    name: "Money input",
    file: "components/form.tsx",
    use: "Rupee amounts: salary, tax, ITR income, pension, bills.",
    avoid: "Counts and percentages.",
    rules: [
      "₹ prefix and the numeric keypad; commas allowed.",
      "Reads the amount back as it is typed ('= ₹2.5 lakh a month') so a missing or extra zero is caught.",
    ],
  },
  {
    name: "Number input",
    file: "components/form.tsx",
    use: "Age, percentages, months, days.",
    avoid: "Money.",
    rules: ["Short box with its unit after it (years, %, months, days).", "Numeric keypad."],
  },
  {
    name: "Counter",
    file: "components/form.tsx",
    use: "Small counts: children and parents who claim.",
    avoid: "Numbers that can be large.",
    rules: [
      "Starts unanswered (–); 0 is an answer, not a default.",
      "− and + buttons are 48 px; the box can also be typed in.",
    ],
  },
  {
    name: "Checkbox",
    file: "components/form.tsx",
    use: "An independent extra fact (needs an attendant permanently).",
    avoid: "Either/or choices.",
    rules: ["Whole row tappable."],
  },
  {
    name: "Reveal",
    file: "components/form.tsx",
    use: "A follow-up that belongs to an answer on the same page (the amount once a proof is chosen; the claim date once 'Yes').",
    avoid: "Hiding whole questions (the question graph decides which pages are asked).",
    rules: ["Indented with a brand-tint bar."],
  },
  {
    name: "Error summary and inline errors",
    file: "components/form.tsx",
    use: "After Continue, when an answer is missing or wrong.",
    avoid: "Errors while the person is still typing.",
    rules: [
      "The summary takes focus and links to each question.",
      "Each field shows its own message: red border and icon, dark text, prefixed 'Error' for screen readers.",
    ],
  },
  {
    name: "Check your answers",
    file: "components/result.tsx (SummaryList)",
    use: "The hub before the result, and where 'Change answers' leads.",
    avoid: "—",
    rules: ["Each answer with a Change link to its page.", "Stacks as question / answer on a phone."],
  },
  {
    name: "Stop page",
    file: "pages/Questions.tsx",
    use: "An answer that ends or redirects a section 166 claim: owner-driver alone, vehicle never traced, no-fault compensation taken through the insurer.",
    avoid: "Cautions (those are notices on the result).",
    rules: [
      "Says why, what to do next (DLSA, NALSA 15100, the hit-and-run scheme amounts) and offers to change the answer.",
    ],
  },
  {
    name: "Notice (info / caution / stop)",
    file: "components/ui.tsx",
    use: "Warnings on the result and stop pages.",
    avoid: "Form errors.",
    rules: [
      "Colour bar and icon plus a text label; red only for a stop.",
      "Stops and cautions shown; notes collapsed.",
    ],
  },
  {
    name: "Answer panel",
    file: "components/result.tsx",
    use: "The one headline amount.",
    avoid: "Any other figure.",
    rules: ["Lakh / crore first, the exact amount below, and one line on what it means."],
  },
  {
    name: "Range",
    file: "components/result.tsx (RangeBar)",
    use: "Conservative, standard and claimant's best, with a bar when the range is narrow enough to read as one.",
    avoid: "A bar when the range is too wide (the three amounts and the swing factors say more).",
    rules: ["Values always given as text; the bar is decorative."],
  },
  {
    name: "Breakdown list",
    file: "pages/Result.tsx",
    use: "Each head of compensation with its formula and linked source, then the total.",
    avoid: "Wide tables on a phone.",
    rules: ["Stacked rows.", "Working figures listed separately, never added to the total."],
  },
  {
    name: "Disclosure",
    file: "components/result.tsx",
    use: "Secondary result sections.",
    avoid: "The amount, the range, stops and cautions.",
    rules: ["A button with aria-expanded and a panel.", "Panels always print expanded."],
  },
  {
    name: "Checklist",
    file: "components/result.tsx",
    use: "What to prove.",
    avoid: "—",
    rules: ["Plain list with a tick icon; to be confirmed by the legal reviewers."],
  },
  {
    name: "Case card",
    file: "pages/Result.tsx",
    use: "A real public case: summary, its journey as a timeline, what mattered, how it is similar and different.",
    avoid: "Implying the person will get the same amount.",
    rules: ["English case text is marked lang='en' on Hindi pages.", "Links to the judgment."],
  },
  {
    name: "Buttons",
    file: "components/ui.tsx",
    use: "Primary: the page's one main action. Secondary: alternatives. Links: navigation.",
    avoid: "Two primary buttons on one page.",
    rules: ["48 px tall, rounded; full width on a phone for the main action.", "Primary has the arrow icon."],
  },
  {
    name: "Share actions",
    file: "components/result.tsx",
    use: "The phone's own share sheet when available, otherwise 'Copy summary'; print / save as PDF.",
    avoid: "wa.me links (they put the estimate in a URL sent to a third party).",
    rules: [
      "The shared text always carries DRAFT, the as-of date and 'not legal advice'.",
      "Nothing is sent to our server.",
    ],
  },
  {
    name: "Documents (prose and tables)",
    file: "pages/Doc.tsx",
    use: "Methodology, rules reference, offer study, rendered from the repository.",
    avoid: "Editing the text here: it is generated from docs/*.md.",
    rules: ["Tables scroll inside their own box; the page never scrolls sideways."],
  },
  {
    name: "Footer",
    file: "components/chrome.tsx",
    use: "Privacy line, what visit counts record, legal aid, sources, versions.",
    avoid: "—",
    rules: ["Rules and engine versions shown so a printout can be traced."],
  },
];

/** docs/ui-design-system.md, generated from the catalogue above. */
export function renderDesignDoc(): string {
  const L: string[] = [];
  L.push("# UI design system: motor accident compensation estimate");
  L.push("");
  L.push(
    "_Generated from `web/src/design/catalog.ts` by `npm run web:design-doc`. Do not edit by hand: a test fails if this file and the catalogue disagree. The live gallery is at `#/design` on the site._",
  );
  L.push("");
  L.push(
    "Visual tokens (colours, type, radius, spacing) come from the Crashfree India design system. This document adds what a mobile, form-heavy public tool needs: the evidence behind the pattern, principles, every component with when to use it, and the deliberate deviations.",
  );
  L.push("", "## Evidence", "", "| Finding | Source | What we do |", "|---|---|---|");
  for (const e of EVIDENCE) L.push(`| ${e.finding} | ${e.source} | ${e.consequence} |`);
  L.push("", "## Principles", "");
  for (const p of PRINCIPLES) L.push(`- **${p.title}.** ${p.body}${p.source ? ` _(${p.source})_` : ""}`);
  L.push("", "## Components", "");
  for (const c of COMPONENTS) {
    L.push(`### ${c.name}`, "");
    L.push(`- **Use for:** ${c.use}`);
    L.push(`- **Not for:** ${c.avoid}`);
    for (const r of c.rules) L.push(`- ${r}`);
    L.push(`- _Code:_ \`web/src/${c.file}\``, "");
  }
  L.push("## Deviations from the Crashfree India design system", "", "| What | Why |", "|---|---|");
  for (const d of DEVIATIONS) L.push(`| ${d.what} | ${d.why} |`);
  L.push("");
  return L.join("\n");
}
