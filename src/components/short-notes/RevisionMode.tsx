import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MathText } from '@/components/MathText';
import { ChevronLeft, ChevronRight, Check, RotateCcw, X, Shuffle, Eye, EyeOff } from 'lucide-react';

interface Card { front: string; back: string }

interface Props {
  cards: Card[];
  initialFinished?: number[];
  onFinishedChange?: (finished: number[]) => void;
  onClose: () => void;
  title?: string;
}

export const RevisionMode = ({ cards, initialFinished = [], onFinishedChange, onClose, title }: Props) => {
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [finished, setFinished] = useState<Set<number>>(new Set(initialFinished));

  useEffect(() => { onFinishedChange?.(Array.from(finished).sort((a, b) => a - b)); }, [finished]);
  useEffect(() => { setShowBack(false); }, [pos]);

  if (cards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No revision cards available.</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </Card>
    );
  }

  const idx = order[pos];
  const card = cards[idx];
  const isDone = finished.has(idx);
  const progress = (finished.size / cards.length) * 100;

  const next = () => setPos((p) => Math.min(p + 1, order.length - 1));
  const prev = () => setPos((p) => Math.max(p - 1, 0));
  const toggleFinished = () => {
    const s = new Set(finished);
    if (s.has(idx)) s.delete(idx); else s.add(idx);
    setFinished(s);
  };
  const shuffle = () => {
    const arr = [...order];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
    setPos(0);
  };
  const reset = () => { setFinished(new Set()); setPos(0); };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <RotateCcw className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{title || 'Revision Mode'}</p>
            <p className="text-xs text-muted-foreground">{finished.size} / {cards.length} finished</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={shuffle} title="Shuffle">
            <Shuffle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} title="Reset progress">
            Reset
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="px-4 sm:px-6 pt-3">
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline">Card {pos + 1} of {order.length}</Badge>
            {isDone && <Badge className="bg-success text-success-foreground border-0"><Check className="h-3 w-3 mr-1" /> Finished</Badge>}
          </div>

          <Card
            onClick={() => setShowBack((v) => !v)}
            className={`relative cursor-pointer min-h-[280px] sm:min-h-[340px] p-6 sm:p-10 flex items-center justify-center transition-all border-2 ${
              showBack
                ? 'bg-gradient-to-br from-accent/20 via-accent/5 to-transparent border-accent/40'
                : 'bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/40'
            }`}
          >
            <div className="absolute top-3 right-3 text-xs text-muted-foreground flex items-center gap-1">
              {showBack ? <><EyeOff className="h-3 w-3" /> Answer</> : <><Eye className="h-3 w-3" /> Question</>}
            </div>
            <div className="text-center w-full">
              {showBack ? (
                <MathText block className="text-base sm:text-lg leading-relaxed">{card.back}</MathText>
              ) : (
                <MathText block className="text-lg sm:text-xl font-medium leading-relaxed">{card.front}</MathText>
              )}
              <p className="mt-6 text-xs text-muted-foreground">
                Tap card to {showBack ? 'show question' : 'reveal answer'}
              </p>
            </div>
          </Card>

          {/* Controls */}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <Button variant="outline" onClick={prev} disabled={pos === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <Button
              onClick={toggleFinished}
              className={isDone ? 'bg-muted text-foreground hover:bg-muted/80' : 'bg-success text-success-foreground hover:bg-success/90'}
            >
              <Check className="h-4 w-4 mr-1" />
              {isDone ? 'Unmark' : 'Mark finished'}
            </Button>
            <Button variant="outline" onClick={next} disabled={pos === order.length - 1}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
