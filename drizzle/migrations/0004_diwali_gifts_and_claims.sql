CREATE TABLE public.diwali_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  certificate_id text NOT NULL UNIQUE DEFAULT ('NEX-DIW-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  claimed_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.diwali_claims TO authenticated;
GRANT ALL ON public.diwali_claims TO service_role;
ALTER TABLE public.diwali_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read their Diwali claim" ON public.diwali_claims FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Students claim once for their account" ON public.diwali_claims FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.diwali_gift_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diwali_gift_resources TO authenticated;
GRANT ALL ON public.diwali_gift_resources TO service_role;
ALTER TABLE public.diwali_gift_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read available Diwali resources" ON public.diwali_gift_resources FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage Diwali resources" ON public.diwali_gift_resources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update Diwali resources" ON public.diwali_gift_resources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete Diwali resources" ON public.diwali_gift_resources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));