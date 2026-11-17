import { evaluateGovernance, type GovernanceCheck } from "./governance";
import type { Deal } from "./storage";

/**
 * Request body for the deal-analyst edge function. Shared by the app
 * (src/lib/ai.ts) and the eval suite (evals/) so both test the same thing.
 */
export function buildAnalystRequest(deal: Deal, g: GovernanceCheck = evaluateGovernance(deal)) {
  return {
    deal: {
      customerName: deal.customerName,
      customerIndustry: deal.customerIndustry,
      baseCcy: deal.baseCcy,
      targetCcy: deal.targetCcy,
      amount: String(deal.amount),
      rate: deal.rate.toFixed(6),
      rateSource: deal.rateSource,
      purpose: deal.purpose,
      urgency: deal.urgency,
      relationshipValue: deal.relationshipValue,
      notes: deal.notes,
    },
    governance: {
      outcome: g.outcome,
      matchedRuleIds: g.matchedRules.map((r) => r.id),
      nextAction: g.nextAction,
      gbpEquivalent: String(Math.round(g.gbpEquivalent)),
    },
  };
}

/** Raw shape the edge function returns on success. */
export type AnalystResponse = {
  business_value?: unknown;
  risks?: unknown;
  rm_questions?: unknown;
  governance_explanation?: unknown;
  cited_rules?: unknown;
  model?: unknown;
  error?: unknown;
};
