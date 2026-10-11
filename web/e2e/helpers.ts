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

const radio = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();
const next = (page: Page) => page.getByRole("button", { name: /^(Next|See the estimate)$/ }).click();

/** Answers the wizard with an engine input, the way a person would, and lands on the result page. */
export async function fillWizard(page: Page, input: EstimateInput) {
  // Always arrive by a real change of route (never by re-opening the URL already shown), as a person clicking
  // "Estimate" or "Change answers" would.
  await page.goto("#/");
  await page.goto("#/estimate");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The accident");
  await radio(page, "kind", input.kind);
  await page.fill("#accidentDate", input.accidentDate);
  if (input.claimFiledDate) await page.fill("#claimFiledDate", input.claimFiledDate);
  await page.selectOption("#state", input.state);
  if (input.zone) await page.selectOption("#zone", input.zone);
  if (input.victimRole) await page.selectOption("#victimRole", input.victimRole);
  if (input.offendingVehicle) await radio(page, "offendingVehicle", input.offendingVehicle);
  if (input.s164) await radio(page, "s164", input.s164);
  await next(page);

  const v = input.victim;
  await page.fill("#age", String(v.ageYears));
  await page.selectOption("#employment", v.employment);
  if (v.occupationCode) await page.selectOption("#occupationCode", v.occupationCode);
  if (v.studentCourse) await radio(page, "studentCourse", v.studentCourse);
  const inc = v.income;
  if (inc?.proof && inc.proof !== "none") await radio(page, "proof", inc.proof);
  if (inc?.monthlySalary !== undefined) await page.fill("#monthlySalary", String(inc.monthlySalary));
  if (inc?.monthlyTax !== undefined) await page.fill("#monthlyTax", String(inc.monthlyTax));
  if (inc?.itrAnnualIncomes?.[0]) await page.fill("#itrAnnualIncome", String(inc.itrAnnualIncomes[0].income));
  if (inc?.claimedMonthly !== undefined) await page.fill("#claimedMonthly", String(inc.claimedMonthly));
  if (inc?.pensionMonthly !== undefined) await page.fill("#pensionMonthly", String(inc.pensionMonthly));
  if (inc?.familyPensionMonthly !== undefined)
    await page.fill("#familyPensionMonthly", String(inc.familyPensionMonthly));
  await next(page);

  const fam = input.family;
  await radio(page, "married", fam.married ? "yes" : "no");
  if (fam.married) await radio(page, "spouse", fam.spouse ? "yes" : "no");
  if (fam.children !== undefined) await page.fill("#children", String(fam.children));
  if (fam.parents !== undefined) await page.fill("#parents", String(fam.parents));
  if (fam.dependentParents !== undefined) await page.fill("#dependentParents", String(fam.dependentParents));
  await next(page);

  const inj = input.injury;
  if (inj?.certificatePct !== undefined) await page.fill("#certificatePct", String(inj.certificatePct));
  if (inj?.certificateBasis) await radio(page, "certificateBasis", inj.certificateBasis);
  if (inj?.workCapacity) await radio(page, "workCapacity", inj.workCapacity);
  if (inj?.monthsOffWork !== undefined) await page.fill("#monthsOffWork", String(inj.monthsOffWork));
  if (inj?.hospitalDays !== undefined) await page.fill("#hospitalDays", String(inj.hospitalDays));
  if (inj?.permanentAttendant) await page.check("#permanentAttendant");
  if (input.medical?.bills !== undefined) await page.fill("#medicalBills", String(input.medical.bills));
  if (input.medical?.paidByCashlessScheme !== undefined)
    await page.fill("#cashlessPaid", String(input.medical.paidByCashlessScheme));
  await next(page);
  await expect(page).toHaveURL(/#\/result$/);
  await expect(page.locator("[data-testid=headline], [data-testid=no-estimate]")).toBeVisible();
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
