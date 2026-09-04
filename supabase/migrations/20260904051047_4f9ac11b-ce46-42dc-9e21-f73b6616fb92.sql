ALTER TABLE public.test_questions ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'mcq';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'moderate';
ALTER TABLE public.tests ADD COLUMN IF NOT EXISTS include_integer boolean DEFAULT false;