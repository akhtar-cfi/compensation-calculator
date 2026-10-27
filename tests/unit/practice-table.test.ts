import { describe, expect, it } from "vitest";
import { parseAwardTable, parseAwardTables } from "../../src/practice/table.js";

// Synthetic tables in the layouts Delhi tribunals use. No real award is reproduced: names are
// placeholders and the figures are made up, but the line structure follows the forms.

const FORM_XV = `
      the summary of computation is annexed as Annexure A.

            SUMMARY OF COMPUTATION OF AWARD AMOUNT IN DEATH CASES IN FORM XV
       1. Date of accident                    :    23.09.2018
       2. Name of the deceased                :    AAA BBB
       3. Age of the deceased                 :    24 years and 8 months
       4. Occupation of the deceased          :    Minimum wages for matriculates
                                                   in Delhi.
       5. Income of the deceased             :     Rs. 16,858/- per month
       6. Name, age and relationship of legal representatives of deceased:
          (i)  CCC DDD          50 years        Mother
          (ii) EEE DDD          55 years        Father
           Computation of Compensation
 Sr.                    Heads                      Amount Awarded
  7          Income of the deceased (A)              Rs.16,858/-
  8           Add-Future Prospects (B)              Rs.6,743.2/-
  9            Less-Personal expenses of            Rs.11,800.6/-
               the deceased (C)
 10            Monthly        loss      of          Rs.11,800.6/-
               dependency
               [(A+B) – C = D]
 11            Annual loss of dependency           Rs.1,41,607.2/-
               (D x 12)
 12            Multiplier (E)                             18
 13            Total loss of dependency             Rs.25,48,930/-
               (D x 12 x E = F)
 14            Medical Expenses (G)                       Nil
 15            Compensation for loss of                   Nil
               love and affection (H)
 16            Compensation for loss of             Rs.96,800/-
               consortium (I)
 17            Compensation for loss of             Rs.18,150/-
               estate (J)
 18            Compensation        towards          Rs.18,150/-
               funeral expenses (K)
 19            TOTAL COMPENSATION                Rs.26,82,030/-
               (F + G + H + I + J+K =L)
20       RATE       OF      INTEREST 7.5% pa from date of filing of
         AWARDED                         claim petition till realisation.
21       Interest amount up to the date           Rs.7,90,698.32
         of award (M)
26       Next date for compliance of 12.12.2022
`;

const FORM_XVI = `
 SUMMARY OF THE COMPUTATION OF AWARD IN INJURY
               CASES IN FORM XVI
   1.     Date of accident             : 10.09.2018
   2.     Name of the injured          : FFF GGG
   3.     Age of the injured           : 22 years
   4.     Occupation of the injured    : Minimum wages of
                                         unskilled worker in Delhi
   5.     Income of the injured        : Rs.14,000/- per month
   9.     Whether any permanent : 40%
          disability?
  10.                  Computation of Compensation
  11.     Pecuniary Loss
   (i)    Expenditure on treatment       : Rs.2,700/-
  (ii)    Expenditure on conveyance : Rs.10,000/-
  (iii)   Expenditure on special diet : Rs.15,000/-
  (iv)    Cost of nursing/attendant      : Rs.30,000/-
   (v)    Loss of earning capacity       : Nil
  (vi)  Loss of Income                   : Rs.42,000/-
  (vii) Any other loss which may : Nil
        require any special treatment
  12.     Non-pecuniary Loss:
   (i)    Compensation for mental        : Rs.50,000/-
          and physical shock
  (ii)    Pain and suffering             : Rs.30,000/-
  (iii)   Loss of amenities of life      : Rs.15,000/-
  (iv)    Dis-figuration                 : Rs.10,000/-
   (v)    Loss of marriage prospects : Nil
 13.      Disability resulting in
          loss of earning capacity
  (i)     Percentage of disability : 40% permanent
          assessed
 (iii)    Percentage of loss of : 20%
          earning capacity in relation to disability
 (iv)     Loss of future income          : Rs.7,25,760/-
  14.     Total Compensation               Rs.9,30,460/-
  15.     Interest Awarded               : 7.5% pa from date of filing
  21.     Next date for compliance      : 03.12.2024
`;

describe("Delhi award tables", () => {
  it("reads a Form XV death table with its column layout", () => {
    const t = parseAwardTable(FORM_XV)!;
    expect(t.form).toBe("XV");
    expect(t.kind).toBe("death");
    expect(t.accident_date).toBe("2018-09-23");
    expect(t.age).toBe(24);
    expect(t.income_monthly).toBe(16858);
    expect(t.fp_pct).toBe(40);
    expect(t.deduction).toBeCloseTo(0.5, 3);
    expect(t.multiplier).toBe(18);
    expect(t.heads).toEqual({
      loss_of_dependency: 2548930,
      medical: 0,
      love_affection: 0,
      consortium: 96800,
      estate: 18150,
      funeral: 18150,
    });
    expect(t.total).toBe(2682030);
    expect(t.interest_pct).toBe(7.5);
    expect(t.interest_amount).toBe(790698.32);
    expect(t.flags).toEqual([]);
  });

  it("does not keep names: the table's people are not in the result", () => {
    const json = JSON.stringify(parseAwardTable(FORM_XV));
    for (const name of ["AAA", "BBB", "CCC", "DDD", "EEE"]) expect(json).not.toContain(name);
  });

  it("starts at the table, not at the body's mention of it", () => {
    // the body names "the summary of computation" before the form itself
    expect(parseAwardTables(FORM_XV)).toHaveLength(1);
  });

  it("reads a Form XVI injury table, taking the capacity loss from 13(iv) when (v) says Nil", () => {
    const t = parseAwardTable(FORM_XVI)!;
    expect(t.form).toBe("XVI");
    expect(t.kind).toBe("injury");
    expect(t.income_stated).toBe(14000);
    expect(t.disability_pct).toBe(40);
    expect(t.functional_pct).toBe(20);
    expect(t.heads.medical).toBe(2700);
    expect(t.heads.loss_of_income).toBe(42000);
    expect(t.heads.loss_of_earning_capacity).toBe(725760);
    expect(t.heads.loss_of_future_income).toBeUndefined();
    expect(t.heads.disfigurement).toBe(10000);
    expect(t.heads.marriage).toBe(0);
    expect(t.total).toBe(930460);
    expect(t.flags).toEqual([]);
  });

  it("gives the total before a fault share and the reduced total", () => {
    const text = FORM_XV.replace(
      "19            TOTAL COMPENSATION                Rs.26,82,030/-",
      "19            TOTAL COMPENSATION   = Rs.26,82,030/- (after contributory negligence @ 30%) = Rs.18,77,421/-",
    );
    const t = parseAwardTable(text)!;
    expect(t.total).toBe(2682030);
    expect(t.total_after).toBe(1877421);
    expect(t.cn_pct).toBe(30);
  });

  it("reads one table per claim in a common award", () => {
    const second = FORM_XV.replace("23.09.2018", "23.09.2018").replace("Rs.25,48,930/-", "Rs.25,48,930/-");
    const tables = parseAwardTables(`${FORM_XV}\n\n${"filler line\n".repeat(80)}${FORM_XVI}\n${second}`);
    expect(tables.map((t) => t.kind)).toEqual(["death", "injury", "death"]);
  });

  it("flags heads that do not add up to the total, and never corrects them", () => {
    const t = parseAwardTable(FORM_XV.replace("Rs.96,800/-", "Rs.48,400/-"))!;
    expect(t.heads.consortium).toBe(48400);
    expect(t.total).toBe(2682030);
    expect(t.flags).toContain("heads_do_not_add_up");
  });

  it("drops a signature block that interrupts the table", () => {
    const text = FORM_XV.replace(
      " 14            Medical Expenses (G)",
      "                                        Digitally signed\n                              HHH III by HHH III\n                                        Date: 2022.08.26\n                                        16:26:00 +0530\n 14            Medical Expenses (G)",
    );
    const t = parseAwardTable(text)!;
    expect(t.heads.medical).toBe(0);
    expect(t.total).toBe(2682030);
    expect(t.flags).toEqual([]);
  });

  it("works the deduction out from the amount and refuses an impossible one", () => {
    const t = parseAwardTable(FORM_XV)!;
    expect(t.deduction).toBeCloseTo(0.5, 3); // 11,800.6 of 23,601.2
    const bad = parseAwardTable(
      FORM_XV.replace(
        "Rs.11,800.6/-\n               the deceased (C)",
        "Rs.1,41,607/-\n               the deceased (C)",
      ),
    )!;
    expect(bad.deduction).toBeUndefined();
    expect(bad.flags).toContain("deduction_unclear");
  });

  it("marks a table that only points to the award's body", () => {
    const text = `
                   FORM – IV A
 SUMMARY OF COMPUTATION OF AWARD AMOUNT IN DEATH CASES
 1. Date of the accident:- 30.12.2018
 7. Income of the deceased (A)      mentioned in the award
 8. Add-Future Prospects (B)        mentioned in the award
 12. Multiplier (E)                 mentioned in the award
 13. Total loss of dependency (F)   mentioned in the award
 19. TOTAL COMPENSATION             Rs.24,48,000/-
 20. Next date for compliance 12.12.2022`;
    const t = parseAwardTable(text)!;
    expect(t.form).toBe("IV-A");
    expect(t.total).toBe(2448000);
    expect(t.flags).toContain("figures_in_award_body");
  });

  it("reads a label whose value sits between its two lines", () => {
    const text = FORM_XV.replace(
      " 15            Compensation for loss of                   Nil\n               love and affection (H)",
      " 15            Compensation for loss of love and\n                                                          Nil\n               affection (H)",
    );
    expect(parseAwardTable(text)!.heads.love_affection).toBe(0);
  });

  it("takes the total before an interim award when only the remainder is stated", () => {
    const text = FORM_XV.replace(
      "19            TOTAL COMPENSATION                Rs.26,82,030/-",
      "19            TOTAL COMPENSATION                Rs.26,32,030/- (after deducting Rs.50,000/- of the interim award)",
    );
    const t = parseAwardTable(text)!;
    expect(t.total_after).toBe(2632030);
    expect(t.total).toBe(2682030); // the heads' sum
    expect(t.flags).toContain("total_is_after_reduction");
  });

  it("reads an amount typed with dots for commas", () => {
    const t = parseAwardTable(FORM_XV.replace("Rs.16,858/-\n  8", "Rs.16.858.00/-\n  8"))!;
    expect(t.income_monthly).toBe(16858);
  });

  it("takes a worked cell's result, not its first figure", () => {
    const worked = FORM_XV.replace(
      "Rs.11,800.6/-\n               dependency",
      "Rs. 23,601.2/- – 11,800.6/- =\n               dependency\n                                                    11,800.6/-",
    )
      .replace(
        "Rs.1,41,607.2/-\n               (D x 12)",
        "Rs. 11,800.6 x 12 = 1,41,607.2/-\n               (D x 12)",
      )
      .replace(
        "Rs.25,48,930/-\n               (D x 12 x E = F)",
        "(D x 12 x E = 11,800.6 x 12 x 18 = Rs.\n               F)\n                                               25,48,930/-",
      );
    const t = parseAwardTable(worked)!;
    expect(t.heads.loss_of_dependency).toBe(2548930);
    expect(t.flags).not.toContain("monthly_dependency");
    expect(t.flags).not.toContain("dependency_arithmetic");
    // a cell whose result comes first keeps it
    const first = parseAwardTable(FORM_XV.replace("Rs.96,800/-", "Rs.96,800/- (48,400 x 2)"))!;
    expect(first.heads.consortium).toBe(96800);
    // a total the layout ran into the funeral cell is not the funeral's figure
    const runOn = parseAwardTable(
      FORM_XV.replace(
        " 19            TOTAL COMPENSATION                Rs.26,82,030/-\n               (F + G + H + I + J+K =L)",
        "               TOTAL COMPENSATION (F + G + H + I + J+K =L) Rs.26,82,030/-",
      ),
    )!;
    expect(runOn.heads.funeral).toBe(18150);
  });

  it("returns null when there is no table", () => {
    expect(parseAwardTable("The claim petition is dismissed.")).toBeNull();
  });
});
