import { Link } from 'react-router-dom';
import { Bot, Map, MapPin, Sparkles, Stamp } from 'lucide-react';
import { CITIES, SITES } from '../data';
import { Logo } from '../components/Logo';

export default function Home() {
  return (
    <div className="animate-fade-up">
      <section className="flex flex-col items-center px-2 pb-10 pt-8 text-center sm:pt-14">
        <span className="chip mb-5 border border-brand-100 bg-brand-50 px-3 py-1 text-sm text-brand"><Sparkles size={14} /> {CITIES.length} il · {SITES.length} tarihi nokta</span>
        <h1 className="rounded-3xl bg-ink px-8 py-4 text-5xl sm:text-7xl"><Logo /></h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">Türkiye’nin 81 ilindeki tarihi ve kültürel mirası üç boyutlu harita üzerinde keşfet.</p>
        <Link to="/harita" className="btn-primary mt-8 h-14 px-8 text-lg shadow-lg shadow-brand/25">
          <Map size={22} /> Haritayı Aç
        </Link>
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-xl font-bold">Oyun Hakkında</h2>
        <p className="mt-2 text-ink-muted">
          Miras., Anadolu’nun tarihi ve kültürel mirasını gerçek il sınırlarıyla çizilmiş 3D bir harita üzerinde gezmen için hazırlandı.
          UNESCO alanlarından az bilinen hanlara, köprülerden yaşayan geleneklere kadar her nokta seni bekliyor.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { icon: MapPin, t: 'Bölge ve il seç', d: 'Haritada önce bir bölgeye, sonra bir ile dokun; kamera yumuşakça yaklaşır.' },
            { icon: Stamp, t: 'Mirası keşfet', d: 'Tarihi noktalara tıkla, 3D modeli ve bilgi kartını incele, mühürünü topla.' },
            { icon: Bot, t: 'Asistana sor', d: 'Sağ alttaki asistana bir şehir ya da tarihi yer sor, sana anlatsın.' },
          ].map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="rounded-xl border border-line bg-canvas p-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-brand"><Icon size={18} /> {i + 1}. adım</span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
