import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bookmark, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';

interface Row {
  id: string;
  chapter: string;
  subject: string;
  class_level: string;
  exam: string;
  created_at: string;
  finished_card_indices: number[] | null;
  notes: any;
}

export const RecentNotesWidget = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('saved_notes')
        .select('id, chapter, subject, class_level, exam, created_at, finished_card_indices, notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRows((data as any) || []);
    })();
  }, [user]);

  if (!rows) return null;

  return (
    <Card className="p-5 sm:p-6 glass-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Bookmark className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold">Recent Short Notes</h3>
        </div>
        <Link to="/saved-notes" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-6">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No saved notes yet — generate your first chapter.</p>
          <Link to="/short-notes" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Generate notes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const total = r.notes?.revision_cards?.length || 0;
            const done = r.finished_card_indices?.length || 0;
            return (
              <li key={r.id}>
                <Link
                  to="/saved-notes"
                  className="flex items-center gap-3 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-secondary/40 p-3 transition-colors"
                >
                  <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center shrink-0">
                    <RotateCcw className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{r.chapter}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.subject}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Class {r.class_level}</Badge>
                      {total > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{done}/{total} cards</Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
