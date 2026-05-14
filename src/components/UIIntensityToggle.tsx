import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sliders } from 'lucide-react';

type Intensity = 'full' | 'calm' | 'minimal';
const KEY = 'cbt-ui-intensity';
const ORDER: Intensity[] = ['calm', 'full', 'minimal'];

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

const META: Record<Intensity, { label: string; desc: string }> = {
  calm: { label: 'Calm', desc: 'Reduced glow and softer accents' },
  full: { label: 'Normal', desc: 'Balanced shadows, motion and HUD highlights' },
  minimal: { label: 'Minimal', desc: 'No glow, no animations — flat surfaces' },
};

export const UIIntensityToggle = () => {
  const [level, setLevel] = useState<Intensity>('full');
  useEffect(() => {
    setLevel((localStorage.getItem(KEY) as Intensity | null) || 'full');
  }, []);

  const choose = (l: Intensity) => {
    setLevel(l);
    applyIntensity(l);
  };

  const idx = ORDER.indexOf(level);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="UI intensity">
          <Sliders className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-muted-foreground mb-1">// UI Intensity</p>
        <p className="text-sm font-semibold mb-3">{META[level].label} <span className="text-muted-foreground font-normal text-xs">— {META[level].desc}</span></p>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={idx}
          onChange={(e) => choose(ORDER[Number(e.target.value)])}
          className="w-full accent-primary"
          aria-label="UI intensity slider"
        />
        <div className="grid grid-cols-3 gap-1 mt-2 text-[10px] font-mono-hud uppercase tracking-wider">
          {ORDER.map((l) => (
            <button
              key={l}
              onClick={() => choose(l)}
              className={`py-1.5 rounded-md border transition-colors ${
                level === l ? 'bg-primary/15 text-primary border-primary/40' : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {META[l].label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
