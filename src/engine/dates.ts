/** Pure ISO-date helpers (YYYY-MM-DD). The engine never reads the clock. */
export type ISODate = string;

function parts(iso: ISODate): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid ISO date: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Days since 1970-01-01 (proleptic Gregorian), H. Hinnant's days_from_civil. */
export function daysFromCivil(iso: ISODate): number {
  const [y0, m, d] = parts(iso);
  const y = m <= 2 ? y0 - 1 : y0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

export function compareDates(a: ISODate, b: ISODate): number {
  return daysFromCivil(a) - daysFromCivil(b);
}

function pad(n: number, w = 2): string {
  return String(n).padStart(w, "0");
}

function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Same calendar day `n` years later (29 Feb -> 28 Feb in non-leap years). */
export function addYears(iso: ISODate, n: number): ISODate {
  const [y, m, d] = parts(iso);
  const ny = y + n;
  const nd = m === 2 && d === 29 && !isLeap(ny) ? 28 : d;
  return `${pad(ny, 4)}-${pad(m)}-${pad(nd)}`;
}

/** Number of completed `stepYears` periods from `base` up to and including `asOf` (0 if asOf < first step). */
export function completedSteps(base: ISODate, asOf: ISODate, stepYears: number): number {
  if (compareDates(asOf, base) < 0) return 0;
  let k = 0;
  while (compareDates(addYears(base, (k + 1) * stepYears), asOf) <= 0) k++;
  return k;
}

/** Whole months from a to b (b >= a). */
export function wholeMonthsBetween(a: ISODate, b: ISODate): number {
  const [ya, ma, da] = parts(a);
  const [yb, mb, db] = parts(b);
  let months = (yb - ya) * 12 + (mb - ma);
  if (db < da) months -= 1;
  return Math.max(0, months);
}

/** Indian financial year label (Apr-Mar) for a date, e.g. 2025-08-01 -> "2025-26". */
export function financialYear(iso: ISODate): string {
  const [y, m] = parts(iso);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${pad((start + 1) % 100)}`;
}
