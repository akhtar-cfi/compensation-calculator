// Bakes everything the page needs into web/src/generated/ at build time: the rules bundle, the case library and
// the public documents rendered to HTML. The page then makes no network requests at all.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";
import { loadCases } from "../../src/cases/load.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";
import { renderRulesReference } from "../../src/rules/reference.js";
import { pickStories } from "../src/stories.js";

const out = join(REPO_ROOT, "web", "src", "generated");
mkdirSync(out, { recursive: true });

const rules = loadRules();
// The page needs only each source's name, citation and link. The rule register and the authority register (bench,
// grade, holdings, later treatment) are shown in the rules reference (docs.json, fetched when opened), so they stay
// out of the first download.
const forPage: typeof rules = {
  ...rules,
  sources: rules.sources.map(({ id, title, kind, citation, url }) => ({ id, title, kind, citation, url })),
  register: { ...rules.register, rows: [] },
};
writeFileSync(join(out, "rules.json"), JSON.stringify(forPage));
const cases = loadCases();
writeFileSync(join(out, "cases.json"), JSON.stringify(cases));
// The start page's real stories on their own: a few kilobytes, not the whole library, on a family's first visit.
writeFileSync(join(out, "stories.json"), JSON.stringify(pickStories(cases)));

// Links between the docs become in-page routes; links out open in a new tab.
const ROUTES: Record<string, string> = {
  "methodology.md": "#/how",
  "rules-reference.md": "#/rules",
  "offer-study.md": "#/offer-study",
};
/**
 * Tables become responsive: each cell carries its column name (data-label), so on a phone a row stacks as a
 * labelled card (styles.css) and nothing scrolls sideways.
 */
function labelTables(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (_m, inner: string) => {
    const head = /<thead>([\s\S]*?)<\/thead>/.exec(inner)?.[1] ?? "";
    const labels = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
      m[1]!
        .replace(/<[^>]+>/g, "")
        .replace(/"/g, "&quot;")
        .trim(),
    );
    const body = inner.replace(/<tr>([\s\S]*?)<\/tr>/g, (row: string, cells: string) => {
      if (cells.includes("<th")) return row;
      let i = 0;
      return `<tr>${cells.replace(/<td(\s[^>]*)?>/g, (_t, attrs = "") => `<td${attrs} data-label="${labels[i++] ?? ""}">`)}</tr>`;
    });
    return `<table>${body}</table>`;
  });
}

function render(md: string): string {
  const html = labelTables(marked.parse(md, { async: false }));
  return html
    .replace(/href="([^"#]+\.md)(#[^"]*)?"/g, (m, file: string) =>
      ROUTES[file] ? `href="${ROUTES[file]}"` : m,
    )
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
}
const doc = (f: string) => readFileSync(join(REPO_ROOT, "docs", f), "utf8");
writeFileSync(
  join(out, "docs.json"),
  JSON.stringify({
    rulesVersion: rules.version,
    methodology: render(doc("methodology.md")),
    // Rendered from the rule files directly, so the page is the same as the committed reference.
    rules: render(renderRulesReference(rules)),
    offerStudy: render(doc("offer-study.md")),
  }),
);
console.log(`web data written to ${out} (rules ${rules.version})`);
