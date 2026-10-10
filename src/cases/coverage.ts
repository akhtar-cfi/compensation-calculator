import { Archetype, type Case } from "./schema.js";

/** Number of cases per archetype, including archetypes with none (the library's gaps). */
export function archetypeCoverage(cases: readonly Case[]): { archetype: Archetype; count: number }[] {
  return Archetype.options.map((archetype) => ({
    archetype,
    count: cases.filter((c) => c.archetypes.includes(archetype)).length,
  }));
}

export function renderCoverage(cases: readonly Case[]): string {
  const rows = archetypeCoverage(cases);
  const empty = rows.filter((r) => r.count === 0).map((r) => r.archetype);
  return [
    `# Case library coverage: ${cases.length} cases`,
    "",
    "| Archetype | Cases |",
    "|---|---:|",
    ...rows.map((r) => `| ${r.archetype} | ${r.count} |`),
    "",
    empty.length ? `No case yet: ${empty.join(", ")}.` : "Every archetype has at least one case.",
  ].join("\n");
}
