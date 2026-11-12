import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, ChevronDown, ExternalLink, MapPin, Play, Search, Trophy } from 'lucide-react';
import { CITIES, EXTRA_GAMES, gameCount, norm, type City } from '../data';
import { useProgress } from '../lib/progress';
import { RegionIcon } from '../components/RegionIcon';

export default function GamesPage() {
  const [params, setParams] = useSearchParams();
  const openId = params.get('il');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = norm(q.trim());
    return t ? CITIES.filter((c) => norm(c.name).includes(t) || c.sites.some((s) => norm(s.name).includes(t))) : CITIES;
  }, [q]);

  const toggle = (id: string) => setParams(openId === id ? {} : { il: id }, { replace: true });

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Türkiye’yi Keşfet</h1>
        <p className="mt-2 text-ink-muted">81 şehri keşfet, tarihi yerleri öğren</p>
      </header>
      <div className="relative mb-5">
        <Search size={18} className="absolute left-3.5 top-3.5 text-ink-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Şehir ya da tarihi yer ara…" aria-label="Ara"
          className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 shadow-card outline-none focus:border-brand" />
      </div>
      <p className="mb-3 text-sm text-ink-muted">{list.length} il listeleniyor</p>
      <div className="space-y-3">
        {list.map((c) => <CityCard key={c.id} city={c} open={openId === c.id} onToggle={() => toggle(c.id)} />)}
        {list.length === 0 && <p className="card p-6 text-center text-ink-muted">Sonuç bulunamadı.</p>}
      </div>
    </div>
  );
}

function CityCard({ city, open, onToggle }: { city: City; open: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useProgress();
  const done = city.sites.filter((s) => progress.sites[s.id]).length;
  // Açılan karta kaydır: ilk yüklemede (haritadan gelince) anında, sayfa içindeyken yumuşak
  const firstRender = useRef(true);
  useEffect(() => {
    const instant = firstRender.current; firstRender.current = false;
    if (open) setTimeout(() => ref.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' }), 60);
  }, [open]);
  const panelId = `city-${city.id}`;

  return (
    <div ref={ref} className={`card scroll-mt-20 overflow-hidden transition ${open ? 'ring-1 ring-brand/30' : ''}`}>
      <button onClick={onToggle} aria-expanded={open} aria-controls={panelId}
        className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-slate-50/60 sm:px-5">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${open ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}>
          <RegionIcon region={city.region} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold">{city.name}</span>
          <span className="block text-sm text-ink-muted">Tarihi ve Kültürel Keşif</span>
        </span>
        {done > 0 && <span className="chip hidden bg-emerald-50 text-emerald-700 sm:inline-flex"><Trophy size={12} /> {done}</span>}
        <span className="chip bg-brand-50 text-brand">{gameCount(city)} oyun</span>
        <ChevronDown size={20} className={`shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="animate-fade-up border-t border-line bg-canvas px-4 py-4 sm:px-5">
          <p className="mb-4 text-sm text-ink-muted">{city.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {city.sites.map((s) => {
              const best = progress.sites[s.id]?.best;
              return (
                <article key={s.id} className="flex flex-col rounded-xl border border-line bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug">{s.name}</h3>
                    {best !== undefined && <span className="chip shrink-0 bg-emerald-50 text-emerald-700"><Trophy size={12} /> {best}</span>}
                  </div>
                  <p className="mt-1.5 line-clamp-3 text-sm text-ink-muted">{s.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1"><MapPin size={13} /> {s.district ? `${s.district}, ${city.name}` : city.name}</span>
                    <span className="chip bg-slate-100 text-slate-600">{s.periodLabel}</span>
                  </div>
                  <Link to={`/oyun/${s.id}`} className="btn-primary mt-4 h-10 text-sm"><Play size={16} /> Oyuna Başla</Link>
                </article>
              );
            })}
            {EXTRA_GAMES[city.id]?.map((g) => (
              <article key={g.href} className="flex flex-col rounded-xl border border-brand/30 bg-white p-4">
                <span className="chip w-fit bg-brand text-white"><Box size={12} /> 3D Macera</span>
                <h3 className="mt-2 font-semibold">{g.title}</h3>
                <p className="mt-1.5 text-sm text-ink-muted">{g.desc}</p>
                <a href={`${import.meta.env.BASE_URL}${g.href}`} target="_blank" rel="noreferrer" className="btn-ghost mt-4 h-10 text-sm">
                  <ExternalLink size={16} /> Oyuna Başla
                </a>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
