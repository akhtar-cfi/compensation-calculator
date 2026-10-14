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

/**
 * Rupees with paise when the amount is not whole ("₹33,333.33"), for the inputs of a worked line: rounded inputs
 * would not multiply out to the amount shown.
 */
export function formatINRPrecise(n: number): string {
  const paise = Math.round(Math.abs(n) * 100) % 100;
  if (paise === 0) return formatINR(n);
  const whole = formatINR(n < 0 ? Math.ceil(n) : Math.floor(n));
  return `${whole}.${String(paise).padStart(2, "0")}`;
}

/**
 * Human figure to two significant digits in lakh/crore: 5281500 -> "₹53 lakh". Rounds the whole-rupee amount
 * (halves up) before choosing the unit, so 115000 -> "₹1.2 lakh" and 9950000 -> "₹1 crore".
 */
export function formatApprox(n: number): string {
  const abs = Math.round(Math.abs(n));
  const step = 10 ** Math.max(0, String(abs).length - 2);
  const r = Math.round(abs / step) * step;
  const sign = n < 0 && r > 0 ? "-" : "";
  if (r >= 1e7) return `₹${sign}${r / 1e7} crore`;
  if (r >= 1e5) return `₹${sign}${r / 1e5} lakh`;
  return formatINR(n < 0 ? -r : r);
}

/** A factor in a worked calculation: 1.5, 1.15 (no trailing zeros). */
export function formatFactor(x: number): string {
  return String(Number(x.toFixed(4)));
}

/** A share as people write it in a calculation: 1/3, 1/2, or a decimal when it is not one over a whole number. */
export function formatShare(x: number): string {
  const inv = 1 / x;
  return x > 0 && Math.abs(inv - Math.round(inv)) < 1e-9 ? `1/${Math.round(inv)}` : formatFactor(x);
}
