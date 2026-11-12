import { useState } from 'react';
import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { Question } from '../lib/quiz';

interface Props {
  questions: Question[];
  pointsPer: number;
  onFinish: (score: number, correct: number) => void;
  onRestart: () => void;
  extraEnd?: React.ReactNode;
}

/** Ortak quiz motoru: soru + 4 seçenek, anında geri bildirim, puan, ilerleme çubuğu, bitiş ekranı. */
export function QuizRunner({ questions, pointsPer, onFinish, onRestart, extraEnd }: Props) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<{ q: Question; picked: number }[]>([]);
  const [done, setDone] = useState(false);
  const q = questions[i];
  const total = questions.length;

  function choose(k: number) {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) setCorrect((c) => c + 1); else setWrong((w) => [...w, { q, picked: k }]);
  }
  function next() {
    if (i + 1 >= total) { setDone(true); onFinish(correct * pointsPer, correct); return; }
    setI(i + 1); setPicked(null);
  }

  if (done) {
    const score = correct * pointsPer, max = total * pointsPer, pct = Math.round((correct / total) * 100);
    const msg = pct === 100 ? 'Kusursuz! Gerçek bir kâşifsin.' : pct >= 70 ? 'Harika iş çıkardın!' : pct >= 40 ? 'Güzel başlangıç, biraz daha keşfet!' : 'Tekrar dene, her denemede öğreniyorsun.';
    return (
      <div className="card animate-fade-up p-6 text-center sm:p-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand"><Trophy size={32} /></span>
        <h2 className="mt-4 text-2xl font-bold">Oyun bitti!</h2>
        <p className="mt-1 text-ink-muted">{msg}</p>
        <p className="mt-5 text-5xl font-extrabold text-brand">{score}<span className="text-2xl text-ink-muted"> / {max}</span></p>
        <p className="mt-1 text-sm text-ink-muted">{correct} doğru · {total - correct} yanlış</p>
        {wrong.length > 0 && (
          <div className="mt-6 space-y-2 text-left">
            <p className="text-sm font-semibold">Yanlış cevapların</p>
            {wrong.map(({ q: w, picked: p }, k) => (
              <div key={k} className="rounded-xl border border-line bg-canvas p-3 text-sm">
                <p className="font-medium">{w.q}</p>
                <p className="mt-1 text-red-600">Senin cevabın: {w.options[p]}</p>
                <p className="text-emerald-700">Doğru cevap: {w.options[w.answer]}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn-primary h-12 px-6" onClick={() => { setI(0); setPicked(null); setCorrect(0); setWrong([]); setDone(false); onRestart(); }}>
            <RotateCcw size={18} /> Tekrar Oyna
          </button>
          {extraEnd}
        </div>
      </div>
    );
  }

  const answered = picked !== null, isRight = picked === q.answer;
  return (
    <div className="card p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-muted">Soru {i + 1} / {total}</span>
        <span className="chip bg-brand-50 text-brand">Puan: {correct * pointsPer}</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={i + (answered ? 1 : 0)}>
        <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${((i + (answered ? 1 : 0)) / total) * 100}%` }} />
      </div>
      <h2 className="text-lg font-semibold leading-snug sm:text-xl">{q.q}</h2>
      <div className="mt-5 grid gap-3">
        {q.options.map((o, k) => {
          const state = !answered ? 'idle' : k === q.answer ? 'right' : k === picked ? 'wrong' : 'dim';
          return (
            <button
              key={k} onClick={() => choose(k)} disabled={answered}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition ${
                state === 'idle' ? 'border-line bg-white hover:border-brand hover:bg-brand-50/40' :
                state === 'right' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' :
                state === 'wrong' ? 'border-red-500 bg-red-50 text-red-900' : 'border-line bg-white opacity-60'}`}
            >
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold ${state === 'right' ? 'bg-emerald-500 text-white' : state === 'wrong' ? 'bg-red-500 text-white' : 'bg-slate-100 text-ink-muted'}`}>
                {'ABCD'[k]}
              </span>
              <span className="flex-1">{o}</span>
              {state === 'right' && <CheckCircle2 className="shrink-0 text-emerald-600" size={20} />}
              {state === 'wrong' && <XCircle className="shrink-0 text-red-600" size={20} />}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-5 animate-fade-up rounded-xl p-4 text-sm ${isRight ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`} role="status">
          <p className="font-semibold">{isRight ? `Doğru! +${pointsPer} puan` : `Yanlış. Doğru cevap: ${q.options[q.answer]}`}</p>
          {q.explain && <p className="mt-1 opacity-90">{q.explain}</p>}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button className="btn-primary h-11 px-6" onClick={next} disabled={!answered}>{i + 1 >= total ? 'Sonucu gör' : 'Sonraki soru'}</button>
      </div>
    </div>
  );
}
