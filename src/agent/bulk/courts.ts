import { INSURER, MOTOR_CLAIM, type HcRecord } from "./metadata.js";

/**
 * The 25 High Courts in the public bucket, by the bucket's court code. `mactTypes` are the case
 * types that carry motor accident appeals, read from the court's own metadata (probe of
 * 2017–2026, see docs/case-agent.md); a court with none recorded is searched by party name only.
 * `exclusive` is true when the type is used for nothing else (Delhi's MAC.APP.); otherwise a row of
 * that type also needs an insurer among the parties or a motor-claim word in its header.
 * `state_code` is the principal seat's state; the claim's own state comes from the judgment.
 */
export interface BulkCourt {
  code: string;
  name: string;
  state_code: string;
  benches: readonly string[];
  mactTypes: readonly string[];
  exclusive: boolean;
  /** Most PDFs are scanned images with no text layer (probe, Oct 2026): left out of the rotation until OCR exists. */
  scanned?: true;
}

export const BULK_COURTS: readonly BulkCourt[] = [
  {
    code: "7_26",
    name: "High Court of Delhi",
    state_code: "DL",
    benches: ["dhcdb"],
    mactTypes: ["MAC.APP."],
    exclusive: true,
  },
  {
    code: "3_22",
    name: "High Court of Punjab and Haryana",
    state_code: "PB",
    benches: ["phhc"],
    mactTypes: ["FAO"],
    exclusive: false,
    scanned: true,
  },
  {
    code: "8_9",
    name: "High Court of Rajasthan",
    state_code: "RJ",
    benches: ["jaipur", "rhcjodh240618"],
    mactTypes: ["CMA"],
    exclusive: false,
  },
  {
    code: "9_13",
    name: "Allahabad High Court",
    state_code: "UP",
    benches: ["cisdb_16012018", "cishclko"],
    mactTypes: ["FAFO", "FAFOD"],
    exclusive: false,
  },
  {
    code: "23_23",
    name: "High Court of Madhya Pradesh",
    state_code: "MP",
    benches: ["mphc_db_gwl", "mphc_db_ind", "mphc_db_jbp"],
    mactTypes: ["MA"],
    exclusive: false,
  },
  {
    code: "27_1",
    name: "Bombay High Court",
    state_code: "MH",
    benches: ["hcaurdb", "hcbgoa", "kolhcdb", "newas", "newos"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "29_3",
    name: "High Court of Karnataka",
    state_code: "KA",
    benches: ["karhcdharwad", "karhckalaburagi", "karnataka_bng_old"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "33_10",
    name: "Madras High Court",
    state_code: "TN",
    benches: ["hc_cis_mas", "mdubench"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "32_4",
    name: "High Court of Kerala",
    state_code: "KL",
    benches: ["highcourtofkerala"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "28_2",
    name: "High Court of Andhra Pradesh",
    state_code: "AP",
    benches: ["aphc"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "36_29",
    name: "High Court for State of Telangana",
    state_code: "TS",
    benches: ["taphc"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "24_17",
    name: "High Court of Gujarat",
    state_code: "GJ",
    benches: ["gujarathc"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "19_16",
    name: "Calcutta High Court",
    state_code: "WB",
    benches: [
      "calcutta_appellate_side",
      "calcutta_original_side",
      "calcutta_circuit_bench_at_jalpaiguri",
      "calcutta_circuit_bench_at_port_blair",
    ],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "10_8",
    name: "Patna High Court",
    state_code: "BR",
    benches: ["patnahcucisdb94"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "21_11",
    name: "High Court of Orissa",
    state_code: "OD",
    benches: ["cisnc"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "20_7",
    name: "High Court of Jharkhand",
    state_code: "JH",
    benches: ["jhar_pg"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "22_18",
    name: "High Court of Chhattisgarh",
    state_code: "CG",
    benches: ["cghccisdb"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "5_15",
    name: "High Court of Uttarakhand",
    state_code: "UK",
    benches: ["ukhcucis_pg"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "2_5",
    name: "High Court of Himachal Pradesh",
    state_code: "HP",
    benches: ["cmis"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "1_12",
    name: "High Court of Jammu and Kashmir",
    state_code: "JK",
    benches: ["jammuhc", "kashmirhc"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "18_6",
    name: "Gauhati High Court",
    state_code: "AS",
    benches: ["asghccis", "arghccis", "azghccis", "nlghccis"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "16_20",
    name: "High Court of Tripura",
    state_code: "TR",
    benches: ["thcnc"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "17_21",
    name: "High Court of Meghalaya",
    state_code: "ML",
    benches: ["meghalaya"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "14_25",
    name: "High Court of Manipur",
    state_code: "MN",
    benches: ["manipurhc_pg"],
    mactTypes: [],
    exclusive: false,
  },
  {
    code: "11_24",
    name: "High Court of Sikkim",
    state_code: "SK",
    benches: ["sikkimhc_pg"],
    mactTypes: [],
    exclusive: false,
  },
];

export const courtByCode = (code: string): BulkCourt | undefined => BULK_COURTS.find((c) => c.code === code);
export const courtByState = (st: string): BulkCourt | undefined =>
  BULK_COURTS.find((c) => c.state_code === st.toUpperCase());

/**
 * Why a row looks like a motor accident appeal, strongest first; undefined when it does not.
 * "type-only" (a shared case type with no other sign in the metadata) is settled by the judgment
 * text: `isMotorClaimText` must pass before it is extracted.
 */
export type MactSignal = "type" | "type+party" | "party+words" | "words" | "type-only";

export function mactSignal(
  r: Pick<HcRecord, "case_type" | "title" | "header">,
  court: BulkCourt,
): MactSignal | undefined {
  const typed = court.mactTypes.includes(r.case_type);
  const party = INSURER.test(r.title);
  const words = MOTOR_CLAIM.test(r.header) || MOTOR_CLAIM.test(r.title);
  if (typed && court.exclusive) return "type";
  if (typed && (party || words)) return "type+party";
  if (party && words) return "party+words";
  if (words && !court.mactTypes.length) return "words";
  if (typed) return "type-only";
  return undefined;
}

/** True when the judgment text is about a motor accident claim (used for "type-only" rows). */
export const isMotorClaimText = (text: string): boolean =>
  /Motor Vehicles? Act|Claims? Tribunal|M\.?\s?A\.?\s?C\.?\s?T/i.test(text.slice(0, 20000));
