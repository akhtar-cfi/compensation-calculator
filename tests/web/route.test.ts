import { describe, expect, it } from "vitest";
import { isLegacy, parseRoute } from "../../web/src/route.js";

describe("addresses", () => {
  it("opens the calculator by default and the documents by name", () => {
    expect(parseRoute("")).toEqual({ name: "calc" });
    expect(parseRoute("#/")).toEqual({ name: "calc" });
    expect(parseRoute("#/how")).toEqual({ name: "doc", page: "how" });
    expect(parseRoute("#/rules")).toEqual({ name: "doc", page: "rules" });
    expect(parseRoute("#/design")).toEqual({ name: "design" });
  });

  it("reads an in-page anchor as no change of page", () => {
    expect(parseRoute("#main")).toBeUndefined();
    expect(parseRoute("#offer")).toBeUndefined();
  });

  it("opens older addresses (one page per question) at the matching place on the calculator", () => {
    expect(parseRoute("#/q/age")).toEqual({ name: "calc", target: "age" });
    expect(parseRoute("#/q/role?from=check")).toEqual({ name: "calc", target: "victimRole" });
    expect(parseRoute("#/stop/unidentified")).toEqual({ name: "calc", target: "vehicleTraced" });
    expect(parseRoute("#/q/vehicle")).toEqual({ name: "calc", target: "vehicleTraced" });
    expect(parseRoute("#/q/nonsense")).toEqual({ name: "calc" });
    expect(parseRoute("#/result")).toEqual({ name: "calc", target: "result" });
    expect(parseRoute("#/offer")).toEqual({ name: "calc", target: "offer" });
    expect(parseRoute("#/check")).toEqual({ name: "calc" });
    for (const h of ["#/q/age", "#/check", "#/stop/owner_driver", "#/estimate", "#/result", "#/offer"])
      expect(isLegacy(h), h).toBe(true);
    for (const h of ["#/", "#/how", "#main"]) expect(isLegacy(h), h).toBe(false);
  });
});
