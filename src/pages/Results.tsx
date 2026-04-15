import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, X, Minus, Clock, Target, TrendingUp, Award, ArrowLeft } from 'lucide-react';

const Results = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId || !user) return;
    const fetchResults = async () => {
      const { data: att } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single();
      if (!att) return;
      setAttempt(att);

      const { data: t } = await supabase.from('tests').select('*').eq('id', att.test_id).single();
      setTest(t);

      const { data: resps } = await supabase.from('test_responses').select('*').eq('attempt_id', attemptId);
      setResponses(resps || []);

      const { data: qs } = await supabase.from('test_questions').select('*').eq('test_id', att.test_id).order('question_number');
      setQuestions(qs || []);

      setLoading(false);
    };
    fetchResults();
  }, [attemptId, user]);

  if (loading) return <DashboardLayout><div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></DashboardLayout>;
  if (!attempt || !test) return <DashboardLayout><p>Results not found</p></DashboardLayout>;

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/tests" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Back to tests</Link>
            <h1 className="text-3xl font-bold">Test Results</h1>
            <p className="text-muted-foreground">{test.title}</p>
          </div>
          <Badge className="text-lg px-4 py-2 gradient-primary text-primary-foreground border-0">
            {attempt.total_score} / {test.total_marks}
          </Badge>
        </div>

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
