import { useEffect, useState } from "preact/hooks";
import type { Case } from "../../src/cases/schema.js";
import type { RulesBundle } from "../../src/rules/schema.js";
import rulesJson from "./generated/rules.json";

/** Same rules bundle the CLI and tests load from the YAML files, baked in at build time. */
export const rules = rulesJson as unknown as RulesBundle;

export interface Docs {
  rulesVersion: string;
  methodology: string;
  rules: string;
  offerStudy: string;
}

// The documents (about 85 kB) and the case library (about 100 kB) are only needed on some pages, so they are
// separate files fetched from this site when first needed, not part of the first download.
let docsP: Promise<Docs> | undefined;
let casesP: Promise<Case[]> | undefined;
export const loadDocs = () =>
  (docsP ??= import("./generated/docs.json").then((m) => m.default as unknown as Docs));
export const loadCases = () =>
  (casesP ??= import("./generated/cases.json").then((m) => m.default as unknown as Case[]));

/** The value of a loader once it has arrived (undefined until then). */
export function useLoaded<T>(load: () => Promise<T>): T | undefined {
  const [v, setV] = useState<T | undefined>(undefined);
  useEffect(() => {
    let live = true;
    load().then((x) => live && setV(() => x));
    return () => {
      live = false;
    };
  }, [load]);
  return v;
}
