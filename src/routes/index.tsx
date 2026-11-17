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
  type Deal,
} from "@/lib/storage";
import { draftAiAnalysis } from "@/lib/ai";
import { refreshSampleRates } from "@/lib/scenarios";
import { extractRequestFromEmail } from "@/lib/intake";
import { StartPanel } from "@/components/fx/StartPanel";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X } from "lucide-react";

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
  const [extracting, setExtracting] = useState(false);
  const [intake, setIntake] = useState<{ gaps: string[]; model: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDeals()
      .then(async (rows) => {
        if (cancelled) return;
        setDeals(rows);
        await refreshSamples(rows, () => cancelled);
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
   * Sample deals start on the static fallback table; swap them onto live
   * rates. The page opens on the Start panel, not on a finished pack.
   */
  async function refreshSamples(rows: Deal[], isCancelled: () => boolean = () => false) {
    const refreshed = await refreshSampleRates(rows);
    if (isCancelled() || refreshed === rows) return;
    await saveDeals(refreshed);
    setDeals(refreshed);
    setActive((cur) => (cur ? (refreshed.find((d) => d.id === cur.id) ?? cur) : cur));
  }

  async function handleExtract(email: string) {
    setExtracting(true);
    const r = await extractRequestFromEmail(email);
    setExtracting(false);
    if (!r) {
      toast.error("Couldn't read that email. Try again, or fill in the form yourself.");
      return;
    }
    setPrefill((p) => ({ key: (p?.key ?? 0) + 1, values: r.values }));
    setIntake({ gaps: r.gaps, model: r.model });
    toast.success("Form filled from the email. Check it, then generate.");
    document.getElementById("deal-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      setIntake(null);
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
    setIntake(null);
    setPrefill((p) => ({ key: (p?.key ?? 0) + 1, values }));
    void handleSubmit(values);
  }

  async function handleDelete(id: string) {
    try {
      await deleteDeal(id);
      const next = deals.filter((d) => d.id !== id);
      setDeals(next);
      if (active?.id === id) setActive(null);
    } catch (e) {
      console.error(e);
      toast.error("Could not delete request");
    }
  }

  async function handleReset() {
    const seeded = await resetDemo();
    setDeals(seeded);
    setActive(null);
    setIntake(null);
    toast.message("Demo reset to sample deals");
    await refreshSamples(seeded);
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="rounded-md border border-border bg-card p-6">
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-foreground">New FX request</h2>
              <p className="text-xs text-muted-foreground">
                Capture the request — rate is fetched on submit.
              </p>
            </div>
            {intake && (
              <div className="mb-5 rounded-md border border-accent/40 bg-accent/5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    Filled from email by AI. Check before generating.
                  </div>
                  <button
                    type="button"
                    onClick={() => setIntake(null)}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {intake.gaps.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-snug text-muted-foreground">
                    {intake.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <DealForm onSubmit={handleSubmit} loading={loading} prefill={prefill} />
          </div>

          {active ? (
            <DealSummary
              deal={active}
              aiLoading={aiPendingId === active.id}
              onDraftAi={aiPendingId ? undefined : (d) => void runAi(d)}
              onNewRequest={() => setActive(null)}
            />
          ) : (
            <StartPanel
              onExample={runExample}
              onExtract={(e) => void handleExtract(e)}
              extracting={extracting}
              busy={loading}
            />
          )}
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
