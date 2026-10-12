# UI design system: motor accident compensation estimate

_Generated from `web/src/design/catalog.ts` by `npm run web:design-doc`. Do not edit by hand: a test fails if this file and the catalogue disagree. The live gallery is at `#/design` on the site._

Visual tokens (colours, type, radius, spacing) come from crashfreeindia.org, which uses shadcn "new-york" on slate neutrals with the CFI blue as an accent. This document adds what a mobile, form-heavy public tool needs: the evidence behind the pattern, principles, every component with when to use it, and the deliberate deviations.

## Evidence

| Finding | Source | What we do |
|---|---|---|
| The most common phone screen in India is 360×800 CSS pixels (15.3%); the next are 393, 384 and 385 px wide. | StatCounter, mobile screen resolution, India, Sept 2026 | Every screen is designed and tested at 360 px first, and at 320 px (the WCAG reflow width). |
| crashfreeindia.org is built on shadcn 'new-york' with slate neutrals; the CFI blue is an accent (main buttons, eyebrows, one headline word, links, focus). Its own calculator is one card with all questions, in labelled sections. | CFI Main Website source (src/styles.css, components/calculator) and screenshots, 12 Oct 2026 | This tool uses the same tokens and the same one-page form, so it reads as part of the website and could sit inside it. |
| One question per screen (tested on PR #1) was judged too slow by the CFI team: people want to see all the questions at once and change any answer in place. | CFI review, 12 Oct 2026 | All questions on one page, grouped in four sections; the estimate updates beside the form as answers change. |
| Use three boxes for dates; avoid sliders; mark optional questions '(optional)'; show errors after the person leaves a field, not while typing. | GOV.UK Design System (date input, error messages); Baymard Institute form usability research | Dates are day / month / year boxes; errors appear when focus leaves an answer. |

## Principles

- **Everything on one page.** All questions sit in one card, in four sections (the accident, the person, family, injury and medical). An answer shows or hides only what depends on it, in place; nothing moves to another page.
- **The estimate updates as you go.** As soon as the required answers are in, the amount, its range and how far real awards land appear beside the form (below it on a phone) and change with every answer. Until then the panel lists what is still needed, each a link to the question.
- **The right control for each answer.** Two to four options are chips in a row; long lists are the phone's own picker; dates are three boxes; rupees have a ₹ prefix and read the amount back in lakh; small counts are − n + counters that start empty.
- **Nothing pre-selected.** No answer is filled in for the person. Where 'I don't know' is a valid answer it is offered as 'Not sure', which is recorded as no answer, never as a guess.
- **Phone first, thumb reach.** Designed at 360 px. Controls are at least 44 px tall on a phone. A slim bar at the bottom shows the estimate or the answers left; it hides while a field has focus, so it never covers the keyboard's field.
- **Private by design.** Answers stay in this browser tab (they survive a reload, and vanish when the tab is closed). Nothing typed is sent anywhere; visit counts never include answers.
- **Colour is never the only signal.** Status colours mark edges and icons; text stays dark and says what it is ('Stop', 'Caution', 'Error'). Red is used only for a stop or an error. The blue is for the main action, links, focus and the headline figure.
- **Plain, empirical words.** Short sentences, numbers first, no emoji, no 'victim' (people affected). Hindi is offered on every page and labelled as a draft until reviewed by a native legal-language reviewer.

## Components

### Phase banner (DRAFT)

- **Use for:** Every page until legal sign-off.
- **Not for:** Removing it before the rules are signed off.
- One line at 360 px, in the warning tint.
- Hindi pages add a line saying the translation is a draft.
- _Code:_ `web/src/components/chrome.tsx`

### Header

- **Use for:** The website's logo, three links (calculator, how it is calculated, rules and sources) and the language switch.
- **Not for:** Marketing navigation.
- 44 px targets.
- The language switch keeps every answer.
- Skip link to the main content.
- _Code:_ `web/src/components/chrome.tsx`

### Calculator card and sections

- **Use for:** All questions, in four numbered sections with small grey uppercase titles (the website's calculator style).
- **Not for:** Splitting questions over several pages.
- Two columns from the small breakpoint up; a question with several options or answers spans both.
- Only questions that apply to this person are shown; answers to hidden questions are ignored, not lost.
- _Code:_ `web/src/pages/Estimator.tsx`

### Radio chips (row / stack)

- **Use for:** Two to about five exclusive choices: chips in a row for short answers (Yes / No, death / injury), one per line for longer ones with hints.
- **Not for:** Long lists (use Select) or choices that are not exclusive (use Checkbox).
- Whole chip tappable, 44 px tall on a phone.
- 'Not sure' last, where it is a valid answer.
- Nothing pre-selected.
- _Code:_ `web/src/components/form.tsx`

### Select

- **Use for:** Long lists: how the person was involved, work, state, occupation.
- **Not for:** Short lists (use radio chips).
- Native select: it is the most usable list on Android.
- First option is 'Choose' (or 'Not in this list').
- _Code:_ `web/src/components/form.tsx`

### Date input (day / month / year)

- **Use for:** Dates people know: the accident, the claim.
- **Not for:** The phone's date picker (month-first on many devices, slow for dates years back).
- Three numeric boxes with labels.
- Hint 'For example, 15 6 2025'.
- Rejects dates that do not exist (31 2 2025) and future dates.
- _Code:_ `web/src/components/form.tsx`

### Money input

- **Use for:** Rupee amounts: salary, tax, ITR income, pension, bills, an insurer's offer.
- **Not for:** Counts and percentages.
- ₹ prefix and the numeric keypad; commas allowed.
- Reads the amount back as it is typed ('= ₹2.5 lakh a month') so a missing or extra zero is caught.
- _Code:_ `web/src/components/form.tsx`

### Number input

- **Use for:** Age, percentages, months, days.
- **Not for:** Money.
- Short box with its unit after it (years, %, months, days).
- Numeric keypad.
- _Code:_ `web/src/components/form.tsx`

### Counter

- **Use for:** Small counts: children and parents who claim.
- **Not for:** Numbers that can be large.
- Starts unanswered (–); 0 is an answer, not a default.
- − and + buttons are 44 px; the box can also be typed in.
- _Code:_ `web/src/components/form.tsx`

### Checkbox

- **Use for:** An independent extra fact (needs an attendant permanently).
- **Not for:** Either/or choices.
- Whole row tappable.
- _Code:_ `web/src/components/form.tsx`

### Reveal

- **Use for:** A follow-up that belongs to the answer just given (the amount once a proof is chosen; the claim date once 'Yes').
- **Not for:** Whole questions (the question logic decides which questions are shown).
- Indented with a hairline rule.
- _Code:_ `web/src/components/form.tsx`

### Inline errors and 'answers left'

- **Use for:** A wrong answer (an impossible date, a number out of range) shows under the field once focus leaves it; unanswered questions are listed in the estimate panel, each a link to its field.
- **Not for:** Errors while the person is still typing; red on fields nobody has reached yet.
- Red edge and icon, dark text, prefixed 'Error' for screen readers.
- Choosing an item in the list moves focus to that field and shows what it needs.
- _Code:_ `web/src/pages/Estimator.tsx`

### Stop notice

- **Use for:** An answer that ends or redirects a section 166 claim: owner-driver alone, vehicle never traced, no-fault compensation taken through the insurer.
- **Not for:** Cautions (those are notices below the estimate).
- Shown right under the answer and in the estimate panel, which then shows no number.
- Says why and what to do instead (DLSA, NALSA 15100, the hit-and-run scheme amounts).
- _Code:_ `web/src/pages/ResultSummary.tsx`

### Estimate panel

- **Use for:** The live summary: answers left, or the amount, range, how far real awards land and links to the details.
- **Not for:** Long explanations (they are in the details below).
- Sticky beside the form on a wide screen; below the form on a phone.
- Lakh / crore first in the CFI blue, the exact amount below, one line on what it means.
- _Code:_ `web/src/pages/ResultSummary.tsx`

### Phone bar

- **Use for:** On a phone: the estimate once there is one, otherwise the answers left and 'Next question'.
- **Not for:** Wide screens (the panel is visible there).
- Hidden while a field has focus (the keyboard is open) and while the estimate panel is on screen.
- _Code:_ `web/src/pages/Estimator.tsx`

### Notice (info / caution / stop)

- **Use for:** Warnings below the estimate.
- **Not for:** Form errors.
- Tinted box, coloured edge and icon, and a text label; red only for a stop.
- Stops and cautions shown; notes collapsed.
- _Code:_ `web/src/components/ui.tsx`

### Range

- **Use for:** Conservative, standard and claimant's best as three rows, with a bar when the range is narrow enough to read as one.
- **Not for:** A bar when the range is too wide (the three amounts and what could move it say more).
- Values always given as text; the bar is decorative.
- _Code:_ `web/src/pages/ResultSummary.tsx`

### Breakdown list

- **Use for:** Each head of compensation with its formula and linked source, then the total.
- **Not for:** Wide tables on a phone.
- Stacked rows.
- Working figures listed separately, never added to the total.
- _Code:_ `web/src/pages/Result.tsx`

### Accordion

- **Use for:** Secondary details below the estimate (how it is built, what could move it, what to prove, interest, cases, sources).
- **Not for:** The amount, the range, stops and cautions.
- A button with aria-expanded and a panel.
- Panels always print expanded.
- _Code:_ `web/src/components/result.tsx`

### Offer check

- **Use for:** 'Got an offer from the insurer?': the offer as a share of the estimate, the award with interest, and the value of waiting today after fees.
- **Not for:** Advice to accept or refuse.
- On the same page, below the estimate.
- Assumptions (years, interest, discount, fee) visible and editable.
- _Code:_ `web/src/pages/Offer.tsx`

### Checklist

- **Use for:** What to prove.
- **Not for:** —
- Plain list with a green tick; to be confirmed by the legal reviewers.
- _Code:_ `web/src/components/result.tsx`

### Case card

- **Use for:** A real public case: summary, its journey as a timeline, what mattered, how it is similar and different.
- **Not for:** Implying the person will get the same amount.
- English case text is marked lang='en' on Hindi pages.
- Links to the judgment.
- _Code:_ `web/src/pages/Result.tsx`

### Buttons

- **Use for:** Primary (blue): the one main action in an area. Outline: alternatives. Links: navigation.
- **Not for:** Two primary buttons side by side.
- Rounded 8 px, 44 px tall on a phone.
- Full width on a phone for the main action.
- _Code:_ `web/src/components/ui.tsx`

### Share actions

- **Use for:** The phone's own share sheet when available, otherwise 'Copy summary'; print / save as PDF.
- **Not for:** wa.me links (they put the estimate in a URL sent to a third party).
- The shared text always carries DRAFT, the as-of date and 'not legal advice'.
- Nothing is sent to our server.
- _Code:_ `web/src/components/result.tsx`

### Documents (prose and tables)

- **Use for:** Methodology, rules reference, offer study, rendered from the repository.
- **Not for:** Editing the text here: it is generated from docs/*.md.
- Tables become labelled cards on a phone; the page never scrolls sideways.
- _Code:_ `web/src/pages/Doc.tsx`

### Footer

- **Use for:** Privacy line, what visit counts record, legal aid, sources, versions.
- **Not for:** —
- Rules and engine versions shown so a printout can be traced.
- _Code:_ `web/src/components/chrome.tsx`

## Deviations from the website's design system

| What | Why |
|---|---|
| Field edges in slate #8391A7, not the website's slate-200 #E2E8F0 | A field's edge must be visible (WCAG 1.4.11 asks for 3:1); slate-200 is 1.2:1 on white, #8391A7 is 3.2:1. |
| Controls 44 px tall on a phone (40 px from the small breakpoint), not the website's 36 px | WCAG 2.2 target size and Android's touch guidance; 36 px is easy to mis-tap on a 360 px phone. |
| Orange #F57C00 and red #F10015 used for edges and icons only | They are 2.7:1 and about 4.4:1 on white, below the 4.5:1 needed for small text, so the text beside them stays dark. |
| No blue title bar on the calculator card (the website's calculator has one) | The CFI review found the earlier page 'all blue'; the blue is kept for the main action and the headline figure. |
