import { useMemo, useState } from 'react';
import { ClipboardCheck, Play } from 'lucide-react';
import { buildGeneralQuiz, GENERAL_QUIZ_SIZE } from '../lib/generalQuiz';
import { seeded } from '../lib/random';
import { recordTest, useProgress } from '../lib/progress';
import { QuizRunner } from '../components/QuizRunner';

export default function TestPage() {
  const [round, setRound] = useState<number | null>(null);
  const progress = useProgress();
  const questions = useMemo(() => (round === null ? [] : buildGeneralQuiz(seeded(Date.now() + round))), [round]);

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Genel Türkiye Testi</h1>
        <p className="mt-2 text-ink-muted">{GENERAL_QUIZ_SIZE} soruluk çoktan seçmeli test. Her doğru cevap 5 puan.</p>
      </header>
      {round === null ? (
        <div className="card p-6 text-center sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand"><ClipboardCheck size={32} /></span>
          <p className="mx-auto mt-4 max-w-md text-ink-muted">Coğrafya, tarih ve kültürel miras sorularıyla Türkiye bilgini ölç. Zaman sınırı yok.</p>
          {progress.test && <p className="mt-3 text-sm">En iyi skorun: <b className="text-brand">{progress.test.best}</b> / 100 · Son: {progress.test.last}</p>}
          <button className="btn-primary mx-auto mt-6 h-12 px-8" onClick={() => setRound(0)}><Play size={18} /> Teste Başla</button>
        </div>
      ) : (
        <QuizRunner key={round} questions={questions} pointsPer={5} onFinish={(s) => recordTest(s)} onRestart={() => setRound((r) => (r ?? 0) + 1)} />
      )}
    </div>
  );
}
