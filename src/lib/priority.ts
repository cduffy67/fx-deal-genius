import { evaluateGovernance, gbpEquivalent } from "./governance";
import type { Deal } from "./storage";

export type PriorityTone = "red" | "amber" | "blue" | "green";
export type Priority = { rank: number; label: string; tone: PriorityTone; hint: string };

/**
 * Queue priority, derived only from the deterministic policy outcome.
 * The model never influences ordering.
 */
export function priorityOf(deal: Deal): Priority {
  switch (evaluateGovernance(deal).outcome) {
    case "Needs Compliance Review":
      return { rank: 0, label: "Escalate", tone: "red", hint: "Treasury + Compliance before any quote" };
    case "Enhanced Review Recommended":
      return { rank: 1, label: "Same-day", tone: "amber", hint: "Urgent, top-tier client" };
    case "Needs Treasury Review":
      return { rank: 2, label: "Treasury", tone: "amber", hint: "Treasury review before quoting" };
    case "Needs More Information":
      return { rank: 3, label: "Needs info", tone: "blue", hint: "Ask the client for the gaps" };
    default:
      return { rank: 4, label: "Ready", tone: "green", hint: "Cleared for an indicative quote" };
  }
}

const URGENCY = { High: 0, Medium: 1, Low: 2 } as const;

/** Highest priority first; then most urgent; then largest notional; then newest. */
export function sortQueue(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => {
    const pa = priorityOf(a).rank;
    const pb = priorityOf(b).rank;
    if (pa !== pb) return pa - pb;
    const ua = URGENCY[a.urgency] ?? 1;
    const ub = URGENCY[b.urgency] ?? 1;
    if (ua !== ub) return ua - ub;
    const ga = a.amount > 0 ? gbpEquivalent(a) : 0;
    const gb = b.amount > 0 ? gbpEquivalent(b) : 0;
    if (ga !== gb) return gb - ga;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/** Split a pasted inbox into individual emails on lines of three or more dashes. */
export function splitInbox(text: string): string[] {
  return text
    .split(/^\s*-{3,}\s*$/m)
    .map((e) => e.trim())
    .filter((e) => e.length >= 10)
    .slice(0, 10);
}
