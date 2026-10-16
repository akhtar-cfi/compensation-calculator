import type { FetchLike } from "../../src/ingest/indiankanoon.js";
import type { Row, StoreFetch } from "../../src/agent/store.js";

/** An invented tribunal award (no real case, party or number). Line breaks fall mid-sentence on purpose. */
export const AWARD_TEXT = `Claimant A v. XYZ Insurance Co. Ltd. on 5 January, 2024
Delhi District Court · 2024-01-05
https://indiankanoon.org/doc/101/

IN THE COURT OF THE PRESIDING OFFICER, MOTOR ACCIDENT CLAIMS TRIBUNAL
Claimant A and others versus Respondent B and XYZ Insurance Co. Ltd.
Date of accident: 12.03.2019
Date of filing of petition: 20.06.2019
Date of award: 05.01.2024
1. The deceased was aged about 32 years at the time of the accident.
2. The income of the deceased is assessed at Rs. 15,000/- per
month and future prospects of 40% are added.
3. Applying the multiplier of 16, loss of dependency comes to Rs. 26,88,000/-.
4. Funeral expenses Rs. 15,000/-; loss of estate Rs. 15,000/-.
5. Consortium of Rs. 40,000/- each to the three claimants, i.e. Rs. 1,20,000/-.
6. Total compensation awarded is Rs. 28,38,000/- with interest @ 7.5% per annum.`;

/** A version-1 extraction of AWARD_TEXT whose quotes all verify. */
export function validFile() {
  return {
    schema_version: 1,
    tid: 101,
    payload: {
      usable: true,
      kind: "death",
      outcome: "award",
      court: "Delhi District Court",
      court_level: "tribunal",
      state_code: "DL",
      accident_date: "2019-03-12",
      filing_date: "2019-06-20",
      award_date: "2024-01-05",
      age: 32,
      employment: "informal",
      income_monthly_accepted: 15000,
      future_prospects_pct: 40,
      deduction: "1/3",
      multiplier: 16,
      consortium_claimants: 3,
      heads: { loss_of_dependency: 2688000, funeral: 15000, loss_of_estate: 15000, consortium: 120000 },
      awarded_formula_head: 2688000,
      total_award: 2838000,
      interest_rate_pct: 7.5,
    },
    evidence: [
      { field: "accident_date", quote: "Date of accident: 12.03.2019" },
      { field: "filing_date", quote: "Date of filing of petition: 20.06.2019" },
      { field: "award_date", quote: "Date of award: 05.01.2024" },
      { field: "age", quote: "aged about 32 years" },
      // One line here, two lines in the judgment.
      {
        field: "income_monthly_accepted",
        quote: "assessed at Rs. 15,000/- per month and future prospects of 40% are added",
      },
      { field: "multiplier", quote: "multiplier of 16, loss of dependency comes to Rs. 26,88,000/-" },
      { field: "awarded_formula_head", quote: "loss of dependency comes to Rs. 26,88,000/-" },
      { field: "heads.loss_of_dependency", quote: "loss of dependency comes to Rs. 26,88,000/-" },
      { field: "heads.funeral", quote: "Funeral expenses Rs. 15,000/-" },
      { field: "heads.loss_of_estate", quote: "loss of estate Rs. 15,000/-" },
      {
        field: "heads.consortium",
        quote: "Consortium of Rs. 40,000/- each to the three claimants, i.e. Rs. 1,20,000/-",
      },
      { field: "consortium_claimants", quote: "each to the three claimants" },
      { field: "total_award", quote: "Total compensation awarded is Rs. 28,38,000/-" },
      { field: "interest_rate_pct", quote: "with interest @ 7.5% per annum" },
    ],
  };
}

/** The same extraction in the back-test's older shape (bt_out/*.json): tid in "doc", older field names. */
export function legacyFile() {
  return {
    doc: "101",
    usable: true,
    unusable_reason: null,
    outcome: "award",
    kind: "death",
    award_date: "2024-01-05",
    accident_date: "2019-03-12",
    claim_filed: "2019-06-20",
    age: 32,
    employment: "informal",
    occupation: null,
    proof: "none",
    claimed_monthly_income: null,
    income_monthly_accepted: 15000,
    income_basis: "minimum_wage_unskilled",
    fp_pct_applied: 40,
    deduction_applied: "1/3",
    multiplier_applied: 16,
    disability_pct_applied: null,
    certificate_pct: null,
    certificate_basis: null,
    consortium_claimants: 3,
    awarded_formula_head: 2688000,
    awarded_total: 2838000,
    cn_pct: 0,
    offer_amount: null,
    offer_status: "not_mentioned",
    married: true,
    spouse: true,
    children: 2,
    parents: null,
    dependent_parents: null,
    months_off_work: null,
    hospital_days: null,
    medical_bills_awarded: null,
    interest_pct: 7.5,
    heads: { loss_of_dependency: 2688000, funeral: 15000, loss_of_estate: 15000, consortium: 120000 },
    burns: false,
    evidence: validFile().evidence.map((e) => ({ ...e, field: OLD_NAMES[e.field] ?? e.field })),
    uncertain: [],
  };
}
const OLD_NAMES: Record<string, string> = {
  filing_date: "claim_filed",
  total_award: "awarded_total",
  interest_rate_pct: "interest_pct",
  multiplier: "multiplier_applied",
};

export const SUPABASE_ENV = {
  SUPABASE_URL: "https://demo.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key-123",
};

export interface FakeCall {
  method: string;
  table: string;
  params: URLSearchParams;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * An in-memory stand-in for Supabase's REST API, enough for the agent: GET with tid=in./id=eq. filters
 * and limit, POST (insert/upsert), PATCH by id, and rpc/ik_spend_today (the base spend plus every
 * ik_calls row inserted).
 */
export function fakeSupabase(init: { spentToday?: number; tables?: Record<string, Row[]> } = {}) {
  const calls: FakeCall[] = [];
  const tables: Record<string, Row[]> = { agent_runs: [], ik_calls: [], judgments: [], ...init.tables };
  let spent = init.spentToday ?? 0;
  let clock = 0;
  const reply = (status: number, v?: unknown) => ({
    ok: status < 400,
    status,
    text: async () => (v === undefined ? "" : JSON.stringify(v)),
  });
  const fetch: StoreFetch = async (url, req) => {
    const u = new URL(url);
    const table = u.pathname.replace(/^\/rest\/v1\//, "");
    const body = req.body === undefined ? undefined : (JSON.parse(req.body) as unknown);
    calls.push({ method: req.method, table, params: u.searchParams, headers: req.headers, body });
    if (table === "rpc/ik_spend_today") return reply(200, Math.round(spent * 100) / 100);
    if (req.method === "GET") {
      let rows = tables[table] ?? [];
      const tid = u.searchParams.get("tid");
      if (tid?.startsWith("in.(")) {
        const want = new Set(tid.slice(4, -1).split(",").map(Number));
        rows = rows.filter((r) => want.has(Number(r["tid"])));
      }
      const id = u.searchParams.get("id");
      if (id?.startsWith("eq.")) rows = rows.filter((r) => r["id"] === id.slice(3));
      if (u.searchParams.get("order")?.startsWith("started_at.desc"))
        rows = [...rows].sort((a, b) => String(b["started_at"]).localeCompare(String(a["started_at"])));
      const limit = u.searchParams.get("limit");
      return reply(200, limit ? rows.slice(0, Number(limit)) : rows);
    }
    if (req.method === "POST") {
      for (const r of body as Row[]) {
        const row = { ...r };
        if (table === "agent_runs" && !row["started_at"])
          row["started_at"] = new Date(Date.UTC(2026, 9, 12, 0, 0, clock++)).toISOString();
        if (table === "ik_calls") spent += Number(row["cost"]);
        tables[table] = [...(tables[table] ?? []), row];
      }
      return reply(201);
    }
    if (req.method === "PATCH") {
      const id = u.searchParams.get("id")?.replace(/^eq\./, "");
      for (const r of tables[table] ?? []) if (r["id"] === id) Object.assign(r, body);
      return reply(204);
    }
    return reply(400, { message: "unsupported" });
  };
  const writes = () => calls.filter((c) => c.method !== "GET" && !c.table.startsWith("rpc/"));
  return { fetch, calls, tables, writes, spent: () => spent };
}

/** A fake Indian Kanoon API: `answer` gets each URL and returns a status and JSON body. */
export function fakeIk(answer: (url: string) => { status?: number; body: unknown }) {
  const calls: string[] = [];
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    const { status = 200, body } = answer(url);
    return { ok: status < 400, status, text: async () => JSON.stringify(body) };
  };
  return { fetch, calls };
}
