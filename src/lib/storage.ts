import { supabase } from "@/integrations/supabase/client";
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

type Row = {
  id: string;
  created_at: string;
  customer_name: string;
  customer_industry: string;
  base_currency: string;
  target_currency: string;
  amount: number | string;
  fx_rate: number | string;
  converted_amount: number | string;
  urgency: string;
  relationship_value: string;
  purpose: string;
  notes: string;
  status: string;
  rate_source: string;
  rate_fetched_at: string;
};

function rowToDeal(r: Row): Deal {
  return {
    id: r.id,
    createdAt: r.created_at,
    customerName: r.customer_name,
    customerIndustry: r.customer_industry ?? "",
    baseCcy: r.base_currency as Currency,
    targetCcy: r.target_currency as Currency,
    amount: Number(r.amount),
    purpose: r.purpose ?? "",
    urgency: r.urgency as Urgency,
    relationshipValue: r.relationship_value as RelationshipValue,
    notes: r.notes ?? "",
    rate: Number(r.fx_rate),
    convertedAmount: Number(r.converted_amount),
    rateFetchedAt: r.rate_fetched_at,
    rateSource: r.rate_source as Deal["rateSource"],
  };
}

export async function fetchDeals(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(rowToDeal);
}

export async function insertDeal(
  d: Omit<Deal, "id" | "createdAt"> & { status: string },
): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .insert({
      customer_name: d.customerName,
      customer_industry: d.customerIndustry,
      base_currency: d.baseCcy,
      target_currency: d.targetCcy,
      amount: d.amount,
      fx_rate: d.rate,
      converted_amount: d.convertedAmount,
      urgency: d.urgency,
      relationship_value: d.relationshipValue,
      purpose: d.purpose,
      notes: d.notes,
      status: d.status,
      rate_source: d.rateSource,
      rate_fetched_at: d.rateFetchedAt,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToDeal(data as Row);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw error;
}

export async function clearDeals(): Promise<void> {
  const { error } = await supabase
    .from("deals")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw error;
}
