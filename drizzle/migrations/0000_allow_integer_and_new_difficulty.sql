ALTER TABLE public.test_questions DROP CONSTRAINT IF EXISTS test_questions_correct_answer_check;
ALTER TABLE public.test_questions ADD CONSTRAINT test_questions_correct_answer_check
  CHECK (correct_answer IN ('A','B','C','D') OR correct_answer ~ '^[0-9]{1,6}$');
ALTER TABLE public.test_questions DROP CONSTRAINT IF EXISTS test_questions_difficulty_check;
ALTER TABLE public.test_questions ADD CONSTRAINT test_questions_difficulty_check
  CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','moderate','hard','very_hard'));