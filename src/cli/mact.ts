#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { loadCases } from "../cases/load.js";
import { matchCases } from "../cases/match.js";
import { checkOffer, estimate, EstimateInputSchema } from "../engine/index.js";
import { loadRules } from "../rules/load.js";
import { validateRules } from "../rules/validate.js";
import { renderCases, renderEstimate, renderOffer } from "./render.js";

const USAGE = `Usage:
  mact estimate <input.json|yaml> [--as-of YYYY-MM-DD] [--format md|json]
  mact offer <input.json|yaml> --offer <rupees> [--years 6] [--interest 7.5] [--discount 7] [--fee 0] [--as-of YYYY-MM-DD]
  mact cases match <input.json|yaml> [--limit 3] [--format md|json]
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

function main(argv: string[]): number {
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

process.exitCode = main(process.argv.slice(2));
