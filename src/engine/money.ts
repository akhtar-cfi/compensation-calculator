/** Money is held in rupees as floating values during computation and rounded once per payable head. */
export function rupees(n: number): number {
  return Math.round(n);
}

export function parseFraction(s: string): number {
  const m = /^(\d+)\/(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`Invalid fraction: ${s}`);
  const den = Number(m[2]);
  if (den === 0) throw new Error(`Zero denominator: ${s}`);
  return Number(m[1]) / den;
}

/** Indian digit grouping: 5281500 -> "52,81,500". */
export function formatINR(n: number): string {
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${neg ? "-" : ""}₹${grouped}`;
}

/** Human figure to two significant digits in lakh/crore: 5281500 -> "₹53 lakh". */
export function formatApprox(n: number): string {
  const abs = Math.abs(n);
  const round2 = (x: number) => Number(x.toPrecision(2));
  if (abs >= 1e7) return `₹${round2(n / 1e7)} crore`;
  if (abs >= 1e5) return `₹${round2(n / 1e5)} lakh`;
  return formatINR(round2(n));
}
