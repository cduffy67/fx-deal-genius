import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Loader2, Mail, ShieldCheck, Sparkles, FileText } from "lucide-react";
import type { FormValues } from "./DealForm";
import { EXAMPLE_SCENARIOS, SAMPLE_EMAIL } from "@/lib/scenarios";

const STEPS = [
  { icon: Mail, title: "Capture", text: "A customer FX request, pasted or typed" },
  { icon: ShieldCheck, title: "Check", text: "Rules engine applies bank policy" },
  { icon: Sparkles, title: "Draft", text: "AI writes the decision pack and reply" },
];

/**
 * Landing state for the decision-pack area: explains the flow and offers
 * two ways in (paste an email, or a one-click example).
 */
export function StartPanel({
  onExample,
  onExtract,
  extracting,
  busy,
}: {
  onExample: (values: FormValues) => void;
  onExtract: (email: string) => void;
  extracting: boolean;
  busy: boolean;
}) {
  const [email, setEmail] = useState("");

  return (
    <Card className="flex h-full flex-col gap-6 rounded-md border-border p-6 shadow-none">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Start here</div>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Turn a customer's FX request into a decision pack</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bank policy decides what happens next. AI does the reading and the writing.
        </p>
        <ol className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary/10 font-mono text-[10px] font-semibold text-primary">
                {i + 1}
              </span>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.title}
                </div>
                <div className="text-[11px] leading-snug text-muted-foreground">{s.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Way in 1: paste an email */}
      <div className="rounded-md border border-accent/30 bg-accent/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Paste a customer email
          </div>
          <button
            type="button"
            onClick={() => setEmail(SAMPLE_EMAIL)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Use a sample email
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          AI pulls out the customer, currencies, amount and urgency, fills in the form and flags anything missing.
          You check it before anything is decided.
        </p>
        <Textarea
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. Hi team, we need to get USD 8m to our LNG supplier by Friday. Could you send over a rate?"
          className="mt-3 min-h-[110px] bg-background text-sm placeholder:text-muted-foreground/50"
          maxLength={3000}
        />
        <div className="mt-3 flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={extracting || busy || email.trim().length < 10}
            onClick={() => onExtract(email)}
            className="gap-1.5"
          >
            {extracting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading email…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" /> Fill the form with AI
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Way in 2: one-click examples */}
      <div>
        <div className="text-sm font-semibold text-foreground">Or run an example</div>
        <p className="text-xs text-muted-foreground">Each one takes a different path through the policy.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EXAMPLE_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => onExample(s.values)}
              className="group flex flex-col items-start gap-1 rounded-md border border-border bg-background p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:opacity-50"
            >
              <div className="text-xs font-semibold text-foreground">{s.label}</div>
              <div className="text-[11px] text-muted-foreground">{s.blurb}</div>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                {s.outcome}
              </div>
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        You can also fill in the form yourself, or open a sample deal from Recent requests below to see a finished pack.
      </p>
    </Card>
  );
}
