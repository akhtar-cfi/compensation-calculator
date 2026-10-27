# Delhi tribunal practice, read from the awards' computation tables

**1104 final awards** (Detailed accident reports, Indian Kanoon copies (various Delhi courts), Patiala House, Rohini), decided 2019–2026. Each award's computation table was read by rule (`src/practice/table.ts`); the award texts are held privately and are not in this repository. 131 more tables repeated an award already counted (the same case number, or the same accident date, age and total under a second case number) and are left out.

**This is practice, not law.** It describes awards decided after a hearing, with a table: settlements and awards without a table are not here. No tribunal's choice binds another, and the calculator's rules follow the Supreme Court and the High Court, never these counts.

## Awards read

| Court                                       | Death | Injury |
| ------------------------------------------- | ----- | ------ |
| Detailed accident reports                   | 65    | 125    |
| Indian Kanoon copies (various Delhi courts) | 84    | 147    |
| Patiala House                               | 85    | 47     |
| Rohini                                      | 216   | 335    |

| Award year | Death | Injury |
| ---------- | ----- | ------ |
| 2019       | 1     | 3      |
| 2020       | 2     | 6      |
| 2021       | 1     | 9      |
| 2022       | 15    | 23     |
| 2023       | 49    | 61     |
| 2024       | 96    | 135    |
| 2025       | 130   | 164    |
| 2026       | 155   | 253    |

## Does the calculator's arithmetic reproduce the tribunals'?

The calculator's formula is fed each table's own income, future prospects, deduction or disability, and multiplier, and must come within ₹100 or 1% of the table's loss of dependency (death) or loss of earning capacity (injury). A table that lacks one of these, or whose multiplier had to be worked out from the head itself, is not checkable.

|                                             | Pass | Fail | Not checkable | Pass rate |
| ------------------------------------------- | ---- | ---- | ------------- | --------- |
| Death                                       | 331  | 36   | 83            | 90%       |
| Injury                                      | 0    | 0    | 654           | –         |
| Detailed accident reports                   | 64   | 1    | 125           | 98%       |
| Indian Kanoon copies (various Delhi courts) | 44   | 4    | 183           | 92%       |
| Patiala House                               | 80   | 2    | 50            | 98%       |
| Rohini                                      | 143  | 29   | 379           | 83%       |

Injury tables in these forms give the loss of earning capacity without the multiplier or future prospects behind it, so the head cannot be recomputed from the table alone.

## The open points a table shows

### Multiplier for a child under 15: deaths

The multiplier the table applies where the person who died was under 15 (legal review A-9).

| Option  | Awards | Share |
| ------- | ------ | ----- |
| 18      | 9      | 75%   |
| 15      | 2      | 17%   |
| 14      | 1      | 8%    |
| **All** | **12** |       |

### Multiplier for a child under 15: injuries

The same, where the injured person was under 15.

No award in the set shows this.

### A child's death: the income used

The Delhi minimum-wage category the table's monthly income equals, on the accident date (or, failing that, the award date). Any other figure is 'other' (legal review A-3).

| Option                   | Awards | Share |
| ------------------------ | ------ | ----- |
| Amounts off the schedule | 5      | 45%   |
| Skilled wage             | 5      | 45%   |
| Unskilled wage           | 1      | 9%    |
| **All**                  | **11** |       |

### The 10% steps on estate, funeral and consortium

The number of 10% steps the fixed amounts carry, compared with the steps completed by the accident date and by the award date (legal review A-12).

| Option                                 | Awards  | Share |
| -------------------------------------- | ------- | ----- |
| Counted to the award date              | 232     | 56%   |
| Amounts off the schedule               | 89      | 22%   |
| Counted to the accident date           | 28      | 7%    |
| More steps than either date gives      | 19      | 5%    |
| Same either way (tells nothing)        | 15      | 4%    |
| Amounts with different steps           | 14      | 3%    |
| A date in between (such as the filing) | 9       | 2%    |
| No step, though one had fallen due     | 5       | 1%    |
| Fewer steps than either date gives     | 1       | 0%    |
| **All**                                | **412** |       |

### The 10% steps: compounded or added simply

Where the amounts carry two or more steps, whether each 10% was compounded (the calculator's reading of Pranay Sethi) or added to the base.

| Option                                | Awards  | Share |
| ------------------------------------- | ------- | ----- |
| Compounded (Rs 18,150 at two steps)   | 232     | 94%   |
| Added simply (Rs 18,000 at two steps) | 16      | 6%    |
| **All**                               | **248** |       |

### Future prospects at exactly 50: deaths

The percentage added where the person was 50 (legal review A-21: the 40-50 band gives 30% or 25%, the 50-60 band 15% or 10%).

| Option  | Awards | Share |
| ------- | ------ | ----- |
| 25%     | 2      | 50%   |
| 10%     | 1      | 25%   |
| 30%     | 1      | 25%   |
| **All** | **4**  |       |

### Consortium to a single claimant: the personal deduction

The deduction where consortium went to a single claimant (legal review A-10). A single claimant usually means a single dependant, but not always: some awards gave consortium to the spouse alone while children were also dependants, which a deduction of 1/4 suggests.

| Option  | Awards | Share |
| ------- | ------ | ----- |
| 1/2     | 18     | 49%   |
| 1/3     | 11     | 30%   |
| 1/4     | 7      | 19%   |
| 49%     | 1      | 3%    |
| **All** | **37** |       |

### Functional disability against the certificate

Injury tables that give both the certificate's percentage and the percentage used for loss of earning capacity (legal review A-13).

| Option                      | Awards  | Share |
| --------------------------- | ------- | ----- |
| Lower than the certificate  | 76      | 75%   |
| Equal to the certificate    | 13      | 13%   |
| Higher than the certificate | 12      | 12%   |
| **All**                     | **101** |       |

### Multiplier for adults: deaths

Whether the multiplier is the Sarla Verma table's for the age in the table.

| Option                   | Awards  | Share |
| ------------------------ | ------- | ----- |
| As the Sarla Verma table | 365     | 92%   |
| Another multiplier       | 31      | 8%    |
| **All**                  | **396** |       |

### Multiplier for adults: injuries

The same, for injuries.

No award in the set shows this.

## Interest

### Interest rate: Detailed accident reports

The rate of interest the award grants.

| Option  | Awards  | Share |
| ------- | ------- | ----- |
| 7.5%    | 137     | 85%   |
| 9%      | 22      | 14%   |
| 6%      | 3       | 2%    |
| **All** | **162** |       |

### Interest rate: Indian Kanoon copies (various Delhi courts)

The rate of interest the award grants.

| Option  | Awards  | Share |
| ------- | ------- | ----- |
| 7.5%    | 54      | 31%   |
| 9%      | 52      | 30%   |
| 7%      | 36      | 21%   |
| 8%      | 26      | 15%   |
| 6%      | 5       | 3%    |
| **All** | **173** |       |

### Interest rate: Patiala House

The rate of interest the award grants.

| Option  | Awards  | Share |
| ------- | ------- | ----- |
| 7.5%    | 79      | 66%   |
| 9%      | 36      | 30%   |
| 6%      | 4       | 3%    |
| **All** | **119** |       |

### Interest rate: Rohini

The rate of interest the award grants.

| Option  | Awards  | Share |
| ------- | ------- | ----- |
| 9%      | 388     | 71%   |
| 7.5%    | 89      | 16%   |
| 6.5%    | 34      | 6%    |
| 7%      | 34      | 6%    |
| 6%      | 4       | 1%    |
| 8%      | 1       | 0%    |
| **All** | **550** |       |

## How this is made

`npm run mact -- practice report <rows.jsonl> --out docs/delhi-practice.md`, over one row per award table as the table reader gives it. The rows, and the list of awards whose arithmetic the calculator does not reproduce (`--misses`), carry case numbers and stay in private storage.
