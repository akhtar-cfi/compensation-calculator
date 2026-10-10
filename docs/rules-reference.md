# Rules reference

_Generated from the rule files (rules 2026.10.0-draft) by `npm run mact -- rules doc --write`. Do not edit by hand;
a test fails if this page and the rule files disagree. How the rules fit together: [methodology](methodology.md)._

**Status:** draft. No rule has been signed off by the legal reviewers yet; every rule below says so.

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
| 66–70 | 5 |
| above the table | 5 (Sarla Verma's table stops at 70; courts vary for older victims. Flagged as low confidence.) |

Sources: [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/); [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf). Confidence: settled. Signed off: **no — awaiting legal sign-off**.

## Future prospects

Addition for future prospects, by age and nature of employment (percent of income).

| Age below | Permanent job | Self-employed or fixed salary |
|---:|---:|---:|
| 40 | 50% | 40% |
| 50 | 30% | 25% |
| 61 | 15% | 10% |

Sources: [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); Kirti v Oriental Insurance Co. Ltd.; [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf). Confidence: settled. Signed off: **no — awaiting legal sign-off**.

## Personal-expenses deduction (death)

Deduction for the deceased's personal and living expenses (Sarla Verma, approved in Pranay Sethi).

| Married, dependants | Deduction |
|---|---:|
| 2–3 | 1/3 |
| 4–6 | 1/4 |
| 7–99 | 1/5 |
| Bachelor | 1/2 |
| Bachelor, 3+ dependants | 1/3 (Sarla Verma allows 1/3 where a large family depended on the bachelor (e.g. widowed mother and non-earning siblings).) |

Sources: [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/); [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/). Confidence: settled. Signed off: **no — awaiting legal sign-off**.

## Conventional heads (death)

Loss of estate, funeral expenses and loss of consortium (per claimant: spousal, parental, filial), as fixed in Pranay Sethi with a 10% increase every three years.

Base amounts on 2017-10-31: loss of estate ₹15,000, funeral ₹15,000, consortium ₹40,000 per claimant; +10% every 3 years.

Sources: [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); Magma General Insurance Co. Ltd. v Nanu Ram; United India Insurance Co. Ltd. v Satinder Kaur; [Shishu Pal v Surjeet](https://www.scobserver.in/supreme-court-observer-law-reports-scolr/compensation-for-homemakers-death-shishu-pal-v-surjeet/); Hasina Yasmin (reference to a larger bench on escalation of conventional heads). Confidence: contested. Signed off: **no — awaiting legal sign-off**.

## Notional incomes

Income used when the victim did not earn, or earnings cannot be proved.

- **Homemaker (loss of domestic care):** ₹30,000 a month from 2026-06-11, +10% every 3 years. Shishu Pal: "loss of domestic care" Rs 30,000/month is the stand-in monthly income for a homemaker without monetary income, and is added to proved income if she also earned. Revised 10% cumulatively every three years. Sources: [Shishu Pal v Surjeet](https://www.scobserver.in/supreme-court-observer-law-reports-scolr/compensation-for-homemakers-death-shishu-pal-v-surjeet/).
- **Student, professional course:** ₹12,000 a month. Engineering student (Mohinder Kaur 2026). Used only if higher than the skilled minimum wage. Sources: Mohinder Kaur v Brij Lal Arora.
- **Minor (death), conservative:** ₹25,000 a year × 15. Reported (secondary source) as notional Rs 25,000 a year with multiplier 15. To be verified. Sources: Kurvan Ansari v Shyam Kishore Murmu.

Confidence: contested. Signed off: **no — awaiting legal sign-off**.

## Contested points: conservative / standard / claimant-max

Only legal uncertainty moves the range. Each row is one contested point.

| Point | Conservative | Standard | Claimant-max | Sources |
|---|---|---|---|---|
| Multiplier for a victim aged under 15. (15 in the death line (Kurvan Ansari); 18 in the injury line (Kajal, Hitesh Patel, Hansraj).) | 15 | 18 | 18 | Kurvan Ansari v Shyam Kishore Murmu; Kajal v Jagdish Chand; Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari; [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf) |
| Number of 10% steps applied to the Pranay Sethi conventional heads. (SC awards in 2025-26 mostly use Rs 18,150 / Rs 48,400 (two steps). "clock" = full 3-year steps since 31 Oct 2017 up to the as-of date (three steps from 31 Oct 2026). A larger-bench reference is pending.) | 0 | 2 | clock | [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/); [Shishu Pal v Surjeet](https://www.scobserver.in/supreme-court-observer-law-reports-scolr/compensation-for-homemakers-death-shishu-pal-v-surjeet/); Hasina Yasmin (reference to a larger bench on escalation of conventional heads) |
| Personal deduction for a married deceased whose only dependant is the spouse. | 1/2 | 1/3 | 1/3 | [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/) |
| Monthly income for a homemaker without monetary income. | unskilled_minimum_wage | domestic_care | domestic_care | [Shishu Pal v Surjeet](https://www.scobserver.in/supreme-court-observer-law-reports-scolr/compensation-for-homemakers-death-shishu-pal-v-surjeet/); Kirti v Oriental Insurance Co. Ltd. |
| Income basis for the death of a minor. (The skilled-minimum-wage rule is settled for injured minors; its use for deaths is an HC extension.) | kurvan_notional | skilled_minimum_wage | skilled_minimum_wage | Kurvan Ansari v Shyam Kishore Murmu; Kajal v Jagdish Chand; [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf) |

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

Sources: Raj Kumar v Ajay Kumar; Sidram v Divisional Manager, United India Insurance Co. Ltd.; [Baiju v (final order of 28 Nov 2025)](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf); Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari; [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf); Kajal v Jagdish Chand; Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv. Signed off: **no — awaiting legal sign-off**.

## How far real awards land (shown next to an estimate; not part of it)

Award ÷ standard estimate, middle half. Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test predict check, 10 Oct 2026.

| Claim | Awards | 25th percentile | Median | 75th percentile |
|---|---:|---:|---:|---:|
| Death | 112 | 0.69 | 1 | 1.15 |
| Injury | 113 | 0.89 | 1.19 | 1.82 |

Sources: Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv. Signed off: **no — awaiting legal sign-off**.

## Statutory amounts and time limits

- **No-fault compensation (s.164):** death ₹5,00,000, grievous hurt ₹2,50,000. s.164 no-fault compensation. If it is accepted through the insurer's settlement route (s.149), the s.166 claim petition lapses (s.166(1) proviso). If awarded, it is adjusted against the s.166 award (s.164(3)). Sources: [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf).
- **Hit and run (s.161):** death ₹2,00,000, grievous hurt ₹50,000. Compensation to Victims of Hit and Run Motor Accidents Scheme, 2022 (amounts unchanged by the 2026 amendment). Refundable from any later award (s.163). Sources: [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf).
- **Limitation (s.166(3)):** 6 months. The Supreme Court's interim order (4 Nov 2025) directs that no claim be dismissed as time-barred while the challenge is pending. Sources: [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf); Bhagirathi Dash v Union of India, W.P.(C) 166/2024 (interim order on s.166(3) limitation).
- **Interest illustration:** 6 / 7.5 / 9% over 6 years. No fixed rate; recent awards range 6-9% simple interest from the date of filing. Shown separately, never added to the headline.
- **Typical time to award:** 6 years at tribunals, 8 at High Courts. Sources: [Shishu Pal v Surjeet](https://www.scobserver.in/supreme-court-observer-law-reports-scolr/compensation-for-homemakers-death-shishu-pal-v-surjeet/).

Signed off: **no — awaiting legal sign-off**.

## Income tax (deducted from salary before the formula)

Health and education cess 4%.

| Financial year | Regime | Standard deduction | Rebate up to | Slabs (upper limit: rate) |
|---|---|---:|---:|---|
| 2018-19 | old | ₹40,000 | ₹3,50,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% |
| 2019-20 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% |
| 2020-21 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% |
| 2021-22 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% |
| 2022-23 | old | ₹50,000 | ₹5,00,000 | ₹2,50,000: 0%, ₹5,00,000: 5%, ₹10,00,000: 20%, above: 30% |
| 2023-24 | new | ₹50,000 | ₹7,00,000 (marginal relief) | ₹3,00,000: 0%, ₹6,00,000: 5%, ₹9,00,000: 10%, ₹12,00,000: 15%, ₹15,00,000: 20%, above: 30% |
| 2024-25 | new | ₹75,000 | ₹7,00,000 (marginal relief) | ₹3,00,000: 0%, ₹7,00,000: 5%, ₹10,00,000: 10%, ₹12,00,000: 15%, ₹15,00,000: 20%, above: 30% |
| 2025-26 | new | ₹75,000 | ₹12,00,000 (marginal relief) | ₹4,00,000: 0%, ₹8,00,000: 5%, ₹12,00,000: 10%, ₹16,00,000: 15%, ₹20,00,000: 20%, ₹24,00,000: 25%, above: 30% |
| 2026-27 | new | ₹75,000 | ₹12,00,000 (marginal relief) | ₹4,00,000: 0%, ₹8,00,000: 5%, ₹12,00,000: 10%, ₹16,00,000: 15%, ₹20,00,000: 20%, ₹24,00,000: 25%, above: 30% |

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
| graduate_professional | Graduate / professional (no income proof) | स्नातक / पेशेवर | highly_skilled |

Signed off: **no — awaiting legal sign-off**.

## Minimum wages (official orders only)

Monthly rates unless stated. A gap is listed, never guessed.

### Central sphere - construction schedule

Basic rates fixed by notifications of 19 Jan 2017; VDA revised every 1 April and 1 October from CPI-IW. From 1 Oct 2026 the VDA orders are issued by the Labour Bureau, Chandigarh, under the Code on Wages, 2019 (s.69(2)).

- Official source: https://clc.gov.in/clc/min-wages — Chief Labour Commissioner (C) - VDA orders by scheduled employment (archived copy of 19 Apr 2026 used)
- Last checked: 2026-04-19

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
| 2026-10-01 | C | ₹565/day | ₹661/day | ₹794/day | ₹933/day | File No. 6/1/2026-VDA (Labour Bureau, Chandigarh) | secondary |
| 2026-10-01 | B | ₹704/day | ₹794/day | ₹933/day | ₹1,024/day | File No. 6/1/2026-VDA (Labour Bureau, Chandigarh) | secondary |
| 2026-10-01 | A | ₹840/day | ₹933/day | ₹1,024/day | ₹1,111/day | File No. 6/1/2026-VDA (Labour Bureau, Chandigarh) | secondary |

Gaps:

- Before 1 Oct 2022: not loaded. Older orders are on paged listings (clc.gov.in/clc/min-wages/minimum-wages-1..3) in Wayback captures from 2016 onwards.
- 1 Oct 2026: read from a published copy only; replace with the official Labour Bureau file when found.
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
| 2025-04-01 | All | ₹18,456 | ₹20,371 | ₹22,411 | – | [F.No.(142)/02/MW/VII/Part file/211-241](https://labour.delhi.gov.in/sites/default/files/Labour/generic_multiple_files/da15april2025.pdf) | secondary |

Gaps:

- Before 1 Oct 2011: not loaded.
- 1 Apr 2012 - 31 Mar 2013: no rate. The DA orders of 1 Apr and 1 Oct 2012 were not found (the official page was not updated May 2012 - Oct 2013 and the order PDFs are not archived). Estimates for accidents in this year say so instead of using the 2011 rates.
- 3 Mar 2017 - 31 Oct 2018: legally contested. The 3 Mar 2017 notification was quashed by the Delhi High Court (4 Aug 2018) and its rates restored by the Supreme Court's interim order (31 Oct 2018, from 1 Nov 2018). No lower official series was published for the period. The official series is loaded with a caution; Delhi tribunals in the back-test applied it. For legal sign-off.
- Notification numbers are known only for the orders of Oct 2013, Mar 2017 and Apr 2018; other 2011-2018 rates are read from the Labour Department's own rate page (Wayback copies). The 1 Oct 2011 table prints semi-skilled 7,356 although 7,098 + 260 = 7,358 (recorded as printed).
- 1 Oct 2025 and 1 Apr 2026: no DA order found. The official list (archived 27 Jul 2026) still shows the 1 Apr 2025 order as the latest. Accidents after 1 Apr 2025 use the 1 Apr 2025 rates until an official order is found.
- FORGED ORDER - do not use: F.No.(143)/02/MW/VII/Partfile/212-261 dated 13.10.2025 (Rs 19,846 / 21,813 / 23,905). Declared fraudulent by Labour Department circular Lab-L011/5/2025-Addl.LC-II/3616 dated 14/10/2025, which says no DA order had been issued for the period from 1 Oct 2025 and that the last official increase was effective 1 Apr 2025 (circular seen as an image reproduced on hrsoftwaredelhi.com; official copy not retrieved).
- 1 Oct 2026 revision due; check the official page.
- The Code on Wages, 2019 is reported (secondary sources) to be in force from 21 Nov 2025; its effect on Delhi rates and on the national floor wage is not checked or modelled.

## Sources

| Id | Source | Citation | Date |
|---|---|---|---|
| mv_act_1988 | [Motor Vehicles Act, 1988 (as amended by the Motor Vehicles (Amendment) Act, 2019, in force 1 Apr 2022)](https://prsindia.org/files/bills_acts/bills_parliament/2019/Motor%20Vehicles%20(Amendment)%20Act,%202019.pdf) | statute |  |
| sarla_verma_2009 | [Sarla Verma v Delhi Transport Corporation](https://indiankanoon.org/doc/837924/) | (2009) 6 SCC 121 |  |
| pranay_sethi_2017 | [National Insurance Co. Ltd. v Pranay Sethi (Constitution Bench)](https://indiankanoon.org/doc/139996215/) | (2017) 16 SCC 680 | 2017-10-31 |
| raj_kumar_2011 | Raj Kumar v Ajay Kumar | (2011) 1 SCC 343 |  |
| magma_2018 | Magma General Insurance Co. Ltd. v Nanu Ram | (2018) 18 SCC 130 |  |
| satinder_kaur_2020 | United India Insurance Co. Ltd. v Satinder Kaur | SC |  |
| kirti_2021 | Kirti v Oriental Insurance Co. Ltd. | SC |  |
| kajal_2020 | Kajal v Jagdish Chand | (2020) 4 SCC 413 |  |
| kurvan_ansari_2021 | Kurvan Ansari v Shyam Kishore Murmu | SC |  |
| meenakshi_2024 | Meenakshi v Oriental Insurance Co. Ltd. | 2024 INSC 573 |  |
| sidram_2022 | Sidram v Divisional Manager, United India Insurance Co. Ltd. | SC | 2022-11-16 |
| hitesh_patel_2025 | Hitesh Nagjibhai Patel v Bababhai Nagjibhai Rabari | 2025 INSC 1070 |  |
| preetha_krishnan_2025 | [Preetha Krishnan v United India Insurance Co. Ltd.](https://api.sci.gov.in/supremecourt/2025/8307/8307_2025_12_1501_65419_Judgement_06-Nov-2025.pdf) | 2025 INSC 1293 | 2025-11-06 |
| baiju_2025 | [Baiju v (final order of 28 Nov 2025)](https://api.sci.gov.in/supremecourt/2025/52822/52822_2025_9_59_66372_FinalOrder_28-Nov-2025.pdf) | SC | 2025-11-28 |
| hasina_yasmin_2025 | Hasina Yasmin (reference to a larger bench on escalation of conventional heads) | SC | 2025-12-17 |
| bhagirathi_dash_2025 | Bhagirathi Dash v Union of India, W.P.(C) 166/2024 (interim order on s.166(3) limitation) | SC | 2025-11-04 |
| sushila_2026 | [Sushila v Sudhakar](https://www.livelaw.in/pdf_upload/2026/05/08/2026-livelaw-sc-343-sushila-v-sudhakar-10-mar-2026-672616.pdf) | SC | 2026-03-10 |
| mohinder_kaur_2026 | Mohinder Kaur v Brij Lal Arora | 2026 INSC 477 |  |
| hansraj_2026 | [Hansraj v Mukesh Nath](https://www.livelaw.in/pdf_upload/2026/06/05/2026-livelaw-sc-468-hansraj-v-mukesh-nath-6-may-2026-678078.pdf) | SC | 2026-05-06 |
| dolly_satish_gandhi_2026 | New India Assurance Co. Ltd. v Dolly Satish Gandhi | 2026 INSC 498 |  |
| sarla_devi_2026 | Sarla Devi v Reliance General Insurance (three-judge bench, ex-gratia deduction) | SC | 2026-05-26 |
| shishu_pal_2026 | [Shishu Pal v Surjeet](https://www.scobserver.in/supreme-court-observer-law-reports-scolr/compensation-for-homemakers-death-shishu-pal-v-surjeet/) | 2026 INSC 634 | 2026-06-11 |
| rashmirekha_2026 | Rashmirekha Tripathy (income assessment from ITRs) | 2026 INSC 661 | 2026-07-01 |
| vimal_kanwar_2013 | Vimal Kanwar v Kishore Dan | (2013) 7 SCC 476 |  |
| helen_rebello_1998 | Helen C. Rebello v Maharashtra SRTC | SC |  |
| khenyei_2015 | Khenyei v New India Assurance Co. Ltd. | (2015) 9 SCC 273 |  |
| karan_singh_bisht_2026 | [Karan Singh Bisht v Ravi Singh (MACT-01, Patiala House Courts, New Delhi; DAR 350/2020)](https://indiankanoon.org/doc/105820332/) | MACT Delhi | 2026-08-17 |
| delhi_awards_backtest_2026 | Delhi motor accident claims tribunal awards 2024-26 (Indian Kanoon), back-test sample, per-head amounts in data/backtest/injury_heads.csv | dataset | 2026-10-10 |
