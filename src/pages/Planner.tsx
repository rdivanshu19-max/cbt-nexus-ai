import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader, WindowCard } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Trash2, Plus } from 'lucide-react';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const days = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return iso(d); });

const Planner = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(iso(new Date()));
  const [track, setTrack] = useState('jee_main');
  const [asBacklog, setAsBacklog] = useState(false);
  const [backlog, setBacklog] = useState<any[]>([]);
  const today = iso(new Date());

  const load = async () => {
    if (!user) return;
    // Automatic backlog: unfinished past tasks roll forward to today.
    await supabase.from('planner_tasks').update({ task_date: today, source: 'backlog' })
      .eq('user_id', user.id).eq('status', 'pending').lt('task_date', today);
    const { data } = await supabase.from('planner_tasks').select('*').eq('user_id', user.id)
      .gte('task_date', today).lte('task_date', days()[6]).order('created_at');
    setTasks(data || []);
    const { data: bl } = await supabase.from('planner_tasks').select('*').eq('user_id', user.id).eq('source', 'backlog').eq('status', 'pending').order('task_date');
    setBacklog(bl || []);
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!user || !title.trim()) return;
    await supabase.from('planner_tasks').insert({ user_id: user.id, title: title.trim(), subject: subject || null, task_date: date, source: asBacklog ? 'backlog' : 'manual', status: 'pending', exam_track: track });
    setTitle(''); load();
  };
  const toggle = async (t: any) => { await supabase.from('planner_tasks').update({ status: t.status === 'done' ? 'pending' : 'done' }).eq('id', t.id); load(); };
  const remove = async (id: string) => { await supabase.from('planner_tasks').delete().eq('id', id); load(); };

  const done = tasks.filter((t) => t.status === 'done').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <PageHeader chip="STUDY PLANNER" title={<>Your next <span className="gradient-text-aurora">7 days</span></>} subtitle={`${done}/${tasks.length} tasks done · unfinished tasks roll into today automatically`} />
        <WindowCard>
          <div className="grid gap-2 sm:grid-cols-[1fr_140px_150px_150px_auto] p-4">
            <Input placeholder="Task, e.g. Rotational motion PYQs" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Input type="date" value={date} min={today} max={days()[6]} onChange={(e) => setDate(e.target.value)} />
            <select className="h-10 rounded-md border bg-background px-2 text-sm" value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="jee_main">JEE Main</option><option value="jee_advanced">JEE Advanced</option><option value="neet">NEET</option>
            </select>
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
          <label className="flex items-center gap-2 px-4 pb-4 text-sm"><input type="checkbox" checked={asBacklog} onChange={(e) => setAsBacklog(e.target.checked)} /> Mark as backlog (keeps reminding you until done)</label>
        </WindowCard>
        {backlog.length > 0 && (
          <WindowCard>
            <div className="p-4 space-y-2">
              <p className="font-display font-bold">Remaining backlog · {backlog.length}</p>
              {backlog.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => toggle(t)} aria-label="Mark done" className="h-5 w-5 shrink-0 rounded border-2 border-border" />
                  <span className="flex-1 break-words">{t.title}{t.subject ? ` · ${t.subject}` : ''}</span>
                  <Badge variant="outline" className="text-[10px]">since {t.created_at.slice(0, 10)}</Badge>
                </div>
              ))}
            </div>
          </WindowCard>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {days().map((d) => {
            const list = tasks.filter((t) => t.task_date === d);
            return (
              <WindowCard key={d}>
                <div className="p-4 space-y-2">
                  <p className="font-display font-bold">{d === today ? 'Today' : new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  {list.length === 0 && <p className="text-xs text-muted-foreground">No tasks</p>}
                  {list.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 text-sm">
                      <button onClick={() => toggle(t)} aria-label="Toggle done" className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center ${t.status === 'done' ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>{t.status === 'done' && <Check className="h-3 w-3" />}</button>
                      <span className={`flex-1 break-words ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                      {t.source === 'backlog' && <Badge variant="outline" className="text-[10px]">backlog</Badge>}
                      <button onClick={() => remove(t.id)} aria-label="Delete task"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              </WindowCard>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Planner;
