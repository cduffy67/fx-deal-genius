import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { isSample, type Deal } from "@/lib/storage";
import { formatCurrency } from "@/lib/fx";
import { deriveStatus } from "@/lib/deal-analysis";
import { StatusBadge } from "./StatusBadge";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function tone(level: Deal["urgency"]) {
  if (level === "High") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (level === "Medium")
    return "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]";
  return "border-border bg-muted text-muted-foreground";
}

function relTone(level: Deal["relationshipValue"]) {
  if (level === "High")
    return "border-primary/40 bg-primary/10 text-primary";
  if (level === "Medium") return "border-border bg-muted text-foreground";
  return "border-border bg-muted text-muted-foreground";
}

export function RecentRequestsTable({
  deals,
  onSelect,
  onDelete,
  onReset,
}: {
  deals: Deal[];
  onSelect: (d: Deal) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <Card className="rounded-md border-border shadow-none">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent requests</h3>
          <p className="text-xs text-muted-foreground">
            Saved in your browser only. Other visitors can't see your requests.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Reset demo
        </Button>
      </div>

      {deals.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-muted-foreground">
          No requests yet. Try an example above, or use Reset demo to restore the samples.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Pair</th>
                <th className="px-3 py-2 text-right font-medium">Notional</th>
                <th className="px-3 py-2 text-right font-medium">Converted</th>
                <th className="px-3 py-2 text-left font-medium">Urgency</th>
                <th className="px-3 py-2 text-left font-medium">Relationship</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {deals.slice(0, 20).map((d) => {
                const status = deriveStatus(d);
                return (
                  <tr
                    key={d.id}
                    onClick={() => onSelect(d)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        {d.customerName}
                        {isSample(d) && (
                          <span className="rounded-sm border border-border bg-muted px-1 py-px font-mono text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
                            Sample
                          </span>
                        )}
                      </div>
                      {d.customerIndustry && (
                        <div className="text-[11px] text-muted-foreground">
                          {d.customerIndustry}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      {d.baseCcy}/{d.targetCcy}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatCurrency(d.amount, d.baseCcy)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {formatCurrency(d.convertedAmount, d.targetCcy)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={tone(d.urgency)}>
                        {d.urgency}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={relTone(d.relationshipValue)}>
                        {d.relationshipValue}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                      {fmt(d.createdAt)}
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
