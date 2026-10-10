import { readFileSync } from "node:fs";
import { z } from "zod";
import { formatINR } from "../engine/money.js";
import type { InjuryBands } from "../rules/schema.js";
import { parseCsv } from "./csv.js";

const num = z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().optional());

/** Per-head amounts from one injury award (data/backtest/injury_heads.csv). Rupees, before any negligence cut. */
export const InjuryHeadsRowSchema = z.object({
  id: z.string().min(1),
  source_url: z.url(),
  functional_pct: num,
  certificate_pct: num,
  certificate_basis: z.string().optional(),
  hospital_days: num,
  age: num,
  married: z.string().optional(),
  non_pecuniary: num, // pain and suffering + loss of amenities + disfigurement
  conveyance_diet: num,
  attendant: num,
  medical: num,
  loss_of_income_treatment: num,
  future_medical: num,
  marriage_prospects: num,
  earning_capacity: num,
  awarded_total: num,
});
export type InjuryHeadsRow = z.infer<typeof InjuryHeadsRowSchema>;

export function loadInjuryHeads(path: string): InjuryHeadsRow[] {
  return parseCsv(readFileSync(path, "utf8")).map((r) => InjuryHeadsRowSchema.parse(r));
}

/** Linear-interpolated quantile (q in 0..1) of a non-empty list. */
export function quantile(xs: readonly number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** A band is recalibrated only when it holds at least this many awards; otherwise the current values stay. */
export const MIN_BAND_N = 5;

export interface BandFit {
  from: number;
  to?: number;
  n: number;
  current: { conservative: number; standard: number; claimant_max: number };
  /** 25th percentile / median / 75th percentile of what tribunals awarded, rounded to Rs 1,000. */
  observed?: { conservative: number; standard: number; claimant_max: number };
}

export interface Calibration {
  rows: number;
  painSufferingAmenities: BandFit[];
  conveyanceDiet: BandFit[];
  /** All awards, whatever the hospital stay: used when the stay (or attendant days) is not known. */
  overall: {
    conveyanceDiet: { n: number; observed?: BandFit["observed"] };
    attendant: { n: number; observed?: BandFit["observed"] };
  };
  /** Functional % the tribunal used ÷ the certificate %, where the certificate is for a limb. */
  limbToFunctional: { n: number; current: InjuryBands["limb_to_functional"]; observed?: BandFit["observed"] };
}

const round1000 = (x: number) => Math.round(x / 1000) * 1000;
const fit = (xs: number[], round: (x: number) => number) =>
  xs.length >= MIN_BAND_N
    ? {
        conservative: round(quantile(xs, 0.25)),
        standard: round(quantile(xs, 0.5)),
        claimant_max: round(quantile(xs, 0.75)),
      }
    : undefined;

function bands<T extends { conservative: number; standard: number; claimant_max: number }>(
  current: readonly T[],
  lower: (b: T) => number,
  rows: readonly InjuryHeadsRow[],
  key: (r: InjuryHeadsRow) => number | undefined,
  value: (r: InjuryHeadsRow) => number | undefined,
): BandFit[] {
  return current.map((b, i) => {
    const from = lower(b);
    const to = current[i + 1] ? lower(current[i + 1]!) : undefined;
    const xs = rows.flatMap((r) => {
      const k = key(r);
      const v = value(r);
      return k !== undefined && v !== undefined && k >= from && (to === undefined || k < to) ? [v] : [];
    });
    const observed = fit(xs, round1000);
    return {
      from,
      ...(to !== undefined && { to }),
      n: xs.length,
      current: { conservative: b.conservative, standard: b.standard, claimant_max: b.claimant_max },
      ...(observed && { observed }),
    };
  });
}

/** Compares the experimental injury bands with what tribunals actually awarded, band by band. */
export function calibrate(current: InjuryBands, rows: readonly InjuryHeadsRow[]): Calibration {
  const ratios = rows.flatMap((r) =>
    r.certificate_basis === "limb" && r.certificate_pct && r.functional_pct !== undefined
      ? [r.functional_pct / r.certificate_pct]
      : [],
  );
  const observedRatio = fit(ratios, (x) => Math.round(x * 100) / 100);
  const all = (v: (r: InjuryHeadsRow) => number | undefined) => {
    const xs = rows.flatMap((r) => (v(r) !== undefined ? [v(r)!] : []));
    const observed = fit(xs, round1000);
    return { n: xs.length, ...(observed && { observed }) };
  };
  return {
    rows: rows.length,
    painSufferingAmenities: bands(
      current.pain_suffering_amenities,
      (b) => b.from_pct,
      rows,
      (r) => r.functional_pct,
      (r) => r.non_pecuniary,
    ),
    conveyanceDiet: bands(
      current.conveyance_special_diet,
      (b) => b.from_days,
      rows,
      (r) => r.hospital_days,
      (r) => r.conveyance_diet,
    ),
    overall: { conveyanceDiet: all((r) => r.conveyance_diet), attendant: all((r) => r.attendant) },
    limbToFunctional: {
      n: ratios.length,
      current: current.limb_to_functional,
      ...(observedRatio && { observed: observedRatio }),
    },
  };
}

const triple = (t: BandFit["current"] | undefined, f: (x: number) => string) =>
  t ? `${f(t.conservative)} / ${f(t.standard)} / ${f(t.claimant_max)}` : "–";

export function renderCalibration(c: Calibration): string {
  const table = (title: string, unit: string, fits: readonly BandFit[]) => [
    `### ${title}`,
    "",
    `| ${unit} | n | current (C / L / M) | tribunals (p25 / median / p75) |`,
    "|---|---|---|---|",
    ...fits.map(
      (b) =>
        `| ${b.from}${b.to !== undefined ? `–${b.to - 1}` : "+"} | ${b.n} | ${triple(b.current, formatINR)} | ${b.observed ? triple(b.observed, formatINR) : `n < ${MIN_BAND_N}: keep current`} |`,
    ),
    "",
  ];
  const r = c.limbToFunctional;
  return [
    "# Injury band calibration",
    "",
    `_${c.rows} injury award(s) with per-head amounts. Delhi tribunal awards only; bands with fewer than ${MIN_BAND_N} awards keep their current values._`,
    "",
    ...table(
      "Pain, suffering, amenities and disfigurement, by functional disability %",
      "Functional %",
      c.painSufferingAmenities,
    ),
    ...table("Conveyance and special diet, by days in hospital", "Days", c.conveyanceDiet),
    "### When the hospital stay or attendant days are not known (all awards)",
    "",
    `- Conveyance and special diet: n = ${c.overall.conveyanceDiet.n}; tribunals ${triple(c.overall.conveyanceDiet.observed, formatINR)}`,
    `- Attendant during treatment: n = ${c.overall.attendant.n}; tribunals ${triple(c.overall.attendant.observed, formatINR)}`,
    "",
    "### Limb certificate → functional disability factor",
    "",
    `n = ${r.n}; current ${triple(r.current, String)}; tribunals ${r.observed ? triple(r.observed, String) : `n < ${MIN_BAND_N}`}`,
  ].join("\n");
}
