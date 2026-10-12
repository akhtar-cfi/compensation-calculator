import type { ComponentChildren } from "preact";
import { rules } from "./data";
import { incomeFields, type FormState } from "./form-to-input";
import { useLang, useT } from "./i18n";
import {
  Checkbox,
  Counter,
  DateInput,
  MoneyInput,
  Radios,
  Reveal,
  Select,
  TextInput,
} from "./components/form";
import type { QuestionId } from "./questions";
import type { FieldName } from "./validate";

export const STATES = ["DL", "HR", "UP", "RJ", "MP", "CENTRAL", "OTHER"] as const;
const ROLES = [
  "pedestrian",
  "passenger",
  "pillion_rider",
  "cyclist",
  "driver_of_involved_vehicle",
  "owner_driver_single_vehicle",
  "other",
] as const;
const EMPLOYMENT = [
  "permanent",
  "fixed_salary",
  "self_employed",
  "informal",
  "homemaker",
  "student",
  "minor",
  "pensioner",
  "unemployed",
] as const;

export type SetField = <K extends FieldName>(k: K, v: FormState[K]) => void;
export type FieldError = (k: FieldName) => string | undefined;

/** Short names for each answer, used in the "answers left" list ("Date of the accident: Enter a real date"). */
export function fieldLabels(t: (k: string) => string): Partial<Record<FieldName, string>> {
  return {
    kind: t("q.kind.title"),
    accidentDate: t("f.accidentDate"),
    victimRole: t("q.role.title"),
    offendingVehicle: t("f.vehicle"),
    s164: t("f.s164"),
    claimFiled: t("q.claim.title"),
    claimFiledDate: t("f.claimFiledDate"),
    state: t("f.state"),
    zone: t("f.zone"),
    age: t("f.age"),
    employment: t("f.employment"),
    occupationCode: t("f.occupation"),
    studentCourse: t("f.course"),
    proof: t("f.proof"),
    monthlySalary: t("f.monthlySalary"),
    monthlyTax: t("f.monthlyTax"),
    itrAnnualIncome: t("f.itr"),
    claimedMonthly: t("f.claimed"),
    pensionMonthly: t("f.pension"),
    familyPensionMonthly: t("f.familyPension"),
    married: t("f.married"),
    spouse: t("f.spouse"),
    children: t("f.children"),
    parents: t("f.parents"),
    dependentParents: t("f.dependentParents"),
    medicalBills: t("f.medicalBills"),
    cashlessPaid: t("f.cashless"),
    certificatePct: t("f.certificatePct"),
    certificateBasis: t("f.certificateBasis"),
    workCapacity: t("f.workCapacity"),
    monthsOffWork: t("f.monthsOffWork"),
    hospitalDays: t("f.hospitalDays"),
  };
}

const yesNo = (t: (k: string) => string) => [
  { value: "yes", label: t("f.yes") },
  { value: "no", label: t("f.no") },
];

/** Two fields side by side from the small breakpoint up. */
function Pair(props: { children: ComponentChildren }) {
  return <div class="grid gap-5 sm:grid-cols-2">{props.children}</div>;
}

/** The controls for one question: each answer as the control that suits it (see docs/ui-design-system.md). */
export function QuestionFields(props: {
  id: QuestionId;
  f: FormState;
  set: SetField;
  err: FieldError;
  setForm: (f: FormState) => void;
}) {
  const t = useT();
  const lang = useLang();
  const { id, f, set, err } = props;
  const opt = (prefix: string, vals: readonly string[]) =>
    vals.map((v) => ({ value: v, label: t(`${prefix}${v}`) }));
  const notSure = { value: "unknown", label: t("opt.notSure") };

  switch (id) {
    case "kind":
      return (
        <Radios
          id="kind"
          label={t("q.kind.title")}
          value={f.kind}
          error={err("kind")}
          onChange={(v) => set("kind", v as FormState["kind"])}
          options={opt("f.kind.", ["death", "injury"])}
        />
      );
    case "accidentDate":
      return (
        <DateInput
          id="accidentDate"
          label={t("q.accidentDate.title")}
          hint={t("q.accidentDate.hint")}
          value={f.accidentDate}
          error={err("accidentDate")}
          onInput={(v) => set("accidentDate", v)}
        />
      );
    case "role":
      return (
        <Select
          id="victimRole"
          label={t("q.role.title")}
          value={f.victimRole}
          error={err("victimRole")}
          onChange={(v) => set("victimRole", v as FormState["victimRole"])}
          options={[{ value: "", label: t("wiz.choose") }, ...opt("f.role.", ROLES)]}
        />
      );
    case "vehicle":
      return (
        <Radios
          id="offendingVehicle"
          layout="stack"
          label={t("q.vehicle.title")}
          hint={t("q.vehicle.hint")}
          value={f.offendingVehicle}
          error={err("offendingVehicle")}
          onChange={(v) => set("offendingVehicle", v as FormState["offendingVehicle"])}
          options={[
            ...opt("opt.vehicle.", ["identified_insured", "identified_uninsured", "unidentified"]),
            notSure,
          ]}
        />
      );
    case "s164":
      return (
        <Radios
          id="s164"
          layout="stack"
          label={t("q.s164.title")}
          hint={t("q.s164.hint")}
          value={f.s164}
          error={err("s164")}
          onChange={(v) => set("s164", v as FormState["s164"])}
          options={[...opt("f.s164.", ["none", "accepted_via_insurer", "awarded_by_tribunal"]), notSure]}
        />
      );
    case "claim":
      return (
        <div class="grid gap-4">
          <Radios
            id="claimFiled"
            label={t("q.claim.title")}
            value={f.claimFiled}
            error={err("claimFiled")}
            onChange={(v) => set("claimFiled", v as FormState["claimFiled"])}
            options={yesNo(t)}
          />
          {f.claimFiled === "yes" && (
            <Reveal>
              <DateInput
                id="claimFiledDate"
                label={t("f.claimFiledDate")}
                hint={t("q.accidentDate.hint")}
                value={f.claimFiledDate}
                error={err("claimFiledDate")}
                onInput={(v) => set("claimFiledDate", v)}
              />
            </Reveal>
          )}
        </div>
      );
    case "state": {
      const zones = rules.minimumWages[f.state]?.zones ?? [];
      return (
        <div class="grid gap-4">
          <Select
            id="state"
            label={t("q.state.title")}
            hint={t("f.state.help")}
            value={f.state}
            error={err("state")}
            onChange={(v) => props.setForm({ ...f, state: v, zone: "" })}
            options={[
              { value: "", label: t("wiz.choose") },
              ...STATES.map((s) => ({
                value: s,
                label: s === "OTHER" ? t("f.state.other") : t(`state.${s}`),
              })),
            ]}
          />
          {zones.length > 1 && (
            <Reveal>
              <Select
                id="zone"
                optional
                label={t("f.zone")}
                value={f.zone}
                onChange={(v) => set("zone", v)}
                options={[
                  { value: "", label: t("opt.notSure") },
                  ...zones.map((z) => ({ value: z, label: z })),
                ]}
              />
            </Reveal>
          )}
        </div>
      );
    }
    case "age":
      return (
        <TextInput
          id="age"
          numeric
          width="xs"
          suffix={t("unit.yearsOld")}
          label={t("q.age.title")}
          value={f.age}
          error={err("age")}
          onInput={(v) => set("age", v)}
        />
      );
    case "work":
      return (
        <Select
          id="employment"
          label={t("q.work.title")}
          value={f.employment}
          error={err("employment")}
          onChange={(v) => set("employment", v as FormState["employment"])}
          options={[{ value: "", label: t("wiz.choose") }, ...opt("f.emp.", EMPLOYMENT)]}
        />
      );
    case "occupation":
      return (
        <Select
          id="occupationCode"
          optional
          label={t("q.occupation.title")}
          hint={t("f.occupation.help")}
          value={f.occupationCode}
          onChange={(v) => set("occupationCode", v)}
          options={[
            { value: "", label: t("f.occupation.none") },
            ...rules.occupations.occupations.map((o) => ({
              value: o.code,
              label: lang === "hi" ? o.hi : o.en,
            })),
          ]}
        />
      );
    case "course":
      return (
        <Radios
          id="studentCourse"
          optional
          label={t("q.course.title")}
          value={f.studentCourse}
          onChange={(v) => set("studentCourse", v as FormState["studentCourse"])}
          options={[...opt("f.course.", ["school", "college", "professional"]), notSure]}
        />
      );
    case "income": {
      const fields = incomeFields(f.employment);
      const canProve = fields.includes("salary") || fields.includes("itr");
      const proofKind = fields.includes("salary") ? "salary_slip" : "itr";
      return (
        <div class="grid gap-4">
          {canProve && (
            <Radios
              id="proof"
              label={t("f.proof")}
              value={f.proof}
              error={err("proof")}
              onChange={(v) => set("proof", v as FormState["proof"])}
              options={opt("f.proof.", [proofKind, "none"])}
            />
          )}
          {f.proof === "salary_slip" && fields.includes("salary") && (
            <Reveal>
              <Pair>
                <MoneyInput
                  id="monthlySalary"
                  label={t("f.monthlySalary")}
                  per={t("unit.month")}
                  value={f.monthlySalary}
                  error={err("monthlySalary")}
                  onInput={(v) => set("monthlySalary", v)}
                />
                <MoneyInput
                  id="monthlyTax"
                  optional
                  label={t("f.monthlyTax")}
                  hint={t("f.monthlyTax.help")}
                  per={t("unit.month")}
                  value={f.monthlyTax}
                  error={err("monthlyTax")}
                  onInput={(v) => set("monthlyTax", v)}
                />
              </Pair>
            </Reveal>
          )}
          {f.proof === "itr" && fields.includes("itr") && (
            <Reveal>
              <MoneyInput
                id="itrAnnualIncome"
                label={t("f.itr")}
                per={t("unit.year")}
                value={f.itrAnnualIncome}
                error={err("itrAnnualIncome")}
                onInput={(v) => set("itrAnnualIncome", v)}
              />
            </Reveal>
          )}
          {fields.includes("claimed") && (!canProve || f.proof === "none") && (
            <MoneyInput
              id="claimedMonthly"
              optional
              label={t("f.claimed")}
              hint={t("f.claimed.help")}
              per={t("unit.month")}
              value={f.claimedMonthly}
              error={err("claimedMonthly")}
              onInput={(v) => set("claimedMonthly", v)}
            />
          )}
        </div>
      );
    }
    case "pension":
      return (
        <Pair>
          <MoneyInput
            id="pensionMonthly"
            optional
            label={t("f.pension")}
            per={t("unit.month")}
            value={f.pensionMonthly}
            error={err("pensionMonthly")}
            onInput={(v) => set("pensionMonthly", v)}
          />
          <MoneyInput
            id="familyPensionMonthly"
            optional
            label={t("f.familyPension")}
            per={t("unit.month")}
            value={f.familyPensionMonthly}
            error={err("familyPensionMonthly")}
            onInput={(v) => set("familyPensionMonthly", v)}
          />
        </Pair>
      );
    case "family":
      return (
        <div class="grid gap-5">
          <Pair>
            <Radios
              id="married"
              label={t("f.married")}
              value={f.married}
              error={err("married")}
              onChange={(v) =>
                props.setForm({
                  ...f,
                  married: v as FormState["married"],
                  spouse: v === "yes" ? f.spouse : "",
                })
              }
              options={yesNo(t)}
            />
            {f.married === "yes" && (
              <Radios
                id="spouse"
                label={t("f.spouse")}
                value={f.spouse}
                error={err("spouse")}
                onChange={(v) => set("spouse", v as FormState["spouse"])}
                options={yesNo(t)}
              />
            )}
          </Pair>
          {f.kind === "death" && (
            <>
              <p class="-mb-2 text-sm text-muted-foreground">{t("q.family.hint")}</p>
              <div class="grid gap-5 sm:grid-cols-3">
                <Counter
                  id="children"
                  noun={t("noun.children")}
                  label={t("f.children")}
                  value={f.children}
                  error={err("children")}
                  onInput={(v) => set("children", v)}
                />
                <Counter
                  id="parents"
                  max={2}
                  noun={t("noun.parents")}
                  label={t("f.parents")}
                  value={f.parents}
                  error={err("parents")}
                  onInput={(v) => set("parents", v)}
                />
                <Counter
                  id="dependentParents"
                  optional
                  max={2}
                  noun={t("noun.dependentParents")}
                  label={t("f.dependentParents")}
                  value={f.dependentParents}
                  error={err("dependentParents")}
                  onInput={(v) => set("dependentParents", v)}
                />
              </div>
            </>
          )}
        </div>
      );
    case "disability":
      return (
        <div class="grid gap-4">
          <p class="text-sm text-muted-foreground">{t("q.disability.hint")}</p>
          <Pair>
            <TextInput
              id="certificatePct"
              numeric
              optional
              width="xs"
              suffix="%"
              label={t("f.certificatePct")}
              value={f.certificatePct}
              error={err("certificatePct")}
              onInput={(v) => set("certificatePct", v)}
            />
            <Radios
              id="certificateBasis"
              optional
              label={t("f.certificateBasis")}
              value={f.certificateBasis}
              onChange={(v) => set("certificateBasis", v as FormState["certificateBasis"])}
              options={[
                ...opt("f.basis.", ["whole_body", "limb"]),
                { value: "unknown", label: t("opt.notSure") },
              ]}
            />
          </Pair>
        </div>
      );
    case "workNow":
      return (
        <Radios
          id="workCapacity"
          layout="stack"
          optional
          label={t("q.workNow.title")}
          value={f.workCapacity}
          onChange={(v) => set("workCapacity", v as FormState["workCapacity"])}
          options={[...opt("f.work.", ["full", "with_difficulty", "lighter_only", "none"]), notSure]}
        />
      );
    case "treatment":
      return (
        <div class="grid gap-4">
          <Pair>
            <TextInput
              id="monthsOffWork"
              numeric
              optional
              width="xs"
              suffix={t("unit.months")}
              label={t("f.monthsOffWork")}
              value={f.monthsOffWork}
              error={err("monthsOffWork")}
              onInput={(v) => set("monthsOffWork", v)}
            />
            <TextInput
              id="hospitalDays"
              numeric
              optional
              width="xs"
              suffix={t("unit.days")}
              label={t("f.hospitalDays")}
              value={f.hospitalDays}
              error={err("hospitalDays")}
              onInput={(v) => set("hospitalDays", v)}
            />
          </Pair>
          <Checkbox
            id="permanentAttendant"
            label={t("f.permanentAttendant")}
            checked={f.permanentAttendant}
            onChange={(v) => set("permanentAttendant", v)}
          />
        </div>
      );
    case "medical":
      return (
        <div class="grid gap-4">
          {f.kind === "death" && <p class="text-sm text-muted-foreground">{t("q.medical.hint.death")}</p>}
          <Pair>
            <MoneyInput
              id="medicalBills"
              optional
              label={t("f.medicalBills")}
              value={f.medicalBills}
              error={err("medicalBills")}
              onInput={(v) => set("medicalBills", v)}
            />
            <MoneyInput
              id="cashlessPaid"
              optional
              label={t("f.cashless")}
              value={f.cashlessPaid}
              error={err("cashlessPaid")}
              onInput={(v) => set("cashlessPaid", v)}
            />
          </Pair>
        </div>
      );
  }
}
