import { Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRef } from 'react';
import { ArrowLeft, BatteryLow, DoorOpen, Footprints, Home, Lightbulb, Moon, Plane, RotateCw, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { walkInput } from '../monuments/walkInput';
import { MONUMENTS } from '../monuments/registry';
import { useMonumentStore } from '../monuments/store';
import { supportsWebGL, useDeviceProfile } from '../monuments/useDeviceProfile';
import type { MonumentData, Quality, TimeOfDay } from '../monuments/types';
import { PLAZA, MAUSOLEUM, LION_ROAD, HOTSPOTS, STAIRS, STAIRS_DEPTH, STAIR_X0, WALK, buildings, towers } from '../monuments/anitkabir/layout';
import NotFound from './NotFound';

const TIMES: { id: TimeOfDay; label: string; icon: typeof Sun }[] = [
  { id: 'sabah', label: 'Sabah', icon: Sunrise }, { id: 'ogle', label: 'Öğle', icon: Sun },
  { id: 'aksam', label: 'Akşam', icon: Sunset }, { id: 'gece', label: 'Gece', icon: Moon },
];
const QUALITY_LABEL: Record<Quality, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };

export default function MonumentPage() {
  const { id = '' } = useParams();
  const entry = MONUMENTS[id];
  const active = useMonumentStore((s) => s.activeMonument);
  const cameraTarget = useMonumentStore((s) => s.cameraTarget);
  const { portrait, isMobile } = useDeviceProfile();
  const [hintClosed, setHintClosed] = useState(false);

  // Rota = durum: sayfaya girilince activeMonument ayarlanır, sahne tembel yüklenir; çıkınca boşaltılır
  useEffect(() => {
    if (!entry) return;
    useMonumentStore.getState().setActiveMonument(id);
    return () => useMonumentStore.getState().setActiveMonument(null);
  }, [id, entry]);

  if (!entry) return <div className="p-6"><NotFound /></div>;
  const { data, Scene } = entry;

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden bg-slate-200 lg:h-[100dvh]">
      {supportsWebGL ? (
        <Suspense fallback={<Skeleton name={data.metadata.name} />}>
          {active === id && <Scene isActive cameraTarget={cameraTarget} onPointClick={() => {}} />}
        </Suspense>
      ) : <StaticFallback data={data} />}

      <TopBar data={data} />
      {supportsWebGL && <Controls />}
      {supportsWebGL && <WalkPad />}
      <InfoPanel data={data} />

      {isMobile && portrait && !hintClosed && (
        <div className="absolute inset-x-3 top-16 z-40 flex items-center gap-3 rounded-xl bg-ink/90 px-3 py-2.5 text-sm text-white shadow-lg" role="status">
          <RotateCw size={18} className="shrink-0 text-brand" />
          <span className="flex-1">Daha geniş bir görüş için telefonunu yatay çevir.</span>
          <button onClick={() => setHintClosed(true)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label="Kapat"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}

function TopBar({ data }: { data: MonumentData }) {
  const saver = useMonumentStore((s) => s.batterySaver);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 p-3">
      <Link to="/harita" className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-semibold shadow-card backdrop-blur hover:bg-white">
        <ArrowLeft size={18} /> Harita
      </Link>
      <div className="pointer-events-auto rounded-xl bg-white/90 px-4 py-2 shadow-card backdrop-blur">
        <h1 className="text-base font-bold leading-tight">{data.metadata.name}</h1>
        <p className="text-xs text-ink-muted">{data.metadata.city} · {data.metadata.built}</p>
      </div>
      {saver && (
        <span className="pointer-events-auto ml-auto inline-flex h-11 items-center gap-1.5 rounded-xl bg-amber-100 px-3 text-xs font-semibold text-amber-900 shadow-card">
          <BatteryLow size={16} /> Pil tasarrufu
        </span>
      )}
    </div>
  );
}

function Controls() {
  const time = useMonumentStore((s) => s.timeOfDay);
  const quality = useMonumentStore((s) => s.quality);
  const saver = useMonumentStore((s) => s.batterySaver);
  const panelOpen = useMonumentStore((s) => s.selectedPoint !== null);
  const walking = useMonumentStore((s) => s.mode === 'walk');
  const st = useMonumentStore.getState();
  const next: Record<Quality, Quality> = { high: 'medium', medium: 'low', low: 'high' };
  return (
    <div className={`pointer-events-none absolute bottom-3 left-3 z-30 max-w-[calc(100%-6rem)] flex-wrap items-end gap-2 ${panelOpen ? 'hidden sm:flex' : 'flex'}`}>
      <div className={`pointer-events-auto rounded-xl bg-white/90 p-1 shadow-card backdrop-blur ${walking ? 'hidden [@media(pointer:fine)]:flex' : 'flex'}`} role="radiogroup" aria-label="Günün saati">
        {TIMES.map(({ id, label, icon: Icon }) => (
          <button key={id} role="radio" aria-checked={time === id} onClick={() => st.setTimeOfDay(id)}
            className={`flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition ${time === id ? 'bg-brand text-white' : 'text-ink-muted hover:bg-slate-100'}`}>
            <Icon size={17} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
      {walking ? (
        <>
          <button onClick={() => st.setMode('orbit')} className="pointer-events-auto inline-flex h-[52px] items-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-card hover:bg-brand-600">
            <Plane size={17} /> Kuş bakışı
          </button>
          <button onClick={() => st.teleportTo(WALK.door.x, WALK.door.z, WALK.door.yaw)} className="pointer-events-auto inline-flex h-[52px] items-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-medium shadow-card backdrop-blur hover:bg-white">
            <DoorOpen size={17} /> Mozole kapısına git
          </button>
        </>
      ) : (
        <>
          <button onClick={() => st.teleportTo(WALK.spawn.x, WALK.spawn.z, WALK.spawn.yaw)} className="pointer-events-auto inline-flex h-[52px] items-center gap-2 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-card hover:bg-brand-600">
            <Footprints size={17} /> Yürü
          </button>
          <button onClick={() => { st.selectPoint(null); st.setCameraTarget('overview'); }}
            className="pointer-events-auto inline-flex h-[52px] items-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-medium shadow-card backdrop-blur hover:bg-white" aria-label="Genel görünüme dön">
            <Home size={17} /> <span className="hidden sm:inline">Genel görünüm</span>
          </button>
        </>
      )}
      <button onClick={() => st.setQuality(next[quality])} disabled={saver}
        className={`pointer-events-auto h-[52px] items-center rounded-xl bg-white/90 px-3 text-sm font-medium shadow-card backdrop-blur hover:bg-white disabled:opacity-60 ${walking ? 'hidden [@media(pointer:fine)]:inline-flex' : 'inline-flex'}`}
        aria-label={`Grafik kalitesi: ${QUALITY_LABEL[saver ? 'low' : quality]}. Değiştirmek için dokun.`}>
        Kalite: {QUALITY_LABEL[saver ? 'low' : quality]}
      </button>
    </div>
  );
}

function InfoPanel({ data }: { data: MonumentData }) {
  const selected = useMonumentStore((s) => s.selectedPoint);
  const p = data.metadata.points.find((x) => x.id === selected);
  if (!p) return null;
  return (
    <aside className="absolute bottom-3 left-3 right-24 z-40 max-h-[55%] animate-fade-up overflow-y-auto rounded-2xl border border-line bg-white/95 p-5 shadow-2xl backdrop-blur sm:bottom-auto sm:left-auto sm:right-3 sm:top-16 sm:max-h-[calc(100%-10rem)] sm:w-[340px]" aria-live="polite">
      <button onClick={() => useMonumentStore.getState().selectPoint(null)} className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-xl text-ink-muted hover:bg-slate-100" aria-label="Bilgi kartını kapat"><X size={18} /></button>
      <p className="pr-10 text-xs font-semibold uppercase tracking-wide text-brand">{p.short}</p>
      <h2 className="mt-1 pr-10 text-xl font-bold">{p.name}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
      {p.didYouKnow && <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Lightbulb size={18} className="shrink-0" /> {p.didYouKnow}</p>}
    </aside>
  );
}

/** Model yüklenirken boş ekran yerine iskelet */
function Skeleton({ name }: { name: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-b from-sky-100 to-stone-200" role="status" aria-label={`${name} yükleniyor`}>
      <div className="w-64 animate-pulse">
        <div className="mx-auto h-4 w-52 rounded bg-white/70" />
        <div className="mx-auto mt-1 h-20 w-44 rounded bg-white/80" />
        <div className="mx-auto h-3 w-56 rounded bg-white/70" />
        <div className="mx-auto mt-1 h-10 w-64 rounded bg-white/60" />
        <p className="mt-4 text-center text-sm font-medium text-ink-muted">{name} hazırlanıyor…</p>
      </div>
    </div>
  );
}

/** Yürüme modu: dokunmatikte sanal joystick, masaüstünde tuş ipucu */
function WalkPad() {
  const walking = useMonumentStore((s) => s.mode === 'walk');
  const knob = useRef<HTMLSpanElement>(null);
  const [hint, setHint] = useState(true);
  useEffect(() => { if (!walking) return; setHint(true); const t = setTimeout(() => setHint(false), 6000); return () => clearTimeout(t); }, [walking]);
  if (!walking) return null;
  const set = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    walkInput.x = x; walkInput.y = y;
    if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const reset = () => { walkInput.x = walkInput.y = 0; if (knob.current) knob.current.style.transform = ''; };
  return (
    <>
      <div
        className="absolute bottom-24 left-5 z-30 grid h-28 w-28 touch-none place-items-center rounded-full border-2 border-white/80 bg-white/30 backdrop-blur [@media(pointer:fine)]:hidden"
        aria-label="Yürüme joystick'i"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e); }}
        onPointerUp={reset} onPointerCancel={reset}
      >
        <span ref={knob} className="h-12 w-12 rounded-full bg-brand shadow-lg" />
      </div>
      {hint && (
        <p className="pointer-events-none absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-xl bg-ink/85 px-4 py-2 text-center text-sm text-white" role="status">
          <span className="[@media(pointer:coarse)]:hidden">WASD ile yürü, fareyi sürükleyerek etrafa bak. Shift: hızlı yürü.</span>
          <span className="[@media(pointer:fine)]:hidden">Soldaki joystick ile yürü, ekranı sürükleyerek etrafa bak.</span>
        </p>
      )}
    </>
  );
}

/**
 * WebGL yoksa: 3D sahne yerine aynı yerleşim verisinden çizilen vaziyet planı.
 * metadata.fallbackImage verilirse onun yerine o panorama fotoğrafı gösterilir.
 */
function StaticFallback({ data }: { data: MonumentData }) {
  if (data.metadata.fallbackImage) return <img src={data.metadata.fallbackImage} alt={`${data.metadata.name} panoraması`} className="h-full w-full object-cover" />;
  const P = MAUSOLEUM.podium, x0 = -PLAZA.w / 2 - 40, z0 = LION_ROAD.startZ - LION_ROAD.length - 30, w = P.x1 + 30 - x0, h = PLAZA.d / 2 + 40 - z0;
  return (
    <div className="flex h-full flex-col bg-emerald-50 pt-16">
      <p className="px-4 pb-2 text-sm text-ink-muted">Cihazın 3D görüntülemeyi desteklemiyor. Vaziyet planından bir noktaya dokunarak bilgi alabilirsin.</p>
      <svg viewBox={`${x0} ${z0} ${w} ${h}`} className="min-h-0 w-full flex-1" role="img" aria-label={`${data.metadata.name} vaziyet planı`}>
        <rect x={x0} y={z0} width={w} height={h} fill="#cfe3c4" />
        <rect x={LION_ROAD.x - LION_ROAD.width / 2} y={LION_ROAD.startZ - LION_ROAD.length} width={LION_ROAD.width} height={LION_ROAD.length + 14} fill="#e6dcc6" />
        <rect x={-PLAZA.w / 2} y={-PLAZA.d / 2} width={PLAZA.w} height={PLAZA.d} fill="#ead9b8" stroke="#b9a888" strokeWidth="1.5" />
        {buildings().map((b) => <rect key={b.name} x={b.pos[0] - b.size[0] / 2} y={b.pos[2] - b.size[2] / 2} width={b.size[0]} height={b.size[2]} fill="#9aa5ae" />)}
        <rect x={STAIR_X0} y={-STAIRS.width / 2} width={STAIRS_DEPTH} height={STAIRS.width} fill="#d9c8a6" />
        <rect x={P.x0} y={-P.halfW} width={P.x1 - P.x0} height={P.halfW * 2} fill="#e0d2b4" />
        <rect x={MAUSOLEUM.x - MAUSOLEUM.len / 2} y={-MAUSOLEUM.wid / 2} width={MAUSOLEUM.len} height={MAUSOLEUM.wid} fill="#f4ecd9" stroke="#8a7a5a" strokeWidth="2" />
        {towers().map((t) => <rect key={t.name} x={t.pos[0] - 6} y={t.pos[2] - 6} width="12" height="12" fill="#7f8a94" />)}
        {data.metadata.points.map((p) => (
          <g key={p.id} onClick={() => useMonumentStore.getState().selectPoint(p.id)} className="cursor-pointer" role="button" aria-label={p.name}>
            <circle cx={HOTSPOTS[p.id][0]} cy={HOTSPOTS[p.id][2]} r="16" fill="transparent" />
            <circle cx={HOTSPOTS[p.id][0]} cy={HOTSPOTS[p.id][2]} r="5" fill="#F04448" stroke="#fff" strokeWidth="2" />
          </g>
        ))}
      </svg>
    </div>
  );
}
