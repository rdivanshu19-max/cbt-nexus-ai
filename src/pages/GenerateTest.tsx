import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { NexusAIChat } from '@/components/NexusAIChat';
import { PageHeader, WindowCard } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Brain, Check, ChevronDown, Hash, Trash2 } from 'lucide-react';
import { getTopics, chaptersWithTopics } from '@/lib/syllabus';
import { GenerationProgress } from '@/components/GenerationProgress';
import { runTestGeneration, Difficulty, Bucket } from '@/lib/generateTestRunner';

const subjects = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
};

type Scope = 'full' | 'class' | 'custom';

const DIFFICULTIES: { value: Difficulty; label: string; hint: string }[] = [
  { value: 'easy', label: 'Easy', hint: 'NCERT level, single-step' },
  { value: 'moderate', label: 'Moderate', hint: 'Standard JEE Main / NEET' },
  { value: 'hard', label: 'Hard', hint: 'Top-percentile, multi-concept' },
  { value: 'very_hard', label: 'Very Hard', hint: 'JEE Advanced killer set' },
];

/** key = `${subject}||${chapter}` */
type Selection = Record<string, { subject: string; chapter: string; topics: string[] }>;

const GenerateTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [examType, setExamType] = useState<'JEE' | 'NEET'>('JEE');
  const [scope, setScope] = useState<Scope>('custom');
  const [classLevel, setClassLevel] = useState<'11' | '12'>('11');
  const [activeSubject, setActiveSubject] = useState('Physics');
  const [selection, setSelection] = useState<Selection>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const [questionCount, setQuestionCount] = useState(30);
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [includeInteger, setIncludeInteger] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const chapterList = useMemo(() => chaptersWithTopics(activeSubject), [activeSubject]);
  const selectedEntries = Object.values(selection);
  const selectedSubjects = Array.from(new Set(selectedEntries.map((e) => e.subject)));

  const toggleChapter = (subject: string, chapter: string) => {
    const key = `${subject}||${chapter}`;
    setSelection((cur) => {
      const next = { ...cur };
      if (next[key]) delete next[key];
      else next[key] = { subject, chapter, topics: [] };
      return next;
    });
  };

  const toggleTopic = (subject: string, chapter: string, topic: string) => {
    const key = `${subject}||${chapter}`;
    setSelection((cur) => {
      const entry = cur[key] || { subject, chapter, topics: [] };
      const topics = entry.topics.includes(topic)
        ? entry.topics.filter((t) => t !== topic)
        : [...entry.topics, topic];
      return { ...cur, [key]: { ...entry, topics } };
    });
  };

  const buildBuckets = (): Bucket[] => {
    if (scope === 'full' || scope === 'class') {
      const subs = subjects[examType];
      const per = Math.floor(questionCount / subs.length);
      const extra = questionCount - per * subs.length;
      return subs.map((s, i) => ({
        subject: s,
        count: per + (i < extra ? 1 : 0),
        classLevel: scope === 'class' ? classLevel : undefined,
      })).filter((b) => b.count > 0);
    }

    // custom: distribute across selected subjects, carrying their chapters + topics
    const bySubject = selectedSubjects.map((s) => {
      const entries = selectedEntries.filter((e) => e.subject === s);
      return {
        subject: s,
        chapters: entries.map((e) => e.chapter),
        topics: entries.flatMap((e) => e.topics),
      };
    });
    if (bySubject.length === 0) return [];
    const per = Math.floor(questionCount / bySubject.length);
    const extra = questionCount - per * bySubject.length;
    return bySubject.map((b, i) => ({ ...b, count: per + (i < extra ? 1 : 0) })).filter((b) => b.count > 0);
  };

  const title = useMemo(() => {
    const diffLabel = DIFFICULTIES.find((d) => d.value === difficulty)?.label;
    if (scope === 'full') return `${examType} Full Syllabus Test • ${diffLabel}`;
    if (scope === 'class') return `${examType} Class ${classLevel} Test • ${diffLabel}`;
    if (selectedEntries.length === 1) return `${examType} ${selectedEntries[0].chapter} • ${diffLabel}`;
    return `${examType} Multi-Chapter Test (${selectedEntries.length} chapters) • ${diffLabel}`;
  }, [scope, examType, classLevel, difficulty, selectedEntries]);

  const canGenerate = !generating && questionCount >= 5 && duration >= 5 &&
    (scope !== 'custom' || selectedEntries.length > 0);

  const handleGenerate = async () => {
    if (!user) return;
    const buckets = buildBuckets();
    if (buckets.length === 0) {
      toast({ title: 'Pick at least one chapter', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setProgress(0);
    try {
      const { testId, questionCount: made, failures } = await runTestGeneration({
        examType,
        difficulty,
        includeInteger,
        duration,
        title,
        classLevel: scope === 'class' ? classLevel : undefined,
        subject: selectedSubjects.length === 1 ? selectedSubjects[0] : undefined,
        chapter: selectedEntries.length === 1 ? selectedEntries[0].chapter : undefined,
        userId: user.id,
        buckets,
        onProgress: setProgress,
      });
      toast({
        title: 'Mission ready!',
        description: failures > 0
          ? `${made} questions generated (some batches were skipped).`
          : `${made} questions generated.`,
      });
      navigate(`/test/${testId}`);
    } catch (err: any) {
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const integerPerSubject = includeInteger ? Math.round(questionCount * 0.2) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          chip="AI PAPER SETTER"
          title={<>Build a <span className="gradient-text-aurora">custom mission</span></>}
          subtitle="Mix chapters and topics from any subject, set your own length, timer and difficulty."
        />

        <WindowCard title="scope.config" bodyClassName="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={examType} onValueChange={(v: 'JEE' | 'NEET') => { setExamType(v); setSelection({}); setActiveSubject(v === 'JEE' ? 'Physics' : 'Physics'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v: Scope) => setScope(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Chapters &amp; topics (multi-select)</SelectItem>
                  <SelectItem value="class">Class-wise</SelectItem>
                  <SelectItem value="full">Full syllabus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === 'class' && (
            <div className="space-y-2 max-w-xs">
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

          {scope === 'custom' && (
            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                {subjects[examType].map((s) => {
                  const count = selectedEntries.filter((e) => e.subject === s).length;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setActiveSubject(s); setExpanded(null); }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        activeSubject === s ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {s}{count > 0 && <span className="ml-2 font-mono-hud text-primary">{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[22rem] overflow-y-auto rounded-2xl border border-border divide-y divide-border">
                {chapterList.map((c) => {
                  const key = `${activeSubject}||${c}`;
                  const entry = selection[key];
                  const topicOptions = getTopics(activeSubject, c);
                  const open = expanded === key;
                  return (
                    <div key={c} className="p-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleChapter(activeSubject, c)}
                          className="flex flex-1 items-center gap-3 text-left min-w-0"
                        >
                          <span className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${entry ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                            {entry && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span className="text-sm leading-snug truncate">{c}</span>
                        </button>
                        {topicOptions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpanded(open ? null : key)}
                            className="shrink-0 rounded-full border border-border px-3 py-1 text-[11px] font-mono-hud text-muted-foreground hover:bg-secondary flex items-center gap-1"
                          >
                            {entry?.topics.length ? `${entry.topics.length} topics` : 'topics'}
                            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>

                      {open && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {topicOptions.map((t) => {
                            const on = !!entry?.topics.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleTopic(activeSubject, c, t)}
                                className={`text-left text-xs px-3 py-2 rounded-xl border flex items-start gap-2 transition-all ${
                                  on ? 'bg-primary/10 border-primary/40' : 'border-border hover:bg-secondary'
                                }`}
                              >
                                <span className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center ${on ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                                  {on && <Check className="h-2.5 w-2.5" />}
                                </span>
                                <span className="leading-snug">{t}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selectedEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedEntries.slice(0, 6).map((e) => (
                    <Badge key={`${e.subject}||${e.chapter}`} variant="outline" className="text-[10px]">
                      {e.chapter}{e.topics.length ? ` · ${e.topics.length}t` : ''}
                    </Badge>
                  ))}
                  {selectedEntries.length > 6 && <Badge variant="outline" className="text-[10px]">+{selectedEntries.length - 6}</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
                    <Trash2 className="h-3 w-3 mr-1" /> Clear
                  </Button>
                </div>
              )}
            </div>
          )}
        </WindowCard>

        <WindowCard title="paper.settings" bodyClassName="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of questions</Label>
              <Input
                type="number" min={5} max={200} value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Math.min(200, Number(e.target.value) || 0)))}
              />
              <p className="text-[11px] text-muted-foreground">5 – 200 questions</p>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number" min={5} max={360} value={duration}
                onChange={(e) => setDuration(Math.max(1, Math.min(360, Number(e.target.value) || 0)))}
              />
              <p className="text-[11px] text-muted-foreground">Timer counts down and auto-submits</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => {
                const on = difficulty === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={`rounded-2xl border p-3 text-left transition-all ${on ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary'}`}
                  >
                    <p className="text-sm font-semibold">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{d.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Include integer-type questions</p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                20% of each subject's questions become numerical-answer questions. Answers are always non-negative
                integers — you type them on a keypad.
              </p>
            </div>
            <Switch checked={includeInteger} onCheckedChange={setIncludeInteger} />
          </div>

          <div className="rounded-2xl bg-secondary p-4 text-sm space-y-1.5 font-mono-hud">
            <p className="flex justify-between"><span className="text-muted-foreground">Questions</span><span className="font-bold">{questionCount}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Marks</span><span className="font-bold">{questionCount * 4}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-bold">{duration} min</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">Difficulty</span><span className="font-bold">{DIFFICULTIES.find((d) => d.value === difficulty)?.label}</span></p>
            {includeInteger && <p className="flex justify-between"><span className="text-muted-foreground">Integer questions</span><span className="font-bold">~{integerPerSubject}</span></p>}
            <p className="flex justify-between"><span className="text-muted-foreground">Marking</span><span className="font-bold">+4 / −1 / 0</span></p>
          </div>

          <Button onClick={handleGenerate} className="w-full gradient-primary text-primary-foreground font-semibold" disabled={!canGenerate}>
            <Brain className="h-4 w-4 mr-2" /> Generate Test
          </Button>
        </WindowCard>
      </div>

      <GenerationProgress
        open={generating}
        title="Building your mission"
        done={progress}
        total={questionCount}
        unit="questions"
        status={progress === 0 ? 'Briefing the paper setter…' : 'Writing and validating questions…'}
      />

      <NexusAIChat />
    </DashboardLayout>
  );
};

export default GenerateTest;
