import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { REPO_ROOT } from "../rules/load.js";
import { CaseSchema, type Case } from "./schema.js";

export function loadCases(dir: string = join(REPO_ROOT, "data", "cases")): Case[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => {
      const r = CaseSchema.safeParse(parse(readFileSync(join(dir, f), "utf8")));
      if (!r.success) throw new Error(`Invalid case ${f}:\n${z.prettifyError(r.error)}`);
      return r.data;
    });
}
