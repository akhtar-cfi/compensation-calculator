import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Client for the Indian Kanoon API (https://api.indiankanoon.org/documentation/).
 * - POST requests with "Authorization: Token <token>" and "Accept: application/json".
 * - Every response is cached on disk, so re-running a pull costs nothing.
 * - A hard budget (in rupees) is checked before every paid call; uncached calls are logged to a ledger.
 * Prices are from the API pricing page as read on 10 Oct 2026; check them before a large pull.
 */
export const PRICE_RUPEES = {
  search: 0.5, // per page of results
  doc: 0.2,
  origdoc: 0.5,
  docfragment: 0.05,
  docmeta: 0.02,
} as const;
export type Endpoint = keyof typeof PRICE_RUPEES;

export interface SearchDoc {
  tid: number;
  title: string;
  headline?: string;
  docsource?: string;
  publishdate?: string;
  docsize?: number;
  numcites?: number;
  numcitedby?: number;
}
export interface SearchResult {
  found?: string;
  docs: SearchDoc[];
}
export interface DocResult {
  tid: number;
  title: string;
  doc: string; // HTML
  publishdate?: string;
  docsource?: string;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface ClientOptions {
  token: string;
  budgetRupees: number;
  cacheDir: string;
  fetch?: FetchLike;
  baseUrl?: string;
}

export class BudgetExceededError extends Error {}

export class IndianKanoonClient {
  private spent = 0;
  private readonly fetchFn: FetchLike;
  private readonly baseUrl: string;

  constructor(private readonly opts: ClientOptions) {
    if (!opts.token) throw new Error("Indian Kanoon API token is required (set IK_API_TOKEN).");
    this.fetchFn = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.baseUrl = opts.baseUrl ?? "https://api.indiankanoon.org";
    mkdirSync(opts.cacheDir, { recursive: true });
  }

  /** Rupees spent by this client instance on uncached calls. */
  get spentRupees(): number {
    return Math.round(this.spent * 100) / 100;
  }

  search(formInput: string, pagenum = 0): Promise<SearchResult> {
    const q = encodeURIComponent(formInput);
    return this.call<SearchResult>("search", `/search/?formInput=${q}&pagenum=${pagenum}`);
  }

  doc(tid: number): Promise<DocResult> {
    return this.call<DocResult>("doc", `/doc/${tid}/`);
  }

  docmeta(tid: number): Promise<Record<string, unknown>> {
    return this.call("docmeta", `/docmeta/${tid}/`);
  }

  docfragment(tid: number, formInput: string): Promise<Record<string, unknown>> {
    return this.call("docfragment", `/docfragment/${tid}/?formInput=${encodeURIComponent(formInput)}`);
  }

  private async call<T>(endpoint: Endpoint, path: string): Promise<T> {
    const key = createHash("sha256").update(path).digest("hex").slice(0, 32);
    const file = join(this.opts.cacheDir, `${endpoint}-${key}.json`);
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as T;

    const cost = PRICE_RUPEES[endpoint];
    if (this.spent + cost > this.opts.budgetRupees + 1e-9)
      throw new BudgetExceededError(
        `Budget of Rs ${this.opts.budgetRupees} reached (spent Rs ${this.spentRupees}); not calling ${path}`,
      );
    const res = await this.fetchFn(this.baseUrl + path, {
      method: "POST",
      headers: { Authorization: `Token ${this.opts.token}`, Accept: "application/json" },
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Indian Kanoon ${endpoint} failed: HTTP ${res.status}`);
    const json = JSON.parse(body) as T & { errmsg?: string };
    if (json.errmsg) throw new Error(`Indian Kanoon ${endpoint} error: ${json.errmsg}`);
    this.spent += cost;
    writeFileSync(file, body);
    appendFileSync(
      join(this.opts.cacheDir, "ledger.jsonl"),
      JSON.stringify({ endpoint, path, rupees: cost }) + "\n",
    );
    return json;
  }
}

/** Rupees recorded in a cache directory's ledger, across every run. */
export function ledgerTotal(cacheDir: string): number {
  const file = join(cacheDir, "ledger.jsonl");
  if (!existsSync(file)) return 0;
  const total = readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .reduce((sum, line) => sum + (JSON.parse(line) as { rupees: number }).rupees, 0);
  return Math.round(total * 100) / 100;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Plain text of a judgment's HTML: one line per block, entities decoded, blank runs collapsed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|pre|h\d|li|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
      return String.fromCodePoint(code);
    })
    .split("\n")
    .map((l) => l.replace(/[ \t\u00a0]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** DD-MM-YYYY, the date format the search API expects. */
export function ikDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}-${Number(m)}-${y}`;
}

export interface QueryFilters {
  doctypes?: string; // e.g. "delhidc" (Delhi district courts), "delhi" (Delhi HC), "supremecourt"
  from?: string; // ISO date
  to?: string; // ISO date
}

/** Builds a formInput string with the API's in-query filters (doctypes:, fromdate:, todate:). */
export function buildQuery(terms: string, f: QueryFilters = {}): string {
  let q = terms;
  if (f.doctypes) q += ` doctypes: ${f.doctypes}`;
  if (f.from) q += ` fromdate: ${ikDate(f.from)}`;
  if (f.to) q += ` todate: ${ikDate(f.to)}`;
  return q;
}

/** Search templates for the back-test sample. Operators ANDD / ORR / NOTT are case-sensitive. */
export const TEMPLATES = {
  /** Delhi tribunal awards that record an insurer's legal offer (offer-vs-award study). */
  delhi_mact_legal_offer: '"legal offer" ANDD "Motor Accident Claims Tribunal"',
  /** Delhi tribunal death awards. */
  delhi_mact_death: '"loss of dependency" ANDD "Motor Accident Claims Tribunal"',
  /** Delhi tribunal injury awards with a disability finding. */
  delhi_mact_injury: '"functional disability" ANDD "Motor Accident Claims Tribunal"',
} as const;
