import { supabase } from '@/integrations/supabase/client';

export const EARLY_ACCESS_EMAIL = 'studyspacerankers@gmail.com';

export type SeriesTest = {
  id: string; series_id: string; title: string; label: string | null; syllabus: string | null;
  duration_minutes: number | null; question_count: number | null; total_marks: number | null;
  lock_mode: 'open' | 'date' | 'promo'; unlock_at: string | null; sort_order: number;
};

export const isTestUnlocked = (t: SeriesTest, seriesUnlocked: boolean, isAdmin = false) => {
  if (isAdmin || seriesUnlocked || t.lock_mode === 'open') return true;
  if (t.lock_mode === 'date' && t.unlock_at) return new Date(t.unlock_at) <= new Date();
  return false;
};

export const lockLabel = (t: SeriesTest) => {
  if (t.lock_mode === 'promo') return 'Early-access code only';
  if (t.lock_mode === 'date' && t.unlock_at) {
    return 'Unlocks ' + new Date(t.unlock_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return 'Locked';
};

export const redeemCode = async (code: string) => {
  const { data, error } = await supabase.functions.invoke('series-access', { body: { action: 'redeem', code } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'That code isn\'t valid.');
  return data.seriesIds as string[];
};

export const openSeriesTest = async (testId: string) => {
  const { data, error } = await supabase.functions.invoke('series-access', { body: { action: 'open', testId } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Unable to open this test.');
  return data as { title: string; html?: string; url?: string };
};
