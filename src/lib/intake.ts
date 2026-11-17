import { supabase } from "@/integrations/supabase/client";
import { parseIntake, type IntakeResult } from "./intake-parse";

/** Send a pasted customer email to the request-intake function. Null on any failure. */
export async function extractRequestFromEmail(email: string): Promise<IntakeResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("request-intake", {
      body: { email: email.slice(0, 3000) },
    });
    if (error || !data || typeof data !== "object") {
      console.warn("[request-intake] unavailable", error ?? data);
      return null;
    }
    return parseIntake(data as Record<string, unknown>);
  } catch (e) {
    console.warn("[request-intake] failed", e);
    return null;
  }
}
