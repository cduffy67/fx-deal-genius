CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name TEXT NOT NULL,
  customer_industry TEXT NOT NULL DEFAULT '',
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  fx_rate NUMERIC NOT NULL,
  converted_amount NUMERIC NOT NULL,
  urgency TEXT NOT NULL,
  relationship_value TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  rate_source TEXT NOT NULL DEFAULT 'frankfurter',
  rate_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demo: anyone can view deals" ON public.deals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo: anyone can insert deals" ON public.deals FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Demo: anyone can delete deals" ON public.deals FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX deals_created_at_idx ON public.deals (created_at DESC);