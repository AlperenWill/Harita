import { Link } from 'react-router-dom';
import { Gamepad2, Map, MapPin, Play } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PLAYABLES, playableUrl, type Playable } from '../../data/playables';
import { displayProvince } from '../../data/regions';

/** Oyunun bağlantısı: uygulama içi oyunlar router ile, public/ altındakiler doğrudan */
function GameLink({ p }: { p: Playable }) {
  const cls = 'group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md';
  const inner = (
    <>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-2xl" aria-hidden>{p.emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{p.name}</span>
        <span className="block truncate text-sm text-ink-muted">{p.title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted"><MapPin size={12} /> {displayProvince(p.province)}{p.depth === 'kisa' && <span className="chip ml-1 bg-teal-50 text-teal-700">kısa</span>}</span>
      </span>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white transition group-hover:scale-105" aria-hidden><Play size={16} fill="currentColor" /></span>
    </>
  );
  return p.kind === 'route'
    ? <Link to={`/${p.path}`} className={cls} aria-label={`${p.name}: ${p.title} — oyna`}>{inner}</Link>
    : <a href={playableUrl(p, import.meta.env.BASE_URL)} className={cls} aria-label={`${p.name}: ${p.title} — oyna`}>{inner}</a>;
}

export default function Home() {
  const provinces = new Set(PLAYABLES.map((p) => p.province)).size;
  return (
    <div className="animate-fade-up">
      <section className="flex flex-col items-center px-2 pb-10 pt-6 text-center sm:pt-12">
        <span className="chip mb-5 border border-brand-100 bg-brand-50 px-3 py-1 text-sm text-brand"><Gamepad2 size={14} /> {PLAYABLES.length} oynanabilir yer · {provinces} il</span>
        <h1 className="rounded-3xl bg-ink px-8 py-4 text-5xl sm:text-7xl"><Logo /></h1>
        <p className="mt-6 max-w-xl text-lg text-ink-muted">Türkiye’nin tarihi yerlerini haritada bul, her birini kısa bir 3D oyunla gez.</p>
        <Link to="/harita" className="btn-primary mt-8 h-14 w-full max-w-xs px-8 text-lg shadow-lg shadow-brand/25 sm:w-auto">
          <Map size={22} /> Haritayı Aç
        </Link>
      </section>

      <section aria-labelledby="oyunlar">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="oyunlar" className="text-xl font-bold">Oynanabilir yerler</h2>
          <span className="text-sm text-ink-muted">Yeni yerler eklendikçe haritada açılır</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYABLES.map((p) => <li key={p.id}><GameLink p={p} /></li>)}
        </ul>
      </section>

      <section className="card mt-8 p-5 sm:p-7">
        <h2 className="text-lg font-bold">Nasıl oynanır?</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { t: 'Bölgeyi seç', d: 'Haritada renkli bir bölgeye dokun. Gri bölgelerin oyunları henüz hazır değil.' },
            { t: 'İli ve yeri seç', d: 'İle yaklaş, kırmızı noktaya ya da alttaki listeden bir yere dokun.' },
            { t: 'Oyna', d: 'Karttaki “Oyna” ile oyunu aç. Oyundan çıkınca haritaya dönersin.' },
          ].map(({ t, d }, i) => (
            <li key={t} className="rounded-xl border border-line bg-canvas p-4">
              <span className="text-sm font-semibold text-brand">{i + 1}. adım</span>
              <p className="mt-1 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
