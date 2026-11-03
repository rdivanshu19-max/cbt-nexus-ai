import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader, WindowCard } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathText } from '@/components/MathText';
import { useToast } from '@/hooks/use-toast';
import { AddErrorForm } from '@/components/AddErrorForm';
import { MISTAKE_LABELS, REVISION_INTERVALS, nextRevisionDate } from '@/lib/errorBook';
import { Bookmark, BookmarkCheck, CheckCircle2, Circle, Mic, Square, Play, Trash2, RotateCcw, Zap, CalendarClock } from 'lucide-react';

interface ErrorRow {
  id: string;
  question_id: string | null;
  question_snapshot: any;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  mistake_tag: string;
  note: string | null;
  voice_note_url: string | null;
  bookmarked: boolean;
  resolved: boolean;
  reattempt_count: number;
  last_reattempt_correct: boolean | null;
  revision_count: number;
  next_revision_at: string | null;
}

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];

const ErrorBook = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('all');
  const [tag, setTag] = useState('all');
  const [view, setView] = useState('open'); // open | due | bookmarked | resolved
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('error_book')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);
      setRows((data as ErrorRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const today = new Date().toISOString().split('T')[0];
  const filtered = useMemo(() => rows.filter((r) => {
    if (subject !== 'all' && r.subject !== subject) return false;
    if (tag !== 'all' && r.mistake_tag !== tag) return false;
    if (view === 'open' && r.resolved) return false;
    if (view === 'resolved' && !r.resolved) return false;
    if (view === 'bookmarked' && !r.bookmarked) return false;
    if (view === 'due' && (!r.next_revision_at || r.next_revision_at > today || r.resolved)) return false;
    return true;
  }), [rows, subject, tag, view, today]);

  const boosterChapters = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.filter((r) => !r.resolved && r.chapter).forEach((r) => { counts[r.chapter!] = (counts[r.chapter!] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [rows]);

  const update = async (id: string, patch: Partial<ErrorRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from('error_book').update(patch).eq('id', id);
    if (error) toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
  };

  const revise = (row: ErrorRow) => {
    const box = Math.min(row.revision_count, REVISION_INTERVALS.length - 1);
    update(row.id, { revision_count: row.revision_count + 1, next_revision_at: nextRevisionDate(box) });
  };

  const reattempt = (row: ErrorRow, correct: boolean) => {
    update(row.id, {
      reattempt_count: row.reattempt_count + 1,
      last_reattempt_correct: correct,
      resolved: correct ? true : row.resolved,
      next_revision_at: correct ? null : nextRevisionDate(0),
    });
    if (correct) toast({ title: 'Recovered', description: 'Marked as resolved. Nice.' });
  };

  const remove = async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await supabase.from('error_book').delete().eq('id', id);
  };

  const saveNote = async (row: ErrorRow) => {
    const note = noteDrafts[row.id];
    if (note === undefined) return;
    await update(row.id, { note });
    toast({ title: 'Note saved' });
  };

  const toggleRecording = async (row: ErrorRow) => {
    if (recordingId === row.id) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingId(null);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const path = `voice/${user!.id}/${row.id}-${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage.from('question-images').upload(path, blob, { contentType: 'audio/webm' });
        if (upErr) { toast({ title: 'Voice note failed', description: upErr.message, variant: 'destructive' }); return; }
        const { data: pub } = supabase.storage.from('question-images').getPublicUrl(path);
        await update(row.id, { voice_note_url: pub.publicUrl });
        toast({ title: 'Voice note saved' });
      };
      rec.start();
      recorderRef.current = rec;
      setRecordingId(row.id);
    } catch {
      toast({ title: 'Microphone unavailable', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader
          chip="MY ERROR BOOK"
          title={<>Never repeat a <span className="gradient-text-aurora">mistake</span></>}
          subtitle={`${rows.filter((r) => !r.resolved).length} open errors • wrong answers are auto-saved after every test`}
        />
        {user && <AddErrorForm userId={user.id} onAdded={(r) => setRows((p) => [r as ErrorRow, ...p])} />}

        {boosterChapters.length > 0 && (
          <Card className="ink-card border-primary/30">
            <CardContent className="p-4 flex flex-wrap items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold mr-2">Boosters — fix your weakest chapters:</span>
              {boosterChapters.map(([ch, n]) => (
                <Link key={ch} to={`/practice?chapter=${encodeURIComponent(ch)}`}>
                  <Badge variant="outline" className="cursor-pointer hover:border-primary">{ch} · {n} errors</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="rounded-full">
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="due">Due today</TabsTrigger>
              <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-[150px] rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-[160px] rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All mistakes</SelectItem>
              {Object.entries(MISTAKE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <WindowCard title="Nothing here"><p className="text-sm text-muted-foreground p-2">No errors match this view. Attempt a test — every wrong answer lands here automatically.</p></WindowCard>
        ) : (
          <div className="space-y-4">
            {filtered.map((row) => {
              const snap = row.question_snapshot || {};
              const options = [snap.option_a, snap.option_b, snap.option_c, snap.option_d];
              const keys = ['A', 'B', 'C', 'D'];
              return (
                <WindowCard key={row.id} title={`Q · ${row.subject || 'General'}${row.chapter ? ` · ${row.chapter}` : ''}`} right={
                  <div className="flex items-center gap-1.5">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => update(row.id, { bookmarked: !row.bookmarked })}>
                      {row.bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => update(row.id, { resolved: !row.resolved })}>
                      {row.resolved ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                }>
                  <div className="space-y-3 p-1">
                    {snap.manual && (
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline">{snap.source_type}</Badge>
                          {snap.source_name && <Badge variant="outline">{snap.source_name}</Badge>}
                          {snap.question_ref && <Badge variant="outline">{snap.question_ref}</Badge>}
                        </div>
                        {snap.photo && <img src={snap.photo} alt="Question" className="max-h-72 rounded border" />}
                        {snap.correct_answer && <p className="text-xs">Correct answer: <b>{snap.correct_answer}</b></p>}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-destructive/10 text-destructive border border-destructive/30">{MISTAKE_LABELS[row.mistake_tag] || row.mistake_tag}</Badge>
                      {row.next_revision_at && (
                        <Badge variant="outline" className="font-mono-hud text-[10px]"><CalendarClock className="h-3 w-3 mr-1" />Revise by {row.next_revision_at}</Badge>
                      )}
                      {row.reattempt_count > 0 && (
                        <Badge variant="outline" className="font-mono-hud text-[10px]">Reattempt {row.reattempt_count} · {row.last_reattempt_correct ? 'correct' : 'wrong'}</Badge>
                      )}
                      {row.revision_count > 0 && <Badge variant="outline" className="font-mono-hud text-[10px]">Revised {row.revision_count}×</Badge>}
                    </div>

                    <MathText block className="text-sm">{snap.question_text}</MathText>

                    {!revealed[row.id] ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRevealed((p) => ({ ...p, [row.id]: true }))}>Reveal answer</Button>
                        <Button size="sm" variant="outline" onClick={() => reattempt(row, true)}><CheckCircle2 className="h-4 w-4 mr-1" />I got it now</Button>
                        <Button size="sm" variant="outline" onClick={() => reattempt(row, false)}>Still wrong</Button>
                        <Button size="sm" variant="ghost" onClick={() => revise(row)}><RotateCcw className="h-4 w-4 mr-1" />Revise later</Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          {keys.map((k, i) => (
                            <div key={k} className={`px-3 py-2 rounded-lg border ${snap.correct_answer === k ? 'border-success bg-success/10 text-success' : snap.user_answer === k ? 'border-destructive bg-destructive/10 text-destructive' : 'border-border'}`}>
                              <span className="font-semibold mr-2">{k}.</span>{options[i]}
                              {snap.user_answer === k && <span className="ml-2 text-[10px] uppercase font-mono-hud">your pick</span>}
                            </div>
                          ))}
                        </div>
                        {snap.explanation && <p className="text-sm p-3 rounded-lg bg-info/5 border border-info/20"><span className="font-semibold text-info">Solution: </span>{snap.explanation}</p>}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Personal note — why did you get this wrong?"
                        value={noteDrafts[row.id] ?? row.note ?? ''}
                        onChange={(e) => setNoteDrafts((p) => ({ ...p, [row.id]: e.target.value }))}
                        className="rounded-full"
                      />
                      <Button size="sm" variant="secondary" className="rounded-full shrink-0" onClick={() => saveNote(row)}>Save note</Button>
                      <Button
                        size="sm"
                        variant={recordingId === row.id ? 'destructive' : 'outline'}
                        className="rounded-full shrink-0"
                        onClick={() => toggleRecording(row)}
                      >
                        {recordingId === row.id ? <><Square className="h-4 w-4 mr-1" />Stop</> : <><Mic className="h-4 w-4 mr-1" />Voice note</>}
                      </Button>
                      {row.voice_note_url && (
                        <audio controls src={row.voice_note_url} className="h-9 max-w-[220px]" />
                      )}
                    </div>
                  </div>
                </WindowCard>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ErrorBook;
