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
  deleteDeal,
  clearDeals,
  type Deal,
} from "@/lib/storage";
import { deriveStatus } from "@/lib/deal-analysis";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FX Deal Desk Assistant" },
      {
        name: "description",
        content:
          "Prototype FX deal desk assistant for banking sales: capture requests, fetch live ECB rates and generate customer-ready deal summaries.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [active, setActive] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDeals()
      .then((rows) => {
        setDeals(rows);
        if (rows[0]) setActive(rows[0]);
      })
      .catch((e) => {
        console.error(e);
        toast.error("Could not load saved requests");
      });
  }, []);

  async function handleSubmit(v: FormValues) {
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
      const status = deriveStatus({
        ...draft,
        id: "tmp",
        createdAt: new Date().toISOString(),
      });
      const saved = await insertDeal({ ...draft, status });
      setDeals((prev) => [saved, ...prev]);
      setActive(saved);
      if (r.source === "frankfurter")
        toast.success("Live FX rate retrieved", {
          description: `${v.baseCcy}/${v.targetCcy} @ ${r.rate.toFixed(4)}`,
        });
      else if (r.source === "demo-fallback")
        toast.warning("Live FX unavailable — using demo fallback rate");
      else toast.message("Same currency — rate set to 1.0000");
    } catch (e) {
      console.error(e);
      toast.error("Could not save deal request");
    } finally {
      setLoading(false);
    }
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

  async function handleClear() {
    try {
      await clearDeals();
      setDeals([]);
      setActive(null);
    } catch (e) {
      console.error(e);
      toast.error("Could not clear requests");
    }
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
            <DealForm onSubmit={handleSubmit} loading={loading} />
          </div>

          <DealSummary deal={active} />
        </div>

        <RecentRequestsTable
          deals={deals}
          onSelect={setActive}
          onDelete={handleDelete}
          onClear={handleClear}
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
