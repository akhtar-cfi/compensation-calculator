import { describe, expect, it } from "vitest";
import { isLegacy, parseRoute, routeKey } from "../../web/src/route.js";

describe("addresses", () => {
  it("opens the start page by default, the ways of answering and the documents by name", () => {
    expect(parseRoute("")).toEqual({ name: "home" });
    expect(parseRoute("#/")).toEqual({ name: "home" });
    expect(parseRoute("#/choose")).toEqual({ name: "home", choose: true });
    expect(parseRoute("#/nonsense")).toEqual({ name: "home" });
    expect(parseRoute("#/how")).toEqual({ name: "doc", page: "how" });
    expect(parseRoute("#/rules")).toEqual({ name: "doc", page: "rules" });
    expect(parseRoute("#/design")).toEqual({ name: "design" });
  });

  it("opens each way of answering, and a place inside 'Take it slow'", () => {
    expect(parseRoute("#/all")).toEqual({ name: "mode", mode: "all" });
    expect(parseRoute("#/chat")).toEqual({ name: "mode", mode: "chat" });
    expect(parseRoute("#/detail")).toEqual({ name: "mode", mode: "detail" });
    expect(parseRoute("#/slow")).toEqual({ name: "mode", mode: "slow" });
    expect(parseRoute("#/slow/work")).toEqual({ name: "mode", mode: "slow", place: "work" });
    expect(parseRoute("#/slow/more/medical")).toEqual({ name: "mode", mode: "slow", place: "more/medical" });
  });

  it("gives each page change its own key (each question of 'Take it slow' counts as one)", () => {
    expect(routeKey({ name: "home" })).toBe("home");
    expect(routeKey({ name: "home", choose: true })).toBe("home");
    expect(routeKey({ name: "mode", mode: "all" })).toBe("all");
    expect(routeKey({ name: "mode", mode: "chat" })).toBe("chat");
    expect(routeKey({ name: "mode", mode: "slow", place: "work" })).toBe("slow/work");
    expect(routeKey({ name: "doc", page: "how" })).toBe("how");
  });

  it("reads an in-page anchor as no change of page", () => {
    expect(parseRoute("#main")).toBeUndefined();
    expect(parseRoute("#offer")).toBeUndefined();
  });

  it("opens older addresses (one page per question) at the matching place on the one-page calculator", () => {
    expect(parseRoute("#/q/age")).toEqual({ name: "mode", mode: "all", target: "age" });
    expect(parseRoute("#/q/role?from=check")).toEqual({ name: "mode", mode: "all", target: "victimRole" });
    expect(parseRoute("#/stop/unidentified")).toEqual({ name: "mode", mode: "all", target: "vehicleTraced" });
    expect(parseRoute("#/q/vehicle")).toEqual({ name: "mode", mode: "all", target: "vehicleTraced" });
    expect(parseRoute("#/q/nonsense")).toEqual({ name: "mode", mode: "all" });
    expect(parseRoute("#/result")).toEqual({ name: "mode", mode: "all", target: "result" });
    expect(parseRoute("#/offer")).toEqual({ name: "mode", mode: "all", target: "offer" });
    expect(parseRoute("#/check")).toEqual({ name: "mode", mode: "all" });
    expect(parseRoute("#/estimate")).toEqual({ name: "mode", mode: "all" });
    for (const h of ["#/q/age", "#/check", "#/stop/owner_driver", "#/estimate", "#/result", "#/offer"])
      expect(isLegacy(h), h).toBe(true);
    for (const h of ["#/", "#/how", "#main", "#/offer-study", "#/all", "#/slow/work"])
      expect(isLegacy(h), h).toBe(false);
  });

  it("starts from a situation card's link, ready to share", () => {
    expect(parseRoute("#/start/homemaker")).toEqual({ name: "home", start: "homemaker" });
    expect(parseRoute("#/start/hit-and-run")).toEqual({ name: "home", start: "hit-and-run" });
    expect(parseRoute("#/start/offer")).toEqual({ name: "home", start: "offer" });
    expect(parseRoute("#/start/nonsense")).toEqual({ name: "home" });
    expect(parseRoute("#/example/hurt")).toEqual({ name: "home", example: "hurt" });
    // Only a card with a worked example has an example link.
    expect(parseRoute("#/example/offer")).toEqual({ name: "home" });
    expect(parseRoute("#/example/nonsense")).toEqual({ name: "home" });
    for (const h of ["#/start/hurt", "#/example/hurt"]) expect(isLegacy(h), h).toBe(false);
  });
});
