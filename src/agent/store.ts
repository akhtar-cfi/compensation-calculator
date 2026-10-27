import type { SupabaseConfig } from "./config.js";

/**
 * A small PostgREST client for the case agent's Supabase database, over the global fetch.
 * - Every request sends the service role key as `apikey` and `Authorization: Bearer`; the key is
 *   never put in a URL or an error message.
 * - Bulk writes are split by key set (PostgREST needs every object in one request to have the same
 *   keys) and by size (judgment text is large).
 */
export type StoreFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export type FilterValue = string | number | boolean | null | readonly (string | number)[];
/** A PostgREST filter: [column, operator, value], e.g. ["tid", "in", [1, 2]] or ["error", "is", null]. */
export type Filter = readonly [column: string, op: string, value: FilterValue];

export interface SelectQuery {
  select?: string;
  filters?: readonly Filter[];
  /** PostgREST order, e.g. "started_at.desc". */
  order?: string;
  limit?: number;
  offset?: number;
}

export interface WriteOptions {
  /** Unique columns for ON CONFLICT (upsert only). */
  onConflict?: readonly string[];
  /** Keep the existing row on conflict instead of merging (upsert only). */
  ignoreDuplicates?: boolean;
  /** Soft cap on one request's JSON size (default 1.5 MB). */
  maxBytes?: number;
}

export type Row = Record<string, unknown>;

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Encodes a filter value the way PostgREST reads it ("eq.5", "in.(1,2)", "is.null"). */
export function filterParam([column, op, value]: Filter): [string, string] {
  let v: string;
  if (Array.isArray(value))
    v = `(${value.map((x) => (typeof x === "number" ? String(x) : `"${String(x).replace(/["\\]/g, "\\$&")}"`)).join(",")})`;
  else v = value === null ? "null" : String(value);
  return [column, `${op}.${v}`];
}

/** Splits rows into batches that share one key set and stay under maxBytes of JSON. */
export function batches(rows: readonly Row[], maxBytes: number): Row[][] {
  const byKeys = new Map<string, Row[]>();
  for (const r of rows) {
    const sig = Object.keys(r).sort().join(",");
    byKeys.set(sig, [...(byKeys.get(sig) ?? []), r]);
  }
  const out: Row[][] = [];
  for (const group of byKeys.values()) {
    let cur: Row[] = [];
    let size = 2;
    for (const r of group) {
      const n = JSON.stringify(r).length + 1;
      if (cur.length && size + n > maxBytes) {
        out.push(cur);
        cur = [];
        size = 2;
      }
      cur.push(r);
      size += n;
    }
    if (cur.length) out.push(cur);
  }
  return out;
}

export class Store {
  private readonly fetchFn: StoreFetch;
  private readonly base: string;

  constructor(
    private readonly cfg: SupabaseConfig,
    fetchFn?: StoreFetch,
  ) {
    this.fetchFn = fetchFn ?? (globalThis.fetch as unknown as StoreFetch);
    this.base = `${cfg.supabaseUrl.replace(/\/+$/, "")}/rest/v1`;
  }

  /** The REST URL for a table (or rpc/<fn>) with query parameters, encoded for PostgREST. */
  url(path: string, params: readonly (readonly [string, string])[] = []): string {
    const qs = params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return `${this.base}/${path}${qs ? `?${qs}` : ""}`;
  }

  /** Rows of a table or view. */
  async select<T = Row>(table: string, q: SelectQuery = {}): Promise<T[]> {
    const params: [string, string][] = [["select", q.select ?? "*"]];
    for (const f of q.filters ?? []) params.push(filterParam(f));
    if (q.order) params.push(["order", q.order]);
    if (q.limit !== undefined) params.push(["limit", String(q.limit)]);
    if (q.offset !== undefined) params.push(["offset", String(q.offset)]);
    return ((await this.request("GET", this.url(table, params), table)) ?? []) as T[];
  }

  /** Every matching row, paging past the API's per-request row cap. */
  async selectAll<T = Row>(table: string, q: SelectQuery = {}, pageSize = 1000): Promise<T[]> {
    const out: T[] = [];
    for (let offset = 0; ; offset += pageSize) {
      const page = await this.select<T>(table, { ...q, limit: pageSize, offset });
      out.push(...page);
      if (page.length < pageSize) return out;
    }
  }

  /** Plain insert (fails on a duplicate key). */
  async insert(table: string, rows: readonly Row[], opts: WriteOptions = {}): Promise<void> {
    for (const b of batches(rows, opts.maxBytes ?? 1_500_000))
      await this.request("POST", this.url(table), table, b, "return=minimal");
  }

  /** Insert, or on a conflict merge the given columns into the existing row (or keep it). */
  async upsert(table: string, rows: readonly Row[], opts: WriteOptions = {}): Promise<void> {
    const params: [string, string][] = opts.onConflict ? [["on_conflict", opts.onConflict.join(",")]] : [];
    const prefer = `resolution=${opts.ignoreDuplicates ? "ignore" : "merge"}-duplicates,return=minimal`;
    for (const b of batches(rows, opts.maxBytes ?? 1_500_000))
      await this.request("POST", this.url(table, params), table, b, prefer);
  }

  /** Updates the given columns of every row matching the filters. */
  async update(table: string, filters: readonly Filter[], patch: Row): Promise<void> {
    if (!filters.length) throw new Error(`refusing to update every row of ${table}`);
    await this.request("PATCH", this.url(table, filters.map(filterParam)), table, patch, "return=minimal");
  }

  /** Calls a SQL function through /rpc. */
  async rpc<T = unknown>(fn: string, args: Row = {}): Promise<T> {
    return (await this.request("POST", this.url(`rpc/${fn}`), `rpc/${fn}`, args)) as T;
  }

  private async request(
    method: string,
    url: string,
    what: string,
    body?: unknown,
    prefer?: string,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      apikey: this.cfg.serviceRoleKey,
      Authorization: `Bearer ${this.cfg.serviceRoleKey}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (prefer) headers["Prefer"] = prefer;
    const res = await this.fetchFn(url, {
      method,
      headers,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text.slice(0, 300);
      try {
        const e = JSON.parse(text) as { message?: string; details?: string; hint?: string };
        msg = [e.message, e.details, e.hint].filter(Boolean).join(" · ");
      } catch {
        // not JSON; keep the start of the body
      }
      msg = msg.split(this.cfg.serviceRoleKey).join("[redacted]");
      throw new StoreError(
        `Supabase ${method} ${what} failed: HTTP ${res.status}${msg ? ` (${msg})` : ""}`,
        res.status,
      );
    }
    return text ? JSON.parse(text) : undefined;
  }
}
