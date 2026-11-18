import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Loader2, Mail, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/fx";
import { priorityOf, sortQueue, type PriorityTone } from "@/lib/priority";
import type { Deal } from "@/lib/storage";

const TONE: Record<PriorityTone, string> = {
  red: "border-destructive/40 bg-destructive/10 text-destructive",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  blue: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

/** The triage queue: tickets in policy-priority order. */
export function TicketQueue({
  deals,
  activeId,
  pendingIds,
  onSelect,
  onDelete,
  onClear,
}: {
  deals: Deal[];
  activeId: string | null;
  pendingIds: Set<string>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  const queue = sortQueue(deals);

  return (
    <Card className="rounded-md border-border p-0 shadow-none">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Queue</h2>
          <p className="text-[11px] text-muted-foreground">Ordered by bank policy, then urgency, then size.</p>
        </div>
        {queue.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs text-muted-foreground">
            Clear
          </Button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-muted-foreground">
          No tickets yet. Triage the inbox above to fill the queue.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {queue.map((d) => {
            const p = priorityOf(d);
            const gaps = d.intakeGaps?.length ?? 0;
            const pending = pendingIds.has(d.id);
            const aiReply = !!d.ai?.customerReply;
            return (
              <li key={d.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(d.id)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(d.id)}
                  className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 ${
                    activeId === d.id ? "bg-muted/60" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 w-[74px] shrink-0 rounded-sm border px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider ${TONE[p.tone]}`}
                  >
                    {p.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`truncate text-sm font-medium ${d.customerName ? "text-foreground" : "italic text-muted-foreground"}`}>
                        {d.customerName || "Unknown client"}
                      </span>
                      {d.urgency === "High" && (
                        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-destructive">urgent</span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {d.baseCcy}/{d.targetCcy} ·{" "}
                      {d.amount > 0 ? formatCurrency(d.amount, d.baseCcy) : <span className="text-destructive">amount missing</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{p.hint}</span>
                      {gaps > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {gaps} to check
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        {pending ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" /> Drafting reply
                          </>
                        ) : aiReply ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Reply ready
                          </>
                        ) : (
                          <>
                            <Mail className="h-3 w-3" /> Template reply
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove ticket"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(d.id);
                    }}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
