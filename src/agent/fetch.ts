import { randomUUID } from "node:crypto";
import {
  BudgetExceededError,
  IndianKanoonClient,
  IndianKanoonError,
  PRICE_RUPEES,
  type FetchLike,
  type SearchDoc,
} from "../ingest/indiankanoon.js";
import { DailyBudget, ISTDay } from "./budget.js";
import { COURTS, pickSlot, rotationSlots, type Court, type RunSlot, type Slot } from "./rotation.js";
import { judgmentRow } from "./rows.js";
import type { Store } from "./store.js";
import { judgmentText } from "./text.js";

/**
 * One daily fetch run: pick the next rotation slot, search it page by page, and download judgments
 * not yet in the database, all under the daily rupee cap (read from the database before every paid
 * call). A dry run, or a budget of 0, makes no paid call and writes nothing. When Indian Kanoon says
 * the account is out of credit, the run stops and records why; later runs make no Indian Kanoon call
 * until one is started with `creditOk` after the account is recharged.
 */
export const OUT_OF_CREDIT = "out_of_credit";
export const RESULTS_PER_PAGE = 10;
const STALE_RUN_MS = 2 * 60 * 60_000;

export type AgentStore = Pick<Store, "select" | "insert" | "upsert" | "update" | "rpc">;

export interface FetchRunOptions {
  /** Optional only for a dry run (which then assumes no history and no spend today). */
  store?: AgentStore;
  ik?: { token: string; cacheDir: string; fetch?: FetchLike; baseUrl?: string };
  budgetRupees: number;
  maxDocs: number;
  maxSearches: number;
  dryRun?: boolean;
  /** The account was recharged: ignore an out-of-credit stop recorded by an earlier run. */
  creditOk?: boolean;
  courts?: readonly Court[];
  now?: () => Date;
  newId?: () => string;
  log?: (line: string) => void;
}

export interface FetchRunResult {
  runId?: string;
  slot: Slot;
  dryRun: boolean;
  spentBefore: number;
  spend: number;
  searches: number;
  candidates: number;
  fetched: number;
  notes: string[];
  error?: string;
}

interface RecentRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  slot: (RunSlot & Record<string, unknown>) | null;
  error: string | null;
}

/** True for Indian Kanoon's "no credit left" answers (HTTP 402, or an error message about credit). */
export function isOutOfCredit(e: unknown): boolean {
  return (
    e instanceof IndianKanoonError &&
    (e.status === 402 || /credit|balance|recharge|insufficient|exhaust|quota|payment/i.test(e.errmsg ?? ""))
  );
}

/** The agent_runs.error text for a failure. */
export function runError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (isOutOfCredit(e)) return `${OUT_OF_CREDIT}: ${msg}`;
  if (e instanceof IndianKanoonError && (e.status === 401 || e.status === 403)) return `ik_auth: ${msg}`;
  return msg;
}

/** Why this run must not call Indian Kanoon, if the latest run stopped for lack of credit. */
export function creditBlock(recent: readonly RecentRun[], creditOk = false): string | undefined {
  const last = recent[0];
  if (creditOk || !last?.error?.startsWith(OUT_OF_CREDIT)) return undefined;
  return (
    `${OUT_OF_CREDIT}: run ${last.id} (${last.started_at}) stopped for lack of Indian Kanoon credit; ` +
    "recharge the account, then run once with --credit-ok"
  );
}

/** Total results from a search's "found" text, e.g. "1 - 10 of 234". */
export function foundTotal(found: string | undefined): number | undefined {
  const m = /of\s+([\d,]+)/.exec(found ?? "");
  return m ? Number(m[1]!.replace(/,/g, "")) : undefined;
}

export async function runFetch(o: FetchRunOptions): Promise<FetchRunResult> {
  const now = o.now ?? (() => new Date());
  const log = o.log ?? (() => {});
  const day = ISTDay(now());
  const recent = o.store
    ? await o.store.select<RecentRun>("agent_runs", {
        select: "id,started_at,finished_at,slot,error",
        order: "started_at.desc",
        limit: 10,
      })
    : [];
  const slot = pickSlot(rotationSlots(day, o.courts ?? COURTS), recent);
  const spentBefore = o.store ? await new DailyBudget(o.store, o.budgetRupees).spentToday() : 0;
  const remaining = Math.max(0, o.budgetRupees - spentBefore);
  const ceiling = o.maxSearches * PRICE_RUPEES.search + o.maxDocs * PRICE_RUPEES.doc;
  const blocked = creditBlock(recent, o.creditOk);
  const result: FetchRunResult = {
    slot,
    dryRun: Boolean(o.dryRun) || o.budgetRupees <= 0,
    spentBefore,
    spend: 0,
    searches: 0,
    candidates: 0,
    fetched: 0,
    notes: [],
  };
  log(`slot ${slot.key} (${slot.court}, ${slot.state_code}, ${slot.from} to ${slot.to})`);
  log(`query: ${slot.query}`);
  log(
    `today ${day} (IST): Rs ${spentBefore} spent of the Rs ${o.budgetRupees} cap; ` +
      `this run may spend up to Rs ${Math.min(ceiling, remaining).toFixed(2)}`,
  );
  if (blocked) log(`blocked: ${blocked}`);

  if (result.dryRun) {
    log(
      `dry run: would search up to ${o.maxSearches} page(s) (Rs ${PRICE_RUPEES.search} each) and fetch up to ` +
        `${o.maxDocs} judgment(s) not yet in the database (Rs ${PRICE_RUPEES.doc} each); no paid call made`,
    );
    return result;
  }
  if (!o.store || !o.ik)
    throw new Error("the database and Indian Kanoon settings are needed unless --dry-run");
  const store = o.store;
  const running = recent.find(
    (r) => !r.finished_at && now().getTime() - Date.parse(r.started_at) < STALE_RUN_MS,
  );
  if (running)
    throw new Error(`run ${running.id} (started ${running.started_at}) has not finished; not starting`);

  const runId = (o.newId ?? randomUUID)();
  result.runId = runId;
  const stoppedBeforeStart = blocked ?? (remaining < PRICE_RUPEES.search ? "daily cap reached" : undefined);
  // A run that could not start records no slot, so the rotation does not count it as an attempt.
  await store.insert("agent_runs", [
    { id: runId, slot: stoppedBeforeStart ? null : { ...slot, covered: false, searches: 0 } },
  ]);
  const finish = (patch: Record<string, unknown>) =>
    store.update("agent_runs", [["id", "eq", runId]], { finished_at: now().toISOString(), ...patch });
  if (stoppedBeforeStart) {
    const isError = stoppedBeforeStart === blocked;
    if (isError) result.error = stoppedBeforeStart;
    else result.notes.push(stoppedBeforeStart);
    await finish({
      notes: `no Indian Kanoon call; next slot ${slot.key}${isError ? "" : ` (${stoppedBeforeStart})`}`,
      ...(isError && { error: stoppedBeforeStart }),
    });
    log(`stopped before any call: ${stoppedBeforeStart}`);
    return result;
  }

  const budget = new DailyBudget(store, o.budgetRupees, runId);
  const client = new IndianKanoonClient({
    token: o.ik.token,
    cacheDir: o.ik.cacheDir,
    budgetRupees: o.budgetRupees,
    spentBefore,
    beforePaidCall: budget.guard,
    onPaidCall: budget.record,
    ...(o.ik.fetch && { fetch: o.ik.fetch }),
    ...(o.ik.baseUrl && { baseUrl: o.ik.baseUrl }),
  });
  let covered = false;
  const candidates: SearchDoc[] = [];
  const seen = new Set<number>();
  try {
    for (let page = 0; page < o.maxSearches; page++) {
      const res = await client.search(slot.query, page);
      result.searches++;
      covered = true;
      const fresh = res.docs.filter((d) => !seen.has(d.tid));
      for (const d of fresh) seen.add(d.tid);
      const known = await knownTids(
        store,
        fresh.map((d) => d.tid),
      );
      candidates.push(...fresh.filter((d) => !known.has(d.tid)));
      const total = foundTotal(res.found);
      const lastPage =
        res.docs.length < RESULTS_PER_PAGE ||
        !fresh.length ||
        (total !== undefined && (page + 1) * RESULTS_PER_PAGE >= total);
      if (candidates.length >= o.maxDocs || lastPage) break;
    }
    result.candidates = candidates.length;
    for (const d of candidates.slice(0, o.maxDocs)) {
      const doc = await client.doc(d.tid);
      const court = { doctype: slot.doctype, state_code: slot.state_code, level: slot.court_level };
      await store.upsert("judgments", [judgmentRow(doc, judgmentText(doc.doc), court, runId)], {
        onConflict: ["tid"],
      });
      result.fetched++;
    }
  } catch (e) {
    if (e instanceof BudgetExceededError) result.notes.push(e.message);
    else result.error = runError(e);
  }
  result.candidates = Math.max(result.candidates, candidates.length);
  result.spend = client.spentRupees;
  if (candidates.length > o.maxDocs)
    result.notes.push(`${candidates.length - o.maxDocs} more new result(s) left`);
  await finish({
    slot: { ...slot, covered, searches: result.searches },
    spend: result.spend,
    fetched: result.fetched,
    notes: result.notes.join("; ") || null,
    error: result.error ?? null,
  });
  log(
    `searched ${result.searches} page(s), ${result.candidates} new, fetched ${result.fetched}; ` +
      `spent Rs ${result.spend}${result.error ? `; stopped: ${result.error}` : ""}`,
  );
  return result;
}

/** The tids among `tids` that are already in the judgments table. */
async function knownTids(store: AgentStore, tids: readonly number[]): Promise<Set<number>> {
  if (!tids.length) return new Set();
  const rows = await store.select<{ tid: number }>("judgments", {
    select: "tid",
    filters: [["tid", "in", tids]],
  });
  return new Set(rows.map((r) => Number(r.tid)));
}
