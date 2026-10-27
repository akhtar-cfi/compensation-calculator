/**
 * A rule-based screen of motor-claim appeals for the legal review's open points: which judgments
 * might decide a point the Supreme Court has not settled, so that a person (or an extraction run)
 * reads those first. Matching words are a reason to read a judgment, never a finding about it: a hit
 * can be a passing mention, an argument the court rejected, or a quotation.
 *
 * The screen keeps no text from the judgment, only which points matched and how often.
 */

export interface OpenPoint {
  id: string;
  /** The question in plain words, as the register asks it. */
  question: string;
  patterns: readonly RegExp[];
}

const W = "[\\s\\S]"; // any character, across lines

/** Ids follow rules/range-parameters.yaml where the point is there, else the legal review's item. */
export const OPEN_POINTS: readonly OpenPoint[] = [
  {
    id: "under_15_multiplier",
    question: "Multiplier for a child under 15: 15 or 18?",
    patterns: [
      new RegExp(
        `\\b(?:minor|child|aged (?:about )?(?:[1-9]|1[0-4]) years)${W}{0,300}multiplier (?:of )?(?:15|18)\\b`,
        "i",
      ),
      new RegExp(`multiplier (?:of )?(?:15|18)\\b${W}{0,300}\\b(?:minor|child)\\b`, "i"),
    ],
  },
  {
    id: "child_death_income",
    question: "A child's death: what income?",
    patterns: [
      new RegExp(
        `(?:death of (?:a|the) (?:minor|child)|deceased (?:was )?(?:a )?(?:minor|child))${W}{0,500}(?:notional income|minimum wages?|kurvan ansari)`,
        "i",
      ),
    ],
  },
  {
    id: "homemaker_income",
    question: "A homemaker's death or injury: what income?",
    patterns: [
      new RegExp(
        `(?:home ?maker|house ?wife|domestic work|household work)${W}{0,400}(?:income|notional|minimum wages?|gratuitous)`,
        "i",
      ),
      /shishu pal/i,
    ],
  },
  {
    id: "spouse_only_deduction",
    question: "One dependant (a spouse, a child or a parent): a half or a third?",
    patterns: [
      new RegExp(
        `(?:only|sole|single|one) (?:dependant|dependent|legal (?:heir|representative)|claimant)${W}{0,300}(?:1\\s*/\\s*[23]|one[- ](?:half|third)|50\\s*%)`,
        "i",
      ),
      new RegExp(
        `(?:1\\s*/\\s*[23]|one[- ](?:half|third))${W}{0,200}(?:only|sole|single|one) (?:dependant|dependent|legal (?:heir|representative))`,
        "i",
      ),
    ],
  },
  {
    id: "consortium_children_parents",
    question: "Consortium for adult or married children, and for the parents of a married adult?",
    patterns: [
      /\b(?:filial|parental) consortium\b/i,
      new RegExp(`consortium${W}{0,200}(?:married|major|adult) (?:son|daughter|child)`, "i"),
    ],
  },
  {
    id: "conventional_escalation_steps",
    question: "The 10% steps on the fixed amounts: counted to the accident or to the decision?",
    patterns: [new RegExp(`(?:10\\s*%|ten per ?cent)${W}{0,120}every three years`, "i"), /hasina yasmin/i],
  },
  {
    id: "future_prospects_at_50",
    question: "Future prospects at exactly 50?",
    patterns: [
      new RegExp(`aged? (?:about |of )?50 years${W}{0,500}future prospects`, "i"),
      new RegExp(`future prospects${W}{0,300}(?:age|aged) (?:of )?50\\b`, "i"),
    ],
  },
  {
    id: "functional_pct",
    question: "A limb certificate: what functional (earning) disability?",
    patterns: [
      /functional disability/i,
      new RegExp(`loss of earning capacity${W}{0,120}(?:%|per ?cent)`, "i"),
    ],
  },
  {
    id: "injured_homemaker_income",
    question: "An injured homemaker: what income?",
    patterns: [
      new RegExp(`(?:injured|injuries)${W}{0,300}(?:home ?maker|house ?wife)`, "i"),
      new RegExp(`(?:home ?maker|house ?wife)${W}{0,300}(?:injured|injuries|disability)`, "i"),
    ],
  },
  {
    id: "non_earning_elderly",
    question: "An elderly person without income or a pension: what income?",
    patterns: [
      new RegExp(
        `(?:aged? (?:about )?(?:6[5-9]|[7-9]\\d) years|retired|senior citizen)${W}{0,400}(?:no (?:proof of )?income|not (?:earning|working)|non-?earning|notional income)`,
        "i",
      ),
    ],
  },
  {
    id: "tax_on_salary",
    question: "Tax on a salary when the slip shows none?",
    patterns: [
      new RegExp(`income[- ]?tax${W}{0,200}(?:deduct|salary|slip|taxable)`, "i"),
      /\btds\b|tax deducted at source|form[- ]16\b/i,
    ],
  },
  {
    id: "attendant_rate",
    question: "Attendant charges: at what rate?",
    patterns: [new RegExp(`attendant${W}{0,200}(?:per month|per day|minimum wages?)`, "i")],
  },
  {
    id: "late_claims",
    question: "Claims filed after six months (s.166(3))?",
    patterns: [/166\s*\(\s*3\s*\)/, /time[- ]?barred|period of limitation/i],
  },
  {
    id: "wage_of_another_state",
    question: "Whose minimum wage for a person living or working in another state?",
    patterns: [
      /minimum wages? (?:of|in|applicable in|notified (?:in|by)) (?:the )?(?:state of )?(?:haryana|uttar pradesh|u\.p\.|rajasthan|bihar|punjab|madhya pradesh)/i,
    ],
  },
];

export interface ScreenHit {
  point: string;
  /** How many of the point's patterns matched (a rough strength, not a count of mentions). */
  patterns: number;
}

/** The open points a judgment's text touches. */
export function screenText(text: string): ScreenHit[] {
  return OPEN_POINTS.map((p) => ({
    point: p.id,
    patterns: p.patterns.filter((re) => re.test(text)).length,
  })).filter((h) => h.patterns > 0);
}

export interface Screened {
  doc_id: string;
  /** The text's hash: cross-appeals decided by one judgment are one text under two records. */
  sha?: string;
  hits: ScreenHit[];
  /** The bulk route's own score (court, bench, date, topics): rank.ts. */
  score: number;
}

/**
 * Picks judgments to read first: greedily, the one that covers the most open points not yet covered
 * (ties to the higher score), until each point has `perPoint` judgments or `max` are picked.
 */
export function pickForReading(
  docs: readonly Screened[],
  opts: { max: number; perPoint: number },
): Screened[] {
  const covered = new Map<string, number>();
  const seen = new Set<string>();
  const left = docs.filter((d) => !d.sha || (!seen.has(d.sha) && seen.add(d.sha)));
  const out: Screened[] = [];
  const gain = (d: Screened) => d.hits.filter((h) => (covered.get(h.point) ?? 0) < opts.perPoint).length;
  while (out.length < opts.max && left.length) {
    left.sort((a, b) => gain(b) - gain(a) || b.score - a.score || a.doc_id.localeCompare(b.doc_id));
    const best = left.shift()!;
    if (gain(best) === 0) break;
    out.push(best);
    for (const h of best.hits) covered.set(h.point, (covered.get(h.point) ?? 0) + 1);
  }
  return out;
}
