# Case agent

A daily job that collects motor accident claims judgments from the Indian Kanoon API, court by court, so the estimator's
rules and back-test can be checked against current practice in each state. Code: `src/agent/`; database schema:
`supabase/migrations/0001_cases.sql`.

## What it does

1. **Fetch** (`mact agent fetch`): picks the next search slot, searches Indian Kanoon, and downloads judgments that are
   not yet in the database.
2. **Extract**: for each new judgment (`mact agent pending`), an extractor (a person or a model) writes a JSON file with
   the award's facts and a verbatim quote from the judgment for every number and date (schema: `src/agent/extraction.ts`).
3. **Verify** (`mact agent verify`, again inside `mact agent upsert`): every quote must occur in the judgment text
   (spacing and line breaks are ignored), and every number and date must appear in its quote. Result: `verified`,
   `partial` or `failed`, with a per-field report.
4. **Store** (`mact agent upsert`): extractions, and precedents where a judgment lays down law, go to a private
   Supabase Postgres database.
5. **Review**: a Google Sheet mirrors the review queue. People mark each row approved, rejected or needs fix.

## Daily flow

```
mact agent fetch --budget 30            # search + download, within the daily cap
mact agent pending --limit 20           # judgments without an extraction -> text files in .cache/agent/work
#   extract each into <dir>/<tid>.json
mact agent verify <dir>                 # check the quotes before storing
mact agent upsert <dir>                 # store extractions (re-verified against the database text)
mact agent reviews-import <sheet.json>  # first read what reviewers typed in the Sheet ...
mact agent sheet-export <outdir>        # ... then write the tabs back, so no edit is overwritten
```

`mact agent load-existing <cacheDir> <extractionDir...>` loads judgments, extractions and the spend ledger collected
before the agent existed. It can be run again safely: rows are upserted and ledger lines are loaded once. Ledger lines
have no time, so they are dated by the ledger file (or `--ledger-at`).

Settings come from the environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and, for `fetch`, `IK_API_TOKEN`.
Values are never printed.

## Rotation

A slot is one court (with its state) × one topic × one three-year window. Topics: MACT appeals in general, multiplier,
future prospects, homemaker, minor/child, consortium, functional disability, interest, limitation, legal offer. Order:
newest window first; within a window the Supreme Court, then High Courts, then Delhi district courts. Each run continues
after the slot the last run searched (stored in `agent_runs.slot`), so the order is fixed by the history. A slot that
could not be searched (cap reached, no credit, an error) is tried again, up to three runs, before the rotation moves on.

**High Court doctype names are unverified.** `supremecourt`, `delhi` (Delhi High Court) and `delhidc` (Delhi district
courts) are known to work. The other High Court names in `src/agent/rotation.ts` are guesses; each must be confirmed by
one search (results come from that court) before it is marked `verified: true`. Until then it is not searched.

## Budget

- The cap is **Rs 30 per calendar day in India** (`--budget` changes it). Before every paid call the agent reads today's
  spend from the database (`ik_spend_today()`), and after it records the call in `ik_calls`. The cap therefore holds
  across processes and restarts. Cached responses cost nothing and are not counted.
- One run spends at most `--max-searches` pages (Rs 0.50 each) and `--max-docs` judgments (Rs 0.20 each): Rs 11 by
  default.
- `--dry-run`, or `--budget 0`, makes no paid call and writes nothing; it prints the slot, the query and the most the run
  could spend.
- If Indian Kanoon answers that the account is out of credit (HTTP 402 or a credit message), the run stops and records
  the reason in `agent_runs.error`. Later runs make no Indian Kanoon call and record the same reason, until someone
  recharges the account and runs `mact agent fetch --credit-ok` once.
- Runs are meant to run one at a time; a run refuses to start while another started in the last two hours is unfinished.

## Coverage limits

- Only what Indian Kanoon publishes. Tribunal awards are published for Delhi district courts; other states' tribunal
  awards mostly are not, so outside Delhi the picture comes from High Court appeals and the Supreme Court.
- A search returns results by relevance, and a run reads at most `--max-searches` pages of one slot. Results beyond that
  wait for the next pass of the rotation.
- Settled claims (accepted offers, Lok Adalat settlements) are not published as judgments, so they are missing.
- Extractions can be wrong even when verified: verification proves a number is quoted, not that it is the right number.
  That is what the human review is for.

## Privacy

- **Full judgment text is kept only in the private database.** Row level security is on for every table with no
  policies, so only the service role key can read or write; that key stays in the agent's environment.
- **The Sheet holds summaries and links**: tid, Indian Kanoon link, court, state, dates, kind, total, verification
  status, holdings of precedents. No judgment text.
- **The repository holds code, the schema and invented test fixtures only.** Anything published from this data (for
  example `data/backtest/awards.csv`) carries de-identified fields and the source link, never names.

## Reviewing in the Sheet

Tabs: **New cases** (one row per extraction), **Precedents**, **By state** (medians from `state_practice`) and **Runs**.
In New cases and Precedents, set **Status** to `pending`, `approved`, `rejected` or `needs fix` and add **Notes** when
something is wrong (which field, what the judgment says). Leave the other columns as they are; rows are matched by tid,
and columns are found by their header, so they may be reordered. Open rows (pending, needs fix) are listed first.
Rejected extractions are left out of By state.
