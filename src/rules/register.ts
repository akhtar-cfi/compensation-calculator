import { DECISION_RULE } from "./hierarchy.js";
import type { RegisterRow, RulesBundle, Source } from "./schema.js";
import { REVIEW_IDS } from "./schema.js";

/** The rule register and the authority register, as sections of the public rules page (docs/rules-reference.md). */

export const TYPE_LABEL: Record<RegisterRow["type"], string> = {
  fixed: "Fixed law",
  fact: "Depends on the facts",
  conflict: "Law split or open",
  practice: "Estimate from awards",
  withheld: "Withheld",
};

const TYPE_MEANING: Record<RegisterRow["type"], string> = {
  fixed: "settled law: one value, the same everywhere, cited.",
  fact: "depends on evidence the family has: asked, or assumed and said so, or left out.",
  conflict:
    "the judgments are split or silent: a provisional rule and its alternative, each with its judgment (flagged below).",
  practice: "an estimate from tribunal awards; never presented as law.",
  withheld: "not computed automatically until its legal basis is settled.",
};

export const STATUS_LABEL: Record<RegisterRow["review"][number]["status"], string> = {
  approve: "Approve",
  conditional: "Conditional",
  hold: "Hold",
  not_stated: "Not stated",
};

const SECTION_LABEL: Record<RegisterRow["section"], string> = {
  income: "Income",
  formula: "The formula",
  injury: "Injury",
  deductions: "Deductions",
  claim: "The claim",
  presentation: "How the result is shown",
  data: "Data",
};

export interface ReviewEntry {
  id: string;
  status: RegisterRow["review"][number]["status"];
  done: boolean;
  row: RegisterRow;
}

/** Every item of the legal review, in review order, with the step it sits under. */
export function reviewIndex(rules: RulesBundle): ReviewEntry[] {
  const byId = new Map<string, ReviewEntry>();
  for (const row of rules.register.rows)
    for (const v of row.review) if (!byId.has(v.id)) byId.set(v.id, { ...v, row });
  return REVIEW_IDS.flatMap((id) => {
    const e = byId.get(id);
    return e ? [e] : [];
  });
}

const cell = (x: string) => x.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

/** "para 19", "paras 6-13"; a statute reference ("s.164B(5)") stays as it is. */
export function paraLabel(para: string): string {
  if (/^ss?\./.test(para)) return para;
  return `${/[\d)]\s*(?:-|,|\band\b)\s*[\d(]/.test(para) ? "paras" : "para"} ${para}`;
}

function sourceLink(s: Source | undefined, id: string): string {
  if (!s) return id;
  return s.url ? `[${s.title}](${s.url})` : s.title;
}

/** "SC, 3 judges", "Delhi High Court, 1 judge", with the grade. */
export function standing(s: Source): string {
  const court = !s.court
    ? (s.kind ?? "")
    : s.court === "SC"
      ? "Supreme Court"
      : s.court.startsWith("HC:")
        ? `High Court (${s.court.slice(3)})`
        : s.court.startsWith("MACT:")
          ? `Tribunal (${s.court.slice(5)})`
          : s.court;
  const bench = s.bench ? `, ${s.bench} judge${s.bench === 1 ? "" : "s"}` : "";
  return `${court}${bench}`;
}

export function renderRegister(rules: RulesBundle): string[] {
  const reg = rules.register;
  const src = new Map(rules.sources.map((s) => [s.id, s]));
  const L: string[] = [
    "## How the estimate is decided",
    "",
    reg.description,
    "",
    `Decisions: ${reg.review.title}, received ${reg.review.received}. _Approve_ means the method may be adopted,`,
    "_Conditional_ that it may be adopted after the check named, _Hold_ that the calculator must not use the current",
    "automatic rule until its legal basis is settled. _Built_ says whether the calculator already does what the",
    "decision says.",
    "",
    "Each step is one of five kinds:",
    "",
    ...(Object.keys(TYPE_LABEL) as RegisterRow["type"][]).map(
      (t) => `- **${TYPE_LABEL[t]}**: ${TYPE_MEANING[t]}`,
    ),
    "",
    "### Which judgment governs",
    "",
    "When judgments on a point differ, this fixed order decides which one the calculator follows:",
    "",
    ...DECISION_RULE.map((r, i) => `${i + 1}. ${r}`),
    "",
    "Tribunal awards are used only to estimate practice, and are labelled so; they never set a rule.",
    "",
  ];

  const flagged = reg.rows.flatMap((row) => row.flagged.map((f) => ({ ...f, row })));
  L.push(
    "### Points with no binding rule",
    "",
    `${flagged.length} points are not settled by a binding judgment. Each shows a provisional rule and, where the law`,
    "allows two readings, the alternative, until a larger bench, the legislature or the advocate settles it. A",
    "High Court's ruling on one of them binds the tribunals in its own state.",
    "",
    ...flagged.map((f) => `- **${f.review} · ${f.row.step}.** ${cell(f.point)}`),
    "",
  );

  for (const section of Object.keys(SECTION_LABEL) as RegisterRow["section"][]) {
    const rows = reg.rows.filter((r) => r.section === section);
    if (!rows.length) continue;
    L.push(`### ${SECTION_LABEL[section]}`, "");
    for (const r of rows) {
      L.push(`#### ${r.step}`, "");
      L.push(`- **Kind:** ${TYPE_LABEL[r.type]}${r.kinds.length === 1 ? ` (${r.kinds[0]} only)` : ""}`);
      L.push(`- **Now:** ${cell(r.now)}`);
      if (r.decided) L.push(`- **Decided:** ${cell(r.decided)}`);
      if (r.review.length)
        L.push(
          `- **Legal review:** ${r.review
            .map((v) => `${v.id} ${STATUS_LABEL[v.status]}${v.done ? " (built)" : ""}`)
            .join("; ")}`,
        );
      if (r.authorities.length)
        L.push(
          `- **Authorities:** ${r.authorities
            .map((a) => `${sourceLink(src.get(a.source), a.source)}${a.para ? `, ${paraLabel(a.para)}` : ""}`)
            .join("; ")}`,
        );
      if (r.points.length) L.push(`- **Contested points:** ${r.points.map((p) => `\`${p}\``).join(", ")}`);
      L.push("");
    }
  }

  const items = reviewIndex(rules);
  const count = (s: ReviewEntry["status"]) => items.filter((e) => e.status === s).length;
  L.push(
    "### Every item of the legal review",
    "",
    `${items.length} items: ${(["approve", "conditional", "hold", "not_stated"] as const)
      .map((s) => `${count(s)} ${STATUS_LABEL[s]}`)
      .join(", ")}. Built: ${items.filter((e) => e.done).length} of ${items.length}.`,
    "",
    "| Item | Decision | Built | Step |",
    "|---|---|---|---|",
    ...items.map(
      (e) => `| ${e.id} | ${STATUS_LABEL[e.status]} | ${e.done ? "yes" : "no"} | ${cell(e.row.step)} |`,
    ),
    "",
  );

  const changes = reg.rows
    .flatMap((row) => row.changes.map((c) => ({ ...c, row })))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  L.push("### Changes", "");
  L.push(
    ...(changes.length
      ? changes.map((c) => `- ${c.date} · ${c.row.step}: ${cell(c.what)}`)
      : ["None recorded yet."]),
    "",
  );
  return L;
}

/** What each authority is relied on for (legal review B-13), for the sources that record it. */
export function renderAuthorities(rules: RulesBundle): string[] {
  const L: string[] = [
    "## What each authority is relied on for",
    "",
    "For each judgment: its court and bench, the holding the calculator relies on with its paragraph, the facts that",
    "limit it, and how later judgments treated it. _Ratio_ marks a binding holding, _applied_ an amount fixed on the",
    "case's own facts (a comparator, not a rule); where neither is marked, the advocate has yet to class it.",
    "Grade P: read in the original; S: known only from a summary or report.",
    "",
  ];
  for (const s of rules.sources) {
    if (!s.propositions?.length && !s.treatment) continue;
    L.push(
      `### ${s.url ? `[${s.title}](${s.url})` : s.title}`,
      "",
      `${[
        standing(s),
        s.citation,
        s.date,
        s.grade ? `grade ${s.grade}` : undefined,
        s.reportable === false ? "non-reportable" : undefined,
      ]
        .filter(Boolean)
        .join(" · ")}`,
      "",
    );
    for (const p of s.propositions ?? []) {
      const tag = [p.para ? paraLabel(p.para) : undefined, p.weight].filter(Boolean).join(" · ");
      L.push(
        `- ${tag ? `**${tag}:** ` : ""}${cell(p.holding)}${p.limits ? ` _Limits:_ ${cell(p.limits)}` : ""}`,
      );
    }
    if (s.treatment) L.push(`- _Later treatment:_ ${cell(s.treatment)}`);
    L.push("");
  }
  return L;
}
