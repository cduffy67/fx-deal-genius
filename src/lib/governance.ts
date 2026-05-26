import type { Deal } from "./storage";
import { toEurEquivalent } from "./fx";

export type PolicyOutcome =
  | "Approved for indicative review"
  | "Needs Treasury Review"
  | "Needs Compliance Review"
  | "Needs More Information";

export type PolicyRule = {
  id: string;
  text: string;
};

export const NORTON_FX_POLICY: PolicyRule[] = [
  { id: "P1", text: "Any FX request above £1,000,000 equivalent requires Treasury review before customer quote." },
  { id: "P2", text: "Any FX request above £5,000,000 equivalent requires Treasury review and Compliance notification." },
  { id: "P3", text: "ECB reference rates may be used for internal indicative analysis only. They must not be used as executable customer quotes." },
  { id: "P4", text: "High urgency requests for high-value clients should be prioritised for same-day review." },
  { id: "P5", text: "Requests involving missing customer purpose or incomplete notes should be returned to the relationship manager for clarification." },
  { id: "P6", text: "All customer-facing quotes require an approved market data provider such as Bloomberg, Refinitiv or OANDA." },
  { id: "P7", text: "Production systems must maintain an audit trail including requestor, timestamp, rate source, approval status and final action." },
  { id: "P8", text: "Customer names and notional values should be treated as confidential business data." },
  { id: "P9", text: "Any exception to policy must be recorded with reason, approver and timestamp." },
];

export const POLICY_SOURCE_LABEL = "Northbank FX Governance Pack, Demo v1";

export type GovernanceCheck = {
  outcome: PolicyOutcome;
  matchedRules: PolicyRule[];
  explanation: string;
  nextAction: string;
  source: string;
  gbpEquivalent: number;
};

// Convert to GBP equivalent via EUR pivot (using fx fallback table for stable thresholds).
function toGbpEquivalent(amount: number, ccy: Deal["baseCcy"]): number {
  const eur = toEurEquivalent(amount, ccy);
  // GBP per EUR ≈ 0.85 (matches fx.ts EUR_FALLBACK)
  return eur * 0.85;
}

export function evaluateGovernance(deal: Deal): GovernanceCheck {
  const gbp = toGbpEquivalent(deal.amount, deal.baseCcy);
  const matched: PolicyRule[] = [];
  const explanations: string[] = [];

  // Always applies: ECB rates are indicative only
  matched.push(NORTON_FX_POLICY[2]); // P3
  matched.push(NORTON_FX_POLICY[5]); // P6
  explanations.push(
    "ECB / Frankfurter rates are indicative only — a customer-executable quote must come from an approved market data provider (Bloomberg, Refinitiv or OANDA).",
  );

  const incompleteContext = !deal.purpose.trim() || !deal.notes.trim();
  if (incompleteContext) {
    matched.push(NORTON_FX_POLICY[4]); // P5
    explanations.push(
      "Customer purpose or notes are missing — under P5 this request should be returned to the relationship manager for clarification before progressing.",
    );
  }

  const overCompliance = gbp > 5_000_000;
  const overTreasury = gbp > 1_000_000;

  if (overCompliance) {
    matched.push(NORTON_FX_POLICY[0]); // P1
    matched.push(NORTON_FX_POLICY[1]); // P2
    explanations.push(
      `Notional of ~£${Math.round(gbp).toLocaleString("en-GB")} exceeds the £5,000,000 threshold — Treasury review and Compliance notification are required under P1 and P2.`,
    );
  } else if (overTreasury) {
    matched.push(NORTON_FX_POLICY[0]); // P1
    explanations.push(
      `Notional of ~£${Math.round(gbp).toLocaleString("en-GB")} exceeds the £1,000,000 threshold — Treasury review is required under P1 before a customer quote can be issued.`,
    );
  }

  if (deal.urgency === "High" && deal.relationshipValue === "High") {
    matched.push(NORTON_FX_POLICY[3]); // P4
    explanations.push(
      "High urgency on a high-value client — P4 requires this to be prioritised for same-day review.",
    );
  }

  let outcome: PolicyOutcome;
  let nextAction: string;
  if (incompleteContext) {
    outcome = "Needs More Information";
    nextAction = "Return to relationship manager to capture purpose of funds and complete deal notes.";
  } else if (overCompliance) {
    outcome = "Needs Compliance Review";
    nextAction = "Route to Treasury for validation and notify Compliance before any customer-facing quote.";
  } else if (overTreasury) {
    outcome = "Needs Treasury Review";
    nextAction = "Submit to Treasury for review and approval prior to issuing an indicative customer quote.";
  } else {
    outcome = "Approved for indicative review";
    nextAction =
      "May be used for internal indicative discussion. Any customer-facing quote must use an approved market data provider.";
  }

  return {
    outcome,
    matchedRules: matched,
    explanation: explanations.join(" "),
    nextAction,
    source: POLICY_SOURCE_LABEL,
    gbpEquivalent: gbp,
  };
}
