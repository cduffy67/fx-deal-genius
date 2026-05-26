export const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CHF"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type RateResult = {
  rate: number;
  fetchedAt: string;
  source: "frankfurter" | "demo-fallback" | "identity";
};

// EUR-pivot fallback rates (mid-market reference, approximate).
// Used only if Frankfurter is unreachable. Clearly labelled in the UI.
const EUR_FALLBACK: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  JPY: 169.5,
  CHF: 0.95,
};

function fallbackRate(base: Currency, target: Currency): number {
  if (base === target) return 1;
  // cross via EUR
  return EUR_FALLBACK[target] / EUR_FALLBACK[base];
}

export async function fetchRate(
  base: Currency,
  target: Currency,
): Promise<RateResult> {
  if (base === target) {
    return { rate: 1, fetchedAt: new Date().toISOString(), source: "identity" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${target}`,
      { signal: controller.signal },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { rates?: Record<string, number> };
    const r = data.rates?.[target];
    if (typeof r !== "number") throw new Error("Missing rate");
    return { rate: r, fetchedAt: new Date().toISOString(), source: "frankfurter" };
  } catch {
    return {
      rate: fallbackRate(base, target),
      fetchedAt: new Date().toISOString(),
      source: "demo-fallback",
    };
  } finally {
    clearTimeout(timer);
  }
}

export function toEurEquivalent(amount: number, ccy: Currency): number {
  return amount / EUR_FALLBACK[ccy];
}

export function formatCurrency(amount: number, ccy: Currency): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: ccy === "JPY" ? 0 : 2,
  }).format(amount);
}

export function formatRate(rate: number): string {
  return rate.toLocaleString("en-GB", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}
