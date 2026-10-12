# UI design system: motor accident compensation estimate

_Generated from `web/src/design/catalog.ts` by `npm run web:design-doc`. Do not edit by hand: a test fails if this file and the catalogue disagree. The live gallery is at `#/design` on the site._

Visual tokens (colours, type, radius, spacing) come from crashfreeindia.org, which uses shadcn "new-york" on slate neutrals with the CFI blue as an accent. This document adds what a mobile, form-heavy public tool needs: the evidence behind the pattern, principles, every component with when to use it, and the deliberate deviations.

## Evidence

| Finding | Source | What we do |
|---|---|---|
| The most common phone screen in India is 360×800 CSS pixels (15.3%); the next are 393, 384 and 385 px wide. | StatCounter, mobile screen resolution, India, Sept 2026 | Every screen is designed and tested at 360 px first, and at 320 px (the WCAG reflow width). |
| crashfreeindia.org is built on shadcn 'new-york' with slate neutrals; the CFI blue is an accent (main buttons, eyebrows, one headline word, links, focus). Its own calculator is one card with all questions, in labelled sections. | CFI Main Website source (src/styles.css, components/calculator) and screenshots, 12 Oct 2026 | This tool uses the same tokens and the same one-page form, so it reads as part of the website and could sit inside it. |
| One question per screen (tested on PR #1) was judged too slow by the CFI team: people want to see all the questions at once and change any answer in place. | CFI review, 12 Oct 2026 | All questions on one page, grouped in four sections; the estimate updates beside the form as answers change. |
| The one-page form was then judged scattered and unpolished: about 20 questions of equal weight in a two-column grid whose rows did not line up, a side panel that cut off its own content on a laptop, and a hint under most fields. | CFI review and a live bug hunt, 12 Oct 2026 | Quick estimate first: up to eight numbered steps in one column, the estimate right under them, and everything optional in closed groups below. |
| Use three boxes for dates; avoid sliders; mark optional questions '(optional)'; show errors after the person leaves a field, not while typing. | GOV.UK Design System (date input, error messages); Baymard Institute form usability research | The accident is asked as a month and a year (what families know); a full date, where one is needed, is day / month / year boxes. Errors appear when focus leaves an answer. |

## Principles

- **Quick estimate first.** Only the answers a number needs come first, as up to eight numbered steps in one column: what happened, three checks on whether a claim can be made, age, work, family, the injury, the month and year, and the state. Every other fact is an optional detail in a closed group below the estimate.
- **One column, one path.** Steps, then the estimate, then the details, top to bottom on every screen size. An answer shows or hides only what depends on it, in place. Nothing sits beside the form, and nothing scrolls inside its own box.
- **The estimate updates as you go.** As soon as the quick steps are answered, the amount, its range and how far real awards land appear under them and change with every answer. Until then the estimate card says how many answers are left and links to the first three.
- **The right control for each answer.** Up to about nine short options are chips (a grid with icons for the type of work); long lists are the phone's own picker; the accident is a month and a year; rupees have a ₹ prefix and read the amount back in lakh; small counts are − n + counters that start empty.
- **Nothing pre-selected.** No answer is filled in for the person. Where 'I don't know' is a valid answer it is offered as 'Not sure', which is recorded as no answer, never as a guess.
- **Phone first, thumb reach.** Designed at 360 px, and at 200% text size without sideways scrolling. Controls are at least 44 px tall on a phone. Once there is an estimate, a slim bar at the bottom shows it while it is out of view; it hides while any answer has focus, so it never covers what is being answered.
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

### Quick estimate card and steps

- **Use for:** The answers a number needs, as numbered steps in one white card with the website calculator's blue title bar, which also shows how many steps are answered.
- **Not for:** Optional facts (they are details) and more than eight steps.
- Each step's title is its question; a step's badge turns into a tick once it is fully answered.
- Only steps that apply to this person are shown; answers to hidden questions are ignored, not lost.
- After an answer that ends the claim, the later steps are replaced by one line saying they are not needed.
- _Code:_ `web/src/pages/Estimator.tsx`

### Details group

- **Use for:** Optional facts that narrow the estimate or add a caution: exact date and claim, vehicle insurance, income details, dependent parents, work after the injury, medical bills.
- **Not for:** Anything the number cannot be given without.
- Closed until opened; the title shows how many of its answers are given ('1 of 3').
- Opens by itself when one of its answers needs correcting, and never closes by itself.
- _Code:_ `web/src/pages/Estimator.tsx`

### Radio chips (row / stack / grid)

- **Use for:** Exclusive choices: a row for short answers (Yes / No, 0 / 1 / 2), one per line for longer ones with hints, a grid with icons for many short ones (type of work, state).
- **Not for:** Long lists (use Select) or choices that are not exclusive (use Checkbox).
- The whole chip is the radio button (a transparent native input over it), so arrow keys and screen readers work as usual; 44 px tall on a phone.
- A check mark and a blue edge show the choice, never colour alone.
- 'Not sure' last, where it is a valid answer. Nothing pre-selected.
- _Code:_ `web/src/components/form.tsx`

### Month and year

- **Use for:** The accident date in the quick estimate: two of the phone's own pickers.
- **Not for:** Dates where the day matters for the answer itself (the claim date).
- Without a day the 1st is used; the exact day is an optional detail (for the time limit, and a wage order that changed mid-month).
- _Code:_ `web/src/components/form.tsx`

### Select

- **Use for:** Long lists: occupation, area of the Central-sphere wage, the month and year.
- **Not for:** Short lists (use radio chips).
- Native select: it is the most usable list on Android.
- First option is 'Choose' (or 'Not in this list').
- _Code:_ `web/src/components/form.tsx`

### Date input (day / month / year)

- **Use for:** A full date where the day matters: the date the claim was filed.
- **Not for:** The phone's date picker (month-first on many devices, slow for dates years back).
- Three numeric boxes with labels; their widths are shares of the row, so very large text narrows them instead of widening the page.
- Hint 'For example, 15 6 2025'.
- Rejects dates that do not exist (31 2 2025) and future dates.
- _Code:_ `web/src/components/form.tsx`

### Money input

- **Use for:** Rupee amounts: salary, tax, ITR income, pension, bills, an insurer's offer.
- **Not for:** Counts and percentages.
- ₹ prefix and the numeric keypad; commas allowed.
- Reads the amount back as it is typed ('= ₹2.5 lakh a month') so a missing or extra zero is caught.
- Accepts '25k', '2.5 lakh', '1.2 crore'; refuses exponents ('1e9') and more than ₹1 crore a month, and asks to check an amount above ₹10 lakh a month.
- _Code:_ `web/src/components/form.tsx`

### Number input

- **Use for:** Age, percentages, months, days.
- **Not for:** Money.
- Short box with its unit after it (years, %, months, days).
- Numeric keypad.
- _Code:_ `web/src/components/form.tsx`

### Counter

- **Use for:** Small counts that can go past three: children who claim, dependent parents.
- **Not for:** Numbers that can be large.
- Starts unanswered (–); 0 is an answer, not a default.
- − and + buttons are 44 px; the box can also be typed in, and a typed count above the limit is an error.
- When a button disables under the keyboard focus, the focus moves to the other button.
- _Code:_ `web/src/components/form.tsx`

### Checkbox

- **Use for:** An independent extra fact (needs an attendant permanently; no disability certificate yet).
- **Not for:** Either/or choices.
- Whole row tappable.
- _Code:_ `web/src/components/form.tsx`

### Reveal

- **Use for:** A follow-up that belongs to the answer just given (the amount once a proof is chosen; the claim date once 'Yes').
- **Not for:** Whole questions (the question logic decides which questions are shown).
- Indented with a hairline rule.
- _Code:_ `web/src/components/form.tsx`

### Inline errors and 'answers left'

- **Use for:** A wrong answer (an impossible date, a number out of range) shows under the field once focus leaves it; unanswered questions are counted in the estimate card, and the first three are links to their field (opening a closed group if needed).
- **Not for:** Errors while the person is still typing; red on fields nobody has reached yet.
- Red edge and icon, dark text, prefixed 'Error' for screen readers.
- Choosing an item in the list moves focus to that field and shows what it needs.
- _Code:_ `web/src/pages/Estimator.tsx`

### Stop notice

- **Use for:** An answer that ends or redirects a section 166 claim: owner-driver alone, vehicle never traced, no-fault compensation taken through the insurer.
- **Not for:** Cautions (those are notices below the estimate).
- Shown right under the check that gave it (each one, if there are two) and in the estimate card, which then shows no number.
- Says why and what to do instead (DLSA, NALSA 15100, the hit-and-run scheme amounts).
- _Code:_ `web/src/pages/ResultSummary.tsx`

### Estimate card

- **Use for:** The live summary, right under the quick steps: answers left, or the amount, range, how far real awards land and links to the details and the offer check.
- **Not for:** Long explanations (they are in the details below).
- In the page's single column on every screen size; never a panel with its own scroll.
- Lakh / crore first in the CFI blue, the exact amount below, one line on what it means.
- Announced once to screen readers when ready ('Estimate ready: ₹53 lakh'), without moving the focus.
- _Code:_ `web/src/pages/ResultSummary.tsx`

### Bottom bar

- **Use for:** Once there is an estimate (or a stop), a slim bar showing it while the estimate card is out of view, with a button to it.
- **Not for:** Before there is anything to show.
- Hidden while any answer has focus and while the estimate card is on screen; the page keeps room under a focused answer for it.
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
| Hint text inside a chosen chip is 75% of the text colour, not the muted grey | The muted grey falls below 4.5:1 on the light-blue tint of a chosen chip. |
