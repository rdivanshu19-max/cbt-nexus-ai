import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';

const DAILY_LIMIT = 3;

const getISTDayWindow = () => {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const startUtc = new Date(
    Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 0, 0, 0) - istOffsetMs,
  );
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
};

const getResetText = () => {
  const now = new Date();
  const nowUtc = now.getTime();
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let nextResetUtc = todayUtcMidnight + 18.5 * 60 * 60 * 1000;
  if (nextResetUtc <= nowUtc) nextResetUtc += 24 * 60 * 60 * 1000;
  const ms = nextResetUtc - nowUtc;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

interface Props {
  variant?: 'sidebar' | 'inline';
}

export const PdfQuotaBadge = ({ variant = 'sidebar' }: Props) => {
  const { user, isAdmin } = useAuth();
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    if (!user || isAdmin) return;
    let active = true;
    const fetchUsage = async () => {
      const { startUtc, endUtc } = getISTDayWindow();
      const { count, error } = await supabase
        .from('pdf_conversions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('converted_at', startUtc.toISOString())
        .lt('converted_at', endUtc.toISOString());
      if (!active) return;
      if (error) {
        setUsed(0);
      } else {
        setUsed(count ?? 0);
      }
    };
    fetchUsage();
    const id = setInterval(fetchUsage, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [user, isAdmin]);

  if (!user || isAdmin) return null;

  const remaining = Math.max(0, DAILY_LIMIT - (used ?? 0));
  const display = used === null ? '…' : used;

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span><span className="text-foreground font-medium">{display}/{DAILY_LIMIT}</span> PDFs used today · resets in {getResetText()}</span>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">PDF Quota</span>
      </div>
      <p className="text-sm font-medium text-foreground">
        {display}/{DAILY_LIMIT} <span className="text-xs text-muted-foreground font-normal">used today</span>
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {remaining} left · resets in {getResetText()}
      </p>
    </div>
  );
};
