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
// Every other file, fetched only when needed (each way of answering, the result sections, documents, cases, Hindi).
const later = readdirSync(join(dist, "assets"))
  .filter((f) => f.endsWith(".js") && join("assets", f) !== entry)
  .map((f) => ({ f, size: kb(join("assets", f)) }))
  .sort((a, b) => b.size - a.size);
console.log(
  `later (gzip): ${later.map((x) => `${x.f.replace(/-[\w-]+\.js$/, "")} ${x.size.toFixed(1)}`).join(", ")}`,
);
if (js > BUDGET_KB.js || styles > BUDGET_KB.css) {
  console.error("over budget: lazy-load what the first page does not need");
  process.exit(1);
}
// The ways of answering must stay out of the first download: their marks must not be in the entry file.
const code = readFileSync(join(dist, entry), "utf8");
const leaked = ["data-question", "data-slow", "data-chat-current", "data-param"].filter((m) =>
  code.includes(m),
);
if (leaked.length) {
  console.error(`the first download carries a way of answering (${leaked.join(", ")}): import it lazily`);
  process.exit(1);
}
