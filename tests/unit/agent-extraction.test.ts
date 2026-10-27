import { describe, expect, it } from "vitest";
import {
  ExtractionFileSchema,
  SCHEMA_VERSION,
  describeIssues,
  parseExtraction,
} from "../../src/agent/extraction.js";
import { legacyFile, validFile } from "./agent-fixtures.js";

const issues = (f: unknown) => {
  const r = ExtractionFileSchema.safeParse(f);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("extraction schema", () => {
  it("accepts a valid version-1 file and fills defaults", () => {
    const x = ExtractionFileSchema.parse(validFile());
    expect(x.schema_version).toBe(SCHEMA_VERSION);
    expect(x.payload).toMatchObject({
      kind: "death",
      total_award: 2838000,
      contributory_negligence_pct: 0,
      offer_status: "not_mentioned",
      insurer_offer: null,
      burns: false,
      uncertain: [],
    });
    expect(x.precedent).toBeNull();
  });

  it("accepts an unusable judgment with a reason and no award", () => {
    const f = {
      schema_version: 1,
      tid: 7,
      payload: { usable: false, unusable_reason: "remanded" },
      evidence: [],
    };
    expect(issues(f)).toEqual([]);
  });

  it("rejects bad payloads", () => {
    const bad = (edit: (p: Record<string, unknown>) => void) => {
      const f = validFile();
      edit(f.payload as Record<string, unknown>);
      return issues(f);
    };
    expect(bad((p) => (p["accident_date"] = "12/03/2019"))).toEqual([
      "payload.accident_date: expected YYYY-MM-DD",
    ]);
    expect(bad((p) => (p["interest_pct"] = 7.5))[0]).toMatch(/Unrecognized key/); // old name, typo or extra field
    expect(bad((p) => (p["total_award"] = -5))[0]).toMatch(/^payload.total_award/);
    expect(bad((p) => (p["total_award"] = null))).toEqual([
      "payload.total_award: a usable extraction needs kind and total_award",
    ]);
    expect(bad((p) => (p["heads"] = { misc: 100 }))[0]).toMatch(/unknown head/);
    expect(bad((p) => (p["heads"] = { "other:loss_of_studies": 100 }))).toEqual([]);
    expect(bad((p) => (p["state_code"] = "Delhi"))[0]).toMatch(/^payload.state_code/);
    expect(issues({ ...validFile(), schema_version: 2 })[0]).toMatch(/^schema_version/);
    expect(issues({ ...validFile(), evidence: [{ field: "age" }] })[0]).toMatch(/^evidence.0.quote/);
  });

  it("maps a back-test extraction onto version 1", () => {
    const x = parseExtraction(legacyFile(), {
      name: "Delhi District Court",
      level: "tribunal",
      state_code: "DL",
    });
    expect(x.tid).toBe(101);
    expect(x.payload).toMatchObject({
      filing_date: "2019-06-20",
      total_award: 2838000,
      interest_rate_pct: 7.5,
      future_prospects_pct: 40,
      deduction: "1/3",
      multiplier: 16,
      contributory_negligence_pct: 0,
      court: "Delhi District Court",
      court_level: "tribunal",
      state_code: "DL",
    });
    expect(x.evidence.map((e) => e.field)).toContain("filing_date");
    expect(x.evidence.map((e) => e.field)).toContain("total_award");
    expect(
      parseExtraction(legacyFile(), { name: "Supreme Court of India", level: "sc", state_code: "IN" })
        .payload,
    ).toMatchObject({ court_level: "sc", state_code: null });
    expect(parseExtraction(validFile())).toEqual(ExtractionFileSchema.parse(validFile()));
  });

  it("describes problems in one line", () => {
    const r = ExtractionFileSchema.safeParse({ schema_version: 1 });
    expect(r.success).toBe(false);
    expect(describeIssues(r.error)).toMatch(/^tid: .*; payload: /);
    expect(describeIssues(new Error("plain"))).toBe("plain");
  });
});
