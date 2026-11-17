import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Server } from "lucide-react";
import { useState } from "react";

export function ArchitectureNotes() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="rounded-md border-border shadow-none">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <Server className="h-4 w-4 text-muted-foreground" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Architecture notes</h3>
              <p className="text-xs text-muted-foreground">
                What this prototype is, and what production would require.
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border px-5 py-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Prototype
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                <li>• FX rates from the public Frankfurter API (ECB reference, no key).</li>
                <li>• Policy outcome, thresholds and next step decided by a deterministic rules engine.</li>
                <li>• Narrative (value, risks, RM questions) drafted by an LLM via a server-side edge function, with rule-based fallback.</li>
                <li>• Requests persisted to browser <code className="font-mono text-xs">localStorage</code>.</li>
                <li>• No authentication and no shared database.</li>
                <li>• Single page, designed to demo the workflow end-to-end.</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Production hardening required
              </h4>
              <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                <li>• Database with full audit trail (MiFID II / Dodd-Frank record-keeping).</li>
                <li>• SSO, RBAC and dealer / sales / RM permissioning.</li>
                <li>• Licensed tradeable FX feed (Refinitiv, Bloomberg, internal aggregator).</li>
                <li>• Hosting, data residency and network egress review.</li>
                <li>• Security validation: pen test, dependency scanning, secrets management.</li>
                <li>• Integration with credit-line, KYC, and post-trade settlement systems.</li>
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
