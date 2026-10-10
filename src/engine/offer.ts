import type { EstimateOutput } from "./types.js";

export interface OfferCheckOptions {
  /** Years until a tribunal award is likely (default: tribunal pendency from the rules). */
  yearsToAward: number;
  /** Simple interest the tribunal typically adds on the award, % a year. */
  awardInterestPct: number;
  /** Rate used to compare money now with money later, % a year. */
  discountPct: number;
  /** Lawyer's fee as a share of the award, % (note: contingency fees are barred for advocates). */
  lawyerFeePct: number;
}

export interface OfferCheck {
  offer: number;
  entitlementStandard: number;
  entitlementConservative: number;
  offerPctOfStandard: number;
  offerPctOfConservative: number;
  awardWithInterest: number;
  lawyerFee: number;
  presentValueOfWaiting: number;
  offerVsPresentValuePct: number;
  notes: string[];
}

/** Compare a settlement offer with the estimated entitlement, including time, interest and fees. */
export function checkOffer(est: EstimateOutput, offer: number, o: OfferCheckOptions): OfferCheck {
  if (!est.eligible || !est.range) throw new Error("No eligible estimate to compare the offer with.");
  const std = est.range.standard;
  const con = est.range.conservative;
  const awardWithInterest = std * (1 + (o.awardInterestPct / 100) * o.yearsToAward);
  const lawyerFee = (awardWithInterest * o.lawyerFeePct) / 100;
  const pv = (awardWithInterest - lawyerFee) / Math.pow(1 + o.discountPct / 100, o.yearsToAward);
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
  const notes = [
    `Waiting assumes the tribunal awards the standard estimate after about ${o.yearsToAward} years, with ${o.awardInterestPct}% simple interest.`,
    "Waiting carries risk: the award can be lower (disputed income, disability or negligence) and appeals add years.",
    "Under Bar Council rules an advocate may not charge a fee that is a share of the award.",
  ];
  return {
    offer,
    entitlementStandard: std,
    entitlementConservative: con,
    offerPctOfStandard: pct(offer, std),
    offerPctOfConservative: pct(offer, con),
    awardWithInterest: Math.round(awardWithInterest),
    lawyerFee: Math.round(lawyerFee),
    presentValueOfWaiting: Math.round(pv),
    offerVsPresentValuePct: pct(offer, pv),
    notes,
  };
}
