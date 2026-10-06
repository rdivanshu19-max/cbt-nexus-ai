import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, Layers, CalendarDays, MonitorPlay, Target } from 'lucide-react';

type Row = {
  id: string; title: string; tagline: string | null; description: string | null; session_label: string | null;
  coaching_partners: { name: string; logo_url: string | null } | null;
  series_tests: { id: string }[];
};

const TestSeries = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('test_series')
      .select('id, title, tagline, description, session_label, coaching_partners(name, logo_url), series_tests(id)')
      .eq('is_published', true).order('sort_order')
      .then(({ data }) => { setRows((data as unknown as Row[]) || []); setLoading(false); });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader chip="TEST SERIES" title="Coaching test series" subtitle="Real full-syllabus papers from partner coachings, inside CBT Nexus." />
        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">No test series yet.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {rows.map((s) => (
              <div key={s.id} className="ink-card p-5 sm:p-7 flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {s.coaching_partners?.logo_url ? (
                      <img src={s.coaching_partners.logo_url} alt="" className="h-14 w-14 rounded-2xl object-cover ring-2 ring-border" />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground"><Target className="h-7 w-7" /></div>
                    )}
                    <span className="chip truncate">{s.coaching_partners?.name || 'Partner'}</span>
                  </div>
                  <span className="section-tag text-success shrink-0">● FREE</span>
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-2xl sm:text-3xl">{s.title}</h2>
                  {s.tagline && <p className="text-muted-foreground mt-1">{s.tagline}</p>}
                  {s.description && <p className="text-sm text-muted-foreground mt-3">{s.description}</p>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Layers, k: 'Tests', v: `${s.series_tests.length}` },
                    { icon: CalendarDays, k: 'Session', v: s.session_label || '—' },
                    { icon: MonitorPlay, k: 'View', v: 'Desktop CBT' },
                  ].map((m) => (
                    <div key={m.k} className="rounded-xl border-2 border-border p-2.5 sm:p-3">
                      <p className="text-[10px] font-mono-hud uppercase text-muted-foreground flex items-center gap-1"><m.icon className="h-3 w-3" />{m.k}</p>
                      <p className="font-bold text-sm sm:text-base truncate">{m.v}</p>
                    </div>
                  ))}
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> New papers unlock every Sunday</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> Full CBT interface with timer and palette</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" /> Opens inside CBT Nexus — no outside links</li>
                </ul>
                <Link to={`/test-series/${s.id}`} className="mt-auto">
                  <Button className="gradient-primary text-primary-foreground w-full sm:w-auto">Browse tests <ArrowRight className="h-4 w-4 ml-1" /></Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TestSeries;
