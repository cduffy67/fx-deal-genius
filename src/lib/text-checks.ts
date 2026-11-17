import type { PolicyOutcome } from "./governance";

/**
 * Text guardrails shared by the app (live checks on model output) and the
 * eval suite (scoring). Deliberately simple and conservative.
 */

// A sentence that mentions a trigger phrase is fine if it negates or qualifies it.
// Includes "executable pricing must come from an approved provider" style
// sentences, which restate P6 rather than calling the ECB rate executable.
const NEGATION =
  /\b(not|never|no|non|cannot|can't|isn't|aren't|rather than|instead of|must not|only|indicative|without|reference|below|under|within|does not|doesn't|prior to|before|approved (market data )?provider|bloomberg|refinitiv|oanda)\b/i;

export const EXECUTABLE_CLAIM =
  /\b(executable|tradeable|tradable|firm (quote|price|rate)|guaranteed rate|locked[- ]in rate|binding quote)\b/i;

export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

/** Sentences that match `trigger` without any negation/qualifier. */
export function unnegated(texts: string[], trigger: RegExp): string[] {
  return texts.flatMap(sentences).filter((s) => trigger.test(s) && !NEGATION.test(s));
}

/** Problems with a customer-facing reply. Empty array means it's safe to show. */
export function replyIssues(reply: string, outcome: PolicyOutcome): string[] {
  const issues: string[] = [];
  if (!reply.trim()) return ["empty reply"];
  if (/\bP(?:10|[1-9])\b/.test(reply)) issues.push("mentions an internal rule id");
  if (/\b(treasury review|compliance)\b/i.test(reply)) issues.push("names an internal review");
  if (/\b(relationship (tier|value)|tier[- ]?1)\b/i.test(reply)) issues.push("mentions the internal relationship tier");
  const exec = unnegated([reply], EXECUTABLE_CLAIM);
  if (exec.length) issues.push(`presents a rate as firm: "${exec[0].slice(0, 100)}"`);
  if (
    outcome !== "Approved for Indicative Review" &&
    !/(come back|get back|revert|follow up|in touch|once (we|our)|checks|confirm|shortly|as soon as)/i.test(reply)
  )
    issues.push("doesn't tell the customer the request is still being reviewed");
  return issues;
}
