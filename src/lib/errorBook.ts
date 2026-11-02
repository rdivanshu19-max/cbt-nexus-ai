import { supabase } from '@/integrations/supabase/client';

export type MistakeTag = 'concept_gap' | 'silly_error' | 'time_trap' | 'guessed';

export const MISTAKE_LABELS: Record<string, string> = {
  concept_gap: 'Concept gap',
  silly_error: 'Silly error',
  time_trap: 'Time trap',
  guessed: 'Rushed / guessed',
};

/** Heuristic classification from how the question was answered. */
export const classifyMistake = (
  timeSpentSeconds: number,
  markedForReview: boolean,
): MistakeTag => {
  if (timeSpentSeconds <= 20) return 'silly_error';
  if (timeSpentSeconds >= 150) return 'time_trap';
  if (markedForReview) return 'guessed';
  return 'concept_gap';
};

/** Leitner-style revision intervals (days) by revision box. */
export const REVISION_INTERVALS = [1, 3, 7, 14, 30];
export const nextRevisionDate = (box: number) => {
  const days = REVISION_INTERVALS[Math.min(Math.max(box, 0), REVISION_INTERVALS.length - 1)];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

interface SnapshotQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string | null;
  question_type?: string | null;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
}

interface SnapshotResponse {
  question_id: string;
  selected_answer: string | null;
  is_marked_for_review?: boolean;
  time_spent_seconds?: number;
}

/**
 * Auto-save every wrongly answered question of a completed attempt into the
 * Error Book. Idempotent: rows already created for this attempt are skipped.
 */
export async function syncErrorBook(
  userId: string,
  attemptId: string,
  questions: SnapshotQuestion[],
  responses: SnapshotResponse[],
): Promise<number> {
  const { data: existing } = await supabase
    .from('error_book')
    .select('question_id')
    .eq('user_id', userId)
    .eq('source_attempt_id', attemptId);
  const already = new Set((existing || []).map((r: any) => r.question_id));

  const rows = questions
    .filter((q) => !already.has(q.id))
    .map((q) => {
      const resp = responses.find((r) => r.question_id === q.id);
      if (!resp?.selected_answer) return null; // only wrong answers, not skipped
      return {
        user_id: userId,
        question_id: q.id,
        source_attempt_id: attemptId,
        question_snapshot: {
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation || null,
          question_type: q.question_type || 'mcq',
          user_answer: resp.selected_answer,
        },
        subject: q.subject || null,
        chapter: q.chapter || null,
        topic: q.topic || null,
        mistake_tag: classifyMistake(resp.time_spent_seconds || 0, !!resp.is_marked_for_review),
        bookmarked: false,
        resolved: false,
      };
    })
    .filter(Boolean);

  if (!rows.length) return 0;
  const { error } = await supabase.from('error_book').insert(rows);
  if (error) throw error;
  return rows.length;
}
