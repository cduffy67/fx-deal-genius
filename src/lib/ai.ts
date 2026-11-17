import { supabase } from "@/integrations/supabase/client";
import { evaluateGovernance } from "./governance";
import { buildAnalystRequest } from "./ai-request";
import { replyIssues } from "./text-checks";
import type { AiAnalysis, Deal } from "./storage";

function strings(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 400))
    .slice(0, max);
}

/**
 * Ask the deal-analyst edge function to draft the narrative sections.
 * Returns null on any failure so the UI falls back to the rule-based pack.
 */
export async function draftAiAnalysis(deal: Deal): Promise<AiAnalysis | null> {
  const g = evaluateGovernance(deal);
  const matchedIds = g.matchedRules.map((r) => r.id);

  try {
    const { data, error } = await supabase.functions.invoke("deal-analyst", {
      body: buildAnalystRequest(deal, g),
    });
    if (error || !data || typeof data !== "object" || "error" in data) {
      console.warn("[deal-analyst] unavailable", error ?? data);
      return null;
    }

    const d = data as Record<string, unknown>;
    const businessValue = strings(d.business_value, 4);
    const risks = strings(d.risks, 5);
    const questions = strings(d.rm_questions, 3);
    let explanation =
      typeof d.governance_explanation === "string" ? d.governance_explanation.trim().slice(0, 800) : "";

    // Guardrail: the model may only cite rules the engine matched. If it cites
    // anything else, drop its explanation and use the engine's own wording.
    const mentioned = explanation.match(/\bP(?:10|[1-9])\b/g) ?? [];
    const cited = Array.from(new Set([...strings(d.cited_rules, 10), ...mentioned]));
    const rogue = cited.filter((id) => !matchedIds.includes(id));
    if (rogue.length) {
      console.warn("[deal-analyst] discarded explanation citing unmatched rules", rogue);
      explanation = "";
    }

    // Guardrail: the customer reply is only kept if it passes the reply checks
    // (no internal rule ids or review names, no firm-rate claims, matches outcome).
    let customerReply =
      typeof d.customer_reply === "string" ? d.customer_reply.trim().slice(0, 1500) : "";
    const issues = customerReply ? replyIssues(customerReply, g.outcome) : [];
    if (issues.length) {
      console.warn("[deal-analyst] discarded customer reply", issues);
      customerReply = "";
    }

    if (!businessValue.length && !risks.length && !questions.length) return null;

    return {
      businessValue,
      risks,
      questions,
      governanceExplanation: explanation,
      citedRules: cited.filter((id) => matchedIds.includes(id)),
      customerReply: customerReply || undefined,
      model: typeof d.model === "string" ? d.model : "unknown",
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    console.warn("[deal-analyst] failed", e);
    return null;
  }
}
