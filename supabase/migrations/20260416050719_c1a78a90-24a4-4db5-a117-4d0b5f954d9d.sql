
CREATE TABLE public.pdf_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  converted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversions"
ON public.pdf_conversions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions"
ON public.pdf_conversions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversions"
ON public.pdf_conversions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pdf_conversions_user_date ON public.pdf_conversions (user_id, converted_at);
