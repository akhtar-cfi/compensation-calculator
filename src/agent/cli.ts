import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FetchLike } from "../ingest/indiankanoon.js";
import { REPO_ROOT } from "../rules/load.js";
import { DEFAULT_DAILY_CAP_RUPEES } from "./budget.js";
import { BULK_USAGE, bulkCommand } from "./bulk/cli.js";
import { hasSupabaseConfig, readAgentConfig, readSupabaseConfig, type Env } from "./config.js";
import { runFetch } from "./fetch.js";
import { loadExisting, readExtractionDir } from "./load-existing.js";
import { extractionRow, precedentRow } from "./rows.js";
import {
  byStateTab,
  caseTab,
  changedReviews,
  parseReviews,
  precedentTab,
  runsTab,
  TABS,
  type CaseRow,
  type Cell,
  type PrecedentRow,
  type ReviewRow,
  type RunRow,
  type StatePracticeRow,
} from "./sheet.js";
import { Store, type StoreFetch } from "./store.js";
import { failureLines, verifyExtraction, type VerifyReport } from "./verify.js";

/** `mact agent ...`: the case agent's commands. See docs/case-agent.md for the daily flow. */
export const AGENT_USAGE = `  mact agent fetch [--budget 30] [--max-docs 30] [--max-searches 10] [--dry-run] [--credit-ok] [--cache-dir DIR]
  mact agent pending [--limit 20] [--work-dir DIR]
  mact agent verify <dir> [--text-dir DIR]
  mact agent upsert <dir> [--run-id UUID]
  mact agent sheet-export <outdir>
  mact agent reviews-import <file.json>
  mact agent load-existing <cacheDir> <extractionDir...> [--ledger-at YYYY-MM-DDTHH:MM:SSZ]
      (need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; fetch also needs IK_API_TOKEN unless --dry-run;
       work files go to .cache/agent, which is not committed)
${BULK_USAGE}`;

const AGENT_CACHE = join(REPO_ROOT, ".cache", "agent");
const VALUE_FLAGS = [
  "budget",
  "max-docs",
  "max-searches",
  "cache-dir",
  "limit",
  "work-dir",
  "text-dir",
  "run-id",
  "ledger-at",
];

export interface AgentDeps {
  env?: Env;
  /** fetch for Supabase. */
  fetch?: StoreFetch;
  /** fetch for Indian Kanoon. */
  ikFetch?: FetchLike;
  log?: (line: string) => void;
}

const flag = (args: readonly string[], name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function numFlag(args: readonly string[], name: string, fallback: number): number {
  const v = flag(args, name);
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`--${name} must be a number of 0 or more`);
  return n;
}

/** Arguments that are neither flags nor a flag's value. */
export function positionals(args: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      if (VALUE_FLAGS.includes(a.slice(2))) i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

const chunk = <T>(xs: readonly T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Judgment texts for the given tids, from the database, in small batches. */
async function textsFromDb(store: Store, tids: readonly number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  for (const part of chunk([...new Set(tids)], 25)) {
    const rows = await store.select<{ tid: number; text: string | null }>("judgments", {
      select: "tid,text",
      filters: [["tid", "in", part]],
    });
    for (const r of rows) if (r.text) out.set(Number(r.tid), r.text);
  }
  return out;
}

const verifyLine = (tid: number, r: VerifyReport) =>
  `${tid}\t${r.status}\tquotes ${r.quotes.found}/${r.quotes.total}` +
  failureLines(r)
    .map((l) => `\n    ${l}`)
    .join("");

export async function agentCommand(
  sub: string | undefined,
  args: string[],
  deps: AgentDeps = {},
): Promise<number> {
  if (sub?.startsWith("bulk-")) return bulkCommand(sub, args, { ...(deps.log && { log: deps.log }) });
  const env = deps.env ?? process.env;
  const log = deps.log ?? ((l: string) => console.log(l));
  const store = () => new Store(readSupabaseConfig(env), deps.fetch);
  const pos = positionals(args);

  if (sub === "fetch") {
    const budgetRupees = numFlag(args, "budget", DEFAULT_DAILY_CAP_RUPEES);
    const dryRun = args.includes("--dry-run") || budgetRupees <= 0;
    const haveStore = hasSupabaseConfig(env);
    if (dryRun && !haveStore)
      log("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: assuming no earlier runs");
    const r = await runFetch({
      ...((haveStore || !dryRun) && { store: store() }),
      ...(!dryRun && {
        ik: {
          token: readAgentConfig(env).ikToken,
          cacheDir: flag(args, "cache-dir") ?? join(AGENT_CACHE, "indiankanoon"),
          ...(deps.ikFetch && { fetch: deps.ikFetch }),
        },
      }),
      budgetRupees,
      maxDocs: numFlag(args, "max-docs", 30),
      maxSearches: numFlag(args, "max-searches", 10),
      dryRun,
      creditOk: args.includes("--credit-ok"),
      log,
    });
    return r.error ? 1 : 0;
  }

  if (sub === "pending") {
    const s = store();
    const workDir = flag(args, "work-dir") ?? join(AGENT_CACHE, "work");
    const rows = await s.select<{
      tid: number;
      court_level: string | null;
      state_code: string | null;
      decision_date: string | null;
    }>("pending_extraction", {
      select: "tid,court_level,state_code,decision_date",
      order: "priority.asc,decision_date.desc.nullslast,tid.asc",
      limit: numFlag(args, "limit", 20),
    });
    if (!rows.length) {
      log("no judgments are waiting for extraction");
      return 0;
    }
    const texts = await textsFromDb(
      s,
      rows.map((r) => Number(r.tid)),
    );
    mkdirSync(workDir, { recursive: true });
    for (const r of rows) {
      const text = texts.get(Number(r.tid));
      if (!text) {
        log(`${r.tid}\t(no text in the database)`);
        continue;
      }
      const file = join(workDir, `${r.tid}.txt`);
      writeFileSync(file, text);
      log(`${r.tid}\t${file}\t${r.court_level ?? ""}\t${r.state_code ?? ""}\t${r.decision_date ?? ""}`);
    }
    return 0;
  }

  if (sub === "verify" && pos[0]) {
    const textDir = flag(args, "text-dir") ?? join(AGENT_CACHE, "work");
    const { files, problems } = readExtractionDir(pos[0], () => undefined);
    const missing = files.map((f) => f.x.tid).filter((t) => !existsSync(join(textDir, `${t}.txt`)));
    const fromDb = missing.length && hasSupabaseConfig(env) ? await textsFromDb(store(), missing) : new Map();
    const counts = { verified: 0, partial: 0, failed: 0 };
    for (const { file, x } of files) {
      const local = join(textDir, `${x.tid}.txt`);
      const text = existsSync(local) ? readFileSync(local, "utf8") : fromDb.get(x.tid);
      if (!text) {
        problems.push(`${file}: no text for ${x.tid} in ${textDir} or the database`);
        continue;
      }
      const r = verifyExtraction(x, text);
      counts[r.status]++;
      log(verifyLine(x.tid, r));
    }
    for (const p of problems) log(`✗ ${p}`);
    log(
      `${counts.verified} verified, ${counts.partial} partial, ${counts.failed} failed; ${problems.length} problem(s)`,
    );
    return problems.length ? 1 : 0;
  }

  if (sub === "upsert" && pos[0]) {
    const s = store();
    const { files, problems } = readExtractionDir(pos[0], () => undefined);
    const texts = await textsFromDb(
      s,
      files.map((f) => f.x.tid),
    );
    const runId =
      flag(args, "run-id") ??
      (await s.select<{ id: string }>("agent_runs", { select: "id", order: "started_at.desc", limit: 1 }))[0]
        ?.id;
    const existing = new Set<string>();
    for (const part of chunk([...texts.keys()], 100))
      for (const e of await s.select<{ tid: number; schema_version: number }>("extractions", {
        select: "tid,schema_version",
        filters: [["tid", "in", part]],
      }))
        existing.add(`${e.tid}/${e.schema_version}`);
    const extractions = new Map<string, ReturnType<typeof extractionRow>>();
    const precedents = new Map<number, NonNullable<ReturnType<typeof precedentRow>>>();
    const counts = { new: 0, verified: 0, failed: 0 };
    for (const { file, x } of files) {
      const text = texts.get(x.tid);
      if (!text) {
        problems.push(`${file}: judgment ${x.tid} is not in the database`);
        continue;
      }
      const r = verifyExtraction(x, text);
      log(verifyLine(x.tid, r));
      const key = `${x.tid}/${x.schema_version}`;
      if (!existing.has(key) && !extractions.has(key)) {
        counts.new++;
        if (r.status === "verified") counts.verified++;
        if (r.status === "failed") counts.failed++;
      }
      extractions.set(key, extractionRow(x, r, runId));
      const p = precedentRow(x);
      if (p) precedents.set(x.tid, p);
    }
    await s.upsert("extractions", [...extractions.values()], { onConflict: ["tid", "schema_version"] });
    if (precedents.size) await s.upsert("precedents", [...precedents.values()], { onConflict: ["tid"] });
    if (runId && counts.new) {
      const [run] = await s.select<{ extracted: number; verified: number; failed: number }>("agent_runs", {
        select: "extracted,verified,failed",
        filters: [["id", "eq", runId]],
      });
      if (run)
        await s.update("agent_runs", [["id", "eq", runId]], {
          extracted: run.extracted + counts.new,
          verified: run.verified + counts.verified,
          failed: run.failed + counts.failed,
        });
    }
    for (const p of problems) log(`✗ ${p}`);
    log(
      `upserted ${extractions.size} extraction(s) (${counts.new} new) and ${precedents.size} precedent(s)` +
        (runId ? ` for run ${runId}` : ""),
    );
    return problems.length ? 1 : 0;
  }

  if (sub === "sheet-export" && pos[0]) {
    const s = store();
    type ExtSel = {
      id: string;
      tid: number;
      verify_status: string;
      kind: string | null;
      total_award: number | null;
      state: string | null;
      judgments: { court: string | null; state_code: string | null; decision_date: string | null } | null;
    };
    const [ext, reviews, precedents, practice, runs] = await Promise.all([
      s.selectAll<ExtSel>("extractions", {
        select:
          "id,tid,verify_status,kind:payload->>kind,total_award:payload->total_award,state:payload->>state_code," +
          "judgments(court,state_code,decision_date)",
        order: "tid.asc,schema_version.desc",
      }),
      s.selectAll<ReviewRow>("reviews", { select: "target_kind,target_id,status,notes,reviewer" }),
      s.selectAll<PrecedentRow>("precedents", { select: "tid,binding_scope,state_code,topics,holding" }),
      s.selectAll<StatePracticeRow>("state_practice"),
      s.select<RunRow>("agent_runs", {
        select: "id,started_at,finished_at,slot,spend,fetched,extracted,verified,failed,notes,error",
        order: "started_at.desc",
        limit: 200,
      }),
    ]);
    const latest = new Map<number, CaseRow>();
    for (const e of ext)
      if (!latest.has(e.tid))
        latest.set(e.tid, {
          extraction_id: e.id,
          tid: e.tid,
          court: e.judgments?.court ?? null,
          state_code: e.state ?? e.judgments?.state_code ?? null,
          decision_date: e.judgments?.decision_date ?? null,
          kind: e.kind,
          total_award: e.total_award,
          verify_status: e.verify_status,
        });
    const tabs: [string, string, Cell[][]][] = [
      [TABS.cases, "new-cases.json", caseTab([...latest.values()], reviews)],
      [TABS.precedents, "precedents.json", precedentTab(precedents, reviews)],
      [TABS.byState, "by-state.json", byStateTab(practice)],
      [TABS.runs, "runs.json", runsTab(runs)],
    ];
    mkdirSync(pos[0], { recursive: true });
    for (const [tab, name, values] of tabs) {
      const file = join(pos[0], name);
      writeFileSync(file, JSON.stringify(values) + "\n");
      log(`${tab}\t${values.length - 1} row(s)\t${file}`);
    }
    return 0;
  }

  if (sub === "reviews-import" && pos[0]) {
    const s = store();
    const data = JSON.parse(readFileSync(pos[0], "utf8")) as Record<string, unknown[][] | undefined>;
    const existing = await s.selectAll<ReviewRow>("reviews", {
      select: "target_kind,target_id,status,notes,reviewer",
    });
    const rows: ReviewRow[] = [];
    const problems: string[] = [];
    const cases = data[TABS.cases];
    if (cases) {
      const parsed = parseReviews(cases);
      problems.push(...parsed.problems.map((p) => `${TABS.cases}: ${p}`));
      const idOf = new Map<number, { id: string; v: number }>();
      for (const part of chunk([...new Set(parsed.reviews.map((r) => r.tid))], 100))
        for (const e of await s.select<{ id: string; tid: number; schema_version: number }>("extractions", {
          select: "id,tid,schema_version",
          filters: [["tid", "in", part]],
        }))
          if ((idOf.get(e.tid)?.v ?? -1) < e.schema_version)
            idOf.set(e.tid, { id: e.id, v: e.schema_version });
      const c = changedReviews("extraction", parsed.reviews, (t) => idOf.get(t)?.id, existing);
      rows.push(...c.rows);
      problems.push(...c.unknown.map((t) => `${TABS.cases}: no extraction for tid ${t}`));
    }
    const precedents = data[TABS.precedents];
    if (precedents) {
      const parsed = parseReviews(precedents);
      problems.push(...parsed.problems.map((p) => `${TABS.precedents}: ${p}`));
      const known = new Set<number>();
      for (const part of chunk([...new Set(parsed.reviews.map((r) => r.tid))], 100))
        for (const p of await s.select<{ tid: number }>("precedents", {
          select: "tid",
          filters: [["tid", "in", part]],
        }))
          known.add(Number(p.tid));
      const c = changedReviews(
        "precedent",
        parsed.reviews,
        (t) => (known.has(t) ? String(t) : undefined),
        existing,
      );
      rows.push(...c.rows);
      problems.push(...c.unknown.map((t) => `${TABS.precedents}: no precedent for tid ${t}`));
    }
    if (!cases && !precedents)
      problems.push(`expected "${TABS.cases}" and/or "${TABS.precedents}" in ${pos[0]}`);
    const updatedAt = new Date().toISOString();
    await s.upsert(
      "reviews",
      rows.map((r) => ({ ...r, source: "sheet", updated_at: updatedAt })),
      { onConflict: ["target_kind", "target_id"] },
    );
    for (const p of problems) log(`✗ ${p}`);
    log(`${rows.length} review(s) changed`);
    return 0;
  }

  if (sub === "load-existing" && pos[0] && pos[1]) {
    const ledgerAt = flag(args, "ledger-at");
    if (ledgerAt !== undefined && Number.isNaN(Date.parse(ledgerAt)))
      throw new Error("--ledger-at must be a date-time");
    const [cacheDir, ...dirs] = pos as [string, ...string[]];
    const s = await loadExisting(store(), {
      cacheDir,
      extractionDirs: dirs,
      ...(ledgerAt !== undefined && { ledgerAt }),
      log,
    });
    for (const p of s.problems.slice(0, 30)) log(`✗ ${p}`);
    if (s.problems.length > 30) log(`… and ${s.problems.length - 30} more problem(s)`);
    return 0;
  }

  console.error(`Usage:\n${AGENT_USAGE}`);
  return 2;
}
