import type { FormValues } from "@/components/fx/DealForm";
import { fallbackRate } from "./fx";
import type { Deal } from "./storage";

export type Scenario = {
  id: string;
  label: string;
  blurb: string;
  values: FormValues;
};

/**
 * One-click examples. Each one exercises a different path through the
 * Norton Bank FX Governance Pack. Submitted with a live rate.
 */
export const EXAMPLE_SCENARIOS: Scenario[] = [
  {
    id: "routine",
    label: "Routine supplier payment",
    blurb: "£400k GBP/EUR, complete context",
    values: {
      customerName: "Brennan Logistics Ltd",
      customerIndustry: "Logistics",
      baseCcy: "GBP",
      targetCcy: "EUR",
      amount: "400000",
      purpose: "Monthly supplier payments to EU haulage partners",
      urgency: "Medium",
      relationshipValue: "Medium",
      notes:
        "Recurring monthly flow, settles T+2. Client usually books mid-morning and has asked about a standing order for Q1.",
    },
  },
  {
    id: "large-urgent",
    label: "Large, urgent energy deal",
    blurb: "£6m GBP/USD, triggers Treasury + Compliance",
    values: {
      customerName: "Atlantic Grid Energy plc",
      customerIndustry: "Energy & Commodities",
      baseCcy: "GBP",
      targetCcy: "USD",
      amount: "6000000",
      purpose: "LNG cargo settlement",
      urgency: "High",
      relationshipValue: "High",
      notes:
        "Cargo payment due Friday. CFO wants an indicative level before 2pm and may hedge the next two cargoes.",
    },
  },
  {
    id: "missing-context",
    label: "Missing customer context",
    blurb: "€250k EUR/GBP, no notes captured",
    values: {
      customerName: "Halden Retail Group",
      customerIndustry: "Retail",
      baseCcy: "EUR",
      targetCcy: "GBP",
      amount: "250000",
      purpose: "Inventory payment",
      urgency: "Low",
      relationshipValue: "Low",
      notes: "",
    },
  },
];

const EXTRA_SEEDS: FormValues[] = [
  {
    customerName: "Kessler Pharma AG",
    customerIndustry: "Pharmaceuticals",
    baseCcy: "CHF",
    targetCcy: "USD",
    amount: "1800000",
    purpose: "Licensing fee to US research partner",
    urgency: "Medium",
    relationshipValue: "High",
    notes: "Annual payment, same timing every year. Treasury asked to see it before quoting.",
  },
  {
    customerName: "Sora Technologies KK",
    customerIndustry: "Technology",
    baseCcy: "USD",
    targetCcy: "JPY",
    amount: "120000",
    purpose: "Payroll for Tokyo engineering team",
    urgency: "Low",
    relationshipValue: "Medium",
    notes: "Monthly payroll run. Small ticket, good candidate for straight-through processing.",
  },
];

/**
 * Sample deals shown on a visitor's first load. They use the static
 * fallback rate table, so they are honestly labelled "Demo Data".
 */
export function buildSeedDeals(now: Date = new Date()): Deal[] {
  const all = [...EXAMPLE_SCENARIOS.map((s) => s.values), ...EXTRA_SEEDS];
  return all.map((v, i) => {
    const at = new Date(now.getTime() - (i + 1) * 47 * 60_000).toISOString();
    const amount = Number(v.amount);
    const rate = fallbackRate(v.baseCcy, v.targetCcy);
    return {
      id: `sample-${i + 1}`,
      createdAt: at,
      customerName: v.customerName,
      customerIndustry: v.customerIndustry,
      baseCcy: v.baseCcy,
      targetCcy: v.targetCcy,
      amount,
      purpose: v.purpose,
      urgency: v.urgency,
      relationshipValue: v.relationshipValue,
      notes: v.notes,
      rate,
      convertedAmount: amount * rate,
      rateFetchedAt: at,
      rateSource: "demo-fallback" as const,
    };
  });
}
