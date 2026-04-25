import { useMemo, useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, AlertCircle } from 'lucide-react';
import { getChapters } from '@/lib/chapters';
import { cn } from '@/lib/utils';

interface Props {
  subject: string;
  exam: string;
  classLevel: string;
  value: string;
  onChange: (v: string) => void;
}

export const ChapterAutocomplete = ({ subject, exam, classLevel, value, onChange }: Props) => {
  const allChapters = useMemo(
    () => getChapters(subject, exam, classLevel),
    [subject, exam, classLevel]
  );
  const [open, setOpen] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return allChapters.slice(0, 8);
    return allChapters
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, 8);
  }, [value, allChapters]);

  const isValid = useMemo(() => {
    if (!value.trim()) return null;
    return allChapters.some((c) => c.toLowerCase() === value.trim().toLowerCase());
  }, [value, allChapters]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHoverIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHoverIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && suggestions[hoverIdx]) { e.preventDefault(); onChange(suggestions[hoverIdx]); setOpen(false); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder='Start typing… e.g. "Rotational", "p-Block", "Human Reproduction"'
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHoverIdx(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        className={cn(
          isValid === true && 'border-success focus-visible:ring-success/50',
          isValid === false && 'border-warning focus-visible:ring-warning/50'
        )}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          <ul className="max-h-64 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <li
                key={s}
                onMouseDown={(e) => { e.preventDefault(); onChange(s); setOpen(false); }}
                onMouseEnter={() => setHoverIdx(i)}
                className={cn(
                  'px-3 py-2 text-sm cursor-pointer flex items-center justify-between',
                  i === hoverIdx ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
                )}
              >
                <span>{s}</span>
                {value.trim().toLowerCase() === s.toLowerCase() && <Check className="h-4 w-4 text-success" />}
              </li>
            ))}
          </ul>
        </div>
      )}
      {value.trim() && isValid === false && (
        <p className="mt-1.5 text-xs flex items-center gap-1.5 text-warning">
          <AlertCircle className="h-3.5 w-3.5" />
          Not in the standard {subject} syllabus list — AI will still try, but pick from suggestions for best results.
        </p>
      )}
      {value.trim() && isValid === true && (
        <p className="mt-1.5 text-xs flex items-center gap-1.5 text-success">
          <Check className="h-3.5 w-3.5" />
          Valid {subject} chapter
        </p>
      )}
    </div>
  );
};
