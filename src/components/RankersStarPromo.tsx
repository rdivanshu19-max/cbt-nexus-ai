import { ExternalLink, Star, Sparkles } from 'lucide-react';

interface Props {
  variant?: 'full' | 'compact' | 'strip';
  className?: string;
}

const URL = 'https://rankers-stars.vercel.app/';

export const RankersStarPromo = ({ variant = 'full', className = '' }: Props) => {
  if (variant === 'strip') {
    return (
      <a
        href={URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ink-card px-4 py-3 hover-lift ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Star className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary truncate">// POWERED WITH RANKERS STAR</p>
            <p className="text-xs sm:text-sm font-medium truncate">700+ JEE resources, all coaching tests, mentors — free.</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      </a>
    );
  }

  if (variant === 'compact') {
    return (
      <a
        href={URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ink-card p-4 hover-lift group ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Star className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary">// CONTINUE ON RANKERS STAR</p>
            <h3 className="font-display font-bold text-base mt-0.5">All JEE / NEET resources. Free.</h3>
            <p className="text-xs text-muted-foreground mt-1">700+ resources · coaching tests · lectures · mentor · tracking — one app.</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
              Open Rankers Star <ExternalLink className="h-3 w-3" />
            </span>
          </div>
        </div>
      </a>
    );
  }

  // full
  return (
    <a
      href={URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`block relative overflow-hidden ink-card p-5 sm:p-6 hover-lift group ${className}`}
    >
      <div className="absolute inset-0 gradient-primary opacity-10 pointer-events-none" />
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
          <Sparkles className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-mono-hud uppercase tracking-[0.28em] text-primary">// PARTNER PLATFORM · FREE FOREVER</p>
          <h3 className="font-display font-black text-xl sm:text-2xl mt-1">
            Continue your prep on <span className="gradient-text">Rankers Star</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            700+ JEE resources · all major coaching test series · full lecture libraries · AI mentor · personal habit & study tracker — one structured ecosystem instead of 20 tabs. Completely free.
          </p>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
            Open Rankers Star <ExternalLink className="h-4 w-4" />
          </span>
        </div>
      </div>
    </a>
  );
};
