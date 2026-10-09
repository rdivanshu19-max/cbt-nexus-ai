import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lock, PlayCircle, Timer } from 'lucide-react';
import { SeriesTest, isTestUnlocked } from '@/lib/testSeries';
import { countdownText, daysUntil } from '@/lib/sundays';

type S = { id: string; title: string; series_tests: SeriesTest[] };

/** Coaching series strip on the Tests page with live Sunday-unlock countdowns. */
export const SeriesCountdown = () => {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<S[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [, tick] = useState(0);

  useEffect(() => {
    supabase.from('test_series').select('id, title, series_tests(*)').eq('is_published', true).order('sort_order')
      .then(({ data }) => setRows(((data as unknown as S[]) || []).map((s) => ({ ...s, series_tests: [...s.series_tests].sort((a, b) => a.sort_order - b.sort_order) }))));
    if (user) supabase.from('series_unlocks').select('series_id').eq('user_id', user.id)
      .then(({ data }) => setUnlocked(new Set((data || []).map((d) => d.series_id))));
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [user]);

  if (!rows.length) return null;

  return (
    <section className="space-y-4">
      {rows.map((s) => (
        <div key={s.id} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-bold">{s.title}</h2>
              <p className="text-sm text-muted-foreground">Official coaching papers — a new one unlocks every Sunday.</p>
            </div>
            <Link to={`/test-series/${s.id}`}><Button variant="outline" size="sm">View all <ArrowRight className="h-4 w-4 ml-1" /></Button></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {s.series_tests.map((t) => {
              const open = isTestUnlocked(t, unlocked.has(s.id), isAdmin);
              const days = t.unlock_at ? daysUntil(t.unlock_at) : null;
              return (
                <div key={t.id} className="ink-card p-4 min-w-[200px] shrink-0 space-y-2">
                  <p className="font-display font-bold truncate">{t.title}</p>
                  {open ? (
                    <Link to={`/test-series/play/${t.id}`}>
                      <Button size="sm" className="w-full gradient-primary text-primary-foreground"><PlayCircle className="h-4 w-4 mr-1" /> Start</Button>
                    </Link>
                  ) : t.lock_mode === 'date' && t.unlock_at ? (
                    <>
                      <p className="font-mono-hud text-3xl font-bold text-primary leading-none">{days}<span className="text-sm ml-1 text-muted-foreground">days</span></p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> {countdownText(t.unlock_at)}</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Early-access code only</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
};
