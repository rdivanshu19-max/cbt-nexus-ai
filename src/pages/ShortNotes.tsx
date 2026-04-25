import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Loader2, Bookmark, BookmarkCheck, RotateCcw } from 'lucide-react';
import { ChapterAutocomplete } from '@/components/short-notes/ChapterAutocomplete';
import { NotesView, type Notes } from '@/components/short-notes/NotesView';
import { RevisionMode } from '@/components/short-notes/RevisionMode';

const SUBJECTS_BY_EXAM: Record<string, string[]> = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology'],
  Both: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
};

const ShortNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exam, setExam] = useState('JEE');
  const [classLevel, setClassLevel] = useState('11');
  const [subject, setSubject] = useState('Physics');
  const [chapter, setChapter] = useState('');
  const [style, setStyle] = useState<'concise' | 'descriptive'>('concise');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const handleGenerate = async () => {
    if (!chapter.trim()) {
      toast({ title: 'Chapter required', description: 'Pick or type a chapter name.', variant: 'destructive' });
      return;
    }
    setLoading(true); setNotes(null); setSavedId(null);
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

  const handleSave = async () => {
    if (!user || !notes) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('saved_notes')
        .insert({
          user_id: user.id,
          exam, class_level: classLevel, subject, chapter: chapter.trim(), style,
          notes: notes as any,
        })
        .select('id')
        .single();
      if (error) throw error;
      setSavedId(data.id);
      toast({ title: 'Saved', description: 'Note bookmarked. Open it anytime from "Saved Notes".' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateFinished = async (finished: number[]) => {
    if (!savedId) return;
    await supabase.from('saved_notes').update({ finished_card_indices: finished }).eq('id', savedId);
  };

  if (reviewing && notes) {
    return (
      <RevisionMode
        title={`${subject} • ${chapter}`}
        cards={notes.revision_cards || []}
        onFinishedChange={(f) => savedId && updateFinished(f)}
        onClose={() => setReviewing(false)}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">AI Short Notes</h1>
              <p className="text-sm text-muted-foreground">Pick a chapter and let AI generate exam-ready short notes, key points and revision cards.</p>
            </div>
          </div>
          <Link to="/saved-notes">
            <Button variant="outline" size="sm"><Bookmark className="h-4 w-4 mr-1" /> Saved Notes</Button>
          </Link>
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
            <ChapterAutocomplete
              subject={subject}
              exam={exam}
              classLevel={classLevel}
              value={chapter}
              onChange={setChapter}
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
          <>
            <div className="flex flex-wrap gap-2 sticky top-16 z-30 bg-background/80 backdrop-blur-md py-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:py-0 sm:relative sm:bg-transparent sm:backdrop-blur-none">
              <Button
                onClick={handleSave}
                disabled={saving || !!savedId}
                className={savedId ? 'bg-success text-success-foreground hover:bg-success/90' : 'gradient-primary text-primary-foreground'}
              >
                {savedId ? <><BookmarkCheck className="h-4 w-4 mr-1" /> Saved</> :
                  saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…</> :
                  <><Bookmark className="h-4 w-4 mr-1" /> Save & Review later</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setReviewing(true)}
                disabled={!notes.revision_cards?.length}
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Start revision mode
              </Button>
            </div>
            <NotesView
              notes={notes}
              exam={exam}
              classLevel={classLevel}
              subject={subject}
              style={style}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ShortNotes;
