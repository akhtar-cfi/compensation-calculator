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

const radio = (page: Page, name: string, value: string) =>
  page.locator(`input[name="${name}"][value="${value}"]`).check();

/** Types a date (YYYY-MM-DD) into the three day / month / year boxes. */
export async function fillDate(page: Page, id: string, iso: string) {
  const [y, m, d] = iso.split("-");
  await page.fill(`#${id}-day`, String(Number(d)));
  await page.fill(`#${id}-month`, String(Number(m)));
  await page.fill(`#${id}-year`, y!);
}

const select = (page: Page, id: string, value: string) => page.selectOption(`#${id}`, value);

/** Answers one question on the page from an engine input, as a person would. */
async function answer(page: Page, q: string, input: EstimateInput) {
  const v = input.victim;
  const inc = v.income;
  const fam = input.family;
  const inj = input.injury;
  switch (q) {
    case "kind":
      return radio(page, "kind", input.kind);
    case "accidentDate":
      return fillDate(page, "accidentDate", input.accidentDate);
    case "role":
      return select(page, "victimRole", input.victimRole ?? "other");
    case "vehicle":
      return radio(page, "offendingVehicle", input.offendingVehicle ?? "unknown");
    case "s164":
      return radio(page, "s164", input.s164 ?? "unknown");
    case "claim":
      await radio(page, "claimFiled", input.claimFiledDate ? "yes" : "no");
      if (input.claimFiledDate) await fillDate(page, "claimFiledDate", input.claimFiledDate);
      return;
    case "state":
      await select(page, "state", input.state);
      if (input.zone) await select(page, "zone", input.zone);
      return;
    case "age":
      return page.fill("#age", String(v.ageYears));
    case "work":
      return select(page, "employment", v.employment);
    case "occupation":
      return select(page, "occupationCode", v.occupationCode ?? "");
    case "course":
      return radio(page, "studentCourse", v.studentCourse ?? "unknown");
    case "income":
      if (await page.locator('input[name="proof"]').count()) {
        const proof = inc?.proof === "salary_slip" || inc?.proof === "itr" ? inc.proof : "none";
        await radio(page, "proof", proof);
      }
      if (inc?.monthlySalary !== undefined) await page.fill("#monthlySalary", String(inc.monthlySalary));
      if (inc?.monthlyTax !== undefined) await page.fill("#monthlyTax", String(inc.monthlyTax));
      if (inc?.itrAnnualIncomes?.[0])
        await page.fill("#itrAnnualIncome", String(inc.itrAnnualIncomes[0].income));
      if (inc?.claimedMonthly !== undefined) await page.fill("#claimedMonthly", String(inc.claimedMonthly));
      return;
    case "pension":
      if (inc?.pensionMonthly !== undefined) await page.fill("#pensionMonthly", String(inc.pensionMonthly));
      if (inc?.familyPensionMonthly !== undefined)
        await page.fill("#familyPensionMonthly", String(inc.familyPensionMonthly));
      return;
    case "family":
      await radio(page, "married", fam.married ? "yes" : "no");
      if (fam.married) await radio(page, "spouse", fam.spouse ? "yes" : "no");
      if (input.kind === "death") {
        await page.fill("#children", String(fam.children ?? 0));
        await page.fill("#parents", String(fam.parents ?? 0));
        if (fam.dependentParents !== undefined)
          await page.fill("#dependentParents", String(fam.dependentParents));
      }
      return;
    case "disability":
      if (inj?.certificatePct !== undefined) await page.fill("#certificatePct", String(inj.certificatePct));
      if (inj?.certificateBasis) await radio(page, "certificateBasis", inj.certificateBasis);
      return;
    case "workNow":
      if (inj?.workCapacity) await radio(page, "workCapacity", inj.workCapacity);
      return;
    case "treatment":
      if (inj?.monthsOffWork !== undefined) await page.fill("#monthsOffWork", String(inj.monthsOffWork));
      if (inj?.hospitalDays !== undefined) await page.fill("#hospitalDays", String(inj.hospitalDays));
      if (inj?.permanentAttendant) await page.check("#permanentAttendant");
      return;
    case "medical":
      if (input.medical?.bills !== undefined) await page.fill("#medicalBills", String(input.medical.bills));
      if (input.medical?.paidByCashlessScheme !== undefined)
        await page.fill("#cashlessPaid", String(input.medical.paidByCashlessScheme));
      return;
    default:
      throw new Error(`no answer for question ${q}`);
  }
}

/**
 * Fills the one-page form from an engine input, the way a person would: top to bottom, answering each question as
 * it appears (an answer can bring up a follow-up below it). Returns what the estimate panel then shows: an
 * estimate, or a stop (an answer that ends the claim).
 */
export async function fillForm(page: Page, input: EstimateInput): Promise<"result" | "stop"> {
  await page.goto("#/");
  await page.getByTestId("restart").click(); // from a clean form, whatever an earlier step left
  await expect(page.locator("[data-question]").first()).toBeVisible();
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
