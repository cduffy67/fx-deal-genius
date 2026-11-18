// Run: bun evals/queue.ts
// Deterministic check that a mixed inbox lands in the right queue order.
// No model involved: priority comes only from the policy engine.
import { fallbackRate, type Currency } from "../src/lib/fx";
import { priorityOf, sortQueue } from "../src/lib/priority";
import type { Deal } from "../src/lib/storage";

function t(id: string, o: Partial<Deal> & { baseCcy: Currency; targetCcy: Currency; amount: number }): Deal {
  const rate = fallbackRate(o.baseCcy, o.targetCcy);
  return {
    id, createdAt: "2026-11-18T09:00:00Z", customerName: id, customerIndustry: "Other",
    purpose: "Payment", notes: "Context", urgency: "Medium", relationshipValue: "Medium",
    rate, convertedAmount: o.amount * rate, rateFetchedAt: "", rateSource: "frankfurter", ...o,
  };
}

const inbox: Deal[] = [
  t("routine £400k", { baseCcy: "GBP", targetCcy: "EUR", amount: 400_000 }),
  t("no amount", { baseCcy: "USD", targetCcy: "JPY", amount: 0, urgency: "Low" }),
  t("£6.3m LNG", { baseCcy: "GBP", targetCcy: "USD", amount: 6_300_000, urgency: "High" }),
  t("£1.2m completion", { baseCcy: "GBP", targetCcy: "EUR", amount: 1_200_000 }),
  t("CHF 1.8m today", { baseCcy: "CHF", targetCcy: "USD", amount: 1_800_000, urgency: "High" }),
  t("£300k top client, today", { baseCcy: "GBP", targetCcy: "CHF", amount: 300_000, urgency: "High", relationshipValue: "High" }),
  { ...t("no client name", { baseCcy: "USD", targetCcy: "GBP", amount: 500_000 }), customerName: "" },
];

const expected = [
  ["£6.3m LNG", "Escalate"],
  ["£300k top client, today", "Same-day"],
  ["CHF 1.8m today", "Treasury"],
  ["£1.2m completion", "Treasury"],
  ["", "Needs info"],
  ["no amount", "Needs info"],
  ["routine £400k", "Ready"],
];

const got = sortQueue(inbox).map((d) => [d.customerName, priorityOf(d).label]);
let pass = 0;
got.forEach(([name, label], i) => {
  const ok = name === expected[i][0] && label === expected[i][1];
  if (ok) pass++;
  console.log(`${ok ? "✓" : "✗"} ${i + 1}. ${name || "(no client name)"} → ${label}${ok ? "" : `  (expected ${expected[i][0] || "(no client name)"} → ${expected[i][1]})`}`);
});
console.log(`\n${pass}/${expected.length} in the right position`);
process.exit(pass === expected.length ? 0 : 1);
