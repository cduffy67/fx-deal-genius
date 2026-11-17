import { formatCurrency } from "./fx";
import type { Deal } from "./storage";
import {
  evaluateGovernance,
  gbpEquivalent,
  REVIEW_THRESHOLDS_GBP,
  type GovernanceCheck,
} from "./governance";

export type DealStatus =
  | "Draft"
  | "Needs Treasury Review"
  | "Ready for Follow-up"
  | "Demo Data";

export type NextStep =
  | "Proceed to treasury validation"
  | "Request more customer information"
  | "Prepare indicative customer quote"
  | "Escalate for compliance review";

export type Analysis = {
  summary: string;
  businessValue: string[];
  risks: string[];
  nextStep: NextStep;
  questions: string[];
  status: DealStatus;
};

/** Where the narrative sections came from. Decisions always come from the policy engine. */
export type Provenance = { kind: "ai"; model: string; generatedAt: string } | { kind: "rules" };

export type DealPack = Analysis & {
  governance: GovernanceCheck;
  governanceExplanation: string;
  provenance: Provenance;
};

type Tier = "small" | "mid" | "large" | "strategic";

// Tiers line up with the governance thresholds (GBP equivalent).
function tierOf(gbp: number): Tier {
  if (gbp < 50_000) return "small";
  if (gbp <= REVIEW_THRESHOLDS_GBP.treasury) return "mid";
  if (gbp <= REVIEW_THRESHOLDS_GBP.compliance) return "large";
  return "strategic";
}

/** Status shown in the table and pack header — derived from the governance outcome. */
export function deriveStatus(deal: Deal, g: GovernanceCheck = evaluateGovernance(deal)): DealStatus {
  if (deal.rateSource === "demo-fallback") return "Demo Data";
  switch (g.outcome) {
    case "Needs More Information":
      return "Draft";
    case "Needs Compliance Review":
    case "Needs Treasury Review":
      return "Needs Treasury Review";
    default:
      return "Ready for Follow-up";
  }
}

/** Recommended next step — derived from the governance outcome. */
function deriveNextStep(g: GovernanceCheck): NextStep {
  switch (g.outcome) {
    case "Needs More Information":
      return "Request more customer information";
    case "Needs Compliance Review":
      return "Escalate for compliance review";
    case "Needs Treasury Review":
    case "Enhanced Review Recommended":
      return "Proceed to treasury validation";
    default:
      return "Prepare indicative customer quote";
  }
}

/** Deterministic, rule-based analysis. Used as-is when AI is unavailable. */
export function analyseDeal(deal: Deal, g: GovernanceCheck = evaluateGovernance(deal)): Analysis {
  const gbp = gbpEquivalent(deal);
  const tier = tierOf(gbp);
  const pair = `${deal.baseCcy}/${deal.targetCcy}`;
  const industry = deal.customerIndustry || "industry not specified";
  const needsReview = g.outcome === "Needs Treasury Review" || g.outcome === "Needs Compliance Review";

  // ---------- Summary ----------
  const summary =
    `${deal.customerName} (${industry}) is requesting a ` +
    `${formatCurrency(deal.amount, deal.baseCcy)} → ${deal.targetCcy} conversion ` +
    `for "${deal.purpose || "unspecified purpose"}". ` +
    `Indicative rate ${deal.rate.toFixed(4)} ${pair}, settling ` +
    `${formatCurrency(deal.convertedAmount, deal.targetCcy)}. ` +
    `Urgency: ${deal.urgency}. Relationship tier: ${deal.relationshipValue}.`;

  // ---------- Business value ----------
  const businessValue: string[] = [];
  if (tier === "strategic")
    businessValue.push("Strategic ticket size — material desk revenue opportunity if executed.");
  else if (tier === "large")
    businessValue.push("Large notional — meaningful spread contribution for the desk.");
  else if (tier === "mid")
    businessValue.push("Mid-market flow — standard desk margin, automation candidate.");
  else businessValue.push("Small ticket — preserve margin via straight-through processing.");

  if (deal.relationshipValue === "High")
    businessValue.push(
      `Tier-1 ${industry.toLowerCase()} client — protect wallet share with preferential pricing.`,
    );
  else if (deal.relationshipValue === "Medium")
    businessValue.push(`Established ${industry.toLowerCase()} relationship — competitive pricing expected.`);
  else
    businessValue.push("Lower-tier relationship — opportunity to deepen wallet share if priced well.");

  if (deal.purpose)
    businessValue.push(`Stated purpose "${deal.purpose}" aligns with recurring corporate FX flow.`);
  if (deal.urgency === "High")
    businessValue.push("Urgent execution — chance to demonstrate desk responsiveness.");

  // ---------- Risks ----------
  const risks: string[] = [
    "FX rate shown is an ECB reference rate (Frankfurter) — indicative only, not executable.",
  ];
  if (needsReview)
    risks.push(
      `Notional of ~£${Math.round(gbp).toLocaleString("en-GB")} is above the review threshold — Treasury sign-off and credit-line confirmation required before quoting.`,
    );
  if (!deal.customerIndustry || !deal.notes.trim())
    risks.push("Customer context is incomplete — validate KYC, purpose of funds and counterparty profile.");
  if (deal.urgency === "High")
    risks.push("Tight execution window leaves limited room for re-quote or escalation.");
  risks.push(
    "Production use would require an approved tradeable data source, full audit trail and MiFID II record-keeping.",
  );

  // ---------- Questions ----------
  const questions: string[] = [
    `Confirm value date and settlement instructions for ${deal.targetCcy}.`,
    `Is this a one-off conversion or part of recurring ${pair} flow we can size for?`,
    "Any hedging requirement (forward, option) the desk should price alongside the spot?",
  ];
  if (needsReview) questions.push("Confirm credit line availability and counterparty exposure limits.");
  if (deal.urgency === "High") questions.push("What is the latest acceptable execution time today?");

  return {
    summary,
    businessValue,
    risks,
    nextStep: deriveNextStep(g),
    questions,
    status: deriveStatus(deal, g),
  };
}

/**
 * The full decision pack shown in the UI and exports.
 * Policy outcome, matched rules, status and next step are always deterministic.
 * Business value, risks, RM questions and the plain-English governance
 * explanation use the AI draft when one exists, otherwise the rule-based text.
 */
export function buildPack(deal: Deal): DealPack {
  const governance = evaluateGovernance(deal);
  const base = analyseDeal(deal, governance);
  const ai = deal.ai;
  if (!ai) {
    return {
      ...base,
      governance,
      governanceExplanation: governance.explanation,
      provenance: { kind: "rules" },
    };
  }
  return {
    ...base,
    businessValue: ai.businessValue.length ? ai.businessValue : base.businessValue,
    risks: ai.risks.length ? ai.risks : base.risks,
    questions: ai.questions.length ? ai.questions : base.questions,
    governance,
    governanceExplanation: ai.governanceExplanation || governance.explanation,
    provenance: { kind: "ai", model: ai.model, generatedAt: ai.generatedAt },
  };
}
