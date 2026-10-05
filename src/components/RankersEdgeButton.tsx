import { ExternalLink } from 'lucide-react';
import { rankersEdgeLogo } from '@/lib/brandLogos';

export const RANKERS_EDGE_URL = 'https://rankersedge.vercel.app/';

/** Deep link that opens the Rankers Edge sister app in a new tab. */
export const RankersEdgeButton = ({ compact = false, className = '' }: { compact?: boolean; className?: string }) => (
  <a
    href={RANKERS_EDGE_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`ink-card hover-lift inline-flex items-center gap-3 ${compact ? 'px-3 py-2' : 'px-4 py-3'} ${className}`}
  >
    <img src={rankersEdgeLogo} alt="" className={`${compact ? 'h-7 w-7' : 'h-10 w-10'} rounded-lg object-contain ring-1 ring-border bg-foreground p-0.5`} />
    <span className="min-w-0 flex-1">
      <span className="block font-display font-bold text-sm sm:text-base leading-tight">Open Rankers Edge</span>
      {!compact && <span className="block text-xs text-muted-foreground">PYQs, full mocks, AI voice tutor</span>}
    </span>
    <ExternalLink className="h-4 w-4 text-primary shrink-0" />
  </a>
);
