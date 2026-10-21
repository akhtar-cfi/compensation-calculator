import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadExisting, readLedger } from "../../src/agent/load-existing.js";
import type { Row, WriteOptions } from "../../src/agent/store.js";
import { AWARD_TEXT, legacyFile, validFile } from "./agent-fixtures.js";

/** A cache directory and two extraction directories, all invented. */
function setup() {
  const root = mkdtempSync(join(tmpdir(), "agent-load-"));
  const cache = join(root, "cache");
  mkdirSync(join(cache, "text"), { recursive: true });
  const doc = (tid: number, html: string) => ({
    tid,
    title: `Claimant ${tid} v. XYZ Insurance on 5 January, 2024`,
    doc: html,
    docsource: "Delhi District Court",
    publishdate: "2024-01-05",
    numcitedby: 0,
  });
  writeFileSync(join(cache, "doc-aaa.json"), JSON.stringify(doc(101, "<p>ignored: text file wins</p>")));
  writeFileSync(join(cache, "text", "101.txt"), AWARD_TEXT);
  writeFileSync(join(cache, "doc-bbb.json"), JSON.stringify(doc(102, "<p>Total award Rs. 50,000/-</p>")));
  writeFileSync(join(cache, "search-ccc.json"), JSON.stringify({ found: "1 - 1 of 1", docs: [] }));
  writeFileSync(
    join(cache, "ledger.jsonl"),
    [
      '{"endpoint":"search","path":"/search/?formInput=q&pagenum=0","rupees":0.5}',
      '{"endpoint":"doc","path":"/doc/101/","rupees":0.2}',
      "",
    ].join("\n"),
  );
  const v1 = join(root, "v1");
  const legacy = join(root, "legacy");
  mkdirSync(v1);
  mkdirSync(legacy);
  writeFileSync(join(v1, "101.json"), JSON.stringify(validFile()));
  writeFileSync(
    join(v1, "bad.json"),
    JSON.stringify({ schema_version: 1, tid: 101, payload: { usable: true } }),
  );
  writeFileSync(join(v1, "999.json"), JSON.stringify({ ...validFile(), tid: 999 }));
  const partial = legacyFile();
  partial.doc = "102";
  writeFileSync(join(legacy, "102.json"), JSON.stringify(partial));
  return { cache, dirs: [v1, legacy] };
}

function fakeStore() {
  const writes: { table: string; rows: Row[]; opts: WriteOptions }[] = [];
  return {
    writes,
    upsert: async (table: string, rows: readonly Row[], opts: WriteOptions = {}) => {
      writes.push({ table, rows: [...rows], opts });
    },
  };
}

describe("load existing cache and extractions", () => {
  it("upserts judgments, re-verified extractions and ledger rows, the same way every time", async () => {
    const { cache, dirs } = setup();
    const first = fakeStore();
    const at = "2026-10-10T12:00:00.000Z";
    const s = await loadExisting(first, { cacheDir: cache, extractionDirs: dirs, ledgerAt: at });

    const byTable = Object.fromEntries(first.writes.map((w) => [w.table, w]));
    expect(byTable["judgments"]!.opts.onConflict).toEqual(["tid"]);
    expect(
      byTable["judgments"]!.rows.map((r) => [r["tid"], r["doctype"], r["state_code"], r["court_level"]]),
    ).toEqual([
      [101, "delhidc", "DL", "tribunal"],
      [102, "delhidc", "DL", "tribunal"],
    ]);
    expect(byTable["judgments"]!.rows[0]!["text"]).toBe(AWARD_TEXT);
    expect(byTable["judgments"]!.rows[1]!["text"]).toBe("Total award Rs. 50,000/-");

    expect(byTable["extractions"]!.opts.onConflict).toEqual(["tid", "schema_version"]);
    const ext = byTable["extractions"]!.rows;
    expect(ext.map((r) => [r["tid"], r["verify_status"]])).toEqual([
      [101, "verified"],
      [102, "failed"], // the legacy quotes are from another judgment's text
    ]);
    expect((ext[1]!["payload"] as Record<string, unknown>)["filing_date"]).toBe("2019-06-20");
    expect(s.extractions).toEqual({ verified: 1, partial: 0, failed: 1 });
    expect(s.problems).toHaveLength(2);
    expect(s.problems.join("\n")).toMatch(
      /bad\.json: payload\.total_award: a usable extraction needs kind and total_award/,
    );
    expect(s.problems.join("\n")).toMatch(/999\.json: judgment 999 is not in the cache/);

    expect(byTable["ik_calls"]!.opts).toEqual({ onConflict: ["ledger_key"], ignoreDuplicates: true });
    expect(byTable["ik_calls"]!.rows.map((r) => [r["endpoint"], r["cost"], r["at"]])).toEqual([
      ["search", 0.5, at],
      ["doc", 0.2, at],
    ]);

    const second = fakeStore();
    await loadExisting(second, { cacheDir: cache, extractionDirs: dirs, ledgerAt: at });
    expect(second.writes).toEqual(first.writes);
  });

  it("dates ledger lines by the ledger file when no time is given", () => {
    const { cache } = setup();
    const rows = readLedger(cache);
    expect(rows).toHaveLength(2);
    expect(Date.parse(String(rows[0]!["at"]))).toBeGreaterThan(Date.now() - 60_000);
    expect(new Set(rows.map((r) => r["ledger_key"])).size).toBe(2);
  });
});
