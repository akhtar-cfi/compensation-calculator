import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "../../src/rules/load.js";
import { COMPONENTS, renderDesignDoc } from "../../web/src/design/catalog.js";

describe("UI design system document", () => {
  it("is the catalogue, word for word (run npm run web:design-doc after changing it)", () => {
    expect(readFileSync(join(REPO_ROOT, "docs", "ui-design-system.md"), "utf8")).toBe(renderDesignDoc());
  });

  it("says, for every component, where it lives, when to use it and when not", () => {
    for (const c of COMPONENTS) {
      expect(c.use.length, c.name).toBeGreaterThan(5);
      expect(c.avoid.length, c.name).toBeGreaterThan(0);
      const file = c.file.split(" ")[0]!;
      expect(() => readFileSync(join(REPO_ROOT, "web", "src", file)), `${c.name}: ${file}`).not.toThrow();
    }
  });
});
