import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCIES, type Currency } from "@/lib/fx";
import type { Urgency, RelationshipValue } from "@/lib/storage";
import { Loader2 } from "lucide-react";

export type FormValues = {
  customerName: string;
  customerIndustry: string;
  baseCcy: Currency;
  targetCcy: Currency;
  amount: string;
  purpose: string;
  urgency: Urgency;
  relationshipValue: RelationshipValue;
  notes: string;
};

const INITIAL: FormValues = {
  customerName: "",
  customerIndustry: "",
  baseCcy: "EUR",
  targetCcy: "USD",
  amount: "",
  purpose: "",
  urgency: "Medium",
  relationshipValue: "Medium",
  notes: "",
};

const INDUSTRIES = [
  "Manufacturing",
  "Energy & Commodities",
  "Technology",
  "Financial Institution",
  "Real Estate",
  "Pharmaceuticals",
  "Retail",
  "Logistics",
  "Other",
];

export function DealForm({
  onSubmit,
  loading,
  prefill,
}: {
  onSubmit: (v: FormValues) => void;
  loading: boolean;
  /** Fill the form from outside (example scenarios). Change `key` to re-apply. */
  prefill?: { key: number; values: FormValues };
}) {
  const [v, setV] = useState<FormValues>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  useEffect(() => {
    if (!prefill) return;
    setV(prefill.values);
    setErrors({});
  }, [prefill?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormValues>(k: K, val: FormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormValues, string>> = {};
    if (!v.customerName.trim()) e.customerName = "Required";
    const amt = Number(v.amount);
    if (!v.amount || isNaN(amt) || amt <= 0) e.amount = "Enter a positive amount";
    if (!v.purpose.trim()) e.purpose = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(v);
  }

  const pill = (
    label: string,
    value: string,
    options: string[],
    onChange: (s: string) => void,
  ) => (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="mt-2 inline-flex rounded-md border border-border bg-muted/40 p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-[4px] px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form id="deal-form" onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="customerName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Customer name
          </Label>
          <Input
            id="customerName"
            value={v.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            placeholder="e.g. Acme Industrial AG"
            className="mt-2 placeholder:text-muted-foreground/50"
          />
          {errors.customerName && (
            <p className="mt-1 text-xs text-destructive">{errors.customerName}</p>
          )}
        </div>
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Industry
          </Label>
          <Select value={v.customerIndustry} onValueChange={(s) => set("customerIndustry", s)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => (
                <SelectItem key={i} value={i}>{i}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sell (base)
          </Label>
          <Select value={v.baseCcy} onValueChange={(s) => set("baseCcy", s as Currency)}>
            <SelectTrigger className="mt-2 font-mono"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c} className="font-mono">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Buy (target)
          </Label>
          <Select value={v.targetCcy} onValueChange={(s) => set("targetCcy", s as Currency)}>
            <SelectTrigger className="mt-2 font-mono"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c} className="font-mono">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="amount" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Amount ({v.baseCcy})
          </Label>
          <Input
            id="amount"
            inputMode="decimal"
            value={v.amount}
            onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 1,000,000"
            className="mt-2 font-mono placeholder:text-muted-foreground/50"
          />
          {errors.amount && (
            <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="purpose" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Purpose of transaction
        </Label>
        <Input
          id="purpose"
          value={v.purpose}
          onChange={(e) => set("purpose", e.target.value)}
          placeholder="e.g. Supplier payment, Q2 invoice batch"
          className="mt-2 placeholder:text-muted-foreground/50"
        />
        {errors.purpose && (
          <p className="mt-1 text-xs text-destructive">{errors.purpose}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {pill("Urgency", v.urgency, ["Low", "Medium", "High"], (s) => set("urgency", s as Urgency))}
        {pill("Relationship value", v.relationshipValue, ["Low", "Medium", "High"], (s) =>
          set("relationshipValue", s as RelationshipValue),
        )}
      </div>

      <div>
        <Label htmlFor="notes" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Notes / context
        </Label>
        <Textarea
          id="notes"
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Recurring monthly flow; client usually books mid-morning."
          className="mt-2 min-h-[88px] placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Live FX from Frankfurter (ECB reference). Demo only — not executable.
        </p>
        <Button type="submit" disabled={loading} className="min-w-[180px]">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching rate…
            </>
          ) : (
            "Generate deal summary"
          )}
        </Button>
      </div>
    </form>
  );
}
