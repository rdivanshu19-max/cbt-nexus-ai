import { ExternalLink } from 'lucide-react';
import { rankersEdgeLogo, rankersStarLogo } from '@/lib/brandLogos';

export const RANKERS_EDGE_URL = 'https://rankersedge.vercel.app/';
export const RANKERS_STAR_URL = 'https://rankers-stars.vercel.app/';

type Props = { compact?: boolean; className?: string };

const SisterAppButton = ({ href, logo, name, sub, compact = false, className = '' }: Props & { href: string; logo: string; name: string; sub: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`ink-card hover-lift inline-flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}
  >
    <img src={logo} alt="" className={`${compact ? 'h-7 w-7' : 'h-10 w-10'} rounded-lg object-contain ring-1 ring-border bg-foreground p-0.5`} />
    <span className="min-w-0 flex-1">
      <span className="block font-display font-bold text-sm sm:text-base leading-tight">Open {name}</span>
      {!compact && <span className="block text-xs text-muted-foreground">{sub}</span>}
    </span>
    <ExternalLink className="h-4 w-4 text-primary shrink-0" />
  </a>
);

/** Deep link that opens the Rankers Edge sister app in a new tab. */
export const RankersEdgeButton = (p: Props) => (
  <SisterAppButton {...p} href={RANKERS_EDGE_URL} logo={rankersEdgeLogo} name="Rankers Edge" sub="PYQs, full mocks, AI voice tutor" />
);

/** Deep link that opens the Rankers Star sister app in a new tab. */
export const RankersStarButton = (p: Props) => (
  <SisterAppButton {...p} href={RANKERS_STAR_URL} logo={rankersStarLogo} name="Rankers Star" sub="700+ free JEE resources & test series" />
);
