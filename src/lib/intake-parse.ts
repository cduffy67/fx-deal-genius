import type { FormValues } from "@/components/fx/DealForm";
import { CURRENCIES, fallbackRate, formatCurrency, type Currency } from "./fx";

export const INDUSTRIES = [
  "Manufacturing",
  "Energy & Commodities",
  "Technology",
  "Financial Institution",
  "Real Estate",
  "Pharmaceuticals",
  "Retail",
  "Logistics",
  "Other",
];

export type IntakeResult = {
  values: FormValues;
  /** What the RM must check: gaps the model reported plus assumptions made here. */
  gaps: string[];
  model: string;
};

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function ccy(v: unknown): Currency | "" {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v) ? (v as Currency) : "";
}

/**
 * Validate the request-intake model output and turn it into form values.
 * Every field is re-checked here; anything invalid is dropped and flagged.
 * Nothing is submitted: the RM reviews the form and clicks Generate.
 */
export function parseIntake(raw: Record<string, unknown>): IntakeResult | null {
  if (!raw || typeof raw !== "object" || "error" in raw) return null;

  const gaps = Array.isArray(raw.gaps)
    ? raw.gaps.filter((g): g is string => typeof g === "string" && g.trim().length > 0).map((g) => g.trim().slice(0, 200))
    : [];

  let sell = ccy(raw.sell_currency);
  let buy = ccy(raw.buy_currency);
  if (!sell && buy) {
    sell = buy === "GBP" ? "EUR" : "GBP";
    gaps.push(`Sell currency not stated, so ${sell} is assumed. Confirm with the customer.`);
  } else if (sell && !buy) {
    buy = sell === "USD" ? "EUR" : "USD";
    gaps.push(`Buy currency not stated, so ${buy} is assumed. Confirm with the customer.`);
  } else if (!sell && !buy) {
    sell = "GBP";
    buy = "USD";
    gaps.push("No currencies found in the email. GBP/USD set as a placeholder.");
  }
  if (sell === buy) gaps.push("Sell and buy currencies are the same. Check the pair.");

  let amount = "";
  const n = typeof raw.amount === "number" && Number.isFinite(raw.amount) && raw.amount > 0 ? raw.amount : null;
  const amountCcy = ccy(raw.amount_currency) || sell;
  if (n === null) {
    if (!gaps.some((g) => /amount/i.test(g))) gaps.push("No amount found. Enter the notional before generating.");
  } else if (amountCcy === sell || !sell) {
    amount = String(Math.round(n));
  } else {
    // Amount stated in the currency they receive: convert to the sell side.
    const sellAmount = Math.round(n / fallbackRate(sell as Currency, amountCcy as Currency) / 1000) * 1000;
    amount = String(sellAmount);
    gaps.push(
      `Amount was given as ${formatCurrency(n, amountCcy as Currency)} (what they receive). Converted to about ${formatCurrency(sellAmount, sell as Currency)} to sell at a reference rate. Confirm the exact figure.`,
    );
  }

  const industry = INDUSTRIES.includes(str(raw.customer_industry, 40)) ? str(raw.customer_industry, 40) : "";
  const urgency = ["Low", "Medium", "High"].includes(str(raw.urgency, 10))
    ? (str(raw.urgency, 10) as FormValues["urgency"])
    : "Medium";

  gaps.push("Relationship value isn't something an email tells us, so it's set to Medium. Adjust if needed.");

  return {
    values: {
      customerName: str(raw.customer_name, 120),
      customerIndustry: industry,
      baseCcy: (sell || "GBP") as Currency,
      targetCcy: (buy || "USD") as Currency,
      amount,
      purpose: str(raw.purpose, 300),
      urgency,
      relationshipValue: "Medium",
      notes: str(raw.notes, 1000),
    },
    gaps: Array.from(new Set(gaps)).slice(0, 8),
    model: str(raw.model, 60) || "unknown",
  };
}
