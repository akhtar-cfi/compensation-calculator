# Rules reference

_Generated from the rule files (rules 2026.10.0-draft) by `npm run mact -- rules doc --write`. Do not edit by hand;
a test fails if this page and the rule files disagree. How the rules fit together: [methodology](methodology.md)._

**Status:** draft. No rule has been signed off by the legal reviewers yet; every rule below says so.

## Open checks

Not yet confirmed against a primary source:

- Sources without a link to the text yet (2): Jan Vishwas (Amendment of Provisions) Act, 2026 (Act 8 of 2026), amendments to the Motor Vehicles Act; M. Paramesh v VRL Logistics Ltd.
- Delhi (NCT) minimum wage from 2012-04-01: no official order found (no rate used).
- Income tax FY 2012-13: Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.
- Income tax FY 2013-14: Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.
- Income tax FY 2014-15: Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.
- Income tax FY 2015-16: Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.
- Income tax FY 2016-17: Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.
- Income tax FY 2017-18: Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.
- Income tax FY 2019-20: Slabs and the 4% cess confirmed 25 Oct 2026 in the Finance (No. 2) Bill 2019 memorandum (Part III, FY 2019-20).

## How the estimate is decided

One row per step of the calculation: what the calculator does now, the authority, the kind of step, and the legal review's decision on it. Points where no binding rule exists are flagged.

Decisions: Legal review of "Decisions and checks needed" (draft v2, 16 Oct 2026), received 2026-10-24. _Approve_ means the method may be adopted,
_Conditional_ that it may be adopted after the check named, _Hold_ that the calculator must not use the current
automatic rule until its legal basis is settled. _Built_ says whether the calculator already does what the
decision says.

Each step is one of five kinds:

- **Fixed law**: settled law: one value, the same everywhere, cited.
- **Depends on the facts**: depends on evidence the family has: asked, or assumed and said so, or left out.
- **Law split or open**: the judgments are split or silent: a provisional rule and its alternative, each with its judgment (flagged below).
- **Estimate from awards**: an estimate from tribunal awards; never presented as law.
- **Withheld**: not computed automatically until its legal basis is settled.

### Which judgment governs

When judgments on a point differ, this fixed order decides which one the calculator follows:

1. The Supreme Court binds every tribunal. A state's High Court binds the tribunals in that state; another High Court only persuades. A tribunal's award binds no one.
2. Within the same court, a larger bench binds a smaller one, whatever their dates.
3. Two judgments of the same court and bench size that differ are a conflict for a lawyer to settle (one may be per incuriam, or distinguishable). The calculator never chooses between them by date.

Tribunal awards are used only to estimate practice, and are labelled so; they never set a rule.

### Points with no binding rule

11 points are not settled by a binding judgment. Each shows a provisional rule and, where the law
allows two readings, the alternative, until a larger bench, the legislature or the advocate settles it. A
High Court's ruling on one of them binds the tribunals in its own state.

- **A-30 · Income from a salary.** Tax when the salary slip shows none: Vimal Kanwar held it wrong to deduct tax without evidence; Meenakshi upheld a deduction on its own facts.
- **A-18 · Income with no proof (minimum wage).** Which state's wage for someone who works in one state and claims in another: a claim may be filed where the claimant lives or works, where the accident happened, or where the defendant lives (s.166(2)).
- **A-3 · Income for a child who died.** No Supreme Court rule for a child's death in an ordinary claim: Kurvan Ansari's ₹25,000 came from the old s.163A schedule, and Hitesh Patel's skilled wage from an injury case.
- **A-8 · Income for an injured homemaker.** No authority for an injured homemaker: Shishu Pal and Kirti are death cases, and the Delhi High Court has gone both ways (₹10,000 a month in Uma Rani; Shishu Pal refused in Ganga Devi).
- **A-21 · Future prospects.** Future prospects at exactly 50 years old fall at the boundary of two bands.
- **A-10 · Personal deduction.** One dependant who is not a spouse (one child or one parent): Sarla Verma's scale starts at two or three dependants, and Sushila decided only a sole spouse.
- **A-9 · Multiplier for a child under 15.** 15 (Reshma Kumari, three judges, approved by the Constitution Bench) or 18 (Kajal, Hitesh Patel, two judges, which did not discuss it); Reshma Kumari tied its 15 to a schedule since removed.
- **A-12 · Loss of estate, funeral and consortium amounts.** Whether the 10% steps run to the accident date or to the date of decision is before a larger bench (Hasina Yasmin, 17 Dec 2025); no decision found as of 24 Oct 2026.
- **B-2 · Who receives consortium.** Adult children who earned or married, and the parents of a married adult: no judgment read decides them (Sameem Begum's adult children were dependants).
- **B-4 · Time limit for filing the claim.** Late claims: the amended s.166(3) (its text and commencement not yet read here) and how far the Supreme Court's interim directions still apply.
- **D-3 · Delhi minimum wages.** Delhi wages from March 2017 to October 2018: the Delhi High Court quashed the 2017 notification on 4 Aug 2018 and the Supreme Court restored its rates from 1 Nov 2018.

### Income

#### Income from a salary

- **Kind:** Depends on the facts
- **Now:** The monthly salary entered, less income tax: the tax on the slip, or tax worked out from the slabs for the accident's financial year and marked as an estimate.
- **Decided:** Prefer tax returns, Form 16 or payroll records. Estimate tax from the slabs only when enough is known, and say it is an estimate, never tax proved paid (A-30). Rely on Kirti and Meenakshi only for what each actually decided (B-5).
- **Legal review:** A-30 Conditional; B-5 Conditional
- **Authorities:** [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/), paras 61(iii)-(iv); [Meenakshi v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/72618714/), paras 6-13; [Vimal Kanwar v Kishore Dan](https://indiankanoon.org/doc/119587841/), paras 21-23

#### Income from tax returns

- **Kind:** Depends on the facts
- **Now:** Salaried: the latest return before the accident, never an average. Self-employed: the average of up to three returns. Each return is net of its own year's tax (the tax shown on the return when given). A return filed after the accident counts only when records from the time back it, in every figure; otherwise it is left out and the result says what it would add. The website asks for the latest return before the accident and, optionally, its tax.
- **Decided:** Record each return's year, filing date and supporting records. Self-employed: a representative period from the returns; later returns count when supporting records back them. Salaried: no automatic average of three returns (A-5, B-7).
- **Legal review:** A-5 Approve (built); B-7 Approve (built)
- **Authorities:** [Rashmirekha Tripathy v Branch Manager (Legal Claims), Sriram General Insurance Co. Ltd.](https://indiankanoon.org/doc/164414205/), paras 18-20

#### Income with no proof (minimum wage)

- **Kind:** Depends on the facts
- **Now:** The minimum wage on the accident date in the state where the claim is filed, at the skill level of the occupation picked from the calculator's list (low figure: unskilled; unknown occupations are unskilled). A graduate with no particular job shown gets the skilled rate; the highly skilled rate only for someone working as a professional. Central-sphere rates (the construction schedule, lowest city group if none is given) are offered only as the place of work for central-sphere employment, and the result says so; the page no longer suggests them when a state's wages are missing.
- **Decided:** The occupation's wage once the occupation-to-skill list is checked (A-2). Record the accident place, the usual place of work and the filing place separately, and prefer the wage of the established employment (A-18). No generic Central substitute (A-19). The skilled wage for graduates unless a higher category is supported (A-20).
- **Legal review:** A-2 Conditional; A-18 Conditional; A-19 Hold (built); A-20 Approve (built)
- **Authorities:** [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/), paras 10, 12
- **Contested points:** `mw_category`

#### Income for a homemaker who died

- **Kind:** Depends on the facts (death only)
- **Now:** ₹30,000 a month for every homemaker's death in the headline and the high figure (revised 10% every three years from 11 Jun 2026); the low figure uses the state's unskilled minimum wage.
- **Decided:** Ask which roles she performed and whether she also earned. Apply Shishu Pal's ₹30,000, revised cumulatively, where its conditions are met, in addition to her own earnings; otherwise an evidence-based value (Kirti). Check the full computation and the revision dates first (A-1).
- **Legal review:** A-1 Conditional
- **Authorities:** [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/), paras 13, 20, 22; [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/), para 26(c); [Ganga Devi v Rajesh Kumar (Delhi High Court), MAC.APP. 224/2024](https://indiankanoon.org/doc/33193330/)
- **Contested points:** `homemaker_income`

#### Income for a child who died

- **Kind:** Law split or open (death only)
- **Now:** The skilled minimum wage plus 40% future prospects in the headline. The low figure uses ₹25,000 a year × 15 (Kurvan Ansari), so the lost income is always ₹3,75,000.
- **Decided:** Remove the ₹25,000 floor. A notional income justified on the facts, with the accident-period skilled wage as a reference, without claiming a rule that binds every child's death. A short precedent note comes first (A-3). Kurvan Ansari stays in the register for the old s.163A schedule only (B-1).
- **Legal review:** A-3 Conditional; B-1 Approve
- **Authorities:** [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf), paras 9, 15; [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/), para 20; [Kurvan Ansari v Shyam Kishore Murmu](https://indiankanoon.org/doc/117494438/), para 16
- **Contested points:** `minor_death_income`

#### Income for a student

- **Kind:** Depends on the facts
- **Now:** The skilled minimum wage on the accident date, in every figure. Mohinder Kaur's ₹12,000 a month (an accident in 2000) is no longer used.
- **Decided:** No fixed ₹12,000: that judgment is a comparator only (B-8). A valuation from the course, qualifications, expected occupation and the accident-period wages needs a justified method first (A-4).
- **Legal review:** A-4 Approve (built); B-8 Approve (built)
- **Authorities:** [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/), para 12; [Mohinder Kaur v Brij Lal Arora](https://indiankanoon.org/doc/14044956/), para 26

#### Income for a pensioner

- **Kind:** Fixed law
- **Now:** The deceased's own pension, in full, in every figure; a family pension is never deducted, and the website no longer asks for it. After an injury, a pension still paid is not lost income: the person is assessed as a retired person without a pension (the next step). The website asks whether it is still paid; unanswered, it is taken as paid, and the result says what a stopped pension would add.
- **Decided:** Never deduct family pension, in any figure (A-6, B-6). Value the deceased's own pension as lost income; for an injury, account for a pension that continues (still to build).
- **Legal review:** A-6 Approve (built); B-6 Approve (built)
- **Authorities:** [Vimal Kanwar v Kishore Dan](https://indiankanoon.org/doc/119587841/), para 19; [Helen C. Rebello v Maharashtra SRTC](https://indiankanoon.org/doc/1340758/)

#### Income for a retired person without a pension

- **Kind:** Depends on the facts
- **Now:** The low figure counts no income, so only the fixed amounts are paid. The headline uses the unskilled minimum wage, with no future prospects. It also applies to an injured pensioner whose pension is still paid (A-6); a pension smaller than this income therefore gives a lower figure if it stops than if it is still paid, until A-7 replaces this rule.
- **Decided:** Ask whether paid work, a business or valuable household work continued, and use proved earnings or a supported notional income. Never zero, or a wage, from 'retired' alone (A-7).
- **Legal review:** A-7 Conditional
- **Contested points:** `non_earning_elderly`

#### Income for an injured homemaker

- **Kind:** Law split or open (injury only)
- **Now:** The low figure and the headline use the state's unskilled minimum wage. The high figure uses ₹30,000 a month, by analogy with Shishu Pal.
- **Decided:** An evidence-based notional income; ask which household work the person can no longer do and whether care is needed. No automatic ₹30,000 (A-8).
- **Legal review:** A-8 Conditional
- **Authorities:** [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/); [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/), paras 20, 23.4; [Uma Rani v Simranjeet Singh (Delhi High Court)](https://indiankanoon.org/doc/173432675/); [Ganga Devi v Rajesh Kumar (Delhi High Court), MAC.APP. 224/2024](https://indiankanoon.org/doc/33193330/)
- **Contested points:** `injured_homemaker_income`

### The formula

#### Future prospects

- **Kind:** Fixed law
- **Now:** 50, 30 or 15% for a permanent job and 40, 25 or 10% for others, by age; none from 60. At exactly 50 the lower band. Whether the job was permanent and whether the salary is proved are separate answers: without slips the occupation sets the minimum wage, the permanent-job rate is kept, and the result says it rests on proof that the job was permanent.
- **Decided:** Ask for the salary proof and for whether the job was permanent as separate questions (A-17). At exactly 50, the higher band provisionally, then one verified boundary rule (A-21).
- **Legal review:** A-17 Approve (built); A-21 Conditional
- **Authorities:** [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/), paras 61(iii)-(iv); [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/), paras 13-14; [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf), para 25; [Sidram v Divisional Manager, United India Insurance Co. Ltd.](https://indiankanoon.org/doc/77644422/), para 31

#### Personal deduction

- **Kind:** Fixed law (death only)
- **Now:** A half if unmarried; if married, a third (2-3 dependants), a quarter (4-6) or a fifth (more). With one dependant of any kind (spouse, child or parent), a half in the low figure and a third in the headline. An unmarried person gets a third where the answers say a large family lived on their income, whatever its size; for 'not sure', a half, with what a third would add. A parent counts as a dependant only when the answer says so; for 'not sure' the result shows what it would add if they were.
- **Decided:** A third where the spouse is the only dependant, not extended to a sole parent or child (A-10). A half for the unmarried, a third where a large dependent family is shown, with no fixed number (A-11). Parents count as dependants only where support is shown; consortium is decided separately (A-22).
- **Legal review:** A-10 Conditional; A-11 Approve (built); A-22 Approve (built)
- **Authorities:** [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/), paras 14-15 (SCC 30-32); [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf), paras 24, 27
- **Contested points:** `spouse_only_deduction`

#### Multiplier

- **Kind:** Fixed law
- **Now:** From the Sarla Verma table by the age of the person who died or was injured, never split; 5 for every age above 65.
- **Legal review:** A-16 Approve (built)
- **Authorities:** [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/), para 21 and its table (SCC 42); [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf), paras 16-18

#### Multiplier for a child under 15

- **Kind:** Law split or open
- **Now:** The low figure uses 15; the headline and the high figure use 18, for deaths and injuries alike.
- **Decided:** 15 for a child's death provisionally, following the larger bench. A separate precedent note for an injured child, with 18 shown as the alternative supported by later two-judge decisions (A-9).
- **Legal review:** A-9 Conditional
- **Authorities:** [Reshma Kumari v Madan Mohan](https://indiankanoon.org/doc/86908489/), para 40(ii); [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/), para 46; [Divya v National Insurance Co. Ltd.](https://indiankanoon.org/doc/161415879/); [Rushi Thapa v Oriental Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2023/11435/11435_2023_2_1501_56835_Judgement_05-Nov-2024.pdf), para 8; [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/), para 24; [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf), para 13
- **Contested points:** `under_15_multiplier`

#### Loss of estate, funeral and consortium amounts

- **Kind:** Law split or open (death only)
- **Now:** ₹15,000, ₹15,000 and ₹40,000, raised 10% (compounded) for each full three years from 31 Oct 2017 completed by the accident date, in the headline and the low figure: none before 31 Oct 2020, and the base amounts for accidents before 2017. The high figure counts the steps up to the date of decision (three from 31 Oct 2026). A caution gives the decision-date amounts while the point is before a larger bench.
- **Decided:** As now. Check the larger bench's status before each step date; the steps stay cumulative and are never frozen at a fixed number (A-12, B-3).
- **Legal review:** A-12 Conditional (built); B-3 Conditional (built)
- **Authorities:** [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/), para 61(viii); [United India Insurance Co. Ltd. v Satinder Kaur](https://indiankanoon.org/doc/142302016/), para 8(e)(c); [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf), para 19; [Hasina Yasmin v National Insurance Co. Ltd. (reference to a larger bench on the 10% steps)](https://indiankanoon.org/doc/41904479/); [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/)
- **Contested points:** `conventional_escalation_steps`

#### Who receives consortium

- **Kind:** Law split or open (death only)
- **Now:** ₹40,000 plus the same increases for each claiming spouse, child and parent, whatever their age or marriage.
- **Decided:** Consortium for the categories the judgments establish: the spouse, minor children, and the parents of a minor or unmarried child. Not a blanket rule for every claimant; a short note decides the rest (B-2).
- **Legal review:** B-2 Conditional
- **Authorities:** [Magma General Insurance Co. Ltd. v Nanu Ram](https://indiankanoon.org/doc/175246407/), para 8.7; [United India Insurance Co. Ltd. v Satinder Kaur](https://indiankanoon.org/doc/142302016/), paras 8(e)(b), 9.7; [New India Assurance Co. Ltd. v Somwati](https://indiankanoon.org/doc/97624839/), paras 38-40; [Sameem Begum v K. Venkat Swamy](https://indian-supreme-court-judgments.s3.ap-south-1.amazonaws.com/data/pdf/year=2026/english/2026_9_112_124_EN.pdf)

### Injury

#### Lost earning ability

- **Kind:** Depends on the facts (injury only)
- **Now:** A doctor's functional % if given. Otherwise a whole-body certificate as it is, or a limb certificate (or one whose basis is unknown) × 0.5 in the low figure and × 0.53 in the headline, factors taken from Delhi awards. The high figure uses the full %, or 100% if the person cannot work at all.
- **Decided:** The limb factors are not a legal rule and are held. Ask the occupation, the impairment, whether the earlier work or other suitable work is still possible, and use medical or vocational evidence. Factors may appear only in a labelled illustration (A-13).
- **Legal review:** A-13 Hold
- **Authorities:** [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/), paras 7-10 (SCC 9-13); M. Paramesh v VRL Logistics Ltd.; [Reliance General Insurance Co. Ltd. v Priyanka Das](https://indiankanoon.org/doc/142169288/), para 19; Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv
- **Contested points:** `functional_pct`

#### Pain and amenities, travel and diet, marriage prospects

- **Kind:** Estimate from awards (injury only)
- **Now:** Bands from Delhi awards 2024-26: the lower quarter in the low figure, the middle in the headline, the upper quarter or a higher Supreme Court amount in the high figure; marked experimental. Travel and diet, pain (even without a certificate) and an attendant band when no days are given are added to every injury estimate.
- **Decided:** Correct the source awards (amenities left out of Hitesh Patel and Baiju) and present the bands as estimates of tribunal practice, never as amounts the law requires (A-14). Ask about care, hospital stay, travel and diet before adding them; pain stays without a certificate (A-23).
- **Legal review:** A-14 Conditional; A-23 Conditional
- **Authorities:** [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/), paras 5, 10; [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/), paras 27-29; [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf), para 13; [Baiju v The United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf); Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv
- **Contested points:** `non_pecuniary_band`

#### Attendant

- **Kind:** Depends on the facts (injury only)
- **Now:** For life: minimum wage × 12 × multiplier × number of carers (1 or 2), the unskilled wage in the low figure and the headline, semi-skilled in the high figure. During treatment: days × the unskilled monthly wage ÷ 26, or a band if days are not given.
- **Decided:** Care needs first; the semi-skilled or skilled wage as the care requires; unpaid family care counted; temporary and lifelong care kept apart; ÷ 26 only where the wage structure supports it (A-15).
- **Legal review:** A-15 Conditional
- **Authorities:** [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/), paras 21, 22, 25; [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf), paras 9-10
- **Contested points:** `attendant_rate`

#### Earnings lost during treatment by a child

- **Kind:** Fixed law (injury only)
- **Now:** None for an injured child (or a student under 18 valued as a child); treatment, care and future loss stay.
- **Legal review:** A-31 Approve (built)
- **Authorities:** [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/), para 5

### Deductions

#### Medical bills

- **Kind:** Fixed law
- **Now:** Bills less what the cashless treatment scheme paid (s.164B(5)); future medical costs only if entered.
- **Authorities:** [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf), s.164B(5); [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/), para 5

#### The person's own share of fault

- **Kind:** Depends on the facts
- **Now:** Only a percentage entered for the person's own fault cuts the total, whatever their role; another driver's fault is never imputed. The website never asks for one; for the driver of a vehicle involved it shows what 25% and 50% would cost, labelled as illustrations outside the standard amount.
- **Legal review:** A-24 Approve (built); B-9 Approve (built); C-5 Approve (built)
- **Authorities:** [Khenyei v New India Assurance Co. Ltd.](https://indiankanoon.org/doc/79441201/), paras 4, 13, 14, 18; [United India Insurance Co. Ltd. v Satinder Kaur](https://indiankanoon.org/doc/142302016/), para 9.8

#### Order of deductions when fault, cashless payments and ex-gratia meet

- **Kind:** Withheld
- **Now:** Cashless payments come off the medical bills. Where an established fault share and a cashless payment meet, the medical expenses are left out and a caution gives the amount under each order of deduction; the fault cut applies to the rest of the total. Ex-gratia comes off after, capped at the income head as it was before the cut. In rare cases this puts the low figure above the headline.
- **Decided:** Record bills, the scheme-paid part and the rest separately and prevent double payment, but no automatic combined cashless and fault adjustment until a reasoned statutory opinion (A-25). Cut for established fault first, then cap any permitted adjustment at the income head, and flag cases where the order changes the result; needs specific legal approval (A-29).
- **Legal review:** A-25 Hold (built); A-29 Conditional
- **Authorities:** [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf), s.164B(5); [Sarla Devi v Reliance General Insurance Co. Ltd.](https://indiankanoon.org/doc/57068626/), para 19

#### Money already received

- **Kind:** Withheld
- **Now:** Ex-gratia equal to pay comes off loss of dependency after a death (Sarla Devi's situation); after an injury it is recorded and not deducted. An earlier no-fault award (s.164) and interim relief are recorded, not deducted; the result says what a set-off would take away. A hit-and-run payment, refundable under s.163, comes off the total. There is no input for mediclaim, life insurance or provident fund, so none is deducted.
- **Decided:** Record payments as facts and deduct only where the law is clear for that benefit. Ex-gratia only in Sarla Devi's situation, salary-equivalent assistance after a death, and a dependant who does not receive it keeps their share (A-26, B-10). No automatic s.164 set-off (A-28). No interim-relief set-off until the scheme's text is read (B-12). Separate categories for life insurance, personal mediclaim, employer reimbursement, cashless treatment and ex-gratia (B-11).
- **Legal review:** A-26 Conditional; A-28 Hold (built); B-10 Conditional; B-11 Conditional; B-12 Hold (built)
- **Authorities:** [Sarla Devi v Reliance General Insurance Co. Ltd.](https://indiankanoon.org/doc/57068626/), paras 13-19, 22-25; [Helen C. Rebello v Maharashtra SRTC](https://indiankanoon.org/doc/1340758/); [New India Assurance Co. Ltd. v Dolly Satish Gandhi](https://api.sci.gov.in/supremecourt/2025/32269/32269_2025_11_1501_71181_Judgement_15-May-2026.pdf), para 15; [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf), ss.163, 164

### The claim

#### When no estimate is given

- **Kind:** Fixed law
- **Now:** No estimate for an owner driving alone with no other vehicle involved; for a vehicle never traced, where the hit-and-run scheme's amounts are shown (₹2,00,000 for a death or ₹50,000 for grievous hurt for accidents from 1 Apr 2022; ₹25,000 and ₹12,500 under the 1989 scheme before that), with no deduction for cashless treatment; and where no-fault money was accepted through the insurer's settlement, which ends the claim.
- **Decided:** Show the s.161 amounts subject to eligibility and the scheme's conditions, kept apart from s.166 estimates and from cashless treatment, with no deduction for cashless treatment; check which amounts applied to older accidents (C-8).
- **Legal review:** C-8 Approve (built)
- **Authorities:** [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf), ss.161, 166(1); [General Insurance Council, "Hit and Run Motor Accident Compensation Claims" (guide, 15 Aug 2023)](https://www.gicouncil.in/media/4262/hit-and-run-motor-accident-compensation-claims.pdf)

#### Time limit for filing the claim

- **Kind:** Law split or open
- **Now:** When no filing date is given and 6 months or more have passed, a caution says s.166(3) sets 6 months but the Supreme Court has directed that claims not be dismissed as time-barred while it decides the challenge.
- **Decided:** Rewrite around the amended s.166(3) (a further 12 months with sufficient cause) and whatever interim directions still stand. Never say a claim after 18 months is maintainable, or that every claim after 6 months is barred. Mandatory before launch (B-4).
- **Legal review:** B-4 Conditional
- **Authorities:** [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf), s.166(3); Jan Vishwas (Amendment of Provisions) Act, 2026 (Act 8 of 2026), amendments to the Motor Vehicles Act; [Bhagirathi Dash v Union of India, W.P.(C) 166/2024 (interim order on s.166(3) limitation; the 4 Nov 2025 order is not published, the linked order of 17 Feb 2026 continues it)](https://indiankanoon.org/doc/54856662/)

#### Interest and the value of an offer over time

- **Kind:** Estimate from awards
- **Now:** Interest is never in the amount; it is shown at 6, 7.5 and 9% a year for a 6-year wait. The offer check assumes 7.5% interest, a 7% discount rate and no lawyer's fee, each changeable.
- **Decided:** Compensation without interest first, interest separately (s.171), and the discount rate, waiting time and legal costs in an optional module with explained, adjustable inputs. The 12-month disposal target in the amended s.168(4) is not a promised date (C-6).
- **Legal review:** C-6 Conditional
- **Authorities:** [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf), s.171

### How the result is shown

#### How the result is shown

- **Kind:** Fixed law
- **Now:** Three figures (low, headline, high). A bar is drawn only when the high figure is at most 1.75 times the low (2.5 for injuries) and the spread is at least 5% of the headline, with a list of what moves the amount.
- **Decided:** One headline, and alternatives only where the law is split, each with its judgment; for missing facts, 'if you can prove…' notes instead. The bar limits are display choices, not law (C-4).
- **Legal review:** C-4 Conditional

#### What the amount is called

- **Kind:** Fixed law
- **Now:** 'Estimated compensation under the MACT framework, based on the information provided', on the result, in the share text, the published method and the command line, in English and Hindi; no 'legal entitlement'.
- **Legal review:** C-3 Approve (built)

#### Checking an insurer's offer

- **Kind:** Fixed law
- **Now:** The offer, the estimate and the difference, with what waiting would be worth after interest and fees; no label calling the offer fair or unfair, and nothing that tells the family to accept or refuse. Without a disability certificate it says the estimate is not complete yet.
- **Legal review:** C-1 Approve (built)

#### Which questions the website asks

- **Kind:** Depends on the facts
- **Now:** Not asked: hospital or attendant days, the number of carers, future medical costs, money already received, a fault percentage, other dependants, or extra or late tax returns.
- **Decided:** Add only legally material questions, shown when they apply: occupation, place of work, salary proof, relationships, financial support, homemaker roles, continuing disability, care needs and money already received. The revised questions go to the legal reviewer (C-2).
- **Legal review:** C-2 Conditional

#### How real awards compare

- **Kind:** Estimate from awards
- **Now:** Shown for Delhi claims only, labelled 'Delhi tribunal awards, 2024-26', with the number of awards.
- **Decided:** Delhi only, with its jurisdiction, period and limits stated; re-measured after any change to the method (D-5).
- **Legal review:** D-5 Approve (built)
- **Authorities:** Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv

#### Legal sign-off of the rules

- **Kind:** Fixed law
- **Now:** Every rules file is marked unverified, and results carry one line: 'Method not yet signed off by a lawyer'. This register records each authority's bench, grade, paragraph, limits and later treatment.
- **Decided:** Sign off the method, the code, the rules files, settings, tax and wage tables and the public text against the same version; keep a change log and re-approve after substantive changes (B-14). Complete the authority register, including the claim type and whether each holding is binding (B-13).
- **Legal review:** B-13 Conditional; B-14 Conditional

### Data

#### Income-tax tables

- **Kind:** Fixed law
- **Now:** Tables for FY 2012-13 to FY 2026-27, each year with its own slabs, rebate and cess (3% until FY 2017-18, then 4%), checked against official sources: the Finance Bill memoranda for FY 2012-13 to 2017-18 and FY 2019-20. For a year with no table, no other year's table is used: the estimate is withheld unless the tax actually paid is entered.
- **Decided:** The accident year's own rules (A-27): load FY 2012-13 to 2017-18 and confirm FY 2019-20, with cess and rebate per year and a second person's check (D-4). Until then, rely on proved tax or withhold the estimate.
- **Legal review:** A-27 Approve (built); D-4 Conditional

#### Minimum wages outside Delhi

- **Kind:** Depends on the facts
- **Now:** Only Delhi and the Central construction schedule are loaded. Elsewhere, people without proof of income, homemakers, students, children and retired people without a pension get no estimate unless the Central fallback is chosen.
- **Decided:** Add states one at a time from official notifications, each with its effective date, category, grade, zone and source; periods without one stay unavailable (D-1).
- **Legal review:** D-1 Conditional

#### Delhi minimum wages

- **Kind:** Law split or open
- **Now:** Rates from 1 Oct 2011, except 1 Apr 2012 to 31 Mar 2013, where cases without proof of income get no estimate. From 3 Mar 2017 to 31 Oct 2018 the official series is used with a caution. The latest order is of 1 Apr 2025; an order dated 13 Oct 2025 was declared fake by the Labour Department.
- **Decided:** No interpolation: obtain the missing orders from the Labour Department or by RTI (D-2). Keep the official series for 2017-18 with a legal qualification, after a labour-law review (D-3). The last authenticated rate until a later official order is verified, and no compliance-site figures (D-6).
- **Legal review:** D-2 Hold (built); D-3 Conditional; D-6 Not stated

#### When a wage on file may be out of date

- **Kind:** Fixed law
- **Now:** A caution when the wage on file took effect more than 7 months before the accident and the source has not been checked since; it names the order's effective date and the date the source was last checked. Seven months is a trigger to check the data, not a legal expiry.
- **Legal review:** C-7 Approve (built)

### Every item of the legal review

59 items: 22 Approve, 30 Conditional, 6 Hold, 1 Not stated. Built: 28 of 59.

| Item | Decision | Built | Step |
|---|---|---|---|
| A-1 | Conditional | no | Income for a homemaker who died |
| A-2 | Conditional | no | Income with no proof (minimum wage) |
| A-3 | Conditional | no | Income for a child who died |
| A-4 | Approve | yes | Income for a student |
| A-5 | Approve | yes | Income from tax returns |
| A-6 | Approve | yes | Income for a pensioner |
| A-7 | Conditional | no | Income for a retired person without a pension |
| A-8 | Conditional | no | Income for an injured homemaker |
| A-9 | Conditional | no | Multiplier for a child under 15 |
| A-10 | Conditional | no | Personal deduction |
| A-11 | Approve | yes | Personal deduction |
| A-12 | Conditional | yes | Loss of estate, funeral and consortium amounts |
| A-13 | Hold | no | Lost earning ability |
| A-14 | Conditional | no | Pain and amenities, travel and diet, marriage prospects |
| A-15 | Conditional | no | Attendant |
| A-16 | Approve | yes | Multiplier |
| A-17 | Approve | yes | Future prospects |
| A-18 | Conditional | no | Income with no proof (minimum wage) |
| A-19 | Hold | yes | Income with no proof (minimum wage) |
| A-20 | Approve | yes | Income with no proof (minimum wage) |
| A-21 | Conditional | no | Future prospects |
| A-22 | Approve | yes | Personal deduction |
| A-23 | Conditional | no | Pain and amenities, travel and diet, marriage prospects |
| A-24 | Approve | yes | The person's own share of fault |
| A-25 | Hold | yes | Order of deductions when fault, cashless payments and ex-gratia meet |
| A-26 | Conditional | no | Money already received |
| A-27 | Approve | yes | Income-tax tables |
| A-28 | Hold | yes | Money already received |
| A-29 | Conditional | no | Order of deductions when fault, cashless payments and ex-gratia meet |
| A-30 | Conditional | no | Income from a salary |
| A-31 | Approve | yes | Earnings lost during treatment by a child |
| B-1 | Approve | no | Income for a child who died |
| B-2 | Conditional | no | Who receives consortium |
| B-3 | Conditional | yes | Loss of estate, funeral and consortium amounts |
| B-4 | Conditional | no | Time limit for filing the claim |
| B-5 | Conditional | no | Income from a salary |
| B-6 | Approve | yes | Income for a pensioner |
| B-7 | Approve | yes | Income from tax returns |
| B-8 | Approve | yes | Income for a student |
| B-9 | Approve | yes | The person's own share of fault |
| B-10 | Conditional | no | Money already received |
| B-11 | Conditional | no | Money already received |
| B-12 | Hold | yes | Money already received |
| B-13 | Conditional | no | Legal sign-off of the rules |
| B-14 | Conditional | no | Legal sign-off of the rules |
| C-1 | Approve | yes | Checking an insurer's offer |
| C-2 | Conditional | no | Which questions the website asks |
| C-3 | Approve | yes | What the amount is called |
| C-4 | Conditional | no | How the result is shown |
| C-5 | Approve | yes | The person's own share of fault |
| C-6 | Conditional | no | Interest and the value of an offer over time |
| C-7 | Approve | yes | When a wage on file may be out of date |
| C-8 | Approve | yes | When no estimate is given |
| D-1 | Conditional | no | Minimum wages outside Delhi |
| D-2 | Hold | yes | Delhi minimum wages |
| D-3 | Conditional | no | Delhi minimum wages |
| D-4 | Conditional | no | Income-tax tables |
| D-5 | Approve | yes | How real awards compare |
| D-6 | Not stated | no | Delhi minimum wages |

### Changes

- 2026-10-25 · Income from tax returns: A salaried person's latest return is used instead of an average; a later-filed return needs records from the time and no longer raises the high figure on its own; each return is net of its own year's tax, or the tax shown on it (A-5, B-7).
- 2026-10-25 · Income with no proof (minimum wage): A graduate with no particular job shown now gets the skilled rate, not the highly skilled one; that rate is kept for someone working as a professional (A-20).
- 2026-10-25 · Income with no proof (minimum wage): Central-sphere rates are no longer suggested as a rough stand-in for a state's missing wages; they are for central-sphere work only, and the result says so (A-19).
- 2026-10-25 · Income for a pensioner: An injured pensioner's pension that is still paid is no longer counted as lost income, and the website asks whether it is (A-6).
- 2026-10-25 · Order of deductions when fault, cashless payments and ex-gratia meet: With an established fault share and a cashless payment together, the calculator no longer picks an order of deduction: the medical expenses are left out and both amounts are given (A-25).
- 2026-10-25 · Money already received: An earlier no-fault award (s.164) and interim relief are no longer deducted; the result shows what a set-off would take away (A-28, B-12).
- 2026-10-25 · Income-tax tables: Tables added for FY 2012-13 to 2017-18 and FY 2019-20 confirmed; a year without a table no longer borrows the latest one (A-27). A second person's check of the tables is still to come (D-4).
- 2026-10-24 · Income for a student: The ₹12,000 for a professional course is no longer used; every figure takes the skilled wage (A-4, B-8).
- 2026-10-24 · Income for a pensioner: The low figure no longer takes the family pension off a pensioner's income (A-6, B-6).
- 2026-10-24 · Future prospects: Without salary slips, the occupation now sets the minimum wage for a salaried job, and the result names the assumption that the job was permanent and the proof a tribunal will want (A-17).
- 2026-10-24 · Personal deduction: A parent answered 'not sure' is no longer counted as a dependant; the effect if they were is shown (A-22).
- 2026-10-24 · Personal deduction: An unmarried person's family is asked whether a large family lived on their income: a third if so, in every figure, with no fixed number of dependants; before, a third applied only in the high figure and only from 3 dependants (A-11).
- 2026-10-24 · Multiplier: No caution above 70; the table's last category covers every age above 65 (A-16).
- 2026-10-24 · Loss of estate, funeral and consortium amounts: The headline counts the steps completed by the accident date, in place of a fixed two steps (A-12).
- 2026-10-24 · Earnings lost during treatment by a child: A child who did not earn no longer gets the skilled wage × the months of treatment (A-31).
- 2026-10-24 · The person's own share of fault: The 25% and 50% examples are labelled as illustrations (C-5); the written method no longer says fault cannot apply to pedestrians or passengers (B-9).
- 2026-10-24 · When no estimate is given: The hit-and-run amounts follow the accident date (C-8).
- 2026-10-24 · What the amount is called: 'Legal entitlement' and 'the Supreme Court's method' replaced (C-3).
- 2026-10-24 · Checking an insurer's offer: The verdict labels (far below … above) are gone; the check shows the difference instead (C-1).
- 2026-10-24 · How real awards compare: Re-measured after A-12 (deaths, middle half of awards 0.70 to 1.17 times the estimate, 112 awards).
- 2026-10-24 · How real awards compare: Shown for Delhi claims only (D-5).
- 2026-10-24 · Legal sign-off of the rules: One line on every result: 'Method not yet signed off by a lawyer' (B-14).
- 2026-10-24 · Legal sign-off of the rules: This register and the authority register published (B-13).
- 2026-10-24 · When a wage on file may be out of date: The caution names the date the official source was last checked (C-7).

## Multiplier (death and injury)

Multiplier by age of the deceased / injured (never by age of the claimants; never split).

| Age | Multiplier |
|---|---:|
| 15–25 | 18 |
| 26–30 | 17 |
| 31–35 | 16 |
| 36–40 | 15 |
| 41–45 | 14 |
| 46–50 | 13 |
| 51–55 | 11 |
| 56–60 | 9 |
| 61–65 | 7 |
| 66 and over | 5 |

Sources: [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/); [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf). Confidence: settled. Signed off: **no — awaiting legal sign-off**.

## Future prospects

Addition for future prospects, by age and nature of employment (percent of income).

| Age below | Permanent job | Self-employed or fixed salary |
|---:|---:|---:|
| 40 | 50% | 40% |
| 50 | 30% | 25% |
| 61 | 15% | 10% |

Sources: [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/); [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf). Confidence: settled. Signed off: **no — awaiting legal sign-off**.

## Personal-expenses deduction (death)

Deduction for the deceased's personal and living expenses (Sarla Verma, approved in Pranay Sethi).

| Married, dependants | Deduction |
|---|---:|
| 2–3 | 1/3 |
| 4–6 | 1/4 |
| 7–99 | 1/5 |
| Bachelor | 1/2 |
| Unmarried, a large dependent family shown | 1/3 (Sarla Verma (para 15) allows a third where a large family depended on the unmarried person (e.g. a widowed mother and non-earning siblings). No number of dependants is fixed: it is asked as a fact (legal review A-11).) |

Sources: [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/); [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/). Confidence: settled. Signed off: **no — awaiting legal sign-off**.

## Conventional heads (death)

Loss of estate, funeral expenses and loss of consortium (per claimant: spousal, parental, filial), as fixed in Pranay Sethi with a 10% increase every three years.

Base amounts on 2017-10-31: loss of estate ₹15,000, funeral ₹15,000, consortium ₹40,000 per claimant; +10% every 3 years.

Sources: [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); [Magma General Insurance Co. Ltd. v Nanu Ram](https://indiankanoon.org/doc/175246407/); [United India Insurance Co. Ltd. v Satinder Kaur](https://indiankanoon.org/doc/142302016/); [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/); [Hasina Yasmin v National Insurance Co. Ltd. (reference to a larger bench on the 10% steps)](https://indiankanoon.org/doc/41904479/). Confidence: contested. Signed off: **no — awaiting legal sign-off**.

## Notional incomes

Income used when the person did not earn, or earnings cannot be proved.

- **Homemaker (loss of domestic care):** ₹30,000 a month from 2026-06-11, +10% every 3 years. Shishu Pal: "loss of domestic care" Rs 30,000/month is the stand-in monthly income for a homemaker without monetary income, and is added to proved income if she also earned. Revised 10% cumulatively every three years. Sources: [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/).
- **Student:** the skilled minimum wage on the accident date (legal review A-4; Mohinder Kaur's ₹12,000, for an accident in 2000, is a comparator, not a benchmark).
- **Minor (death), conservative:** ₹25,000 a year × 15. Kurvan Ansari (SC, 16 Nov 2021, para 16): notional income Rs 25,000 a year x multiplier 15 = Rs 3,75,000 loss of dependency, with no personal-expenses deduction, for a 7-year-old (the 15 is the s.163A Second Schedule multiplier). Checked against the judgment text, 10 Oct 2026. Sources: [Kurvan Ansari v Shyam Kishore Murmu](https://indiankanoon.org/doc/117494438/).

Confidence: contested. Signed off: **no — awaiting legal sign-off**.

## Contested points: conservative / standard / claimant-max

Only legal uncertainty moves the range. Each row is one contested point. "Decided in" says whether the
engine reads the values from rules/range-parameters.yaml or makes the choice in its code (the row then
describes the code).

| Point | Conservative | Standard | Claimant-max | Sources | Decided in |
|---|---|---|---|---|---|
| Multiplier for a person aged under 15. (15 in the death line (Kurvan Ansari); 18 in the injury line (Kajal, Hitesh Patel, Hansraj).) | 15 | 18 | 18 | [Kurvan Ansari v Shyam Kishore Murmu](https://indiankanoon.org/doc/117494438/); [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/); [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf); [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf) | rules file |
| Number of 10% steps applied to the Pranay Sethi conventional heads. (Legal review A-12 (24 Oct 2026): the headline counts the full 3-year steps since 31 Oct 2017 completed by the accident date ("accident": none before 31 Oct 2020; base amounts for accidents before 2017), the reading Hasina Yasmin (2025) preferred when it referred the question to a larger bench. Counting up to the date of decision ("clock": up to the as-of date, three steps from 31 Oct 2026), as Shishu Pal (2026) applied, is the alternative until the larger bench decides. Increases are cumulative.) | accident | accident | clock | [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); [Hasina Yasmin v National Insurance Co. Ltd. (reference to a larger bench on the 10% steps)](https://indiankanoon.org/doc/41904479/); [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/) | rules file |
| Personal deduction for a married deceased whose only dependant is the spouse. | 1/2 | 1/3 | 1/3 | [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/) | rules file |
| Monthly income for a deceased homemaker without monetary income. | unskilled_minimum_wage | domestic_care | domestic_care | [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/); [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/) | rules file |
| Income basis for the death of a minor. (The skilled-minimum-wage rule is settled for injured minors; its use for deaths is an HC extension.) | kurvan_notional | skilled_minimum_wage | skilled_minimum_wage | [Kurvan Ansari v Shyam Kishore Murmu](https://indiankanoon.org/doc/117494438/); [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/); [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf) | rules file |
| Functional disability (loss of earning capacity) when no functional assessment is given. (The limb factors (rules/injury/bands.yaml) are the Delhi 25th percentile and median and also apply to a certificate whose basis is not known. The claimant-max rule is a legal choice not yet reviewed.) | certificate % x the conservative limb factor (whole-body certificate taken as it is) | certificate % x the standard limb factor (whole-body certificate taken as it is) | 100% if the person cannot work at all; otherwise the certificate % | [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/); [Sidram v Divisional Manager, United India Insurance Co. Ltd.](https://indiankanoon.org/doc/77644422/); Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv | code (src/engine/estimate.ts) |
| Pain and suffering, conveyance and diet, marriage prospects, and attendant during treatment when no attendant days are given. (Mostly the spread of Delhi tribunal awards. The claimant-max pain values from 50% are Supreme Court anchors or unexplained values, and the marriage-prospects band is not calibrated.) | conservative column of rules/injury/bands.yaml | standard column of rules/injury/bands.yaml | claimant-max column of rules/injury/bands.yaml | [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/); [Sidram v Divisional Manager, United India Insurance Co. Ltd.](https://indiankanoon.org/doc/77644422/); [Baiju v The United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf); [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf); [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf); [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/); Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv | code (src/engine/estimate.ts) |
| Wage for a permanent attendant. (The head itself follows Kajal and Hansraj; no authority is recorded for the semi-skilled rate.) | unskilled minimum wage | unskilled minimum wage | semi-skilled minimum wage | none recorded | code (src/engine/estimate.ts) |
| Income for an injured homemaker. (Shishu Pal decided a death; its use for an injury is by analogy and untested.) | unskilled minimum wage | unskilled minimum wage | Shishu Pal 'loss of domestic care' amount, by analogy | [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/); [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/) | code (src/engine/income.ts) |
| Skill category for the minimum wage when there is no income proof. (No authority is recorded for the occupation-to-category mapping. Unknown occupations are unskilled.) | unskilled | the occupation's category (rules/occupations.yaml) | the occupation's category (rules/occupations.yaml) | none recorded | code (src/engine/income.ts) |
| Income for a retired person without a pension. (No authority is recorded.) | no income (only the heads that do not depend on income) | unskilled minimum wage | unskilled minimum wage | none recorded | code (src/engine/income.ts) |

## Injury: discretionary heads (experimental)

Calibrated on Delhi tribunal awards; see the methodology for the rule used.

Limb certificate → functional disability factor: 0.5 / 0.53 / 1.

| Pain, suffering, amenities — functional disability from | Conservative | Standard | Claimant-max |
|---:|---:|---:|---:|
| 0% | ₹53,000 | ₹83,000 | ₹1,95,000 |
| 10% | ₹1,13,000 | ₹1,50,000 | ₹2,00,000 |
| 30% | ₹1,50,000 | ₹2,00,000 | ₹2,50,000 |
| 50% | ₹3,00,000 | ₹3,50,000 | ₹5,00,000 |
| 80% | ₹3,00,000 | ₹3,75,000 | ₹15,00,000 |

| Conveyance and special diet — days in hospital from | Conservative | Standard | Claimant-max |
|---:|---:|---:|---:|
| 0 | ₹30,000 | ₹50,000 | ₹75,000 |

Attendant during treatment, when days are not given: ₹14,000 / ₹30,000 / ₹50,000.
Loss of marriage prospects (unmarried, age ≤ 35, functional disability ≥ 50%): ₹1,00,000 / ₹3,00,000 / ₹5,00,000.

Sources: [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/); [Sidram v Divisional Manager, United India Insurance Co. Ltd.](https://indiankanoon.org/doc/77644422/); [Baiju v The United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf); [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf); [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf); [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/); Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv. Signed off: **no — awaiting legal sign-off**.

## How far real awards land (shown next to an estimate; not part of it)

Award ÷ standard estimate, middle half. Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test predict check, re-measured 24 Oct 2026 after A-12.

| Claim | Awards | 25th percentile | Median | 75th percentile |
|---|---:|---:|---:|---:|
| Death | 112 | 0.7 | 1 | 1.17 |
| Injury | 113 | 0.89 | 1.19 | 1.82 |

Sources: Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv. Signed off: **no — awaiting legal sign-off**.

## Statutory amounts and time limits

- **No-fault compensation (s.164):** death ₹5,00,000, grievous hurt ₹2,50,000. s.164 no-fault compensation. If it is accepted through the insurer's settlement route (s.149), the s.166 claim petition lapses (s.166(1) proviso). If awarded, it is adjusted against the s.166 award (s.164(3)). Sources: [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf).
- **Hit and run (s.161):** for accidents from 2022-04-01, death ₹2,00,000, grievous hurt ₹50,000. Compensation to Victims of Hit and Run Motor Accidents Scheme, 2022, for accidents from 1 Apr 2022 (amounts unchanged by the 2026 amendment). Refundable from any later award (s.163). Sources: [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf). Earlier accidents: death ₹25,000, grievous hurt ₹12,500. Solatium Scheme, 1989, for accidents up to 31 Mar 2022, as the General Insurance Council's guide (2023) summarises it; the scheme's own text has not been read. Sources: [General Insurance Council, "Hit and Run Motor Accident Compensation Claims" (guide, 15 Aug 2023)](https://www.gicouncil.in/media/4262/hit-and-run-motor-accident-compensation-claims.pdf).
- **Limitation (s.166(3)):** 6 months. The Supreme Court's interim order (4 Nov 2025) directs that no claim be dismissed as time-barred while the challenge is pending. Sources: [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf); [Bhagirathi Dash v Union of India, W.P.(C) 166/2024 (interim order on s.166(3) limitation; the 4 Nov 2025 order is not published, the linked order of 17 Feb 2026 continues it)](https://indiankanoon.org/doc/54856662/).
- **Interest illustration:** 6 / 7.5 / 9% over 6 years. No fixed rate; recent awards range 6-9% simple interest from the date of filing. Shown separately, never added to the headline.
- **Typical time to award:** 6 years at tribunals, 8 at High Courts. Sources: [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/).

Signed off: **no — awaiting legal sign-off**.

## Settings (product choices, not law)

Fixed numbers the calculator uses that are product choices, not rules of law. They are kept here so that the reviewers can see and change them in one place.

- **Range bar:** shown only when highest / lowest is at most 1.75 (death) or 2.5 (injury). The range bar is shown only when highest / lowest is at or below this; otherwise scenario cards.
- **Wide-range notice:** 0.8. The page says the low end is far below the headline when conservative < this x standard.
- **Negligence cards:** 25% and 50%. "What if" cards shown when the person drove an involved vehicle and no negligence % is entered.
- **Minimum-wage freshness:** 7 months. States revise minimum wages about every six months. A wage older than this at the accident date, with no recorded check of the official source since, raises a caution; the weekly staleness check uses the same window.
- **Offer check defaults:** interest 7.5%, discount 7%, lawyer's fee 0%. Offer check: simple interest a tribunal adds, the rate used to compare money now and later, and the lawyer's fee (an advocate may not take a share of the award). Years come from statutory.yaml. The check shows the offer, the estimate and the difference, never a verdict on the offer (legal review C-1).

Signed off: **no — awaiting legal sign-off**.

## Income tax (deducted from salary before the formula)

Health and education cess 4%.

| Financial year | Regime | Standard deduction | Rebate up to | Slabs (upper limit: rate) | Checked against |
|---|---|---:|---:|---|---|
| 2012-13 | old | ₹0 | ₹0 | ₹2,00,000: 0%, ₹5,00,000: 10%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2012-2013/ub2012-13/mem/mem1.pdf) (Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.) |
| 2013-14 | old | ₹0 | ₹5,00,000 | ₹2,00,000: 0%, ₹5,00,000: 10%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2013-2014/ub2013-14/mem/mem1.pdf) (Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.) |
| 2014-15 | old | ₹0 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 10%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2014-2015/ub2014-15/mem/mem1.pdf) (Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.) |
| 2015-16 | old | ₹0 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 10%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2015-2016/ub2015-16/memo/mem1.pdf) (Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.) |
| 2016-17 | old | ₹0 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 10%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2016-2017/ub2016-17/memo/mem1.pdf) (Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.) |
| 2017-18 | old | ₹0 | ₹3,50,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2017-2018/ub2017-18/memo/memo.pdf) (Finance Bill memorandum as introduced; the rates for individuals below 60 in Part III of the First Schedule.) |
| 2018-19 | old | ₹40,000 | ₹3,50,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2023-24/doc/Budget_Speech.pdf) [2](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular_1_2019.pdf/32084fa9-506a-9f0f-b207-5a631e2190f3?t=1762868318230) [3](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) |
| 2019-20 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% | [1](https://www.indiabudget.gov.in/budget2023-24/doc/Budget_Speech.pdf) [2](https://www.incometaxindia.gov.in/documents/20117/6507196/circular_20_2020.pdf/e2c142ae-028c-047c-a2ef-a1e712fdd1c8?t=1762868544963) [3](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) [4](https://www.indiabudget.gov.in/budget2019-20/doc/memo.pdf) (Slabs and the 4% cess confirmed 25 Oct 2026 in the Finance (No. 2) Bill 2019 memorandum (Part III, FY 2019-20).) |
| 2020-21 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% | [1](https://www.incometaxindia.gov.in/documents/20117/6507196/circular_20_2020.pdf/e2c142ae-028c-047c-a2ef-a1e712fdd1c8?t=1762868544963) [2](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) |
| 2021-22 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% | [1](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) [2](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-24-2022.pdf/d27dd45f-94ba-f69f-3acc-32a8b31e43aa?t=1762868713421) [3](https://www.indiabudget.gov.in/budget2021-22/doc/memo.pdf) [4](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) |
| 2022-23 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% | [1](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) [2](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-24-2022.pdf/d27dd45f-94ba-f69f-3acc-32a8b31e43aa?t=1762868713421) [3](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) |
| 2023-24 | new | ₹50,000 | ₹7,00,000 (marginal relief) | ₹3,00,000: 0%, ₹6,00,000: 5%, ₹9,00,000: 10%, ₹12,00,000: 15%, ₹15,00,000: 20%, above: 30% | [1](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) [2](https://www.incometax.gov.in/iec/foportal/help/new-tax-vs-old-tax-regime-faqs) [3](https://www.indiabudget.gov.in/budget2023-24/doc/Budget_Speech.pdf) [4](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) |
| 2024-25 | new | ₹75,000 | ₹7,00,000 (marginal relief) | ₹3,00,000: 0%, ₹7,00,000: 5%, ₹10,00,000: 10%, ₹12,00,000: 15%, ₹15,00,000: 20%, above: 30% | [1](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) [2](https://www.indiabudget.gov.in/budget2024-25/doc/Budget_Speech.pdf) [3](https://www.incometaxindia.gov.in/documents/20117/6507196/Circular-no-03-2025.pdf/d7fbb6ed-7b91-b230-b397-97b422b31794?t=1762868895064) |
| 2025-26 | new | ₹75,000 | ₹12,00,000 (marginal relief) | ₹4,00,000: 0%, ₹8,00,000: 5%, ₹12,00,000: 10%, ₹16,00,000: 15%, ₹20,00,000: 20%, ₹24,00,000: 25%, above: 30% | [1](https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1) [2](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2098406) [3](https://www.incometaxindia.gov.in/documents/20117/15766092/FAQs-Budget-2026%2BUpdated.pdf/daf54d14-aca9-c4ea-b786-598fd2f8d4c4) |
| 2026-27 | new | ₹75,000 | ₹12,00,000 (marginal relief) | ₹4,00,000: 0%, ₹8,00,000: 5%, ₹12,00,000: 10%, ₹16,00,000: 15%, ₹20,00,000: 20%, ₹24,00,000: 25%, above: 30% | [1](https://www.indiabudget.gov.in/doc/memo.pdf) [2](https://www.incometaxindia.gov.in/documents/20117/15766092/FAQs-Budget-2026%2BUpdated.pdf/daf54d14-aca9-c4ea-b786-598fd2f8d4c4) [3](https://www.incometaxindia.gov.in/documents/d/guest/faqs-on-computation-of-tax) |

Signed off: **no — awaiting legal sign-off**.

## Occupations → minimum-wage skill category

| Code | Occupation | हिंदी | Category |
|---|---|---|---|
| agricultural_labourer | Agricultural labourer / farm worker | खेतिहर मज़दूर | unskilled |
| construction_labourer | Construction labourer | निर्माण मज़दूर | unskilled |
| daily_wage_labourer | Daily-wage labourer | दिहाड़ी मज़दूर | unskilled |
| domestic_worker | Domestic worker | घरेलू कामगार | unskilled |
| cleaner_sweeper | Cleaner / sweeper | सफ़ाई कर्मचारी | unskilled |
| porter_loader | Porter / loader | पल्लेदार / लोडर | unskilled |
| street_vendor | Street vendor / hawker | रेहड़ी-पटरी विक्रेता | unskilled |
| farmer_cultivator | Farmer (own land, no income proof) | किसान | unskilled |
| helper | Helper / assistant | हेल्पर | semi_skilled |
| shop_worker | Shop worker / salesperson | दुकान कर्मचारी | semi_skilled |
| security_guard | Security guard | सुरक्षा गार्ड | semi_skilled |
| delivery_rider | Delivery rider / courier | डिलीवरी राइडर | semi_skilled |
| factory_worker | Factory / machine worker | फ़ैक्टरी कर्मचारी | semi_skilled |
| driver | Driver (auto / taxi / truck / bus) | ड्राइवर | skilled |
| mason | Mason | राजमिस्त्री | skilled |
| carpenter | Carpenter | बढ़ई | skilled |
| electrician | Electrician | इलेक्ट्रीशियन | skilled |
| plumber | Plumber | प्लंबर | skilled |
| mechanic | Mechanic | मैकेनिक | skilled |
| tailor | Tailor | दर्ज़ी | skilled |
| welder | Welder | वेल्डर | skilled |
| cook | Cook | रसोइया | skilled |
| clerk | Clerk / office assistant | क्लर्क | skilled |
| small_business_owner | Small business / shop owner (no ITR) | छोटा व्यवसायी | skilled |
| graduate_professional | Graduate, no particular job shown (no income proof) | स्नातक, कोई ख़ास काम नहीं बताया गया | skilled |
| professional | Working professional, e.g. engineer or accountant (no income proof) | पेशेवर काम, जैसे इंजीनियर या अकाउंटेंट | highly_skilled |

Signed off: **no — awaiting legal sign-off**.

## Minimum wages (official orders only)

Monthly rates unless stated. A gap is listed, never guessed.

### Central sphere - construction schedule

Basic rates fixed by notifications of 19 Jan 2017; VDA revised every 1 April and 1 October from CPI-IW. From 1 Oct 2026 the VDA orders are issued by the Labour Bureau, Chandigarh, under the Code on Wages, 2019 (s.69(2)).

- Official source: https://clc.gov.in/clc/min-wages — Chief Labour Commissioner (C) - VDA orders by scheduled employment (archived copy of 19 Apr 2026 used)
- Official source: https://www.labourbureau.gov.in/ — Labour Bureau, Chandigarh - VDA orders from 1 Oct 2026 (Code on Wages, 2019)
- Last checked: 2026-10-10

| From | Zone | Unskilled | Semi-skilled | Skilled | Highly skilled | Order | Source quality |
|---|---|---:|---:|---:|---:|---|---|
| 2022-10-01 | C | ₹477/day | ₹557/day | ₹671/day | ₹788/day | [F.No.1/16(3)/2022-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16643418421.pdf) | official |
| 2022-10-01 | B | ₹595/day | ₹671/day | ₹788/day | ₹866/day | [F.No.1/16(3)/2022-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16643418421.pdf) | official |
| 2022-10-01 | A | ₹711/day | ₹788/day | ₹866/day | ₹940/day | [F.No.1/16(3)/2022-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16643418421.pdf) | official |
| 2023-04-01 | C | ₹494/day | ₹577/day | ₹695/day | ₹816/day | [F.No.1/5(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16805235131.pdf) | official |
| 2023-04-01 | B | ₹616/day | ₹695/day | ₹816/day | ₹897/day | [F.No.1/5(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16805235131.pdf) | official |
| 2023-04-01 | A | ₹736/day | ₹816/day | ₹897/day | ₹973/day | [F.No.1/5(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16805235131.pdf) | official |
| 2023-10-01 | C | ₹504/day | ₹589/day | ₹709/day | ₹832/day | [F.No.1/8(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16957148071.pdf) | official |
| 2023-10-01 | B | ₹628/day | ₹709/day | ₹832/day | ₹915/day | [F.No.1/8(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16957148071.pdf) | official |
| 2023-10-01 | A | ₹751/day | ₹832/day | ₹915/day | ₹992/day | [F.No.1/8(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_16957148071.pdf) | official |
| 2024-04-01 | C | ₹522/day | ₹610/day | ₹734/day | ₹862/day | [F.No.1/7(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17120388671.pdf) | official |
| 2024-04-01 | B | ₹651/day | ₹734/day | ₹862/day | ₹948/day | [F.No.1/7(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17120388671.pdf) | official |
| 2024-04-01 | A | ₹778/day | ₹862/day | ₹948/day | ₹1,028/day | [F.No.1/7(3)/2023-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17120388671.pdf) | official |
| 2024-10-01 | C | ₹526/day | ₹614/day | ₹739/day | ₹868/day | [F.No.1/27(3)/2024-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17272659741.pdf) | official |
| 2024-10-01 | B | ₹655/day | ₹739/day | ₹868/day | ₹954/day | [F.No.1/27(3)/2024-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17272659741.pdf) | official |
| 2024-10-01 | A | ₹783/day | ₹868/day | ₹954/day | ₹1,035/day | [F.No.1/27(3)/2024-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17272659741.pdf) | official |
| 2025-04-01 | C | ₹541/day | ₹632/day | ₹760/day | ₹893/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17431496131.pdf) | official |
| 2025-04-01 | B | ₹674/day | ₹760/day | ₹893/day | ₹981/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17431496131.pdf) | official |
| 2025-04-01 | A | ₹805/day | ₹893/day | ₹981/day | ₹1,065/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17431496131.pdf) | official |
| 2025-10-01 | C | ₹541/day | ₹632/day | ₹760/day | ₹893/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17592265211.pdf) | official |
| 2025-10-01 | B | ₹674/day | ₹760/day | ₹893/day | ₹981/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17592265211.pdf) | official |
| 2025-10-01 | A | ₹805/day | ₹893/day | ₹981/day | ₹1,065/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17592265211.pdf) | official |
| 2026-04-01 | C | ₹556/day | ₹650/day | ₹781/day | ₹918/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17751372721.pdf) | official |
| 2026-04-01 | B | ₹693/day | ₹781/day | ₹918/day | ₹1,008/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17751372721.pdf) | official |
| 2026-04-01 | A | ₹827/day | ₹918/day | ₹1,008/day | ₹1,094/day | [F.No.1/6(3)/2025-LS-II](https://clc.gov.in/clc/sites/default/files/mygov_17751372721.pdf) | official |
| 2026-10-01 | C | ₹565/day | ₹661/day | ₹794/day | ₹933/day | [File No. 6/1/2026-VDA (Labour Bureau, Chandigarh)](https://www.labourbureau.gov.in/uploads/public/notice/VDA-orders-October-2026-1pdf-f1c4d10c67a017bf34cd65319b294b99.pdf) | official |
| 2026-10-01 | B | ₹704/day | ₹794/day | ₹933/day | ₹1,024/day | [File No. 6/1/2026-VDA (Labour Bureau, Chandigarh)](https://www.labourbureau.gov.in/uploads/public/notice/VDA-orders-October-2026-1pdf-f1c4d10c67a017bf34cd65319b294b99.pdf) | official |
| 2026-10-01 | A | ₹840/day | ₹933/day | ₹1,024/day | ₹1,111/day | [File No. 6/1/2026-VDA (Labour Bureau, Chandigarh)](https://www.labourbureau.gov.in/uploads/public/notice/VDA-orders-October-2026-1pdf-f1c4d10c67a017bf34cd65319b294b99.pdf) | official |

Gaps:

- Before 1 Oct 2022: not loaded. Older orders are on paged listings (clc.gov.in/clc/min-wages/minimum-wages-1..3) in Wayback captures from 2016 onwards.
- Only the construction schedule is loaded; other schedules (sweeping and cleaning, watch and ward, loading and unloading, agriculture, mines) have different rates.

### Delhi (NCT)

Base rates last fixed by notification of 22.10.2019; dearness allowance (DA) added every 1 April and 1 October from six-monthly All-India CPI averages, by order of the Labour Commissioner (orders often issued weeks later).

- Official source: https://labour.delhi.gov.in/labour/current-minimum-wage-rate — Labour Department, GNCTD - list of minimum-wage and DA orders (archived copy of 27 Jul 2026 used)
- Last checked: 2026-07-27

| From | Zone | Unskilled | Semi-skilled | Skilled | Highly skilled | Order | Source quality |
|---|---|---:|---:|---:|---:|---|---|
| 2011-10-01 | All | ₹6,656 | ₹7,356 | ₹8,112 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2012-04-01 | All | – | – | – | – | – | gap |
| 2013-04-01 | All | ₹7,722 | ₹8,528 | ₹9,386 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/4626e80041514d1ea15aa9ac8fd59c37/order+-minwages.pdf) | official |
| 2013-10-01 | All | ₹8,086 | ₹8,918 | ₹9,802 | – | [F.No.12 (142)/02/MW/VII 3124](http://www.delhi.gov.in/wps/wcm/connect/4626e80041514d1ea15aa9ac8fd59c37/order+-minwages.pdf) | official |
| 2014-04-01 | All | ₹8,554 | ₹9,438 | ₹10,374 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2014-10-01 | All | ₹8,632 | ₹9,542 | ₹10,478 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2015-04-01 | All | ₹9,048 | ₹10,010 | ₹10,998 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2015-10-01 | All | ₹9,178 | ₹10,140 | ₹11,154 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2016-04-01 | All | ₹9,568 | ₹10,582 | ₹11,622 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2016-10-01 | All | ₹9,724 | ₹10,764 | ₹11,830 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2017-03-03 | All | ₹13,350 | ₹14,698 | ₹16,182 | – | [No. F. Addl.LC/Lab/MW/2016/4859](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2017-04-01 | All | ₹13,584 | ₹14,958 | ₹16,468 | – | [order](http://labour.delhi.gov.in/sites/default/files/All-PDF/Odr2018631057_0.pdf) | official |
| 2018-04-01 | All | ₹13,896 | ₹15,296 | ₹16,858 | – | [F.No. 12(142)/02/MW/VII/201](http://labour.delhi.gov.in/sites/default/files/All-PDF/Odr2018631057_0.pdf) | official |
| 2018-08-04 | All | ₹13,896 | ₹15,296 | ₹16,858 | – | [F.No. 12(142)/02/MW/VII/201](http://labour.delhi.gov.in/sites/default/files/All-PDF/Odr2018631057_0.pdf) | official |
| 2018-11-01 | All | ₹14,000 | ₹15,400 | ₹16,962 | – | [order](http://www.delhi.gov.in/wps/wcm/connect/doit_labour/Labour/Home/Minimum+Wages) | official |
| 2019-04-01 | All | ₹14,468 | ₹15,920 | ₹17,508 | – | [Order No.12(142)/02/MW/VII/3636](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/5da.pdf) | official |
| 2019-10-01 | All | ₹14,806 | ₹16,284 | ₹17,924 | – | [Order No.12(142)/02/MW/VII/3636](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/5da.pdf) | official |
| 2019-10-22 | All | ₹14,842 | ₹16,341 | ₹17,991 | – | [Notification No.12(142)/02/MW/VII/3636](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/4da.pdf) | official |
| 2020-04-01 | All | ₹15,310 | ₹16,861 | ₹18,563 | – | [F.No.12(142)/02/MW/VII/Partfile/3786-3809](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/4da.pdf) | official |
| 2020-10-01 | All | ₹15,492 | ₹17,069 | ₹18,797 | – | [F.No.12(142)/02/MW/VII/Partfile/3786-3809](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/4da.pdf) | official |
| 2021-04-01 | All | ₹15,908 | ₹17,537 | ₹19,291 | – | [F.No.12(142)/02/MW/VII/Partfile/2044-2055](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/3da.pdf) | official |
| 2021-10-01 | All | ₹16,064 | ₹17,693 | ₹19,473 | – | [Order No.12(142)/02/MW/VII/Part file/4456](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/2damworder.pdf) | official |
| 2022-04-01 | All | ₹16,506 | ₹18,187 | ₹20,019 | – | [F.No.12(142)/02/MW/VII/Partfile/2618-2641](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/1da.pdf) | official |
| 2022-10-01 | All | ₹16,792 | ₹18,499 | ₹20,357 | – | [order](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/minimum_wages_current.pdf) | official |
| 2023-04-01 | All | ₹17,234 | ₹18,993 | ₹20,903 | – | [F.No.(142)/02/MW/VIII/Part file/429-443](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/minimum_wages_current.pdf) | official |
| 2023-10-01 | All | ₹17,494 | ₹19,279 | ₹21,215 | – | [F.No.(142)/02/MW/VII/Part file/5906-5994](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/minimum_wages.pdf) | official |
| 2024-04-01 | All | ₹17,988 | ₹19,825 | ₹21,813 | – | [F.No.(142)/02/MW/VII/Part file/3502-3519](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/da_april_24.pdf) | official |
| 2024-10-01 | All | ₹18,066 | ₹19,929 | ₹21,917 | – | [F.No.(142)/02/MW/VII/Part file/3478-3495](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/da_oct_2024.pdf) | official |
| 2025-04-01 | All | ₹18,456 | ₹20,371 | ₹22,411 | – | [F.No.(142)/02/MW/VII/Part file/211-241](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/da15april2025.pdf) | official |

Gaps:

- Before 1 Oct 2011: not loaded.
- 1 Apr 2012 - 31 Mar 2013: no rate. The DA orders of 1 Apr and 1 Oct 2012 were not found (the official page was not updated May 2012 - Oct 2013 and the order PDFs are not archived). Estimates for accidents in this year say so instead of using the 2011 rates.
- 3 Mar 2017 - 31 Oct 2018: legally contested. The 3 Mar 2017 notification was quashed by the Delhi High Court (4 Aug 2018) and its rates restored by the Supreme Court's interim order (31 Oct 2018, from 1 Nov 2018). No lower official series was published for the period. The official series is loaded with a caution; Delhi tribunals in the back-test applied it. For legal sign-off.
- Notification numbers are known only for the orders of Oct 2013, Mar 2017 and Apr 2018; other 2011-2018 rates are read from the Labour Department's own rate page (Wayback copies). The 1 Oct 2011 table prints semi-skilled 7,356 although 7,098 + 260 = 7,358 (recorded as printed).
- 1 Oct 2025 and 1 Apr 2026: no DA order found. The official list (archived 27 Jul 2026) still shows the 1 Apr 2025 order as the latest. Accidents after 1 Apr 2025 use the 1 Apr 2025 rates until an official order is found.
- FORGED ORDER - do not use: F.No.(143)/02/MW/VII/Partfile/212-261 dated 13.10.2025 (Rs 19,846 / 21,813 / 23,905). Declared fraudulent by Labour Department circular Lab-L011/5/2025-Addl.LC-II/3616 dated 14/10/2025, which says no DA order had been issued for the period from 1 Oct 2025 and that the last official increase was effective 1 Apr 2025 (circular seen as an image reproduced on hrsoftwaredelhi.com; official copy not retrieved).
- 1 Oct 2026 revision due; check the official page.
- The Code on Wages, 2019 came into force on 21 Nov 2025 (S.O. 5322(E), https://egazette.gov.in/WriteReadData/2025/267885.pdf); its effect on Delhi rates and on the national floor wage is not checked or modelled.

## Sources

| Id | Source | Citation | Court and bench | Grade | Date |
|---|---|---|---|---|---|
| mv_act_1988 | [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf) |  | statute | P |  |
| jan_vishwas_2026 | Jan Vishwas (Amendment of Provisions) Act, 2026 (Act 8 of 2026), amendments to the Motor Vehicles Act |  | statute | S |  |
| sarla_verma_2009 | [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/) | (2009) 6 SCC 121; 2009 INSC 506 | Supreme Court, 2 judges | P |  |
| pranay_sethi_2017 | [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/) | (2017) 16 SCC 680; 2017 INSC 1068 | Supreme Court, 5 judges | P | 2017-10-31 |
| reshma_kumari_2013 | [Reshma Kumari v Madan Mohan](https://indiankanoon.org/doc/86908489/) | (2013) 9 SCC 65; 2013 INSC 200 | Supreme Court, 3 judges | P |  |
| raj_kumar_2011 | [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/) | (2011) 1 SCC 343; 2010 INSC 703 | Supreme Court, 2 judges | P |  |
| magma_2018 | [Magma General Insurance Co. Ltd. v Nanu Ram](https://indiankanoon.org/doc/175246407/) | (2018) 18 SCC 130; 2018 INSC 828 | Supreme Court, 2 judges | P |  |
| satinder_kaur_2020 | [United India Insurance Co. Ltd. v Satinder Kaur](https://indiankanoon.org/doc/142302016/) | (2021) 11 SCC 780; 2020 INSC 447 | Supreme Court, 3 judges | P |  |
| somwati_2020 | [New India Assurance Co. Ltd. v Somwati](https://indiankanoon.org/doc/97624839/) | (2020) 9 SCC 644; 2020 INSC 535 | Supreme Court, 2 judges | P |  |
| kirti_2021 | [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/) | (2021) 2 SCC 166; 2021 INSC 6 | Supreme Court, 3 judges | P |  |
| kajal_2020 | [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/) | (2020) 4 SCC 413; 2020 INSC 135 | Supreme Court, 2 judges | P | 2020-02-05 |
| kurvan_ansari_2021 | [Kurvan Ansari v Shyam Kishore Murmu](https://indiankanoon.org/doc/117494438/) | 2021 INSC 734; [2021] 7 SCR 366 | Supreme Court, 2 judges | P |  |
| divya_2022 | [Divya v National Insurance Co. Ltd.](https://indiankanoon.org/doc/161415879/) | 2022 INSC 1108 | Supreme Court, 2 judges | P |  |
| rushi_thapa_2024 | [Rushi Thapa v Oriental Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2023/11435/11435_2023_2_1501_56835_Judgement_05-Nov-2024.pdf) | 2024 INSC 837 | Supreme Court, 2 judges | P | 2024-11-05 |
| meenakshi_2024 | [Meenakshi v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/72618714/) | 2024 INSC 573 | Supreme Court, 2 judges | P | 2024-07-23 |
| sidram_2022 | [Sidram v Divisional Manager, United India Insurance Co. Ltd.](https://indiankanoon.org/doc/77644422/) | (2023) 3 SCC 439; 2022 INSC 1204 | Supreme Court, 2 judges | P | 2022-11-16 |
| hitesh_patel_2025 | [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf) | 2025 INSC 1070 | Supreme Court, 2 judges | P | 2025-08-08 |
| preetha_krishnan_2025 | [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf) | 2025 INSC 1293 | Supreme Court, 2 judges | P | 2025-11-06 |
| baiju_2025 | [Baiju v The United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf) | Order of 28 Nov 2025, SLP(C) 29251/2025 as printed on the order | Supreme Court, 2 judges | P | 2025-11-28 |
| hasina_yasmin_2025 | [Hasina Yasmin v National Insurance Co. Ltd. (reference to a larger bench on the 10% steps)](https://indiankanoon.org/doc/41904479/) | 2025 INSC 1501 | Supreme Court, 2 judges | P | 2025-12-17 |
| bhagirathi_dash_2025 | [Bhagirathi Dash v Union of India, W.P.(C) 166/2024 (interim order on s.166(3) limitation; the 4 Nov 2025 order is not published, the linked order of 17 Feb 2026 continues it)](https://indiankanoon.org/doc/54856662/) |  | Supreme Court, 2 judges | P | 2025-11-04 |
| sushila_2026 | [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf) | Order of 10 Mar 2026, SLP(C) 21717/2025 | Supreme Court, 2 judges | P | 2026-03-10 |
| mohinder_kaur_2026 | [Mohinder Kaur v Brij Lal Arora](https://indiankanoon.org/doc/14044956/) | 2026 INSC 477 | Supreme Court, 2 judges | P |  |
| hansraj_2026 | [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf) | 2026 INSC 454 | Supreme Court, 2 judges | P | 2026-05-06 |
| priyanka_das_2026 | [Reliance General Insurance Co. Ltd. v Priyanka Das](https://indiankanoon.org/doc/142169288/) | 2026 INSC 950 | Supreme Court, 2 judges | P |  |
| m_paramesh_2026 | M. Paramesh v VRL Logistics Ltd. | 2026 INSC 655 | Supreme Court | S | 2026-06-23 |
| dolly_satish_gandhi_2026 | [New India Assurance Co. Ltd. v Dolly Satish Gandhi](https://api.sci.gov.in/supremecourt/2025/32269/32269_2025_11_1501_71181_Judgement_15-May-2026.pdf) | 2026 INSC 498 | Supreme Court, 2 judges | P | 2026-05-15 |
| sarla_devi_2026 | [Sarla Devi v Reliance General Insurance Co. Ltd.](https://indiankanoon.org/doc/57068626/) | 2026 INSC 575 | Supreme Court, 3 judges | P | 2026-05-26 |
| shishu_pal_2026 | [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/) | 2026 INSC 634 | Supreme Court, 2 judges | P | 2026-06-11 |
| sameem_begum_2026 | [Sameem Begum v K. Venkat Swamy](https://indian-supreme-court-judgments.s3.ap-south-1.amazonaws.com/data/pdf/year=2026/english/2026_9_112_124_EN.pdf) | 2026 INSC 864; [2026] 9 SCR 112 | Supreme Court, 2 judges | P | 2026-08-14 |
| rashmirekha_2026 | [Rashmirekha Tripathy v Branch Manager (Legal Claims), Sriram General Insurance Co. Ltd.](https://indiankanoon.org/doc/164414205/) | 2026 INSC 661; [2026] 7 SCR 494 | Supreme Court, 2 judges | P | 2026-07-01 |
| vimal_kanwar_2013 | [Vimal Kanwar v Kishore Dan](https://indiankanoon.org/doc/119587841/) | (2013) 7 SCC 476; 2013 INSC 304 | Supreme Court, 2 judges | P |  |
| helen_rebello_1998 | [Helen C. Rebello v Maharashtra SRTC](https://indiankanoon.org/doc/1340758/) | (1999) 1 SCC 90; 1998 INSC 372 | Supreme Court, 2 judges | P |  |
| khenyei_2015 | [Khenyei v New India Assurance Co. Ltd.](https://indiankanoon.org/doc/79441201/) | (2015) 9 SCC 273; 2015 INSC 389 | Supreme Court, 3 judges | P |  |
| ganga_devi_2026 | [Ganga Devi v Rajesh Kumar (Delhi High Court), MAC.APP. 224/2024](https://indiankanoon.org/doc/33193330/) |  | High Court (DL), 1 judge | P | 2026-10-12 |
| uma_rani_2026 | [Uma Rani v Simranjeet Singh (Delhi High Court)](https://indiankanoon.org/doc/173432675/) |  | High Court (DL) | P | 2026-07-01 |
| karan_singh_bisht_2026 | [Karan Singh Bisht v Ravi Singh (MACT-01, Patiala House Courts, New Delhi; DAR 350/2020)](https://indiankanoon.org/doc/105820332/) |  | Tribunal (DL) |  | 2026-08-17 |
| delhi_awards_backtest_2026 | Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv |  | dataset |  | 2026-10-10 |
| gic_hit_and_run_2023 | [General Insurance Council, "Hit and Run Motor Accident Compensation Claims" (guide, 15 Aug 2023)](https://www.gicouncil.in/media/4262/hit-and-run-motor-accident-compensation-claims.pdf) |  | guide | S | 2023-08-15 |

## What each authority is relied on for

For each judgment: its court and bench, the holding the calculator relies on with its paragraph, the facts that
limit it, and how later judgments treated it. _Ratio_ marks a binding holding, _applied_ an amount fixed on the
case's own facts (a comparator, not a rule); where neither is marked, the advocate has yet to class it.
Grade P: read in the original; S: known only from a summary or report.

### Jan Vishwas (Amendment of Provisions) Act, 2026 (Act 8 of 2026), amendments to the Motor Vehicles Act

statute · grade S

- A tribunal may entertain a claim within a further twelve months after the six-month limit in s.166(3) if sufficient cause is shown (as summarised by the Government; the legal review also cites ss.168(4), 164(4) and 163(3)). _Limits:_ Known from the Government's summary and the legal review; the section text and its commencement date are not yet read.
- _Later treatment:_ The legal review gives 15 Aug 2026 as the commencement for the Motor Vehicles Act amendments; not yet confirmed.

### [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/)

Supreme Court, 2 judges · (2009) 6 SCC 121; 2009 INSC 506 · grade P

- **paras 14-15 (SCC 30-32):** Personal deduction: a half for an unmarried person; for a married person a third (2-3 dependants), a quarter (4-6) or a fifth (more). The scale starts at two or three dependants.
- **para 15:** An unmarried person who supported a large dependent family may have a third deducted instead of a half; no number of dependants is fixed.
- **para 21 and its table (SCC 42):** The multiplier is taken from a table by age.
- _Later treatment:_ Paras 30-32 and 42 (SCC) endorsed by the Constitution Bench in Pranay Sethi (2017), para 61(v)-(vi).

### [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/)

Supreme Court, 5 judges · (2017) 16 SCC 680; 2017 INSC 1068 · 2017-10-31 · grade P

- **paras 61(iii)-(iv) (SCC 59.3-59.4) · ratio:** Future prospects: 50%, 30% or 15% of salary less tax for a permanent job (under 40, 40-50, 50-60); 40%, 25% or 10% of established income less tax for the self-employed or those on a fixed salary.
- **para 61(viii) · ratio:** Loss of estate ₹15,000, consortium ₹40,000 and funeral ₹15,000, to be raised by 10% every three years; no start date is given.
- **para 46:** Approved Reshma Kumari's approach to the multiplier.
- _Later treatment:_ A Constitution Bench; binds every smaller bench.

### [Reshma Kumari v Madan Mohan](https://indiankanoon.org/doc/86908489/)

Supreme Court, 3 judges · (2013) 9 SCC 65; 2013 INSC 200 · grade P

- **para 40(ii) · ratio:** A multiplier of 15 for victims up to 15, whatever the type of claim. _Limits:_ Ties the 15 to the old Second Schedule, which has since been removed.
- _Later treatment:_ Approved in Pranay Sethi (2017) para 46; followed for an injured child in Divya (2022) and Rushi Thapa (2024). Kajal (2020) and Hitesh Patel (2025), two-judge benches, used 18 without discussing it.

### [Raj Kumar v Ajay Kumar](https://indiankanoon.org/doc/153578069/)

Supreme Court, 2 judges · (2011) 1 SCC 343; 2010 INSC 703 · grade P

- **paras 5, 7-10 (SCC 9-13):** The heads of injury compensation (medical, earnings lost during treatment, future loss, pain, amenities); medical and functional disability are assessed separately.
- **para 10:** 100% loss of earning capacity where the person cannot do their earlier work; when earning loss is total, only a token sum is due for amenities.

### [Magma General Insurance Co. Ltd. v Nanu Ram](https://indiankanoon.org/doc/175246407/)

Supreme Court, 2 judges · (2018) 18 SCC 130; 2018 INSC 828 · grade P

- **para 8.7:** Consortium covers spousal, parental and filial consortium; filial consortium for the parents of a minor child, or an unmarried son or daughter. _Limits:_ The children were minors.

### [United India Insurance Co. Ltd. v Satinder Kaur](https://indiankanoon.org/doc/142302016/)

Supreme Court, 3 judges · (2021) 11 SCC 780; 2020 INSC 447 · grade P

- **paras 8(e)(b)-(c), 9.7:** Consortium is awarded to each eligible claimant; loss of estate and funeral as in Pranay Sethi. _Limits:_ The children were minors.
- **para 9.8:** Upheld a 50% cut for contributory negligence of a driver who died.

### [New India Assurance Co. Ltd. v Somwati](https://indiankanoon.org/doc/97624839/)

Supreme Court, 2 judges · (2020) 9 SCC 644; 2020 INSC 535 · grade P

- **paras 38-40:** Consortium for each claimant entitled to it. _Limits:_ The children were minors.

### [Kirti v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/106405133/)

Supreme Court, 3 judges · (2021) 2 SCC 166; 2021 INSC 6 · grade P

- **paras 10, 12:** Without proof of income, the minimum wage in force on the accident date; a higher category may be used for an educated person.
- **paras 13-14:** Future prospects apply to notional incomes.
- **para 26(c):** Unpaid household work has an economic value. _Limits:_ A death claim; it kept a 25% increase on the unskilled wage for its homemaker.

### [Kajal v Jagdish Chand](https://indiankanoon.org/doc/180443810/)

Supreme Court, 2 judges · (2020) 4 SCC 413; 2020 INSC 135 · 2020-02-05 · grade P

- **paras 20, 24:** An injured child's income taken at the skilled minimum wage; multiplier 18. _Limits:_ An injury claim (a child).
- **paras 21, 22, 25 · applied:** An attendant during treatment, and one carer for life valued at the skilled wage (₹4,846 a month, rounded to ₹5,000).
- **paras 27-29 · applied:** ₹3 lakh for marriage prospects; pain and amenities on its facts.
- _Later treatment:_ Used 18 without discussing Reshma Kumari (three judges, 15).

### [Kurvan Ansari v Shyam Kishore Murmu](https://indiankanoon.org/doc/117494438/)

Supreme Court, 2 judges · 2021 INSC 734; [2021] 7 SCR 366 · grade P

- **para 16 · applied:** A child's death valued at ₹25,000 a year × 15 = ₹3,75,000, with no deduction. _Limits:_ A claim under the old s.163A schedule, for a 2004 accident; it does not fit an ordinary s.166 claim.
- _Later treatment:_ The legal review (B-1) keeps it in the register for the s.163A schedule only.

### [Divya v National Insurance Co. Ltd.](https://indiankanoon.org/doc/161415879/)

Supreme Court, 2 judges · 2022 INSC 1108 · grade P

- Multiplier 15 for an injured two-year-old, following Reshma Kumari. _Limits:_ An injury claim, not a death.

### [Rushi Thapa v Oriental Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2023/11435/11435_2023_2_1501_56835_Judgement_05-Nov-2024.pdf)

Supreme Court, 2 judges · 2024 INSC 837 · 2024-11-05 · grade P · non-reportable

- **para 8:** An injured child's income and a multiplier of 15. _Limits:_ An injury claim (a child).

### [Meenakshi v Oriental Insurance Co. Ltd.](https://indiankanoon.org/doc/72618714/)

Supreme Court, 2 judges · 2024 INSC 573 · 2024-07-23 · grade P

- **paras 6-13:** Allowances that benefit the family count as income; income tax comes off.
- **para 13:** Upheld a tax deduction on its own facts.
- _Later treatment:_ Its own arithmetic is irregular, so it should not be cited as a worked model (legal review B-5).

### [Sidram v Divisional Manager, United India Insurance Co. Ltd.](https://indiankanoon.org/doc/77644422/)

Supreme Court, 2 judges · (2023) 3 SCC 439; 2022 INSC 1204 · 2022-11-16 · grade P

- **para 31:** Future prospects apply to the income of an injured person.

### [Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari](https://api.sci.gov.in/supremecourt/2025/11945/11945_2025_12_42_63111_FinalOrder_08-Aug-2025.pdf)

Supreme Court, 2 judges · 2025 INSC 1070 · 2025-08-08 · grade P

- **paras 9-10, 15:** An injured child's income at the skilled minimum wage. _Limits:_ An injury claim (a child); not a rule for a child's death.
- **para 13 · applied:** Future prospects and multiplier 18 for an injured child; ₹7 lakh in all for pain and amenities (₹2 lakh of it for amenities).
- _Later treatment:_ Used 18 without discussing Reshma Kumari (three judges, 15).

### [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf)

Supreme Court, 2 judges · 2025 INSC 1293 · 2025-11-06 · grade P

- **paras 16-18:** The multiplier is never split.
- **para 19 · applied:** Two 10% steps on the fixed amounts.

### [Baiju v The United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf)

Supreme Court, 2 judges · Order of 28 Nov 2025, SLP(C) 29251/2025 as printed on the order · 2025-11-28 · grade P · non-reportable

- **para 14:** Future prospects on an injured person's income. _Limits:_ An unreported order about an adult.
- **applied:** ₹5 lakh in all for pain and amenities (₹2 lakh of it for amenities).

### [Hasina Yasmin v National Insurance Co. Ltd. (reference to a larger bench on the 10% steps)](https://indiankanoon.org/doc/41904479/)

Supreme Court, 2 judges · 2025 INSC 1501 · 2025-12-17 · grade P

- Referred to a larger bench whether the 10% steps run to the date of decision or are fixed by the accident date; it doubted the first reading and awarded the base amounts for a 1998 accident meanwhile. _Limits:_ A reference order; it decides nothing for later cases.
- _Later treatment:_ No larger-bench decision found as of 24 Oct 2026.

### [Bhagirathi Dash v Union of India, W.P.(C) 166/2024 (interim order on s.166(3) limitation; the 4 Nov 2025 order is not published, the linked order of 17 Feb 2026 continues it)](https://indiankanoon.org/doc/54856662/)

Supreme Court, 2 judges · 2025-11-04 · grade P

- Interim direction that claims not be dismissed as time-barred while the challenge to s.166(3) is decided. _Limits:_ An interim order (with ICICI Lombard v Ayiti Navaneetha); orders of 4 Nov 2025 to 20 Apr 2026 read.
- _Later treatment:_ Check the latest order before relying on it (legal review B-4).

### [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf)

Supreme Court, 2 judges · Order of 10 Mar 2026, SLP(C) 21717/2025 · 2026-03-10 · grade P

- **paras 24, 27:** A third deducted where the wife was the only dependant.
- **para 25:** Future prospects added as Pranay Sethi directs.

### [Mohinder Kaur v Brij Lal Arora](https://indiankanoon.org/doc/14044956/)

Supreme Court, 2 judges · 2026 INSC 477 · grade P · non-reportable

- **para 26 · applied:** A student's income assessed at ₹12,000 a month. _Limits:_ An accident in 2000; a comparator, not a benchmark (legal review B-8).

### [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf)

Supreme Court, 2 judges · 2026 INSC 454 · 2026-05-06 · grade P · non-reportable

- **paras 9-10 · applied:** Two carers at the semi-skilled wage for a 100% disabled child.

### [Reliance General Insurance Co. Ltd. v Priyanka Das](https://indiankanoon.org/doc/142169288/)

Supreme Court, 2 judges · 2026 INSC 950 · grade P · non-reportable

- **para 19:** Functional disability depends on earning ability in the open market, not on keeping a specially adjusted job; its own ₹20 lakh for marriage prospects is not a precedent. _Limits:_ An injury claim.

### M. Paramesh v VRL Logistics Ltd.

Supreme Court · 2026 INSC 655 · 2026-06-23 · grade S

- Occupational consequences can justify a functional disability above the physical certificate; 100% for a mason with 70% physical disability. _Limits:_ Known from law reports and the legal review; the judgment's text is not yet read.

### [New India Assurance Co. Ltd. v Dolly Satish Gandhi](https://api.sci.gov.in/supremecourt/2025/32269/32269_2025_11_1501_71181_Judgement_15-May-2026.pdf)

Supreme Court, 2 judges · 2026 INSC 498 · 2026-05-15 · grade P

- **para 15:** Mediclaim insurance paid to the claimant is not deducted.
- _Later treatment:_ To be checked against the precise mediclaim rule proposed (legal review B-11).

### [Sarla Devi v Reliance General Insurance Co. Ltd.](https://indiankanoon.org/doc/57068626/)

Supreme Court, 3 judges · 2026 INSC 575 · 2026-05-26 · grade P

- **paras 13-19 · ratio:** Ex-gratia equal to the last salary, paid under compassionate-assistance rules, is deducted from loss of dependency; future pay rises, family pension, insurance and provident fund are not. _Limits:_ A death claim; Haryana's 2006 rules. It says nothing about injuries.
- **paras 22-25 · ratio:** A dependant who does not receive the assistance keeps their share.

### [Shishu Pal v Surjeet](https://indiankanoon.org/doc/158690569/)

Supreme Court, 2 judges · 2026 INSC 634 · 2026-06-11 · grade P

- **paras 13, 20, 22:** ₹30,000 a month for loss of domestic care when a homemaker dies, where she ran the household, cared for the children and supported the spouse (or, for parents, supported them), revised 10% every three years, and in addition to her own earnings. _Limits:_ Death claims; women homemakers; all three roles met. Applied to an accident of 2001.
- _Later treatment:_ The Delhi High Court refused it where the three roles were not met (Ganga Devi, 12 Oct 2026).

### [Sameem Begum v K. Venkat Swamy](https://indian-supreme-court-judgments.s3.ap-south-1.amazonaws.com/data/pdf/year=2026/english/2026_9_112_124_EN.pdf)

Supreme Court, 2 judges · 2026 INSC 864; [2026] 9 SCR 112 · 2026-08-14 · grade P

- Parental consortium for adult children. _Limits:_ Children aged 18 to 21 who were dependants.

### [Rashmirekha Tripathy v Branch Manager (Legal Claims), Sriram General Insurance Co. Ltd.](https://indiankanoon.org/doc/164414205/)

Supreme Court, 2 judges · 2026 INSC 661; [2026] 7 SCR 494 · 2026-07-01 · grade P

- **paras 18-20:** Income of the self-employed from an average of tax returns; returns filed after the accident need scrutiny and supporting records. _Limits:_ The average is for the self-employed only.

### [Vimal Kanwar v Kishore Dan](https://indiankanoon.org/doc/119587841/)

Supreme Court, 2 judges · (2013) 7 SCC 476; 2013 INSC 304 · grade P

- **para 19:** Family pension is not deducted.
- **paras 21-23:** Tax may not be deducted without evidence, by presuming the employer deducted it at source.
- _Later treatment:_ Follows Helen Rebello (1998) on collateral benefits.

### [Helen C. Rebello v Maharashtra SRTC](https://indiankanoon.org/doc/1340758/)

Supreme Court, 2 judges · (1999) 1 SCC 90; 1998 INSC 372 · grade P

- Collateral benefits such as life insurance are not deducted from compensation.

### [Khenyei v New India Assurance Co. Ltd.](https://indiankanoon.org/doc/79441201/)

Supreme Court, 3 judges · (2015) 9 SCC 273; 2015 INSC 389 · grade P

- **paras 4, 13, 18 · ratio:** Another driver's fault is never deducted from a claimant who did not contribute (composite negligence); the claimant may recover the whole award from any of the drivers.
- **para 14 · ratio:** The claimant's own fault reduces the award in proportion, whatever their role.

### [Ganga Devi v Rajesh Kumar (Delhi High Court), MAC.APP. 224/2024](https://indiankanoon.org/doc/33193330/)

High Court (DL), 1 judge · 2026-10-12 · grade P

- Shishu Pal's ₹30,000 refused where the three roles it describes were not met.

### [Uma Rani v Simranjeet Singh (Delhi High Court)](https://indiankanoon.org/doc/173432675/)

High Court (DL) · 2026-07-01 · grade P

- **applied:** An injured homemaker's work valued at ₹10,000 a month. _Limits:_ An injury claim.

### [General Insurance Council, "Hit and Run Motor Accident Compensation Claims" (guide, 15 Aug 2023)](https://www.gicouncil.in/media/4262/hit-and-run-motor-accident-compensation-claims.pdf)

guide · 2023-08-15 · grade S

- Accidents from 1 Apr 2022: Rs 2,00,000 for a death and Rs 50,000 for grievous hurt (the 2022 scheme); accidents up to 31 Mar 2022: Rs 25,000 and Rs 12,500 under the Solatium Scheme, 1989. _Limits:_ An industry guide summarising the schemes; the Gazette text of the 2022 scheme has not been read here.

