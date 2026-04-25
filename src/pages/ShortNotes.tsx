import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MathText } from '@/components/MathText';
import { Sparkles, BookOpen, Lightbulb, RotateCcw, AlertTriangle, Loader2, FileText } from 'lucide-react';

interface Notes {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  important_points: string[];
  formulas?: { name: string; expression: string; note?: string }[];
  revision_cards: { front: string; back: string }[];
  common_mistakes: string[];
}

const SUBJECTS_BY_EXAM: Record<string, string[]> = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
  Both: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
};

const ShortNotes = () => {
  const { toast } = useToast();
  const [exam, setExam] = useState('JEE');
  const [classLevel, setClassLevel] = useState('11');
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('');
  const [style, setStyle] = useState<'concise' | 'descriptive'>('concise');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Notes | null>(null);

  const handleGenerate = async () => {
    if (!chapter.trim()) {
      toast({ title: 'Chapter required', description: 'Type the chapter name (e.g. "Rotational Motion").', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setNotes(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-short-notes', {
        body: { exam, classLevel, subject, chapter: chapter.trim(), style },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.notes) throw new Error('No notes returned');
      setNotes(data.notes);
      toast({ title: 'Notes ready', description: `Short notes for "${chapter}" generated.` });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">AI Short Notes</h1>
            <p className="text-sm text-muted-foreground">Pick a chapter and let AI generate exam-ready short notes, key points and revision cards.</p>
          </div>
        </div>

        <Card className="p-4 sm:p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={exam} onValueChange={(v) => { setExam(v); const subs = SUBJECTS_BY_EXAM[v]; if (!subs.includes(subject)) setSubject(subs[0]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JEE">JEE (Main + Adv)</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                  <SelectItem value="Both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="11">Class 11</SelectItem>
                  <SelectItem value="12">Class 12</SelectItem>
                  <SelectItem value="Dropper">Dropper / Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS_BY_EXAM[exam].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as 'concise' | 'descriptive')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise — short & focused</SelectItem>
                  <SelectItem value="descriptive">Descriptive — slightly longer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chapter</Label>
            <Input
              placeholder='e.g. "Rotational Motion", "p-Block Elements", "Human Reproduction"'
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleGenerate(); }}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !chapter.trim()}
            size="lg"
            className="w-full gradient-primary text-primary-foreground font-semibold"
          >
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating notes…</>) : (<><Sparkles className="h-4 w-4 mr-2" /> Generate Short Notes</>)}
          </Button>
        </Card>

        {loading && (
          <Card className="p-8 flex flex-col items-center text-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">Crafting your notes…</p>
            <p className="text-sm text-muted-foreground">This usually takes 10–25 seconds.</p>
          </Card>
        )}

        {notes && (
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="secondary">{subject}</Badge>
                <Badge variant="outline">Class {classLevel}</Badge>
                <Badge variant="outline">{exam}</Badge>
                <Badge className="bg-primary/10 text-primary border-0 capitalize">{style}</Badge>
              </div>
              <h2 className="text-2xl font-bold mb-2"><MathText>{notes.title}</MathText></h2>
              <MathText block className="text-muted-foreground">{notes.summary}</MathText>
            </Card>

            {notes.sections?.length > 0 && (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Concepts</h3>
                </div>
                <div className="space-y-4">
                  {notes.sections.map((s, i) => (
                    <div key={i} className="border-l-2 border-primary/40 pl-4">
                      <h4 className="font-semibold mb-1"><MathText>{s.heading}</MathText></h4>
                      <MathText block className="text-sm text-muted-foreground leading-relaxed">{s.body}</MathText>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {notes.important_points?.length > 0 && (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  <h3 className="text-lg font-semibold">Important points</h3>
                </div>
                <ul className="space-y-2">
                  {notes.important_points.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-primary font-bold">•</span>
                      <MathText className="flex-1">{p}</MathText>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {notes.formulas && notes.formulas.length > 0 && (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Key formulas</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {notes.formulas.map((f, i) => (
                    <div key={i} className="rounded-lg bg-secondary p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{f.name}</p>
                      <MathText block className="font-mono text-base">{f.expression}</MathText>
                      {f.note && <MathText block className="text-xs text-muted-foreground mt-2">{f.note}</MathText>}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {notes.revision_cards?.length > 0 && (
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Revision cards</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {notes.revision_cards.map((c, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4">
                      <p className="text-xs uppercase tracking-wider text-primary mb-1">Q</p>
                      <MathText block className="font-medium mb-3">{c.front}</MathText>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">A</p>
                      <MathText block className="text-sm text-muted-foreground">{c.back}</MathText>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {notes.common_mistakes?.length > 0 && (
              <Card className="p-5 sm:p-6 border-destructive/30">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="text-lg font-semibold">Common mistakes</h3>
                </div>
                <ul className="space-y-2">
                  {notes.common_mistakes.map((m, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="text-destructive font-bold">!</span>
                      <MathText className="flex-1">{m}</MathText>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShortNotes;
