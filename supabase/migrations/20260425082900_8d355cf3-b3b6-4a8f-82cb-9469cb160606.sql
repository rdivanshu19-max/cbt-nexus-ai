-- Saved AI short notes for the Save & Review / Revision flow
CREATE TABLE public.saved_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam TEXT NOT NULL,
  class_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  chapter TEXT NOT NULL,
  style TEXT NOT NULL,
  notes JSONB NOT NULL,
  finished_card_indices INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved notes"
ON public.saved_notes FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own saved notes"
ON public.saved_notes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own saved notes"
ON public.saved_notes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own saved notes"
ON public.saved_notes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_notes_updated_at
BEFORE UPDATE ON public.saved_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_notes_user_created ON public.saved_notes (user_id, created_at DESC);