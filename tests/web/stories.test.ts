import { describe, expect, it } from "vitest";
import { loadCases } from "../../src/cases/load.js";
import { summariseJourney } from "../../src/cases/match.js";
import { STORY_IDS, pickStories } from "../../web/src/stories.js";

const cases = loadCases();

describe("the start page's real stories", () => {
  const stories = pickStories(cases);

  it("are all in the case library, in the order chosen", () => {
    expect(stories.map((c) => c.id)).toEqual([...STORY_IDS]);
  });

  it("each tell the whole journey: the accident, every step's amount, and the years it took", () => {
    for (const c of stories) {
      expect(c.facts.accident_date, c.id).toBeDefined();
      expect(c.journey.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.journey.at(-1)!.date, c.id).toBeDefined();
      expect(summariseJourney(c).years, c.id).toBeGreaterThan(0);
    }
  });

  it("are short enough to show in full on a phone", () => {
    for (const c of stories) expect(c.summary.split(/\s+/).length, c.id).toBeLessThanOrEqual(80);
  });

  it("cover a death and an injury, and a family that refused an insurer's offer", () => {
    expect(new Set(stories.map((c) => c.kind))).toEqual(new Set(["death", "injury"]));
    expect(stories.some((c) => c.journey.some((s) => s.forum === "insurer_offer"))).toBe(true);
  });

  it("leave out a case that is no longer in the library", () => {
    expect(pickStories(cases.filter((c) => c.id !== STORY_IDS[0])).map((c) => c.id)).toEqual(
      STORY_IDS.slice(1),
    );
  });
});
