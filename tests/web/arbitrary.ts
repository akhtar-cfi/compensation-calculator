import fc from "fast-check";
import { Employment } from "../../src/engine/types.js";
import type { FormState } from "../../web/src/form-to-input.js";

// Arbitrary answers, including empty, "Not sure", nonsense numbers and impossible dates.
const str = (vals: string[]) => fc.constantFrom("", ...vals);
export const anyForm: fc.Arbitrary<FormState> = fc.record({
  kind: fc.constantFrom("", "death", "injury"),
  accidentDate: str(["2025-6-", "2025-6-1", "2025-2-30", "2027-1-", "2025--", "x"]),
  claimFiled: fc.constantFrom("", "yes", "no"),
  claimFiledDate: str(["2025-7-1", "2024-1-1", "abc"]),
  state: str(["DL", "CENTRAL", "OTHER"]),
  zone: str(["A", "B"]),
  victimRole: fc.constantFrom("", "not_driving", "driver_of_involved_vehicle", "owner_driver_single_vehicle"),
  vehicleTraced: fc.constantFrom("", "unknown", "yes", "no"),
  vehicleInsured: fc.constantFrom("", "unknown", "yes", "no"),
  s164: fc.constantFrom("", "unknown", "none", "accepted_via_insurer"),
  age: str(["0", "30", "65", "140", "abc"]),
  employment: fc.constantFrom("", ...Employment.options),
  occupationCode: str(["driver", "mason"]),
  studentCourse: fc.constantFrom("", "unknown", "school", "professional"),
  proof: fc.constantFrom("", "none", "salary_slip", "itr"),
  monthlySalary: str(["25000", "-1", "x", "99 crore"]),
  monthlyTax: str(["100", "x", "50000"]),
  itrAnnualIncome: str(["300000", "x"]),
  claimedMonthly: str(["15000", "x"]),
  pensionMonthly: str(["20000", "x"]),
  familyPensionMonthly: str(["5000"]),
  married: fc.constantFrom("", "yes", "no"),
  spouse: fc.constantFrom("", "yes", "no"),
  children: str(["0", "2", "-1", "x", "25"]),
  parents: str(["0", "2", "3"]),
  dependentParents: str(["0", "1", "2", "5", "unknown"]),
  medicalBills: str(["100000", "x"]),
  cashlessPaid: str(["50000", "200000"]),
  certificatePct: str(["40", "120"]),
  noCertificate: fc.boolean(),
  certificateBasis: fc.constantFrom("", "whole_body", "limb", "unknown"),
  workCapacity: fc.constantFrom("", "unknown", "full", "none"),
  functionalPct: str(["50", "200"]),
  monthsOffWork: str(["6", "x"]),
  permanentAttendant: fc.boolean(),
}) as fc.Arbitrary<FormState>;
