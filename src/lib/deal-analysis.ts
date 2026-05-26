import { toEurEquivalent, formatCurrency } from "./fx";
import type { Deal } from "./storage";

export type Analysis = {
  summary: string;
  businessValue: string[];
  risks: string[];
  nextStep: string;
  questions: string[];
};

function tierOf(eurAmount: number): "small" | "mid" | "large" | "strategic" {
  if (eurAmount < 50_000) return "small";
  if (eurAmount < 500_000) return "mid";
  if (eurAmount < 5_000_000) return "large";
  return "strategic";
}

export function analyseDeal(deal: Deal): Analysis {
  const eur = toEurEquivalent(deal.amount, deal.baseCcy);
  const tier = tierOf(eur);
  const pair = `${deal.baseCcy}/${deal.targetCcy}`;
  const volatilePair =
    deal.baseCcy === "JPY" ||
    deal.targetCcy === "JPY" ||
    deal.baseCcy === "CHF" ||
    deal.targetCcy === "CHF";

  const summary =
    `${deal.customerName} (${deal.customerIndustry || "industry n/a"}) is requesting a ` +
    `${formatCurrency(deal.amount, deal.baseCcy)} → ${deal.targetCcy} conversion ` +
    `for "${deal.purpose || "unspecified purpose"}". ` +
    `Executed at ${deal.rate.toFixed(4)} ${pair}, settling ` +
    `${formatCurrency(deal.convertedAmount, deal.targetCcy)}.`;

  const businessValue: string[] = [];
  if (tier === "strategic")
    businessValue.push("Strategic ticket size — material desk revenue opportunity.");
  else if (tier === "large")
    businessValue.push("Large ticket — meaningful spread contribution.");
  else if (tier === "mid")
    businessValue.push("Mid-market flow — standard desk margin applies.");
  else businessValue.push("Small ticket — automate to preserve margin.");

  if (deal.relationshipValue === "High")
    businessValue.push("Tier-1 relationship — protect wallet share, consider preferential pricing.");
  if (deal.relationshipValue === "Medium")
    businessValue.push("Established relationship — competitive pricing expected.");
  if (deal.urgency === "High")
    businessValue.push("Urgent execution requested — opportunity to demonstrate service quality.");

  const risks: string[] = [];
  if (tier === "strategic" || tier === "large")
    risks.push("Notional exceeds desk auto-quote threshold — credit line check required.");
  if (volatilePair)
    risks.push(`${pair} carries elevated intraday volatility — confirm rate window with client.`);
  if (deal.urgency === "High")
    risks.push("Tight execution window leaves limited room for re-quote.");
  if (deal.rateSource === "demo-fallback")
    risks.push("Rate sourced from demo fallback table — DO NOT execute against this quote.");
  if (!deal.notes.trim())
    risks.push("No supporting context captured — confirm KYC and purpose of funds.");

  let nextStep = "Auto-quote and confirm with client.";
  if (tier === "strategic")
    nextStep = "Escalate to senior dealer and relationship manager before quoting.";
  else if (tier === "large" || (tier === "mid" && deal.urgency === "High"))
    nextStep = "Route to senior dealer for manual quote and credit confirmation.";
  else if (deal.relationshipValue === "High")
    nextStep = "Auto-quote with relationship-tier spread; notify RM post-trade.";

  const questions: string[] = [
    `Confirm value date and settlement instructions for ${deal.targetCcy}.`,
    `Is this a one-off conversion or part of recurring ${pair} flow?`,
    "Any hedging requirement (forward, option) the desk should consider?",
  ];
  if (tier === "large" || tier === "strategic")
    questions.push("Confirm credit line availability and counterparty limits.");
  if (deal.urgency === "High")
    questions.push("What is the latest acceptable execution time today?");

  return { summary, businessValue, risks, nextStep, questions };
}
