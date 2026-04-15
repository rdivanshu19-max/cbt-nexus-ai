import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, BookOpen } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  test_type: string;
  exam_type: string | null;
  subject: string | null;
  duration_minutes: number;
  total_marks: number;
  correct_marks: number;
  wrong_marks: number;
}

const Tests = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTests = async () => {
      const { data } = await supabase.from('tests').select('*').eq('is_published', true).order('created_at', { ascending: false });
      if (data) setTests(data);
      setLoading(false);
    };
    fetchTests();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Available Tests</h1>
            <p className="text-muted-foreground mt-1">Take a test and track your progress</p>
          </div>
          <div className="flex gap-2">
            <Link to="/generate-test"><Button variant="outline">AI Generate</Button></Link>
            <Link to="/custom-test"><Button className="gradient-primary text-primary-foreground">Custom Test</Button></Link>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="glass-card h-48 animate-pulse" />)}
          </div>
        ) : tests.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tests available yet</h3>
              <p className="text-muted-foreground mb-4">Generate an AI test or create a custom one!</p>
              <div className="flex gap-3 justify-center">
                <Link to="/generate-test"><Button variant="outline">AI Generate Test</Button></Link>
                <Link to="/custom-test"><Button className="gradient-primary text-primary-foreground">Create Custom</Button></Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => (
              <Card key={test.id} className="glass-card hover:border-primary/30 transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-2">
                      {test.exam_type && <Badge variant="secondary">{test.exam_type}</Badge>}
                      {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0">
                      {test.test_type === 'admin_uploaded' ? 'Official' : test.test_type === 'ai_generated' ? 'AI' : 'Custom'}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{test.title}</h3>
                  {test.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{test.description}</p>}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{test.duration_minutes} min</span>
                    <span className="flex items-center gap-1"><FileText className="h-4 w-4" />{test.total_marks} marks</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    +{test.correct_marks} / {test.wrong_marks} / 0 (Correct / Wrong / Skip)
                  </div>
                  <Link to={`/test/${test.id}`}>
                    <Button className="w-full gradient-primary text-primary-foreground">Start Test</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <NexusAIChat />
    </DashboardLayout>
  );
};

export default Tests;
