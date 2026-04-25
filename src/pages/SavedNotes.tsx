import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bookmark, Trash2, Sparkles, RotateCcw, Eye, Loader2 } from 'lucide-react';
import { NotesView, type Notes } from '@/components/short-notes/NotesView';
import { RevisionMode } from '@/components/short-notes/RevisionMode';

interface SavedNoteRow {
  id: string;
  exam: string;
  class_level: string;
  subject: string;
  chapter: string;
  style: string;
  notes: Notes;
  finished_card_indices: number[] | null;
  created_at: string;
}

const SavedNotes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SavedNoteRow[] | null>(null);
  const [active, setActive] = useState<SavedNoteRow | null>(null);
  const [reviewing, setReviewing] = useState<SavedNoteRow | null>(null);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('saved_notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load', description: error.message, variant: 'destructive' });
      setRows([]);
      return;
    }
    setRows((data || []) as unknown as SavedNoteRow[]);
  };

  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from('saved_notes').delete().eq('id', id);
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Deleted', description: 'Saved note removed.' });
    setActive((a) => (a?.id === id ? null : a));
    load();
  };

  const updateFinished = async (id: string, finished: number[]) => {
    await supabase.from('saved_notes').update({ finished_card_indices: finished }).eq('id', id);
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, finished_card_indices: finished } : r)) || rs);
  };

  if (reviewing) {
    return (
      <RevisionMode
        title={`${reviewing.subject} • ${reviewing.chapter}`}
        cards={reviewing.notes.revision_cards || []}
        initialFinished={reviewing.finished_card_indices || []}
        onFinishedChange={(f) => updateFinished(reviewing.id, f)}
        onClose={() => setReviewing(null)}
      />
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Bookmark className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Saved Short Notes</h1>
              <p className="text-sm text-muted-foreground">Bookmarked AI notes you can revisit anytime.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/short-notes')} className="gradient-primary text-primary-foreground">
            <Sparkles className="h-4 w-4 mr-1" /> Generate new
          </Button>
        </div>

        {rows === null && (
          <Card className="p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </Card>
        )}

        {rows && rows.length === 0 && (
          <Card className="p-10 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No saved notes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Generate notes and tap "Save" to bookmark them here.</p>
            <Button onClick={() => navigate('/short-notes')} className="gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4 mr-1" /> Open AI Short Notes
            </Button>
          </Card>
        )}

        {rows && rows.length > 0 && !active && (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((r) => {
              const total = r.notes.revision_cards?.length || 0;
              const done = r.finished_card_indices?.length || 0;
              return (
                <Card key={r.id} className="p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        <Badge variant="secondary" className="text-[10px]">{r.subject}</Badge>
                        <Badge variant="outline" className="text-[10px]">Class {r.class_level}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.exam}</Badge>
                      </div>
                      <h3 className="font-semibold truncate">{r.chapter}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(r.created_at).toLocaleDateString()} • {total} cards
                        {total > 0 && ` • ${done}/${total} reviewed`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <Button variant="outline" size="sm" onClick={() => setActive(r)}>
                      <Eye className="h-4 w-4 mr-1" /> Open
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setReviewing(r)}
                      disabled={total === 0}
                      className="gradient-primary text-primary-foreground"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" /> Revise
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setActive(null)}>← Back to list</Button>
              <Button size="sm" onClick={() => setReviewing(active)} className="gradient-primary text-primary-foreground">
                <RotateCcw className="h-4 w-4 mr-1" /> Start revision mode
              </Button>
              <Button size="sm" variant="outline" onClick={() => remove(active.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
            <NotesView
              notes={active.notes}
              exam={active.exam}
              classLevel={active.class_level}
              subject={active.subject}
              style={active.style}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedNotes;
