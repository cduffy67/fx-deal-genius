import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RateBadge } from "./RateBadge";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatRate } from "@/lib/fx";
import type { Deal } from "@/lib/storage";
import { analyseDeal } from "@/lib/deal-analysis";
import { FileText, ArrowRight } from "lucide-react";

function fmtTime(iso: string) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(iso)) + " UTC"
  );
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
  const rateLabel =
    deal.rateSource === "frankfurter"
      ? "Live (ECB / Frankfurter)"
      : deal.rateSource === "demo-fallback"
        ? "Demo fallback — not executable"
        : "Identity (same currency)";

  return (
    <Card className="rounded-md border-border p-6 shadow-none">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Deal decision pack
          </div>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {deal.customerName} · <span className="font-mono">{pair}</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={a.status} />
          <RateBadge source={deal.rateSource} />
        </div>
      </div>

      <Separator className="my-5" />

      {/* 1 — Deal Summary */}
      <SectionTitle index={1} title="Deal Summary" />
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-2">
        <KV label="Customer" value={deal.customerName} />
        <KV label="Industry" value={deal.customerIndustry || "—"} />
        <KV label="Currency pair" value={<span className="font-mono">{pair}</span>} />
        <KV
          label="Amount (sell)"
          value={<span className="font-mono">{formatCurrency(deal.amount, deal.baseCcy)}</span>}
        />
        <KV
          label="FX rate used"
          value={<span className="font-mono">{formatRate(deal.rate)}</span>}
        />
        <KV
          label="Converted amount (buy)"
          value={
            <span className="font-mono">
              {formatCurrency(deal.convertedAmount, deal.targetCcy)}
            </span>
          }
        />
        <KV label="Rate checked" value={<span className="text-xs">{fmtTime(deal.rateFetchedAt)}</span>} />
        <KV label="Rate source" value={<span className="text-xs">{rateLabel}</span>} />
      </div>

      {deal.rateSource === "demo-fallback" && (
        <div className="mt-4 rounded-md border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-xs text-[color:var(--warning)]">
          Live FX feed unavailable. Showing fallback reference rate for demo purposes only — not tradeable.
        </div>
      )}

      <Separator className="my-6" />

      {/* 2 — Business value */}
      <SectionTitle index={2} title="Relationship & Business Value" />
      <p className="mt-2 text-sm leading-relaxed text-foreground">{a.summary}</p>
      <BulletList items={a.businessValue} className="mt-3" />

      <Separator className="my-6" />

      {/* 3 — Risk considerations */}
      <SectionTitle index={3} title="Risk Considerations" />
      <BulletList items={a.risks} tone="risk" className="mt-3" />

      <Separator className="my-6" />

      {/* 4 — Recommended next step */}
      <SectionTitle index={4} title="Recommended Next Step" />
      <div className="mt-3 flex items-center gap-3 rounded-md border-l-2 border-accent bg-accent/5 px-4 py-3 text-sm font-medium text-foreground">
        <ArrowRight className="h-4 w-4 text-accent" />
        {a.nextStep}
      </div>

      <Separator className="my-6" />

      {/* 5 — Customer questions */}
      <SectionTitle index={5} title="Customer Questions to Validate" />
      <BulletList items={a.questions} numbered className="mt-3" />

      {deal.notes.trim() && (
        <>
          <Separator className="my-6" />
          <SectionTitle title="Notes captured" />
          <p className="mt-2 text-sm italic text-muted-foreground">"{deal.notes}"</p>
        </>
      )}
    </Card>
  );
}

function SectionTitle({ index, title }: { index?: number; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {index !== undefined && (
        <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/10 font-mono text-[10px] font-semibold text-primary">
          {index}
        </span>
      )}
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
        {title}
      </h3>
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border/60 pb-2 last:border-0 last:pb-0 sm:border-0 sm:pb-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-right text-sm font-medium text-foreground tabular-nums">{value}</div>
    </div>
  );
}

function BulletList({
  items,
  tone,
  numbered,
  className = "",
}: {
  items: string[];
  tone?: "risk";
  numbered?: boolean;
  className?: string;
}) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag
      className={`space-y-1.5 ${numbered ? "list-decimal pl-5" : "list-disc pl-5"} ${className}`}
    >
      {items.map((it, i) => (
        <li
          key={i}
          className={`text-sm leading-relaxed ${
            tone === "risk"
              ? "text-foreground marker:text-destructive"
              : "text-foreground marker:text-muted-foreground"
          }`}
        >
          {it}
        </li>
      ))}
    </Tag>
  );
}
