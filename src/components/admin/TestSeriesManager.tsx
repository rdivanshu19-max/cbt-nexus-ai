import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Building2, Layers, FileUp } from 'lucide-react';
import { nextSundayIST } from '@/lib/sundays';

type Coaching = { id: string; name: string; logo_url: string | null; description: string | null; website_url: string | null };
type Series = { id: string; coaching_id: string | null; title: string; tagline: string | null; description: string | null; session_label: string | null; is_published: boolean };
type Test = { id: string; series_id: string; title: string; lock_mode: string; unlock_at: string | null; sort_order: number };

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export const TestSeriesManager = () => {
  const { toast } = useToast();
  const [coachings, setCoachings] = useState<Coaching[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [busy, setBusy] = useState(false);

  const [c, setC] = useState({ name: '', description: '', website_url: '' });
  const [logo, setLogo] = useState<File | null>(null);
  const [s, setS] = useState({ coaching_id: '', title: '', tagline: '', description: '', session_label: '', code: '' });
  const [t, setT] = useState({ series_id: '', title: '', syllabus: '', duration: '180', qs: '75', marks: '300', lock_mode: 'date', unlock_at: '', url: '' });
  const [paper, setPaper] = useState<File | null>(null);

  const load = async () => {
    const [a, b, d] = await Promise.all([
      supabase.from('coaching_partners').select('*').order('sort_order'),
      supabase.from('test_series').select('*').order('sort_order'),
      supabase.from('series_tests').select('id, series_id, title, lock_mode, unlock_at, sort_order').order('sort_order'),
    ]);
    setCoachings((a.data as Coaching[]) || []);
    setSeries((b.data as Series[]) || []);
    setTests((d.data as Test[]) || []);
  };
  useEffect(() => { load(); }, []);

  // Auto-set the unlock date to the Sunday after the series' latest scheduled test.
  const suggestSunday = (seriesId: string) => {
    const dated = tests.filter((x) => x.series_id === seriesId && x.unlock_at).map((x) => new Date(x.unlock_at!).getTime());
    const base = dated.length ? new Date(Math.max(...dated, Date.now())) : new Date();
    return toLocalInput(nextSundayIST(base));
  };

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast({ title: ok }); await load(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const addCoaching = () => run(async () => {
    if (!c.name.trim()) throw new Error('Coaching name is required');
    let logo_url: string | null = null;
    if (logo) {
      const path = `coaching-logos/${Date.now()}-${logo.name.replace(/[^\w.]/g, '_')}`;
      const { error } = await supabase.storage.from('question-images').upload(path, logo);
      if (error) throw error;
      logo_url = supabase.storage.from('question-images').getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from('coaching_partners').insert({ name: c.name.trim(), description: c.description || null, website_url: c.website_url || null, logo_url, sort_order: coachings.length });
    if (error) throw error;
    setC({ name: '', description: '', website_url: '' }); setLogo(null);
  }, 'Coaching added');

  const addSeries = () => run(async () => {
    if (!s.title.trim() || !s.coaching_id) throw new Error('Pick a coaching and enter a title');
    const { data, error } = await supabase.from('test_series').insert({
      coaching_id: s.coaching_id, title: s.title.trim(), tagline: s.tagline || null, description: s.description || null,
      session_label: s.session_label || null, sort_order: series.length,
    }).select('id').single();
    if (error) throw error;
    if (s.code.trim()) {
      const { error: ce } = await supabase.from('series_promo_codes').insert({ series_id: data.id, code: s.code.trim().toUpperCase() });
      if (ce) throw ce;
    }
    setS({ coaching_id: '', title: '', tagline: '', description: '', session_label: '', code: '' });
  }, 'Test series added');

  const addTest = () => run(async () => {
    if (!t.series_id || !t.title.trim()) throw new Error('Pick a series and enter a test title');
    if (!paper && !t.url.trim()) throw new Error('Upload an HTML paper or paste a test link');
    let storage_path: string | null = null;
    if (paper) {
      storage_path = `${t.series_id}/${Date.now()}-${paper.name.replace(/[^\w.]/g, '_')}`;
      const { error } = await supabase.storage.from('series-tests').upload(storage_path, paper, { contentType: 'text/html' });
      if (error) throw error;
    }
    const unlock = t.lock_mode === 'date' ? new Date(t.unlock_at || suggestSunday(t.series_id)).toISOString() : null;
    const { data, error } = await supabase.from('series_tests').insert({
      series_id: t.series_id, title: t.title.trim(), label: 'FULL TEST', syllabus: t.syllabus || null,
      duration_minutes: Number(t.duration) || null, question_count: Number(t.qs) || null, total_marks: Number(t.marks) || null,
      lock_mode: t.lock_mode, unlock_at: unlock, sort_order: tests.filter((x) => x.series_id === t.series_id).length + 1,
    }).select('id').single();
    if (error) throw error;
    const { error: se } = await supabase.from('series_test_sources').insert({ test_id: data.id, storage_path, external_url: storage_path ? null : t.url.trim() });
    if (se) throw se;
    setT({ ...t, title: '', syllabus: '', url: '', unlock_at: '' }); setPaper(null);
  }, 'Test added');

  const del = (table: 'coaching_partners' | 'test_series' | 'series_tests', id: string) =>
    confirm('Delete this? Anything inside it is removed too.') && run(async () => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    }, 'Deleted');

  const select = 'w-full h-10 rounded-md border-2 border-border bg-background px-3 text-sm';

  return (
    <div className="grid xl:grid-cols-3 gap-5">
      <section className="ink-card p-5 space-y-3">
        <h3 className="font-display font-bold text-lg flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Coachings</h3>
        <Input placeholder="Coaching name *" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
        <div><Label className="text-xs">Logo (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></div>
        <Textarea placeholder="Description (optional)" rows={2} value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} />
        <Input placeholder="Website / test series link (optional)" value={c.website_url} onChange={(e) => setC({ ...c, website_url: e.target.value })} />
        <Button disabled={busy} onClick={addCoaching} className="w-full gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add coaching</Button>
        <ul className="space-y-2 pt-2">
          {coachings.map((x) => (
            <li key={x.id} className="flex items-center gap-2 text-sm border-2 border-border rounded-xl p-2">
              {x.logo_url ? <img src={x.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <div className="h-8 w-8 rounded-lg bg-secondary" />}
              <span className="flex-1 truncate font-semibold">{x.name}</span>
              <Button size="icon" variant="ghost" onClick={() => del('coaching_partners', x.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ink-card p-5 space-y-3">
        <h3 className="font-display font-bold text-lg flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Test series</h3>
        <select className={select} value={s.coaching_id} onChange={(e) => setS({ ...s, coaching_id: e.target.value })}>
          <option value="">Choose coaching *</option>
          {coachings.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <Input placeholder="Series title * (e.g. Mathango QFTs)" value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} />
        <Input placeholder="One-line tagline" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} />
        <Textarea placeholder="Description" rows={2} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Session (2027)" value={s.session_label} onChange={(e) => setS({ ...s, session_label: e.target.value })} />
          <Input placeholder="Early-access code" value={s.code} onChange={(e) => setS({ ...s, code: e.target.value })} />
        </div>
        <Button disabled={busy} onClick={addSeries} className="w-full gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add series</Button>
        <ul className="space-y-2 pt-2">
          {series.map((x) => (
            <li key={x.id} className="flex items-center gap-2 text-sm border-2 border-border rounded-xl p-2">
              <span className="flex-1 truncate font-semibold">{x.title}</span>
              <span className="text-xs text-muted-foreground">{tests.filter((y) => y.series_id === x.id).length} tests</span>
              <Button size="icon" variant="ghost" onClick={() => del('test_series', x.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ink-card p-5 space-y-3">
        <h3 className="font-display font-bold text-lg flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" /> Tests</h3>
        <select className={select} value={t.series_id} onChange={(e) => setT({ ...t, series_id: e.target.value, unlock_at: e.target.value ? suggestSunday(e.target.value) : '' })}>
          <option value="">Choose series *</option>
          {series.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </select>
        <Input placeholder="Test title * (e.g. QFT 7 · Full Syllabus)" value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} />
        <Input placeholder="Syllabus" value={t.syllabus} onChange={(e) => setT({ ...t, syllabus: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Min" value={t.duration} onChange={(e) => setT({ ...t, duration: e.target.value })} />
          <Input placeholder="Qs" value={t.qs} onChange={(e) => setT({ ...t, qs: e.target.value })} />
          <Input placeholder="Marks" value={t.marks} onChange={(e) => setT({ ...t, marks: e.target.value })} />
        </div>
        <select className={select} value={t.lock_mode} onChange={(e) => setT({ ...t, lock_mode: e.target.value })}>
          <option value="open">Open now</option>
          <option value="date">Unlock on a date</option>
          <option value="promo">Early-access code only</option>
        </select>
        {t.lock_mode === 'date' && (
          <div>
            <Label className="text-xs">Unlocks at (auto-set to next Sunday)</Label>
            <Input type="datetime-local" value={t.unlock_at} onChange={(e) => setT({ ...t, unlock_at: e.target.value })} />
          </div>
        )}
        <div><Label className="text-xs">HTML paper</Label><Input type="file" accept=".html,.htm,text/html" onChange={(e) => setPaper(e.target.files?.[0] || null)} /></div>
        <Input placeholder="…or paste a test link" value={t.url} onChange={(e) => setT({ ...t, url: e.target.value })} />
        <Button disabled={busy} onClick={addTest} className="w-full gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add test</Button>
        <ul className="space-y-1.5 pt-2 max-h-72 overflow-y-auto">
          {tests.filter((x) => !t.series_id || x.series_id === t.series_id).map((x) => (
            <li key={x.id} className="flex items-center gap-2 text-xs border-2 border-border rounded-xl p-2">
              <span className="flex-1 truncate font-semibold">{x.title}</span>
              <span className="text-muted-foreground">{x.lock_mode === 'date' && x.unlock_at ? new Date(x.unlock_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : x.lock_mode}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del('series_tests', x.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
