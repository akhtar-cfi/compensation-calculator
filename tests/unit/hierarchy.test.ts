import { describe, expect, it } from "vitest";
import { compareAuthority, courtRank, governing } from "../../src/rules/hierarchy.js";

const sc = (id: string, bench: number, date: string) => ({ id, court: "SC", bench, date });

describe("which judgment governs (legal review, safeguard F)", () => {
  it("ranks the Supreme Court above the state's own High Court, and that above another High Court", () => {
    expect(courtRank("SC", "DL")).toBe(3);
    expect(courtRank("HC:DL", "DL")).toBe(2);
    expect(courtRank("HC:PH", "DL")).toBe(1);
    expect(courtRank("MACT:DL", "DL")).toBe(0);
    expect(courtRank(undefined)).toBe(0);
  });

  it("lets a larger bench govern a newer, smaller one (Reshma Kumari, 3 judges, over Kajal, 2 judges)", () => {
    const reshma = sc("reshma_kumari_2013", 3, "2013-04-02");
    const kajal = sc("kajal_2020", 2, "2020-02-05");
    expect(compareAuthority(reshma, kajal)).toBeGreaterThan(0);
    expect(governing([kajal, reshma]).governs?.id).toBe("reshma_kumari_2013");
  });

  it("lets a Constitution Bench govern everything below it", () => {
    const pranay = sc("pranay_sethi_2017", 5, "2017-10-31");
    expect(
      governing([sc("sarla_verma_2009", 2, "2009-04-15"), pranay, sc("x", 3, "2020-01-01")]).governs?.id,
    ).toBe("pranay_sethi_2017");
  });

  it("never chooses between two equal benches by date: that is a conflict for a lawyer", () => {
    const a = sc("kajal_2020", 2, "2020-02-05");
    const b = sc("divya_2022", 2, "2022-11-10");
    const g = governing([a, b]);
    expect(g.governs).toBeUndefined();
    expect(g.tied.map((x) => x.id).sort()).toEqual(["divya_2022", "kajal_2020"]);
  });

  it("binds a state's tribunals by its own High Court only; another High Court does not govern", () => {
    const dl = { id: "dl", court: "HC:DL", bench: 1 };
    const ph = { id: "ph", court: "HC:PH", bench: 2 };
    expect(governing([dl, ph], "DL").governs?.id).toBe("dl");
    expect(governing([ph], "DL")).toEqual({ tied: [] });
    expect(governing([dl, sc("s", 2, "2024-01-01")], "DL").governs?.id).toBe("s");
  });

  it("finds nothing binding among tribunal awards", () => {
    expect(governing([{ id: "award", court: "MACT:DL" }], "DL")).toEqual({ tied: [] });
  });
});
