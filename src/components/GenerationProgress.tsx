import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2, Sparkles } from 'lucide-react';

interface GenerationProgressProps {
  open: boolean;
  /** e.g. "Building your mission" */
  title: string;
  /** items completed */
  done: number;
  /** items expected in total (0 = indeterminate) */
  total: number;
  /** noun for items, e.g. "questions" */
  unit?: string;
  /** rotating status line */
  status?: string;
}

/** Live generation dialog: animated ring + "12 / 75 questions ready" counter. */
export const GenerationProgress = ({
  open, title, done, total, unit = 'questions', status,
}: GenerationProgressProps) => {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : null;

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md border-primary/20 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            <div className="absolute inset-2 rounded-full bg-primary/10 blur-md animate-pulse-soft" />
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono-hud">
              {pct === null ? (
                <Sparkles className="h-6 w-6 text-primary" />
              ) : (
                <>
                  <span className="text-2xl font-black leading-none">{pct}%</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">ready</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-black text-xl">{title}</h2>
            <p className="text-sm text-muted-foreground font-mono-hud">
              {total > 0 ? `${done} / ${total} ${unit} generated` : `${done} ${unit} generated…`}
            </p>
          </div>

          {total > 0 && (
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary-glow transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>{status || 'AI is writing and validating each question…'}</span>
          </div>

          <p className="text-[11px] text-muted-foreground/70">Keep this window open — this usually takes under a minute.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
