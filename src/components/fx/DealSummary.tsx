import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RateBadge } from "./RateBadge";
import { formatCurrency, formatRate } from "@/lib/fx";
import type { Deal } from "@/lib/storage";
import { analyseDeal } from "@/lib/deal-analysis";
import { FileText } from "lucide-react";

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso)) + " UTC";
}

export function DealSummary({ deal }: { deal: Deal | null }) {
  if (!deal) {
    return (
      <Card className="flex h-full min-h-[520px] flex-col items-center justify-center rounded-md border-dashed border-border p-10 text-center shadow-none">
        <FileText className="h-8 w-8 text-muted-foreground/60" />
        <h3 className="mt-4 text-sm font-medium text-foreground">No deal summary yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Submit an FX request to generate a customer-ready deal summary, risk view and recommended next step.
        </p>
      </Card>
    );
  }

  const a = analyseDeal(deal);
  const pair = `${deal.baseCcy}/${deal.targetCcy}`;

  return (
    <Card className="rounded-md border-border p-6 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Deal summary
          </div>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {deal.customerName} · <span className="font-mono">{pair}</span>
          </h2>
        </div>
        <RateBadge source={deal.rateSource} />
      </div>

      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Metric label="FX rate" value={<span className="font-mono">{formatRate(deal.rate)}</span>} />
        <Metric label="Sell" value={<span className="font-mono">{formatCurrency(deal.amount, deal.baseCcy)}</span>} />
        <Metric label="Buy" value={<span className="font-mono">{formatCurrency(deal.convertedAmount, deal.targetCcy)}</span>} />
        <Metric label="Rate checked" value={<span className="text-xs">{fmtTime(deal.rateFetchedAt)}</span>} />
      </div>

      {deal.rateSource === "demo-fallback" && (
        <div className="mt-5 rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
          Live FX feed unavailable. Showing fallback reference rate for demo purposes only — not tradeable.
        </div>
      )}

      <Separator className="my-5" />

      <Section title="Summary">
        <p className="text-sm leading-relaxed text-foreground">{a.summary}</p>
      </Section>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Section title="Business value">
          <BulletList items={a.businessValue} />
        </Section>
        <Section title="Risk considerations">
          <BulletList items={a.risks} tone="risk" />
        </Section>
      </div>

      <Section title="Recommended next step" className="mt-5">
        <div className="rounded-md border-l-2 border-accent bg-accent/5 px-4 py-3 text-sm text-foreground">
          {a.nextStep}
        </div>
      </Section>

      <Section title="Questions to validate with the customer" className="mt-5">
        <BulletList items={a.questions} numbered />
      </Section>

      {deal.notes.trim() && (
        <Section title="Notes captured" className="mt-5">
          <p className="text-sm italic text-muted-foreground">"{deal.notes}"</p>
        </Section>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function BulletList({
  items,
  tone,
  numbered,
}: {
  items: string[];
  tone?: "risk";
  numbered?: boolean;
}) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1.5 ${numbered ? "list-decimal pl-5" : "list-disc pl-5"}`}>
      {items.map((it, i) => (
        <li
          key={i}
          className={`text-sm leading-relaxed ${
            tone === "risk" ? "text-foreground marker:text-destructive" : "text-foreground marker:text-muted-foreground"
          }`}
        >
          {it}
        </li>
      ))}
    </Tag>
  );
}
