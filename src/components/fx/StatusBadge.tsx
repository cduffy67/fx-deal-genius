import { Badge } from "@/components/ui/badge";
import type { DealStatus } from "@/lib/deal-analysis";
import { FileText, ShieldAlert, CheckCircle2, FlaskConical } from "lucide-react";

export function StatusBadge({ status }: { status: DealStatus }) {
  const map: Record<
    DealStatus,
    { cls: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    Draft: {
      cls: "border-border bg-muted text-muted-foreground",
      Icon: FileText,
    },
    "Needs Treasury Review": {
      cls: "border-destructive/40 bg-destructive/10 text-destructive",
      Icon: ShieldAlert,
    },
    "Ready for Follow-up": {
      cls: "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]",
      Icon: CheckCircle2,
    },
    "Demo Data": {
      cls: "border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]",
      Icon: FlaskConical,
    },
  };
  const { cls, Icon } = map[status];
  return (
    <Badge variant="outline" className={`gap-1 whitespace-nowrap ${cls}`}>
      <Icon className="h-3 w-3" /> {status}
    </Badge>
  );
}
