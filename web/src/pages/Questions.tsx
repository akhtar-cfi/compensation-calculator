import { useLayoutEffect, useMemo, useState } from "preact/hooks";
import { ArrowLeft } from "lucide-preact";
import { formatINR } from "../../../src/engine/money.js";
import { rules } from "../data";
import { incomeFields, parseDate, type FormState } from "../form-to-input";
import { useLang, useT } from "../i18n";
import { Button, LinkButton, Notice, ToolPage } from "../components/ui";
import {
  Checkbox,
  Counter,
  DateInput,
  ErrorSummary,
  MoneyInput,
  PAGE_TITLE_ID,
  Radios,
  Reveal,
  Select,
  TextInput,
  focusField,
} from "../components/form";
import { SummaryList } from "../components/result";
import {
  STOP_QUESTION,
  activePath,
  errorsFor,
  nextAfter,
  previousOf,
  sectionOf,
  stopAfter,
  type QuestionId,
  type StopCode,
} from "../questions";
import { validate, type FieldName } from "../validate";

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

export const href = (id: QuestionId | "check", fromCheck = false) =>
  id === "check" ? "#/check" : `#/q/${id}${fromCheck ? "?from=check" : ""}`;

type Set = <K extends FieldName>(k: K, v: FormState[K]) => void;
type Err = (k: FieldName) => string | undefined;

/** The section caption above a question: stable while the path branches. */
function Caption(props: { id: QuestionId; kind: FormState["kind"] }) {
  const t = useT();
  const s = sectionOf(props.id);
  const name =
    s.section === "accident"
      ? t("wiz.s1")
      : s.section === "person"
        ? t("wiz.s2")
        : s.section === "family"
          ? t("wiz.s3")
          : t(props.kind === "injury" ? "wiz.s4injury" : "wiz.s4death");
  return (
    <p class="mb-3 text-sm font-medium text-muted-foreground" data-testid="caption">
      {t("wiz.caption", { section: name, n: s.n, total: s.total })}
    </p>
  );
}

function BackLink(props: { to: string }) {
  const t = useT();
  return (
    <a
      href={props.to}
      class="no-print mb-6 inline-flex min-h-11 items-center gap-1 text-foreground underline underline-offset-4 hover:text-brand"
    >
      <ArrowLeft aria-hidden="true" class="h-4 w-4" />
      {t("wiz.back")}
    </a>
  );
}

/** One question page: caption, the question (as the h1), errors after Continue, and Continue under the answers. */
export function QuestionPage(props: {
  id: QuestionId;
  fromCheck: boolean;
  form: FormState;
  setForm: (f: FormState) => void;
  today: string;
}) {
  const t = useT();
  const { id, form: f } = props;
  const v = useMemo(() => validate(f, props.today), [f, props.today]);
  const [shown, setShown] = useState<Partial<Record<FieldName, string>>>({});
  const [focusSummary, setFocusSummary] = useState(0);

  useLayoutEffect(() => {
    // After a failed Continue the error summary takes focus (GOV.UK), with the render, not after it.
    if (focusSummary) document.getElementById("error-summary")?.focus();
  }, [focusSummary]);

  const set: Set = (k, val) => {
    props.setForm({ ...f, [k]: val });
    if (shown[k]) setShown({ ...shown, [k]: undefined });
  };
  const err: Err = (k) => (shown[k] ? t(shown[k]) : undefined);

  const onContinue = (e: Event) => {
    e.preventDefault();
    const errs = errorsFor(v, id);
    if (Object.keys(errs).length) {
      setShown(errs);
      setFocusSummary((n) => n + 1);
      return;
    }
    setShown({});
    const stop = stopAfter(id, f);
    if (stop) location.hash = `#/stop/${stop}`;
    else location.hash = href(nextAfter(f, v, id, props.fromCheck), props.fromCheck);
  };

  const prev = props.fromCheck
    ? "#/check"
    : (() => {
        const p = previousOf(f, id);
        return p ? href(p) : "#/";
      })();

  const labels = fieldLabels(t);
  const summary = Object.entries(shown)
    .filter(([, m]) => m)
    .map(([k, m]) => ({ id: k, message: `${labels[k as FieldName] ?? ""}: ${t(m!)}` }));

  return (
    <ToolPage>
      <BackLink to={prev} />
      <ErrorSummary items={summary} />
      <form noValidate onSubmit={onContinue} data-question={id}>
        <Caption id={id} kind={f.kind} />
        <div class="grid gap-8">
          <Body id={id} f={f} set={set} err={err} setForm={props.setForm} />
        </div>
        <div class="mt-10">
          <Button type="submit" arrow full>
            {t("wiz.next")}
          </Button>
        </div>
      </form>
    </ToolPage>
  );
}

/** Short names for each answer, used in the error summary ("Date of the accident: Enter a real date"). */
function fieldLabels(t: (k: string) => string): Partial<Record<FieldName, string>> {
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

function Heading(props: { children: string }) {
  return (
    <h1
      id={PAGE_TITLE_ID}
      tabIndex={-1}
      class="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground outline-none sm:text-4xl"
    >
      {props.children}
    </h1>
  );
}

const yesNo = (t: (k: string) => string) => [
  { value: "yes", label: t("f.yes") },
  { value: "no", label: t("f.no") },
];

/** The answers each page collects. */
function Body(props: { id: QuestionId; f: FormState; set: Set; err: Err; setForm: (f: FormState) => void }) {
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
          heading
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
          heading
          label={t("q.accidentDate.title")}
          hint={t("q.accidentDate.hint")}
          value={f.accidentDate}
          error={err("accidentDate")}
          onInput={(v) => set("accidentDate", v)}
        />
      );
    case "role":
      return (
        <Radios
          id="victimRole"
          heading
          label={t("q.role.title")}
          value={f.victimRole}
          error={err("victimRole")}
          onChange={(v) => set("victimRole", v as FormState["victimRole"])}
          options={opt("f.role.", ROLES)}
        />
      );
    case "vehicle":
      return (
        <Radios
          id="offendingVehicle"
          heading
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
          heading
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
        <>
          <Radios
            id="claimFiled"
            heading
            size="compact"
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
        </>
      );
    case "state": {
      const zones = rules.minimumWages[f.state]?.zones ?? [];
      return (
        <>
          <Select
            id="state"
            heading
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
        </>
      );
    }
    case "age":
      return (
        <TextInput
          id="age"
          heading
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
        <Radios
          id="employment"
          heading
          label={t("q.work.title")}
          value={f.employment}
          error={err("employment")}
          onChange={(v) => set("employment", v as FormState["employment"])}
          options={opt("f.emp.", EMPLOYMENT)}
        />
      );
    case "occupation":
      return (
        <Select
          id="occupationCode"
          heading
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
          heading
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
        <>
          <Heading>{t("q.income.title")}</Heading>
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
              <div class="grid gap-6">
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
              </div>
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
        </>
      );
    }
    case "pension":
      return (
        <>
          <Heading>{t("q.pension.title")}</Heading>
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
        </>
      );
    case "family":
      return (
        <>
          <Heading>{t("q.family.title")}</Heading>
          <Radios
            id="married"
            size="compact"
            label={t("f.married")}
            value={f.married}
            error={err("married")}
            onChange={(v) =>
              props.setForm({ ...f, married: v as FormState["married"], spouse: v === "yes" ? f.spouse : "" })
            }
            options={yesNo(t)}
          />
          {f.married === "yes" && (
            <Reveal>
              <Radios
                id="spouse"
                size="compact"
                label={t("f.spouse")}
                value={f.spouse}
                error={err("spouse")}
                onChange={(v) => set("spouse", v as FormState["spouse"])}
                options={yesNo(t)}
              />
            </Reveal>
          )}
          {f.kind === "death" && (
            <>
              <p class="text-muted-foreground">{t("q.family.hint")}</p>
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
            </>
          )}
        </>
      );
    case "disability":
      return (
        <>
          <Heading>{t("q.disability.title")}</Heading>
          <p class="-mt-4 text-muted-foreground">{t("q.disability.hint")}</p>
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
            size="compact"
            label={t("f.certificateBasis")}
            value={f.certificateBasis}
            onChange={(v) => set("certificateBasis", v as FormState["certificateBasis"])}
            options={[
              ...opt("f.basis.", ["whole_body", "limb"]),
              { value: "unknown", label: t("opt.notSure") },
            ]}
          />
        </>
      );
    case "workNow":
      return (
        <Radios
          id="workCapacity"
          heading
          optional
          label={t("q.workNow.title")}
          value={f.workCapacity}
          onChange={(v) => set("workCapacity", v as FormState["workCapacity"])}
          options={[...opt("f.work.", ["full", "with_difficulty", "lighter_only", "none"]), notSure]}
        />
      );
    case "treatment":
      return (
        <>
          <Heading>{t("q.treatment.title")}</Heading>
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
          <Checkbox
            id="permanentAttendant"
            label={t("f.permanentAttendant")}
            checked={f.permanentAttendant}
            onChange={(v) => set("permanentAttendant", v)}
          />
        </>
      );
    case "medical":
      return (
        <>
          <Heading>{t("q.medical.title")}</Heading>
          {f.kind === "death" && <p class="-mt-4 text-muted-foreground">{t("q.medical.hint.death")}</p>}
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
        </>
      );
  }
}

/** "15 6 2025" as typed, shown back the way Indians write dates. */
function showDate(raw: string): string {
  const d = parseDate(raw);
  if (d.status !== "ok") return raw;
  const [y, m, day] = d.iso.split("-");
  return `${day}/${m}/${y}`;
}

/** What each page's answers say, for "Check your answers". */
function answerText(
  id: QuestionId,
  f: FormState,
  t: (k: string, v?: Record<string, string | number>) => string,
  lang: string,
): string {
  const or = (s: string) => s || t("check.none");
  const pick = (prefix: string, v: string) =>
    v === "unknown" ? t("opt.notSure") : v ? t(`${prefix}${v}`) : "";
  const money = (v: string, per?: string) => (v ? `₹${v}${per ? ` ${per}` : ""}` : "");
  switch (id) {
    case "kind":
      return or(pick("f.kind.", f.kind));
    case "accidentDate":
      return or(showDate(f.accidentDate));
    case "role":
      return or(pick("f.role.", f.victimRole));
    case "vehicle":
      return or(pick("opt.vehicle.", f.offendingVehicle));
    case "s164":
      return or(pick("f.s164.", f.s164));
    case "claim":
      return f.claimFiled === "yes"
        ? t("check.filedOn", { d: showDate(f.claimFiledDate) })
        : or(f.claimFiled ? t("f.no") : "");
    case "state":
      return or(
        f.state
          ? (f.state === "OTHER" ? t("f.state.other") : t(`state.${f.state}`)) +
              (f.zone ? ` · ${f.zone}` : "")
          : "",
      );
    case "age":
      return or(f.age ? `${f.age} ${t("unit.yearsOld")}` : "");
    case "work":
      return or(pick("f.emp.", f.employment));
    case "occupation": {
      const o = rules.occupations.occupations.find((x) => x.code === f.occupationCode);
      return o ? (lang === "hi" ? o.hi : o.en) : t("f.occupation.none");
    }
    case "course":
      return or(pick("f.course.", f.studentCourse));
    case "income": {
      const parts = [
        f.proof ? t(`f.proof.${f.proof}`) : "",
        money(f.monthlySalary, t("unit.month")),
        money(f.itrAnnualIncome, t("unit.year")),
        f.proof !== "salary_slip" && f.proof !== "itr" ? money(f.claimedMonthly, t("unit.month")) : "",
      ].filter(Boolean);
      return or(parts.join(" · "));
    }
    case "pension":
      return or(
        [money(f.pensionMonthly, t("unit.month")), money(f.familyPensionMonthly, t("unit.month"))]
          .filter(Boolean)
          .join(" · "),
      );
    case "family": {
      const parts = [
        f.married === "yes" ? t("check.married") : f.married === "no" ? t("check.unmarried") : "",
        f.married === "yes" && f.spouse ? t(f.spouse === "yes" ? "check.spouse" : "check.noSpouse") : "",
        f.kind === "death" && f.children !== "" ? t("check.children", { n: f.children }) : "",
        f.kind === "death" && f.parents !== "" ? t("check.parents", { n: f.parents }) : "",
        f.kind === "death" && f.dependentParents !== ""
          ? t("check.depParents", { n: f.dependentParents })
          : "",
      ].filter(Boolean);
      return or(parts.join(" · "));
    }
    case "disability":
      return or(
        [f.certificatePct ? `${f.certificatePct}%` : "", pick("f.basis.", f.certificateBasis)]
          .filter(Boolean)
          .join(" · "),
      );
    case "workNow":
      return or(pick("f.work.", f.workCapacity));
    case "treatment":
      return or(
        [
          f.monthsOffWork ? `${f.monthsOffWork} ${t("unit.months")}` : "",
          f.hospitalDays ? `${f.hospitalDays} ${t("unit.days")}` : "",
          f.permanentAttendant ? t("check.attendant") : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
    case "medical":
      return or(
        [money(f.medicalBills), f.cashlessPaid ? `${t("f.cashless")}: ₹${f.cashlessPaid}` : ""]
          .filter(Boolean)
          .join(" · "),
      );
  }
}

const TITLES: Record<QuestionId, string> = {
  kind: "q.kind.title",
  accidentDate: "q.accidentDate.title",
  role: "q.role.title",
  vehicle: "q.vehicle.title",
  s164: "q.s164.title",
  claim: "q.claim.title",
  state: "q.state.title",
  age: "q.age.title",
  work: "q.work.title",
  occupation: "q.occupation.title",
  course: "q.course.title",
  income: "q.income.title",
  pension: "q.pension.title",
  family: "q.family.title",
  disability: "q.disability.title",
  workNow: "q.workNow.title",
  treatment: "q.treatment.title",
  medical: "q.medical.title",
};

/** "Check your answers": the hub before the result, and where "Change answers" comes back to. */
export function CheckPage(props: { form: FormState }) {
  const t = useT();
  const lang = useLang();
  const f = props.form;
  const rows = activePath(f).map((id) => ({
    id,
    key: t(TITLES[id]),
    value: answerText(id, f, t, lang),
    href: href(id, true),
  }));
  return (
    <ToolPage>
      <h1
        id={PAGE_TITLE_ID}
        tabIndex={-1}
        class="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground outline-none sm:text-4xl"
      >
        {t("check.title")}
      </h1>
      <p class="mt-3 text-muted-foreground">{t("check.lead")}</p>
      <div class="mt-8">
        <SummaryList rows={rows} change={t("check.change")} />
      </div>
      <div class="mt-10">
        <LinkButton href="#/result" full>
          {t("check.continue")}
        </LinkButton>
      </div>
    </ToolPage>
  );
}

const STOP_COPY: Record<StopCode, { title: string; body: string }> = {
  owner_driver: { title: "warn.OWNER_DRIVER_NO_166", body: "elig.owner" },
  unidentified: { title: "warn.UNIDENTIFIED_USE_HIT_AND_RUN", body: "elig.unidentified" },
  s164_insurer: { title: "warn.S164_LAPSES_166", body: "elig.s164" },
};

/** An answer that ends or redirects a section 166 claim: say why, say what to do, offer to change the answer. */
export function StopPage(props: { code: StopCode; onRestart: () => void }) {
  const t = useT();
  const c = STOP_COPY[props.code];
  return (
    <ToolPage>
      <BackLink to={href(STOP_QUESTION[props.code])} />
      <div data-stop={props.code}>
        <h1
          id={PAGE_TITLE_ID}
          tabIndex={-1}
          class="font-heading text-3xl font-bold leading-tight tracking-tight text-foreground outline-none sm:text-4xl"
        >
          {t(c.title)}
        </h1>
        <div class="mt-6">
          <Notice severity="stop" title={t("elig.title")}>
            {t(c.body)}
          </Notice>
        </div>
        <h2 class="mt-8 font-heading text-xl font-semibold">{t("stop.next")}</h2>
        <ul class="mt-3 list-disc space-y-2 pl-6 text-foreground">
          {props.code === "unidentified" && (
            <li>
              {t("stop.hnr", {
                death: formatINR(rules.statutory.hit_and_run_s161.death),
                hurt: formatINR(rules.statutory.hit_and_run_s161.grievous_hurt),
              })}
            </li>
          )}
          <li>{t("res.next.1")}</li>
        </ul>
        <div class="mt-10 flex flex-wrap gap-3">
          <LinkButton href={href(STOP_QUESTION[props.code])}>{t("stop.change")}</LinkButton>
          <Button secondary onClick={props.onRestart}>
            {t("app.restart")}
          </Button>
        </div>
      </div>
    </ToolPage>
  );
}

export { focusField };
