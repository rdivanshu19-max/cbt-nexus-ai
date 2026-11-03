import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Question as BaseQuestion, Response } from '@/pages/TestTaking';
type Question = BaseQuestion & { correct_answer: string; explanation?: string | null };
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MathText } from '@/components/MathText';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';

interface TukkabaziProps {
  userId: string;
  attemptId: string;
  testId: string;
  questions: Question[];
  responses: Map<string, Response>;
}

/**
 * Tukkabazi — reattempt the questions you skipped, right after submission.
 * Verified answers + solutions, original attempt scores untouched.
 */
export const Tukkabazi = ({ userId, attemptId, testId, questions, responses }: TukkabaziProps) => {
  const skipped = useMemo(() => questions.filter((q) => !responses.get(q.id)?.selected_answer), [questions, responses]);
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [log, setLog] = useState<{ id: string; picked: string; correct: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  if (!skipped.length) return null;

  const finish = async (finalLog: typeof log) => {
    setSaving(true);
    const correct = finalLog.filter((l) => l.correct).length;
    await supabase.from('tukkabazi_sessions').insert({
      user_id: userId,
      attempt_id: attemptId,
      test_id: testId,
      question_ids: finalLog.map((l) => l.id),
      responses: finalLog,
      total: skipped.length,
      correct,
      wrong: finalLog.length - correct,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  if (!active) {
    return (
      <Card className="ink-card border-warning/40">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">Tukkabazi — you skipped {skipped.length} question{skipped.length > 1 ? 's' : ''}</p>
            <p className="text-sm text-muted-foreground">Re-attempt them now with verified answers & solutions. Your original score stays untouched.</p>
          </div>
          <Button
            onClick={() => { setActive(true); setIdx(0); setPicked(null); setLog([]); }}
            className="bg-warning text-warning-foreground hover:bg-warning/90 shrink-0"
          >
            Start Tukkabazi <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const q = skipped[idx];
  const answered = !!picked;
  const isCorrect = picked?.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();

  const pick = (key: string) => {
    if (answered) return;
    const correct = key.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();
    const next = [...log, { id: q.id, picked: key, correct }];
    setLog(next);
    setPicked(key);
    if (idx === skipped.length - 1) finish(next);
  };

  const options = [
    { key: 'A', text: q.option_a },
    { key: 'B', text: q.option_b },
    { key: 'C', text: q.option_c },
    { key: 'D', text: q.option_d },
  ];

  return (
    <Card className="ink-card border-warning/40">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge className="bg-warning/15 text-warning border border-warning/30 font-mono-hud">TUKKABAZI {idx + 1}/{skipped.length}</Badge>
            <span className="text-xs text-muted-foreground">Recovered so far: {log.filter((l) => l.correct).length}/{log.length || 0}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setActive(false); finish(log); }} disabled={saving}>Stop</Button>
        </div>

        <div className="p-4 rounded-xl border border-border bg-secondary/40">
          <MathText block className="text-sm sm:text-base">{q.question_text}</MathText>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {options.map((o) => {
            const isAnswer = q.correct_answer === o.key;
            const isPicked = picked === o.key;
            let cls = 'border-border bg-card hover:border-primary/40';
            if (answered && isAnswer) cls = 'border-success bg-success/10 text-success';
            else if (answered && isPicked && !isCorrect) cls = 'border-destructive bg-destructive/10 text-destructive';
            return (
              <button key={o.key} onClick={() => pick(o.key)} className={`text-left p-3 rounded-xl border text-sm flex items-start gap-2 ${cls}`}>
                <span className="font-bold font-mono-hud">{o.key}.</span>
                <MathText className="flex-1">{o.text}</MathText>
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`p-3 rounded-xl text-sm ${isCorrect ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'} flex items-center gap-2`}>
            {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {isCorrect ? 'Recovered! ' : `Correct answer: ${q.correct_answer}. `}
            {q.explanation && <span className="text-muted-foreground">{q.explanation}</span>}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" size="sm" disabled={idx === 0} onClick={() => { setIdx(idx - 1); setPicked(null); }}>Previous</Button>
          {idx < skipped.length - 1 ? (
            <Button size="sm" disabled={!answered} onClick={() => { setIdx(idx + 1); setPicked(null); }}>Next question</Button>
          ) : (
            <Button size="sm" disabled={!answered || saving} onClick={() => { finish(log); setActive(false); }}>
              {saving ? 'Saving…' : 'Finish Tukkabazi'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
