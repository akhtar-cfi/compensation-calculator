import type { BulkExtractionFile } from "./extraction.js";
import type { Doc } from "./run.js";

/**
 * The record of one extraction that may live in the public repository (data/bulk-extractions):
 * everything a review or a later publish needs, without the verbatim quotes (raw judgment text names
 * claimants, sometimes children) and with any party name from the case title masked as "[name]".
 * The judgment itself stays one link away. Review decisions live in the private Sheet.
 */
export const RECORD_VERSION = 1;

/** Words in case titles that are not names (courts, parties' roles, insurers' legal words, honorifics). */
const NOT_NAMES = new Set(
  `OF VS VERSUS AND ORS ANR THE LTD CO COMPANY INSURANCE ASSURANCE INDIA INDIAN NATIONAL NEW ORIENTAL UNITED GENERAL
   STATE UNION OTHERS OTHER LIMITED BRANCH MANAGER DIVISIONAL REGIONAL OFFICE THROUGH ITS LEGAL HEIRS LRS NATURAL
   GUARDIAN MOTHER FATHER MINOR WIFE WIDOW SON DAUGHTER DECEASED DRIVER OWNER LATE THRU SMT SHRI SRI KUMARI MR MRS
   MS DR APP MAC FAO FAFO CMA ANOTHER PVT PRIVATE ERGO LOMBARD ALLIANZ TOKIO SOMPO RELIANCE ICICI HDFC BAJAJ TATA AIG
   IFFCO CHOLAMANDALAM ROYAL SUNDARAM FUTURE GENERALI SBI SHRIRAM MAGMA HDI LIBERTY KOTAK MAHINDRA ACKO DIGIT ZUNO
   NAVI BHARTI AXA CORPORATION TRANSPORT ROAD GOVT GOVERNMENT DISTRICT COLLECTOR`.split(/\s+/),
);

/** Probable personal names in a case title ("A Vs B", "A versus B"): words of three letters or more not in NOT_NAMES. */
export function partyNames(title: string): string[] {
  const body = title.replace(/^[^/]*\/[^/]*\/\d{4}\s+of\s+/i, "");
  return [...new Set((body.toUpperCase().match(/[A-Z][A-Z]{2,}/g) ?? []).filter((w) => !NOT_NAMES.has(w)))];
}

const maskIn = (s: string, names: readonly string[]): { text: string; hits: string[] } => {
  const hits: string[] = [];
  let text = s;
  for (const n of names) {
    const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (re.test(text)) {
      hits.push(n);
      text = text.replace(re, "[name]");
    }
  }
  return { text, hits };
};

/** Masks the names in every string value of a JSON value. */
function maskDeep(v: unknown, names: readonly string[], hits: Set<string>): unknown {
  if (typeof v === "string") {
    const m = maskIn(v, names);
    m.hits.forEach((h) => hits.add(h));
    return m.text;
  }
  if (Array.isArray(v)) return v.map((x) => maskDeep(x, names, hits));
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, maskDeep(x, names, hits)]));
  return v;
}

export interface PublicRecord {
  record_version: number;
  doc_id: string;
  source: "hc" | "sc";
  court: string;
  case: string;
  cnr: string;
  decided: string | null;
  citation: string | null;
  judgment_url: string;
  quote_check: string;
  extraction: Omit<BulkExtractionFile, "evidence">;
}

export function publicRecord(
  x: BulkExtractionFile,
  doc: Doc,
  judgmentUrl: string,
  quoteCheck: string,
  title: string,
): { record: PublicRecord; masked: string[] } {
  const { evidence: _evidence, ...rest } = x;
  void _evidence;
  // The extractor's doubts are working notes (they can name places that point to a family): Sheet only.
  const lean = {
    ...rest,
    payload: { ...rest.payload, uncertain: [] },
    precedent: rest.precedent ? { ...rest.precedent, quote: "" } : null,
  };
  const hits = new Set<string>();
  const extraction = maskDeep(lean, partyNames(title), hits) as PublicRecord["extraction"];
  return {
    record: {
      record_version: RECORD_VERSION,
      doc_id: x.doc_id,
      source: x.source,
      court: doc.court,
      case: doc.case_label,
      cnr: doc.cnr,
      decided: doc.decided ?? null,
      citation: doc.citation ?? null,
      judgment_url: judgmentUrl,
      quote_check: quoteCheck,
      extraction,
    },
    masked: [...hits],
  };
}
