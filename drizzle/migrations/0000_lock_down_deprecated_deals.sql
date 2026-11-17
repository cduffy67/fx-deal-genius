DROP POLICY IF EXISTS "Demo: anyone can delete deals" ON public.deals;
DROP POLICY IF EXISTS "Demo: anyone can insert deals" ON public.deals;
DROP POLICY IF EXISTS "Demo: anyone can view deals" ON public.deals;
REVOKE ALL ON public.deals FROM anon, authenticated;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.deals IS 'DEPRECATED: no longer used by the app; requests are stored per visitor in the browser';