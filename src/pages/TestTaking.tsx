import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, ChevronLeft, ChevronRight, Flag, Check, AlertTriangle, LayoutGrid, Save } from 'lucide-react';
import { MathText } from '@/components/MathText';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

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
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const submittedRef = useRef(false);
  const questionStartTime = useRef(Date.now());

  const storageKey = testId && user ? `cbt-autosave-${user.id}-${testId}` : null;

  useEffect(() => {
    if (!testId || !user) return;
    const init = async () => {
      const { data: testData } = await supabase.from('tests').select('*').eq('id', testId).single();
      if (!testData) { navigate('/tests'); return; }
      setTest(testData);

      const { data: qs } = await supabase.from('test_questions').select('*').eq('test_id', testId).order('question_number');
      if (qs) setQuestions(qs);

      // Hydrate autosave
      let initialTimeLeft = testData.duration_minutes * 60;
      if (storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved.responses) {
              setResponses(new Map(Object.entries(saved.responses)) as Map<string, Response>);
            }
            if (typeof saved.currentQ === 'number') setCurrentQ(saved.currentQ);
            if (typeof saved.timeLeft === 'number' && saved.timeLeft > 0 && saved.timeLeft < initialTimeLeft) {
              initialTimeLeft = saved.timeLeft;
            }
            if (saved.attemptId) setAttemptId(saved.attemptId);
          }
        } catch {}
      }
      setTimeLeft(initialTimeLeft);

      // Reuse attempt id if stored, else create
      const stored = storageKey ? localStorage.getItem(storageKey) : null;
      const parsed = stored ? JSON.parse(stored) : null;
      if (!parsed?.attemptId) {
        const { data: attempt } = await supabase.from('test_attempts').insert({
          user_id: user.id, test_id: testId, status: 'in_progress',
        }).select().single();
        if (attempt) {
          setAttemptId(attempt.id);
          if (storageKey) localStorage.setItem(storageKey, JSON.stringify({ attemptId: attempt.id, responses: {}, currentQ: 0, timeLeft: initialTimeLeft }));
        }
      }

      setLoading(false);
    };
    init();
  }, [testId, user]);

  // Autosave to localStorage on any change
  useEffect(() => {
    if (!storageKey || loading) return;
    const obj = {
      attemptId,
      currentQ,
      timeLeft,
      responses: Object.fromEntries(responses),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(obj));
      setSavedAt(Date.now());
    } catch {}
  }, [responses, currentQ, timeLeft, attemptId, storageKey, loading]);

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

  const attemptedCount = Array.from(responses.values()).filter(r => r.selected_answer).length;
  const reviewCount = Array.from(responses.values()).filter(r => r.is_marked_for_review).length;
  const notAttempted = questions.length - attemptedCount;
  const progressPct = Math.round((attemptedCount / questions.length) * 100);
  const timeCritical = timeLeft < 300;
  const timeWarning = timeLeft < 600 && !timeCritical;

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <div className="grid-overlay fixed inset-0 pointer-events-none" />

      {/* Mission HUD header */}
      <div className="relative bg-card/80 backdrop-blur-xl border-b border-border px-3 sm:px-5 py-3 flex items-center justify-between sticky top-0 z-40 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.jpg" alt="CBT Nexus" className="h-9 w-9 rounded-lg ring-1 ring-primary/40" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary/80">Mission</span>
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse-soft" />
            </div>
            <h2 className="font-semibold text-sm truncate max-w-[40vw] sm:max-w-none">{test.title}</h2>
            <p className="text-[11px] text-muted-foreground font-mono-hud">{test.exam_type || 'CUSTOM'} • Q{currentQ + 1}/{questions.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Glowing timer */}
          <div
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border font-mono-hud font-bold tabular-nums ${
              timeCritical
                ? 'bg-destructive/10 text-destructive border-destructive/40 animate-pulse-danger'
                : timeWarning
                ? 'bg-warning/10 text-warning border-warning/40'
                : 'bg-primary/10 text-primary border-primary/30 soft-glow'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span className="text-base sm:text-lg tracking-wider">{formatTime(timeLeft)}</span>
          </div>

          <Button
            onClick={() => { if (!submitting && confirm('Submit and end the mission?')) handleSubmit(); }}
            size="sm"
            disabled={submitting}
            className="gradient-primary text-primary-foreground font-semibold"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      </div>

      {/* Progress strip */}
      <div className="relative h-1 bg-border/50">
        <div
          className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary-glow transition-all"
          style={{ width: `${progressPct}%`, boxShadow: '0 0 10px hsl(var(--primary) / 0.6)' }}
        />
      </div>

      <div className="relative flex flex-1 w-full min-w-0">
        {/* Question area */}
        <div className="flex-1 min-w-0 w-full p-4 sm:p-6 md:p-8 max-w-4xl overflow-x-hidden">
          {/* Stat HUD strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
            <div className="hud-panel px-3 py-2.5">
              <p className="text-[10px] font-mono-hud uppercase tracking-[0.18em] text-muted-foreground">Attempted</p>
              <p className="text-lg font-bold text-success font-mono-hud">{attemptedCount}</p>
            </div>
            <div className="hud-panel px-3 py-2.5">
              <p className="text-[10px] font-mono-hud uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-destructive font-mono-hud">{notAttempted}</p>
            </div>
            <div className="hud-panel px-3 py-2.5">
              <p className="text-[10px] font-mono-hud uppercase tracking-[0.18em] text-muted-foreground">Review</p>
              <p className="text-lg font-bold text-warning font-mono-hud">{reviewCount}</p>
            </div>
            <div className="hud-panel px-3 py-2.5">
              <p className="text-[10px] font-mono-hud uppercase tracking-[0.18em] text-muted-foreground">Marks</p>
              <p className="text-lg font-bold text-primary font-mono-hud">+{test.correct_marks}/{test.wrong_marks}</p>
            </div>
          </div>

          {/* Question card */}
          <div className="hud-panel p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Badge className="bg-primary/15 text-primary border border-primary/30 font-mono-hud">Q{currentQuestion.question_number}</Badge>
              {currentQuestion.subject && <Badge variant="outline" className="font-mono-hud uppercase tracking-wider text-[10px]">{currentQuestion.subject}</Badge>}
              {currentResponse?.is_marked_for_review && (
                <Badge className="bg-warning/15 text-warning border border-warning/30">
                  <Flag className="h-3 w-3 mr-1" /> Marked
                </Badge>
              )}
            </div>
            <MathText block className="text-base sm:text-lg leading-relaxed break-words">{currentQuestion.question_text}</MathText>
          </div>

          <div className="space-y-3 mb-8">
            {options.map(opt => {
              const selected = currentResponse?.selected_answer === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => selectAnswer(opt.key)}
                  className={`group w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 min-w-0 ${
                    selected
                      ? 'border-primary bg-primary/10 text-foreground glow-primary'
                      : 'border-border bg-card/60 hover:border-primary/40 hover:bg-card'
                  }`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 font-mono-hud border ${
                    selected
                      ? 'gradient-primary text-primary-foreground border-transparent'
                      : 'bg-secondary border-border group-hover:border-primary/40'
                  }`}>{opt.key}</span>
                  <MathText className="flex-1 min-w-0 break-words self-center">{opt.text}</MathText>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToQuestion(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button variant="outline" onClick={() => goToQuestion(Math.min(questions.length - 1, currentQ + 1))} disabled={currentQ === questions.length - 1}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <Button
              variant={currentResponse?.is_marked_for_review ? 'default' : 'outline'}
              onClick={toggleReview}
              className={currentResponse?.is_marked_for_review ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}
            >
              <Flag className="h-4 w-4 mr-1" /> {currentResponse?.is_marked_for_review ? 'Marked for Review' : 'Mark for Review'}
            </Button>
          </div>
        </div>

        {/* Question navigator (desktop) */}
        <div className="hidden lg:flex flex-col w-80 border-l border-border bg-card/70 backdrop-blur-xl p-4 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm font-mono-hud uppercase tracking-[0.18em] text-primary">Navigator</h3>
            <span className="text-[11px] font-mono-hud text-muted-foreground">{progressPct}%</span>
          </div>

          {/* Status legend */}
          <div className="grid grid-cols-2 gap-1.5 mb-4 text-[11px]">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success" /> Attempted</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-warning" /> Review</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-destructive/80" /> Skipped</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-secondary border border-border" /> Pending</div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {questions.map((q, i) => {
              const resp = responses.get(q.id);
              const answered = !!resp?.selected_answer;
              const reviewed = !!resp?.is_marked_for_review;
              const visited = i < currentQ || responses.has(q.id);

              let cls = 'bg-secondary text-foreground border-border';
              if (answered && reviewed) cls = 'bg-warning text-warning-foreground border-warning';
              else if (answered) cls = 'bg-success text-success-foreground border-success';
              else if (reviewed) cls = 'bg-warning/30 text-warning border-warning/50';
              else if (visited) cls = 'bg-destructive/80 text-destructive-foreground border-destructive';

              const isCurrent = i === currentQ;
              return (
                <button
                  key={q.id}
                  onClick={() => goToQuestion(i)}
                  className={`relative h-10 rounded-md text-xs font-bold font-mono-hud border transition-all ${cls} ${
                    isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105' : 'hover:scale-105'
                  }`}
                >
                  {q.question_number}
                </button>
              );
            })}
          </div>

          <div className="mt-6 hud-panel p-3 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground font-mono-hud uppercase tracking-wider">Attempted</span><span className="font-bold text-success font-mono-hud">{attemptedCount}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground font-mono-hud uppercase tracking-wider">Pending</span><span className="font-bold text-destructive font-mono-hud">{notAttempted}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground font-mono-hud uppercase tracking-wider">Review</span><span className="font-bold text-warning font-mono-hud">{reviewCount}</span></div>
          </div>

          <Button
            onClick={() => { if (!submitting && confirm('Submit and end the mission?')) handleSubmit(); }}
            disabled={submitting}
            className="mt-4 w-full gradient-primary text-primary-foreground font-semibold"
          >
            {submitting ? 'Submitting…' : 'Submit Test'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestTaking;
