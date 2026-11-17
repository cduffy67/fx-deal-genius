import type { Currency } from "./fx";
import { buildSeedDeals } from "./scenarios";

export type Urgency = "Low" | "Medium" | "High";
export type RelationshipValue = "Low" | "Medium" | "High";

/** LLM-drafted narrative. Never decides outcome, thresholds or next step. */
export type AiAnalysis = {
  businessValue: string[];
  risks: string[];
  questions: string[];
  governanceExplanation: string;
  /** Policy rule ids the model cited, filtered to rules the engine matched. */
  citedRules: string[];
  /** Draft email to the customer; dropped if it fails the reply guardrail. */
  customerReply?: string;
  model: string;
  generatedAt: string;
};

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
  ai?: AiAnalysis;
};

/*
 * Public demo storage: each visitor's requests live in their own browser
 * (localStorage). Nothing is shared between visitors, so nobody can see,
 * spam or wipe anyone else's data. First visit is seeded with sample deals.
 */
const STORAGE_KEY = "norton-fx-deals-v2";
const MAX_DEALS = 100;

function read(): Deal[] | null {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Deal[]) : null;
  } catch {
    return null;
  }
}

function write(deals: Deal[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deals.slice(0, MAX_DEALS)));
  } catch {
    // Storage full or blocked (private mode) — demo keeps working in memory.
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Sample deals seeded on first visit (ids "sample-1" … "sample-5"). */
export function isSample(d: Pick<Deal, "id">): boolean {
  return d.id.startsWith("sample-");
}

export async function saveDeals(deals: Deal[]): Promise<void> {
  write(deals);
}

export async function fetchDeals(): Promise<Deal[]> {
  const existing = read();
  if (existing) return existing;
  const seeded = buildSeedDeals();
  write(seeded);
  return seeded;
}

export async function insertDeal(d: Omit<Deal, "id" | "createdAt">): Promise<Deal> {
  const deal: Deal = { ...d, id: newId(), createdAt: new Date().toISOString() };
  write([deal, ...(read() ?? [])]);
  return deal;
}

export async function updateDeal(deal: Deal): Promise<Deal> {
  write((read() ?? []).map((d) => (d.id === deal.id ? deal : d)));
  return deal;
}

export async function deleteDeal(id: string): Promise<void> {
  write((read() ?? []).filter((d) => d.id !== id));
}

/** Restore the sample deals (only affects this visitor's browser). */
export async function resetDemo(): Promise<Deal[]> {
  const seeded = buildSeedDeals();
  write(seeded);
  return seeded;
}
