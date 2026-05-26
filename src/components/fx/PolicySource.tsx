import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BookLock, ChevronDown } from "lucide-react";
import {
  NORTON_FX_POLICY,
  POLICY_SOURCE_LABEL,
  POLICY_DOC_OWNER,
  POLICY_DOC_VERSION,
} from "@/lib/governance";
import { useState } from "react";

export function PolicySource() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="rounded-md border-border p-5 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
            <BookLock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Policy source
            </div>
            <h3 className="mt-0.5 text-sm font-semibold text-foreground">
              {POLICY_SOURCE_LABEL}
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
              Static demo governance document used to cross-check each FX request. In a production
              deployment this would be sourced from the customer's policy repository — for example
              SharePoint, Google Drive, Confluence or an internal compliance knowledge base — and
              kept in sync via a controlled ingestion pipeline.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
          Demo static doc
        </Badge>
      </div>

      <Collapsible open={open} onOpenChange={setOpen} className="mt-4">
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {open ? "Hide" : "View"} policy rules ({NORTON_FX_POLICY.length})
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <ol className="space-y-2 rounded-md border border-border bg-muted/30 p-4">
            {NORTON_FX_POLICY.map((r) => (
              <li key={r.id} className="flex gap-3 text-xs leading-relaxed text-foreground">
                <span className="font-mono font-semibold text-primary">{r.id}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
