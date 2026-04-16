import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { deleteTest } from '@/lib/test-management';
import { Clock3, Loader2, Plus, Trash2 } from 'lucide-react';

type MyTest = {
  id: string;
  title: string;
  duration_minutes: number;
  created_at: string;
  total_marks: number;
};

interface MyTestsPanelProps {
  userId?: string;
}

export const MyTestsPanel = ({ userId }: MyTestsPanelProps) => {
  const { toast } = useToast();
  const [tests, setTests] = useState<MyTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchTests = async () => {
      const { data, error } = await supabase
        .from('tests')
        .select('id, title, duration_minutes, created_at, total_marks')
        .eq('created_by', userId)
        .eq('test_type', 'user_custom')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      setTests(data || []);
      setLoading(false);
    };

    fetchTests();
  }, [userId, toast]);

  const handleDelete = async (testId: string) => {
    if (!window.confirm('Delete this custom test and all related attempts?')) return;

    try {
      setDeletingId(testId);
      await deleteTest(testId);
      setTests((prev) => prev.filter((test) => test.id !== testId));
      toast({ title: 'Custom test deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle>My Tests</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Your private PDF-to-CBT uploads live here and stay visible only to you.</p>
        </div>
        <Link to="/custom-test">
          <Button className="gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> New Upload</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : tests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">No private tests yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload a PDF from your dashboard and it will appear here.</p>
          </div>
        ) : (
          tests.map((test) => (
            <div key={test.id} className="surface-elevated p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{test.title}</h3>
                  <Badge variant="outline">Private</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" /> {test.duration_minutes} min</span>
                  <span>{test.total_marks} marks</span>
                  <span>{new Date(test.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to={`/test/${test.id}`}>
                  <Button>Open Test</Button>
                </Link>
                <Button variant="destructive" onClick={() => handleDelete(test.id)} disabled={deletingId === test.id}>
                  {deletingId === test.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
