import type { ComponentChildren } from "preact";
import {
  Armchair,
  Baby,
  Briefcase,
  CircleOff,
  GraduationCap,
  HardHat,
  House,
  Landmark,
  Store,
} from "lucide-preact";
import type { LucideIcon } from "lucide-preact";
import { choices, chosen, LABEL, setAnswer, type ChoiceField, type IconName } from "./answers";
import { rules } from "./data";
import { incomeFields, type FormState } from "./form-to-input";
import { useLang, useT } from "./i18n";
import {
  Checkbox,
  Counter,
  DateInput,
  MoneyInput,
  MonthYear,
  Radios,
  Reveal,
  Select,
  TextInput,
  type RadioOption,
} from "./components/form";
import type { BlockId } from "./questions";
import type { FieldName } from "./validate";

/** The drawing for each icon name used by the choices (answers.ts names them, so it stays free of the page). */
export const ICONS: Readonly<Record<IconName, LucideIcon>> = {
  landmark: Landmark,
  briefcase: Briefcase,
  store: Store,
  hardHat: HardHat,
  house: House,
  graduationCap: GraduationCap,
  baby: Baby,
  armchair: Armchair,
  circleOff: CircleOff,
};

export type SetField = <K extends FieldName>(k: K, v: FormState[K]) => void;
export type FieldError = (k: FieldName) => string | undefined;

/** Each answer's label as shown on the page, used in the list of answers left. */
export function fieldLabels(t: (k: string) => string): Partial<Record<FieldName, string>> {
  return Object.fromEntries(Object.entries(LABEL).map(([k, key]) => [k, t(key)]));
}

/** The first and last month with official minimum wages for a state ("Oct 2011"), for the state hint. */
function wagesFrom(code: string, monthNames: (m: number) => string): string | undefined {
  const first = rules.minimumWages[code]?.revisions[0]?.effective_from;
  if (!first) return undefined;
  const [y, m] = first.split("-");
  return `${monthNames(Number(m))} ${y}`;
}

/** Two fields side by side from the small breakpoint up, top-aligned so labels line up. */
function Pair(props: { children: ComponentChildren }) {
  return <div class="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">{props.children}</div>;
}

/** The controls for one block: each answer as the control that suits it (see docs/ui-design-system.md). */
export function BlockFields(props: {
  id: BlockId;
  f: FormState;
  set: SetField;
  err: FieldError;
  setForm: (f: FormState) => void;
  /** Today (YYYY-MM-DD): no later month is offered for the accident. */
  today: string;
}) {
  const t = useT();
  const lang = useLang();
  const { id, f, set, err } = props;
  /** A question's choices (answers.ts), in the page's language. */
  const opts = (k: ChoiceField): RadioOption[] =>
    choices(k, f).map((o) => ({
      value: o.value,
      label: t(o.label),
      hint: o.hint ? t(o.hint) : undefined,
      icon: o.icon ? ICONS[o.icon] : undefined,
    }));
  const inc = incomeFields(f.employment);

  switch (id) {
    case "kind":
      return (
        <Radios
          id="kind"
          hideLabel
          label={t("step.kind")}
          value={f.kind}
          error={err("kind")}
          onChange={(v) => set("kind", v as FormState["kind"])}
          options={opts("kind")}
          layout="stack"
        />
      );
    case "checks":
      return (
        <div class="grid grid-cols-1 gap-6">
          <Radios
            id="victimRole"
            layout="stack"
            label={t("f.role")}
            value={f.victimRole}
            error={err("victimRole")}
            onChange={(v) => set("victimRole", v as FormState["victimRole"])}
            options={opts("victimRole")}
          />
          <Radios
            id="vehicleTraced"
            label={t("f.traced")}
            value={f.vehicleTraced}
            error={err("vehicleTraced")}
            onChange={(v) => set("vehicleTraced", v as FormState["vehicleTraced"])}
            options={opts("vehicleTraced")}
          />
          <Radios
            id="s164"
            label={t("f.s164q")}
            hint={t("f.s164q.hint")}
            value={f.s164}
            error={err("s164")}
            onChange={(v) => set("s164", v as FormState["s164"])}
            options={opts("s164")}
          />
        </div>
      );
    case "age":
      return (
        <TextInput
          id="age"
          numeric
          hideLabel
          width="xs"
          suffix={t("unit.yearsOld")}
          label={t("step.age")}
          value={f.age}
          error={err("age")}
          onInput={(v) => set("age", v)}
        />
      );
    case "work": {
      const canProve = inc.includes("salary") || inc.includes("itr");
      const proofKind = inc.includes("salary") ? "salary_slip" : "itr";
      return (
        <div class="grid grid-cols-1 gap-5">
          <Radios
            id="employment"
            hideLabel
            layout="grid"
            label={t("step.work")}
            value={f.employment}
            error={err("employment")}
            onChange={(v) => set("employment", v as FormState["employment"])}
            options={opts("employment")}
          />
          {canProve && (
            <Reveal>
              <div class="grid grid-cols-1 gap-4">
                <Radios
                  id="proof"
                  label={t(proofKind === "itr" ? "f.proof.q.itr" : "f.proof.q.salary")}
                  value={f.proof}
                  error={err("proof")}
                  onChange={(v) => set("proof", v as FormState["proof"])}
                  options={opts("proof")}
                />
                {f.proof === "salary_slip" && inc.includes("salary") && (
                  <MoneyInput
                    id="monthlySalary"
                    monthly
                    label={t("f.monthlySalary")}
                    hint={t("f.monthlySalary.help")}
                    per={t("unit.month")}
                    value={f.monthlySalary}
                    error={err("monthlySalary")}
                    onInput={(v) => set("monthlySalary", v)}
                  />
                )}
                {f.proof === "itr" && inc.includes("itr") && (
                  <MoneyInput
                    id="itrAnnualIncome"
                    label={t("f.itr")}
                    per={t("unit.year")}
                    value={f.itrAnnualIncome}
                    error={err("itrAnnualIncome")}
                    onInput={(v) => set("itrAnnualIncome", v)}
                  />
                )}
                {inc.includes("occupation") && f.proof === "none" && <Occupation {...props} lang={lang} />}
              </div>
            </Reveal>
          )}
          {!canProve && inc.includes("occupation") && (
            <Reveal>
              <Occupation {...props} lang={lang} />
            </Reveal>
          )}
          {inc.includes("pension") && (
            <Reveal>
              <MoneyInput
                id="pensionMonthly"
                monthly
                optional
                label={t("f.pension")}
                per={t("unit.month")}
                value={f.pensionMonthly}
                error={err("pensionMonthly")}
                onInput={(v) => set("pensionMonthly", v)}
              />
            </Reveal>
          )}
        </div>
      );
    }
    case "family":
      return (
        <div class="grid grid-cols-1 gap-5">
          <Pair>
            <Radios
              id="married"
              label={t("f.married")}
              value={f.married}
              error={err("married")}
              onChange={(v) => set("married", v as FormState["married"])}
              options={opts("married")}
            />
            {f.kind === "death" && f.married === "yes" && (
              <Radios
                id="spouse"
                label={t("f.spouse")}
                value={f.spouse}
                error={err("spouse")}
                onChange={(v) => set("spouse", v as FormState["spouse"])}
                options={opts("spouse")}
              />
            )}
          </Pair>
          {f.kind === "death" && (
            <>
              <div>
                <Radios
                  id="children"
                  label={t("f.children")}
                  value={chosen("children", f)}
                  error={Number(f.children) >= 5 ? undefined : err("children")}
                  onChange={(v) => set("children", v)}
                  options={opts("children")}
                />
                {Number(f.children) >= 5 && (
                  <div class="mt-3">
                    <Reveal>
                      <Counter
                        id="childrenMore"
                        min={5}
                        noun={t("noun.children")}
                        label={t("f.children.howMany")}
                        value={f.children}
                        error={err("children")}
                        onInput={(v) => set("children", v)}
                      />
                    </Reveal>
                  </div>
                )}
              </div>
              <Pair>
                <Radios
                  id="parents"
                  label={t("f.parents")}
                  value={f.parents}
                  error={err("parents")}
                  onChange={(v) => set("parents", v)}
                  options={opts("parents")}
                />
                {Number(f.parents) > 0 && (
                  <Radios
                    id="dependentParents"
                    label={t(f.parents === "1" ? "f.depends.one" : "f.depends.two")}
                    value={f.dependentParents}
                    error={err("dependentParents")}
                    onChange={(v) => set("dependentParents", v)}
                    options={opts("dependentParents")}
                  />
                )}
              </Pair>
            </>
          )}
        </div>
      );
    case "injury":
      return (
        <div class="grid grid-cols-1 gap-5">
          <div>
            <TextInput
              id="certificatePct"
              numeric
              width="xs"
              suffix="%"
              disabled={f.noCertificate}
              label={t("f.certificatePct")}
              value={f.noCertificate ? "" : f.certificatePct}
              error={err("certificatePct")}
              onInput={(v) => set("certificatePct", v)}
            />
            <div class="mt-2 max-w-sm">
              <Checkbox
                id="noCertificate"
                label={t("f.noCertificate")}
                hint={t("f.noCertificate.hint")}
                checked={f.noCertificate}
                onChange={(v) => set("noCertificate", v)}
              />
            </div>
          </div>
          {!f.noCertificate && (
            <Radios
              id="certificateBasis"
              label={t("f.certificateBasis")}
              value={f.certificateBasis}
              error={err("certificateBasis")}
              onChange={(v) => set("certificateBasis", v as FormState["certificateBasis"])}
              options={opts("certificateBasis")}
            />
          )}
          <TextInput
            id="monthsOffWork"
            numeric
            hint={t("f.zeroIfNone")}
            width="xs"
            suffix={t("unit.months")}
            label={t("f.monthsOffWork")}
            value={f.monthsOffWork}
            error={err("monthsOffWork")}
            onInput={(v) => set("monthsOffWork", v)}
          />
        </div>
      );
    case "when":
      return (
        <MonthYear
          id="accidentDate"
          label={t("step.when")}
          hint={t("f.when.hint")}
          fromYear={2000}
          latest={props.today.slice(0, 7)}
          value={f.accidentDate}
          error={err("accidentDate")}
          onInput={(v) => set("accidentDate", v)}
        />
      );
    case "state": {
      const month = (m: number) => t(`month.short.${m}`);
      return (
        <Radios
          id="state"
          hideLabel
          layout="grid"
          label={t("step.state")}
          hint={t("f.state.hint", {
            dl: wagesFrom("DL", month) ?? "",
            central: wagesFrom("CENTRAL", month) ?? "",
          })}
          value={f.state}
          error={err("state")}
          onChange={(v) => set("state", v)}
          options={opts("state")}
        />
      );
    }
    case "dates":
      return (
        <div class="grid grid-cols-1 gap-5">
          <TextInput
            id="accidentDay"
            numeric
            width="xs"
            label={t("f.accidentDay")}
            hint={t("f.accidentDay.hint")}
            value={f.accidentDate.split("-")[2] ?? ""}
            error={(f.accidentDate.split("-")[2] ?? "") !== "" ? err("accidentDate") : undefined}
            onInput={(v) => props.setForm(setAnswer(f, "accidentDay", v))}
          />
          <Radios
            id="claimFiled"
            label={t("q.claim.title")}
            value={f.claimFiled}
            error={err("claimFiled")}
            onChange={(v) => set("claimFiled", v as FormState["claimFiled"])}
            options={opts("claimFiled")}
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
    case "insurance":
      return (
        <Radios
          id="vehicleInsured"
          label={t("f.insured")}
          hint={t("q.vehicle.hint")}
          value={f.vehicleInsured}
          error={err("vehicleInsured")}
          onChange={(v) => set("vehicleInsured", v as FormState["vehicleInsured"])}
          options={opts("vehicleInsured")}
        />
      );
    case "earnings": {
      const zones = rules.minimumWages[f.state]?.zones ?? [];
      const noProof = !(inc.includes("salary") || inc.includes("itr")) || f.proof === "none";
      return (
        <div class="grid grid-cols-1 gap-5">
          {inc.includes("salary") && f.proof === "salary_slip" && (
            <MoneyInput
              id="monthlyTax"
              monthly
              optional
              label={t("f.monthlyTax")}
              hint={t("f.monthlyTax.help")}
              per={t("unit.month")}
              value={f.monthlyTax}
              error={err("monthlyTax")}
              onInput={(v) => set("monthlyTax", v)}
            />
          )}
          {inc.includes("claimed") && noProof && (
            <MoneyInput
              id="claimedMonthly"
              monthly
              optional
              label={t("f.claimed")}
              hint={t("f.claimed.help")}
              per={t("unit.month")}
              value={f.claimedMonthly}
              error={err("claimedMonthly")}
              onInput={(v) => set("claimedMonthly", v)}
            />
          )}
          {inc.includes("pension") && (
            <MoneyInput
              id="familyPensionMonthly"
              monthly
              optional
              label={t("f.familyPension")}
              per={t("unit.month")}
              value={f.familyPensionMonthly}
              error={err("familyPensionMonthly")}
              onInput={(v) => set("familyPensionMonthly", v)}
            />
          )}
          {inc.includes("course") && (
            <Radios
              id="studentCourse"
              optional
              label={t("q.course.title")}
              value={f.studentCourse}
              onChange={(v) => set("studentCourse", v as FormState["studentCourse"])}
              options={opts("studentCourse")}
            />
          )}
          {zones.length > 1 && (
            <Select
              id="zone"
              optional
              label={t("f.zone")}
              hint={f.state === "CENTRAL" ? t("f.zone.central") : undefined}
              value={f.zone}
              onChange={(v) => set("zone", v)}
              options={[
                { value: "", label: t("opt.notSure") },
                ...zones.map((z) => ({
                  value: z,
                  label: f.state === "CENTRAL" ? t(`zone.central.${z}`) : z,
                })),
              ]}
            />
          )}
        </div>
      );
    }
    case "recovery":
      return (
        <div class="grid grid-cols-1 gap-5">
          <Radios
            id="workCapacity"
            layout="stack"
            optional
            label={t("q.workNow.title")}
            hint={t("f.workCapacity.hint")}
            value={f.workCapacity}
            error={err("workCapacity")}
            onChange={(v) => set("workCapacity", v as FormState["workCapacity"])}
            options={opts("workCapacity")}
          />
          <TextInput
            id="functionalPct"
            numeric
            optional
            width="xs"
            suffix="%"
            label={t("f.functionalPct")}
            hint={t("f.functionalPct.hint")}
            value={f.functionalPct}
            error={err("functionalPct")}
            onInput={(v) => set("functionalPct", v)}
          />
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
        <div class="grid grid-cols-1 gap-4">
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

/** Occupation, used for the minimum-wage category when income cannot be proved. */
function Occupation(props: { f: FormState; set: SetField; lang: string }) {
  const t = useT();
  return (
    <Select
      id="occupationCode"
      optional
      label={t("q.occupation.title")}
      hint={t("f.occupation.help")}
      value={props.f.occupationCode}
      onChange={(v) => props.set("occupationCode", v)}
      options={[
        { value: "", label: t("f.occupation.none") },
        ...rules.occupations.occupations.map((o) => ({
          value: o.code,
          label: props.lang === "hi" ? o.hi : o.en,
        })),
      ]}
    />
  );
}
