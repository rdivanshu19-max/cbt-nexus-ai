import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, Upload, FileText, Ban, Trash2, CheckCircle, Loader2 } from 'lucide-react';

interface UserData {
  user_id: string;
  username: string;
  bio: string | null;
  created_at: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Test upload state
  const [testTitle, setTestTitle] = useState('');
  const [testDuration, setTestDuration] = useState('180');
  const [testExamType, setTestExamType] = useState('JEE');
  const [testFile, setTestFile] = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data) setUsers(data.map(p => ({
        user_id: p.user_id,
        username: p.username,
        bio: p.bio,
        created_at: p.created_at,
      })));
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    // Delete user data
    await supabase.from('profiles').delete().eq('user_id', userId);
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    await supabase.from('test_attempts').delete().eq('user_id', userId);
    await supabase.from('study_streaks').delete().eq('user_id', userId);
    setUsers(prev => prev.filter(u => u.user_id !== userId));
    toast({ title: 'User deleted' });
  };

  const handleUploadTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !testFile || !testTitle) return;
    setUploading(true);

    try {
      const filePath = `admin/${Date.now()}_${testFile.name}`;
      const { error: uploadErr } = await supabase.storage.from('test-pdfs').upload(filePath, testFile);
      if (uploadErr) throw uploadErr;

      let answerKeyFilePath: string | null = null;
      if (answerKeyFile) {
        answerKeyFilePath = `admin/answer-keys/${Date.now()}_${answerKeyFile.name}`;
        const { error: keyUploadError } = await supabase.storage.from('test-pdfs').upload(answerKeyFilePath, answerKeyFile);
        if (keyUploadError) throw keyUploadError;
      }

      const { error: functionError } = await supabase.functions.invoke('process-pdf-test', {
        body: {
          title: testTitle,
          duration: parseInt(testDuration, 10),
          correctMarks: 4,
          wrongMarks: -1,
          filePath,
          answerKeyFilePath,
          isAdminUpload: true,
          examType: testExamType,
        },
      });

      if (functionError) throw functionError;
      toast({ title: 'Test uploaded and processed!', description: 'It is now available to all users.' });
      setTestTitle('');
      setTestFile(null);
      setAnswerKeyFile(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users and tests</p>
          </div>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" /> Upload Test</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>All Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map(u => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">{u.username}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(u.user_id)} disabled={u.user_id === user?.id}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Upload Test PDF</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadTest} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Test Name</Label>
                    <Input value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="e.g., JEE Main 2025 Paper 1" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Duration (min)</Label>
                      <Input type="number" value={testDuration} onChange={e => setTestDuration(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Exam Type</Label>
                      <select value={testExamType} onChange={e => setTestExamType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="JEE">JEE</option>
                        <option value="NEET">NEET</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>PDF File</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/30" onClick={() => document.getElementById('admin-pdf')?.click()}>
                      {testFile ? (
                        <p className="font-medium">{testFile.name}</p>
                      ) : (
                        <><Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" /><p className="text-muted-foreground text-sm">Click to select PDF</p></>
                      )}
                      <input id="admin-pdf" type="file" accept=".pdf" className="hidden" onChange={e => setTestFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Optional Answer Key</Label>
                    <div className="border border-border rounded-xl p-4 bg-secondary/50 cursor-pointer hover:border-primary/30" onClick={() => document.getElementById('admin-answer-key')?.click()}>
                      <p className="text-sm font-medium">{answerKeyFile ? answerKeyFile.name : 'Attach answer key PDF or TXT'}</p>
                      <p className="text-xs text-muted-foreground mt-1">If provided, answers are matched from this file instead of being guessed.</p>
                      <input id="admin-answer-key" type="file" accept=".pdf,.txt" className="hidden" onChange={e => setAnswerKeyFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={uploading || !testFile || !testTitle}>
                    {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Upload & Process Test'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminPanel;
