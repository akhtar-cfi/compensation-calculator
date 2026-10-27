import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { REPO_ROOT } from "../rules/load.js";

const officialUrl = z.url().refine((u) => /^https:\/\/([a-z0-9-]+\.)*(gov\.in|nic\.in)\//.test(u), {
  message: "must be an official .gov.in / .nic.in URL",
});

/** Where a state's minimum-wage orders are published and how they reach this repo (sources/watch.yaml). */
export const WatchSourceSchema = z.object({
  code: z.string().regex(/^[A-Z]+$/),
  name: z.string(),
  listing_urls: z.array(officialUrl).min(1),
  gazette_urls: z.array(officialUrl).default([]),
  file_patterns: z.array(z.string()).default([]),
  language: z.array(z.enum(["en", "hi"])).min(1),
  cadence: z.string(),
  access: z.enum(["wayback", "manual_download", "live"]),
  search_queries: z.array(z.string().min(3)).min(1),
  notes: z.string().optional(),
});
export type WatchSource = z.infer<typeof WatchSourceSchema>;

export function loadWatchSources(path: string = join(REPO_ROOT, "sources", "watch.yaml")): WatchSource[] {
  const r = z.array(WatchSourceSchema).safeParse(parse(readFileSync(path, "utf8")));
  if (!r.success) throw new Error(`Invalid ${path}:\n${z.prettifyError(r.error)}`);
  const codes = r.data.map((s) => s.code);
  const dup = codes.find((c, i) => codes.indexOf(c) !== i);
  if (dup) throw new Error(`Invalid ${path}: duplicate code ${dup}`);
  return r.data;
}
