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

## Bulk route: public High Court and Supreme Court judgments

A second source that needs no account or key: the public judgment buckets on AWS Open Data, maintained by Dattam
Labs under CC-BY-4.0 (`indian-high-court-judgments`, 25 High Courts; `indian-supreme-court-judgments`, the Supreme
Court from 1950). Each High Court row carries the case number, judges, CNR, registration and decision dates; each
Supreme Court row its neutral and report citations. Code: `src/agent/bulk/`. Indian Kanoon stays the source for
citation counts and Delhi tribunal awards.

### Daily flow

```
mact agent bulk-next --existing sheet-in.json      # next court-year slot, from the Runs tab
mact agent bulk-list --slot "DL 2025"              # motor appeals in that slot's metadata -> candidates.jsonl
mact agent bulk-fetch --max 40 --seen sheet-in.json  # PDF -> text (pdftotext); scanned ones are logged and skipped
mact agent bulk-pending --min-words 600 --limit 15   # full judgments without an extraction, highest score first
#   extract each into .cache/agent/bulk/extractions/<doc_id>.json (format below)
mact agent bulk-verify --only <doc_id>             # quotes, numbers, dates and journey order
mact agent bulk-sheet out --existing sheet-in.json # rows to append to each Sheet tab
```

`sheet-in.json` is the Sheet as read: column A of Cases, Precedents, Seen and By state, and all of Runs. Rows are
only ever appended below the last one, so nothing a reviewer typed is overwritten.

### Which rows are motor accident appeals

By each court's own case type, read from its metadata (2017–2026): Delhi `MAC.APP.` (used for nothing else),
Allahabad `FAFO`, Rajasthan `CMA`, Madhya Pradesh `MA`, Punjab & Haryana `FAO`, Karnataka `MFA`, Madras `CMA` and
`CMA(MD)`, Calcutta `FMA`, `FMAT` and `FMAT (MV)`, Bombay and Gujarat `FA`, Patna `MA`, Himachal `FAO`. Courts with no
type recorded are searched by an insurer among the parties together with motor-claim words. Every row except Delhi's
`MAC.APP.` must then pass the text check: the judgment mentions the Motor Vehicles Act or a Claims Tribunal (this drops,
for example, employees' compensation appeals filed under the same type). Supreme Court rows need an insurer or those
words, and the text check always.

### Known limits

- **Punjab & Haryana PDFs are mostly scanned images** (7 of 8 sampled), so that court is left out of the rotation until
  OCR is added; Indian Kanoon is the route for Haryana and Punjab meanwhile.
- **Coverage drops in recent years** for some courts (Madhya Pradesh 2024–26, Allahabad 2024–26, Rajasthan 2025–26).
- **Many Allahabad files are short Lok Adalat settlement orders** in appeals. `--min-words 600` keeps them for later.
- **Appeals over-represent contested cases**, so state figures built from them are labelled that way.
- **The hearing-by-hearing history** of a case is on eCourts only, behind a CAPTCHA. The Sheet shows each case's
  CNR so a person can look it up; it is not fetched automatically.

### Extraction format and rules

One JSON file per judgment, `BulkExtractionFileSchema` in `src/agent/bulk/extraction.ts`:

- `doc_id` and `source` (`hc` or `sc`) from the candidate; `payload` as in `src/agent/extraction.ts`, with `court_level`
  and the `state_code` **of the claim** (the state whose tribunal decided it, which for Punjab & Haryana or Gauhati may
  differ from the court's seat).
- `journey`: one step per forum in date order, `mact` (or `lok_adalat`) first, then `high_court`, then `supreme_court`.
  `amount` is the total that forum **awarded** (after any contributory-negligence cut), never the amount claimed.
  `by` on an appeal step says who appealed. A step whose amount the judgment does not state keeps `amount: null`.
- `evidence`: a verbatim quote for every number and date, copied exactly from the judgment text, with `field` set to
  the payload field (`total_award`, `heads.medical`, ...) or `journey.<i>` for a journey step. The date of the
  judgment itself comes from the metadata and needs no quote.
- `precedent` only when the judgment decides a point of law beyond its own facts (multiplier, future prospects,
  deduction, consortium, notional income, functional disability, interest, limitation, liability, ...).
  `binding_scope` is `all_india` for the Supreme Court and `state` for a High Court, `holding` is at most 60 words in
  plain English, and `quote` is the paragraph that states it.
- `title_anon`, `family_summary` and `what_mattered`: plain words a family can follow (what happened, what each court
  awarded, how long it took, what evidence made the difference). **No personal names anywhere outside `evidence`**: not
  the deceased, the injured, the claimants, the drivers or the owners, and never a minor's name. No addresses, vehicle
  numbers or phone numbers. Use "the deceased", "his widow", "a 32-year-old delivery rider".
- `archetypes` from `src/cases/schema.ts`; `audience` is `families`, `lawyers` or `both`.
- If the judgment is not about a motor accident claim, or records no award, set `payload.usable: false` with the reason.

`bulk-verify` checks the quotes, numbers and dates, and that the journey is in date order and starts at a tribunal.
Verification proves a number is quoted, not that it is the right number, so each extraction is also read by a reviewer
before anything is shown to families.

### Publishing

`mact agent bulk-publish <cases.json>` writes `data/cases/<id>.yaml` only for Cases rows a reviewer marked
**approved** with **Show families: yes**. Only the anonymised title and summary, the case number (no party names), the
journey and the link to the public judgment leave the Sheet.

### Daily run (scheduled session)

A fresh session runs this once a day; nothing carries over except the Sheet and the repository.

1. `npm ci`. Read the Sheet "MACT cases": column A of Cases, Precedents, Seen and By state, and all of Runs, into
   `sheet-in.json` (`{"Cases": [...], "Precedents": [...], "Seen": [...], "By state": [...], "Runs": [...]}`).
2. `mact agent bulk-next --existing sheet-in.json` gives the slot; `bulk-list --slot "<slot>"`, then
   `bulk-fetch --max 60 --seen sheet-in.json`.
3. `bulk-pending --min-words 600 --limit 15` lists the day's judgments, highest score first. With fewer than 15,
   take the next slot (`bulk-next --existing sheet-in.json --after "<last slot>"`) and repeat steps 2 and 3, up to
   six slots a day; the Runs row lists every slot covered, and the next day continues after the last.
4. For each judgment, with subagents (several at a time):
   - **Extract** into `.cache/agent/bulk/extractions/<doc_id>.json` following "Extraction format and rules" above,
     then `bulk-verify --only <doc_id>`, repairing quotes until it passes (at most four rounds).
   - **Review.** Supreme Court judgments, and any extraction with a `precedent`, get two independent reviewers:
     one for the numbers and the journey, one for privacy, the legal reading and tags. Every other judgment gets
     one reviewer covering all of it. Reviewers do not edit; they report each issue with the field, the problem,
     the exact fix, a verbatim supporting quote and a severity.
   - **Fix.** When a reviewer reports issues, a fixer applies those the judgment supports (privacy fixes always),
     records each change or refusal in `review_notes`, and re-runs `bulk-verify --only`.
5. `bulk-verify` (all must be verified or partial; failed ones are left out), then `bulk-store` writes the public
   records to `data/bulk-extractions/`; commit and push them.
6. `bulk-sheet out --existing sheet-in.json`, then write each tab's rows at its start row with the Sheets connector
   (By state: clear the tab first). Read back a few cells to check no formula shows an error.
7. Add a line to the Runs tab's notes for anything unusual (scanned files, failed checks, a name masked).

The run never edits rules or engine code and never publishes to `data/cases/`; that needs a reviewer's approval in
the Sheet and a separate pull request.
