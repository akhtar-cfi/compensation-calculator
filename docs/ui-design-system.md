# UI design system: motor accident compensation estimate

_Generated from `web/src/design/catalog.ts` by `npm run web:design-doc`. Do not edit by hand: a test fails if this file and the catalogue disagree. The live gallery is at `#/design` on the site._

Visual tokens (colours, type, radius, spacing) come from crashfreeindia.org, which uses shadcn "new-york" on slate neutrals with the CFI purple as an accent. This document adds what a mobile, form-heavy public tool needs: the evidence behind the pattern, principles, every component with when to use it, and the deliberate deviations.

## Evidence

| Finding | Source | What we do |
|---|---|---|
| The most common phone screen in India is 360×800 CSS pixels (15.3%); the next are 393, 384 and 385 px wide. | StatCounter, mobile screen resolution, India, Sept 2026 | Every screen is designed and tested at 360 px first, and at 320 px (the WCAG reflow width). |
| crashfreeindia.org is built on shadcn 'new-york' with slate neutrals; the CFI blue is an accent (main buttons, eyebrows, one headline word, links, focus). Its own calculator is one card with all questions, in labelled sections. | CFI Main Website source (src/styles.css, components/calculator) and screenshots, 12 Oct 2026 | This tool uses the same tokens and the same one-page form, so it reads as part of the website and could sit inside it. |
| One question per screen (tested on PR #1) was judged too slow by the CFI team: people want to see all the questions at once and change any answer in place. | CFI review, 12 Oct 2026 | All questions on one page, grouped in four sections; the estimate updates beside the form as answers change. |
| The one-page form was then judged scattered and unpolished: about 20 questions of equal weight in a two-column grid whose rows did not line up, a side panel that cut off its own content on a laptop, and a hint under most fields. | CFI review and a live bug hunt, 12 Oct 2026 | Quick estimate first: up to eight numbered steps in one column, the estimate right under them, and everything optional in closed groups below. |
| Use three boxes for dates; avoid sliders; mark optional questions '(optional)'; show errors after the person leaves a field, not while typing. | GOV.UK Design System (date input, error messages); Baymard Institute form usability research | The accident is asked as a month and a year (what families know); a full date, where one is needed, is day / month / year boxes. Errors appear when focus leaves an answer. |
| Four story-card hero options were compared on a design canvas; the CFI team chose a simple hero that says what the tool does, followed by 'What happened to your family?' cards that scroll sideways and carry example stories. The page is to be hosted on crashfreeindia.org. | CFI review of the round 4 canvas, 16 Oct 2026 | A short hero, situation cards that start the calculator in the right place (three with a worked example, labelled as made up), and the website's own header, footer and 'Need help?' band around the calculator. (Replaced after the review of 21 Oct, below.) |
| On the preview, the CFI team asked for the first screen to be one slightly translucent page covering the whole screen, with the details and, below them, the four ways to answer as buttons with a line each; no draft notices; real cases with the claim amounts and the timeline instead of made-up stories, which were also cut off at the edge of the screen; and simpler placement on the calculator screens. | CFI review of the team preview, 21 Oct 2026 | A full-screen welcome page; six real cases told whole in a grid; one order after every estimate in all four ways, with the details folded; no panel beside the questions on a laptop. |
| The live website's tokens are purple #5D2DF7 (its logo art is #4736FE), light band #F6F7FF, text #020618, hairlines #E2E8F0; header 68 px (64 px on a phone) with the logo 32 px (28 px) tall; 48 px pill buttons; cards with 18 px corners; a 12-column footer. | Measurements of crashfreeindia.org (Crash Claim Compensation page and the calculator page) at 1366 and 390 px, 16 Oct 2026 | Those values, so the calculator reads as part of the website. |
| Most families meet this tool once, on a phone, soon after a crash; paralegals and lawyers use it again and again. One question per page suits someone doing an unfamiliar task once on a small screen; it is slower for people who know the questions and want to compare answers. | GOV.UK Service Manual, 'Structuring forms' (start with one thing per page); Nielsen Norman Group on wizards (good for novices and infrequent tasks, poor for experts) | Four ways of answering, picked at the start and switchable at any time with every answer kept: Take it slow (one question at a time), Talk it through (a chat), See it all (one page), Full detail (helpers and lawyers). |

## Principles

- **Pick your pace.** The same questions and the same engine, answered four ways: one question at a time, as a chat, all on one page, or with every legal choice open. The phone remembers only which way was picked (never an answer), and 'Change how I answer' at the top of each keeps every answer given.
- **One question at a time, without the old drawbacks.** In 'Take it slow' a tap on a choice moves on by itself (typed answers need Continue); a follow-up appears on the same screen; a meter says how many steps are left and only goes down; the amount comes straight after the last required answer, and optional details follow one at a time, each saying how it moved the amount. Every answer stays in reach as a chip under the question, and the phone's back gesture steps back one question.
- **A welcome page, then real cases.** The first screen is one translucent page covering the whole screen: what the tool does, what you can find out, then the four ways to answer as buttons, each with one line on what it is like. Below it, real cases from public judgments (names left out) are told whole: the story, the amount at each step, and the years it took.
- **Examples are labelled, and worked out live.** A link for a family can open a worked example (#/example/…); it is always marked as the example's, never the family's own, and its amount is worked out by the engine from the example's answers on the day it is opened. Real cases are never made up: they come from the case library, with a link to each judgment.
- **Quick estimate first.** Only the answers a number needs come first, as up to eight numbered steps in one column: what happened, three checks on whether a claim can be made, age, work, family, the injury, the month and year, and the state. Every other fact is an optional detail in a closed group below the estimate.
- **One column, one path.** Steps, then the estimate, then the details, top to bottom on every screen size. An answer shows or hides only what depends on it, in place. Nothing sits beside the form, and nothing scrolls inside its own box. After every estimate, in all four ways, the same order: the estimate card, the details that narrow it (on the one page), cases like it, the offer check, 'More about this estimate' (folded sections), and what to do next.
- **The estimate updates as you go.** As soon as the quick steps are answered, the amount and its range appear under them and change with every answer. Until then the estimate card says how many answers are left and links to the first three.
- **The right control for each answer.** Up to about nine short options are chips (a grid with icons for the type of work); long lists are the phone's own picker; the accident is a month and a year; rupees have a ₹ prefix and read the amount back in lakh; small counts are − n + counters that start empty.
- **Nothing pre-selected.** No answer is filled in for the person. Where 'I don't know' is a valid answer it is offered as 'Not sure', which is recorded as no answer, never as a guess.
- **Phone first, thumb reach.** Designed at 360 px, and at 200% text size without sideways scrolling. Controls are at least 44 px tall on a phone. Once there is an estimate, a slim bar at the bottom shows it while it is out of view; it hides while any answer has focus, so it never covers what is being answered.
- **Private by design.** Answers stay in this browser tab (they survive a reload, and vanish when the tab is closed). Nothing typed is sent anywhere; visit counts never include answers.
- **Colour is never the only signal.** Status colours mark edges and icons; text stays dark and says what it is ('Stop', 'Caution', 'Error'). Red is used only for a stop or an error. The blue is for the main action, links, focus and the headline figure.
- **Plain, empirical words.** Short sentences, numbers first, no emoji, no 'victim' (people affected). Hindi is offered on every page; it awaits review by a native legal-language reviewer.

## Components

### Change how I answer

- **Use for:** A slim bar at the top of every way of answering: which way this is, and a disclosure listing the ways of answering, the current one marked.
- **Not for:** Hiding it in a menu only, or switching ways in a way that loses answers.
- A button that opens a list of links (aria-expanded; the current way is aria-current); Escape and a tap outside close it, focus returns to the button.
- Each way has its own address (#/slow, #/chat, #/all, #/detail); choosing one is remembered on the phone, nothing else is.
- _Code:_ `web/src/components/modebar.tsx`

### Language first

- **Use for:** The first question of 'Take it slow' and 'Talk it through': हिंदी or English, asked in both languages, as two big buttons.
- **Not for:** Asking again once a language has been chosen in this tab (or named by a shared link).
- Each button is labelled in its own language (lang attribute), 64 px tall.
- _Code:_ `web/src/modes/LangPick.tsx`

### Choice tiles

- **Use for:** A question asked on its own ('Take it slow', the chat): its answers as big buttons that answer on a tap, with an icon and a hint where they help.
- **Not for:** The one-page form (radio chips there: arrow keys must not move the page on, WCAG 3.2.2).
- Buttons with aria-pressed, at least 56 px tall; the chosen one has a blue edge and a check mark, never colour alone.
- A tap moves on only when the screen has nothing left to answer; '5 or more' children opens a count and waits.
- 'No certificate yet' is a tile beside the certificate's percentage.
- _Code:_ `web/src/modes/controls.tsx`

### Picture chips

- **Use for:** Answers in the chat: a picture (or a large count or state code, as on number plates) and one or two words, for people who read little.
- **Not for:** Long answers that need a sentence to tell apart (their hints go behind the question's (i) button).
- Buttons with aria-pressed and the words as their name; two columns on a phone, three from a small tablet up; at least 96 px tall.
- Yes, No and Not sure always have the same pictures (tick, cross, question mark), whatever the question.
- _Code:_ `web/src/modes/chat/PictureChips.tsx`

### Chat

- **Use for:** 'Talk it through': each question as a short bubble, each answer as a bubble of its own with Change beside it, the estimate as a card when it is ready.
- **Not for:** Free text, or anything said by the page that does not come from the answers (no AI, nothing sent anywhere).
- Past questions and answers are a polite live log; the question asked now sits below it and takes the focus, so a screen reader hears it once.
- A tap answers at once; a typed answer waits for Send, so the chat never moves on halfway through a number.
- Change asks again; answers that no longer apply drop out. A reload keeps the whole conversation (it is worked out from the answers).
- In Hindi every bubble is in Hindi.
- _Code:_ `web/src/modes/chat/Chat.tsx`

### Points courts differ on

- **Use for:** 'Full detail': each point of law this case turns on as a switch between the conservative, standard and claimant's-best positions, with what each takes, its effect on this case and its authorities; 'Your choices' is the engine's amount for the positions picked.
- **Not for:** The family-facing ways of answering (the three standard amounts already show the spread), or changing the three standard amounts.
- Only the points this case meets, in the order the engine meets them; the labels and authorities come from web/src/contested.ts (tested against every point the engine can consult).
- Where no authority is recorded for a choice, it says so rather than leaving the list empty.
- The choices are kept in this tab with the answers; 'Back to standard' clears them.
- _Code:_ `web/src/modes/detail/Contested.tsx`

### Step-by-step frame

- **Use for:** Around each 'Take it slow' screen: Back, the steps-left meter, the answers given so far as chips, then one card holding the question.
- **Not for:** More than one topic per card, or a meter that can go up.
- Each screen has its own address (#/slow/work), so the back gesture steps back one question; an address that skips ahead leads to where the person actually is.
- A chip opens its question and, once answered, returns to where the person was; 'See all' lists every answer with Change links. An answer that says little alone carries a word about what it answers ('Vehicle found: Not sure').
- Once the type of claim and the work are known, a line says how many real cases are like this one: a count only, so no figure comes before the person's own.
- A new screen fades up in 150 ms, only for people who have not asked for less motion.
- _Code:_ `web/src/modes/slow/Slow.tsx`

### Header

- **Use for:** The website's header: its logo, its menu and Donate from a laptop up; on a phone the logo, the language switch and a Menu button that opens this calculator's pages and the website's links in place.
- **Not for:** Links that hide this calculator's own pages (they come first in the phone menu).
- 68 px tall from a tablet up (64 px on a phone), with a hairline; stays at the top from a tablet up.
- The menu is a disclosure: Escape closes it and returns the focus to the button; its links are 48 px tall.
- The language switch keeps every answer.
- Skip link to the main content.
- _Code:_ `web/src/components/chrome.tsx`

### Welcome page

- **Use for:** The first screen: one translucent sheet over a photo of claim papers, covering the whole screen, with the headline, one line on what the tool shows, what you can find out (five short lines, 'How cases like yours went' picked out), then the four ways to answer.
- **Not for:** Statistics and long explanations (facts come further down); a pop-up the person has to close.
- The headline is the page's only h1.
- The ways to answer come after the details. At 1280 × 720 and 1366 × 768 all four are on the first screen, in English and in Hindi; on a 360 × 740 phone the first one is (tested).
- On a phone, what you can find out shows its five names only, two to a row (one when the phone's text is set large).
- A link under the buttons leads down to the real cases.
- A family's link opened over earlier answers asks here first: a new case, or the same one (or, for an example, whether to replace them).
- _Code:_ `web/src/pages/Home.tsx`

### Ways to answer

- **Use for:** 'How would you like to do this?': four buttons, each a small drawing of its screen, its name and one line on what it is like, plus 'Not sure? Start the easy way' (Take it slow).
- **Not for:** Pre-choosing for the person, or remembering anything but which way was picked.
- Each button is a link to that way's own address; picking one is remembered on this phone and marked 'Last time' on the next visit.
- #/choose brings the buttons into view with the focus on their heading.
- _Code:_ `web/src/pages/Home.tsx`

### Real cases

- **Use for:** Below the welcome page: six real cases from the case library (picked in stories.ts), each told whole as a case card.
- **Not for:** Made-up stories; text cut off; a row that scrolls sideways.
- A grid: one column on a phone, two on a tablet, three on a wide screen. Three show first; 'Show 3 more cases' adds the rest and moves the focus to the first new one.
- Picked for range (a death and an injury, an offer refused, a child, work with and without proof of income, several states), and checked by a test: each has the accident date, at least two steps and a dated last step.
- Their own small file, fetched after the welcome page.
- _Code:_ `web/src/pages/StoryList.tsx`

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

- **Use for:** The live summary, right under the quick steps: answers left, or the amount, one line on its range (with 'How sure is this?'), what decides whether it applies, the cautions to read, and two buttons (make it more accurate; check an insurer's offer), then share and print.
- **Not for:** Long explanations and tables (they are under 'More about this estimate').
- The same card in all four ways of answering.
- In the page's single column on every screen size; never a panel with its own scroll.
- Lakh / crore first in the CFI blue, the exact amount below, one line on what it means.
- Announced once to screen readers when ready ('Estimate ready: ₹53 lakh'), without moving the focus.
- _Code:_ `web/src/pages/ResultSummary.tsx`

### Bottom bar

- **Use for:** Once there is an estimate (or a stop), a slim bar showing it while the estimate card is out of view, with a button to it, at every width (it replaces the panel that sat beside the questions on a laptop).
- **Not for:** Before there is anything to show.
- Hidden while any answer has focus and while the estimate card is on screen; the page keeps room under a focused answer for it.
- _Code:_ `web/src/pages/Estimator.tsx`

### Notice (info / caution / stop)

- **Use for:** Warnings below the estimate.
- **Not for:** Form errors.
- Tinted box, coloured edge and icon, and a text label; red only for a stop.
- Stops, and what decides whether the amount applies, are shown in the estimate card; cautions are named there and given in full under 'More about this estimate'.
- _Code:_ `web/src/components/ui.tsx`

### Range

- **Use for:** Under 'How sure is this?': conservative, standard and claimant's best as three rows, with a bar when the range is narrow enough to read as one, then how far real awards land. The estimate card gives the range in one line.
- **Not for:** A bar when the range is too wide (the three amounts and what could move it say more).
- Values always given as text; the bar is decorative.
- _Code:_ `web/src/pages/Result.tsx`

### Breakdown list

- **Use for:** Each head of compensation with its formula and linked source, then the total.
- **Not for:** Wide tables on a phone.
- Stacked rows.
- Working figures listed separately, never added to the total.
- _Code:_ `web/src/pages/Result.tsx`

### Accordion

- **Use for:** 'More about this estimate': how sure it is, the cautions in full, how it is built, what could move it, what to prove, interest, other notes, sources.
- **Not for:** The amount, stops, and what decides whether the amount applies.
- A button with aria-expanded and a panel.
- A link to a section, or to something in it (a caution named in the estimate card), opens it first.
- Panels always print expanded.
- _Code:_ `web/src/components/result.tsx`

### Offer check

- **Use for:** 'Got an offer from the insurer?': the offer as a share of the estimate, the award with interest, and the value of waiting today after fees.
- **Not for:** Advice to accept or refuse.
- On the same page, after cases like the estimate; the estimate card's 'Check an insurer's offer' goes straight to it.
- Assumptions (years, interest, discount, fee) visible and editable.
- _Code:_ `web/src/pages/Offer.tsx`

### Checklist

- **Use for:** What to prove.
- **Not for:** —
- Plain list with a green tick; to be confirmed by the legal reviewers.
- _Code:_ `web/src/components/result.tsx`

### Case card

- **Use for:** One real case, the same way wherever it appears (the start page's real cases; 'Cases like yours' under an estimate): death or injury and the year of the accident, the story, each step's amount and year on a timeline, the years it took and the final amount as a multiple, what made the difference (on a tap), and the judgment.
- **Not for:** Implying the person will get the same amount.
- Amounts in lakh and crore to two decimals, as judgments quote them (₹62.78 lakh); under a lakh, the exact amount.
- Under an estimate, each also says how it is similar and different; two show first, the rest on request.
- English case text is marked lang='en' on Hindi pages, which say the stories are in English.
- The case library is fetched when an estimate first appears.
- _Code:_ `web/src/components/story.tsx`

### Buttons

- **Use for:** Primary (blue): the one main action in an area. Outline: alternatives. Links: navigation.
- **Not for:** Two primary buttons side by side.
- Rounded 8 px, 44 px tall on a phone.
- Full width on a phone for the main action.
- _Code:_ `web/src/components/ui.tsx`

### Share actions

- **Use for:** The phone's own share sheet when available, otherwise 'Copy summary'; print / save as PDF.
- **Not for:** wa.me links (they put the estimate in a URL sent to a third party).
- The shared text always says where it came from, the as-of date and 'not legal advice'.
- Nothing is sent to our server.
- _Code:_ `web/src/components/result.tsx`

### Documents (prose and tables)

- **Use for:** Methodology, rules reference, offer study, rendered from the repository.
- **Not for:** Editing the text here: it is generated from docs/*.md.
- Tables become labelled cards on a phone; the page never scrolls sideways.
- _Code:_ `web/src/pages/Doc.tsx`

### Facts and read more

- **Use for:** After the calculator: three plain facts on why this matters, each with its source one tap away, and the website's own pages on compensation, legal help and free treatment.
- **Not for:** A figure without its source, or totals a family cannot picture (crore of rupees pending).
- Each fact is a short sentence under its number.
- Sources open in a new tab when they leave the site.
- _Code:_ `web/src/pages/Home.tsx`

### Help band

- **Use for:** 'Need help? Talk to a person': free legal aid (the District Legal Services Authority, or the national legal aid helpline 15100), on every page, before the footer.
- **Not for:** Naming a helpline nobody has confirmed is staffed. Crashfree India's own number and email return here (one switch in the code) once confirmed.
- The number dials on a phone.
- A long address or number wraps rather than push the page sideways.
- _Code:_ `web/src/components/chrome.tsx`

### Footer

- **Use for:** The website's footer (brand, four columns of links, the line at the bottom), with this calculator's notes: not legal advice, legal aid, privacy, visit counts, sources, versions.
- **Not for:** —
- Rules and engine versions shown so a printout can be traced.
- _Code:_ `web/src/components/chrome.tsx`

## Deviations from the website's design system

| What | Why |
|---|---|
| Secondary text in slate #475569, not the website's #62748E | Families read this on a phone, often outdoors: 7.6:1 on white rather than 4.8:1. |
| On a phone the header scrolls away (the website keeps it at the top); it stays at the top from a tablet up | On a 640–800 px tall screen with the keyboard open, a fixed 65 px header leaves too little room for the question being answered. |
| The header wraps onto two lines with very large text | At 200% text size its controls do not fit one line at 360 px; wrapping keeps the page from scrolling sideways (WCAG 1.4.10). |
| Field edges in slate #8391A7, not the website's slate-200 #E2E8F0 | A field's edge must be visible (WCAG 1.4.11 asks for 3:1); slate-200 is 1.2:1 on white, #8391A7 is 3.2:1. |
| Controls 44 px tall on a phone (40 px from the small breakpoint), not the website's 36 px | WCAG 2.2 target size and Android's touch guidance; 36 px is easy to mis-tap on a 360 px phone. |
| Orange #F57C00 and red #F10015 used for edges and icons only | They are 2.7:1 and about 4.4:1 on white, below the 4.5:1 needed for small text, so the text beside them stays dark. |
| Hint text inside a chosen chip is 75% of the text colour, not the muted grey | The muted grey falls below 4.5:1 on the light-blue tint of a chosen chip. |
