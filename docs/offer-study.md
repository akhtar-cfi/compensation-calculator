# Offer study: are insurer offers fair? (kill criterion K1)

## Question

How large is an insurer's legal offer compared with what the family finally receives? Kill criterion K1: if, over at
least 40 offers, the median offer is 75% or more of the final amount, the "check your offer" feature is dropped.

## What published awards can and cannot show

- **Delhi tribunal awards on Indian Kanoon** (back-test, 10 Oct 2026):
  - 44 awards state an offer amount. The median offer was **0.09** of the award after any negligence cut (p25 0.05, p75 0.23), and 91% were below half.
  - **All 44 offers had been rejected.** An accepted offer ends in a settlement order, which is not published as a judgment.
- **So the published figure is biased low.** It cannot show how good the offers that families accept are, and K1 cannot be judged from published awards alone.

## How the missing half will be collected

- **Right to Information applications** (drafted; to be reviewed by our advocate before filing):
  - Delhi district courts: statistics on legal offers filed, accepted and rejected, per tribunal, 2023–26;
  - the four public-sector general insurers (New India, United India, Oriental, National): offers made and accepted in Delhi, with amounts, 2023–26.
- A refusal, or a reply that a figure is not kept, is recorded as a finding.

## Data format for replies (`data/offers/offers.csv`, de-identified, no names)

| Column            | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `id`              | our id: source, year and a running number                        |
| `source`          | `rti_court`, `rti_insurer_<name>`, `award` (published award)     |
| `year`            | financial year of the offer (e.g. `2024-25`)                     |
| `kind`            | `death` or `injury`                                              |
| `offer_amount`    | rupees offered                                                   |
| `accepted`        | `true` / `false`                                                 |
| `final_amount`    | rupees paid (accepted) or awarded, excluding interest (rejected) |
| `cn_pct`          | contributory negligence % applied to the final amount, if known  |
| `months_to_close` | months from filing to settlement or award, if known              |
| `notes`           | anything that affects comparability                              |

Aggregate-only replies (totals, not per case) go in `data/offers/aggregates.csv` with `source, year, offers, accepted,
total_offered_accepted, total_paid_accepted, total_offered_rejected, total_awarded_rejected`.

## Analysis once data arrives

- Share of offers accepted.
- Median offer ÷ final amount, **separately** for accepted offers (÷ amount paid) and rejected offers (÷ award); K1 is read on all offers together.
- Time to settlement vs time to award, to put the offer-check's "wait for the award" trade-off in months.
- Every figure is reported with its source and n.
