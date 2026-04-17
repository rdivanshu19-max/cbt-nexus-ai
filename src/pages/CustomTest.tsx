import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Loader2, FileText, Clock3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CustomTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [correctMarks, setCorrectMarks] = useState('4');
  const [wrongMarks, setWrongMarks] = useState('-1');
  const [file, setFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [usedToday, setUsedToday] = useState<number>(0);
  const [resetText, setResetText] = useState<string>('');

  const fetchUsage = async () => {
    if (!user) return;
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const [y, m, d] = fmt.format(new Date()).split('-');
    const startIso = new Date(`${y}-${m}-${d}T00:00:00+05:30`).toISOString();
    const endIso = new Date(new Date(`${y}-${m}-${d}T00:00:00+05:30`).getTime() + 86400000).toISOString();
    const { count } = await supabase
      .from('pdf_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('converted_at', startIso)
      .lt('converted_at', endIso);
    setUsedToday(count || 0);
    setResetText(new Date(endIso).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' }));
  };

  useEffect(() => { fetchUsage(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !title) return;
    setGenerating(true);

    try {
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('test-pdfs').upload(filePath, file);
      if (uploadErr) throw uploadErr;

      let answerKeyFilePath: string | null = null;
      if (answerKeyFile) {
        answerKeyFilePath = `${user.id}/answer-keys/${Date.now()}_${answerKeyFile.name}`;
        const { error: keyUploadError } = await supabase.storage.from('test-pdfs').upload(answerKeyFilePath, answerKeyFile);
        if (keyUploadError) throw keyUploadError;
      }

      const { data, error } = await supabase.functions.invoke('process-pdf-test', {
        body: {
          title,
          duration: parseInt(duration, 10),
          correctMarks: parseFloat(correctMarks),
          wrongMarks: parseFloat(wrongMarks),
          filePath,
          answerKeyFilePath,
        },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Unable to process this PDF.');

      toast({ title: 'Test created!', description: data.message || 'Your custom test is ready.' });
      await fetchUsage();
      navigate(`/test/${data.testId}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create Custom Test</h1>
          <p className="text-muted-foreground mt-1">Upload a PDF and AI will convert it to CBT format</p>
        </div>

        <Alert>
          <Clock3 className="h-4 w-4" />
          <AlertTitle>Daily limit: 3 PDFs per day</AlertTitle>
          <AlertDescription>
            You have used <strong>{usedToday}</strong> of 3 today. Remaining: <strong>{Math.max(0, 3 - usedToday)}</strong>.
            Limit resets at <strong>12:00 AM IST</strong> (next reset {resetText || 'midnight IST'}).
          </AlertDescription>
        </Alert>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Upload Test PDF</CardTitle>
            <CardDescription>AI will extract questions and generate answer keys automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Physics Module 1 PYQ" required />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="5" required />
                </div>
                <div className="space-y-2">
                  <Label>Correct (+)</Label>
                  <Input type="number" value={correctMarks} onChange={e => setCorrectMarks(e.target.value)} step="0.5" required />
                </div>
                <div className="space-y-2">
                  <Label>Wrong (−)</Label>
                  <Input type="number" value={wrongMarks} onChange={e => setWrongMarks(e.target.value)} step="0.5" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Test PDF</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer" onClick={() => document.getElementById('pdf-upload')?.click()}>
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Click to upload PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">Max 20MB</p>
                    </>
                  )}
                  <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Optional Answer Key</Label>
                <div className="border border-border rounded-xl p-5 bg-secondary/40 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => document.getElementById('answer-key-upload')?.click()}>
                  <p className="font-medium">{answerKeyFile ? answerKeyFile.name : 'Attach answer key PDF or TXT'}</p>
                  <p className="text-xs text-muted-foreground mt-1">When attached, the extracted CBT uses this key instead of guessing answers.</p>
                  <input id="answer-key-upload" type="file" accept=".pdf,.txt" className="hidden" onChange={e => setAnswerKeyFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold" disabled={generating || !file || !title}>
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing PDF...</> : 'Create Test'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <NexusAIChat />
    </DashboardLayout>
  );
};

export default CustomTest;
