/**
 * Kapalıçarşı — esnaf diyaloğu (arayüz). Mantık clues.ts'de (saf, testli).
 * Esnafın yanına gelince kutu açılır: selam + beş soru. Cevap daktilo efektiyle yazılır, isteğe bağlı sesli okunur ve DEFTERE eklenir
 * (hangi esnaf, nerede, ne dedi). Yanıltıcı soru da deftere girer: oyuncu ancak dükkânda "benzer ama sahte" eşyayı görünce anlar.
 * Şanlıurfa/Kız Kulesi diyaloglarıyla aynı yerleşim: altta kutu, isim etiketi, dokun: geç.
 */
import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { TRADE_LABEL, type Esnaf, type Layout } from './ProceduralStreetGenerator';
import { QUESTIONS, answer, esnafTitle, type Clue, type Question } from './clues';

const GREET = ['Hoş geldin, buyur!', 'Buyurun, ne bakmıştınız?', 'Gel bakalım, bir çay içer misin?', 'Hayırdır, bir şey mi arıyorsun?'];
export function DialogueBox({ L, e, asked, onAsk, onClose, speak }: { L: Layout; e: Esnaf; asked: Question[]; onAsk: (c: Clue) => void; onClose: () => void; speak: (t: string) => void }) {
  const [last, setLast] = useState<Clue | null>(null), [n, setN] = useState(0);
  const text = last ? last.text : `${GREET[e.id % GREET.length]} Ben ${esnafTitle(e)}, ${TRADE_LABEL[e.trade].esnaf}ım.`;
  useEffect(() => { setN(0); const t0 = performance.now(); let raf = 0; const loop = () => { const k = Math.floor(((performance.now() - t0) / 1000) * 45); setN(k); if (k < text.length) raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); speak(text); return () => cancelAnimationFrame(raf); }, [text]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="absolute inset-x-3 bottom-3 z-40 mx-auto max-w-2xl sm:bottom-6" onPointerDown={(ev) => ev.stopPropagation()}>
      <div className="rounded-2xl bg-[#f7f5f1]/92 text-[#1f1b17] ring-1 ring-black/5 p-4 shadow-[0_10px_30px_rgba(31,27,23,0.18)] backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#b5652a] px-2.5 py-0.5 text-xs font-bold text-white">{esnafTitle(e)}</span>
          <span className="text-[11px] text-[#857b70]">{TRADE_LABEL[e.trade].esnaf}</span>
          <button onClick={onClose} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-black/5" aria-label="Teşekkür et ve ayrıl"><X size={16} /></button>
        </div>
        <p className="mt-2 min-h-[3rem] text-[15px] leading-relaxed">{text.slice(0, n)}<span className="opacity-0">{text.slice(n)}</span></p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <button key={q.id} onClick={() => { const c = answer(L, e, q.id); setLast(c); onAsk(c); }}
              className={`flex min-h-[2.5rem] items-center gap-2 rounded-xl px-3 text-left text-sm ${asked.includes(q.id) ? 'bg-white/5 text-[#857b70]' : 'bg-white/12 bg-black/5 hover:bg-black/5'}`}>
              <MessageCircle size={14} className="shrink-0 text-[#b5652a]" />{q.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
