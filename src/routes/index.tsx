import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { DealForm, type FormValues } from "@/components/fx/DealForm";
import { DealSummary } from "@/components/fx/DealSummary";
import { DashboardCards } from "@/components/fx/DashboardCards";
import { InboxPanel } from "@/components/fx/InboxPanel";
import { TicketQueue } from "@/components/fx/TicketQueue";
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
  type Deal,
} from "@/lib/storage";
import { draftAiAnalysis } from "@/lib/ai";
import { SAMPLE_INBOX } from "@/lib/scenarios";
import { extractRequestFromEmail } from "@/lib/intake";
import { sortQueue, splitInbox } from "@/lib/priority";
import { Badge } from "@/components/ui/badge";

/** Run async work over items with at most n in flight (keeps under AI rate limits). */
async function runPool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Norton Bank · FX Deal Desk Assistant" },
      {
        name: "description",
        content:
          "Turn client FX emails into checked, policy-routed tickets with a safe reply to send. Norton Bank internal prototype.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [inboxText, setInboxText] = useState(SAMPLE_INBOX);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const active = deals.find((d) => d.id === activeId) ?? null;

  useEffect(() => {
    fetchDeals()
      .then((rows) => setDeals(rows))
      .catch((e) => {
        console.error(e);
        toast.error("Could not load saved tickets");
      });
  }, []);

  /** Fetch a live rate, save the ticket and add it to the queue. */
  async function createTicket(
    v: FormValues,
    extra: Pick<Deal, "sourceEmail" | "intakeGaps"> = {},
  ): Promise<Deal> {
    const amount = Number(v.amount) > 0 ? Number(v.amount) : 0;
    const r = await fetchRate(v.baseCcy, v.targetCcy);
    const saved = await insertDeal({
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
      ...extra,
    });
    setDeals((prev) => [saved, ...prev]);
    return saved;
  }

  /** Read every email (2 at a time), build the queue, then draft replies. */
  async function triageInbox() {
    const emails = splitInbox(inboxText);
    if (!emails.length) return;
    setProgress({ done: 0, total: emails.length });
    const created: Deal[] = [];
    let failed = 0;
    await runPool(emails, 2, async (email) => {
      const r = await extractRequestFromEmail(email);
      if (r) created.push(await createTicket(r.values, { sourceEmail: email, intakeGaps: r.gaps }));
      else failed++;
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    });
    setProgress(null);
    if (!created.length) {
      toast.error("Couldn't read those emails. Try again in a moment.");
      return;
    }
    setActiveId(sortQueue(created)[0].id);
    toast.success(`${created.length} ticket${created.length === 1 ? "" : "s"} in the queue`, {
      description: failed ? `${failed} email${failed === 1 ? "" : "s"} couldn't be read` : "Drafting replies now",
    });
    await runPool(created, 2, (d) => runAi(d, { quiet: true }));
  }

  async function handleSubmit(v: FormValues) {
    setLoading(true);
    try {
      const saved = await createTicket(v);
      setActiveId(saved.id);
      setLoading(false);
      void runAi(saved);
    } catch (e) {
      console.error(e);
      toast.error("Could not create ticket");
      setLoading(false);
    }
  }

  async function runAi(deal: Deal, opts: { quiet?: boolean } = {}) {
    setPendingIds((s) => new Set(s).add(deal.id));
    const ai = await draftAiAnalysis(deal);
    setPendingIds((s) => {
      const n = new Set(s);
      n.delete(deal.id);
      return n;
    });
    if (!ai) {
      if (!opts.quiet) toast.message("AI drafting unavailable — showing the template reply");
      return;
    }
    const updated = await updateDeal({ ...deal, ai });
    setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }

  async function handleDelete(id: string) {
    await deleteDeal(id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function handleClear() {
    await resetDemo();
    setDeals([]);
    setActiveId(null);
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
                Client FX inbox triage for relationship managers · live ECB reference rates
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

        <InboxPanel value={inboxText} onChange={setInboxText} onTriage={() => void triageInbox()} progress={progress} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <div className="space-y-4">
            <TicketQueue
              deals={deals}
              activeId={activeId}
              pendingIds={pendingIds}
              onSelect={setActiveId}
              onDelete={(id) => void handleDelete(id)}
              onClear={() => void handleClear()}
            />
            <details className="rounded-md border border-border bg-card">
              <summary className="cursor-pointer select-none px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground">
                Add a ticket by hand
              </summary>
              <div className="border-t border-border p-4">
                <DealForm onSubmit={handleSubmit} loading={loading} />
              </div>
            </details>
          </div>

          {active ? (
            <DealSummary
              deal={active}
              aiLoading={pendingIds.has(active.id)}
              onDraftAi={pendingIds.has(active.id) ? undefined : (d) => void runAi(d)}
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {deals.length
                ? "Pick a ticket from the queue to see the policy check and the reply to send."
                : "Triage the inbox above. Each email becomes a ticket here, with the bank's policy check and a reply ready to send."}
            </div>
          )}
        </div>

        <PolicySource />

        <SecurityReadiness />

        <ArchitectureNotes />

        <footer className="space-y-1 pt-4 pb-2 text-center text-[11px] text-muted-foreground">
          <p>
            Prototype exploring how a relationship manager's FX inbox can become a policy-routed queue
            with safe, AI-drafted replies.
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
