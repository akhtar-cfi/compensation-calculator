import { describe, expect, it } from "vitest";
import { buildQuery } from "../../src/ingest/indiankanoon.js";
import { COURTS, TOPICS, nextSlot, pickSlot, rotationSlots, windows } from "../../src/agent/rotation.js";

const DAY = "2026-10-12";

describe("rotation", () => {
  it("is deterministic: the same day gives the same slots in the same order", () => {
    const a = rotationSlots(DAY);
    expect(rotationSlots(DAY)).toEqual(a);
    expect(new Set(a.map((s) => s.key)).size).toBe(a.length);
    // 6 three-year windows (2009-2011 .. 2024-2026) x 3 verified courts x 10 topics
    expect(a).toHaveLength(6 * 3 * TOPICS.length);
  });

  it("orders newest window first, then Supreme Court, High Courts, district courts, then topic", () => {
    const keys = rotationSlots(DAY).map((s) => s.key);
    expect(keys[0]).toBe("supremecourt/mact_appeal/2024-2026");
    expect(keys[1]).toBe("supremecourt/multiplier/2024-2026");
    expect(keys[10]).toBe("delhi/mact_appeal/2024-2026");
    expect(keys[20]).toBe("delhidc/mact_appeal/2024-2026");
    expect(keys[30]).toBe("supremecourt/mact_appeal/2021-2023");
    expect(keys.at(-1)).toBe("delhidc/legal_offer/2009-2011");
    expect(windows("2027-01-02")[0]).toEqual({ from: "2027-01-01", to: "2029-12-31", label: "2027-2029" });
  });

  it("rotates only verified courts; High Court doctypes start unverified", () => {
    expect(COURTS.filter((c) => c.verified).map((c) => c.doctype)).toEqual([
      "supremecourt",
      "delhi",
      "delhidc",
    ]);
    const doctypes = new Set(rotationSlots(DAY).map((s) => s.doctype));
    expect(doctypes.has("bombay")).toBe(false);
    const withBombay = COURTS.map((c) => (c.doctype === "bombay" ? { ...c, verified: true } : c));
    expect(rotationSlots(DAY, withBombay).some((s) => s.key === "bombay/consortium/2024-2026")).toBe(true);
  });

  it("builds each query with buildQuery and the slot's court and window", () => {
    const s = rotationSlots(DAY)[1]!;
    expect(s).toMatchObject({ state_code: "IN", court_level: "sc", from: "2024-01-01", to: "2026-12-31" });
    expect(s.query).toBe(
      buildQuery(TOPICS[1].terms, { doctypes: "supremecourt", from: "2024-01-01", to: "2026-12-31" }),
    );
    expect(s.query).toBe(
      '"multiplier" ANDD "Motor Accident Claims Tribunal" doctypes: supremecourt fromdate: 1-1-2024 todate: 31-12-2026',
    );
  });

  it("advances from the cursor and wraps around", () => {
    const slots = rotationSlots(DAY);
    expect(nextSlot(slots, undefined)).toBe(slots[0]);
    expect(nextSlot(slots, slots[0]!.key)).toBe(slots[1]);
    expect(nextSlot(slots, slots[41]!.key)).toBe(slots[42]);
    expect(nextSlot(slots, slots.at(-1)!.key)).toBe(slots[0]);
    // A cursor whose court no longer rotates continues where it would have sorted.
    expect(nextSlot(slots, "bombay/consortium/2024-2026").key).toBe("delhidc/mact_appeal/2024-2026");
    expect(nextSlot(slots, "nonsense").key).toBe(slots[0]!.key);
  });

  it("picks the next slot from the last run, retrying a slot that could not be searched", () => {
    const slots = rotationSlots(DAY);
    const run = (i: number, covered: boolean) => ({ slot: { key: slots[i]!.key, covered } });
    expect(pickSlot(slots, [])).toBe(slots[0]);
    expect(pickSlot(slots, [run(3, true), run(2, true)])).toBe(slots[4]);
    expect(pickSlot(slots, [{ slot: null }, run(3, true)])).toBe(slots[4]);
    expect(pickSlot(slots, [run(4, false), run(3, true)])).toBe(slots[4]);
    expect(pickSlot(slots, [run(4, false), run(4, false), run(4, false), run(3, true)])).toBe(slots[5]);
  });
});
