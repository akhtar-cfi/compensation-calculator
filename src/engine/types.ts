import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const Employment = z.enum([
  "permanent", // permanent job with increments
  "fixed_salary", // fixed salary / contract
  "self_employed",
  "informal", // daily wage / informal work
  "homemaker",
  "student",
  "minor", // child not in a course of study
  "pensioner",
  "unemployed",
]);
export type Employment = z.infer<typeof Employment>;

export const EstimateInputSchema = z.object({
  kind: z.enum(["death", "injury"]),
  accidentDate: isoDate,
  claimFiledDate: isoDate.optional(),
  state: z.string().min(2),
  zone: z.string().optional(),
  victimRole: z
    .enum([
      "pedestrian",
      "passenger",
      "pillion_rider",
      "cyclist",
      "driver_of_involved_vehicle",
      "owner_driver_single_vehicle",
      "other",
    ])
    .optional(),
  offendingVehicle: z.enum(["identified_insured", "identified_uninsured", "unidentified"]).optional(),
  s164: z.enum(["none", "accepted_via_insurer", "awarded_by_tribunal"]).optional(),
  victim: z.object({
    ageYears: z.number().int().min(0).max(110),
    employment: Employment,
    occupationCode: z.string().optional(),
    studentCourse: z.enum(["school", "college", "professional"]).optional(),
    income: z
      .object({
        proof: z.enum(["salary_slip", "itr", "none"]).optional(),
        monthlySalary: z.number().nonnegative().optional(),
        monthlyTax: z.number().nonnegative().optional(),
        itrAnnualIncomes: z
          .array(
            z.object({
              fy: z.string(),
              income: z.number().nonnegative(),
              filedAfterAccident: z.boolean().optional(),
              /** Filed after the accident, but backed by records from the time (books, bank statements). */
              corroborated: z.boolean().optional(),
              /** The tax shown on the return, used before any estimate from the slabs. */
              taxPaid: z.number().nonnegative().optional(),
            }),
          )
          .optional(),
        claimedMonthly: z.number().nonnegative().optional(),
        pensionMonthly: z.number().nonnegative().optional(),
        /** After an injury: whether the pension goes on being paid (legal review A-6). Unknown: taken as continuing. */
        pensionContinues: z.boolean().optional(),
      })
      .optional(),
  }),
  family: z.object({
    married: z.boolean(),
    spouse: z.boolean().optional(),
    children: z.number().int().min(0).optional(),
    parents: z.number().int().min(0).max(2).optional(),
    dependentParents: z.number().int().min(0).max(2).optional(),
    otherDependants: z.number().int().min(0).optional(),
    /** An unmarried person who supported a large dependent family (Sarla Verma para 15): asked, not counted. */
    largeDependentFamily: z.boolean().optional(),
  }),
  medical: z
    .object({
      bills: z.number().nonnegative().optional(),
      paidByCashlessScheme: z.number().nonnegative().optional(),
    })
    .optional(),
  received: z
    .object({
      s164: z.number().nonnegative().optional(),
      interimRelief: z.number().nonnegative().optional(),
      hitAndRun: z.number().nonnegative().optional(),
      exGratiaEqualToPay: z.number().nonnegative().optional(),
    })
    .optional(),
  contributoryNegligencePct: z.number().min(0).max(100).optional(),
  injury: z
    .object({
      certificatePct: z.number().min(0).max(100).optional(),
      certificateBasis: z.enum(["whole_body", "limb", "unknown"]).optional(),
      functionalPct: z.number().min(0).max(100).optional(),
      workCapacity: z.enum(["full", "with_difficulty", "lighter_only", "none"]).optional(),
      monthsOffWork: z.number().min(0).optional(),
      hospitalDays: z.number().min(0).optional(),
      attendantDaysDuringTreatment: z.number().min(0).optional(),
      permanentAttendant: z.boolean().optional(),
      attendants: z.number().int().min(1).max(2).optional(),
      futureMedical: z.number().min(0).optional(),
    })
    .optional(),
});
export type EstimateInput = z.infer<typeof EstimateInputSchema>;

export type Scenario = "conservative" | "standard" | "claimantMax";
export const SCENARIOS: readonly Scenario[] = ["conservative", "standard", "claimantMax"];

export type HeadId =
  | "loss_of_dependency"
  | "loss_of_estate"
  | "funeral"
  | "consortium"
  | "medical"
  | "future_medical"
  | "loss_of_income_during_treatment"
  | "attendant_during_treatment"
  | "loss_of_earning_capacity"
  | "future_attendant"
  | "conveyance_special_diet"
  | "pain_suffering_amenities"
  | "marriage_prospects";

/** A working figure (income, multiplier...). Never summed into compensation. */
export interface Intermediate {
  readonly kind: "intermediate";
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly unit: "rupees_per_month" | "rupees_per_year" | "percent" | "fraction" | "years" | "count";
  readonly note?: string;
}

/** An amount the tribunal awards. Only these are summed. */
export interface PayableHead {
  readonly kind: "payable";
  readonly id: HeadId;
  readonly label: string;
  readonly amount: number;
  readonly formula: string;
  /** The formula with this case's numbers in it, ending in the amount ("₹25,000 × 12 × 1.5 × … = ₹51,00,000"). */
  readonly worked?: string;
  readonly sources: readonly string[];
  readonly experimental?: boolean;
}

/** A reduction (contributory negligence, amounts already received). Always <= 0. */
export interface Adjustment {
  readonly kind: "adjustment";
  readonly id: string;
  readonly label: string;
  readonly amount: number;
  readonly sources: readonly string[];
}

export interface ScenarioResult {
  readonly scenario: Scenario;
  readonly intermediates: readonly Intermediate[];
  readonly heads: readonly PayableHead[];
  readonly gross: number;
  readonly adjustments: readonly Adjustment[];
  readonly net: number;
}

export type WarningCode =
  | "S164_LAPSES_166"
  | "OWNER_DRIVER_NO_166"
  | "UNIDENTIFIED_USE_HIT_AND_RUN"
  | "UNINSURED"
  | "LIMITATION"
  | "CONTRIBUTORY_NEGLIGENCE"
  | "MW_MISSING"
  | "MW_CATEGORY_FALLBACK"
  | "MW_MAY_BE_OUTDATED"
  | "MW_CONTESTED"
  | "ZONE_ASSUMED"
  | "RULE_UNVERIFIED"
  | "TAX_ESTIMATED"
  | "TAX_YEAR_MISSING"
  | "MINOR_DEATH_CONTESTED"
  | "FUNCTIONAL_ESTIMATED"
  | "NO_CERTIFICATE"
  | "INJURY_EXPERIMENTAL"
  | "RANGE_TOO_WIDE"
  | "NOT_A_PREDICTION"
  | "INCOME_MISSING"
  | "ATTENDANT_WAGE_MISSING"
  | "S164_AMOUNT_NOT_GIVEN"
  | "CASHLESS_FAULT_ORDER"
  | "ESCALATION_REFERRED";

export interface Warning {
  readonly code: WarningCode;
  readonly severity: "info" | "caution" | "stop";
  readonly message: string;
  /** The values in the message (a state code, a date, an amount), so that it can be worded in another language. */
  readonly vars?: Readonly<Record<string, string | number>>;
}

export interface SwingFactor {
  readonly parameter: string;
  readonly description: string;
  readonly toConservative: number;
  readonly toClaimantMax: number;
}

export interface SensitivityCard {
  readonly id: string;
  readonly label: string;
  readonly delta: number;
}

/** A position on each contested point of law, chosen one by one (points not named stay at the standard reading). */
export type ScenarioMix = Readonly<Partial<Record<string, Scenario>>>;

/** The estimate for a chosen mix of positions ("your choices"), worked out only when asked for. */
export interface MixResult {
  /** The position used on every point this case consulted ("standard" where none was chosen). */
  readonly picks: Readonly<Record<string, Scenario>>;
  /** The contested points this case turns on, in the order the engine meets them. */
  readonly parameters: readonly { readonly id: string; readonly description: string }[];
  readonly result: Omit<ScenarioResult, "scenario">;
}

export interface EstimateOutput {
  readonly engineVersion: string;
  readonly rulesVersion: string;
  readonly asOf: string;
  readonly mode: "normative";
  readonly kind: "death" | "injury";
  readonly eligible: boolean;
  readonly scenarios?: Readonly<Record<Scenario, ScenarioResult>>;
  readonly headline?: { readonly amount: number; readonly approx: string };
  readonly range?: {
    readonly conservative: number;
    readonly standard: number;
    readonly claimantMax: number;
    readonly showBar: boolean;
  };
  /** Award ÷ estimate in real awards of this kind (middle half), when measured. Not part of the entitlement. */
  readonly practiceSpread?: {
    readonly p25: number;
    readonly median: number;
    readonly p75: number;
    readonly n: number;
    readonly label: string;
  };
  readonly swingFactors: readonly SwingFactor[];
  readonly sensitivity: readonly SensitivityCard[];
  readonly interest?: {
    readonly principal: number;
    readonly years: number;
    readonly illustrations: readonly { ratePct: number; interest: number }[];
  };
  readonly warnings: readonly Warning[];
  readonly assumptions: readonly string[];
  readonly citations: readonly { id: string; title: string; citation?: string; url?: string }[];
  /** "Your choices": present only when a mix was asked for and there is an estimate. */
  readonly mix?: MixResult;
}
