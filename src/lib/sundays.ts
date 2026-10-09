/** Midnight India time on the Sunday strictly after `from`. */
export const nextSundayIST = (from: Date = new Date()) => {
  const istMs = from.getTime() + 5.5 * 3600_000;
  const ist = new Date(istMs);
  const dow = ist.getUTCDay();
  const add = dow === 0 ? 7 : 7 - dow;
  const d = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + add);
  return new Date(d - 5.5 * 3600_000);
};

export const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export const countdownText = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Open now';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  return d > 0 ? `Opens in ${d}d ${h}h` : `Opens in ${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
};
