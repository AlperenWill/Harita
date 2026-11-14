import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Map as MapIcon, MapPin, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { JournalPanel } from '../istanbul/Journal';
import { LandscapeGate } from '../../games/core/LandscapeGate';
import { detectTier } from '../../games/core/device';
import { GAME_BY_ID } from '../../games/core/registry';
import { useProgress } from '../../games/core/progress';
import type { GameDefinition as IstanbulSite } from '../../games/core/types';
import type { MapCamApi } from '../istanbul/IstanbulMap';

const MapScene = lazy(() => import('../istanbul/IstanbulMap'));

/** İstanbul Katmanları: ana harita (birleştirici katman) */
export default function IstanbulPage() {
  const navigate = useNavigate();
  const tier = useMemo(() => detectTier(), []);
  const api = useRef<MapCamApi | null>(null);
  const lastSite = useProgress((s) => s.lastGame);
  const [fade, setFade] = useState(false);
  const [journal, setJournal] = useState(() => window.innerWidth >= 1024);
  const busy = useRef(false);

  // Harita yalnızca giriş kapısıdır: kamera yapıya alçalır, ekran kararır ve o yapının bağımsız oyunu yüklenir
  const pick = async (s: IstanbulSite) => {
    if (busy.current) return; busy.current = true;
    await api.current?.flyTo(s);
    setFade(true);
    setTimeout(() => navigate(`/istanbul/${s.id}`), 450);
  };
  useEffect(() => () => { busy.current = false; }, []);

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-[#e9eef0] lg:h-[100dvh]">
      <Suspense fallback={<div className="grid h-full place-items-center text-ink-muted" role="status">Harita hazırlanıyor…</div>}>
        <MapScene tier={tier} apiRef={api} onPick={pick} startNear={!!lastSite} />
      </Suspense>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start gap-2 p-3">
        <div className="pointer-events-auto rounded-xl bg-ink px-4 py-2 shadow-card">
          <p className="text-lg leading-tight"><Logo suffix="İstanbul" /></p>
          <p className="text-[11px] text-white/70">UNESCO · Her yapı bir oyun</p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button onClick={() => api.current?.overview()} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white/90 px-3 text-sm font-medium shadow-card backdrop-blur hover:bg-white"><MapIcon size={16} /> Tüm İstanbul</button>
          <button onClick={() => api.current?.toPeninsula()} className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-white/90 px-3 text-sm font-medium shadow-card backdrop-blur hover:bg-white"><MapPin size={16} /> Tarihi Yarımada</button>
        </div>
        <button onClick={() => setJournal((j) => !j)} aria-expanded={journal}
          className="pointer-events-auto ml-auto inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-card hover:bg-brand-600">
          <BookOpenCheck size={17} /> Keşif Günlüğü
        </button>
      </header>

      {journal && (
        <aside className="absolute bottom-3 right-3 top-[4.5rem] z-30 w-[300px] max-w-[calc(100%-1.5rem)] animate-fade-up overflow-y-auto rounded-2xl border border-line bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Keşif Günlüğü</h2>
            <button onClick={() => setJournal(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Kapat"><X size={16} /></button>
          </div>
          <JournalPanel onPick={(id) => pick(GAME_BY_ID[id])} />
          <p className="mt-4 text-[11px] leading-relaxed text-ink-muted">İlçe sınırları: ozanyerli/istanbul-districts-geojson. Bilgiler her yapının kaynak listesine dayanır.</p>
        </aside>
      )}

      <div className={`pointer-events-none fixed inset-0 z-[1100] bg-ink transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
      <LandscapeGate />
    </div>
  );
}
