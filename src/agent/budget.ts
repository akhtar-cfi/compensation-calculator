import { BudgetExceededError, type PaidCall } from "../ingest/indiankanoon.js";
import type { Row } from "./store.js";

/** The daily cap on Indian Kanoon spend, in rupees, unless a run is given another. */
export const DEFAULT_DAILY_CAP_RUPEES = 30;

const IST_OFFSET_MS = 330 * 60_000; // UTC+5:30, no daylight saving

/** The calendar day in India (Asia/Kolkata) at a given instant, as YYYY-MM-DD. */
export function ISTDay(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The part of the store the budget uses; `Store` satisfies it. */
export interface SpendLedger {
  rpc<T = unknown>(fn: string, args?: Row): Promise<T>;
  insert(table: string, rows: readonly Row[]): Promise<void>;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * A daily rupee cap on Indian Kanoon calls that trusts the database, not memory: before every paid
 * call it reads today's recorded spend (ik_spend_today, Asia/Kolkata), and after it records the call
 * in ik_calls. A second process on the same day therefore sees the first one's spend.
 * Pass `guard` and `record` to IndianKanoonClient as beforePaidCall and onPaidCall.
 */
export class DailyBudget {
  constructor(
    private readonly store: SpendLedger,
    readonly capRupees: number = DEFAULT_DAILY_CAP_RUPEES,
    private readonly runId?: string,
  ) {}

  /** Rupees spent on Indian Kanoon so far today (IST), as recorded in the database. */
  async spentToday(): Promise<number> {
    return round2(Number((await this.store.rpc<number | string | null>("ik_spend_today")) ?? 0));
  }

  /** Rupees left under today's cap (never negative). */
  async remaining(): Promise<number> {
    return Math.max(0, round2(this.capRupees - (await this.spentToday())));
  }

  /** Refuses a call that would take today's recorded spend past the cap. */
  readonly guard = async (e: PaidCall): Promise<void> => {
    const spent = await this.spentToday();
    if (spent + e.cost > this.capRupees + 1e-9)
      throw new BudgetExceededError(
        `Daily cap of Rs ${this.capRupees} reached (Rs ${spent} spent today, IST); not calling ${e.endpoint}`,
      );
  };

  /** Records a paid call in ik_calls. */
  readonly record = async (e: PaidCall): Promise<void> => {
    await this.store.insert("ik_calls", [
      { endpoint: e.endpoint, path: e.path, cost: e.cost, run_id: this.runId ?? null },
    ]);
  };
}
