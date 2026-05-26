import { Card } from "@/components/ui/card";
import type { Deal } from "@/lib/storage";
import { toEurEquivalent } from "@/lib/fx";

function eurFmt(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function DashboardCards({ deals }: { deals: Deal[] }) {
  const count = deals.length;
  const totalEur = deals.reduce(
    (s, d) => s + toEurEquivalent(d.amount, d.baseCcy),
    0,
  );
  const avg = count ? totalEur / count : 0;
  const highUrgency = deals.filter((d) => d.urgency === "High").length;

  const items = [
    { label: "Requests logged", value: count ? String(count) : "—" },
    { label: "Total notional (EUR eq.)", value: count ? eurFmt(totalEur) : "—" },
    { label: "Average ticket size", value: count ? eurFmt(avg) : "—" },
    { label: "High urgency", value: count ? String(highUrgency) : "—" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="rounded-md border-border p-4 shadow-none">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {it.label}
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-foreground">
            {it.value}
          </div>
        </Card>
      ))}
    </div>
  );
}
