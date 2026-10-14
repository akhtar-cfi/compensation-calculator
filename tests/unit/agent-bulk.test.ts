import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bulkCommand } from "../../src/agent/bulk/cli.js";
import { BULK_COURTS, courtByState, mactSignal } from "../../src/agent/bulk/courts.js";
import {
  BulkExtractionFileSchema,
  verifyBulk,
  type BulkExtractionFile,
} from "../../src/agent/bulk/extraction.js";
import { headerForm, isoDate, splitCaseTitle } from "../../src/agent/bulk/metadata.js";
import { toLibraryCase } from "../../src/agent/bulk/publish.js";
import { rank, topicsIn } from "../../src/agent/bulk/rank.js";
import {
  bulkSlots,
  fetchTexts,
  listHc,
  listSc,
  nextBulkSlot,
  readJsonl,
  type Candidate,
  type Doc,
} from "../../src/agent/bulk/run.js";
import { objectUrl, parseListing, type HttpFetch } from "../../src/agent/bulk/s3.js";
import {
  appendBlock,
  byStateBlock,
  caseRow,
  col,
  letters,
  reviewedCases,
  seenIds,
  CASES_HEADER,
  type BulkCase,
} from "../../src/agent/bulk/sheet.js";

const FIX = join(import.meta.dirname, "fixtures", "bulk");
const FAKE_PDFTOTEXT = join(FIX, "fake-pdftotext.mjs");
const bytes = (s: string | Buffer): ArrayBuffer => {
  const b = typeof s === "string" ? Buffer.from(s) : s;
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

/** A synthetic appeal judgment (no real parties) with the recitals a journey is built from. */
const FILLER =
  "The appellant submits that the compensation is inadequate and the respondent opposes it. ".repeat(20);
const JUDGMENT = `IN THE HIGH COURT OF DELHI AT NEW DELHI
MAC.APP. 101/2019
1. The accident took place on 12.03.2013 when the deceased was hit by a truck.
2. The claim petition under Section 166 of the Motor Vehicles Act was filed on 05.06.2013.
3. By the impugned award dated 28.11.2015 the learned Claims Tribunal granted Rs.1,62,03,342/- with interest at the rate of 9% per annum.
4. The multiplier of 15 and future prospects of 25% are applied. ${FILLER}
5. The compensation is accordingly enhanced to Rs.1,80,00,000/-. The appeal is allowed.`;

/** Serves the fixture parquet files and synthetic PDFs (plain text, read by the fake pdftotext). */
function fakeFetch(pdfs: Record<string, string>): HttpFetch & { calls: string[] } {
  const calls: string[] = [];
  const f = (async (raw: string) => {
    const url = decodeURIComponent(raw);
    calls.push(url);
    const ok = (body: ArrayBuffer) => ({
      ok: true,
      status: 200,
      text: async () => Buffer.from(body).toString("utf8"),
      arrayBuffer: async () => body,
    });
    const miss = {
      ok: false,
      status: 404,
      text: async () => "",
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    if (url.includes("metadata/parquet/year=2025/court=7_26/bench=dhcdb/"))
      return ok(bytes(readFileSync(join(FIX, "hc-dl-2025.parquet"))));
    if (url.includes("indian-supreme-court-judgments") && url.includes("metadata/parquet/year=2025/"))
      return ok(bytes(readFileSync(join(FIX, "sc-2025.parquet"))));
    const pdf = Object.entries(pdfs).find(([k]) => url.endsWith(k));
    return pdf ? ok(bytes(pdf[1])) : miss;
  }) as HttpFetch & { calls: string[] };
  f.calls = calls;
  return f;
}

const tmp = () => mkdtempSync(join(tmpdir(), "bulk-test-"));

describe("public bucket listing", () => {
  it("parses objects, folders and the continuation token", () => {
    const xml = `<ListBucketResult><IsTruncated>true</IsTruncated><NextContinuationToken>abc&amp;1</NextContinuationToken>
      <Contents><Key>data/pdf/a.pdf</Key><Size>120</Size></Contents><Contents><Key>data/pdf/b.pdf</Key><Size>7</Size></Contents>
      <CommonPrefixes><Prefix>metadata/json/</Prefix></CommonPrefixes></ListBucketResult>`;
    expect(parseListing(xml)).toEqual({
      objects: [
        { key: "data/pdf/a.pdf", size: 120 },
        { key: "data/pdf/b.pdf", size: 7 },
      ],
      prefixes: ["metadata/json/"],
      next: "abc&1",
    });
  });

  it("builds object URLs with encoded path segments", () => {
    expect(objectUrl("hc", "data/pdf/year=2025/court=7_26/x y.pdf")).toBe(
      "https://indian-high-court-judgments.s3.ap-south-1.amazonaws.com/data/pdf/year%3D2025/court%3D7_26/x%20y.pdf",
    );
  });
});

describe("metadata", () => {
  it("reads dates in the bucket's formats and rejects impossible ones", () => {
    expect(isoDate("09-05-2019")).toBe("2019-05-09");
    expect(isoDate(new Date("2025-02-10T00:00:00Z"))).toBe("2025-02-10");
    expect(isoDate(new Date("2023-11-05T18:30:00Z"))).toBe("2023-11-06");
    expect(isoDate("31-02-2020")).toBeUndefined();
    expect(isoDate("")).toBeUndefined();
  });

  it("splits a High Court case title into type, number and year", () => {
    expect(splitCaseTitle("MAC.APP./354/2019 of A Vs B")).toEqual({
      type: "MAC.APP.",
      no: "354",
      year: "2019",
    });
    expect(splitCaseTitle("O.M.P. (COMM)/12/2024 of A Vs B")).toEqual({
      type: "O.M.P. (COMM)",
      no: "12",
      year: "2024",
    });
  });

  it("tells short orders from judgments by the header", () => {
    expect(headerForm("+ MAC.APP. 1/2019 O R D E R 25.03.2025", undefined)).toBe("order");
    expect(headerForm("Page 1 of 15 ... J U D G M E N T", 15)).toBe("judgment");
    expect(headerForm("Page 1 of 9 ... ORDER", 9)).toBe("unknown");
    expect(headerForm("Case :- FIRST APPEAL FROM ORDER No. - 2657 of 2006", undefined)).toBe("unknown");
  });
});

describe("which rows are motor accident appeals", () => {
  const rj = courtByState("RJ")!;
  const dl = courtByState("DL")!;
  it("takes Delhi's MAC.APP. on its own, but needs a second sign for a shared type", () => {
    expect(mactSignal({ case_type: "MAC.APP.", title: "A Vs B", header: "" }, dl)).toBe("type");
    expect(mactSignal({ case_type: "CMA", title: "A Vs NEW INDIA ASSURANCE CO LTD", header: "" }, rj)).toBe(
      "type+party",
    );
    expect(mactSignal({ case_type: "CMA", title: "A Vs B", header: "" }, rj)).toBe("type-only");
    expect(
      mactSignal({ case_type: "CW", title: "A Vs ORIENTAL INSURANCE", header: "Motor Vehicles Act" }, rj),
    ).toBe("party+words");
    expect(mactSignal({ case_type: "CW", title: "A Vs ORIENTAL INSURANCE", header: "" }, rj)).toBeUndefined();
  });

  it("covers 25 High Courts, each code once", () => {
    expect(BULK_COURTS).toHaveLength(25);
    expect(new Set(BULK_COURTS.map((c) => c.code)).size).toBe(25);
  });
});

describe("review weight", () => {
  it("adds scope, bench, citations, topics and date, and says why", () => {
    const r = rank({
      level: "sc",
      judges: 3,
      decided: "2026-07-01",
      citedBy: 7,
      topics: ["multiplier", "consortium"],
    });
    expect(r.score).toBe(50 + 15 + 15 + 10 + 5 + 5);
    expect(r.why).toContain("+15 cited 7 times");
    expect(rank({ level: "hc", judges: 1, decided: "2016-01-01", topics: [] }).score).toBe(30);
  });

  it("finds topics in judgment text", () => {
    expect(topicsIn(JUDGMENT)).toEqual(
      expect.arrayContaining(["multiplier", "future_prospects", "interest"]),
    );
  });
});

describe("listing and fetching from the buckets", () => {
  it("keeps Delhi motor appeals that are not short orders", async () => {
    const cs = await listHc(courtByState("DL")!, [2025], fakeFetch({}));
    expect(cs.map((c) => c.doc_id)).toEqual([
      "DLHC010000012019_1_2025-02-10",
      "DLHC010000042021_1_2025-05-02",
    ]);
    const second = cs[1]! as Extract<Candidate, { source: "hc" }>;
    expect(second).toMatchObject({
      case_type: "MAC.APP.",
      registered: "2021-03-03",
      decided: "2025-05-02",
      pages: 12,
      pdf_key: "data/pdf/year=2025/court=7_26/bench=dhcdb/DLHC010000042021_1_2025-05-02.pdf",
    });
    expect(second.judges).toHaveLength(2);
  });

  it("keeps Supreme Court judgments with an insurer among the parties", async () => {
    const cs = await listSc([2025], fakeFetch({}));
    expect(cs).toHaveLength(1);
    expect(cs[0]).toMatchObject({
      source: "sc",
      neutral_citation: "2025 INSC 900",
      decided: "2025-12-12",
      pdf_key: "data/pdf/year=2025/english/2025_1_900_910_EN.pdf",
    });
  });

  it("fetches text once, and marks missing and scanned files", async () => {
    const work = tmp();
    const f = fakeFetch({
      "DLHC010000012019_1_2025-02-10.pdf": JUDGMENT,
      "DLHC010000042021_1_2025-05-02.pdf": "scanned image",
    });
    const cs = await listHc(courtByState("DL")!, [2025], f);
    const sc = await listSc([2025], f);
    const docs = await fetchTexts(work, [...sc, ...cs], { max: 10, fetch: f, pdftotext: FAKE_PDFTOTEXT });
    expect(docs.map((d) => [d.doc_id, d.status])).toEqual([
      ["2025_1_900_910", "missing"],
      ["DLHC010000012019_1_2025-02-10", "ok"],
      ["DLHC010000042021_1_2025-05-02", "scanned"],
    ]);
    expect(docs[1]!.topics).toContain("multiplier");
    expect(readFileSync(join(work, "text", "DLHC010000012019_1_2025-02-10.txt"), "utf8")).toContain(
      "Rs.1,80,00,000",
    );
    const again = await fetchTexts(work, cs, { max: 10, fetch: f, pdftotext: FAKE_PDFTOTEXT });
    expect(again).toEqual([]);
  });
});

const extraction = (edit: (x: BulkExtractionFile) => void = () => {}): BulkExtractionFile => {
  const x = BulkExtractionFileSchema.parse({
    schema_version: 1,
    doc_id: "DLHC010000012019_1_2025-02-10",
    source: "hc",
    payload: {
      usable: true,
      kind: "death",
      outcome: "appeal_allowed",
      court_level: "hc",
      state_code: "DL",
      accident_date: "2013-03-12",
      filing_date: "2013-06-05",
      award_date: "2015-11-28",
      total_award: 18000000,
      interest_rate_pct: 9,
      multiplier: 15,
      future_prospects_pct: 25,
    },
    journey: [
      { forum: "mact", date: "2015-11-28", amount: 16203342 },
      { forum: "high_court", date: "2025-02-10", amount: 18000000, by: "claimant" },
    ],
    evidence: [
      { field: "accident_date", quote: "The accident took place on 12.03.2013" },
      { field: "filing_date", quote: "Motor Vehicles Act was filed on 05.06.2013" },
      {
        field: "journey.0",
        quote: "By the impugned award dated 28.11.2015 the learned Claims Tribunal granted Rs.1,62,03,342/-",
      },
      { field: "award_date", quote: "impugned award dated 28.11.2015" },
      { field: "interest_rate_pct", quote: "interest at the rate of 9% per annum" },
      { field: "multiplier", quote: "The multiplier of 15 and future prospects of 25% are applied." },
      { field: "future_prospects_pct", quote: "future prospects of 25%" },
      { field: "total_award", quote: "The compensation is accordingly enhanced to Rs.1,80,00,000/-." },
      { field: "journey.1", quote: "The compensation is accordingly enhanced to Rs.1,80,00,000/-." },
    ],
    title_anon: "Man, 40, Delhi (death)",
    family_summary:
      "A man was killed by a truck in Delhi in 2013. The tribunal awarded Rs 1.62 crore in 2015. The High Court raised it to Rs 1.8 crore in 2025, 12 years after the accident.",
    what_mattered: ["The High Court applied future prospects the tribunal had left out."],
    archetypes: ["death_salaried"],
  });
  edit(x);
  return x;
};
const FACTS = { forum: "high_court" as const, decided: "2025-02-10" };

describe("journey verification", () => {
  it("verifies a journey whose amounts and dates are quoted (the High Court date comes from the metadata)", () => {
    const r = verifyBulk(extraction(), JUDGMENT, FACTS);
    expect(r.fields.filter((f) => f.status !== "ok")).toEqual([]);
    expect(r.status).toBe("verified");
  });

  it("flags a tribunal amount that the judgment does not state", () => {
    const r = verifyBulk(
      extraction((x) => (x.journey[0]!.amount = 16203343)),
      JUDGMENT,
      FACTS,
    );
    expect(r.fields.find((f) => f.field === "journey.0.amount")).toMatchObject({ status: "not_in_quote" });
    expect(r.status).not.toBe("verified");
  });

  it("flags steps out of date order and a journey with no tribunal step", () => {
    const r = verifyBulk(
      extraction((x) => {
        x.journey = [
          { forum: "high_court", date: "2025-02-10", amount: 18000000, by: null, note: null },
          { forum: "supreme_court", date: "2020-01-01", amount: null, by: null, note: null },
        ];
      }),
      JUDGMENT,
      FACTS,
    );
    expect(r.fields.filter((f) => f.field === "journey").map((f) => f.detail)).toEqual([
      "steps are not in date order",
      "no tribunal step",
    ]);
  });
});

describe("Sheet store", () => {
  it("appends only new rows below the last one, with the header on an empty tab", () => {
    const header = ["doc_id", "x", "formula"];
    const fresh = [
      ["a", 1, "=B{r}*2"],
      ["b", 2, "=B{r}*2"],
    ];
    expect(appendBlock(header, fresh, undefined)).toEqual({
      start: 1,
      values: [header, ["a", 1, "=B2*2"], ["b", 2, "=B3*2"]],
    });
    expect(appendBlock(header, fresh, [header, ["a"], ["old"]])).toEqual({
      start: 4,
      values: [["b", 2, "=B4*2"]],
    });
  });

  it("writes derived Cases figures and By state medians as formulas", () => {
    const base: BulkCase = {
      doc: {
        doc_id: "d1",
        source: "hc",
        court: "High Court of Delhi",
        state_code: "DL",
        case_label: "MAC.APP. 1/2019",
        cnr: "",
        judges: 1,
        decided: "2025-02-10",
        pdf_key: "data/pdf/x.pdf",
        words: 900,
        status: "ok",
        topics: [],
        score: 30,
        why: [],
      },
      x: extraction(),
      report: { status: "verified", quotes: { total: 1, found: 1 }, fields: [] },
    };
    const row = caseRow(base);
    const at = (h: string) => row[CASES_HEADER.indexOf(h)];
    expect(at("tribunal award (Rs)")).toBe(16203342);
    const L = (h: string) => col(CASES_HEADER, h);
    const [t, h, s, a, d] = [
      L("tribunal award (Rs)"),
      L("High Court award (Rs)"),
      L("Supreme Court award (Rs)"),
      L("accident date"),
      L("decided"),
    ];
    expect(at("final ÷ tribunal")).toBe(
      `=IF(OR(${t}{r}="",AND(${h}{r}="",${s}{r}="")),"",ROUND(IF(${s}{r}<>"",${s}{r},${h}{r})/${t}{r},2))`,
    );
    expect(at("years, accident to this judgment")).toBe(
      `=IF(OR(${a}{r}="",${d}{r}=""),"",ROUND((${d}{r}-${a}{r})/365.25,1))`,
    );
    expect(row).toHaveLength(CASES_HEADER.length);
    expect(at("judgment")).toMatch(/^https:\/\/indian-high-court-judgments/);
    expect(at("lays down law")).toBe("no");
    expect(at("archetypes")).toBe("death_salaried");
    expect(at("CNR (eCourts)")).toBe("");
    expect(at("data, do not edit")).toBe("");
    const leanCell = String(
      caseRow({ ...base, dataMode: "lean" })[CASES_HEADER.indexOf("data, do not edit")],
    );
    expect(leanCell.startsWith("'{")).toBe(true);
    expect(JSON.parse(leanCell.slice(1)).evidence).toEqual([]);
    const by = byStateBlock(["UP", "DL", "DL"]);
    expect(by.values.slice(1, 3).map((r) => r[0])).toEqual(["DL", "UP"]);
    expect(by.values[1]![1]).toBe("=COUNTIF(Cases!D2:D,A2)");
  });

  it("names columns past Z the way Sheets does", () => {
    expect([0, 25, 26, 51, 52].map(letters)).toEqual(["A", "Z", "AA", "AZ", "BA"]);
    expect(CASES_HEADER.length).toBeGreaterThan(26);
  });

  it("collects doc_ids already handled from Cases, Precedents and Seen", () => {
    const ids = seenIds({
      Cases: [["doc_id", "x"], ["a"]],
      Precedents: [["doc_id"], ["b"]],
      Seen: [
        ["doc_id", "status"],
        ["c", "scanned"],
      ],
      Runs: [["doc_id"], ["ignored"]],
    });
    expect([...ids].sort()).toEqual(["a", "b", "c"]);
  });

  it("starts the rotation at the newest Supreme Court year and leaves scanned courts out", () => {
    const slots = bulkSlots(2026);
    expect(slots.slice(0, 3)).toEqual(["SC 2026", "DL 2026", "UP 2026"]);
    expect(slots.some((s) => s.startsWith("PB "))).toBe(false);
    expect(nextBulkSlot(slots, [])).toBe("SC 2026");
    expect(
      nextBulkSlot(slots, [
        ["date", "scope"],
        ["d1", "SC 2026"],
        ["d2", "DL 2026"],
      ]),
    ).toBe("UP 2026");
    expect(
      nextBulkSlot(slots, [
        ["date", "scope"],
        ["d", slots[slots.length - 1]!],
      ]),
    ).toBe("SC 2026");
    // a run that covered several slots continues after the last one it lists; a pilot label is skipped
    expect(
      nextBulkSlot(slots, [
        ["date", "scope"],
        ["d1", "pilot: SC 8"],
        ["d2", "SC 2026; DL 2026; UP 2026"],
      ]),
    ).toBe("RJ 2026");
  });
});

describe("publishing to the case library", () => {
  const reviewed = (status: "approved" | "pending", show = true) => ({
    x: extraction(),
    doc_id: "DLHC010000012019_1_2025-02-10",
    link: "https://indian-high-court-judgments.s3.ap-south-1.amazonaws.com/data/pdf/x.pdf",
    court: "High Court of Delhi",
    case_label: "MAC.APP. 101/2019",
    decided: "2025-02-10",
    status,
    showFamilies: show,
    tags: [],
  });

  it("turns an approved, family-facing row into a valid library case with no party names", () => {
    const r = toLibraryCase(reviewed("approved"));
    expect(r.problems).toEqual([]);
    expect(r.case).toMatchObject({
      id: "hc-dlhc010000012019-1-2025-02-10",
      court: "HC",
      citation: "MAC.APP. 101/2019, High Court of Delhi, 2025",
      state: "DL",
      journey: [
        { forum: "mact", date: "2015-11-28", amount: 16203342 },
        { forum: "high_court", date: "2025-02-10", amount: 18000000 },
      ],
    });
  });

  it("refuses rows that are not approved or not marked for families", () => {
    expect(toLibraryCase(reviewed("pending")).problems).toContain("not approved");
    expect(toLibraryCase(reviewed("approved", false)).problems).toContain('"Show families" is not yes');
  });
});

describe("mact agent bulk-* commands", () => {
  it("lists a slot, fetches, verifies, exports the Sheet and publishes nothing unreviewed", async () => {
    const work = tmp();
    const out = join(work, "out");
    const lines: string[] = [];
    const deps = {
      fetch: fakeFetch({ "DLHC010000012019_1_2025-02-10.pdf": JUDGMENT }),
      pdftotext: FAKE_PDFTOTEXT,
      log: (l: string) => lines.push(l),
      today: "2026-10-14",
    };
    expect(await bulkCommand("bulk-list", ["--slot", "DL 2025", "--work-dir", work], deps)).toBe(0);
    expect(readJsonl<Candidate>(join(work, "candidates.jsonl"))).toHaveLength(2);
    expect(await bulkCommand("bulk-fetch", ["--max", "5", "--work-dir", work], deps)).toBe(0);
    expect(readJsonl<Doc>(join(work, "docs.jsonl")).map((d) => d.status)).toEqual(["missing", "ok"]);

    mkdirSync(join(work, "extractions"));
    writeFileSync(
      join(work, "extractions", "DLHC010000012019_1_2025-02-10.json"),
      JSON.stringify(extraction()),
    );
    expect(await bulkCommand("bulk-verify", ["--work-dir", work], deps)).toBe(0);
    expect(lines.join("\n")).toContain("1 extraction(s): 1 verified, 0 partial, 0 failed");

    expect(await bulkCommand("bulk-sheet", [out, "--work-dir", work], deps)).toBe(0);
    type Blocks = Record<string, { start: number; values: unknown[][] }>;
    const sheet = JSON.parse(readFileSync(join(out, "sheet.json"), "utf8")) as Blocks;
    expect(sheet["Cases"]!.start).toBe(1);
    expect(sheet["Cases"]!.values[0]).toEqual(CASES_HEADER);
    expect(sheet["Cases"]!.values).toHaveLength(2);
    expect(sheet["Runs"]!.values[1]!.slice(0, 2)).toEqual(["2026-10-14", "DL 2025"]);
    // header + the extracted judgment + the missing one (an unextracted "ok" judgment would not be listed)
    expect(sheet["Seen"]!.values).toHaveLength(3);
    expect(sheet["By state"]!.values[1]!.slice(0, 2)).toEqual(["DL", "=COUNTIF(Cases!D2:D,A2)"]);
    const rc = reviewedCases(sheet["Cases"]!.values);
    expect(rc.cases[0]!.doc_id).toBe("DLHC010000012019_1_2025-02-10");
    expect(rc.cases[0]!.x).toBeUndefined();
    expect(rc.cases[0]!.case_label).toBe("MAC.APP. 101/2019");

    // A second export against the Sheet as it now stands appends nothing to Cases and one Runs row.
    const dump = {
      Cases: sheet["Cases"]!.values,
      Seen: sheet["Seen"]!.values,
      Runs: sheet["Runs"]!.values,
      "By state": sheet["By state"]!.values,
    };
    writeFileSync(join(work, "dump.json"), JSON.stringify(dump));
    expect(
      await bulkCommand("bulk-sheet", [out, "--work-dir", work, "--existing", join(work, "dump.json")], deps),
    ).toBe(0);
    const again = JSON.parse(readFileSync(join(out, "sheet.json"), "utf8")) as Blocks;
    expect(again["Cases"]).toEqual({ start: 3, values: [] });
    expect(again["Runs"]!.start).toBe(3);
    expect(again["Seen"]!.values).toEqual([]);

    writeFileSync(join(work, "cases.json"), JSON.stringify({ Cases: sheet["Cases"]!.values }));
    expect(await bulkCommand("bulk-publish", [join(work, "cases.json"), "--dry-run"], deps)).toBe(0);
    expect(lines[lines.length - 1]).toBe("0 case(s) ready");

    // Approved and marked for families: published from the extraction file in the work directory.
    const reviewed = sheet["Cases"]!.values.map((r) => [...r]);
    reviewed[1]![CASES_HEADER.indexOf("Status")] = "approved";
    reviewed[1]![CASES_HEADER.indexOf("Show families")] = "yes";
    writeFileSync(join(work, "cases.json"), JSON.stringify({ Cases: reviewed }));
    expect(
      await bulkCommand("bulk-publish", [join(work, "cases.json"), "--dry-run", "--work-dir", work], deps),
    ).toBe(0);
    expect(lines[lines.length - 1]).toBe("1 case(s) ready");
    expect(existsSync(join(work, "slot.txt"))).toBe(true);
  });

  it("extracts a judgment filed under two case numbers once and shows both numbers on its row", async () => {
    const work = tmp();
    const out = join(work, "out");
    const lines: string[] = [];
    const deps = {
      fetch: fakeFetch({
        "DLHC010000012019_1_2025-02-10.pdf": JUDGMENT,
        "DLHC010000042021_1_2025-05-02.pdf": JUDGMENT,
      }),
      pdftotext: FAKE_PDFTOTEXT,
      log: (l: string) => lines.push(l),
      today: "2026-10-14",
    };
    await bulkCommand("bulk-list", ["--slot", "DL 2025", "--work-dir", work], deps);
    await bulkCommand("bulk-fetch", ["--work-dir", work], deps);
    lines.length = 0;
    await bulkCommand("bulk-pending", ["--work-dir", work], deps);
    expect(lines.filter((l) => l.startsWith("DLHC"))).toHaveLength(1);
    expect(lines[lines.length - 1]).toBe("1 pending");

    mkdirSync(join(work, "extractions"));
    writeFileSync(
      join(work, "extractions", "DLHC010000012019_1_2025-02-10.json"),
      JSON.stringify(extraction()),
    );
    lines.length = 0;
    await bulkCommand("bulk-pending", ["--work-dir", work], deps);
    expect(lines).toEqual(["0 pending"]);
    await bulkCommand("bulk-sheet", [out, "--work-dir", work], deps);
    const sheet = JSON.parse(readFileSync(join(out, "sheet.json"), "utf8")) as Record<
      string,
      { values: unknown[][] }
    >;
    const row = sheet["Cases"]!.values[1]!;
    expect(row[CASES_HEADER.indexOf("case")]).toBe("'MAC.APP. 101/2019; MAC.APP. 103/2021");
    // Both uploads are finished (one extracted, the other the same text), so both are in Seen.
    expect(sheet["Seen"]!.values.slice(1).map((r) => r[0])).toEqual([
      "DLHC010000042021_1_2025-05-02",
      "DLHC010000012019_1_2025-02-10",
    ]);
  });

  it("leaves fetched judgments that are not yet extracted out of Seen, so a later run picks them up", async () => {
    const work = tmp();
    const out = join(work, "out");
    const deps = {
      fetch: fakeFetch({ "DLHC010000012019_1_2025-02-10.pdf": JUDGMENT }),
      pdftotext: FAKE_PDFTOTEXT,
      log: () => {},
      today: "2026-10-14",
    };
    await bulkCommand("bulk-list", ["--slot", "DL 2025", "--work-dir", work], deps);
    await bulkCommand("bulk-fetch", ["--work-dir", work], deps);
    await bulkCommand("bulk-sheet", [out, "--work-dir", work], deps);
    const sheet = JSON.parse(readFileSync(join(out, "sheet.json"), "utf8")) as Record<
      string,
      { values: unknown[][] }
    >;
    expect(sheet["Seen"]!.values.slice(1).map((r) => [r[0], r[1]])).toEqual([
      ["DLHC010000042021_1_2025-05-02", "missing"],
    ]);
  });
});
