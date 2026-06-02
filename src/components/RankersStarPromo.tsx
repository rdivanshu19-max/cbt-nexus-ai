import { ExternalLink, Mic, BookOpen, Infinity as InfinityIcon, GraduationCap } from 'lucide-react';
import rankersEdgeLogo from '@/assets/rankers-edge-logo.png.asset.json';

interface Props {
  variant?: 'full' | 'compact' | 'strip';
  className?: string;
}

const URL = 'https://rankersedge.vercel.app/';

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
          <img src={rankersEdgeLogo.url} alt="Rankers Edge" className="h-9 w-9 rounded-lg object-cover shrink-0 ring-1 ring-border bg-[#0a1024]" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary truncate">// PART OF THE ECOSYSTEM · RANKERS EDGE</p>
            <p className="text-xs sm:text-sm font-medium truncate">PYQ · JEE Main+Advanced mocks · AI voice tutor · infinite practice.</p>
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
          <img src={rankersEdgeLogo.url} alt="Rankers Edge" className="h-11 w-11 rounded-xl object-cover shrink-0 ring-1 ring-border bg-[#0a1024]" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary">// CONTINUE ON RANKERS EDGE</p>
            <h3 className="font-display font-bold text-base mt-0.5">JEE prep, sharpened.</h3>
            <p className="text-xs text-muted-foreground mt-1">PYQ · Main + Advanced mocks · chapter tests · infinite practice · AI voice tutor · word-by-word chapter teaching.</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
              Open Rankers Edge <ExternalLink className="h-3 w-3" />
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
      <div className="relative flex flex-col sm:flex-row gap-4 sm:items-start">
        <img src={rankersEdgeLogo.url} alt="Rankers Edge" className="h-16 w-16 rounded-2xl object-cover shrink-0 ring-1 ring-border bg-[#0a1024]" />
        <div className="flex-1">
          <p className="text-[10px] font-mono-hud uppercase tracking-[0.28em] text-primary">// PARTNER PLATFORM · OUR ECOSYSTEM</p>
          <h3 className="font-display font-black text-xl sm:text-2xl mt-1">
            Sharpen on <span className="gradient-text">Rankers Edge</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            The sister app of CBT Nexus — built for serious JEE prep. PYQ banks, JEE Main + Advanced full mocks,
            chapter-wise tests & PYQ, infinite question practice, AI voice tutor, and word-by-word chapter teaching by AI.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] font-medium">
            <span className="ink-card px-2.5 py-1.5 flex items-center gap-1.5"><BookOpen className="h-3 w-3 text-primary" /> PYQ + Mocks</span>
            <span className="ink-card px-2.5 py-1.5 flex items-center gap-1.5"><GraduationCap className="h-3 w-3 text-primary" /> Chapter teach</span>
            <span className="ink-card px-2.5 py-1.5 flex items-center gap-1.5"><Mic className="h-3 w-3 text-primary" /> Voice tutor</span>
            <span className="ink-card px-2.5 py-1.5 flex items-center gap-1.5"><InfinityIcon className="h-3 w-3 text-primary" /> Infinite practice</span>
          </div>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
            Open Rankers Edge <ExternalLink className="h-4 w-4" />
          </span>
        </div>
      </div>
    </a>
  );
};
