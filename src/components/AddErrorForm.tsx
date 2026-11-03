import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MISTAKE_LABELS } from '@/lib/errorBook';
import { Camera, Plus } from 'lucide-react';

export const SOURCE_TYPES = ['Module', 'Reference Book', 'DPP', 'Test', 'PYQ', 'NCERT', 'Other'];

/** Shrink a photo to a small JPEG so it can be saved with the error itself. */
const compress = (file: File) => new Promise<string>((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = img.width * scale; c.height = img.height * scale;
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    resolve(c.toDataURL('image/jpeg', 0.7));
  };
  img.onerror = reject;
  img.src = URL.createObjectURL(file);
});

const sel = 'h-10 rounded-md border bg-background px-2 text-sm w-full';

export const AddErrorForm = ({ userId, onAdded }: { userId: string; onAdded: (row: any) => void }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ subject: 'Physics', chapter: '', source_type: 'Module', source_name: '', question_ref: '', question_text: '', correct: '', mistake_tag: 'concept_gap', note: '' });
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!photo && !f.question_text.trim() && !f.question_ref.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('error_book').insert({
      user_id: userId, subject: f.subject, chapter: f.chapter || null, mistake_tag: f.mistake_tag, note: f.note || null,
      question_snapshot: { manual: true, source_type: f.source_type, source_name: f.source_name, question_ref: f.question_ref, question_text: f.question_text, correct_answer: f.correct, photo },
    }).select().single();
    setSaving(false);
    if (error || !data) return;
    onAdded(data);
    setF((p) => ({ ...p, chapter: '', source_name: '', question_ref: '', question_text: '', correct: '', note: '' }));
    setPhoto(null); setOpen(false);
  };

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Add my own error</Button>;

  return (
    <div className="ink-card p-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <select className={sel} value={f.subject} onChange={(e) => set('subject', e.target.value)}>
          {['Physics', 'Chemistry', 'Mathematics', 'Biology'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <Input placeholder="Chapter" value={f.chapter} onChange={(e) => set('chapter', e.target.value)} />
        <select className={sel} value={f.source_type} onChange={(e) => set('source_type', e.target.value)}>
          {SOURCE_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Input placeholder="Book / module name (e.g. HC Verma)" value={f.source_name} onChange={(e) => set('source_name', e.target.value)} />
        <Input placeholder="Question no. / page (e.g. Ex 3, Q12)" value={f.question_ref} onChange={(e) => set('question_ref', e.target.value)} />
        <select className={sel} value={f.mistake_tag} onChange={(e) => set('mistake_tag', e.target.value)}>
          {Object.entries(MISTAKE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <Textarea placeholder="Question text (optional if you add a photo)" value={f.question_text} onChange={(e) => set('question_text', e.target.value)} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Correct answer" value={f.correct} onChange={(e) => set('correct', e.target.value)} />
        <Input placeholder="What went wrong?" value={f.note} onChange={(e) => set('note', e.target.value)} />
      </div>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
        <Camera className="h-4 w-4" /> {photo ? 'Change photo' : 'Add photo of question'}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setPhoto(await compress(file)); }} />
      </label>
      {photo && <img src={photo} alt="Question photo" className="max-h-48 rounded border" />}
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to Error Book'}</Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
};
