import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader, WindowCard } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MathText } from '@/components/MathText';
import { useToast } from '@/hooks/use-toast';
import { Plus, BookOpen, Brain, Check, X, ChevronLeft, Bookmark } from 'lucide-react';

interface Deck { id: string; title: string; deck_type: string; subject: string | null; chapter: string | null; card_count: number; }
interface CardRow { id: string; deck_id: string; front: string; back: string; tags: string[] | null; }
interface Review { card_id: string; box: number; review_count: number; known_count: number; bookmarked: boolean; next_review_at: string | null; }

const DECK_TYPES = ['formula', 'reaction', 'concept'];
const BOX_DAYS = [1, 2, 4, 8, 16];

const Flashcards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDeck, setOpenDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [creating, setCreating] = useState(false);
  const [newDeck, setNewDeck] = useState({ title: '', deck_type: 'concept', subject: '' });
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const loadDecks = async () => {
    const { data } = await supabase.from('flashcard_decks').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setDecks((data as Deck[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (user) loadDecks(); }, [user]);

  const openDeckDetail = async (deck: Deck) => {
    setOpenDeck(deck);
    const [{ data: cs }, { data: rv }] = await Promise.all([
      supabase.from('flashcards').select('*').eq('deck_id', deck.id).order('created_at'),
      supabase.from('flashcard_reviews').select('*').eq('user_id', user!.id),
    ]);
    setCards((cs as CardRow[]) || []);
    setReviews(Object.fromEntries(((rv as Review[]) || []).map((r) => [r.card_id, r])));
  };

  const createDeck = async () => {
    if (!newDeck.title.trim()) return;
    const { data, error } = await supabase.from('flashcard_decks').insert({
      user_id: user!.id, title: newDeck.title.trim(), deck_type: newDeck.deck_type,
      subject: newDeck.subject || null, card_count: 0,
    }).select().single();
    if (error) { toast({ title: 'Could not create deck', description: error.message, variant: 'destructive' }); return; }
    setDecks((p) => [data as Deck, ...p]);
    setCreating(false);
    setNewDeck({ title: '', deck_type: 'concept', subject: '' });
  };

  const addCard = async () => {
    if (!openDeck || !newCard.front.trim() || !newCard.back.trim()) return;
    const { data, error } = await supabase.from('flashcards').insert({
      deck_id: openDeck.id, front: newCard.front.trim(), back: newCard.back.trim(),
    }).select().single();
    if (error) { toast({ title: 'Could not add card', description: error.message, variant: 'destructive' }); return; }
    setCards((p) => [...p, data as CardRow]);
    await supabase.from('flashcard_decks').update({ card_count: cards.length + 1 }).eq('id', openDeck.id);
    setOpenDeck({ ...openDeck, card_count: cards.length + 1 });
    setNewCard({ front: '', back: '' });
  };

  const reviewCard = async (card: CardRow, known: boolean) => {
    const existing = reviews[card.id];
    const box = known ? Math.min((existing?.box || 0) + 1, BOX_DAYS.length) : 0;
    const next = new Date();
    next.setDate(next.getDate() + BOX_DAYS[Math.min(box - 1, BOX_DAYS.length - 1)]);
    const patch = {
      user_id: user!.id, card_id: card.id, bookmarked: existing?.bookmarked || false,
      review_count: (existing?.review_count || 0) + 1,
      known_count: (existing?.known_count || 0) + (known ? 1 : 0),
      box, next_review_at: next.toISOString().split('T')[0], last_reviewed_at: new Date().toISOString(),
    };
    if (existing) await supabase.from('flashcard_reviews').update(patch).eq('user_id', user!.id).eq('card_id', card.id);
    else await supabase.from('flashcard_reviews').insert(patch);
    setReviews((p) => ({ ...p, [card.id]: { ...(existing || ({} as any)), ...patch } as Review }));
    setRevealed(false);
    setReviewIdx((i) => (i === null ? null : i + 1));
  };

  // Deck list view
  if (!openDeck) {
    return (
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          <PageHeader chip="FLASHCARDS" title={<>Formulas on <span className="gradient-text-aurora">repeat</span></>} subtitle="Spaced-repetition decks for formulas, reactions and concepts" actions={
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground rounded-full"><Plus className="h-4 w-4 mr-1" />New deck</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New flashcard deck</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Deck title — e.g. Organic reactions" value={newDeck.title} onChange={(e) => setNewDeck({ ...newDeck, title: e.target.value })} />
                  <Select value={newDeck.deck_type} onValueChange={(v) => setNewDeck({ ...newDeck, deck_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DECK_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Subject (optional)" value={newDeck.subject} onChange={(e) => setNewDeck({ ...newDeck, subject: e.target.value })} />
                  <Button className="w-full gradient-primary text-primary-foreground" onClick={createDeck}>Create deck</Button>
                </div>
              </DialogContent>
            </Dialog>
          } />

          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : decks.length === 0 ? (
            <WindowCard title="No decks yet"><p className="text-sm text-muted-foreground p-2">Create your first deck — drop every formula that keeps slipping.</p></WindowCard>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {decks.map((d) => (
                <WindowCard key={d.id} title={d.title} right={<Badge variant="outline" className="capitalize">{d.deck_type}</Badge>}>
                  <div className="flex items-center justify-between p-1">
                    <p className="text-sm text-muted-foreground">{d.card_count} cards {d.subject ? `· ${d.subject}` : ''}</p>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => openDeckDetail(d)}><BookOpen className="h-4 w-4 mr-1" />Open</Button>
                  </div>
                </WindowCard>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Deck detail / review view
  const dueCards = cards.filter((c) => !reviews[c.id]?.next_review_at || reviews[c.id].next_review_at <= new Date().toISOString().split('T')[0]);
  const reviewing = reviewIdx !== null && dueCards[reviewIdx];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => { setOpenDeck(null); setReviewIdx(null); }}><ChevronLeft className="h-4 w-4 mr-1" />All decks</Button>
        <PageHeader chip="DECK" title={openDeck.title} subtitle={`${cards.length} cards · ${dueCards.length} due for review`} actions={
          <Button className="gradient-primary text-primary-foreground rounded-full" disabled={!dueCards.length} onClick={() => { setReviewIdx(0); setRevealed(false); }}>
            <Brain className="h-4 w-4 mr-1" />Review {dueCards.length}
          </Button>
        } />

        {reviewing ? (
          <WindowCard title={`Card ${reviewIdx + 1}/${dueCards.length}`}>
            <div className="space-y-4 p-1 min-h-[220px] flex flex-col">
              <MathText block className="text-lg font-semibold">{reviewing.front}</MathText>
              {revealed ? (
                <>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/30"><MathText block className="text-sm">{reviewing.back}</MathText></div>
                  <div className="mt-auto flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => reviewCard(reviewing, false)}><X className="h-4 w-4 mr-1 text-destructive" />Again</Button>
                    <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => reviewCard(reviewing, true)}><Check className="h-4 w-4 mr-1" />Knew it</Button>
                  </div>
                </>
              ) : (
                <Button className="mt-auto gradient-primary text-primary-foreground" onClick={() => setRevealed(true)}>Reveal answer</Button>
              )}
            </div>
          </WindowCard>
        ) : (
          <>
            <WindowCard title="Add a card">
              <div className="space-y-2 p-1">
                <Textarea placeholder="Front — question / formula name" value={newCard.front} onChange={(e) => setNewCard({ ...newCard, front: e.target.value })} rows={2} />
                <Textarea placeholder="Back — answer / formula" value={newCard.back} onChange={(e) => setNewCard({ ...newCard, back: e.target.value })} rows={2} />
                <Button size="sm" variant="secondary" onClick={addCard}><Plus className="h-4 w-4 mr-1" />Add card</Button>
              </div>
            </WindowCard>

            <div className="space-y-2">
              {cards.map((c) => {
                const rv = reviews[c.id];
                return (
                  <WindowCard key={c.id} title={undefined as any} right={
                    <div className="flex items-center gap-2 text-[10px] font-mono-hud text-muted-foreground">
                      {rv && <span>box {rv.box} · next {rv.next_review_at}</span>}
                    </div>
                  }>
                    <div className="p-1 space-y-1">
                      <MathText block className="text-sm font-medium">{c.front}</MathText>
                      <MathText block className="text-sm text-muted-foreground">{c.back}</MathText>
                    </div>
                  </WindowCard>
                );
              })}
              {cards.length === 0 && <WindowCard title="Empty deck"><p className="text-sm text-muted-foreground p-2">Add your first card above.</p></WindowCard>}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Flashcards;
