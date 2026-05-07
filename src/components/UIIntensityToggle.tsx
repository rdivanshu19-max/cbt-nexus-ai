import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sliders } from 'lucide-react';

type Intensity = 'full' | 'calm' | 'minimal';
const KEY = 'cbt-ui-intensity';

export function applyIntensity(level: Intensity) {
  const html = document.documentElement;
  if (level === 'full') html.removeAttribute('data-ui-intensity');
  else html.setAttribute('data-ui-intensity', level);
  localStorage.setItem(KEY, level);
}

export function useStoredIntensity() {
  useEffect(() => {
    const stored = (localStorage.getItem(KEY) as Intensity | null) || 'full';
    applyIntensity(stored);
  }, []);
}

export const UIIntensityToggle = () => {
  const [level, setLevel] = useState<Intensity>('full');
  useEffect(() => {
    setLevel((localStorage.getItem(KEY) as Intensity | null) || 'full');
  }, []);

  const choose = (l: Intensity) => {
    setLevel(l);
    applyIntensity(l);
  };

  const options: { v: Intensity; label: string; desc: string }[] = [
    { v: 'full', label: 'Vivid', desc: 'Full glow + HUD highlights' },
    { v: 'calm', label: 'Calm', desc: 'Reduced glow, softer accents' },
    { v: 'minimal', label: 'Minimal', desc: 'No glow, flat surfaces' },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="UI intensity">
          <Sliders className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground px-2 py-1">UI Intensity</p>
        <div className="flex flex-col gap-1 mt-1">
          {options.map((o) => (
            <button
              key={o.v}
              onClick={() => choose(o.v)}
              className={`text-left px-2 py-2 rounded-md transition-colors ${
                level === o.v ? 'bg-primary/15 text-primary' : 'hover:bg-secondary'
              }`}
            >
              <p className="text-sm font-medium">{o.label}</p>
              <p className="text-[11px] text-muted-foreground">{o.desc}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
