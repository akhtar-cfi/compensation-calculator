# MACT Compensation Estimator (India)

An open, citation-backed estimator of **motor accident compensation** under section 166 of the Motor Vehicles Act, 1988:
what the Supreme Court's method gives a family **on its own facts**, which points are contested and how much they move
the figure, and whether a settlement offer is fair.

> **Status: draft (v0.1).** Rules are drafted from Supreme Court judgments and statute but are **not yet signed off by
> legal reviewers**, and estimates have **not yet been checked against tribunal awards**. Not legal advice. Free legal
> aid is available from your District Legal Services Authority (NALSA helpline 15100).

## What it does

- **Entitlement (normative, not a prediction).** Applies Sarla Verma (multiplier, personal deduction), Pranay Sethi
  (future prospects, conventional heads), Magma / Satinder Kaur (consortium per claimant), Raj Kumar (injury heads),
  Shishu Pal 2026 (homemakers: "loss of domestic care"), and the state minimum wage **in force on the accident date**.
- **A range, honestly.** Only *legal* uncertainty varies the conservative / standard / claimant-max scenarios. Every
  contested point is a cited parameter (`rules/range-parameters.yaml`) and is reported as a **swing factor**: how much the
  total moves if that one point goes against you or your way.
- **Eligibility first.** Stops (with an explanation) where an s.166 estimate would mislead: s.164 compensation accepted
  through the insurer (the claim lapses), untraced vehicles (hit-and-run scheme instead), owner-driver single-vehicle crashes.
- **Offer check.** Compares an insurer / Lok Adalat offer with the estimate, including time to award, interest and fees.
- **Correct totals by construction.** Working figures (income, multiplier...) are a different type from payable heads;
  only `sumPayable()` produces a total.

## Use

```bash
npm install
npm run mact -- estimate examples/death-salaried.yaml --as-of 2026-10-10
npm run mact -- offer examples/death-salaried.yaml --offer 1500000
npm run mact -- rules validate --as-of 2026-10-10
npm run ci   # typecheck, lint, tests, rules validation
```

Input format: see `src/engine/types.ts` (`EstimateInputSchema`) and `examples/`.

## Layout

| Path | What |
|---|---|
| `rules/` | Legal rules as data, every value with its authority (`sources.yaml`) |
| `sources/minimum-wages/` | State minimum-wage schedules with dated revisions and notification links |
| `src/engine/` | Pure calculation engine (no I/O, no clock) |
| `src/rules/` | Loading and validation of the rules files |
| `src/cli/` | `mact` command-line tool |
| `tests/` | Unit, persona, eligibility and property-based tests |
| `docs/` | Methodology and law notes |

## Keeping it current

Minimum wages are revised by states (often every April and October) and Supreme Court case law moves. Rules changes go
through pull requests with the source cited; `npm run mact -- rules validate --as-of <date>` flags stale wage schedules.
See `docs/methodology.md`.
