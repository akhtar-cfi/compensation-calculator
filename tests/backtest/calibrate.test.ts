import { describe, expect, it } from "vitest";
import {
  MIN_BAND_N,
  calibrate,
  quantile,
  renderCalibration,
  type InjuryHeadsRow,
} from "../../src/backtest/calibrate.js";
import { testRules } from "../helpers.js";

const bands = testRules().injuryBands;
const row = (i: number, r: Partial<InjuryHeadsRow>): InjuryHeadsRow => ({
  id: `r${i}`,
  source_url: `https://indiankanoon.org/doc/${i}/`,
  ...r,
});

describe("quantile", () => {
  it("interpolates linearly", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([4, 1, 3, 2], 0.5)).toBe(2.5);
    expect(quantile([10, 20], 0.25)).toBe(12.5);
  });
});

describe("injury band calibration", () => {
  const amounts = [40000, 50000, 60000, 70000, 80000];
  const rows = [
    ...amounts.map((v, i) =>
      row(i, { functional_pct: 15, non_pecuniary: v, hospital_days: 3, conveyance_diet: 10000 }),
    ),
    row(9, { functional_pct: 60, non_pecuniary: 900000 }),
    row(10, { certificate_basis: "limb", certificate_pct: 40, functional_pct: 10 }),
  ];
  const c = calibrate(bands, rows);

  it("fits p25 / median / p75 in a band with enough awards", () => {
    const band = c.painSufferingAmenities.find((b) => b.from === 10)!;
    expect(band.n).toBe(5);
    expect(band.observed).toEqual({ conservative: 50000, standard: 60000, claimant_max: 70000 });
  });

  it("keeps the current values when a band is thin", () => {
    const band = c.painSufferingAmenities.find((b) => b.from === 50)!;
    expect(band.n).toBeLessThan(MIN_BAND_N);
    expect(band.observed).toBeUndefined();
    expect(c.limbToFunctional.n).toBe(1);
    expect(c.limbToFunctional.observed).toBeUndefined();
  });

  it("bands are half-open: a value on a boundary belongs to the upper band", () => {
    const at10 = calibrate(bands, [row(1, { functional_pct: 10, non_pecuniary: 1 })]);
    expect(at10.painSufferingAmenities.find((b) => b.from === 10)!.n).toBe(1);
    expect(at10.painSufferingAmenities.find((b) => b.from === 0)!.n).toBe(0);
  });

  it("renders a table per head", () => {
    const md = renderCalibration(c);
    expect(md).toContain("Pain, suffering, amenities");
    expect(md).toContain("keep current");
  });
});
