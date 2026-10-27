# MACT Compensation Estimator (India)

An open, citation-backed estimator of **motor accident compensation** under section 166 of the Motor Vehicles Act, 1988:
estimated compensation under the MACT framework **on a family's own facts**, which points are contested and how much
they move the figure, and how a settlement offer compares with the estimate.

> **Status: draft (v0.1).** Rules are drafted from Supreme Court judgments and statute but are **not yet signed off by
> legal reviewers**. A back-test on 226 Delhi tribunal awards (2024-26) measures how far real awards land from the
> estimate ([methodology](docs/methodology.md), section 7). Not legal advice. Free legal aid is available from your
> District Legal Services Authority (NALSA helpline 15100).

## What it does

- **Estimate (normative, not a prediction).** Applies Sarla Verma (multiplier, personal deduction), Pranay Sethi
  (future prospects, conventional heads), Magma / Satinder Kaur (consortium per claimant), Raj Kumar (injury heads),
  Shishu Pal 2026 (homemakers: "loss of domestic care"), and the state minimum wage **in force on the accident date**.
- **A range, honestly.** Only _legal_ uncertainty varies the conservative / standard / claimant-max scenarios. Every
  contested point is listed with its authority (or "none recorded") in `rules/range-parameters.yaml` and is reported as
  a **swing factor**: how much the total moves if that one point goes against you or your way. Five points are read from
  that file; ten are decided in the engine's code and described there.
- **Eligibility first.** Stops (with an explanation) where an s.166 estimate would mislead: s.164 compensation accepted
  through the insurer (the claim lapses), untraced vehicles (hit-and-run scheme instead), owner-driver single-vehicle crashes.
- **Offer check.** Compares an insurer / Lok Adalat offer with the estimate, including time to award, interest and fees.
- **Case journeys.** Shows up to three similar real, public cases (`data/cases/`): the offer or tribunal award, each
  appeal, the final amount, how long it took and what evidence mattered. Matching is rule-based and says how each case
  differs from yours; weak matches are not shown.
- **Correct totals by construction.** Working figures (income, multiplier...) are a different type from payable heads;
  only `sumPayable()` produces a total.

## Use

```bash
npm install
npm run mact -- estimate examples/death-salaried.yaml --as-of 2026-10-10
npm run mact -- offer examples/death-salaried.yaml --offer 1500000
npm run mact -- cases match examples/death-homemaker.yaml
npm run mact -- backtest data/backtest/awards.csv
FR_API=... npm run mact -- watch   # search for new official minimum-wage orders
IK_API_TOKEN=... npm run mact -- ik search '"legal offer"' --doctypes delhidc --from 2025-01-01 --budget 5
npm run mact -- rules validate --as-of 2026-10-10
npm run ci   # typecheck, lint, tests, rules validation
```

Input format: see `src/engine/types.ts` (`EstimateInputSchema`) and `examples/`.

## Layout

| Path                     | What                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| `rules/`                 | Legal rules as data, every value with its authority (`sources.yaml`)       |
| `sources/minimum-wages/` | State minimum-wage schedules with dated revisions and notification links   |
| `sources/watch.yaml`     | Where each state publishes its wage orders, and the weekly watch list      |
| `data/cases/`            | Case-journey library: real public judgments, anonymised summaries          |
| `src/engine/`            | Pure calculation engine (no I/O, no clock)                                 |
| `src/cases/`             | Case-library schema, loading and similarity matching                       |
| `src/rules/`             | Loading and validation of the rules files                                  |
| `src/cli/`               | `mact` command-line tool                                                   |
| `src/agent/`             | Daily case agent: Indian Kanoon fetch, quote verifier, review Sheet        |
| `src/practice/`          | Delhi award-table reader and practice report (`docs/delhi-practice.md`)    |
| `supabase/migrations/`   | Schema of the agent's private database (`docs/case-agent.md`)              |
| `tests/`                 | Unit, persona, property-based, golden (SC judgment) and case-library tests |
| `docs/`                  | Methodology and law notes                                                  |

## Keeping it current

Minimum wages are revised by states (often every April and October) and Supreme Court case law moves. Rates are taken
only from official orders (never aggregator sites, which have carried forged orders); most state sites must be
downloaded by hand from India (`docs/minimum-wage-intake.md`), and a weekly job searches for new official orders. Rules changes go
through pull requests with the source cited; `npm run mact -- rules validate --as-of <date>` flags stale wage schedules.
See `docs/methodology.md`.
