import { loadRules } from "../src/rules/load.js";
import type { MinimumWageState, RulesBundle } from "../src/rules/schema.js";

/**
 * A FICTIONAL minimum-wage schedule ("TS" = test state) so engine tests do not change when real wage data is
 * updated. Real state data lives in sources/minimum-wages/ and is validated separately.
 */
export const TEST_STATE: MinimumWageState = {
  code: "TS",
  name: "Test State (fictional)",
  official_sources: [],
  revision_pattern: "test",
  zones: ["All"],
  days_per_month: 26,
  gaps: [],
  revisions: [
    {
      effective_from: "2019-04-01",
      unit: "month",
      rates: { All: { unskilled: 10000, semi_skilled: 11000, skilled: 12000, highly_skilled: 13000 } },
      notification: { url: "https://example.org/fictional-test-schedule" },
      confidence: "official",
      verified_by: [],
    },
    {
      effective_from: "2025-04-01",
      unit: "month",
      rates: { All: { unskilled: 18000, semi_skilled: 20000, skilled: 22000, highly_skilled: 24000 } },
      notification: { url: "https://example.org/fictional-test-schedule" },
      confidence: "official",
      verified_by: [],
    },
  ],
};

let cached: RulesBundle | undefined;
export function testRules(): RulesBundle {
  cached ??= loadRules();
  return { ...cached, minimumWages: { ...cached.minimumWages, TS: TEST_STATE } };
}
