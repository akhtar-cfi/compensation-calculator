import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { parse } from "yaml";
import { estimate } from "../../src/engine/index.js";
import { EstimateInputSchema, type EstimateInput } from "../../src/engine/types.js";
import { REPO_ROOT, loadRules } from "../../src/rules/load.js";

export const rules = loadRules();

/** Every test fails if the page throws or logs an error, and the report shows the message. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      // Against the deployed site, test visits must not be counted: visit reports are answered here instead.
      if (process.env.E2E_BASE_URL)
        await page.route("**/_vercel/insights/**", (r) =>
          r.request().method() === "POST" ? r.fulfill({ status: 204 }) : r.continue(),
        );
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}\n${e.stack ?? ""}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
      });
      await use(errors);
      expect(errors, "errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Today in the browser's sense (the page uses the local date as its as-of date). */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function examples(): { name: string; input: EstimateInput }[] {
  const dir = join(REPO_ROOT, "examples");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => ({ name: f, input: EstimateInputSchema.parse(parse(readFileSync(join(dir, f), "utf8"))) }));
}

export const expected = (input: EstimateInput) => estimate(rules, input, { asOf: today() });

export const radio = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();

/** Types a date (YYYY-MM-DD) into the three day / month / year boxes. */
export async function fillDate(page: Page, id: string, iso: string) {
  const [y, m, d] = iso.split("-");
  await page.fill(`#${id}-day`, String(Number(d)));
  await page.fill(`#${id}-month`, String(Number(m)));
  await page.fill(`#${id}-year`, y!);
}

/** Picks the accident month and year (the quick question). */
export async function pickMonth(page: Page, iso: string) {
  const [y, m] = iso.split("-");
  await page.selectOption("#accidentDate-month", String(Number(m)));
  await page.selectOption("#accidentDate-year", y!);
}

/** Opens a group of optional details, as a person would by tapping its title. */
export async function openGroup(page: Page, id: string) {
  const g = page.locator(`details[data-question="${id}"]`);
  if (!(await g.evaluate((d: HTMLDetailsElement) => d.open))) await g.locator("summary").click();
}

/** The page's three-way role question, from the engine's role. */
const role = (r: EstimateInput["victimRole"]) =>
  r === "owner_driver_single_vehicle" || r === "driver_of_involved_vehicle" ? r : "not_driving";

/** Answers one block on the page from an engine input, as a person would. */
async function answer(page: Page, block: string, input: EstimateInput) {
  const v = input.victim;
  const inc = v.income;
  const fam = input.family;
  const inj = input.injury;
  const traced =
    input.offendingVehicle === "unidentified" ? "no" : input.offendingVehicle ? "yes" : "unknown";
  switch (block) {
    case "kind":
      return radio(page, "kind", input.kind);
    case "checks":
      await radio(page, "victimRole", role(input.victimRole));
      await radio(page, "vehicleTraced", traced);
      return radio(
        page,
        "s164",
        input.s164 === "none" || input.s164 === "accepted_via_insurer" ? input.s164 : "unknown",
      );
    case "age":
      return page.fill("#age", String(v.ageYears));
    case "work":
      await radio(page, "employment", v.employment);
      if (await page.locator('input[name="proof"]').count()) {
        const proof = inc?.proof === "salary_slip" || inc?.proof === "itr" ? inc.proof : "none";
        await radio(page, "proof", proof);
      }
      if (inc?.monthlySalary !== undefined) await page.fill("#monthlySalary", String(inc.monthlySalary));
      if (inc?.itrAnnualIncomes?.[0])
        await page.fill("#itrAnnualIncome", String(inc.itrAnnualIncomes[0].income));
      if (v.occupationCode && (await page.locator("#occupationCode").count()))
        await page.selectOption("#occupationCode", v.occupationCode);
      if (inc?.pensionMonthly !== undefined) await page.fill("#pensionMonthly", String(inc.pensionMonthly));
      return;
    case "family":
      await radio(page, "married", fam.married ? "yes" : "no");
      if (input.kind === "death") {
        if (fam.married) await radio(page, "spouse", fam.spouse ? "yes" : "no");
        await page.fill("#children", String(fam.children ?? 0));
        await radio(page, "parents", String(fam.parents ?? 0));
      }
      return;
    case "injury":
      if (inj?.certificatePct !== undefined) {
        await page.fill("#certificatePct", String(inj.certificatePct));
        await radio(page, "certificateBasis", inj.certificateBasis ?? "unknown");
      } else await page.check("#noCertificate");
      return page.fill("#monthsOffWork", String(inj?.monthsOffWork ?? 0));
    case "when":
      return pickMonth(page, input.accidentDate);
    case "state":
      return radio(page, "state", input.state);
    case "dates": {
      const day = Number(input.accidentDate.split("-")[2]);
      if (day === 1 && !input.claimFiledDate) return;
      await openGroup(page, "dates");
      if (day !== 1) await page.fill("#accidentDay", String(day));
      if (input.claimFiledDate) {
        await radio(page, "claimFiled", "yes");
        await fillDate(page, "claimFiledDate", input.claimFiledDate);
      }
      return;
    }
    case "insurance":
      if (!input.offendingVehicle) return;
      await openGroup(page, "insurance");
      return radio(page, "vehicleInsured", input.offendingVehicle === "identified_insured" ? "yes" : "no");
    case "earnings": {
      const todo = [
        inc?.monthlyTax,
        inc?.claimedMonthly,
        inc?.familyPensionMonthly,
        v.studentCourse,
        input.zone,
      ];
      if (todo.every((x) => x === undefined)) return;
      await openGroup(page, "earnings");
      if (inc?.monthlyTax !== undefined) await page.fill("#monthlyTax", String(inc.monthlyTax));
      if (inc?.claimedMonthly !== undefined) await page.fill("#claimedMonthly", String(inc.claimedMonthly));
      if (inc?.familyPensionMonthly !== undefined)
        await page.fill("#familyPensionMonthly", String(inc.familyPensionMonthly));
      if (v.studentCourse) await radio(page, "studentCourse", v.studentCourse);
      if (input.zone) await page.selectOption("#zone", input.zone);
      return;
    }
    case "dependants":
      if (fam.dependentParents === undefined) return;
      await openGroup(page, "dependants");
      return page.fill("#dependentParents", String(fam.dependentParents));
    case "recovery":
      if (!inj?.workCapacity && !inj?.permanentAttendant) return;
      await openGroup(page, "recovery");
      if (inj.workCapacity) await radio(page, "workCapacity", inj.workCapacity);
      if (inj.permanentAttendant) await page.check("#permanentAttendant");
      return;
    case "medical":
      if (input.medical?.bills === undefined) return;
      await openGroup(page, "medical");
      await page.fill("#medicalBills", String(input.medical.bills));
      if (input.medical.paidByCashlessScheme !== undefined)
        await page.fill("#cashlessPaid", String(input.medical.paidByCashlessScheme));
      return;
    default:
      throw new Error(`no answer for block ${block}`);
  }
}

/**
 * Fills the page from an engine input, the way a person would: the quick steps top to bottom (an answer can bring
 * up a follow-up), then any details the input has. Returns what the estimate then shows: an estimate, or a stop.
 */
export async function fillForm(page: Page, input: EstimateInput): Promise<"result" | "stop"> {
  await page.goto("#/");
  await expect(page.locator("[data-question]").first()).toBeVisible();
  // From a clean form, whatever an earlier step left ("Start again" shows only when there are answers).
  if (await page.getByTestId("restart").count()) {
    await page.getByTestId("restart").click();
    await page.getByTestId("restart-confirm").click();
  }
  const done = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const ids = await page
      .locator("[data-question]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-question")!));
    const next = ids.find((id) => !done.has(id));
    if (!next) break;
    done.add(next);
    await answer(page, next, input);
  }
  const shown = page.locator("#result [data-testid=headline], #result [data-testid=no-estimate]");
  await expect(shown.first()).toBeVisible();
  if (await page.locator("#result [data-testid=headline]").count()) return "result";
  return "stop";
}

/** Fails the test if the page asks for anything outside its own origin (fonts, data and code are all bundled). */
export function guardRequests(page: Page, baseURL: string): string[] {
  const outside: string[] = [];
  const origin = new URL(baseURL).origin;
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) outside.push(u);
  });
  return outside;
}
