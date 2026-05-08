import { useEffect, useState } from 'react';
import { useAutosave } from '@/contexts/AutosaveContext';
import { Cloud, CloudOff, Loader2, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  compact?: boolean;
  className?: string;
}

export const AutosaveBadge = ({ compact, className }: Props) => {
  const { status, lastSavedAt } = useAutosave();
  const [tick, setTick] = useState(0);

  // Re-render every 30s to refresh "Saved 2m ago"
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const cfg = (() => {
    switch (status) {
      case 'saving':
        return { icon: Loader2, label: 'Saving', cls: 'text-info border-info/40 bg-info/10', spin: true };
      case 'saved':
        return { icon: Check, label: 'Saved', cls: 'text-success border-success/40 bg-success/10', spin: false };
      case 'offline':
        return { icon: CloudOff, label: 'Offline', cls: 'text-warning border-warning/40 bg-warning/10', spin: false };
      case 'error':
        return { icon: AlertTriangle, label: 'Error', cls: 'text-destructive border-destructive/40 bg-destructive/10', spin: false };
      default:
        return { icon: Cloud, label: 'Synced', cls: 'text-muted-foreground border-border bg-secondary', spin: false };
    }
  })();

  const Icon = cfg.icon;

  // Suppress unused warning
  void tick;

  const ago = lastSavedAt ? formatAgo(lastSavedAt) : null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono-hud uppercase tracking-[0.18em] text-[10px]',
        cfg.cls,
        className,
      )}
      title={lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : cfg.label}
      aria-live="polite"
    >
      <Icon className={cn('h-3 w-3', cfg.spin && 'animate-spin')} />
      <span>{cfg.label}</span>
      {!compact && status === 'saved' && ago && <span className="opacity-70 normal-case tracking-normal">· {ago}</span>}
    </div>
  );
};

function formatAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
