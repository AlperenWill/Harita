import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Gamepad2, Map, MapPin, Sparkles, Trophy } from 'lucide-react';
import { CITIES, SITES } from '../data';
import { useProgress } from '../lib/progress';

export default function Home() {
  const progress = useProgress();
  const played = Object.keys(progress.sites).length;
  const points = Object.values(progress.sites).reduce((n, s) => n + s.best, 0);

  return (
    <div className="animate-fade-up">
      <section className="flex flex-col items-center px-2 pb-10 pt-8 text-center sm:pt-14">
        <span className="chip mb-5 border border-brand-100 bg-brand-50 px-3 py-1 text-sm text-brand"><Sparkles size={14} /> 81 il · {SITES.length} tarihi nokta</span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Türkiye’yi <span className="text-brand">Keşfet</span></h1>
        <p className="mt-4 max-w-xl text-lg text-ink-muted">Haritada şehirleri gez, tarihi yerleri öğren ve her keşfi bir oyunla taçlandır.</p>
        <Link to="/harita" className="btn-primary mt-8 h-14 px-8 text-lg shadow-lg shadow-brand/25">
          <Map size={22} /> Haritayı Aç
        </Link>
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold">Oyun Hakkında</h2>
        <p className="mt-2 text-ink-muted">
          Türkiye’yi Keşfet, 81 ilin tarihi ve kültürel mirasını eğlenceli bir şekilde öğrenmen için hazırlandı.
          UNESCO alanlarından az bilinen hanlara, köprülerden yaşayan geleneklere kadar her nokta için kısa bir bilgi oyunu seni bekliyor.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPin, t: 'Şehrini seç', d: 'Haritada bir işaretçiye dokun ya da Oyunlar listesinden bir il aç.' },
            { icon: Gamepad2, t: 'Oyuna başla', d: 'Tarihi yer hakkında 5 soru; her doğru cevap 20 puan.' },
            { icon: Trophy, t: 'Rekorunu kır', d: 'En iyi skorların kaydedilir. Genel test ile bilgini ölç.' },
          ].map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="rounded-xl border border-line bg-canvas p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-brand"><Icon size={18} /> {i + 1}. adım</span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <Link to="/oyunlar" className="btn-ghost h-11 px-4"><Gamepad2 size={18} /> Oyunlara git</Link>
          <Link to="/test" className="btn-ghost h-11 px-4"><ClipboardCheck size={18} /> Genel Test</Link>
          <span className="ml-auto text-sm text-ink-muted">
            İlerlemen: <b className="text-ink">{played}</b> / {SITES.length} oyun · <b className="text-ink">{points}</b> puan · {CITIES.length} il
          </span>
        </div>
      </section>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Anadolu’yu üç boyutlu gezmek ister misin?{' '}
        <a href={`${import.meta.env.BASE_URL}3d/`} className="font-semibold text-brand hover:underline">3D Anadolu Mirası haritasını aç <ArrowRight size={14} className="inline" /></a>
      </p>
    </div>
  );
}
