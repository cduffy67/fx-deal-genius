import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RateBadge } from "./RateBadge";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, formatRate } from "@/lib/fx";
import type { Deal } from "@/lib/storage";
import { buildPack, type DealPack, type Provenance } from "@/lib/deal-analysis";
import type { PolicyOutcome } from "@/lib/governance";
import { buildDealPackText, downloadDealPackPdf } from "@/lib/deal-export";
import { FileText, ArrowRight, Copy, Download, ShieldCheck, Sparkles, Loader2, Plus, Mail } from "lucide-react";
import { toast } from "sonner";

function fmtTime(iso: string) {
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(iso)) + " UTC"
  );
}

export function DealSummary({
  deal,
  onDraftAi,
  aiLoading = false,
  onNewRequest,
}: {
  deal: Deal | null;
  onDraftAi?: (deal: Deal) => void;
  aiLoading?: boolean;
  onNewRequest?: () => void;
}) {
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

  const a = buildPack(deal);
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
            FX request ticket
          </div>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {deal.customerName || "Unknown client"} · <span className="font-mono">{pair}</span>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNewRequest && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={onNewRequest}>
              <Plus className="h-3.5 w-3.5" />
              New request
            </Button>
          )}
          <StatusBadge status={a.status} />
          <RateBadge source={deal.rateSource} />
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(buildDealPackText(deal));
                toast.success("Deal pack copied to clipboard");
              } catch {
                toast.error("Could not copy to clipboard");
              }
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy deal pack
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              try {
                downloadDealPackPdf(deal);
                toast.success("PDF downloaded");
              } catch (e) {
                console.error(e);
                toast.error("Could not generate PDF");
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <AiBar provenance={a.provenance} loading={aiLoading} onDraft={onDraftAi ? () => onDraftAi(deal) : undefined} />

      {/* 1 — Client request */}
      <SectionTitle index={1} title="Client Request" />
      <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-border bg-muted/30 p-4 sm:grid-cols-2">
        <KV label="Customer" value={deal.customerName || "Not stated"} />
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


      {(deal.intakeGaps?.length || deal.sourceEmail) && (
        <div className="mt-4 space-y-3">
          {deal.intakeGaps && deal.intakeGaps.length > 0 && (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Read from the client's email by AI. Check these before acting:
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-snug text-muted-foreground">
                {deal.intakeGaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          {deal.sourceEmail && (
            <details className="rounded-md border border-border">
              <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                Original email
              </summary>
              <p className="whitespace-pre-line border-t border-border px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {deal.sourceEmail}
              </p>
            </details>
          )}
        </div>
      )}

      <Separator className="my-6" />

      {/* 2 — Policy check */}
      <SectionTitle index={2} title="Policy Check" source="engine" />
      <GovernanceBlock pack={a} />


      <Separator className="my-6" />

      {/* 3 — Next step */}
      <SectionTitle index={3} title="Next Step" source="engine" />
      <div className="mt-3 flex items-center gap-3 rounded-md border-l-2 border-accent bg-accent/5 px-4 py-3 text-sm font-medium text-foreground">
        <ArrowRight className="h-4 w-4 text-accent" />
        {a.nextStep}
      </div>


      <Separator className="my-6" />

      {/* 4 — Customer reply */}
      <SectionTitle index={4} title="Reply to Send" source={a.replyProvenance} />
      <div className="mt-3 rounded-md border border-border bg-muted/20">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            To {deal.customerName || "client"} · checked for internal terms and firm-rate language
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(a.customerReply);
                toast.success("Reply copied");
              } catch {
                toast.error("Could not copy to clipboard");
              }
            }}
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        </div>
        <p className="whitespace-pre-line px-4 py-3 text-sm leading-relaxed text-foreground">{a.customerReply}</p>
      </div>


      <Separator className="my-6" />

      <details className="group mt-2 rounded-md border border-border">
        <summary className="cursor-pointer select-none px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground">
          More detail for the desk: business value, risks and questions to ask
        </summary>
        <div className="space-y-6 border-t border-border px-4 py-4">
          <div>
      {/* 2 — Business value */}
      <SectionTitle title="Relationship & Business Value" source={a.provenance} />
      <p className="mt-2 text-sm leading-relaxed text-foreground">{a.summary}</p>
      <BulletList items={a.businessValue} className="mt-3" />

          </div>
          <div>
      {/* 3 — Risk considerations */}
      <SectionTitle title="Risk Considerations" source={a.provenance} />
      <BulletList items={a.risks} tone="risk" className="mt-3" />

          </div>
          <div>
      {/* 5 — Customer questions */}
      <SectionTitle title="Customer Questions to Validate" source={a.provenance} />
      <BulletList items={a.questions} numbered className="mt-3" />

          </div>
        </div>
      </details>
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

function SourceChip({ source }: { source: Provenance | "engine" }) {
  if (source === "engine")
    return (
      <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        Policy engine
      </span>
    );
  if (source.kind === "ai")
    return (
      <span className="inline-flex items-center gap-1 rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
        <Sparkles className="h-2.5 w-2.5" /> AI-drafted
      </span>
    );
  return (
    <span className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
      Rule-based
    </span>
  );
}

function AiBar({
  provenance,
  loading,
  onDraft,
}: {
  provenance: Provenance;
  loading: boolean;
  onDraft?: () => void;
}) {
  if (loading)
    return (
      <div className="mb-5 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        Drafting value, risks and RM questions with AI. Policy outcome is already fixed by the rules engine.
      </div>
    );
  if (provenance.kind === "ai")
    return (
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
        <span>
          Narrative drafted by <span className="font-mono">{provenance.model}</span>. Outcome, thresholds and next
          step come from the policy engine and cannot be changed by the model.
        </span>
      </div>
    );
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
      <span>Rule-based draft. The policy outcome is final; the narrative can be drafted by AI.</span>
      {onDraft && (
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onDraft}>
          <Sparkles className="h-3.5 w-3.5" />
          Draft with AI
        </Button>
      )}
    </div>
  );
}

function SectionTitle({
  index,
  title,
  source,
}: {
  index?: number;
  title: string;
  source?: Provenance | "engine";
}) {
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
      {source && <SourceChip source={source} />}
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

function outcomeTone(o: PolicyOutcome): { bar: string; chip: string; label: string } {
  switch (o) {
    case "Approved for Indicative Review":
      return { bar: "border-emerald-500/60 bg-emerald-500/5", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", label: "Approved" };
    case "Needs Treasury Review":
      return { bar: "border-amber-500/60 bg-amber-500/5", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30", label: "Treasury" };
    case "Needs Compliance Review":
      return { bar: "border-destructive/60 bg-destructive/5", chip: "bg-destructive/10 text-destructive border-destructive/30", label: "Compliance" };
    case "Needs More Information":
      return { bar: "border-sky-500/60 bg-sky-500/5", chip: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30", label: "More info" };
    case "Enhanced Review Recommended":
      return { bar: "border-primary/60 bg-primary/5", chip: "bg-primary/10 text-primary border-primary/30", label: "Enhanced" };
  }
}

function GovernanceBlock({ pack }: { pack: DealPack }) {
  const g = pack.governance;
  const tone = outcomeTone(g.outcome);
  return (
    <div className="mt-3 space-y-4">
      <div className={`flex flex-wrap items-center gap-3 rounded-md border-l-2 px-4 py-3 ${tone.bar}`}>
        <ShieldCheck className="h-4 w-4 text-foreground" />
        <span className="text-sm font-semibold text-foreground">{g.outcome}</span>
        <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.chip}`}>
          {tone.label}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          GBP equiv. ~£{Math.round(g.gbpEquivalent).toLocaleString("en-GB")}
        </span>
      </div>

      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Matched policy rules
        </div>
        <ul className="mt-2 space-y-1.5">
          {g.matchedRules.map((r) => (
            <li key={r.id} className="flex gap-2 text-sm leading-relaxed text-foreground">
              <span className="font-mono text-xs font-semibold text-primary">{r.id}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Explanation
          {pack.provenance.kind === "ai" && pack.governanceExplanation !== g.explanation && (
            <SourceChip source={pack.provenance} />
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{pack.governanceExplanation}</p>
      </div>

      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Required next action
        </div>
        <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{g.nextAction}</p>
      </div>

      <p className="text-[11px] italic text-muted-foreground">Source: {g.source}</p>
    </div>
  );
}
