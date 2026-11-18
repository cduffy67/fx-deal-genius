import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Inbox, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { SAMPLE_INBOX } from "@/lib/scenarios";
import { splitInbox } from "@/lib/priority";

const STEPS = [
  { icon: Mail, title: "Read", text: "AI turns each email into a ticket and flags what's missing" },
  { icon: ShieldCheck, title: "Route", text: "Bank policy, not the AI, decides priority and who reviews" },
  { icon: Sparkles, title: "Reply", text: "A holding reply per client, checked for safe wording" },
];

/** Paste-an-inbox entry point for the triage flow. */
export function InboxPanel({
  value,
  onChange,
  onTriage,
  progress,
}: {
  value: string;
  onChange: (v: string) => void;
  onTriage: () => void;
  progress: { done: number; total: number } | null;
}) {
  const count = splitInbox(value).length;
  const busy = progress !== null;

  return (
    <Card className="rounded-md border-border p-6 shadow-none">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Client inbox</div>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Clear a morning's FX emails in one pass</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste client emails, one per block, separated by a line of dashes. You get a prioritised queue of checked
            tickets, each with a reply ready to send.
          </p>
          <ol className="mt-4 space-y-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">{s.title}.</span>{" "}
                  <span className="text-muted-foreground">{s.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Inbox className="h-3.5 w-3.5 text-muted-foreground" />
              {count} email{count === 1 ? "" : "s"} detected
            </span>
            <button
              type="button"
              onClick={() => onChange(SAMPLE_INBOX)}
              disabled={busy}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
            >
              Load sample inbox
            </button>
          </div>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={busy}
            placeholder={"e.g. Hi team, we need to get USD 8m to our LNG supplier by Friday...\n\n---\n\nHello, please convert EUR 250,000 into GBP..."}
            className="mt-2 h-56 resize-y bg-background font-mono text-xs leading-relaxed placeholder:text-muted-foreground/50"
            maxLength={20000}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">Up to 10 emails. Nothing is sent anywhere until you copy a reply.</p>
            <Button type="button" onClick={onTriage} disabled={busy || count === 0} className="gap-1.5">
              {progress ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading {Math.min(progress.done + 1, progress.total)} of{" "}
                  {progress.total}…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Triage {count || ""} email{count === 1 ? "" : "s"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
