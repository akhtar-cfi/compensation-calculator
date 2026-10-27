/**
 * Judgment HTML to plain text, ported from the back-test's html2txt.py: block tags start a new line,
 * table cells are joined with " | ", script and style are dropped, entities are decoded and runs of
 * blank lines collapse to one. Spacing inside lines is kept, so <pre> award tables stay aligned.
 * This text is what extractions quote and what the verifier checks them against.
 */
const BLOCK = new Set([
  "p",
  "br",
  "div",
  "tr",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
]);
const CELL = new Set(["td", "th"]);
const SKIP = new Set(["script", "style"]);

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  bull: "•",
  middot: "·",
  sect: "§",
  para: "¶",
  deg: "°",
  times: "×",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  copy: "©",
  reg: "®",
};

/** Decodes named (common) and numeric character references. Unknown names are left as written. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e: string) => {
    if (e[0] !== "#") return NAMED[e.toLowerCase()] ?? m;
    const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
}

/** Plain text of a judgment's HTML. */
export function judgmentText(html: string): string {
  const out: string[] = [];
  let skip = 0;
  let cellInRow = false;
  const token = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|<[!?][^>]*>|[^<]+|</g;
  for (const m of html.matchAll(token)) {
    const [whole, close, rawTag] = m;
    if (rawTag === undefined) {
      if (!whole.startsWith("<") || whole === "<") {
        if (!skip) out.push(decodeEntities(whole));
      }
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (SKIP.has(tag)) {
      skip = Math.max(0, skip + (close ? -1 : 1));
      continue;
    }
    if (close || skip) continue;
    if (BLOCK.has(tag)) out.push("\n");
    if (tag === "tr") cellInRow = false;
    if (CELL.has(tag)) {
      if (cellInRow) out.push(" | ");
      cellInRow = true;
    }
  }
  return out
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

/** One-line text of a short HTML fragment, such as a title with <b> highlights. */
export const inlineText = (html: string): string => judgmentText(html).replace(/\s+/g, " ").trim();
