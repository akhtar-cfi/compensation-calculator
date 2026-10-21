// Writes docs/ui-design-system.md from the design catalogue (web/src/design/catalog.ts).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../../src/rules/load.js";
import { renderDesignDoc } from "../src/design/catalog.js";

const path = join(REPO_ROOT, "docs", "ui-design-system.md");
writeFileSync(path, renderDesignDoc());
console.log(`written ${path}`);
