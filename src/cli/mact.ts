#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { loadAwardsCsv } from "../backtest/load.js";
import { renderBacktest } from "../backtest/report.js";
import { runRow, summarise } from "../backtest/run.js";
import { loadCases } from "../cases/load.js";
import { IndianKanoonClient, buildQuery } from "../ingest/indiankanoon.js";
import { matchCases } from "../cases/match.js";
import { checkOffer, estimate, EstimateInputSchema } from "../engine/index.js";
import { REPO_ROOT, loadRules } from "../rules/load.js";
import { validateRules } from "../rules/validate.js";
import { renderCases, renderEstimate, renderOffer } from "./render.js";

const USAGE = `Usage:
  mact estimate <input.json|yaml> [--as-of YYYY-MM-DD] [--format md|json]
  mact offer <input.json|yaml> --offer <rupees> [--years 6] [--interest 7.5] [--discount 7] [--fee 0] [--as-of YYYY-MM-DD]
  mact cases match <input.json|yaml> [--limit 3] [--format md|json]
  mact backtest <awards.csv> [--format md|json]
  mact ik search "<terms>" [--doctypes delhidc] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--page 0] [--budget 5]
      (needs IK_API_TOKEN; responses are cached in .cache/indiankanoon and spend is logged there)
  mact rules validate [--as-of YYYY-MM-DD]`;

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readInput(path: string): unknown {
  return parse(readFileSync(path, "utf8"));
}

async function ikSearch(args: string[], terms: string): Promise<number> {
  const client = new IndianKanoonClient({
    token: process.env["IK_API_TOKEN"] ?? "",
    budgetRupees: Number(flag(args, "budget") ?? 5),
    cacheDir: join(REPO_ROOT, ".cache", "indiankanoon"),
  });
  const doctypes = flag(args, "doctypes");
  const from = flag(args, "from");
  const to = flag(args, "to");
  const q = buildQuery(terms, {
    ...(doctypes !== undefined && { doctypes }),
    ...(from !== undefined && { from }),
    ...(to !== undefined && { to }),
  });
  const res = await client.search(q, Number(flag(args, "page") ?? 0));
  console.log(`# ${q}\n# found: ${res.found ?? "?"} · spent Rs ${client.spentRupees}`);
  for (const d of res.docs)
    console.log(`${d.tid}\t${d.publishdate ?? ""}\t${d.docsource ?? ""}\t${d.title.replace(/<[^>]+>/g, "")}`);
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const [cmd, sub, ...rest] = argv;
  const args = [sub ?? "", ...rest];
  const asOf = flag(args, "as-of") ?? today();
  if (cmd === "rules" && sub === "validate") {
    const rules = loadRules();
    const problems = validateRules(rules, { asOf: flag(args, "as-of") });
    if (problems.length) {
      console.error(problems.map((p) => `✗ ${p}`).join("\n"));
      return 1;
    }
    console.log(
      `✓ rules ${rules.version}: ${rules.sources.length} sources, ${Object.keys(rules.minimumWages).length} minimum-wage schedules`,
    );
    return 0;
  }
  if (cmd === "ik" && sub === "search" && rest[0]) return ikSearch(args, rest[0]);
  if (cmd === "backtest" && sub) {
    const rules = loadRules();
    const { rows, errors } = loadAwardsCsv(sub);
    const results = rows.map((r) => runRow(rules, r));
    const summary = summarise(results);
    console.log(
      flag(args, "format") === "json"
        ? JSON.stringify({ summary, results, errors }, null, 2)
        : renderBacktest(summary, results, errors),
    );
    return errors.length ? 1 : 0;
  }
  if (cmd === "cases" && sub === "match" && rest[0]) {
    const input = EstimateInputSchema.parse(readInput(rest[0]));
    const matches = matchCases(input, loadCases(), Number(flag(args, "limit") ?? 3));
    console.log(flag(args, "format") === "json" ? JSON.stringify(matches, null, 2) : renderCases(matches));
    return 0;
  }
  if ((cmd === "estimate" || cmd === "offer") && sub) {
    const rules = loadRules();
    const out = estimate(rules, readInput(sub), { asOf });
    if (cmd === "estimate") {
      console.log(flag(args, "format") === "json" ? JSON.stringify(out, null, 2) : renderEstimate(out));
      return 0;
    }
    const offer = Number(flag(args, "offer"));
    if (!Number.isFinite(offer) || offer <= 0) {
      console.error("--offer <rupees> is required");
      return 2;
    }
    const check = checkOffer(out, offer, {
      yearsToAward: Number(flag(args, "years") ?? rules.statutory.pendency.tribunal_years),
      awardInterestPct: Number(flag(args, "interest") ?? 7.5),
      discountPct: Number(flag(args, "discount") ?? 7),
      lawyerFeePct: Number(flag(args, "fee") ?? 0),
    });
    console.log(renderEstimate(out) + "\n\n" + renderOffer(check));
    return 0;
  }
  console.error(USAGE);
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => (process.exitCode = code),
  (e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  },
);
