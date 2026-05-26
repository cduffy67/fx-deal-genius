# FX Deal Desk Assistant — Build Plan

A polished, single-page prototype. No backend, no auth. All state lives in the browser.

## Scope

One route (`/`) with a three-section layout:
1. **Header** — product name, subtle "Prototype / Demo" badge
2. **Dashboard strip** — 4 summary cards (Total requests, Total notional EUR-equivalent, Avg ticket size, High-urgency open)
3. **Main grid** — left: deal request form; right: latest deal summary
4. **Recent requests table** — clickable rows reload the summary
5. **Architecture Notes** — collapsible section at the bottom

## Design direction

Serious enterprise banking aesthetic:
- Deep navy primary (`oklch(0.25 0.06 255)`), warm off-white background (`oklch(0.985 0.005 85)`), restrained amber accent for highlights
- Inter for UI, JetBrains Mono for all numeric figures (rates, amounts, timestamps)
- Sharp corners (radius 6px), thin 1px borders, no gradients, no decorative animation
- Tight density, generous whitespace around key numbers

Tokens added to `src/styles.css`: `--success`, `--warning`, `--font-mono`, retuned `--primary`, `--accent`, `--background`.

## Files

```
src/
  routes/
    index.tsx                    # page composition
  components/
    fx/
      DealForm.tsx               # all form fields + validation
      DealSummary.tsx            # right-hand summary card
      DashboardCards.tsx         # 4 KPI cards
      RecentRequestsTable.tsx    # history table from localStorage
      ArchitectureNotes.tsx      # collapsible notes
      RateBadge.tsx              # small "Live / Demo" pill
  lib/
    fx.ts                        # Frankfurter fetch + fallback rates + types
    storage.ts                   # localStorage CRUD for deals
    deal-analysis.ts             # generates summary, risk, next step, questions
```

`__root.tsx` gets a `<Toaster />` from `sonner` added.

## Data model (localStorage key `fx-deals-v1`)

```ts
type Deal = {
  id: string;                    // crypto.randomUUID()
  createdAt: string;             // ISO
  customerName: string;
  customerIndustry: string;
  baseCcy: "EUR"|"USD"|"GBP"|"JPY"|"CHF";
  targetCcy: "EUR"|"USD"|"GBP"|"JPY"|"CHF";
  amount: number;
  purpose: string;
  urgency: "Low"|"Medium"|"High";
  relationshipValue: "Low"|"Medium"|"High";
  notes: string;
  rate: number;
  convertedAmount: number;
  rateFetchedAt: string;         // ISO
  rateSource: "frankfurter" | "demo-fallback";
}
```

## FX integration

`lib/fx.ts` calls `https://api.frankfurter.dev/v1/latest?base={BASE}&symbols={TARGET}` directly from the browser (Frankfurter supports CORS, no key needed). 6s timeout via `AbortController`. Same-currency pairs short-circuit to rate `1.0`.

On failure: return a hard-coded fallback rate table (EUR-pivot, mid-market snapshot baked in) with `source: "demo-fallback"`. The summary card and badge show an amber "Demo fallback rate — live FX unavailable" notice. Form still submits; deal is saved with `rateSource: "demo-fallback"`.

## Deal analysis (`lib/deal-analysis.ts`)

Pure function, no LLM. Deterministic templates that vary on inputs:
- **Deal summary** — one-sentence natural language recap
- **Business value** — bullets derived from amount tier + relationshipValue (e.g. >EUR 1M + High = "Strategic flow, prioritise for desk attention")
- **Risk considerations** — bullets driven by amount tier, currency pair volatility class (JPY/CHF flagged), urgency, and `rateSource === "demo-fallback"`
- **Recommended next step** — one of: "Auto-quote and confirm", "Route to senior dealer", "Escalate to credit + relationship manager", chosen via amount + urgency + relationshipValue matrix
- **Questions to validate** — 3–5 templated questions referencing purpose, value date, hedging intent, settlement instructions

Tiers: amount converted to EUR-equivalent using the fetched rate, then bucketed (<50k / 50k–500k / 500k–5M / 5M+).

## Form

Built with shadcn `Input`, `Select`, `Textarea`, `Button`, `RadioGroup` (for urgency / relationship). Client-side Zod validation. Submit flow:
1. Validate
2. `fetchRate(base, target)` — show inline spinner on submit button
3. Build Deal, persist to localStorage (prepend), set as "active summary"
4. `toast.success` on live rate, `toast.warning` on fallback, `toast.error` only if both fetch AND fallback table miss the pair (shouldn't happen — all 5×5 pairs covered)

## Dashboard cards

Computed from stored deals:
- Requests this session (count)
- Total notional (sum of EUR-equivalents, mono font)
- Average ticket size
- High-urgency count

Empty state: cards show "—" with muted helper text "Submit your first request".

## Recent requests table

Columns: Time · Customer · Pair · Amount · Rate · Urgency badge · Source pill. Last 20 rows. Click row → loads that deal into the summary panel. Trash icon per row + "Clear all" button (with confirm).

## Architecture Notes section

Collapsible card at page bottom, plain prose:
- FX data: Frankfurter API (ECB reference rates, free, no key)
- Persistence: browser localStorage for the demo
- Production hardening required: database + audit trail, SSO/auth, RBAC, licensed tradeable FX feed (Refinitiv/Bloomberg), data residency review, hosting/VPC review, security validation, MiFID II record-keeping

## Error handling summary

| Failure | Behaviour |
|---|---|
| Frankfurter network/timeout | Fallback table, amber badge, deal still saved |
| Same-currency pair | Rate forced to 1.0, no API call |
| Validation fail | Inline field errors, no submit |
| localStorage unavailable | In-memory fallback for the session, toast warning |

## Out of scope (explicit)

No auth, no Lovable Cloud, no swaps/forwards, no permissions, no charting library, no multi-page routing.

## Technical notes

- TanStack Start route: `createFileRoute("/")`
- `head()` metadata: title "FX Deal Desk Assistant", description for SEO even on a prototype
- `useEffect` reads localStorage on mount (SSR-safe guard)
- All currency formatting via `Intl.NumberFormat` with the relevant `style: "currency"`
- All timestamps via `Intl.DateTimeFormat`, UTC-labelled
