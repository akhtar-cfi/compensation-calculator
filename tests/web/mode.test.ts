import { describe, expect, it } from "vitest";
import { isMode, MODES, modeHref, parseStoredMode } from "../../web/src/mode.js";

describe("the four ways of answering", () => {
  it("are, in the order offered: take it slow, talk it through, see it all, full detail", () => {
    expect(MODES).toEqual(["slow", "chat", "all", "detail"]);
  });

  it("each have their own address", () => {
    expect(MODES.map(modeHref)).toEqual(["#/slow", "#/chat", "#/all", "#/detail"]);
  });

  it("recognise only their own names, including what this phone remembers", () => {
    expect(MODES.every(isMode)).toBe(true);
    for (const x of ["", "fast", "ALL", null, undefined, 3]) expect(isMode(x)).toBe(false);
    expect(parseStoredMode("chat")).toBe("chat");
    expect(parseStoredMode(null)).toBeUndefined();
    expect(parseStoredMode('{"mode":"chat"}')).toBeUndefined();
  });
});
