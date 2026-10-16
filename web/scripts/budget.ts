// Fails the build when the first download grows past its budget (gzipped), so a slow phone on a weak connection
// keeps getting the page quickly. Documents, cases and the design gallery load later and are not counted.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { REPO_ROOT } from "../../src/rules/load.js";

const BUDGET_KB = { js: 100, css: 10 };
const dist = join(REPO_ROOT, "web", "dist");
const html = readFileSync(join(dist, "index.html"), "utf8");
const entry = /<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"/.exec(html)?.[1];
const css = readdirSync(join(dist, "assets")).filter((f) => f.endsWith(".css"));
if (!entry) throw new Error("entry script not found in web/dist/index.html");
const kb = (f: string) => gzipSync(readFileSync(join(dist, f))).length / 1024;
const js = kb(entry);
const styles = css.reduce((s, f) => s + kb(join("assets", f)), 0);
console.log(
  `first download (gzip): JS ${js.toFixed(1)} kB of ${BUDGET_KB.js}, CSS ${styles.toFixed(1)} kB of ${BUDGET_KB.css}`,
);
if (js > BUDGET_KB.js || styles > BUDGET_KB.css) {
  console.error("over budget: lazy-load what the first page does not need");
  process.exit(1);
}
