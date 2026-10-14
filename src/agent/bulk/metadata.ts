import { parquetReadObjects } from "hyparquet";

/**
 * Judgment metadata from the public buckets, normalised. The High Court files hold one row per
 * uploaded judgment or order (title "TYPE/NO/YEAR of A Vs B", judge(s), CNR, registration and
 * decision dates, the PDF's path); the Supreme Court files add the official citations.
 * Titles name the parties: they stay in the private Sheet and never go into the repo.
 */
export const HC_COLUMNS = [
  "title",
  "description",
  "judge",
  "pdf_link",
  "cnr",
  "date_of_registration",
  "decision_date",
  "disposal_nature",
] as const;
export const SC_COLUMNS = [
  "title",
  "petitioner",
  "respondent",
  "description",
  "judge",
  "citation",
  "case_id",
  "cnr",
  "decision_date",
  "disposal_nature",
  "path",
] as const;

export type Raw = Record<string, unknown>;

export async function readParquet(buf: ArrayBuffer, columns: readonly string[]): Promise<Raw[]> {
  return (await parquetReadObjects({ file: buf, columns: [...columns] })) as Raw[];
}

const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v)).trim();

/** "24-11-2025" or a Date → "2025-11-24"; undefined when it is not a real date. */
export function isoDate(v: unknown): string | undefined {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString().slice(0, 10);
  const s = str(v);
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s) ?? undefined;
  const iso = m
    ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`
    : /^\d{4}-\d{2}-\d{2}/.test(s)
      ? s.slice(0, 10)
      : undefined;
  if (!iso) return undefined;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : undefined;
}

/** Insurers that appear as parties in motor accident appeals (public and private general insurers). */
export const INSURER =
  /INSURANCE|ASSURANCE|\bINS\.? ?CO\b|\bU\.?I\.?I\.? ?C\b|\bN\.?I\.?A\.? ?C\b|\bO\.?I\.? ?C\b|ORIENTAL|BAJAJ ALLIANZ|ICICI LOMBARD|HDFC ERGO|RELIANCE GEN|TATA AIG|CHOLAMANDALAM|IFFCO|ROYAL SUNDARAM|FUTURE GENERALI|SBI GEN|UNIVERSAL SOMPO|SHRIRAM GEN|MAGMA HDI|LIBERTY (VIDEOCON )?GEN|KOTAK MAHINDRA GEN|ACKO|GO DIGIT|ZUNO|NAVI GEN|IFFCO.?TOKIO|BHARTI AXA/i;
/** Words that mark a motor accident claim in a header or judgment text. */
export const MOTOR_CLAIM =
  /Motor Vehicles? Act|Claims? Tribunal|\bM\.?\s?A\.?\s?C\.?\s?T\b|\bM\.?A\.?C\.?\s?(APP|A|MA)\b|motor accident|section 166\b|section 163-?A\b/i;

export interface HcRecord {
  /** The PDF's file name without .pdf, e.g. "DLHC010430772016_1_2025-02-10": unique per upload. */
  doc_id: string;
  court_code: string;
  bench: string;
  year: number;
  cnr: string;
  title: string;
  case_type: string;
  case_no: string;
  case_year: string;
  judges: string[];
  registered?: string;
  decided?: string;
  disposal: string;
  /** From "Page 1 of N" in the header, when the header has it. */
  pages?: number;
  /** "order" when the header reads as a short order, "judgment" when it says so, else unknown. */
  form: "judgment" | "order" | "unknown";
  /** Header text (first few hundred characters of the PDF). */
  header: string;
  pdf_key: string;
}

/** "MAC.APP./354/2019 of A Vs B" → type "MAC.APP.", number "354", year "2019". */
export function splitCaseTitle(title: string): { type: string; no: string; year: string } {
  const m = /^\s*(.+?)\s*\/\s*([0-9A-Z-]+)\s*\/\s*(\d{4})\b/i.exec(title);
  return m
    ? { type: m[1]!.trim(), no: m[2]!, year: m[3]! }
    : { type: title.split("/")[0]!.trim(), no: "", year: "" };
}

export function headerForm(header: string, pages: number | undefined): HcRecord["form"] {
  if (/J\s?U\s?D\s?G\s?(E\s?)?M\s?E\s?N\s?T/.test(header)) return "judgment";
  // Delhi prints short orders as "O R D E R" (letter-spaced); a plain "ORDER" also appears in case
  // types such as Allahabad's "FIRST APPEAL FROM ORDER", so it is not taken as a sign.
  if (/O\s+R\s+D\s+E\s+R\b/.test(header) && (pages === undefined || pages <= 3)) return "order";
  return "unknown";
}

export function hcRecord(r: Raw, court_code: string, bench: string, year: number): HcRecord | undefined {
  const link = str(r["pdf_link"]);
  const file = link.split("/").pop() ?? "";
  if (!file.endsWith(".pdf")) return undefined;
  const title = str(r["title"]);
  const header = str(r["description"]);
  const ct = splitCaseTitle(title);
  const pagesMatch = /Page 1 of (\d+)/i.exec(header);
  const pages = pagesMatch ? Number(pagesMatch[1]) : undefined;
  const judges = str(r["judge"])
    .split(/\s*,\s*(?=HON|JUSTICE|MR|MRS|MS|DR)/i)
    .map((j) => j.trim())
    .filter(Boolean);
  const registered = isoDate(r["date_of_registration"]);
  const decided = isoDate(r["decision_date"]);
  return {
    doc_id: file.replace(/\.pdf$/, ""),
    court_code,
    bench,
    year,
    cnr: str(r["cnr"]),
    title,
    case_type: ct.type,
    case_no: ct.no,
    case_year: ct.year,
    judges,
    ...(registered && { registered }),
    ...(decided && { decided }),
    disposal: str(r["disposal_nature"]),
    ...(pages !== undefined && { pages }),
    form: headerForm(header, pages),
    header,
    pdf_key: `data/pdf/year=${year}/court=${court_code}/bench=${bench}/${file}`,
  };
}

export interface ScRecord {
  /** The bucket's own key for the judgment, e.g. "2025_1_81_92". */
  doc_id: string;
  year: number;
  title: string;
  judges: string[];
  /** Neutral citation, e.g. "2025 INSC 24". */
  neutral_citation: string;
  /** Report citation, e.g. "[2025] 1 S.C.R. 81". */
  report_citation: string;
  cnr: string;
  decided?: string;
  disposal: string;
  header: string;
  pdf_key: string;
}

export function scRecord(r: Raw, year: number): ScRecord | undefined {
  const path = str(r["path"]);
  if (!path) return undefined;
  const decided = isoDate(r["decision_date"]);
  return {
    doc_id: path,
    year,
    title: str(r["title"]) || `${str(r["petitioner"])} versus ${str(r["respondent"])}`,
    judges: str(r["judge"])
      .split(/\s*,\s*/)
      .filter(Boolean),
    neutral_citation: str(r["case_id"]),
    report_citation: str(r["citation"]),
    cnr: str(r["cnr"]),
    ...(decided && { decided }),
    disposal: str(r["disposal_nature"]),
    header: str(r["description"]),
    pdf_key: `data/pdf/year=${year}/english/${path}_EN.pdf`,
  };
}
