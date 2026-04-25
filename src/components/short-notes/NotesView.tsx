import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MathText } from '@/components/MathText';
import { BookOpen, Lightbulb, RotateCcw, AlertTriangle, FileText, Sparkles } from 'lucide-react';

export interface Notes {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  important_points: string[];
  formulas?: { name: string; expression: string; note?: string }[];
  revision_cards: { front: string; back: string }[];
  common_mistakes: string[];
}

interface Props {
  notes: Notes;
  exam: string;
  classLevel: string;
  subject: string;
  style: string;
}

// Rotating gradient palette for cards (uses semantic tokens via index.css gradient-* classes
// where available, plus tailwind from-/to- combos that respect the design system).
const CARD_GRADIENTS = [
  'from-primary/15 via-primary/5 to-transparent border-primary/30',
  'from-accent/20 via-accent/5 to-transparent border-accent/40',
  'from-warning/15 via-warning/5 to-transparent border-warning/30',
  'from-success/15 via-success/5 to-transparent border-success/30',
  'from-info/15 via-info/5 to-transparent border-info/30',
  'from-destructive/15 via-destructive/5 to-transparent border-destructive/30',
];

export const NotesView = ({ notes, exam, classLevel, subject, style }: Props) => {
  return (
    <div className="space-y-5">
      {/* Hero header */}
      <Card className="relative overflow-hidden p-6 sm:p-8 border-primary/30">
        <div className="absolute inset-0 gradient-primary opacity-10 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-primary text-primary-foreground border-0">
              <Sparkles className="h-3 w-3 mr-1" /> AI Notes
            </Badge>
            <Badge variant="secondary">{subject}</Badge>
            <Badge variant="outline">Class {classLevel}</Badge>
            <Badge variant="outline">{exam}</Badge>
            <Badge className="bg-accent/20 text-accent-foreground border-0 capitalize">{style}</Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 gradient-text">
            <MathText>{notes.title}</MathText>
          </h2>
          <MathText block className="text-muted-foreground leading-relaxed">
            {notes.summary}
          </MathText>
        </div>
      </Card>

      {/* Sections */}
      {notes.sections?.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Concepts</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.sections.map((s, i) => {
              const grad = CARD_GRADIENTS[i % CARD_GRADIENTS.length];
              return (
                <div
                  key={i}
                  className={`relative rounded-xl border bg-gradient-to-br ${grad} p-4 transition-transform hover:-translate-y-0.5`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <h4 className="font-semibold leading-tight">
                      <MathText>{s.heading}</MathText>
                    </h4>
                  </div>
                  <MathText block className="text-sm text-foreground/80 leading-relaxed">
                    {s.body}
                  </MathText>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Important points */}
      {notes.important_points?.length > 0 && (
        <Card className="p-5 sm:p-6 border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-warning/20 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-warning" />
            </div>
            <h3 className="text-lg font-semibold">Important points</h3>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {notes.important_points.map((p, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm rounded-lg bg-card/60 border border-border/60 p-3"
              >
                <span className="shrink-0 h-6 w-6 rounded-md bg-warning/20 text-warning font-bold flex items-center justify-center text-xs">
                  {i + 1}
                </span>
                <MathText className="flex-1 leading-relaxed">{p}</MathText>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Formulas */}
      {notes.formulas && notes.formulas.length > 0 && (
        <Card className="p-5 sm:p-6 border-info/30 bg-gradient-to-br from-info/5 to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-info/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <h3 className="text-lg font-semibold">Key formulas</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.formulas.map((f, i) => (
              <div
                key={i}
                className="relative rounded-xl border border-info/30 bg-card p-4 overflow-hidden"
              >
                <div className="absolute top-0 right-0 h-16 w-16 bg-info/10 rounded-bl-full" />
                <p className="text-xs uppercase tracking-wider text-info font-semibold mb-2 relative">
                  {f.name}
                </p>
                <div className="rounded-md bg-secondary/70 px-3 py-2 mb-2">
                  <MathText block className="font-mono text-base">
                    {f.expression}
                  </MathText>
                </div>
                {f.note && (
                  <MathText block className="text-xs text-muted-foreground">
                    {f.note}
                  </MathText>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Revision cards */}
      {notes.revision_cards?.length > 0 && (
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <RotateCcw className="h-5 w-5 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Revision cards</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {notes.revision_cards.map((c, i) => {
              const grad = CARD_GRADIENTS[(i + 2) % CARD_GRADIENTS.length];
              return (
                <div
                  key={i}
                  className={`rounded-xl border bg-gradient-to-br ${grad} p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs uppercase tracking-wider text-primary font-bold">
                      Card {i + 1}
                    </p>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Question</p>
                  <MathText block className="font-medium mb-3">
                    {c.front}
                  </MathText>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Answer</p>
                  <MathText block className="text-sm text-foreground/80">
                    {c.back}
                  </MathText>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Common mistakes */}
      {notes.common_mistakes?.length > 0 && (
        <Card className="p-5 sm:p-6 border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Common mistakes</h3>
          </div>
          <ul className="space-y-2">
            {notes.common_mistakes.map((m, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm rounded-lg bg-card/60 border border-destructive/20 p-3"
              >
                <span className="shrink-0 h-6 w-6 rounded-md bg-destructive/20 text-destructive font-bold flex items-center justify-center text-xs">
                  !
                </span>
                <MathText className="flex-1 leading-relaxed">{m}</MathText>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
