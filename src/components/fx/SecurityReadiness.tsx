import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Globe2,
  KeyRound,
  Users,
  ScrollText,
  LineChart,
  PlugZap,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Owner = "SA" | "FDE" | "Engineering" | "Customer IT" | "Compliance";

type Item = {
  icon: LucideIcon;
  title: string;
  demo: string;
  production: string;
  owner: Owner;
};

const ITEMS: Item[] = [
  {
    icon: Database,
    title: "Data storage",
    demo: "Browser localStorage, per visitor. No shared database in the public demo.",
    production: "Customer-owned database with per-tenant isolation, backups and DR.",
    owner: "Engineering",
  },
  {
    icon: Globe2,
    title: "Data residency",
    demo: "Hosted in the prototype region — not chosen by customer.",
    production: "Region pinned to customer jurisdiction (EU / UK / APAC) with documented data flows.",
    owner: "Customer IT",
  },
  {
    icon: KeyRound,
    title: "Authentication / SSO",
    demo: "No login. Open to anyone with the demo URL.",
    production: "Enterprise SSO (Okta / Entra ID / Ping) with MFA enforced.",
    owner: "Customer IT",
  },
  {
    icon: Users,
    title: "Role-based access (RBAC)",
    demo: "No roles — every visitor sees the same view.",
    production: "Sales, RM, Dealer, Treasury, Compliance roles with scoped read/write.",
    owner: "SA",
  },
  {
    icon: ScrollText,
    title: "Audit trail",
    demo: "Row timestamps only.",
    production: "Immutable, time-stamped, user-attributed log for MiFID II / Dodd-Frank record-keeping.",
    owner: "Compliance",
  },
  {
    icon: LineChart,
    title: "FX data source",
    demo: "Public Frankfurter API (ECB reference, indicative only).",
    production: "Licensed tradeable feed (Refinitiv, Bloomberg or internal aggregator) with SLAs.",
    owner: "FDE",
  },
  {
    icon: PlugZap,
    title: "API reliability",
    demo: "Best-effort fetch with hard-coded fallback rate table.",
    production: "Redundant providers, circuit breakers, monitored latency and quote staleness.",
    owner: "Engineering",
  },
  {
    icon: Server,
    title: "Hosting model",
    demo: "Lovable-managed multi-tenant edge hosting.",
    production: "Customer-approved VPC, private link or on-prem deployment per InfoSec review.",
    owner: "Customer IT",
  },
  {
    icon: Sparkles,
    title: "AI model governance",
    demo: "Lovable AI (Gemini) drafts narrative only. Policy outcome is deterministic; model citations are validated.",
    production: "Approved model and provider, prompt and output logging, evaluation suite and model risk sign-off.",
    owner: "Compliance",
  },
  {
    icon: ShieldCheck,
    title: "Compliance review",
    demo: "None — prototype only, not for production trading.",
    production: "InfoSec questionnaire, pen test, model risk review and vendor onboarding sign-off.",
    owner: "Compliance",
  },
];

function ownerTone(o: Owner) {
  switch (o) {
    case "SA":
      return "border-primary/30 bg-primary/10 text-primary";
    case "FDE":
      return "border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10 text-[color:var(--warning)]";
    case "Engineering":
      return "border-border bg-muted text-foreground";
    case "Customer IT":
      return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "Compliance":
      return "border-destructive/30 bg-destructive/10 text-destructive";
  }
}

export function SecurityReadiness() {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Security &amp; Production Readiness
          </h2>
          <p className="text-xs text-muted-foreground">
            What this prototype does today vs. what an enterprise rollout requires — and who typically owns each item.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <Card
              key={it.title}
              className="rounded-md border-border p-4 shadow-none transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-muted">
                    <Icon className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{it.title}</h3>
                </div>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] uppercase tracking-wider ${ownerTone(it.owner)}`}
                >
                  {it.owner}
                </Badge>
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Demo today
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground">{it.demo}</p>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Production requirement
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground">{it.production}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
