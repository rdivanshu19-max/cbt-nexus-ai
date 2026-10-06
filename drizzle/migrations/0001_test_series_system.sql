CREATE TABLE public.coaching_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  description text,
  website_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coaching_partners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coaching_partners TO authenticated;
GRANT ALL ON public.coaching_partners TO service_role;
ALTER TABLE public.coaching_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners viewable" ON public.coaching_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage partners" ON public.coaching_partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.test_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_id uuid REFERENCES public.coaching_partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  tagline text,
  description text,
  session_label text,
  accent text NOT NULL DEFAULT 'blue',
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_series TO authenticated;
GRANT ALL ON public.test_series TO service_role;
ALTER TABLE public.test_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Series viewable" ON public.test_series FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage series" ON public.test_series FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.series_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  title text NOT NULL,
  label text,
  syllabus text,
  duration_minutes integer,
  question_count integer,
  total_marks integer,
  lock_mode text NOT NULL DEFAULT 'open' CHECK (lock_mode IN ('open','date','promo')),
  unlock_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_tests TO authenticated;
GRANT ALL ON public.series_tests TO service_role;
ALTER TABLE public.series_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Series tests viewable" ON public.series_tests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage series tests" ON public.series_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Where the paper actually lives; hidden from students so locked papers can't be opened directly.
CREATE TABLE public.series_test_sources (
  test_id uuid PRIMARY KEY REFERENCES public.series_tests(id) ON DELETE CASCADE,
  storage_path text,
  external_url text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_test_sources TO authenticated;
GRANT ALL ON public.series_test_sources TO service_role;
ALTER TABLE public.series_test_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sources" ON public.series_test_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Private early-access codes per series; never readable by students.
CREATE TABLE public.series_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  code text NOT NULL,
  UNIQUE (series_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_promo_codes TO authenticated;
GRANT ALL ON public.series_promo_codes TO service_role;
ALTER TABLE public.series_promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage codes" ON public.series_promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.series_unlocks (
  user_id uuid NOT NULL,
  series_id uuid NOT NULL REFERENCES public.test_series(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, series_id)
);
GRANT SELECT ON public.series_unlocks TO authenticated;
GRANT ALL ON public.series_unlocks TO service_role;
ALTER TABLE public.series_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own unlocks" ON public.series_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);