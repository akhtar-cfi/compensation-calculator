# Methodology (draft v0.1)

**Everything is public.** Every rule, value, assumption and data source the calculator uses is published: this page
explains the method, and the [rules reference](rules-reference.md) lists every value with its source, generated from the
rule files (a test fails if the two disagree). The back-test data and the extraction checks are in `data/backtest/`.
Nothing here is legally signed off yet.

## 1. What the number means

The headline is **estimated compensation under the MACT framework, based on the information provided** (legal review
C-3): the amount the published rules give on the facts entered, built on the Supreme Court's judgments, with the
factual assumptions and practice estimates each labelled. It is **normative, not predictive**. Tribunals can award less or more. They may find income or disability not
proved, apply a different view on an unsettled point, or the claim may settle. Interest, usually 6–9% a year from the
date of filing, is shown separately and never added to the headline.

### How each step is decided

The [rules reference](rules-reference.md#how-the-estimate-is-decided) lists every step of the calculation with what
the calculator does now, the judgment and paragraph it rests on, and the legal reviewer's decision on it (Approve,
Conditional or Hold). Each step is one of five kinds: fixed law, a step that depends on the facts, a point where the
law is split or open (flagged, with the judgments on each side), an estimate from tribunal awards (never presented as
law), or a step withheld until its legal basis is settled. When judgments differ, a fixed order decides which one
governs: the Supreme Court, then the state's own High Court (another High Court only persuades); within a court, the
larger bench, whatever the dates. Two equal benches that differ are left for a lawyer, never settled by date. The
same page records, for each judgment, its bench, the holding relied on and how later judgments treated it.

## 2. Scenarios and the range

| Kind of uncertainty                                                                 | How it is handled                                                                                                                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Legal**: a point the courts have not settled                                      | A _range parameter_ listed in `rules/range-parameters.yaml`: what the conservative, standard and claimant-max scenarios use, and its authority (or "none recorded") |
| **Factual**: what can be proved (claimed income, functional disability, negligence) | An input, plus "if X is proved" sensitivity cards                                                                                                                   |
| **Practice**: what tribunals actually award                                         | Not used for the headline. Shown separately: the practice spread (Delhi claims only, legal review D-5) and similar real cases (section 7)                           |

- **Scenarios are consistent.** Conservative = every contested point resolved against the claimant; claimant-max = every point in the claimant's favour.
- **Swing factors** vary one point at a time from the standard scenario. They show which disputes matter, in rupees.
- **Your choices** (the page's _Full detail_ option): each contested point can also be set on its own, as a lawyer would argue it. The engine then works out one more result with exactly those positions (standard wherever none is chosen). It never changes the three scenarios, and it always lies between conservative and claimant-max; a property test enforces both.
- **Hidden range bar.** If claimant-max ÷ conservative is above 1.75 (death) or 2.5 (injury), the range bar is hidden and the scenarios are shown as cards.
- **Invariant:** conservative ≤ standard ≤ claimant-max. Property tests enforce it for deaths and injuries, with one known exception: when both contributory negligence and an ex-gratia deduction are entered, the order can break (negligence cuts the whole total; the ex-gratia offset is capped at the income head before that cut). Which comes first is left to the legal reviewers. The website asks for neither.

## 3. Two time axes

- **Accident date:** minimum wages, the tax year, and statutory amounts in force when the accident happened.
- **As-of date:** judge-made rules that apply to pending claims. These are the Shishu Pal homemaker amount and, as the alternative only, the Pranay Sethi 10% steps counted to the date of decision. The headline counts those steps up to the accident date (legal review A-12).

The engine never reads the clock; both dates are inputs.

## 4. Death claims

| Step                       | Rule                                                                                                                                                                                                                                                                                                                                                                                                              | Authority                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Income: proved salary      | Salary including allowances that benefit the family, **less income tax**. Actual TDS if known; otherwise an approximate slab calculation (flagged)                                                                                                                                                                                                                                                                | Pranay Sethi; Meenakshi (2024)            |
| Income: income-tax returns | Salaried: the latest return before the accident, never an average. Self-employed: the average of up to three returns. Each return less its own year's tax, or the tax shown on it. A return filed after the accident counts only with records from the time; otherwise it is left out and the result shows what it would add (legal review A-5, B-7)                                                              | Pranay Sethi; Rashmirekha Tripathy (2026) |
| Income: no proof           | State minimum wage **on the accident date** for the occupation's skill category, from a curated occupation list (never free-text matching). Conservative = unskilled                                                                                                                                                                                                                                              | —                                         |
| Income: homemaker          | ₹30,000/month "loss of domestic care", revised 10% every three years from 11 Jun 2026. Conservative = unskilled minimum wage                                                                                                                                                                                                                                                                                      | Shishu Pal (2026)                         |
| Income: child              | Skilled minimum wage on the accident date in every figure, as for an injured child; no Supreme Court rule decides a child's death in an ordinary claim, and the result says so. Kurvan Ansari's ₹25,000 a year applied the old s.163A schedule and is not used (legal review B-1)                                                                                                                                 | Kurvan Ansari; Kajal; Hansraj (2026)      |
| Income: student            | Skilled minimum wage on the accident date, in every figure (legal review A-4: no ₹12,000 benchmark from Mohinder Kaur, a comparator only)                                                                                                                                                                                                                                                                         | Kirti (2021) para 12                      |
| Income: pensioner          | The deceased's own pension, in full in every figure; a family pension is never deducted (legal review A-6). After an injury, a pension still paid is not lost income: the person is assessed as a retired person without a pension, and if the website is not told whether it is still paid, it is taken as paid (A-6). No future prospects                                                                       | Vimal Kanwar                              |
| Future prospects           | Permanent job: 50 / 30 / 15% (under 40 / 40–49 / 50–60). Self-employed, fixed salary or notional income: 40 / 25 / 10%. None above 60. A permanent job without salary slips keeps the permanent-job rate on the minimum wage for its occupation, and the result says a tribunal will want proof that the job was permanent (legal review A-17)                                                                    | Pranay Sethi; Kirti                       |
| Personal deduction         | Married: 1/3 (2–3 dependants), 1/4 (4–6), 1/5 (7+). Unmarried: 1/2, or 1/3 in every figure where the answers say a large family lived on the person's income, whatever its size (legal review A-11). Spouse as the only dependant: 1/3 standard, 1/2 conservative. A parent is a dependant only when the answer says so (legal review A-22)                                                                       | Sarla Verma                               |
| Multiplier                 | Sarla Verma table by the **deceased's** age, never split. Under 15: 18 standard, 15 conservative. Above 65: 5 (legal review A-16)                                                                                                                                                                                                                                                                                 | Sarla Verma; Preetha Krishnan (2025)      |
| Conventional heads         | Loss of estate ₹15,000 and funeral ₹15,000 (from Oct 2017). Consortium ₹40,000 **per claimant**: spouse, each child, each parent. Number of 10% steps: those completed by the accident date (none before 31 Oct 2020; base amounts before 2017) in the conservative and standard figures; counted up to the date of decision in claimant-max, until the larger bench in Hasina Yasmin decides (legal review A-12) | Pranay Sethi; Magma; Satinder Kaur        |
| Medical before death       | Bills less amounts paid under the cashless treatment scheme                                                                                                                                                                                                                                                                                                                                                       | MV Act s.164B(5)                          |

## 5. Injury claims (experimental)

- **Loss of earning capacity** = monthly income × 12 × (1 + future prospects) × **functional** disability × multiplier (Raj Kumar).
- **Functional disability:**
  - Uses a functional assessment if one is supplied.
  - Otherwise it is estimated from the certificate (flagged): for a limb certificate, 0.53 of the percentage as standard (the median Delhi tribunals used, n = 70), 0.5 conservative and the full percentage claimant-max; 100% if the person cannot do any earlier work.
  - It is **never floored at the medical percentage**.
- **Other heads:**
  - medical (less cashless-scheme payments) and future medical
  - earnings lost during treatment (none for a child who did not earn: legal review A-31)
  - attendant during treatment and, if needed permanently, future attendant at the minimum wage × 12 × multiplier
  - conveyance and special diet
  - pain, suffering and amenities
  - marriage prospects
- **Discretionary heads** (pain, suffering and amenities; conveyance and diet; attendant when days are not given; the limb-certificate factor) are calibrated on 92 Delhi tribunal injury awards (2024–26):
  - conservative = tribunal 25th percentile, standard = median, claimant-max = the higher of the 75th percentile and the Supreme Court anchor;
  - values never fall as disability rises (checked by the rules validator);
  - reproduce with `npm run mact -- backtest calibrate data/backtest/injury_heads.csv`.
- Injury results stay **experimental**: Delhi-only calibration, no legal sign-off yet.

## 6. Eligibility and adjustments

**Stops: no estimate is shown, with an explanation, when**

- s.164 compensation was accepted through the insurer (the s.166 claim lapses);
- the offending vehicle is untraced (use the hit-and-run scheme instead: ₹2,00,000 for a death or ₹50,000 for grievous hurt for accidents from 1 Apr 2022, ₹25,000 and ₹12,500 under the 1989 scheme before that);
- an owner-driver was hurt in a single-vehicle crash.

**Also a stop:** no minimum wage on file for the state and accident date, when the income rests on it.

**Cautions** (the estimate is shown, with the caution):

- Uninsured vehicle.
- Claim not filed and 6 months or more since the accident. The Supreme Court's interim order of 4 Nov 2025 says such claims should not be dismissed as time-barred.
- The person was driving a vehicle involved in the crash (possible contributory negligence).
- Injury: no disability certificate; functional disability estimated from the certificate; injury estimates are experimental.
- A child's death: the income basis is unsettled.
- Minimum wage: area assumed or not an area of the state; a lower category used; the period's rates were disputed in court; the wage on file may be out of date.
- No tax table for the year of the accident: the estimate is withheld unless the tax actually paid is entered (another year's table is never used; legal review A-27).
- Salary slips or tax returns chosen but no amount entered (the minimum wage is used).
- No minimum wage on file for the attendant charges worked out from it (attendant days, permanent attendant), which are then taken as nil.
- s.164 compensation awarded: recorded, not deducted (legal review A-28).
- An established fault share and a cashless payment together: the medical expenses are left out and both orders of deduction are given (legal review A-25).

**Notes:** tax estimated from the slabs; the range is too wide for a bar; not a prediction; draft rules.

**Deducted:**

- contributory negligence found
- hit-and-run compensation (refundable under s.163)
- ex-gratia equal to pay, after a death only (against loss of dependency: Sarla Devi, 2026); after an injury it is recorded, not deducted (legal review A-26)

**Recorded, not deducted (legal review A-28, B-12):** an earlier no-fault award (s.164) and interim relief. Whether they are set off depends on the provision and process they were paid under; the result shows what a set-off would take away.

**Never deducted:** mediclaim and life insurance (Helen Rebello; Dolly Satish Gandhi, 2026).

## 7. Validation gates before public use

| Test                                                             | Pass threshold                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------- |
| Golden Supreme Court judgments, using each judgment's own inputs | Each head within ±0.5%, total within ±1%                |
| Replication on tribunal awards (structured award summaries)      | Loss of dependency within 1% for at least 90% of awards |
| Prediction from family-known facts only                          | Coverage and error measured and published               |
| Benchmarks against other public calculators                      | Every per-head difference explained                     |
| Property and boundary tests                                      | Pass                                                    |
| Legal sign-off on every rule used                                | Complete                                                |
| Comprehension testing with families and paralegals               | At most 20% read the figure as a promise                |

### How the back-test works (`mact backtest <awards.csv>`)

Each award is extracted into one de-identified CSV row (columns: `src/backtest/schema.ts`; seed: `data/backtest/awards.csv`).
Four checks run on every row:

| Check      | Input                                                                                     | Question                                                                   |
| ---------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Replicate  | The tribunal's own findings (income, future prospects, deduction, multiplier, disability) | Does the engine's arithmetic reproduce the tribunal's formula head?        |
| Conformity | The income the tribunal accepted, with the rules as of the award date                     | Which parameters did the tribunal set differently from the rules?          |
| Predict    | Only what a family knows (claimed income, proof, family, certificate, time off work)      | How far is the estimate from the award, and is the award inside the range? |
| Offer      | The insurer's legal offer recorded in the award                                           | Offer ÷ award after any negligence cut (kill criterion K1)                 |

Sampling bias is stated on every report: published awards over-represent Delhi, and appeals over-represent contested, low awards.

**Back-test on 226 Delhi tribunal awards (10 Oct 2026)**

How the sample was drawn:

- Indian Kanoon API, Delhi district courts (`doctypes: delhidc`), awards dated Jan 2024–Oct 2026.
- Three searches (legal offer / loss of dependency / functional disability) × six half-year strata; page 0 plus one seeded random page per stratum, so the sample is not only the "most relevant" results.
- 338 judgments fetched (Rs 89.30 in API charges, logged in the cache ledger) and 242 extracted. Left out: 21 duplicates, 14 without an age, date or employment, 4 fixed no-fault awards (s.164) and 3 structured-formula awards (s.163A; the engine estimates s.166 claims). That added 200 rows to the 26 earlier ones: 112 deaths, 114 injuries, 44 with an insurer offer amount.
- **Duplicates:** Indian Kanoon publishes one multi-claim judgment once per claimant. Rows are de-duplicated by judgment text, accident date, age and claim type, and each published copy is extracted for the claimant it names.

How each award was extracted:

- An AI agent reads only the local judgment text. Every number and date must carry a verbatim single-line quote; a script checks each quote against the text and each number against its quotes. Values the judgment does not state are left blank, never estimated.
- **Double coding:** 16 awards re-extracted blind by a second agent. On the 15 where both took the same claim, 196 of 197 fields agree (99.5%); every number agrees, and the one difference is an employment classification.
- Raw judgment text is not committed; rows link to the public judgment.

| Check                     | Result                                                                                                                                                                                                           | Reading                                                                                                                                                                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replicate                 | 187/192 within 1% (97.4%); **K2 passed**                                                                                                                                                                         | Every award whose own arithmetic is consistent is reproduced exactly. The 5 misses are 3 tribunal arithmetic slips (a stated parameter not applied, or garbled), 1 award that taxed income before the formula (extracted gross) and 1 earlier case                                                                            |
| Conformity                | 36/218 awards set a parameter differently from the rules (deduction 21, future prospects 13, multiplier 5); median formula-head gap 0.0%                                                                         | Delhi tribunals apply the Supreme Court formula as written in most awards                                                                                                                                                                                                                                                     |
| Predict, death (n = 112)  | Median abs error 20%, bias 0%; award inside the range in 28%. Middle half of awards: 0.69–1.15 × the estimate (shown to users as the practice spread)                                                            | The centre is right; the range is too narrow for practice because it carries only legal uncertainty, not evidence risk (e.g. a claimed income not accepted)                                                                                                                                                                   |
| Predict, injury (n = 113) | Before calibration (n = 88): median abs error 43%, bias −42%. After: 30%, −16%. Held-out check on the calibration (fit on a random half, test on the other, 5 splits): 36–50% → 25–34%, bias −34..−49% → 0..−26% | Calibration generalises within Delhi; the remaining gap is mostly heads the inputs do not carry (future medical, special items)                                                                                                                                                                                               |
| Not computable            | 1 award (was 60 before the 2011–19 Delhi wage orders were loaded)                                                                                                                                                | Accident in Apr 2012 – Mar 2013, the one year with no official Delhi order found                                                                                                                                                                                                                                              |
| Offers (n = 44)           | Offer ÷ award after negligence cut: median 0.09 (p25 0.05, p75 0.23); 91% below 0.5; **K1 not triggered**                                                                                                        | **Biased low and cannot be fixed from published awards:** an accepted offer ends in a settlement order that is not published as a judgment, so every offer in the sample was rejected. K1 cannot be properly evaluated without settlement data; RTI applications and the data format are in [the offer study](offer-study.md) |

Other findings:

- **Discretionary injury heads are awarded in most cases:** conveyance and diet in 93% (median Rs 50,000), attendant during treatment in 82% (median Rs 30,000), pain, suffering and amenities in 99% (median Rs 1.5 lakh at 10–29% disability). The earlier anchor-only bands were 2–3× too low.
- **Limb certificates:** Delhi tribunals took a median 0.53 of a limb certificate as functional disability (n = 70), close to the earlier ½ rule.
- **Delhi minimum wages 2011–19 (loaded 10 Oct 2026):** read from Wayback copies of the Labour Department's own rate page and orders. Where tribunals used Delhi's wage, the official rate matched the figure in the award (checked by test against 7 awards). For accidents between 3 Mar 2017 and 31 Oct 2018 the rate is legally contested (High Court quashing of 4 Aug 2018, Supreme Court interim restoration of 31 Oct 2018); the official series is used with a warning, as tribunals did.
- **Minimum wage of another state:** some Delhi awards used the minimum wage of the state where the person lived or worked (Uttar Pradesh, Haryana), not Delhi's. The engine takes one state for the wage; which state applies is a question for legal sign-off.

## 8. Keeping it current

- **Minimum wages** (`sources/minimum-wages/<STATE>.yaml`):
  - Each revision records its effective date, rates, notification link and how it was verified.
  - States revise often (many every April and October).
  - A weekly CI job fails when a schedule has had neither a new revision nor a recorded check of the official source (`last_checked`) for 7 months (`rules/settings.yaml`).
  - The engine warns when an accident is more than 7 months after the latest revision on file and the official source has not been checked since the accident date.
  - **Only official orders are loaded.** Aggregator and news figures are never used as rates. Example: a forged Delhi order for 1 Oct 2025 (Rs 19,846 unskilled) was reported by compliance publishers. The Delhi Labour Department declared it fake by a circular of 14 Oct 2025. Loading it would have overstated every no-proof Delhi estimate by about 7.5%.
  - Coverage: Delhi from 1 Oct 2011 to 1 Apr 2025 (28 official rate entries, one of which repeats the April 2018 rates to mark a period, and a declared gap for Apr 2012 to Mar 2013). Central sphere (construction schedule, Areas A/B/C) from 1 Oct 2022 (9 orders), for central-sphere work only, never as a stand-in for a state's rates (legal review A-19).
    - Haryana, Rajasthan, Uttar Pradesh and Madhya Pradesh are not loaded yet. Their sites refuse automated access, so the orders are collected by hand (`docs/minimum-wage-intake.md`). Until then, estimates without income proof stop with a clear message.
    - Central figures quoted elsewhere (₹13,599 / ₹15,057 / ₹20,361 a month) are basic rates without VDA. They understate the wage by about a third.
    - From 1 Oct 2026 the Central VDA order is issued by the Labour Bureau under s.69(2) of the Code on Wages, 2019 (read from the Labour Bureau's own file on 10 Oct 2026).
- **Case law and statute.** Monthly review of new Supreme Court and High Court motor-accident judgments and Gazette notifications. Watch list:
  - the larger-bench reference on escalation of conventional heads (_Hasina Yasmin_);
  - the s.166(3) limitation challenge;
  - notification of an interim-relief scheme under s.164A;
  - the next 10% step on 31 Oct 2026.
- **Revalidation.** A larger-bench ruling, an amendment coming into force, a new notification or a change to the
  calculation reopens the steps it touches in the rule register (`rules/register.yaml`), which records the change.
- **Every rules change** is a pull request that cites its source and updates tests.

## 9. Known limitations (v0.1)

- **Not signed off.** No rule has been reviewed by the legal reviewers yet.
- **Tax:** slabs, rebate, cess and standard deduction for FY 2012-13 to 2026-27 were checked against official sources (listed per year in the [rules reference](rules-reference.md)): FY 2018-19 onwards on 10 Oct 2026; FY 2012-13 to 2017-18, and FY 2019-20's slabs and cess, on 25 Oct 2026 against that year's Finance Bill memorandum. From 1 Apr 2026 the Income-tax Act, 2025 applies with the same rates. Surcharge and professional tax are ignored.
- **Not modelled yet:**
  - working homemakers (Shishu Pal's add-on);
  - adult-children consortium variations;
  - apportionment between claimants.
- **Injury estimates still run low** (median bias −16% on 113 Delhi awards after calibration) and the calibration is Delhi-only (see section 7).
- **Delhi minimum wages:** none before Oct 2011, and none for Apr 2012 – Mar 2013 (orders not found). Accidents in 3 Mar 2017 – 31 Oct 2018 carry a legal-uncertainty warning.
- **Offer evidence covers rejected offers only**: accepted offers are not published, so the offer ÷ award ratio (median 0.09) cannot show how good accepted offers are.
- **Negligence with ex-gratia:** when both are entered the three figures can come out in the wrong order, by lakhs (section 2). The order of the two deductions is for the legal reviewers.
- **The range is legal uncertainty only.** Death estimates are centred well (bias 0%) but most awards fall outside the range, because evidence risk (e.g. an income claim not accepted) is not in it.
