/**
 * The UI design system for the calculator: principles and every component, with when to use it and when not.
 * One source for both the live gallery (#/design) and docs/ui-design-system.md (generated; a test keeps them in
 * step). Visual tokens come from crashfreeindia.org (its own shadcn/slate system); deviations are listed with their reason.
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
    consequence:
      "Every screen is designed and tested at 360 px first, and at 320 px (the WCAG reflow width).",
  },
  {
    finding:
      "crashfreeindia.org is built on shadcn 'new-york' with slate neutrals; the CFI blue is an accent (main buttons, eyebrows, one headline word, links, focus). Its own calculator is one card with all questions, in labelled sections.",
    source: "CFI Main Website source (src/styles.css, components/calculator) and screenshots, 12 Oct 2026",
    consequence:
      "This tool uses the same tokens and the same one-page form, so it reads as part of the website and could sit inside it.",
  },
  {
    finding:
      "One question per screen (tested on PR #1) was judged too slow by the CFI team: people want to see all the questions at once and change any answer in place.",
    source: "CFI review, 12 Oct 2026",
    consequence:
      "All questions on one page, grouped in four sections; the estimate updates beside the form as answers change.",
  },
  {
    finding:
      "Use three boxes for dates; avoid sliders; mark optional questions '(optional)'; show errors after the person leaves a field, not while typing.",
    source: "GOV.UK Design System (date input, error messages); Baymard Institute form usability research",
    consequence: "Dates are day / month / year boxes; errors appear when focus leaves an answer.",
  },
];

export const PRINCIPLES: Principle[] = [
  {
    title: "Everything on one page",
    body: "All questions sit in one card, in four sections (the accident, the person, family, injury and medical). An answer shows or hides only what depends on it, in place; nothing moves to another page.",
  },
  {
    title: "The estimate updates as you go",
    body: "As soon as the required answers are in, the amount, its range and how far real awards land appear beside the form (below it on a phone) and change with every answer. Until then the panel lists what is still needed, each a link to the question.",
  },
  {
    title: "The right control for each answer",
    body: "Two to four options are chips in a row; long lists are the phone's own picker; dates are three boxes; rupees have a ₹ prefix and read the amount back in lakh; small counts are − n + counters that start empty.",
  },
  {
    title: "Nothing pre-selected",
    body: "No answer is filled in for the person. Where 'I don't know' is a valid answer it is offered as 'Not sure', which is recorded as no answer, never as a guess.",
  },
  {
    title: "Phone first, thumb reach",
    body: "Designed at 360 px. Controls are at least 44 px tall on a phone. A slim bar at the bottom shows the estimate or the answers left; it hides while a field has focus, so it never covers the keyboard's field.",
  },
  {
    title: "Private by design",
    body: "Answers stay in this browser tab (they survive a reload, and vanish when the tab is closed). Nothing typed is sent anywhere; visit counts never include answers.",
  },
  {
    title: "Colour is never the only signal",
    body: "Status colours mark edges and icons; text stays dark and says what it is ('Stop', 'Caution', 'Error'). Red is used only for a stop or an error. The blue is for the main action, links, focus and the headline figure.",
  },
  {
    title: "Plain, empirical words",
    body: "Short sentences, numbers first, no emoji, no 'victim' (people affected). Hindi is offered on every page and labelled as a draft until reviewed by a native legal-language reviewer.",
  },
];

export const DEVIATIONS: { what: string; why: string }[] = [
  {
    what: "Field edges in slate #8391A7, not the website's slate-200 #E2E8F0",
    why: "A field's edge must be visible (WCAG 1.4.11 asks for 3:1); slate-200 is 1.2:1 on white, #8391A7 is 3.2:1.",
  },
  {
    what: "Controls 44 px tall on a phone (40 px from the small breakpoint), not the website's 36 px",
    why: "WCAG 2.2 target size and Android's touch guidance; 36 px is easy to mis-tap on a 360 px phone.",
  },
  {
    what: "Orange #F57C00 and red #F10015 used for edges and icons only",
    why: "They are 2.7:1 and about 4.4:1 on white, below the 4.5:1 needed for small text, so the text beside them stays dark.",
  },
  {
    what: "No blue title bar on the calculator card (the website's calculator has one)",
    why: "The CFI review found the earlier page 'all blue'; the blue is kept for the main action and the headline figure.",
  },
];

export const COMPONENTS: ComponentSpec[] = [
  {
    name: "Phase banner (DRAFT)",
    file: "components/chrome.tsx",
    use: "Every page until legal sign-off.",
    avoid: "Removing it before the rules are signed off.",
    rules: [
      "One line at 360 px, in the warning tint.",
      "Hindi pages add a line saying the translation is a draft.",
    ],
  },
  {
    name: "Header",
    file: "components/chrome.tsx",
    use: "The website's logo, three links (calculator, how it is calculated, rules and sources) and the language switch.",
    avoid: "Marketing navigation.",
    rules: ["44 px targets.", "The language switch keeps every answer.", "Skip link to the main content."],
  },
  {
    name: "Calculator card and sections",
    file: "pages/Estimator.tsx",
    use: "All questions, in four numbered sections with small grey uppercase titles (the website's calculator style).",
    avoid: "Splitting questions over several pages.",
    rules: [
      "Two columns from the small breakpoint up; a question with several options or answers spans both.",
      "Only questions that apply to this person are shown; answers to hidden questions are ignored, not lost.",
    ],
  },
  {
    name: "Radio chips (row / stack)",
    file: "components/form.tsx",
    use: "Two to about five exclusive choices: chips in a row for short answers (Yes / No, death / injury), one per line for longer ones with hints.",
    avoid: "Long lists (use Select) or choices that are not exclusive (use Checkbox).",
    rules: [
      "Whole chip tappable, 44 px tall on a phone.",
      "'Not sure' last, where it is a valid answer.",
      "Nothing pre-selected.",
    ],
  },
  {
    name: "Select",
    file: "components/form.tsx",
    use: "Long lists: how the person was involved, work, state, occupation.",
    avoid: "Short lists (use radio chips).",
    rules: [
      "Native select: it is the most usable list on Android.",
      "First option is 'Choose' (or 'Not in this list').",
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
    use: "Rupee amounts: salary, tax, ITR income, pension, bills, an insurer's offer.",
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
      "− and + buttons are 44 px; the box can also be typed in.",
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
    use: "A follow-up that belongs to the answer just given (the amount once a proof is chosen; the claim date once 'Yes').",
    avoid: "Whole questions (the question logic decides which questions are shown).",
    rules: ["Indented with a hairline rule."],
  },
  {
    name: "Inline errors and 'answers left'",
    file: "pages/Estimator.tsx",
    use: "A wrong answer (an impossible date, a number out of range) shows under the field once focus leaves it; unanswered questions are listed in the estimate panel, each a link to its field.",
    avoid: "Errors while the person is still typing; red on fields nobody has reached yet.",
    rules: [
      "Red edge and icon, dark text, prefixed 'Error' for screen readers.",
      "Choosing an item in the list moves focus to that field and shows what it needs.",
    ],
  },
  {
    name: "Stop notice",
    file: "pages/ResultSummary.tsx",
    use: "An answer that ends or redirects a section 166 claim: owner-driver alone, vehicle never traced, no-fault compensation taken through the insurer.",
    avoid: "Cautions (those are notices below the estimate).",
    rules: [
      "Shown right under the answer and in the estimate panel, which then shows no number.",
      "Says why and what to do instead (DLSA, NALSA 15100, the hit-and-run scheme amounts).",
    ],
  },
  {
    name: "Estimate panel",
    file: "pages/ResultSummary.tsx",
    use: "The live summary: answers left, or the amount, range, how far real awards land and links to the details.",
    avoid: "Long explanations (they are in the details below).",
    rules: [
      "Sticky beside the form on a wide screen; below the form on a phone.",
      "Lakh / crore first in the CFI blue, the exact amount below, one line on what it means.",
    ],
  },
  {
    name: "Phone bar",
    file: "pages/Estimator.tsx",
    use: "On a phone: the estimate once there is one, otherwise the answers left and 'Next question'.",
    avoid: "Wide screens (the panel is visible there).",
    rules: [
      "Hidden while a field has focus (the keyboard is open) and while the estimate panel is on screen.",
    ],
  },
  {
    name: "Notice (info / caution / stop)",
    file: "components/ui.tsx",
    use: "Warnings below the estimate.",
    avoid: "Form errors.",
    rules: [
      "Tinted box, coloured edge and icon, and a text label; red only for a stop.",
      "Stops and cautions shown; notes collapsed.",
    ],
  },
  {
    name: "Range",
    file: "pages/ResultSummary.tsx",
    use: "Conservative, standard and claimant's best as three rows, with a bar when the range is narrow enough to read as one.",
    avoid: "A bar when the range is too wide (the three amounts and what could move it say more).",
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
    name: "Accordion",
    file: "components/result.tsx",
    use: "Secondary details below the estimate (how it is built, what could move it, what to prove, interest, cases, sources).",
    avoid: "The amount, the range, stops and cautions.",
    rules: ["A button with aria-expanded and a panel.", "Panels always print expanded."],
  },
  {
    name: "Offer check",
    file: "pages/Offer.tsx",
    use: "'Got an offer from the insurer?': the offer as a share of the estimate, the award with interest, and the value of waiting today after fees.",
    avoid: "Advice to accept or refuse.",
    rules: [
      "On the same page, below the estimate.",
      "Assumptions (years, interest, discount, fee) visible and editable.",
    ],
  },
  {
    name: "Checklist",
    file: "components/result.tsx",
    use: "What to prove.",
    avoid: "—",
    rules: ["Plain list with a green tick; to be confirmed by the legal reviewers."],
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
    use: "Primary (blue): the one main action in an area. Outline: alternatives. Links: navigation.",
    avoid: "Two primary buttons side by side.",
    rules: ["Rounded 8 px, 44 px tall on a phone.", "Full width on a phone for the main action."],
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
    rules: ["Tables become labelled cards on a phone; the page never scrolls sideways."],
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
    'Visual tokens (colours, type, radius, spacing) come from crashfreeindia.org, which uses shadcn "new-york" on slate neutrals with the CFI blue as an accent. This document adds what a mobile, form-heavy public tool needs: the evidence behind the pattern, principles, every component with when to use it, and the deliberate deviations.',
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
  L.push("## Deviations from the website's design system", "", "| What | Why |", "|---|---|");
  for (const d of DEVIATIONS) L.push(`| ${d.what} | ${d.why} |`);
  L.push("");
  return L.join("\n");
}
