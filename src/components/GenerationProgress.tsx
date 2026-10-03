import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';

interface GenerationProgressProps {
  open: boolean;
  title: string;
  done: number;
  total: number;
  unit?: string;
  status?: string;
}

const STEPS = ['Briefing the paper setter', 'Drafting questions', 'Calibrating difficulty', 'Checking answers', 'Assembling your paper'];

/** Live generation dialog: orbiting ring, smooth creeping percentage, step ticker. */
export const GenerationProgress = ({ open, title, done, total, unit = 'questions', status }: GenerationProgressProps) => {
  const real = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const [shown, setShown] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) { setShown(0); setStep(0); return; }
    const t = setInterval(() => {
      setShown((s) => {
        const ceiling = Math.max(real, Math.min(95, real + 18));
        return s < ceiling ? s + Math.max(0.4, (ceiling - s) * 0.08) : s;
      });
    }, 250);
    const st = setInterval(() => setStep((x) => (x + 1) % STEPS.length), 2200);
    return () => { clearInterval(t); clearInterval(st); };
  }, [open, real]);

  const pct = Math.round(Math.max(shown, real));
  const r = 44, c = 2 * Math.PI * r;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md border-primary/20 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="relative h-28 w-28">
            <div className="absolute inset-3 rounded-full bg-primary/15 blur-xl animate-pulse" />
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--primary) / 0.15)" strokeWidth="6" />
              <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset .3s ease' }} />
            </svg>
            <div className="absolute inset-0 animate-spin [animation-duration:3s]">
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black leading-none tabular-nums">{pct}%</span>
              <Sparkles className="mt-1 h-3.5 w-3.5 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="font-black text-xl">{title}</h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              {total > 0 ? `${done} / ${total} ${unit} ready` : `${done} ${unit} ready…`}
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p key={step} className="text-xs text-muted-foreground animate-fade-in">{status && done > 0 ? status : STEPS[step]}…</p>
          <p className="text-[11px] text-muted-foreground/70">Keep this window open — usually under a minute.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
