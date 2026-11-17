import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { DealForm, type FormValues } from "@/components/fx/DealForm";
import { DealSummary } from "@/components/fx/DealSummary";
import { DashboardCards } from "@/components/fx/DashboardCards";
import { RecentRequestsTable } from "@/components/fx/RecentRequestsTable";
import { ArchitectureNotes } from "@/components/fx/ArchitectureNotes";
import { SecurityReadiness } from "@/components/fx/SecurityReadiness";
import { PolicySource } from "@/components/fx/PolicySource";
import { fetchRate } from "@/lib/fx";
import {
  fetchDeals,
  insertDeal,
  updateDeal,
  deleteDeal,
  resetDemo,
  saveDeals,
  isSample,
  type Deal,
} from "@/lib/storage";
import { draftAiAnalysis } from "@/lib/ai";
import { EXAMPLE_SCENARIOS, refreshSampleRates } from "@/lib/scenarios";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

function isSameRequest(d: Deal, v: FormValues): boolean {
  return (
    d.customerName === v.customerName.trim() &&
    d.customerIndustry === v.customerIndustry &&
    d.baseCcy === v.baseCcy &&
    d.targetCcy === v.targetCcy &&
    d.amount === Number(v.amount) &&
    d.purpose === v.purpose.trim() &&
    d.urgency === v.urgency &&
    d.relationshipValue === v.relationshipValue &&
    d.notes === v.notes.trim()
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Norton Bank · FX Deal Desk Assistant" },
      {
        name: "description",
        content:
          "Norton Bank internal prototype: capture FX requests, enrich with live ECB reference rates and cross-check against the Norton Bank FX Governance Pack.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [active, setActive] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiPendingId, setAiPendingId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{ key: number; values: FormValues } | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetchDeals()
      .then(async (rows) => {
        if (cancelled) return;
        setDeals(rows);
        setActive(rows[0] ?? null);
        await showcaseSamples(rows, () => cancelled);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Could not load saved requests");
      });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * First-visit polish: swap sample deals onto live rates, then AI-draft the
   * pack that's on screen so a new visitor sees the full product immediately.
   */
  async function showcaseSamples(rows: Deal[], isCancelled: () => boolean = () => false) {
    const refreshed = await refreshSampleRates(rows);
    if (isCancelled()) return;
    if (refreshed !== rows) {
      await saveDeals(refreshed);
      setDeals(refreshed);
      setActive((cur) => refreshed.find((d) => d.id === cur?.id) ?? refreshed[0] ?? null);
    }
    const first = refreshed[0];
    if (first && isSample(first) && !first.ai && first.rateSource !== "demo-fallback") {
      void runAi(first, { quiet: true });
    }
  }

  async function handleSubmit(v: FormValues) {
    // Same request submitted again within 2 minutes (e.g. example + Generate): reuse it.
    const dupe = deals.find(
      (d) => isSameRequest(d, v) && Date.now() - new Date(d.createdAt).getTime() < 120_000,
    );
    if (dupe) {
      setActive(dupe);
      toast.message("Already generated — showing the existing pack");
      return;
    }
    setLoading(true);
    try {
      const amount = Number(v.amount);
      const r = await fetchRate(v.baseCcy, v.targetCcy);
      const draft: Omit<Deal, "id" | "createdAt"> = {
        customerName: v.customerName.trim(),
        customerIndustry: v.customerIndustry,
        baseCcy: v.baseCcy,
        targetCcy: v.targetCcy,
        amount,
        purpose: v.purpose.trim(),
        urgency: v.urgency,
        relationshipValue: v.relationshipValue,
        notes: v.notes.trim(),
        rate: r.rate,
        convertedAmount: amount * r.rate,
        rateFetchedAt: r.fetchedAt,
        rateSource: r.source,
      };
      const saved = await insertDeal(draft);
      setDeals((prev) => [saved, ...prev]);
      setActive(saved);
      if (r.source === "frankfurter")
        toast.success("Live FX rate retrieved", {
          description: `${v.baseCcy}/${v.targetCcy} @ ${r.rate.toFixed(4)}`,
        });
      else if (r.source === "demo-fallback")
        toast.warning("Live FX unavailable — using demo fallback rate");
      else toast.message("Same currency — rate set to 1.0000");
      setLoading(false);
      void runAi(saved);
    } catch (e) {
      console.error(e);
      toast.error("Could not save deal request");
      setLoading(false);
    }
  }

  async function runAi(deal: Deal, opts: { quiet?: boolean } = {}) {
    setAiPendingId(deal.id);
    const ai = await draftAiAnalysis(deal);
    setAiPendingId((id) => (id === deal.id ? null : id));
    if (!ai) {
      if (!opts.quiet) toast.message("AI drafting unavailable — showing the rule-based pack");
      return;
    }
    const updated = await updateDeal({ ...deal, ai });
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setActive((cur) => (cur?.id === updated.id ? updated : cur));
  }

  function runExample(values: FormValues) {
    setPrefill((p) => ({ key: (p?.key ?? 0) + 1, values }));
    void handleSubmit(values);
  }

  async function handleDelete(id: string) {
    try {
      await deleteDeal(id);
      const next = deals.filter((d) => d.id !== id);
      setDeals(next);
      if (active?.id === id) setActive(next[0] ?? null);
    } catch (e) {
      console.error(e);
      toast.error("Could not delete request");
    }
  }

  async function handleReset() {
    const seeded = await resetDemo();
    setDeals(seeded);
    setActive(seeded[0] ?? null);
    toast.message("Demo reset to sample deals");
    await showcaseSamples(seeded);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary font-serif text-sm font-bold text-primary-foreground">
              N
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                Norton Bank · FX Deal Desk Assistant
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Internal prototype · Treasury Operations · live ECB reference rates
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
            Norton Bank Internal Prototype
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <DashboardCards deals={deals} />

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-4 py-3">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Try an example
          </span>
          {EXAMPLE_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={loading}
              onClick={() => runExample(s.values)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
            >
              <div className="text-xs font-medium text-foreground">{s.label}</div>
              <div className="text-[10px] text-muted-foreground">{s.blurb}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="rounded-md border border-border bg-card p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-foreground">New FX request</h2>
              <p className="text-xs text-muted-foreground">
                Capture the request — rate is fetched on submit.
              </p>
            </div>
            <DealForm onSubmit={handleSubmit} loading={loading} prefill={prefill} />
          </div>

          <DealSummary
            deal={active}
            aiLoading={!!active && aiPendingId === active.id}
            onDraftAi={aiPendingId ? undefined : (d) => void runAi(d)}
          />
        </div>

        <RecentRequestsTable
          deals={deals}
          onSelect={setActive}
          onDelete={handleDelete}
          onReset={handleReset}
        />

        <PolicySource />

        <SecurityReadiness />

        <ArchitectureNotes />

        <footer className="space-y-1 pt-4 pb-2 text-center text-[11px] text-muted-foreground">
          <p>
            Prototype built to explore how manual FX request intake can become API-enriched,
            governance-aware decision support.
          </p>
          <p>
            Norton Bank internal prototype · Not for production trading · Indicative rates via{" "}
            <a
              href="https://frankfurter.dev"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              frankfurter.dev
            </a>
          </p>
        </footer>
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
