import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Minus, Clock, Target, TrendingUp, Award, ArrowLeft, Download, GitCompare, ArrowUp, ArrowDown } from 'lucide-react';
import { generateReportCard } from '@/lib/reportPdf';
import { useToast } from '@/hooks/use-toast';

const Results = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [otherAttempts, setOtherAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!attemptId || !user) return;
    const fetchResults = async () => {
      const { data: att } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single();
      if (!att) { setLoading(false); return; }
      setAttempt(att);

      const { data: t } = await supabase.from('tests').select('*').eq('id', att.test_id).single();
      setTest(t);

      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('test_id', att.test_id)
        .eq('status', 'completed')
        .neq('id', attemptId)
        .order('completed_at', { ascending: false })
        .limit(5);
      setOtherAttempts(attempts || []);

      const { data: resps } = await supabase.from('test_responses').select('*').eq('attempt_id', attemptId);
      setResponses(resps || []);

      const { data: qs } = await supabase.from('test_questions').select('*').eq('test_id', att.test_id).order('question_number');
      setQuestions(qs || []);

      setLoading(false);
    };
    fetchResults();
  }, [attemptId, user]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const handleDownload = async () => {
    if (!attempt || !test) return;
    setDownloading(true);
    try {
      // Subject stats
      const bySubject: Record<string, { correct: number; wrong: number; unattempted: number; total: number }> = {};
      const byTopic: Record<string, { correct: number; wrong: number; total: number; subject?: string }> = {};
      for (const q of questions) {
        const subj = q.subject || 'General';
        bySubject[subj] = bySubject[subj] || { correct: 0, wrong: 0, unattempted: 0, total: 0 };
        bySubject[subj].total++;
        const r = responses.find((x) => x.question_id === q.id);
        if (!r?.selected_answer) bySubject[subj].unattempted++;
        else if (r.selected_answer === q.correct_answer) bySubject[subj].correct++;
        else bySubject[subj].wrong++;
        if (q.topic) {
          byTopic[q.topic] = byTopic[q.topic] || { correct: 0, wrong: 0, total: 0, subject: subj };
          byTopic[q.topic].total++;
          if (r?.selected_answer === q.correct_answer) byTopic[q.topic].correct++;
          else if (r?.selected_answer) byTopic[q.topic].wrong++;
        }
      }
      const subjectStats = Object.entries(bySubject).map(([subject, s]) => ({
        subject, correct: s.correct, wrong: s.wrong, unattempted: s.unattempted,
        accuracy: s.correct + s.wrong > 0 ? (s.correct / (s.correct + s.wrong)) * 100 : 0,
      }));
      const weakTopics = Object.entries(byTopic)
        .map(([topic, t]) => ({ topic, subject: t.subject, accuracy: (t.correct / Math.max(t.total, 1)) * 100, total: t.total }))
        .filter((t) => t.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy).slice(0, 6);
      const doc = generateReportCard({
        studentName: profile?.username || 'Student',
        testTitle: test.title,
        examType: test.exam_type,
        attemptDate: attempt.completed_at || attempt.created_at,
        totalScore: attempt.total_score, maxMarks: test.total_marks,
        accuracy: attempt.accuracy_percentage || 0,
        positive: attempt.positive_marks || 0, negative: attempt.negative_marks || 0,
        correct: attempt.correct_count || 0, wrong: attempt.wrong_count || 0, unattempted: attempt.unattempted_count || 0,
        timeTakenSec: attempt.time_taken_seconds || 0,
        subjectStats, weakTopics,
      });
      doc.save(`CBT-Nexus-Report-${test.title.replace(/[^\w]+/g, '-')}.pdf`);
      toast({ title: 'Report downloaded', description: 'Share it on Instagram/WhatsApp!' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const previousAttempt = otherAttempts[0];

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></DashboardLayout>;
  if (!attempt || !test) return <DashboardLayout><p>Results not found</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Link to="/tests" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Back to tests</Link>
            <p className="section-tag text-primary mb-1">// REPORT</p>
            <h1 className="text-2xl sm:text-3xl font-display font-black">Test Results</h1>
            <p className="text-muted-foreground text-sm">{test.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="text-base px-3 py-1.5 gradient-primary text-primary-foreground border-0">
              {attempt.total_score} / {test.total_marks}
            </Badge>
            <Button onClick={handleDownload} disabled={downloading} size="sm" className="gradient-primary text-primary-foreground">
              <Download className="h-4 w-4 mr-1" /> {downloading ? 'Generating…' : 'Report Card PDF'}
            </Button>
          </div>
        </div>

        {previousAttempt && (
          <Card className="ink-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><GitCompare className="h-4 w-4 text-primary" /> Vs your last attempt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {[
                  { k: 'Score', cur: attempt.total_score, prev: previousAttempt.total_score },
                  { k: 'Accuracy', cur: attempt.accuracy_percentage || 0, prev: previousAttempt.accuracy_percentage || 0, suffix: '%' },
                  { k: 'Correct', cur: attempt.correct_count, prev: previousAttempt.correct_count },
                  { k: 'Wrong', cur: attempt.wrong_count, prev: previousAttempt.wrong_count, lowerBetter: true },
                ].map((m) => {
                  const delta = (m.cur as number) - (m.prev as number);
                  const better = m.lowerBetter ? delta < 0 : delta > 0;
                  const same = delta === 0;
                  return (
                    <div key={m.k} className="rounded-xl bg-secondary p-3">
                      <p className="text-[10px] font-mono-hud uppercase tracking-wider text-muted-foreground">{m.k}</p>
                      <p className="text-lg font-bold font-mono-hud">{m.cur}{m.suffix || ''}</p>
                      <p className={`text-[11px] flex items-center gap-1 ${same ? 'text-muted-foreground' : better ? 'text-success' : 'text-destructive'}`}>
                        {!same && (better ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                        {same ? 'no change' : `${delta > 0 ? '+' : ''}${delta}${m.suffix || ''} vs prev`}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{otherAttempts.length} previous attempt{otherAttempts.length > 1 ? 's' : ''} • Last on {new Date(previousAttempt.completed_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        )}

        {/* Score overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Award, label: 'Total Score', value: attempt.total_score, color: 'text-primary' },
            { icon: Target, label: 'Accuracy', value: `${attempt.accuracy_percentage}%`, color: 'text-success' },
            { icon: TrendingUp, label: 'Positive', value: `+${attempt.positive_marks}`, color: 'text-success' },
            { icon: Clock, label: 'Time', value: formatTime(attempt.time_taken_seconds || 0), color: 'text-info' },
          ].map((s, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Breakdown */}
        <Card className="glass-card">
          <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-success/10">
                <p className="text-2xl font-bold text-success">{attempt.correct_count}</p>
                <p className="text-sm text-muted-foreground">Correct (+{attempt.positive_marks})</p>
              </div>
              <div className="p-4 rounded-xl bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{attempt.wrong_count}</p>
                <p className="text-sm text-muted-foreground">Wrong (−{attempt.negative_marks})</p>
              </div>
              <div className="p-4 rounded-xl bg-secondary">
                <p className="text-2xl font-bold text-muted-foreground">{attempt.unattempted_count}</p>
                <p className="text-sm text-muted-foreground">Unattempted (0)</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Accuracy</span>
                <span>{attempt.accuracy_percentage}%</span>
              </div>
              <Progress value={attempt.accuracy_percentage || 0} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Question-wise analysis */}
        <Card className="glass-card">
          <CardHeader><CardTitle>Question-wise Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {questions.map(q => {
              const resp = responses.find(r => r.question_id === q.id);
              const isCorrect = resp?.is_correct;
              const isAttempted = !!resp?.selected_answer;

              return (
                <div key={q.id} className="p-4 rounded-xl border border-border">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-success/10 text-success' : isAttempted ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                      {isCorrect ? <Check className="h-4 w-4" /> : isAttempted ? <X className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">Q{q.question_number}</span>
                        {q.subject && <Badge variant="outline" className="text-xs">{q.subject}</Badge>}
                        {resp?.time_spent_seconds && <span className="text-xs text-muted-foreground ml-auto"><Clock className="h-3 w-3 inline mr-1" />{resp.time_spent_seconds}s</span>}
                      </div>
                      <p className="text-sm mb-3">{q.question_text}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {['A', 'B', 'C', 'D'].map(opt => {
                          const optText = q[`option_${opt.toLowerCase()}` as keyof typeof q];
                          const isSelected = resp?.selected_answer === opt;
                          const isAnswer = q.correct_answer === opt;
                          let cls = 'bg-secondary';
                          if (isAnswer) cls = 'bg-success/10 border-success text-success';
                          else if (isSelected && !isCorrect) cls = 'bg-destructive/10 border-destructive text-destructive';
                          return (
                            <div key={opt} className={`px-3 py-2 rounded-lg border ${cls}`}>
                              <span className="font-semibold mr-2">{opt}.</span>{optText as string}
                              {isAnswer && <Check className="h-3 w-3 inline ml-1" />}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="mt-3 p-3 rounded-lg bg-info/5 border border-info/20 text-sm">
                          <span className="font-semibold text-info">Explanation: </span>{q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Link to="/tests"><Button className="gradient-primary text-primary-foreground">Take Another Test</Button></Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Results;
