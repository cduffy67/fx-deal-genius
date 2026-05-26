import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Equal } from "lucide-react";

export function RateBadge({
  source,
}: {
  source: "frankfurter" | "demo-fallback" | "identity";
}) {
  if (source === "frankfurter")
    return (
      <Badge
        variant="outline"
        className="gap-1 border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]"
      >
        <CheckCircle2 className="h-3 w-3" /> Live · Frankfurter
      </Badge>
    );
  if (source === "identity")
    return (
      <Badge variant="outline" className="gap-1">
        <Equal className="h-3 w-3" /> Same currency
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="gap-1 border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 text-[color:var(--warning)]"
    >
      <AlertTriangle className="h-3 w-3" /> Demo fallback rate
    </Badge>
  );
}
