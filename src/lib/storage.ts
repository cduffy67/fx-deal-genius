import type { Currency } from "./fx";

export type Urgency = "Low" | "Medium" | "High";
export type RelationshipValue = "Low" | "Medium" | "High";

export type Deal = {
  id: string;
  createdAt: string;
  customerName: string;
  customerIndustry: string;
  baseCcy: Currency;
  targetCcy: Currency;
  amount: number;
  purpose: string;
  urgency: Urgency;
  relationshipValue: RelationshipValue;
  notes: string;
  rate: number;
  convertedAmount: number;
  rateFetchedAt: string;
  rateSource: "frankfurter" | "demo-fallback" | "identity";
};

const KEY = "fx-deals-v1";

export function loadDeals(): Deal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Deal[];
  } catch {
    return [];
  }
}

export function saveDeals(deals: Deal[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(deals));
  } catch {
    // ignore
  }
}
