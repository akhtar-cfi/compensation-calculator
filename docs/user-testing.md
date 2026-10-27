# Testing the calculator with real users

A one-hour kit for testing the page with five people. Automated tests check that the page computes correctly and
meets accessibility rules; they cannot tell whether a family member understands the questions or the number. Run
this before legal sign-off, and again after any large change to the page.

## Who

Five people, one at a time, about 30 minutes each:

| #   | Who                                                                | Why                                                                                                        |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1–2 | Paralegals or helpdesk volunteers who handle MACT claims           | They fill the form for families and will spot wrong or missing questions                                   |
| 3–5 | Family members of crash victims, or people like them (not lawyers) | The main audience. At least two should prefer Hindi, and at least three should use their own Android phone |

Five people find most of the serious problems in a page like this; more sessions mostly repeat them. Fix what
they find, then test again with five new people.

## Privacy and consent

- Use the scenario cards below, not the person's own case. If someone wants to try their own case afterwards,
  that is their choice, and nothing about it is written down.
- Do not record names, phone numbers, screens or audio. The score sheet holds a participant number only.
- Say at the start: "We are testing the page, not you. If something is confusing, that is the page's fault. You
  can stop at any time."

## Setup

- The page link. Tell each person that its rules are not yet signed off by the legal reviewers (the page no longer carries a draft banner).
- The person's own phone if possible; otherwise an Android phone about 360 px wide. Clear the browser tab between
  people (or tap "Start again").
- A stopwatch, the score sheet, and the scenario cards printed on separate slips, in English and Hindi.
  _The Hindi text of the cards needs to be translated and checked by a native speaker before use._
- Before each session, check the expected amounts below on the page or with
  `npm run mact -- estimate <file>`: they change when wage orders or the rules change, and conventional amounts
  step up on dates set by the Supreme Court.

## What to say (facilitator)

1. "This page estimates the compensation a family can claim after a road accident. I will give you a few
   situations, one at a time. Please use the page as if it were real, and say out loud what you are thinking."
2. Hand over one card. Start the stopwatch when they start reading it; stop it when they say they have the answer
   (or give up).
3. Do not help, except to say "What would you do if I were not here?". If they are stuck for two minutes, note it
   as a failure and move on.
4. After each task, ask the ease question (below).
5. After task 1 only, ask: "In your own words, what does this number mean?" Write their words down.

## The five tasks

| #   | Card (read by the participant)                                                                                                                                                                                                                                                                                                                                                                                                                             | Success                                                                           | Expected (as of 12 Oct 2026)    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Ramesh, 30, worked in an office in Delhi on ₹25,000 a month, with salary slips. He was walking when an insured car hit him on 1 June 2025. He died. His wife and two children survive him. A claim was filed on 1 August 2025. Nobody has taken any money yet. **How much could the family claim?**                                                                                                                                                        | Says the amount shown, and it matches                                             | about ₹53 lakh (₹52,81,500)     |
| 2   | Sunita, 35, a homemaker in Delhi, was walking when a car hit her on 1 March 2026. She died. Her husband and two children survive her. A claim was filed on 1 April 2026. **How much could the family claim?**                                                                                                                                                                                                                                              | Same                                                                              | about ₹56 lakh (₹55,57,500)     |
| 3   | Arjun, 25, a delivery rider in Delhi without salary slips, was riding his motorcycle when a truck hit it on 1 June 2025. His leg was injured: the disability certificate says 40% of the leg. He can still work, with difficulty. He was off work for 6 months and in hospital for 10 days. Bills were ₹2,00,000, of which ₹1,50,000 was paid under the cashless scheme. A claim was filed on 1 July 2025. He is not married. **How much could he claim?** | Same                                                                              | about ₹17 lakh (₹17,08,186)     |
| 4   | Priya, 20, a college student in Delhi, was riding pillion on a scooter when an insured car hit it on 1 June 2025. She died. Her two parents survive her. No claim has been filed yet, and nobody has taken any money. **How much could the family claim?**                                                                                                                                                                                                 | Same                                                                              | about ₹35 lakh (₹35,21,643)     |
| 5   | Mohan, 40, was walking in Delhi on 1 June 2025 when a vehicle hit him and drove away. Police never found it. He died. **What should the family do?**                                                                                                                                                                                                                                                                                                       | Says the page gives no estimate and points to the hit-and-run scheme or legal aid | No estimate; hit-and-run scheme |

A task counts as a success only if the person reaches the answer without help and with the card's facts entered
correctly. Note each wrong entry even if they correct it.

## The ease question (after every task)

"Overall, how difficult or easy was this task?" on a scale from 1 (very difficult) to 7 (very easy). This is the
Single Ease Question (SEQ), a standard one-question measure of task difficulty.

## Score sheet (one per participant)

| Task | Success (Y/N) | Time (min:s) | Wrong entries or hesitations (where) | SEQ 1–7 | Notes |
| ---- | ------------- | ------------ | ------------------------------------ | ------- | ----- |
| 1    |               |              |                                      |         |       |
| 2    |               |              |                                      |         |       |
| 3    |               |              |                                      |         |       |
| 4    |               |              |                                      |         |       |
| 5    |               |              |                                      |         |       |

Task 1 "what does this number mean", in their words: ______________________

Last three questions:

1. What was the most confusing part?
2. Was there anything you expected to be asked but were not?
3. Would you trust this number enough to compare it with an insurance offer? Why or why not?

## Reading the results

| Check                                         | Target                                                          | If missed                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Tasks completed without help                  | 4 of 5 people on each task                                      | Fix the step where people failed, then retest that task                                                                                    |
| SEQ                                           | Median 5 or more on each task                                   | Look at the hesitations noted for that task                                                                                                |
| Reads the number as a promise (task 1 answer) | No more than 1 of 5                                             | Rework the wording around the amount (this is kill criterion K3 in the plan: more than 20% after two rounds of changes means helpers only) |
| Task 5                                        | Everyone sees that there is no estimate and where to go instead | Make the stop notice more prominent                                                                                                        |

Write up the problems found, each with how many people hit it, and fix the ones that stopped or misled someone
first.
