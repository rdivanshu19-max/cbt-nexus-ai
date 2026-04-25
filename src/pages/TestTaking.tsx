import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, ChevronLeft, ChevronRight, Flag, Check, AlertTriangle } from 'lucide-react';
import { MathText } from '@/components/MathText';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  subject?: string | null;
}

interface Response {
  question_id: string;
  selected_answer: string | null;
  is_marked_for_review: boolean;
  time_spent_seconds: number;
}

const TestTaking = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Map<string, Response>>(new Map());
  const [currentQ, setCurrentQ] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const questionStartTime = useRef(Date.now());

  useEffect(() => {
    if (!testId || !user) return;
    const init = async () => {
      const { data: testData } = await supabase.from('tests').select('*').eq('id', testId).single();
      if (!testData) { navigate('/tests'); return; }
      setTest(testData);
      setTimeLeft(testData.duration_minutes * 60);

      const { data: qs } = await supabase.from('test_questions').select('*').eq('test_id', testId).order('question_number');
      if (qs) setQuestions(qs);

      const { data: attempt } = await supabase.from('test_attempts').insert({
        user_id: user.id, test_id: testId, status: 'in_progress',
      }).select().single();
      if (attempt) setAttemptId(attempt.id);

      setLoading(false);
    };
    init();
  }, [testId, user]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 && !loading && attemptId) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading]);

  const trackTime = useCallback(() => {
    if (!questions[currentQ]) return;
    const qId = questions[currentQ].id;
    const elapsed = Math.floor((Date.now() - questionStartTime.current) / 1000);
    setResponses(prev => {
      const updated = new Map(prev);
      const existing = updated.get(qId) || { question_id: qId, selected_answer: null, is_marked_for_review: false, time_spent_seconds: 0 };
      updated.set(qId, { ...existing, time_spent_seconds: existing.time_spent_seconds + elapsed });
      return updated;
    });
    questionStartTime.current = Date.now();
  }, [currentQ, questions]);

  const selectAnswer = (answer: string) => {
    const qId = questions[currentQ].id;
    setResponses(prev => {
      const updated = new Map(prev);
      const existing = updated.get(qId) || { question_id: qId, selected_answer: null, is_marked_for_review: false, time_spent_seconds: 0 };
      updated.set(qId, { ...existing, selected_answer: existing.selected_answer === answer ? null : answer });
      return updated;
    });
  };

  const toggleReview = () => {
    const qId = questions[currentQ].id;
    setResponses(prev => {
      const updated = new Map(prev);
      const existing = updated.get(qId) || { question_id: qId, selected_answer: null, is_marked_for_review: false, time_spent_seconds: 0 };
      updated.set(qId, { ...existing, is_marked_for_review: !existing.is_marked_for_review });
      return updated;
    });
  };

  const goToQuestion = (idx: number) => {
    trackTime();
    setCurrentQ(idx);
  };

  const handleSubmit = async () => {
    if (!attemptId || !user || !test) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    try {
      trackTime();

      const allResponses = Array.from(responses.values());

      for (const resp of allResponses) {
        await supabase.from('test_responses').insert({
          attempt_id: attemptId,
          question_id: resp.question_id,
          selected_answer: resp.selected_answer,
          is_marked_for_review: resp.is_marked_for_review,
          time_spent_seconds: resp.time_spent_seconds,
        });
      }

      const { data: fullQuestions } = await supabase.from('test_questions').select('*').eq('test_id', testId);
      if (!fullQuestions) {
        toast({ title: 'Error', description: 'Could not load questions for scoring.', variant: 'destructive' });
        submittedRef.current = false;
        setSubmitting(false);
        return;
      }

      let correct = 0, wrong = 0, unattempted = 0, markedReview = 0;
      fullQuestions.forEach(q => {
        const resp = responses.get(q.id);
        if (!resp || !resp.selected_answer) { unattempted++; return; }
        if (resp.is_marked_for_review) markedReview++;
        if (resp.selected_answer === q.correct_answer) correct++;
        else wrong++;
      });

      const positiveMarks = correct * test.correct_marks;
      const negativeMarks = wrong * Math.abs(test.wrong_marks);
      const totalScore = positiveMarks - negativeMarks;
      const accuracy = correct + wrong > 0 ? (correct / (correct + wrong)) * 100 : 0;
      const timeTaken = test.duration_minutes * 60 - timeLeft;

      for (const q of fullQuestions) {
        const resp = responses.get(q.id);
        if (resp?.selected_answer) {
          await supabase.from('test_responses')
            .update({ is_correct: resp.selected_answer === q.correct_answer })
            .eq('attempt_id', attemptId)
            .eq('question_id', q.id);
        }
      }

      await supabase.from('test_attempts').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_score: totalScore,
        positive_marks: positiveMarks,
        negative_marks: negativeMarks,
        correct_count: correct,
        wrong_count: wrong,
        unattempted_count: unattempted,
        marked_for_review_count: markedReview,
        accuracy_percentage: Math.round(accuracy * 10) / 10,
        time_taken_seconds: timeTaken,
      }).eq('id', attemptId);

      const today = new Date().toISOString().split('T')[0];
      const { data: streak } = await supabase.from('study_streaks').select('*').eq('user_id', user.id).single();
      if (streak) {
        const lastDate = streak.last_activity_date;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let newStreak = 1;
        if (lastDate === yesterday) newStreak = (streak.current_streak || 0) + 1;
        else if (lastDate === today) newStreak = streak.current_streak || 1;
        await supabase.from('study_streaks').update({
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak || 0),
          last_activity_date: today,
        }).eq('user_id', user.id);
      }

      navigate(`/results/${attemptId}`);
    } catch (err: any) {
      console.error('Submit failed:', err);
      toast({ title: 'Submission failed', description: err?.message || 'Please try submitting again.', variant: 'destructive' });
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!test || questions.length === 0) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">No questions found</div>;

  const currentQuestion = questions[currentQ];
  const currentResponse = responses.get(currentQuestion.id);
  const options = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="CBT Nexus" className="h-8 w-8 rounded-lg" />
          <div>
            <h2 className="font-semibold text-sm">{test.title}</h2>
            <p className="text-xs text-muted-foreground">{test.exam_type || 'Custom'} • {questions.length} Questions</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-secondary'}`}>
            <Clock className="h-4 w-4" />
            <span className="font-mono font-semibold text-sm">{formatTime(timeLeft)}</span>
          </div>
          <Button
            onClick={() => { if (!submitting && confirm('Are you sure you want to submit?')) handleSubmit(); }}
            size="sm"
            disabled={submitting}
            className="gradient-primary text-primary-foreground"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 w-full min-w-0">
        {/* Question area */}
        <div className="flex-1 min-w-0 w-full p-4 sm:p-6 md:p-8 max-w-4xl overflow-x-hidden">
          <div className="grid gap-3 md:grid-cols-2 mb-6">
            <div className="surface-elevated p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Marking scheme</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-success/10 px-3 py-3 text-center">
                  <p className="text-lg font-bold text-success">+{test.correct_marks}</p>
                  <p className="text-muted-foreground">Correct</p>
                </div>
                <div className="rounded-xl bg-destructive/10 px-3 py-3 text-center">
                  <p className="text-lg font-bold text-destructive">{test.wrong_marks}</p>
                  <p className="text-muted-foreground">Wrong</p>
                </div>
                <div className="rounded-xl bg-secondary px-3 py-3 text-center">
                  <p className="text-lg font-bold">0</p>
                  <p className="text-muted-foreground">Skipped</p>
                </div>
              </div>
            </div>
            <div className="surface-elevated p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Question status</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-success" /> Attempted = green</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-destructive" /> Not attempted = red</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-warning" /> Marked for review = orange</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">Q{currentQuestion.question_number}</Badge>
              {currentQuestion.subject && <Badge variant="outline">{currentQuestion.subject}</Badge>}
              {currentResponse?.is_marked_for_review && <Badge className="bg-warning/10 text-warning border-0"><Flag className="h-3 w-3 mr-1" />Review</Badge>}
            </div>
            <MathText block className="text-lg leading-relaxed">{currentQuestion.question_text}</MathText>
          </div>

          <div className="space-y-3 mb-8">
            {options.map(opt => (
              <button
                key={opt.key}
                onClick={() => selectAnswer(opt.key)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                  currentResponse?.selected_answer === opt.key
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                  currentResponse?.selected_answer === opt.key ? 'gradient-primary text-primary-foreground' : 'bg-secondary'
                }`}>{opt.key}</span>
                <MathText className="flex-1">{opt.text}</MathText>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToQuestion(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" onClick={() => goToQuestion(Math.min(questions.length - 1, currentQ + 1))} disabled={currentQ === questions.length - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Button variant={currentResponse?.is_marked_for_review ? 'default' : 'outline'} onClick={toggleReview} className={currentResponse?.is_marked_for_review ? 'bg-warning text-warning-foreground' : ''}>
              <Flag className="h-4 w-4 mr-1" /> {currentResponse?.is_marked_for_review ? 'Marked' : 'Mark for Review'}
            </Button>
          </div>
        </div>

        {/* Question panel (desktop) */}
        <div className="hidden lg:block w-72 border-l border-border bg-card p-4 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
          <h3 className="font-semibold text-sm mb-3">Question Panel</h3>
          <div className="flex gap-1 mb-4">
            <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-sm bg-success" /> Attempted</div>
            <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-sm bg-destructive" /> Not Attempted</div>
            <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded-sm bg-warning" /> Review</div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, i) => {
              const resp = responses.get(q.id);
              let bg = 'bg-secondary';
              if (resp?.is_marked_for_review) bg = 'bg-warning text-warning-foreground';
              else if (resp?.selected_answer) bg = 'bg-success text-success-foreground';
              else if (i < currentQ || responses.has(q.id)) bg = 'bg-destructive text-destructive-foreground';
              return (
                <button key={q.id} onClick={() => goToQuestion(i)} className={`w-10 h-10 rounded-lg text-xs font-semibold ${bg} ${i === currentQ ? 'ring-2 ring-primary' : ''}`}>
                  {q.question_number}
                </button>
              );
            })}
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Attempted</span><span className="font-semibold">{Array.from(responses.values()).filter(r => r.selected_answer).length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Not Attempted</span><span className="font-semibold">{questions.length - Array.from(responses.values()).filter(r => r.selected_answer).length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Marked Review</span><span className="font-semibold">{Array.from(responses.values()).filter(r => r.is_marked_for_review).length}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestTaking;
