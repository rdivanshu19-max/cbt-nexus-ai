import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, Monitor } from 'lucide-react';
import { openSeriesTest } from '@/lib/testSeries';

/** Full-screen sandboxed viewer: no popups or top-level navigation, so outside links can't open. */
const SeriesPlayer = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState<{ title: string; html?: string; url?: string } | null>(null);
  const [error, setError] = useState('');
  const [hideTip, setHideTip] = useState(false);

  useEffect(() => {
    if (testId) openSeriesTest(testId).then(setPaper).catch((e) => setError(e.message));
  }, [testId]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="flex items-center gap-2 px-3 py-2 border-b-2 border-border bg-card">
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Exit</Button>
        <p className="font-display font-bold truncate flex-1">{paper?.title || 'Loading paper…'}</p>
      </div>
      {!hideTip && (
        <div className="md:hidden flex items-center gap-2 px-3 py-2 text-xs bg-accent/40 border-b border-border">
          <Monitor className="h-4 w-4 shrink-0" /> Turn on "Desktop site" in your browser menu for the best layout.
          <button className="ml-auto font-semibold" onClick={() => setHideTip(true)}>OK</button>
        </div>
      )}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p>{error}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      ) : paper ? (
        <iframe
          title={paper.title}
          className="flex-1 w-full border-0 bg-card"
          sandbox="allow-scripts allow-forms allow-modals"
          referrerPolicy="no-referrer"
          {...(paper.html ? { srcDoc: paper.html } : { src: paper.url })}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      )}
    </div>
  );
};

export default SeriesPlayer;
