-- ============ Platform upgrade: shared schema for 10 features ============
-- 1. Extend questions for new practice types + easy-solution cache
ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS correct_answers jsonb,
  ADD COLUMN IF NOT EXISTS question_data jsonb,
  ADD COLUMN IF NOT EXISTS explanation_easy jsonb;
COMMENT ON COLUMN public.test_questions.correct_answers IS 'JSON array of correct option letters for MSQ questions; null for single-answer types';
COMMENT ON COLUMN public.test_questions.question_data IS 'Structured data for assertion-reason (statements/options) and match-the-following (listA/listB/pairs)';
COMMENT ON COLUMN public.test_questions.explanation_easy IS 'Cached simplified explanations keyed by language: {en, hi, hinglish}';

-- 2. My Error Book
CREATE TABLE public.error_book (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  question_id uuid,
  source_attempt_id uuid,
  test_id uuid,
  question_snapshot jsonb not null,
  subject text,
  chapter text,
  topic text,
  mistake_tag text not null default 'concept_gap',
  note text,
  voice_note_url text,
  bookmarked boolean not null default false,
  resolved boolean not null default false,
  reattempt_count integer not null default 0,
  last_reattempt_correct boolean,
  revision_count integer not null default 0,
  last_revised_at timestamptz,
  next_revision_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  UNIQUE (user_id, question_id)
);
COMMENT ON COLUMN public.error_book.mistake_tag IS 'concept_gap | silly_mistake | calculation | guessed | time_pressure | wrong_method | other';

-- 3. Practice sessions (question-type practice, error reattempts, boosters)
CREATE TABLE public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode text not null,
  title text not null,
  subject text,
  chapter text,
  questions jsonb not null default '[]',
  total integer not null default 0,
  correct integer not null default 0,
  wrong integer not null default 0,
  skipped integer not null default 0,
  accuracy numeric,
  duration_seconds integer,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
COMMENT ON COLUMN public.practice_sessions.mode IS 'mcq | msq | numerical | assertion_reason | match | error_reattempt | booster_weak_chapter | booster_mistake | booster_speed';

-- 4. Tukkabazi (skipped-question reattempt after submission; never touches original scores)
CREATE TABLE public.tukkabazi_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attempt_id uuid not null,
  test_id uuid not null,
  question_ids jsonb not null default '[]',
  responses jsonb not null default '{}',
  total integer not null default 0,
  correct integer not null default 0,
  wrong integer not null default 0,
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 5. Flashcards
CREATE TABLE public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  deck_type text not null default 'formula',
  subject text,
  chapter text,
  exam_type text,
  card_count integer not null default 0,
  created_at timestamptz not null default now()
);
COMMENT ON COLUMN public.flashcard_decks.deck_type IS 'formula | reaction | concept';
CREATE TABLE public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  front text not null,
  back text not null,
  tags text[],
  created_at timestamptz not null default now()
);
CREATE TABLE public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  card_id uuid not null references public.flashcards(id) on delete cascade,
  bookmarked boolean not null default false,
  review_count integer not null default 0,
  known_count integer not null default 0,
  box integer not null default 1,
  next_review_at date,
  last_reviewed_at timestamptz,
  UNIQUE (user_id, card_id)
);

-- 6. Study planner
CREATE TABLE public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_date date not null,
  title text not null,
  subject text,
  chapter text,
  topic text,
  target_minutes integer,
  source text not null default 'manual',
  status text not null default 'pending',
  exam_track text not null default 'jee_main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
COMMENT ON COLUMN public.planner_tasks.source IS 'manual | auto_backlog | booster';
COMMENT ON COLUMN public.planner_tasks.exam_track IS 'jee_main | jee_advanced | neet';

-- 7. Chapter weightage from PYQ analysis (public reference data)
CREATE TABLE public.chapter_weightage (
  id uuid primary key default gen_random_uuid(),
  exam_type text not null,
  subject text not null,
  chapter text not null,
  avg_questions numeric not null default 1,
  weight integer not null default 1,
  created_at timestamptz not null default now(),
  UNIQUE (exam_type, subject, chapter)
);

-- ============ updated_at triggers ============
CREATE TRIGGER trg_error_book_updated_at BEFORE UPDATE ON public.error_book
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_planner_tasks_updated_at BEFORE UPDATE ON public.planner_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ GRANTs (same migration as CREATE) ============
GRANT SELECT, INSERT, UPDATE, DELETE ON public.error_book TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tukkabazi_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_decks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_tasks TO authenticated;
GRANT SELECT ON public.chapter_weightage TO authenticated;
GRANT ALL ON public.error_book TO service_role;
GRANT ALL ON public.practice_sessions TO service_role;
GRANT ALL ON public.tukkabazi_sessions TO service_role;
GRANT ALL ON public.flashcard_decks TO service_role;
GRANT ALL ON public.flashcards TO service_role;
GRANT ALL ON public.flashcard_reviews TO service_role;
GRANT ALL ON public.planner_tasks TO service_role;
GRANT ALL ON public.chapter_weightage TO service_role;

-- ============ RLS ============
ALTER TABLE public.error_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tukkabazi_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_weightage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own error book" ON public.error_book
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own practice sessions" ON public.practice_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own tukkabazi sessions" ON public.tukkabazi_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own flashcard decks" ON public.flashcard_decks
  FOR ALL TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users read flashcards from visible decks" ON public.flashcards
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.flashcard_decks d WHERE d.id = deck_id AND (d.user_id IS NULL OR d.user_id = auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.flashcard_decks d WHERE d.id = deck_id AND (d.user_id IS NULL OR d.user_id = auth.uid()))
  );
CREATE POLICY "Users manage own flashcard reviews" ON public.flashcard_reviews
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own planner tasks" ON public.planner_tasks
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users read chapter weightage" ON public.chapter_weightage
  FOR SELECT TO authenticated USING (true);
