import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, History as HistoryIcon } from 'lucide-react';

type AttemptRow = {
  id: string;
  test_id: string;
  status: string;
  total_score: number | null;
  accuracy_percentage: number | null;
  created_at: string;
  completed_at: string | null;
};

type TestRow = {
  id: string;
  title: string;
  exam_type: string | null;
};

const TestHistory = () => {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [tests, setTests] = useState<Record<string, TestRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      const { data: attemptData } = await supabase
        .from('test_attempts')
        .select('id, test_id, status, total_score, accuracy_percentage, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const safeAttempts = attemptData || [];
      setAttempts(safeAttempts);

      const testIds = [...new Set(safeAttempts.map((attempt) => attempt.test_id))];
      if (testIds.length > 0) {
        const { data: testData } = await supabase.from('tests').select('id, title, exam_type').in('id', testIds);
        const mappedTests = (testData || []).reduce<Record<string, TestRow>>((acc, test) => {
          acc[test.id] = test;
          return acc;
        }, {});
        setTests(mappedTests);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const completedCount = useMemo(() => attempts.filter((attempt) => attempt.status === 'completed').length, [attempts]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Test History</h1>
            <p className="text-muted-foreground mt-1">Review every attempt with score, date, and direct access to results.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="surface-elevated px-4 py-3">
              <p className="text-muted-foreground">Total attempts</p>
              <p className="text-xl font-semibold">{attempts.length}</p>
            </div>
            <div className="surface-elevated px-4 py-3">
              <p className="text-muted-foreground">Completed</p>
              <p className="text-xl font-semibold">{completedCount}</p>
            </div>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HistoryIcon className="h-5 w-5 text-primary" /> Past Attempts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((row) => <div key={row} className="h-24 rounded-xl bg-secondary animate-pulse" />)}
              </div>
            ) : attempts.length === 0 ? (
              <div className="py-14 text-center">
                <FileText className="h-10 w-10 text-primary mx-auto mb-3" />
                <h2 className="text-xl font-semibold">No attempts yet</h2>
                <p className="text-muted-foreground mt-2 mb-4">Take your first test and your history will appear here.</p>
                <Link to="/tests"><Button className="gradient-primary text-primary-foreground">Browse Tests</Button></Link>
              </div>
            ) : (
              attempts.map((attempt) => {
                const relatedTest = tests[attempt.test_id];
                const attemptDate = new Date(attempt.completed_at || attempt.created_at);

                return (
                  <div key={attempt.id} className="surface-elevated p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h2 className="text-lg font-semibold">{relatedTest?.title || 'Test'}</h2>
                        {relatedTest?.exam_type && <Badge variant="secondary">{relatedTest.exam_type}</Badge>}
                        <Badge variant={attempt.status === 'completed' ? 'default' : 'outline'}>{attempt.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {attemptDate.toLocaleString()}</span>
                        {attempt.status === 'completed' && <span>Accuracy: {attempt.accuracy_percentage ?? 0}%</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-primary/10 px-4 py-3 text-center min-w-[110px]">
                        <p className="text-xs text-muted-foreground">Score</p>
                        <p className="text-xl font-bold text-primary">{attempt.total_score ?? '—'}</p>
                      </div>
                      {attempt.status === 'completed' ? (
                        <Link to={`/results/${attempt.id}`}><Button>View Results</Button></Link>
                      ) : (
                        <Link to={`/test/${attempt.test_id}`}><Button variant="outline">Resume</Button></Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TestHistory;