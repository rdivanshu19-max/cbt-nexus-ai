import { ExternalLink, Mic, BookOpen, Infinity as InfinityIcon, GraduationCap, Library, Users, Sparkles } from 'lucide-react';
import { rankersEdgeLogo, rankersStarLogo } from '@/lib/brandLogos';

interface Props {
  variant?: 'full' | 'compact' | 'strip';
  className?: string;
}

const STAR_URL = 'https://rankers-stars.vercel.app/';
const EDGE_URL = 'https://rankersedge.vercel.app/';

interface BrandCard {
  href: string;
  name: string;
  logo: string;
  tag: string;
  tagline: string;
  desc: string;
  chips: { icon: any; label: string }[];
  ring: string;
  bg: string;
}

const STAR: BrandCard = {
  href: STAR_URL,
  name: 'Rankers Star',
  logo: rankersStarLogo,
  tag: '// FREE ECOSYSTEM',
  tagline: 'All JEE / NEET resources, free.',
  desc: '700+ JEE resources · all major coaching test series · full lecture libraries · AI mentor · habit & study tracker — one structured ecosystem.',
  chips: [
    { icon: Library, label: '700+ resources' },
    { icon: Users, label: 'Coaching tests' },
    { icon: Sparkles, label: 'AI mentor' },
    { icon: BookOpen, label: 'Lectures' },
  ],
  ring: 'ring-amber-500/30',
  bg: 'bg-[#0a1024]',
};

const EDGE: BrandCard = {
  href: EDGE_URL,
  name: 'Rankers Edge',
  logo: rankersEdgeLogo,
  tag: '// PRO JEE PREP',
  tagline: 'Sharpen your edge.',
  desc: 'PYQ banks · JEE Main + Advanced full mocks · chapter-wise tests & PYQ · infinite question practice · AI voice tutor · word-by-word chapter teaching by AI.',
  chips: [
    { icon: BookOpen, label: 'PYQ + Mocks' },
    { icon: GraduationCap, label: 'Chapter teach' },
    { icon: Mic, label: 'Voice tutor' },
    { icon: InfinityIcon, label: 'Infinite practice' },
  ],
  ring: 'ring-slate-300/30',
  bg: 'bg-[#0a0f1f]',
};

function StripCard({ brand }: { brand: BrandCard }) {
  return (
    <a
      href={brand.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block ink-card px-4 py-3 hover-lift"
    >
      <div className="flex items-center gap-3">
        <img src={brand.logo} alt={brand.name} className={`h-9 w-9 rounded-lg object-contain shrink-0 ring-1 ring-border ${brand.bg} p-0.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary truncate">{brand.tag}</p>
          <p className="text-xs sm:text-sm font-medium truncate">{brand.name} — {brand.tagline}</p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
    </a>
  );
}

function CompactCard({ brand }: { brand: BrandCard }) {
  return (
    <a
      href={brand.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block ink-card p-4 hover-lift group"
    >
      <div className="flex items-start gap-3">
        <img src={brand.logo} alt={brand.name} className={`h-11 w-11 rounded-xl object-contain shrink-0 ring-1 ring-border ${brand.bg} p-1`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono-hud uppercase tracking-[0.22em] text-primary">{brand.tag}</p>
          <h3 className="font-display font-bold text-base mt-0.5">{brand.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{brand.desc}</p>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
            Open {brand.name} <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      </div>
    </a>
  );
}

function FullCard({ brand }: { brand: BrandCard }) {
  return (
    <a
      href={brand.href}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative overflow-hidden ink-card p-5 sm:p-6 hover-lift group"
    >
      <div className="absolute inset-0 gradient-primary opacity-10 pointer-events-none" />
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row gap-4 sm:items-start">
        <img src={brand.logo} alt={brand.name} className={`h-16 w-16 rounded-2xl object-contain shrink-0 ring-1 ring-border ${brand.bg} p-1.5`} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono-hud uppercase tracking-[0.28em] text-primary">{brand.tag}</p>
          <h3 className="font-display font-black text-xl sm:text-2xl mt-1">
            <span className="gradient-text">{brand.name}</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{brand.desc}</p>
          <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] font-medium">
            {brand.chips.map((c) => (
              <span key={c.label} className="ink-card px-2.5 py-1.5 flex items-center gap-1.5">
                <c.icon className="h-3 w-3 text-primary" /> {c.label}
              </span>
            ))}
          </div>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
            Open {brand.name} <ExternalLink className="h-4 w-4" />
          </span>
        </div>
      </div>
    </a>
  );
}

export const RankersStarPromo = ({ variant = 'full', className = '' }: Props) => {
  if (variant === 'strip') {
    return (
      <div className={`grid sm:grid-cols-2 gap-2 ${className}`}>
        <StripCard brand={STAR} />
        <StripCard brand={EDGE} />
      </div>
    );
  }
  if (variant === 'compact') {
    return (
      <div className={`grid sm:grid-cols-2 gap-3 ${className}`}>
        <CompactCard brand={STAR} />
        <CompactCard brand={EDGE} />
      </div>
    );
  }
  return (
    <div className={`grid md:grid-cols-2 gap-4 ${className}`}>
      <FullCard brand={STAR} />
      <FullCard brand={EDGE} />
    </div>
  );
};
