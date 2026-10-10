# Methodology (draft v0.1)

## 1. What the number means

The headline is **"your legal entitlement on your facts"**: the amount the Supreme Court's method gives for the facts
entered. It is **normative, not predictive**. Tribunals can award less or more. They may find income or disability not
proved, apply a different view on an unsettled point, or the claim may settle. Interest, usually 6–9% a year from the
date of filing, is shown separately and never added to the headline.

## 2. Scenarios and the range

| Kind of uncertainty                                                                 | How it is handled                                                                                                                |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Legal**: a point the courts have not settled                                      | A _range parameter_ (`rules/range-parameters.yaml`) with a cited value for the conservative, standard and claimant-max scenarios |
| **Factual**: what can be proved (claimed income, functional disability, negligence) | An input, plus "if X is proved" sensitivity cards                                                                                |
| **Practice**: what tribunals actually award                                         | Not used for the headline. Planned: case journeys and a back-tested band (section 7)                                             |

- **Scenarios are consistent.** Conservative = every contested point resolved against the claimant; claimant-max = every point in the claimant's favour.
- **Swing factors** vary one point at a time from the standard scenario. They show which disputes matter, in rupees.
- **Hidden range bar.** If claimant-max ÷ conservative is above 1.75 (death) or 2.5 (injury), the range bar is hidden and the scenarios are shown as cards.
- **Invariant:** conservative ≤ standard ≤ claimant-max. A property test enforces it.

## 3. Two time axes

- **Accident date:** minimum wages, the tax year, and statutory amounts in force when the accident happened.
- **As-of date:** judge-made rules that apply to pending claims. These are the Pranay Sethi 10% steps and the Shishu Pal homemaker amount.

The engine never reads the clock; both dates are inputs.

## 4. Death claims

| Step                       | Rule                                                                                                                                                                                                                    | Authority                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Income: proved salary      | Salary including allowances that benefit the family, **less income tax**. Actual TDS if known; otherwise an approximate slab calculation (flagged)                                                                      | Pranay Sethi; Meenakshi (2024)            |
| Income: income-tax returns | Average of up to three pre-accident returns, less tax. Post-accident returns are counted only in the claimant-max scenario, and only if they help                                                                       | Pranay Sethi; Rashmirekha Tripathy (2026) |
| Income: no proof           | State minimum wage **on the accident date** for the occupation's skill category, from a curated occupation list (never free-text matching). Conservative = unskilled                                                    | —                                         |
| Income: homemaker          | ₹30,000/month "loss of domestic care", revised 10% every three years from 11 Jun 2026. Conservative = unskilled minimum wage                                                                                            | Shishu Pal (2026)                         |
| Income: child              | **Contested.** Conservative = notional ₹25,000/year with multiplier 15 (Kurvan Ansari). Standard / claimant-max = skilled minimum wage                                                                                  | Kurvan Ansari; Kajal; Hansraj (2026)      |
| Income: student            | Skilled minimum wage, or the course precedent (₹12,000/month for a professional course) if higher                                                                                                                       | Mohinder Kaur (2026)                      |
| Income: pensioner          | Pension lost (conservative: less family pension). No future prospects                                                                                                                                                   | Vimal Kanwar                              |
| Future prospects           | Permanent job: 50 / 30 / 15% (under 40 / 40–49 / 50–60). Self-employed, fixed salary or notional income: 40 / 25 / 10%. None above 60                                                                                   | Pranay Sethi; Kirti                       |
| Personal deduction         | Married: 1/3 (2–3 dependants), 1/4 (4–6), 1/5 (7+). Bachelor: 1/2 (1/3 for a large dependent family, claimant-max only). Spouse as the only dependant: 1/3 standard, 1/2 conservative                                   | Sarla Verma                               |
| Multiplier                 | Sarla Verma table by the **deceased's** age, never split. Under 15: 18 standard, 15 conservative. Over 70: 5, flagged                                                                                                   | Sarla Verma; Preetha Krishnan (2025)      |
| Conventional heads         | Loss of estate ₹15,000 and funeral ₹15,000 (from Oct 2017). Consortium ₹40,000 **per claimant**: spouse, each child, each parent. Number of 10% steps: 0 conservative / 2 standard / full three-year clock claimant-max | Pranay Sethi; Magma; Satinder Kaur        |
| Medical before death       | Bills less amounts paid under the cashless treatment scheme                                                                                                                                                             | MV Act s.164B(5)                          |

## 5. Injury claims (experimental)

- **Loss of earning capacity** = monthly income × 12 × (1 + future prospects) × **functional** disability × multiplier (Raj Kumar).
- **Functional disability:**
  - Uses a functional assessment if one is supplied.
  - Otherwise it is estimated from the certificate (flagged): ½ of a limb percentage as standard, ⅓ conservative, the full percentage claimant-max, or 100% if the victim cannot do any earlier work.
  - It is **never floored at the medical percentage**.
- **Other heads:**
  - medical (less cashless-scheme payments) and future medical
  - earnings lost during treatment
  - attendant during treatment and, if needed permanently, future attendant at the minimum wage × 12 × multiplier
  - conveyance and special diet
  - pain, suffering and amenities
  - marriage prospects
- **Non-pecuniary bands** are anchored to a few Supreme Court awards and are marked experimental until calibrated on tribunal data.

## 6. Eligibility and adjustments

**Stops: no estimate is shown, with an explanation, when**

- s.164 compensation was accepted through the insurer (the s.166 claim lapses);
- the offending vehicle is untraced (use the hit-and-run scheme instead);
- an owner-driver was hurt in a single-vehicle crash.

**Warnings:**

- Uninsured vehicle.
- Claim not filed within 6 months. The Supreme Court's interim order of 4 Nov 2025 says such claims should not be dismissed as time-barred.
- The victim was driving a vehicle involved in the crash (possible contributory negligence).

**Deducted:**

- contributory negligence found
- s.164 compensation awarded
- interim relief
- hit-and-run compensation (refundable under s.163)
- ex-gratia equal to pay (against the income head only)

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

**First data point (one Delhi tribunal injury award, Aug 2026; n = 1, not a calibration):**

- Replicate and conformity: exact. The tribunal's loss of earning capacity matches the formula and the rules.
- Predict from family facts: standard estimate about Rs 5.7 lakh against an award of Rs 11.9 lakh before the negligence cut, and outside the range. Two causes:
  - The tribunal took a 15% limb certificate as 15% whole-body functional disability; the standard scenario halves a limb percentage.
  - The discretionary heads were much higher than the experimental bands: Rs 1.25 lakh for shock, pain and amenities against Rs 25,000, and Rs 1.65 lakh for conveyance, diet and family attendant against Rs 15,000.
- Decision: no change on one award. Recalibrate the limb-to-functional factor and the injury bands on at least 60 Delhi injury awards (milestone M2). Until then, injury results stay experimental and the range for low-disability injuries is likely too low.

## 8. Keeping it current

- **Minimum wages** (`sources/minimum-wages/<STATE>.yaml`):
  - Each revision records its effective date, rates, notification link and how it was verified.
  - States revise often (many every April and October).
  - A weekly CI job fails when a schedule is more than 7 months old.
- **Case law and statute.** Monthly review of new Supreme Court and High Court motor-accident judgments and Gazette notifications. Watch list:
  - the larger-bench reference on escalation of conventional heads (_Hasina Yasmin_);
  - the s.166(3) limitation challenge;
  - notification of an interim-relief scheme under s.164A;
  - the next 10% step on 31 Oct 2026.
- **Every rules change** is a pull request that cites its source and updates tests.

## 9. Known limitations (v0.1)

- **Not signed off.** No rule has been reviewed by the legal reviewers yet.
- **Tax** slabs are approximate. FY 2026-27 is assumed unchanged. Surcharge and professional tax are ignored.
- **Not modelled yet:**
  - working homemakers (Shishu Pal's add-on);
  - adult-children consortium variations;
  - apportionment between claimants.
- **Injury bands are uncalibrated** and, on the first Delhi award checked, too low (see the back-test notes in section 7).
