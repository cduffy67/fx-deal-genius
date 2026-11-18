import type { Deal } from "./storage";
import { toEurEquivalent } from "./fx";

/**
 * Single source of truth for review thresholds (GBP equivalent).
 * Used by the governance check, the deal status, the recommended next step
 * and the exports, so they can never disagree.
 */
export const REVIEW_THRESHOLDS_GBP = {
  treasury: 1_000_000, // P1
  compliance: 5_000_000, // P2
} as const;

export type PolicyOutcome =
  | "Approved for Indicative Review"
  | "Needs Treasury Review"
  | "Needs Compliance Review"
  | "Needs More Information"
  | "Enhanced Review Recommended";

export type PolicyRule = {
  id: string;
  text: string;
};

export const NORTON_FX_POLICY: PolicyRule[] = [
  { id: "P1", text: "Any FX request above £1,000,000 equivalent requires Treasury Review before an indicative customer quote can be prepared." },
  { id: "P2", text: "Any FX request above £5,000,000 equivalent requires Treasury Review and Compliance notification." },
  { id: "P3", text: "ECB reference rates and Frankfurter API rates may be used for internal indicative analysis only. They must not be presented as executable customer quotes." },
  { id: "P4", text: "High urgency requests for high relationship value clients should be prioritised for same-day review by the Relationship Manager and Treasury team." },
  { id: "P5", text: "Requests with missing purpose, incomplete notes, or unclear customer context should be returned to the Relationship Manager for clarification." },
  { id: "P6", text: "All customer-facing quotes require an approved market data provider such as Bloomberg, Refinitiv, OANDA, or another Norton Bank-approved source." },
  { id: "P7", text: "Production systems must maintain an audit trail including requestor, timestamp, rate source, approval status, reviewer and final action." },
  { id: "P8", text: "Customer names, deal sizes and relationship notes should be treated as confidential business data." },
  { id: "P9", text: "Any policy exception must be recorded with reason, approver and timestamp." },
  { id: "P10", text: "Deals involving sensitive industries, unusually high urgency, or unusually large notional values should be flagged for enhanced review." },
];

export const POLICY_DOC_NAME = "Norton Bank FX Governance Pack";
export const POLICY_DOC_VERSION = "Demo v1";
export const POLICY_DOC_OWNER = "Norton Bank Treasury Operations";
export const POLICY_SOURCE_LABEL = `${POLICY_DOC_NAME}, ${POLICY_DOC_VERSION}`;

export type GovernanceCheck = {
  outcome: PolicyOutcome;
  matchedRules: PolicyRule[];
  explanation: string;
  nextAction: string;
  source: string;
  gbpEquivalent: number;
};

function ruleById(id: string): PolicyRule {
  return NORTON_FX_POLICY.find((r) => r.id === id)!;
}

/**
 * GBP equivalent of the deal notional. Uses the deal's own rate when GBP is
 * one leg of the pair; otherwise crosses via the static EUR pivot table.
 */
export function gbpEquivalent(
  deal: Pick<Deal, "amount" | "baseCcy" | "targetCcy" | "convertedAmount">,
): number {
  if (deal.baseCcy === "GBP") return deal.amount;
  if (deal.targetCcy === "GBP") return deal.convertedAmount;
  return toEurEquivalent(deal.amount, deal.baseCcy) * 0.85; // GBP per EUR (fx.ts fallback table)
}

function fmtGbp(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

export function evaluateGovernance(deal: Deal): GovernanceCheck {
  const gbp = gbpEquivalent(deal);
  const matched: PolicyRule[] = [];
  const explanations: string[] = [];

  // Always: indicative-only + approved-source requirement
  matched.push(ruleById("P3"));
  matched.push(ruleById("P6"));
  explanations.push(
    "ECB / Frankfurter rates are indicative only — any customer-executable quote must come from a Norton Bank-approved market data provider (Bloomberg, Refinitiv or OANDA).",
  );

  // P5: missing purpose, notes, client name or amount (e.g. an email that never says how much).
  const incompleteContext =
    !deal.purpose.trim() || !deal.notes.trim() || !deal.customerName.trim() || !(deal.amount > 0);
  const overCompliance = gbp > REVIEW_THRESHOLDS_GBP.compliance;
  const overTreasury = gbp > REVIEW_THRESHOLDS_GBP.treasury;
  const enhancedFlag =
    deal.urgency === "High" && deal.relationshipValue === "High";

  if (incompleteContext) {
    matched.push(ruleById("P5"));
    explanations.push(
      "Key details (client, amount, purpose or notes) are missing — under P5 this request must be returned to the Relationship Manager for clarification before progressing.",
    );
  }
  if (overCompliance) {
    matched.push(ruleById("P1"));
    matched.push(ruleById("P2"));
    explanations.push(
      `Notional of ~${fmtGbp(gbp)} exceeds the ${fmtGbp(REVIEW_THRESHOLDS_GBP.compliance)} threshold — Treasury Review and Compliance notification are required under P1 and P2.`,
    );
  } else if (overTreasury) {
    matched.push(ruleById("P1"));
    explanations.push(
      `Notional of ~${fmtGbp(gbp)} exceeds the ${fmtGbp(REVIEW_THRESHOLDS_GBP.treasury)} threshold — Treasury Review is required under P1 before an indicative customer quote can be prepared.`,
    );
  }
  if (enhancedFlag) {
    matched.push(ruleById("P4"));
    matched.push(ruleById("P10"));
    explanations.push(
      "High urgency on a high relationship value client — P4 and P10 require same-day prioritisation and enhanced review by the Relationship Manager and Treasury team.",
    );
  }

  // Outcome priority: More Info > Compliance > Treasury > Enhanced > Approved
  let outcome: PolicyOutcome;
  let nextAction: string;
  if (incompleteContext) {
    outcome = "Needs More Information";
    nextAction =
      "Return to the Relationship Manager to capture purpose of funds and complete deal notes before further review.";
  } else if (overCompliance) {
    outcome = "Needs Compliance Review";
    nextAction =
      "Route to Norton Bank Treasury for validation and notify Compliance before any customer-facing quote is issued.";
  } else if (overTreasury) {
    outcome = "Needs Treasury Review";
    nextAction =
      "Submit to Norton Bank Treasury for review and approval prior to preparing an indicative customer quote.";
  } else if (enhancedFlag) {
    outcome = "Enhanced Review Recommended";
    nextAction =
      "Prioritise for same-day review by the Relationship Manager and Treasury team given the high-urgency, high-value profile.";
  } else {
    outcome = "Approved for Indicative Review";
    nextAction =
      "Cleared for internal indicative discussion. Any customer-facing quote must use a Norton Bank-approved market data provider.";
  }

  // De-duplicate matched rules while preserving order
  const seen = new Set<string>();
  const dedup = matched.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));

  return {
    outcome,
    matchedRules: dedup,
    explanation: explanations.join(" "),
    nextAction,
    source: POLICY_SOURCE_LABEL,
    gbpEquivalent: gbp,
  };
}
