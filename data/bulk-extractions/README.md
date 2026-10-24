# Bulk extractions (draft)

One file per motor accident judgment collected by the case agent's bulk route (`docs/case-agent.md`, "Bulk route"):
the facts, the case's journey (tribunal, High Court, Supreme Court), the method the court used, tags, and plain
summaries, extracted with AI assistance from public High Court and Supreme Court judgments (AWS Open Data, maintained
by Dattam Labs, CC-BY-4.0). Each file links to its judgment.

- **Draft and unreviewed.** People review each case in a private Sheet; only approved cases are published to
  `data/cases/`, the calculator's case library.
- **No verbatim quotes.** Every number and date was matched to a quote from the judgment when it was extracted
  (`quote_check`), but the quotes are not kept here: raw judgment text names claimants, sometimes children.
- **Names masked.** Any party name from the case title that appears in a stored field is replaced by `[name]`.
- Written by `mact agent bulk-store`; the format is `PublicRecord` in `src/agent/bulk/store.ts`.
