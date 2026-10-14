/**
 * A visible, rule-based weight for sorting judgments for legal review. It is a sorting aid, not a
 * legal opinion: whether a judgment was overruled, distinguished or is per incuriam needs a lawyer.
 *
 * Points:
 * - scope: Supreme Court 50 (binds every tribunal, Art. 141); a High Court 30 (binds its own state's
 *   tribunals; elsewhere only persuasive);
 * - bench: three or more judges +15; two judges (a division bench) +8;
 * - citations: 5 x log2(1 + times cited), at most 20 (Indian Kanoon's count when known, else the
 *   count of later judgments in our own collection that name it);
 * - topics: 5 for each topic it decides from TOPIC_PATTERNS, at most 15;
 * - date: +5 if decided after Pranay Sethi (31 Oct 2017), a further +5 if after Shishu Pal (11 Jun 2026).
 */
export const PRANAY_SETHI = "2017-10-31";
export const SHISHU_PAL = "2026-06-11";

/** Topics a judgment may decide, found by words in its text (ids match src/agent/rotation.ts TOPICS). */
export const TOPIC_PATTERNS: Readonly<Record<string, RegExp>> = {
  multiplier: /\bmultiplier\b/i,
  future_prospects: /future prospects?/i,
  homemaker: /home ?maker|house ?wife|domestic (work|care)/i,
  minor_child: /\bminor\b.{0,80}notional|notional income.{0,80}\b(child|minor)\b/is,
  consortium: /\bconsortium\b/i,
  functional_disability: /functional disability/i,
  interest: /rate of interest|interest @|interest at the rate/i,
  limitation: /166\s*\(3\)|time.?barred|limitation/i,
  legal_offer: /legal offer/i,
  contributory_negligence: /contributory negligence|composite negligence/i,
  personal_deduction: /personal (and living )?expenses|deduction of (one|1\/)/i,
  pay_and_recover: /pay and recover/i,
  student: /\bstudent\b/i,
  pensioner: /\bpension(er)?\b.{0,60}(deceased|income)/is,
};

export function topicsIn(text: string): string[] {
  return Object.entries(TOPIC_PATTERNS)
    .filter(([, re]) => re.test(text))
    .map(([id]) => id);
}

export interface RankInput {
  level: "sc" | "hc";
  judges: number;
  decided?: string;
  citedBy?: number;
  topics: readonly string[];
}

export interface RankResult {
  score: number;
  why: string[];
}

export function rank(x: RankInput): RankResult {
  const why: string[] = [];
  let score = 0;
  const add = (n: number, reason: string) => {
    if (n > 0) {
      score += n;
      why.push(`+${n} ${reason}`);
    }
  };
  add(x.level === "sc" ? 50 : 30, x.level === "sc" ? "Supreme Court" : "High Court");
  add(x.judges >= 3 ? 15 : x.judges === 2 ? 8 : 0, `${x.judges} judges`);
  if (x.citedBy) add(Math.min(20, Math.round(5 * Math.log2(1 + x.citedBy))), `cited ${x.citedBy} times`);
  const t = [...new Set(x.topics)];
  add(Math.min(15, 5 * t.length), `topics: ${t.join(", ")}`);
  if (x.decided && x.decided > PRANAY_SETHI) add(5, "after Pranay Sethi");
  if (x.decided && x.decided > SHISHU_PAL) add(5, "after Shishu Pal");
  return { score, why };
}
