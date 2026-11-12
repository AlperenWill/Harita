import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { askAssistant, type ChatMessage } from '../lib/assistant';

const KEY = 'tk-chat-v1';
const WELCOME: ChatMessage = { role: 'assistant', text: 'Merhaba! Ben Keşif Asistanı. Bir şehir ya da tarihi yer sor, sana anlatayım.' };
const SUGGEST = ['Efes hakkında bilgi', 'Kars’ta ne görülür?', 'UNESCO alanları', 'Nasıl oynanır?'];

export const clearChat = () => { try { localStorage.removeItem(KEY); } catch { /* yok */ } };

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMessage[]>(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(s) && s.length) return s; } catch { /* yok */ }
    return [WELCOME];
  });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))); } catch { /* yok */ } }, [msgs]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs, open, busy]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function send(text: string) {
    const t = text.trim(); if (!t || busy) return;
    const next = [...msgs, { role: 'user' as const, text: t }];
    setMsgs(next); setInput(''); setBusy(true);
    const reply = await askAssistant(next);
    setMsgs((m) => [...m, reply]); setBusy(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-[1100] grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition hover:bg-brand-600 active:scale-95"
        aria-label={open ? 'Asistanı kapat' : 'AI asistanı aç'}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Bot size={26} />}
      </button>

      {open && (
        <section
          className="fixed bottom-24 right-4 z-[1100] flex h-[min(560px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2rem))] animate-fade-up flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
          role="dialog" aria-label="Keşif Asistanı"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand"><Sparkles size={18} /></span>
            <div>
              <p className="font-semibold">Keşif Asistanı</p>
              <p className="text-xs text-ink-muted">Şehirler ve tarihi yerler hakkında sor</p>
            </div>
          </header>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-line bg-white text-ink'}`}>
                  {m.text}
                  {m.links && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.links.map((l) => (
                        <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="chip bg-brand-50 text-brand hover:bg-brand-100">{l.label} →</Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="w-16 rounded-2xl border border-line bg-white px-3 py-2 text-ink-muted"><span className="animate-pulse">•••</span></div>}
          </div>
          {msgs.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line px-3 pt-3">
              {SUGGEST.map((s) => <button key={s} onClick={() => send(s)} className="chip border border-line bg-white text-ink-muted hover:border-brand hover:text-brand">{s}</button>)}
            </div>
          )}
          <form className="flex gap-2 p-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Bir şehir ya da tarihi yer yaz…" aria-label="Mesaj"
              className="h-11 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
            />
            <button className="btn-primary h-11 w-11 !p-0" disabled={!input.trim() || busy} aria-label="Gönder"><Send size={18} /></button>
          </form>
        </section>
      )}
    </>
  );
}
