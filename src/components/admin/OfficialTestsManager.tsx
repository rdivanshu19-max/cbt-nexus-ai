import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { deleteTest } from '@/lib/test-management';
import { Clock3, FileText, Loader2, Pencil, Trash2, Upload } from 'lucide-react';

type OfficialTest = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  exam_type: string | null;
  duration_minutes: number;
  total_marks: number;
  created_at: string;
  is_published: boolean | null;
};

type ProcessPdfResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  testId?: string;
  questionCount?: number;
  diagnostics?: Record<string, unknown>;
};

const emptyEditState = {
  id: '',
  title: '',
  subject: '',
  examType: 'JEE',
  duration: '180',
  description: '',
  isPublished: true,
};

export const OfficialTestsManager = () => {
  const { toast } = useToast();
  const [tests, setTests] = useState<OfficialTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lastDiagnostics, setLastDiagnostics] = useState<Record<string, unknown> | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState(emptyEditState);
  const [testTitle, setTestTitle] = useState('');
  const [testDuration, setTestDuration] = useState('180');
  const [testExamType, setTestExamType] = useState('JEE');
  const [testSubject, setTestSubject] = useState('');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);

  const fetchOfficialTests = async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('id, title, description, subject, exam_type, duration_minutes, total_marks, created_at, is_published')
      .eq('test_type', 'admin_uploaded')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setTests(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOfficialTests();
  }, []);

  const resetUploadForm = () => {
    setTestTitle('');
    setTestDuration('180');
    setTestExamType('JEE');
    setTestSubject('');
    setTestFile(null);
    setAnswerKeyFile(null);
  };

  const handleUploadTest = async (event: FormEvent) => {
    event.preventDefault();
    if (!testFile || !testTitle) return;

    setUploading(true);

    try {
      const timestamp = Date.now();
      const filePath = `admin/${timestamp}_${testFile.name}`;
      const { error: uploadError } = await supabase.storage.from('test-pdfs').upload(filePath, testFile);
      if (uploadError) throw uploadError;

      let answerKeyFilePath: string | null = null;
      if (answerKeyFile) {
        answerKeyFilePath = `admin/answer-keys/${timestamp}_${answerKeyFile.name}`;
        const { error: answerKeyError } = await supabase.storage.from('test-pdfs').upload(answerKeyFilePath, answerKeyFile);
        if (answerKeyError) throw answerKeyError;
      }

      const { data, error } = await supabase.functions.invoke('process-pdf-test', {
        body: {
          title: testTitle,
          duration: parseInt(testDuration, 10),
          correctMarks: 4,
          wrongMarks: -1,
          filePath,
          answerKeyFilePath,
          isAdminUpload: true,
          examType: testExamType,
          subject: testSubject || null,
        },
      });

      if (error) throw error;

      const response = data as ProcessPdfResponse | null;
      if (!response?.ok) {
        throw new Error(response?.error || 'Unable to process this PDF.');
      }

      setLastDiagnostics(response.diagnostics || null);
      toast({
        title: 'Official test ready',
        description: response.message || 'The uploaded paper is now available to all users.',
      });
      resetUploadForm();
      await fetchOfficialTests();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const openEditDialog = (test: OfficialTest) => {
    setEditState({
      id: test.id,
      title: test.title,
      subject: test.subject || '',
      examType: test.exam_type || 'JEE',
      duration: String(test.duration_minutes),
      description: test.description || '',
      isPublished: !!test.is_published,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editState.id || !editState.title.trim()) return;
    setSavingEdit(true);

    const duration = parseInt(editState.duration, 10);
    if (Number.isNaN(duration) || duration < 5) {
      toast({ title: 'Invalid duration', description: 'Please enter a valid test time.', variant: 'destructive' });
      setSavingEdit(false);
      return;
    }

    const { error } = await supabase
      .from('tests')
      .update({
        title: editState.title.trim(),
        subject: editState.subject.trim() || null,
        exam_type: editState.examType || null,
        duration_minutes: duration,
        description: editState.description.trim() || null,
        is_published: editState.isPublished,
      })
      .eq('id', editState.id);

    setSavingEdit(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setEditOpen(false);
    toast({ title: 'Official test updated' });
    await fetchOfficialTests();
  };

  const togglePublished = async (test: OfficialTest) => {
    setTogglingId(test.id);
    const { error } = await supabase
      .from('tests')
      .update({ is_published: !test.is_published })
      .eq('id', test.id);
    setTogglingId(null);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: !test.is_published ? 'Test published' : 'Test unpublished' });
    await fetchOfficialTests();
  };

  const handleDelete = async (testId: string) => {
    if (!window.confirm('Delete this official test and all related attempts?')) return;

    try {
      setDeletingId(testId);
      await deleteTest(testId);
      setTests((prev) => prev.filter((test) => test.id !== testId));
      toast({ title: 'Official test deleted' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Upload Official Test PDF</CardTitle>
          <CardDescription>Upload a paper, keep the wording intact, and publish it to the Official Tests section.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUploadTest} className="space-y-4">
            <div className="space-y-2">
              <Label>Test Name</Label>
              <Input value={testTitle} onChange={(event) => setTestTitle(event.target.value)} placeholder="e.g., JEE Main 2025 Paper 1" required />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" min="5" value={testDuration} onChange={(event) => setTestDuration(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={testExamType} onValueChange={setTestExamType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={testSubject} onChange={(event) => setTestSubject(event.target.value)} placeholder="e.g., Physics" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>PDF File</Label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 transition-colors" onClick={() => document.getElementById('admin-pdf')?.click()}>
                {testFile ? (
                  <div className="space-y-1">
                    <p className="font-medium">{testFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(testFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">Click to select PDF</p>
                  </>
                )}
                <input id="admin-pdf" type="file" accept=".pdf" className="hidden" onChange={(event) => setTestFile(event.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Optional Answer Key</Label>
              <div className="border border-border rounded-xl p-4 bg-secondary/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => document.getElementById('admin-answer-key')?.click()}>
                <p className="text-sm font-medium">{answerKeyFile ? answerKeyFile.name : 'Attach answer key PDF or TXT'}</p>
                <p className="text-xs text-muted-foreground mt-1">If you attach it, extraction uses the provided answers instead of guessing.</p>
                <input id="admin-answer-key" type="file" accept=".pdf,.txt" className="hidden" onChange={(event) => setAnswerKeyFile(event.target.files?.[0] || null)} />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={uploading || !testFile || !testTitle.trim()}>
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing PDF...</> : 'Upload & Process Test'}
            </Button>

            {lastDiagnostics && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm space-y-1">
                <p className="font-semibold">Last upload diagnostics</p>
                <p>Model: {String(lastDiagnostics.usedModel || 'unknown')}</p>
                <p>Scanned PDF: {lastDiagnostics.scannedPdf ? 'Yes (used OCR)' : 'No'}</p>
                <p>Extracted text length: {Number(lastDiagnostics.extractedTextLength || 0)}</p>
                <p>Pages: {Number(lastDiagnostics.pageCount || 0)}</p>
                <p>Questions with diagrams: {Number(lastDiagnostics.diagramQuestions || 0)}</p>
                <p>Answer key matches applied: {Number(lastDiagnostics.answerKeyApplied || 0)}</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Official Tests ({tests.length})</CardTitle>
          <CardDescription>Edit name and time, or delete an uploaded official paper.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : tests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <p className="font-medium">No official tests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Your processed admin uploads will appear here.</p>
            </div>
          ) : (
            tests.map((test) => (
              <div key={test.id} className="surface-elevated p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{test.title}</h3>
                    {test.exam_type && <Badge variant="secondary">{test.exam_type}</Badge>}
                    {test.subject && <Badge variant="outline">{test.subject}</Badge>}
                    <Badge variant={test.is_published ? 'default' : 'outline'}>
                      {test.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock3 className="h-4 w-4" /> {test.duration_minutes} min</span>
                    <span>{test.total_marks} marks</span>
                    <span>{new Date(test.created_at).toLocaleString()}</span>
                  </div>
                  {test.description && <p className="text-sm text-muted-foreground">{test.description}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => togglePublished(test)} disabled={togglingId === test.id}>
                    {togglingId === test.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {test.is_published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button variant="outline" onClick={() => openEditDialog(test)}>
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </Button>
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit official test</DialogTitle>
            <DialogDescription>Update the uploaded test name, time, and metadata.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Test Name</Label>
              <Input value={editState.title} onChange={(event) => setEditState((prev) => ({ ...prev, title: event.target.value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" min="5" value={editState.duration} onChange={(event) => setEditState((prev) => ({ ...prev, duration: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Exam Type</Label>
                <Select value={editState.examType} onValueChange={(value) => setEditState((prev) => ({ ...prev, examType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="NEET">NEET</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={editState.subject} onChange={(event) => setEditState((prev) => ({ ...prev, subject: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editState.description} onChange={(event) => setEditState((prev) => ({ ...prev, description: event.target.value }))} placeholder="Optional note for this official paper" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="font-medium">Published</p>
                <p className="text-xs text-muted-foreground">Unpublish to hide this test from all students.</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={editState.isPublished}
                onChange={(event) => setEditState((prev) => ({ ...prev, isPublished: event.target.checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
