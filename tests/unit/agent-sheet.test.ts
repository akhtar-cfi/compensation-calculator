import { describe, expect, it } from "vitest";
import {
  CASE_HEADER,
  byStateTab,
  caseTab,
  changedReviews,
  istTime,
  parseReviews,
  parseStatus,
  precedentTab,
  runsTab,
  type CaseRow,
  type ReviewRow,
} from "../../src/agent/sheet.js";

const CASES: CaseRow[] = [
  {
    extraction_id: "e-101",
    tid: 101,
    court: "Delhi District Court",
    state_code: "DL",
    decision_date: "2024-01-05",
    kind: "death",
    total_award: 2838000,
    verify_status: "verified",
  },
  {
    extraction_id: "e-102",
    tid: 102,
    court: "Delhi District Court",
    state_code: "DL",
    decision_date: "2024-02-01",
    kind: "injury",
    total_award: 450000,
    verify_status: "partial",
  },
];
const REVIEWS: ReviewRow[] = [
  { target_kind: "extraction", target_id: "e-102", status: "approved", notes: "ok" },
];
const idOf = (tid: number) => CASES.find((c) => c.tid === tid)?.extraction_id;
/** What the Sheets API hands back: every cell as text. */
const asSheet = (values: (string | number)[][]) => values.map((row) => row.map(String));

describe("sheet tabs", () => {
  it("lays out New cases with open reviews first and the review columns last", () => {
    const tab = caseTab(CASES, REVIEWS);
    expect(tab[0]).toEqual(CASE_HEADER);
    expect(tab[1]).toEqual([
      101,
      "https://indiankanoon.org/doc/101/",
      "Delhi District Court",
      "DL",
      "2024-01-05",
      "death",
      2838000,
      "verified",
      "pending",
      "",
    ]);
    expect(tab[2]!.slice(-2)).toEqual(["approved", "ok"]);
  });

  it("round-trips review statuses through the Sheet", () => {
    const sheet = asSheet(caseTab(CASES, REVIEWS));
    // Exported and read back unchanged: nothing to write.
    const unchanged = parseReviews(sheet);
    expect(unchanged.problems).toEqual([]);
    expect(changedReviews("extraction", unchanged.reviews, idOf, REVIEWS).rows).toEqual([]);

    // A reviewer marks 101 "Needs fix" with a note and resets 102 to pending.
    const statusCol = CASE_HEADER.indexOf("Status");
    sheet[1]![statusCol] = "Needs fix";
    sheet[1]![statusCol + 1] = "multiplier looks wrong";
    sheet[2]![statusCol] = "pending";
    const edited = parseReviews(sheet);
    const { rows } = changedReviews("extraction", edited.reviews, idOf, REVIEWS);
    expect(rows).toEqual([
      {
        target_kind: "extraction",
        target_id: "e-101",
        status: "needs_fix",
        notes: "multiplier looks wrong",
        reviewer: null,
      },
      { target_kind: "extraction", target_id: "e-102", status: "pending", notes: "ok", reviewer: null },
    ]);

    // Stored and exported again, the Sheet shows what the reviewer typed, and reading it changes nothing.
    const again = asSheet(caseTab(CASES, rows));
    expect(again.find((r) => r[0] === "101")!.slice(-2)).toEqual(["needs fix", "multiplier looks wrong"]);
    expect(changedReviews("extraction", parseReviews(again).reviews, idOf, rows).rows).toEqual([]);
  });

  it("finds columns by header, reports unknown statuses and unknown tids", () => {
    const values = [
      ["Notes", "Reviewer", "Status", "tid"],
      ["fine", "R1", "Approved", "1,01"],
      ["", "", "maybe", "102"],
      ["", "", "rejected", "999"],
      ["", "", "", "not a tid"],
    ];
    const { reviews, problems } = parseReviews(values);
    expect(reviews).toEqual([
      { tid: 101, status: "approved", notes: "fine", reviewer: "R1" },
      { tid: 999, status: "rejected", notes: "" },
    ]);
    expect(problems).toEqual(['row 3 (tid 102): unknown status "maybe"']);
    expect(changedReviews("extraction", reviews, idOf, []).unknown).toEqual([999]);
    expect(parseReviews([["a", "b"]]).problems).toEqual(["no header row with tid and Status"]);
  });

  it("reads status words forgivingly", () => {
    expect(["", "Approved", " REJECTED ", "needs_fix", "needs-fix", "Needs  Fix"].map(parseStatus)).toEqual([
      "pending",
      "approved",
      "rejected",
      "needs_fix",
      "needs_fix",
      "needs_fix",
    ]);
    expect(parseStatus("done")).toBeUndefined();
  });

  it("round-trips precedent reviews keyed by tid", () => {
    const tab = asSheet(
      precedentTab(
        [
          {
            tid: 7,
            binding_scope: "all_india",
            state_code: null,
            topics: ["multiplier", "future_prospects"],
            holding: "h",
          },
        ],
        [],
      ),
    );
    expect(tab[1]).toEqual([
      "7",
      "https://indiankanoon.org/doc/7/",
      "all_india",
      "",
      "multiplier; future_prospects",
      "h",
      "pending",
      "",
    ]);
    tab[1]![6] = "approved";
    const { rows } = changedReviews("precedent", parseReviews(tab).reviews, (t) => String(t), []);
    expect(rows).toEqual([
      { target_kind: "precedent", target_id: "7", status: "approved", notes: null, reviewer: null },
    ]);
  });

  it("formats By state and Runs", () => {
    expect(
      byStateTab([
        {
          state_code: "DL",
          court_level: "tribunal",
          n: 12,
          median_days_accident_to_award: 1414.5,
          median_days_filing_to_award: null,
          median_interest_rate_pct: 8.256,
        },
      ])[1],
    ).toEqual(["DL", "tribunal", 12, 1415, "", 8.26]);
    const runs = runsTab([
      {
        id: "r1",
        started_at: "2026-10-12T03:30:00Z",
        finished_at: null,
        slot: { key: "supremecourt/multiplier/2024-2026" },
        spend: "1.20",
        fetched: 3,
        extracted: 0,
        verified: 0,
        failed: 0,
        notes: null,
        error: "out_of_credit: HTTP 402",
      },
    ]);
    expect(runs[1]).toEqual([
      "2026-10-12 09:00",
      "",
      "supremecourt/multiplier/2024-2026",
      1.2,
      3,
      0,
      0,
      0,
      "",
      "out_of_credit: HTTP 402",
    ]);
    expect(istTime("2026-10-11T20:15:00Z")).toBe("2026-10-12 01:45");
  });
});
