# UI design system: motor accident compensation estimate

_Generated from `web/src/design/catalog.ts` by `npm run web:design-doc`. Do not edit by hand: a test fails if this file and the catalogue disagree. The live gallery is at `#/design` on the site._

Visual tokens (colours, type, radius, spacing) come from the Crashfree India design system. This document adds what a mobile, form-heavy public tool needs: the evidence behind the pattern, principles, every component with when to use it, and the deliberate deviations.

## Evidence

| Finding | Source | What we do |
|---|---|---|
| The most common phone screen in India is 360×800 CSS pixels (15.3%); the next are 393, 384 and 385 px wide. | StatCounter, mobile screen resolution, India, Sept 2026 | Every page is designed and tested at 360 px first, and at 320 px (the WCAG reflow width). |
| Ask one question per page; give every question page a back link, a heading and a Continue button; prefer a simple caption to a step bar; use three boxes for dates; avoid sliders; mark optional questions '(optional)'. | GOV.UK Design System, question pages pattern | The estimate is asked as short question pages ending in 'Check your answers'. |
| India's government design system covers patterns Indian users meet in public services (OTP, steppers, grievances). | UX4G Design System 3.0, NeGD / MeitY (ux4g.gov.in) | Used as a reference for familiar patterns; the Crashfree India design system stays the visual authority. |

## Principles

- **One topic per page.** Each page asks one thing; answers that belong together (state and area, proof and amount, the family) share a page. About 12 pages for a death claim and 15 for an injury, with branches skipped. _(GOV.UK question pages)_
- **Nothing pre-selected.** No answer is filled in for the person. Where 'I don't know' is a valid answer it is offered as 'Not sure', which is recorded as no answer, never as a guess.
- **Phone first, thumb reach.** Designed at 360 px. Controls are at least 48 px tall; the main button is full width on a phone and sits directly under the answers (no sticky bars: they cover the field being typed into when the keyboard opens).
- **The answer first, the working on demand.** The result opens with the amount in lakh, its range and how far real awards land. How it is built, what could move it, what to prove, real cases and sources open on demand, and always print in full.
- **Back always works.** Every question page is its own entry in the browser history, so the phone's back gesture goes to the previous question with answers kept. 'Check your answers' is the hub for changes.
- **Private by design.** Answers stay in this browser tab (they survive a reload, and vanish when the tab is closed). Nothing typed is sent anywhere; visit counts never include answers.
- **Colour is never the only signal.** Status colours mark bars, borders and icons; text stays dark and says what it is ('Stop', 'Caution', 'Error'). Red is used only for a stop or an error.
- **Plain, empirical words.** Short sentences, numbers first, no emoji, no 'victim' (people affected). Hindi is offered on every page and labelled as a draft until reviewed by a native legal-language reviewer.

## Components

### Phase banner (DRAFT)

- **Use for:** Every page until legal sign-off.
- **Not for:** Removing it before the rules are signed off.
- One line at 360 px.
- Hindi pages add a second line saying the translation is a draft.
- _Code:_ `web/src/components/chrome.tsx`

### Header

- **Use for:** Wordmark, language switch and, outside the questions, the menu.
- **Not for:** Showing the menu on question pages (it distracts and competes with Continue).
- 48 px targets.
- The language switch keeps every answer.
- Skip link to the main content.
- _Code:_ `web/src/components/chrome.tsx`

### Back link

- **Use for:** Top of every question, Check and stop page.
- **Not for:** Start and result pages.
- Goes to the previous question on the person's path, answers kept.
- From a change made on Check, goes back to Check.
- _Code:_ `web/src/pages/Questions.tsx`

### Question page

- **Use for:** One topic: the section caption, the question as the h1, the answers, then Continue.
- **Not for:** Several unrelated questions on one page.
- When the page asks one question, its label or legend is the h1, so screen readers hear it once.
- Caption shows the section ('The person · part 2 of 4'), which stays stable when the path branches.
- Continue is left-aligned under the answers; full width on a phone.
- _Code:_ `web/src/pages/Questions.tsx`

### Radios (large / compact)

- **Use for:** Up to about 7 either/or choices. Large for a page's main choice (whole card tappable, optional hint); compact for Yes / No.
- **Not for:** Long lists (use Select) or choices that are not exclusive (use Checkbox).
- Rows at least 48 px (large: 56 px).
- 'Not sure' last, where it is a valid answer.
- Nothing pre-selected.
- _Code:_ `web/src/components/form.tsx`

### Select

- **Use for:** Long lists: state, occupation.
- **Not for:** Short lists (use Radios).
- Native select: it is the most usable list on Android.
- First option is 'Choose' or 'Not in this list'.
- _Code:_ `web/src/components/form.tsx`

### Date input (day / month / year)

- **Use for:** Dates people know: the accident, the claim.
- **Not for:** The phone's date picker (month-first on many devices, slow for dates years back).
- Three numeric boxes with labels.
- Hint 'For example, 15 6 2025'.
- Rejects dates that do not exist (31 2 2025) and future dates.
- _Code:_ `web/src/components/form.tsx`

### Money input

- **Use for:** Rupee amounts: salary, tax, ITR income, pension, bills.
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
- − and + buttons are 48 px; the box can also be typed in.
- _Code:_ `web/src/components/form.tsx`

### Checkbox

- **Use for:** An independent extra fact (needs an attendant permanently).
- **Not for:** Either/or choices.
- Whole row tappable.
- _Code:_ `web/src/components/form.tsx`

### Reveal

- **Use for:** A follow-up that belongs to an answer on the same page (the amount once a proof is chosen; the claim date once 'Yes').
- **Not for:** Hiding whole questions (the question graph decides which pages are asked).
- Indented with a brand-tint bar.
- _Code:_ `web/src/components/form.tsx`

### Error summary and inline errors

- **Use for:** After Continue, when an answer is missing or wrong.
- **Not for:** Errors while the person is still typing.
- The summary takes focus and links to each question.
- Each field shows its own message: red border and icon, dark text, prefixed 'Error' for screen readers.
- _Code:_ `web/src/components/form.tsx`

### Check your answers

- **Use for:** The hub before the result, and where 'Change answers' leads.
- **Not for:** —
- Each answer with a Change link to its page.
- Stacks as question / answer on a phone.
- _Code:_ `web/src/components/result.tsx (SummaryList)`

### Stop page

- **Use for:** An answer that ends or redirects a section 166 claim: owner-driver alone, vehicle never traced, no-fault compensation taken through the insurer.
- **Not for:** Cautions (those are notices on the result).
- Says why, what to do next (DLSA, NALSA 15100, the hit-and-run scheme amounts) and offers to change the answer.
- _Code:_ `web/src/pages/Questions.tsx`

### Notice (info / caution / stop)

- **Use for:** Warnings on the result and stop pages.
- **Not for:** Form errors.
- Colour bar and icon plus a text label; red only for a stop.
- Stops and cautions shown; notes collapsed.
- _Code:_ `web/src/components/ui.tsx`

### Answer panel

- **Use for:** The one headline amount.
- **Not for:** Any other figure.
- Lakh / crore first, the exact amount below, and one line on what it means.
- _Code:_ `web/src/components/result.tsx`

### Range

- **Use for:** Conservative, standard and claimant's best, with a bar when the range is narrow enough to read as one.
- **Not for:** A bar when the range is too wide (the three amounts and the swing factors say more).
- Values always given as text; the bar is decorative.
- _Code:_ `web/src/components/result.tsx (RangeBar)`

### Breakdown list

- **Use for:** Each head of compensation with its formula and linked source, then the total.
- **Not for:** Wide tables on a phone.
- Stacked rows.
- Working figures listed separately, never added to the total.
- _Code:_ `web/src/pages/Result.tsx`

### Disclosure

- **Use for:** Secondary result sections.
- **Not for:** The amount, the range, stops and cautions.
- A button with aria-expanded and a panel.
- Panels always print expanded.
- _Code:_ `web/src/components/result.tsx`

### Checklist

- **Use for:** What to prove.
- **Not for:** —
- Plain list with a tick icon; to be confirmed by the legal reviewers.
- _Code:_ `web/src/components/result.tsx`

### Case card

- **Use for:** A real public case: summary, its journey as a timeline, what mattered, how it is similar and different.
- **Not for:** Implying the person will get the same amount.
- English case text is marked lang='en' on Hindi pages.
- Links to the judgment.
- _Code:_ `web/src/pages/Result.tsx`

### Buttons

- **Use for:** Primary: the page's one main action. Secondary: alternatives. Links: navigation.
- **Not for:** Two primary buttons on one page.
- 48 px tall, rounded; full width on a phone for the main action.
- Primary has the arrow icon.
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
- Tables scroll inside their own box; the page never scrolls sideways.
- _Code:_ `web/src/pages/Doc.tsx`

### Footer

- **Use for:** Privacy line, what visit counts record, legal aid, sources, versions.
- **Not for:** —
- Rules and engine versions shown so a printout can be traced.
- _Code:_ `web/src/components/chrome.tsx`

## Deviations from the Crashfree India design system

| What | Why |
|---|---|
| Body grey #6c6a7e instead of #777589 | #777589 is 4.48:1 on white, just under WCAG AA (4.5:1) for body text; #6c6a7e is about 5.2:1. |
| Orange #F57C00 used for icons and decorative bars only | It is 2.7:1 on white, below the 3:1 needed for a meaningful border and the 4.5:1 for text. |
| Red #F10015 marks form errors (border and icon) as well as stops | An error is a stop for that question. It is about 4.4:1, so error text stays dark. |
| Tool pages: a max-w-2xl content column inside the max-w-7xl container, with py-8 / py-12 padding | A readable line length for questions, and the question stays in the first screen of a 360×800 phone (py-24 would use a quarter of it). |
| Form field borders in grey at 80%, not the hairline border token | A field's edge must be visible (WCAG 1.4.11 asks for 3:1; the hairline token is about 1.2:1). |
