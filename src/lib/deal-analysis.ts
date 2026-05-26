import { toEurEquivalent, formatCurrency } from "./fx";
import type { Deal } from "./storage";

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

function tierOf(eurAmount: number): "small" | "mid" | "large" | "strategic" {
  if (eurAmount < 50_000) return "small";
  if (eurAmount < 500_000) return "mid";
  if (eurAmount < 5_000_000) return "large";
  return "strategic";
}

export function deriveStatus(deal: Deal): DealStatus {
  if (deal.rateSource === "demo-fallback") return "Demo Data";
  const eur = toEurEquivalent(deal.amount, deal.baseCcy);
  const tier = tierOf(eur);
  if (tier === "large" || tier === "strategic") return "Needs Treasury Review";
  if (deal.urgency === "High" && tier === "mid") return "Needs Treasury Review";
  if (deal.relationshipValue === "High" || tier === "mid") return "Ready for Follow-up";
  return "Draft";
}

export function analyseDeal(deal: Deal): Analysis {
  const eur = toEurEquivalent(deal.amount, deal.baseCcy);
  const tier = tierOf(eur);
  const pair = `${deal.baseCcy}/${deal.targetCcy}`;
  const industry = deal.customerIndustry || "industry not specified";

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
  if (tier === "large" || tier === "strategic")
    risks.push("Large notional — treasury review and credit-line confirmation required before quoting.");
  if (!deal.customerIndustry || !deal.notes.trim())
    risks.push("Customer context is incomplete — validate KYC, purpose of funds and counterparty profile.");
  if (deal.urgency === "High")
    risks.push("Tight execution window leaves limited room for re-quote or escalation.");
  risks.push(
    "Production use would require an approved tradeable data source, full audit trail and MiFID II record-keeping.",
  );

  // ---------- Next step (constrained to 4) ----------
  const status = deriveStatus(deal);
  let nextStep: NextStep;
  if (deal.rateSource === "demo-fallback") {
    nextStep = "Escalate for compliance review";
  } else if (tier === "large" || tier === "strategic") {
    nextStep = "Proceed to treasury validation";
  } else if (!deal.customerIndustry || !deal.notes.trim()) {
    nextStep = "Request more customer information";
  } else {
    nextStep = "Prepare indicative customer quote";
  }

  // ---------- Questions ----------
  const questions: string[] = [
    `Confirm value date and settlement instructions for ${deal.targetCcy}.`,
    `Is this a one-off conversion or part of recurring ${pair} flow we can size for?`,
    "Any hedging requirement (forward, option) the desk should price alongside the spot?",
  ];
  if (tier === "large" || tier === "strategic")
    questions.push("Confirm credit line availability and counterparty exposure limits.");
  if (deal.urgency === "High")
    questions.push("What is the latest acceptable execution time today?");

  return { summary, businessValue, risks, nextStep, questions, status };
}
