import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Brain, Loader2, Check } from 'lucide-react';
import { SYLLABUS, getTopics, chaptersWithTopics } from '@/lib/syllabus';

const subjects = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
};

// Fallback chapter list for non-topic scopes
const chaptersBySubject: Record<string, string[]> = {
  Physics: chaptersWithTopics('Physics'),
  Chemistry: chaptersWithTopics('Chemistry'),
  Mathematics: chaptersWithTopics('Mathematics'),
  Biology: chaptersWithTopics('Biology'),
};

type Scope = 'full' | 'class' | 'subject' | 'chapter' | 'topic';

const GenerateTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [examType, setExamType] = useState<'JEE' | 'NEET'>('JEE');
  const [testScope, setTestScope] = useState<Scope>('full');
  const [classLevel, setClassLevel] = useState<'11' | '12'>('11');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const topicOptions = useMemo(() => (subject && chapter ? getTopics(subject, chapter) : []), [subject, chapter]);

  const toggleTopic = (t: string) =>
    setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const getTestConfig = () => {
    if (testScope === 'topic') {
      const n = Math.max(5, Math.min(30, topics.length * 5));
      return {
        questions: n,
        marks: n * 4,
        duration: Math.max(15, n * 2),
        title: `${examType} ${subject} • ${chapter} (${topics.length} topic${topics.length > 1 ? 's' : ''})`,
      };
    }
    if (examType === 'JEE') {
      if (testScope === 'full') return { questions: 75, marks: 300, duration: 180, title: 'JEE Full Test' };
      if (testScope === 'subject') return { questions: 25, marks: 100, duration: 60, title: `JEE ${subject} Test` };
      if (testScope === 'chapter') return { questions: 15, marks: 60, duration: 30, title: `JEE ${subject} - ${chapter}` };
      return { questions: 75, marks: 300, duration: 180, title: `JEE Class ${classLevel} Test` };
    }
    if (testScope === 'full') return { questions: 180, marks: 720, duration: 180, title: 'NEET Full Test' };
    if (testScope === 'subject') return { questions: subject === 'Biology' ? 90 : 45, marks: subject === 'Biology' ? 360 : 180, duration: subject === 'Biology' ? 90 : 45, title: `NEET ${subject} Test` };
    if (testScope === 'chapter') return { questions: 15, marks: 60, duration: 30, title: `NEET ${subject} - ${chapter}` };
    return { questions: 180, marks: 720, duration: 180, title: `NEET Class ${classLevel} Test` };
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const config = getTestConfig();
      const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-test`;
      const resp = await fetch(FUNC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          examType, testScope, classLevel, subject, chapter, topics, userId: user.id,
          ...config,
        }),
      });

      if (!resp.ok) throw new Error('Failed to generate test');
      const data = await resp.json();
      toast({ title: 'Test generated!', description: `${config.title} is ready.` });
      navigate(`/test/${data.testId}`);
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const config = getTestConfig();
  const canGenerate =
    !generating &&
    !((testScope === 'subject' || testScope === 'chapter' || testScope === 'topic') && !subject) &&
    !((testScope === 'chapter' || testScope === 'topic') && !chapter) &&
    !(testScope === 'topic' && topics.length === 0);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <p className="section-tag text-primary mb-2">// AI TEST</p>
          <h1 className="text-2xl sm:text-3xl font-display font-black">Generate a mission</h1>
          <p className="text-muted-foreground text-sm mt-1">Pick the scope. AI builds an exam-quality MCQ paper.</p>
        </div>

        <div className="ink-card p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={examType} onValueChange={(v: 'JEE' | 'NEET') => { setExamType(v); setSubject(''); setChapter(''); setTopics([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={testScope} onValueChange={(v: Scope) => { setTestScope(v); setSubject(''); setChapter(''); setTopics([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Syllabus</SelectItem>
                  <SelectItem value="class">Class-wise</SelectItem>
                  <SelectItem value="subject">Subject-wise</SelectItem>
                  <SelectItem value="chapter">Chapter-wise</SelectItem>
                  <SelectItem value="topic">Topic-wise (NEW)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {testScope === 'class' && (
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={(v: '11' | '12') => setClassLevel(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="11">Class 11</SelectItem>
                  <SelectItem value="12">Class 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(testScope === 'subject' || testScope === 'chapter' || testScope === 'topic') && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v); setChapter(''); setTopics([]); }}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects[examType].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(testScope === 'chapter' || testScope === 'topic') && subject && (
            <div className="space-y-2">
              <Label>Chapter</Label>
              <Select value={chapter} onValueChange={(v) => { setChapter(v); setTopics([]); }}>
                <SelectTrigger><SelectValue placeholder="Select chapter" /></SelectTrigger>
                <SelectContent>
                  {(chaptersBySubject[subject] || []).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {testScope === 'topic' && subject && chapter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label>Topics ({topics.length} selected)</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTopics(topicOptions)}>Select all</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setTopics([])}>Clear</Button>
                </div>
              </div>
              {topicOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary">No micro-topics catalogued for this chapter yet — try chapter-wise scope.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {topicOptions.map((t) => {
                    const on = topics.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTopic(t)}
                        className={`text-left text-sm px-3 py-2 rounded-lg border transition-all flex items-start gap-2 ${
                          on ? 'bg-primary/10 border-primary/40 text-foreground' : 'border-border hover:bg-secondary'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center mt-0.5 shrink-0 ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                          {on && <Check className="h-3 w-3" />}
                        </span>
                        <span className="leading-snug">{t}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl bg-secondary p-4 text-sm space-y-1.5 font-mono-hud">
            <p className="flex justify-between"><span className="text-muted-foreground">Questions</span><span className="font-bold">{config.questions}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Marks</span><span className="font-bold">{config.marks}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-bold">{config.duration} min</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Marking</span><span className="font-bold">+4 / −1 / 0</span></p>
            {topics.length > 0 && (
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Topics</p>
                <div className="flex flex-wrap gap-1">
                  {topics.slice(0, 8).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                  {topics.length > 8 && <Badge variant="outline" className="text-[10px]">+{topics.length - 8}</Badge>}
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleGenerate} className="w-full gradient-primary text-primary-foreground font-semibold" disabled={!canGenerate}>
            {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Brain className="h-4 w-4 mr-2" /> Generate Test</>}
          </Button>
        </div>
      </div>
      <NexusAIChat />
    </DashboardLayout>
  );
};

export default GenerateTest;
