import { describe, expect, it } from "vitest";
import { BulkExtractionFileSchema } from "../../src/agent/bulk/extraction.js";
import type { Doc } from "../../src/agent/bulk/run.js";
import { partyNames, publicRecord } from "../../src/agent/bulk/store.js";

const doc: Doc = {
  doc_id: "DLHC010000012019_1_2025-02-10",
  source: "hc",
  court: "High Court of Delhi",
  state_code: "DL",
  case_label: "MAC.APP. 101/2019",
  cnr: "DLHC010000012019",
  judges: 1,
  decided: "2025-02-10",
  pdf_key: "data/pdf/x.pdf",
  words: 900,
  status: "ok",
  topics: [],
  score: 30,
  why: [],
};

const x = BulkExtractionFileSchema.parse({
  schema_version: 1,
  doc_id: doc.doc_id,
  source: "hc",
  payload: {
    usable: true,
    kind: "death",
    total_award: 100000,
    occupation: "worked for Zorawar's shop",
    uncertain: ["claim first filed at a district tribunal and withdrawn"],
  },
  journey: [
    { forum: "mact", date: "2020-01-01", amount: 100000, note: "Tribunal award for Zorawar's widow" },
  ],
  evidence: [{ field: "total_award", quote: "Rs 1,00,000 to Zorawar Bhangu" }],
  precedent: {
    binding_scope: "state",
    state_code: "DL",
    holding: "A holding.",
    quote: "verbatim paragraph naming Zorawar",
  },
  title_anon: "Man, 40, Delhi (death)",
  family_summary: "A man died.",
});

describe("public extraction records", () => {
  it("finds personal names in a case title, not insurers or roles", () => {
    expect(partyNames("MAC.APP./1/2019 of NEW INDIA ASSURANCE CO LTD Vs SMT ZORAWAR BHANGU & ORS")).toEqual([
      "ZORAWAR",
      "BHANGU",
    ]);
    expect(partyNames("ZORAWAR BHANGU versus ORIENTAL INSURANCE COMPANY LTD.")).toEqual([
      "ZORAWAR",
      "BHANGU",
    ]);
  });

  it("drops the verbatim quotes and masks party names everywhere else", () => {
    const { record, masked } = publicRecord(
      x,
      doc,
      "https://example.org/j.pdf",
      "verified, 1/1 quotes",
      "MAC.APP./101/2019 of NEW INDIA ASSURANCE CO LTD Vs ZORAWAR BHANGU",
    );
    const text = JSON.stringify(record);
    expect(text).not.toMatch(/zorawar|bhangu/i);
    expect(masked).toEqual(["ZORAWAR"]);
    expect("evidence" in record.extraction).toBe(false);
    expect(record.extraction.precedent?.quote).toBe("");
    expect(record.extraction.payload.uncertain).toEqual([]);
    expect(record.extraction.payload.occupation).toBe("worked for [name]'s shop");
    expect(record).toMatchObject({
      doc_id: doc.doc_id,
      case: "MAC.APP. 101/2019",
      quote_check: "verified, 1/1 quotes",
    });
  });
});
