import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const NexusAIChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user || !open) return;
    const loadHistory = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data && data.length > 0) {
        setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      }
    };
    loadHistory();
  }, [user, open]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content: userMsg.content });

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-ai-chat`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].slice(-20), userId: user.id }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed to connect to Nexus AI');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {}
        }
      }

      if (assistantContent) {
        await supabase.from('chat_messages').insert({ user_id: user.id, role: 'assistant', content: assistantContent });
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I\'m having trouble connecting. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 h-16 w-16 rounded-full gradient-primary flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6 text-primary-foreground" /> : <MessageCircle className="h-6 w-6 text-primary-foreground" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-40 md:bottom-28 right-4 md:right-6 z-50 w-[min(92vw,30rem)] h-[min(72vh,42rem)] glass-card flex flex-col shadow-2xl">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Nexus AI</h3>
              <p className="text-xs text-muted-foreground">Your larger, smarter study assistant</p>
            </div>
            <div className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Live insights</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-10 px-3">
                <Bot className="h-10 w-10 mx-auto mb-3 text-primary" />
                <p>Hi! I’m Nexus AI. Ask about performance, weak topics, revision strategy, or what to do today.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm max-w-[84%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:text-foreground prose-strong:text-foreground">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="bg-secondary rounded-xl px-3 py-2 text-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border bg-card/70">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about your tests, weak areas, or daily plan..."
                className="flex-1 text-sm"
                disabled={loading}
              />
              <Button type="submit" size="icon" className="gradient-primary shrink-0" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4 text-primary-foreground" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
