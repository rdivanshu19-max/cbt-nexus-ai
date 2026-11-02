import { useState } from 'react';
import { Palette } from 'lucide-react';

export const READING_THEMES = [
  { id: 'paper', label: 'Paper', swatch: 'bg-white' },
  { id: 'sepia', label: 'Sepia', swatch: 'bg-[#f4e8d0]' },
  { id: 'midnight', label: 'Midnight', swatch: 'bg-[#141821]' },
  { id: 'focus', label: 'Focus', swatch: 'bg-black' },
] as const;

export type ReadingTheme = (typeof READING_THEMES)[number]['id'];
const STORAGE_KEY = 'cbt-reading-theme';

export const getReadingTheme = (): ReadingTheme => {
  const v = localStorage.getItem(STORAGE_KEY);
  return (READING_THEMES.find((t) => t.id === v)?.id || 'paper') as ReadingTheme;
};

export const ReadingThemePicker = ({ compact = false }: { compact?: boolean }) => {
  const [theme, setTheme] = useState<ReadingTheme>(getReadingTheme);
  const apply = (t: ReadingTheme) => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.dataset.readingTheme = t;
  };
  if (compact) {
    return (
      <button
        onClick={() => apply(READING_THEMES[(READING_THEMES.findIndex((t) => t.id === theme) + 1) % READING_THEMES.length].id as ReadingTheme)}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        title={`Reading theme: ${theme}`}
      >
        <Palette className="h-3.5 w-3.5" /> {theme}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="flex gap-1.5">
        {READING_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => apply(t.id)}
            title={t.label}
            aria-label={t.label}
            className={`h-6 w-6 rounded-full border ${t.swatch} ${theme === t.id ? 'ring-2 ring-primary ring-offset-1' : 'border-border'}`}
          />
        ))}
      </div>
    </div>
  );
};
