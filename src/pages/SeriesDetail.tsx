import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, BookOpen, Lock, Monitor, PlayCircle, Sparkles, Mail } from 'lucide-react';
import { EARLY_ACCESS_EMAIL, SeriesTest, isTestUnlocked, lockLabel, redeemCode } from '@/lib/testSeries';

const SeriesDetail = () => {
  const { seriesId } = useParams();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [series, setSeries] = useState<{ title: string; tagline: string | null } | null>(null);
  const [tests, setTests] = useState<SeriesTest[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!seriesId) return;
    supabase.from('test_series').select('title, tagline').eq('id', seriesId).single().then(({ data }) => setSeries(data));
    supabase.from('series_tests').select('*').eq('series_id', seriesId).order('sort_order').then(({ data }) => setTests((data as SeriesTest[]) || []));
    if (user) supabase.from('series_unlocks').select('series_id').eq('series_id', seriesId).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setUnlocked(!!data));
  }, [seriesId, user]);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const ids = await redeemCode(code.trim());
      if (seriesId && ids.includes(seriesId)) setUnlocked(true);
      toast({ title: 'Unlocked!', description: 'All tests in this series are now open for your account.' });
      setCode('');
    } catch (e: any) {
      toast({ title: 'Code not accepted', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <Link to="/test-series" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All test series</Link>

        <div className="text-center space-y-3">
          <span className="chip"><Sparkles className="h-3 w-3" /> {tests.length} TESTS · FREE</span>
          <h1 className="font-display font-extrabold text-3xl sm:text-5xl">{series?.title || '…'}</h1>
          <p className="text-muted-foreground">Review the syllabus, then start the test inside the CBT Nexus viewer.</p>
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-accent/30 px-4 py-2 text-sm font-semibold">
            <Monitor className="h-4 w-4 text-primary" /> Use desktop site view (or a laptop) for the best test experience
          </div>
          <div className="flex gap-2 max-w-md mx-auto pt-1">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Have an early-access code?" className="rounded-full" />
            <Button onClick={handleRedeem} disabled={busy || unlocked} className="gradient-primary text-primary-foreground">{unlocked ? 'Unlocked' : busy ? '…' : 'Unlock'}</Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Mail className="h-3 w-3" /> Want early access to every test? Email <a className="text-primary font-semibold" href={`mailto:${EARLY_ACCESS_EMAIL}`}>{EARLY_ACCESS_EMAIL}</a>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {tests.map((t, i) => {
            const open = isTestUnlocked(t, unlocked, isAdmin);
            return (
              <div key={t.id} className={`ink-card p-5 space-y-4 ${open ? '' : 'opacity-80'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-xl gradient-primary text-primary-foreground font-display font-extrabold flex items-center justify-center">{String(i + 1).padStart(2, '0')}</div>
                    <div className="min-w-0">
                      <p className="section-tag text-primary">{t.label || 'TEST'}</p>
                      <h3 className="font-display font-bold text-lg truncate">{t.title}</h3>
                    </div>
                  </div>
                  <span className={`section-tag shrink-0 ${open ? 'text-success' : 'text-muted-foreground'}`}>{open ? 'OPEN' : 'LOCKED'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Time', t.duration_minutes ? `${t.duration_minutes} min` : '—'], ['Qs', t.question_count ?? '—'], ['Marks', t.total_marks ?? '—']].map(([k, v]) => (
                    <div key={k as string} className="rounded-xl border-2 border-border px-3 py-2">
                      <p className="text-[10px] font-mono-hud uppercase text-muted-foreground">{k}</p>
                      <p className="font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                {t.syllabus && (
                  <div>
                    <p className="text-[11px] font-mono-hud uppercase text-muted-foreground flex items-center gap-1 mb-1"><BookOpen className="h-3 w-3" /> Syllabus</p>
                    <p className="text-sm rounded-xl border-2 border-dashed border-border p-3">{t.syllabus}</p>
                  </div>
                )}
                {open ? (
                  <Button onClick={() => navigate(`/test-series/play/${t.id}`)} className="w-full gradient-primary text-primary-foreground">
                    <PlayCircle className="h-4 w-4 mr-1" /> Start test <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button disabled variant="outline" className="w-full"><Lock className="h-4 w-4 mr-1" /> {lockLabel(t)}</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SeriesDetail;
