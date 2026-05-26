import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { Deal } from "@/lib/storage";
import { formatCurrency, formatRate } from "@/lib/fx";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function urgencyClass(u: Deal["urgency"]) {
  if (u === "High") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (u === "Medium") return "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]";
  return "border-border bg-muted text-muted-foreground";
}

export function RecentRequestsTable({
  deals,
  onSelect,
  onDelete,
  onClear,
}: {
  deals: Deal[];
  onSelect: (d: Deal) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <Card className="rounded-md border-border shadow-none">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent requests</h3>
          <p className="text-xs text-muted-foreground">
            Stored locally in this browser for the demo session.
          </p>
        </div>
        {deals.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Clear all stored requests?")) onClear();
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Clear all
          </Button>
        )}
      </div>

      {deals.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-muted-foreground">
          No requests yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
                <th className="px-3 py-2 text-left font-medium">Urgency</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {deals.slice(0, 20).map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onSelect(d)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                >
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{fmt(d.createdAt)}</td>
                  <td className="px-3 py-3 font-medium text-foreground">{d.customerName}</td>
                  <td className="px-3 py-3 font-mono text-xs">{d.baseCcy}/{d.targetCcy}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{formatCurrency(d.amount, d.baseCcy)}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{formatRate(d.rate)}</td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={urgencyClass(d.urgency)}>
                      {d.urgency}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {d.rateSource === "frankfurter" ? (
                      <span className="text-[color:var(--success)]">Live</span>
                    ) : d.rateSource === "demo-fallback" ? (
                      <span className="text-[color:var(--warning)]">Fallback</span>
                    ) : (
                      <span className="text-muted-foreground">Identity</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d.id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
