import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { rules } from "../data";
import { incomeFields, type FormState } from "../form-to-input";
import { useLang, useT } from "../i18n";
import {
  Button,
  Checkbox,
  Eyebrow,
  Notice,
  RadioGroup,
  Section,
  SelectField,
  TextField,
} from "../components/ui";
import { STEP_FIELDS, stepErrors, validate, type FieldName } from "../validate";

/** States offered in the wizard. Only those with a loaded wage schedule can estimate without income proof. */
const STATES = ["DL", "HR", "UP", "RJ", "MP", "CENTRAL", "OTHER"] as const;
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

export function Estimate(props: {
  form: FormState;
  setForm: (f: FormState) => void;
  step: number;
  setStep: (n: number) => void;
  today: string;
}) {
  const t = useT();
  const lang = useLang();
  const { form: f, step } = props;
  const [shown, setShown] = useState<Partial<Record<FieldName, string>>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    // Move focus to the step heading on every step change (not on first load), so screen-reader and keyboard users
    // start at the top of the new questions. A layout effect, so it happens with the render: a deferred one could
    // land after the person has already tabbed to a field and pull focus away from it.
    if (first.current) first.current = false;
    else heading.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  const set = <K extends FieldName>(k: K, v: FormState[K]) => {
    props.setForm({ ...f, [k]: v });
    if (shown[k]) setShown({ ...shown, [k]: undefined });
  };
  const err = (k: FieldName) => (shown[k] ? t(shown[k]) : undefined);
  const titles = ["wiz.s1", "wiz.s2", "wiz.s3", f.kind === "injury" ? "wiz.s4" : "wiz.s4death"];
  const total = titles.length;

  const next = () => {
    const v = validate(f, props.today);
    const errs = stepErrors(v, step);
    if (Object.keys(errs).length) {
      setShown(errs);
      const firstField = STEP_FIELDS[step]!.find((k) => errs[k]);
      requestAnimationFrame(() => document.getElementById(firstField ?? "")?.focus());
      return;
    }
    setShown({});
    if (step < total - 1) props.setStep(step + 1);
    else if (v.input) location.hash = "#/result";
    else {
      // An error on an earlier step: go back to the first step that has one.
      const back = STEP_FIELDS.findIndex((_, i) => Object.keys(stepErrors(v, i)).length);
      setShown(v.errors);
      if (back >= 0) props.setStep(back);
    }
  };

  const fields = incomeFields(f.employment);
  const zones = rules.minimumWages[f.state]?.zones ?? [];
  const opt = (prefix: string, vals: readonly string[]) =>
    vals.map((v) => ({ value: v, label: t(`${prefix}${v}`) }));
  const choose = { value: "", label: t("wiz.choose") };
  const hasErrors = Object.values(shown).some(Boolean);

  return (
    <Section narrow>
      <Eyebrow>{t("wiz.eyebrow")}</Eyebrow>
      <p class="mt-2 text-sm text-muted-foreground">{t("wiz.step", { n: step + 1, total })}</p>
      <ol class="mt-4 grid grid-cols-4 gap-2" aria-label={t("wiz.eyebrow")}>
        {titles.map((k, i) => (
          <li
            key={k}
            aria-current={i === step ? "step" : undefined}
            class={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-border"}`}
          >
            <span class="sr-only">{t(k)}</span>
          </li>
        ))}
      </ol>
      <h1
        id="page-title"
        ref={heading}
        tabIndex={-1}
        class="mt-6 font-heading text-3xl font-bold tracking-tight outline-none sm:text-4xl"
      >
        {t(titles[step]!)}
      </h1>

      {hasErrors && (
        <div class="mt-6">
          <Notice severity="caution" title={t("wiz.fix")} />
        </div>
      )}

      <form
        class="mt-8 grid gap-8"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {step === 0 && (
          <>
            <RadioGroup
              id="kind"
              label={t("f.kind")}
              value={f.kind}
              onChange={(v) => set("kind", v as FormState["kind"])}
              options={opt("f.kind.", ["death", "injury"])}
            />
            <TextField
              id="accidentDate"
              type="date"
              label={t("f.accidentDate")}
              value={f.accidentDate}
              max={props.today}
              error={err("accidentDate")}
              onInput={(v) => set("accidentDate", v)}
            />
            <TextField
              id="claimFiledDate"
              type="date"
              optional
              label={t("f.claimFiledDate")}
              help={t("f.claimFiledDate.help")}
              value={f.claimFiledDate}
              max={props.today}
              error={err("claimFiledDate")}
              onInput={(v) => set("claimFiledDate", v)}
            />
            <SelectField
              id="state"
              label={t("f.state")}
              help={t("f.state.help")}
              value={f.state}
              onChange={(v) => props.setForm({ ...f, state: v, zone: "" })}
              options={STATES.map((s) => ({
                value: s,
                label: s === "OTHER" ? t("f.state.other") : t(`state.${s}`),
              }))}
            />
            {zones.length > 1 && (
              <SelectField
                id="zone"
                optional
                label={t("f.zone")}
                value={f.zone}
                onChange={(v) => set("zone", v)}
                options={[choose, ...zones.map((z) => ({ value: z, label: z }))]}
              />
            )}
            <SelectField
              id="victimRole"
              optional
              label={t("f.victimRole")}
              value={f.victimRole}
              onChange={(v) => set("victimRole", v as FormState["victimRole"])}
              options={[choose, ...opt("f.role.", ROLES)]}
            />
            <RadioGroup
              id="offendingVehicle"
              optional
              label={t("f.vehicle")}
              value={f.offendingVehicle}
              onChange={(v) => set("offendingVehicle", v as FormState["offendingVehicle"])}
              options={opt("f.vehicle.", ["identified_insured", "identified_uninsured", "unidentified"])}
            />
            <RadioGroup
              id="s164"
              optional
              label={t("f.s164")}
              value={f.s164}
              onChange={(v) => set("s164", v as FormState["s164"])}
              options={opt("f.s164.", ["none", "accepted_via_insurer", "awarded_by_tribunal"])}
            />
            <Eligibility form={f} />
          </>
        )}

        {step === 1 && (
          <>
            <TextField
              id="age"
              numeric
              label={t("f.age")}
              value={f.age}
              error={err("age")}
              onInput={(v) => set("age", v)}
            />
            <SelectField
              id="employment"
              label={t("f.employment")}
              value={f.employment}
              onChange={(v) => set("employment", v as FormState["employment"])}
              options={opt("f.emp.", EMPLOYMENT)}
            />
            {fields.includes("occupation") && (
              <SelectField
                id="occupationCode"
                optional
                label={t("f.occupation")}
                help={t("f.occupation.help")}
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
            )}
            {fields.includes("course") && (
              <RadioGroup
                id="studentCourse"
                optional
                label={t("f.course")}
                value={f.studentCourse}
                onChange={(v) => set("studentCourse", v as FormState["studentCourse"])}
                options={opt("f.course.", ["school", "college", "professional"])}
              />
            )}
            {(fields.includes("salary") || fields.includes("itr")) && (
              <RadioGroup
                id="proof"
                label={t("f.proof")}
                value={f.proof}
                onChange={(v) => set("proof", v as FormState["proof"])}
                options={opt("f.proof.", ["none", fields.includes("salary") ? "salary_slip" : "itr"])}
              />
            )}
            {fields.includes("salary") && f.proof === "salary_slip" && (
              <>
                <TextField
                  id="monthlySalary"
                  numeric
                  label={t("f.monthlySalary")}
                  value={f.monthlySalary}
                  error={err("monthlySalary")}
                  onInput={(v) => set("monthlySalary", v)}
                />
                <TextField
                  id="monthlyTax"
                  numeric
                  optional
                  label={t("f.monthlyTax")}
                  help={t("f.monthlyTax.help")}
                  value={f.monthlyTax}
                  error={err("monthlyTax")}
                  onInput={(v) => set("monthlyTax", v)}
                />
              </>
            )}
            {fields.includes("itr") && f.proof === "itr" && (
              <TextField
                id="itrAnnualIncome"
                numeric
                label={t("f.itr")}
                value={f.itrAnnualIncome}
                error={err("itrAnnualIncome")}
                onInput={(v) => set("itrAnnualIncome", v)}
              />
            )}
            {fields.includes("claimed") && f.proof === "none" && (
              <TextField
                id="claimedMonthly"
                numeric
                optional
                label={t("f.claimed")}
                help={t("f.claimed.help")}
                value={f.claimedMonthly}
                error={err("claimedMonthly")}
                onInput={(v) => set("claimedMonthly", v)}
              />
            )}
            {fields.includes("pension") && (
              <>
                <TextField
                  id="pensionMonthly"
                  numeric
                  optional
                  label={t("f.pension")}
                  value={f.pensionMonthly}
                  error={err("pensionMonthly")}
                  onInput={(v) => set("pensionMonthly", v)}
                />
                <TextField
                  id="familyPensionMonthly"
                  numeric
                  optional
                  label={t("f.familyPension")}
                  value={f.familyPensionMonthly}
                  error={err("familyPensionMonthly")}
                  onInput={(v) => set("familyPensionMonthly", v)}
                />
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <RadioGroup
              id="married"
              label={t("f.married")}
              value={f.married ? "yes" : "no"}
              onChange={(v) =>
                props.setForm({ ...f, married: v === "yes", spouse: v === "yes" ? f.spouse : false })
              }
              options={[
                { value: "yes", label: t("f.yes") },
                { value: "no", label: t("f.no") },
              ]}
            />
            {f.married && (
              <RadioGroup
                id="spouse"
                label={t("f.spouse")}
                value={f.spouse ? "yes" : "no"}
                onChange={(v) => set("spouse", v === "yes")}
                options={[
                  { value: "yes", label: t("f.yes") },
                  { value: "no", label: t("f.no") },
                ]}
              />
            )}
            <TextField
              id="children"
              numeric
              optional
              label={t("f.children")}
              value={f.children}
              error={err("children")}
              onInput={(v) => set("children", v)}
            />
            <TextField
              id="parents"
              numeric
              optional
              label={t("f.parents")}
              value={f.parents}
              error={err("parents")}
              onInput={(v) => set("parents", v)}
            />
            {f.kind === "death" && (
              <TextField
                id="dependentParents"
                numeric
                optional
                label={t("f.dependentParents")}
                value={f.dependentParents}
                error={err("dependentParents")}
                onInput={(v) => set("dependentParents", v)}
              />
            )}
          </>
        )}

        {step === 3 && (
          <>
            {f.kind === "injury" && (
              <>
                <TextField
                  id="certificatePct"
                  numeric
                  optional
                  label={t("f.certificatePct")}
                  value={f.certificatePct}
                  error={err("certificatePct")}
                  onInput={(v) => set("certificatePct", v)}
                />
                <RadioGroup
                  id="certificateBasis"
                  optional
                  label={t("f.certificateBasis")}
                  value={f.certificateBasis}
                  onChange={(v) => set("certificateBasis", v as FormState["certificateBasis"])}
                  options={opt("f.basis.", ["whole_body", "limb", "unknown"])}
                />
                <RadioGroup
                  id="workCapacity"
                  optional
                  label={t("f.workCapacity")}
                  value={f.workCapacity}
                  onChange={(v) => set("workCapacity", v as FormState["workCapacity"])}
                  options={opt("f.work.", ["full", "with_difficulty", "lighter_only", "none"])}
                />
                <TextField
                  id="monthsOffWork"
                  numeric
                  optional
                  label={t("f.monthsOffWork")}
                  value={f.monthsOffWork}
                  error={err("monthsOffWork")}
                  onInput={(v) => set("monthsOffWork", v)}
                />
                <TextField
                  id="hospitalDays"
                  numeric
                  optional
                  label={t("f.hospitalDays")}
                  value={f.hospitalDays}
                  error={err("hospitalDays")}
                  onInput={(v) => set("hospitalDays", v)}
                />
                <Checkbox
                  id="permanentAttendant"
                  label={t("f.permanentAttendant")}
                  checked={f.permanentAttendant}
                  onChange={(v) => set("permanentAttendant", v)}
                />
              </>
            )}
            <TextField
              id="medicalBills"
              numeric
              optional
              label={t("f.medicalBills")}
              value={f.medicalBills}
              error={err("medicalBills")}
              onInput={(v) => set("medicalBills", v)}
            />
            <TextField
              id="cashlessPaid"
              numeric
              optional
              label={t("f.cashless")}
              value={f.cashlessPaid}
              error={err("cashlessPaid")}
              onInput={(v) => set("cashlessPaid", v)}
            />
          </>
        )}

        <div class="flex flex-wrap gap-3 border-t border-border pt-8">
          {step > 0 && (
            <Button secondary onClick={() => props.setStep(step - 1)}>
              {t("wiz.back")}
            </Button>
          )}
          <Button type="submit" arrow>
            {step < total - 1 ? t("wiz.next") : t("wiz.result")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

/** The eligibility screen: answers that end or redirect the claim are flagged as soon as they are chosen. */
function Eligibility(props: { form: FormState }) {
  const t = useT();
  const f = props.form;
  const items = [
    f.victimRole === "owner_driver_single_vehicle" && "elig.owner",
    f.offendingVehicle === "unidentified" && "elig.unidentified",
    f.s164 === "accepted_via_insurer" && "elig.s164",
  ].filter((x): x is string => Boolean(x));
  if (!items.length) return null;
  return (
    <div class="grid gap-3" aria-live="polite">
      {items.map((k) => (
        <Notice key={k} severity="stop" title={t("elig.title")}>
          {t(k)}
        </Notice>
      ))}
    </div>
  );
}
