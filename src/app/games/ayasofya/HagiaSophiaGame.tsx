/**
 * Ayasofya — "Işığın ve Taşın Dansı". Ana oyun yöneticisi: raylı kamera, göz uyumu, inceleme, uyarlanabilir kalite, arayüz.
 *
 * Serbest kamera yok. Kamera iki önceden tanımlı rayda ilerler (zemin: narteks → nef → mihrap; güney galeri).
 * Oyuncu yalnızca ray boyunca ileri/geri gider ve başını sınırlı açıyla çevirir (yatay ±110°, dikey −40°…+80°).
 * Bakışın "dinlenme" yönü de rotaya göre önceden tanımlıdır (GAZE): kapıdan girerken ileri, kubbenin altında yukarı, apsiste mihraba.
 * Göz uyumu (adaptive exposure): karanlık narteksten nefe geçince pozlama bir süre yüksek kalır → göz kamaşır, sonra uyum sağlar.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { Effect, ToneMappingMode } from 'postprocessing';
import { animated, useTransition } from '@react-spring/web';
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Eye, Music, Play, Pause, Settings2, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { EXPOSURE, GALLERY_Y, POIS, RAILS, RING_Y, adapt, inspectEye, inspectFov, lookingAt, zoneAt, type Poi, type V3, type Zone } from './hagia';
import { Atmosphere, Columns, Exterior, Furnishings, Galleries, GodRays, Lighting, Mosaics, Shell, Windows, type Tier } from './HagiaScene';
import { setMarbleRes } from './materials';
import { hagiaAudio } from './AudioManager';

/* ---------- cihaz ve uyarlanabilir kalite ---------- */
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier {
  if (pinned) return pinned;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData || (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low';
  try { const gl = document.createElement('canvas').getContext('webgl'), ext = gl?.getExtension('WEBGL_debug_renderer_info'), gpu = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''; if (/Mali-[4T]|Adreno \(TM\) [1-5]\d\d|PowerVR|SwiftShader|llvmpipe/i.test(gpu)) return 'low'; } catch { /* bilgi yok */ }
  return isTouch ? 'medium' : 'high';
}
/** Kademe → ayarlar. Pil tasarrufu: huzmeler (hacimsel ışık) ve dinamik gölge kapanır, statik aydınlatma kalır. */
function profile(tier: Tier, saver: boolean) {
  const t: Tier = saver ? 'low' : tier;
  return { tier: t, shadows: t !== 'low', rays: !saver, motes: t !== 'low', tesserae: t !== 'low', bloom: t !== 'low', ao: t === 'high',
    dpr: (t === 'low' ? 1 : t === 'medium' ? [1, 1.5] : [1, 2]) as number | [number, number], antialias: t === 'high' };
}

/** Pozlama efekti: ton eşlemeden önce sahne rengini çarpar (göz uyumu) */
class ExposureEffect extends Effect {
  constructor() { super('Exposure', 'uniform float uExposure; void mainImage(const in vec4 i, const in vec2 uv, out vec4 o) { o = vec4(i.rgb * uExposure, i.a); }', { uniforms: new Map([['uExposure', new THREE.Uniform(1)]]) }); }
}

/* ---------- raylar ve bakış ---------- */
const CURVES = RAILS.map((r) => new THREE.CatmullRomCurve3(r.points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3));
const LENGTHS = CURVES.map((c) => c.getLength());
/** Rota boyunca önceden tanımlı bakış hedefleri (u ∈ 0..1) */
const GAZE: [number, V3][][] = [
  [[0, [-33, 24, 0]], [0.3, [-33, 14, 0]], [0.42, [-31, 4.5, 0]], [0.52, [0, 12, 0]], [0.66, [16, RING_Y - 8, 0]], [0.8, [31, 24, 0]], [0.92, [34, 12, 0.5]], [1, [34.5, 4.2, 1.4]]],
  [[0, [-14, GALLERY_Y + 2.6, 30]], [0.3, [-14, GALLERY_Y + 2.6, 30]], [0.52, [2, 31, -15.5]], [0.8, [30.8, GALLERY_Y + 2.6, 22.5]], [1, [30.8, GALLERY_Y + 2.6, 22.5]]],
];
function gazeAt(rail: number, u: number, out: THREE.Vector3) {
  const g = GAZE[rail]; let i = 0; while (i < g.length - 2 && u > g[i + 1][0]) i++;
  const [u0, a] = g[i], [u1, b] = g[i + 1], k = Math.max(0, Math.min(1, (u - u0) / (u1 - u0))), s = k * k * (3 - 2 * k);
  return out.set(a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s);
}
export const LOOK_SENS = 0.8;
export const SPEED = 3.5, LOOK_YAW = (110 * Math.PI) / 180, PITCH_MIN = (-40 * Math.PI) / 180, PITCH_MAX = (80 * Math.PI) / 180;

interface Shared {
  rail: React.MutableRefObject<number>; s: React.MutableRefObject<number>; move: React.MutableRefObject<number>; auto: React.MutableRefObject<boolean>;
  look: React.MutableRefObject<{ yaw: number; pitch: number }>; inspect: React.MutableRefObject<Poi | null>; exposure: ExposureEffect;
}

export default function HagiaSophiaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}

function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier);
  const [saver, setSaver] = useState(false);
  const prof = useMemo(() => profile(tier, saver), [tier, saver]);
  useMemo(() => setMarbleRes(prof.tier === 'low' ? 512 : 1024), [prof.tier]);   // mermer dokusu: 512 / 1024 px, anizotropi 16
  const [stage, setStage] = useState(0);            // aşamalı yükleme: 0 kabuk, 1 sütun/galeri, 2 ayrıntı
  const [started, setStarted] = useState(false);
  const [hour, setHour] = useState(10.5);
  const [zone, setZone] = useState<Zone>('avlu');
  const [rail, setRail] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const [target, setTarget] = useState<Poi | null>(null), [card, setCard] = useState<Poi | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [auto, setAuto] = useState(false), [muted, setMuted] = useState(false), [music, setMusic] = useState(false), [panel, setPanel] = useState(false);
  const [fade, setFade] = useState(false);
  const exposure = useMemo(() => new ExposureEffect(), []);
  const sh: Shared = { rail: useRef(0), s: useRef(0), move: useRef(0), auto: useRef(false), look: useRef({ yaw: 0, pitch: 0 }), inspect: useRef<Poi | null>(null), exposure };
  sh.auto.current = auto && started && !card;
  sh.inspect.current = card;

  // pil tasarrufu
  useEffect(() => {
    type B = EventTarget & { level: number; charging: boolean }; let b: B | null = null;
    const check = () => b && setSaver(b.level < 0.2 && !b.charging);
    (navigator as Navigator & { getBattery?: () => Promise<B> }).getBattery?.().then((x) => { b = x; check(); x.addEventListener('levelchange', check); x.addEventListener('chargingchange', check); }).catch(() => {});
    return () => { b?.removeEventListener('levelchange', check); b?.removeEventListener('chargingchange', check); };
  }, []);
  // aşamalı yükleme: her aşama bir önceki çizildikten sonra
  useEffect(() => { if (stage >= 2) return; const id = setTimeout(() => setStage((s) => s + 1), 350); return () => clearTimeout(id); }, [stage]);
  useEffect(() => { hagiaAudio.setMuted(muted); }, [muted]);
  useEffect(() => { hagiaAudio.setMusic(music); }, [music]);
  useEffect(() => { hagiaAudio.setZone(zone); }, [zone]);
  useEffect(() => () => hagiaAudio.dispose(), []);

  const open = useCallback((p: Poi) => { hagiaAudio.chime(); hagiaAudio.speak(p.text); setSeen((s) => (s.includes(p.id) ? s : [...s, p.id])); setCard(p); }, []);
  const close = useCallback(() => { setCard(null); hagiaAudio.hush(); }, []);
  const interact = useCallback(() => { if (card) close(); else if (target) open(target); }, [card, target, open, close]);
  const switchRail = useCallback((r: number) => {
    setFade(true); close();
    setTimeout(() => { sh.rail.current = r; sh.s.current = 0; sh.look.current = { yaw: 0, pitch: 0 }; setRail(r); setAtEnd(false); setTimeout(() => setFade(false), 150); }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [close]);

  // klavye
  const keys = useRef(new Set<string>()), btn = useRef(0);
  useEffect(() => {
    const sync = () => { const k = keys.current; sh.move.current = Math.max(-1, Math.min(1, (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + btn.current)); };
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code === 'KeyE' && !e.repeat) interact(); if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault(); sync(); };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); sync(); };
    addEventListener('keydown', down); addEventListener('keyup', up); const id = setInterval(sync, 60);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interact]);

  // bakış: sürükleme (fare ya da parmak); tam ekran sürükleme ≈ 150°
  const drag = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { hagiaAudio.unlock(); drag.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || card) return; const k = (2.6 * LOOK_SENS) / Math.max(360, innerWidth);
    // ikisi de aynı yönde: sağa sürükle → sağa bak, aşağı sürükle → aşağı bak (önceki sürümde dikey eksen tersti)
    const l = sh.look.current; l.yaw = Math.max(-LOOK_YAW, Math.min(LOOK_YAW, l.yaw + (e.clientX - d.x) * k));
    l.pitch = Math.max(-1.6, Math.min(1.6, l.pitch - (e.clientY - d.y) * k));   // birikme yok: sınıra dayanınca takılmaz; kesin sınır Player'da
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { drag.current = null; };
  const onWheel = (e: React.WheelEvent) => { if (!card) sh.s.current = Math.max(0, Math.min(LENGTHS[sh.rail.current], sh.s.current - e.deltaY * 0.01)); };

  // test/inceleme
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __aya: unknown }).__aya = { go: (r: number, u: number, yaw = 0, pitch = 0) => { sh.rail.current = r; setRail(r); sh.s.current = u * LENGTHS[r]; sh.look.current = { yaw, pitch }; }, open: (id: string) => open(POIS.find((p) => p.id === id)!), hour: setHour }; });

  const enter = () => { hagiaAudio.unlock(); hagiaAudio.setZone('avlu'); setStarted(true); };
  const hold = (v: number) => ({ onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); btn.current = v; }, onPointerUp: () => { btn.current = 0; }, onPointerLeave: () => { btn.current = 0; }, onPointerCancel: () => { btn.current = 0; } });
  const total = POIS.length, hh = Math.floor(hour), mm = hour % 1 ? '30' : '00';

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0d0906] text-white" style={{ touchAction: 'none' }}>
      <Canvas shadows={prof.shadows} dpr={prof.dpr} gl={{ antialias: prof.antialias, powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.1, far: 260, position: RAILS[0].points[0] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = EXPOSURE.avlu; }}>
        {/* uyarlanabilir kalite: kare hızı düşerse bir kademe in (adres çubuğunda ?q= ile sabitlenmişse dokunma) */}
        {!pinned && <PerformanceMonitor bounds={() => [30, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}>
          <Atmosphere outside={zone === 'avlu'} />
          <Lighting hour={hour} shadows={prof.shadows} focus={zone === 'apsis' ? 1 : 0.15} outside={zone === 'avlu'} />
          <Exterior tier={prof.tier} />
          <Shell tier={prof.tier} detail={prof.tesserae} />
          <Windows hour={hour} />
          {stage >= 1 && <><Columns tier={prof.tier} /><Galleries /></>}
          {stage >= 2 && <><Mosaics detail={prof.tesserae} tier={prof.tier} /><Furnishings tier={prof.tier} /><GodRays hour={hour} enabled={prof.rays} motes={prof.motes} /></>}
          <Player sh={sh} composer={prof.bloom} onZone={setZone} onTarget={setTarget} onEnd={setAtEnd} active={started} />
          {prof.bloom && (
            <EffectComposer multisampling={0} enableNormalPass={prof.ao}>
              {prof.ao ? <N8AO aoRadius={2.2} intensity={2.4} distanceFalloff={1.2} halfRes /> : <></>}
              <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.25} intensity={prof.tier === 'high' ? 0.75 : 0.5} />
              <primitive object={exposure} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <Vignette darkness={0.55} offset={0.25} />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>

      {/* bakış katmanı */}
      {started && <div className="absolute inset-0" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} />}

      {/* nişangâh */}
      {started && !card && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`rounded-full transition-all duration-200 ${target ? 'h-6 w-6 border-2 border-amber-200 shadow-[0_0_16px_5px_rgba(255,214,130,.65)]' : 'h-1.5 w-1.5 bg-white/70'}`} />
        </div>
      )}
      {started && target && !card && (
        <button onClick={interact} className="absolute left-1/2 top-[57%] z-20 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 text-sm font-semibold text-black shadow-lg">
          <Eye size={16} /> İncele: {target.name} {!isTouch && <span className="opacity-60">(E)</span>}
        </button>
      )}

      {/* üst çubuk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { hagiaAudio.unlock(); setMuted(!muted); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => setPanel(!panel)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/55" aria-label="Işık ve ayarlar" aria-expanded={panel}><Settings2 size={18} /></button>
        {started && (
          <div className="mx-auto rounded-2xl bg-black/55 px-4 py-1.5 text-center text-xs">
            <b>{RAILS[rail].name}</b> · {ZONE_LABEL[zone]} · Keşif {seen.length}/{total} · <Sun size={11} className="-mt-0.5 inline" /> {hh}:{mm}
          </div>
        )}
      </div>
      {panel && (
        <div className="absolute left-3 top-16 z-40 w-80 max-w-[calc(100%-1.5rem)] rounded-2xl bg-black/85 p-4 text-sm">
          <label htmlFor="hr" className="block font-semibold">Günün saati: {hh}:{mm}</label>
          <input id="hr" type="range" min={7} max={18.5} step={0.5} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="mt-2 w-full accent-amber-400" />
          <p className="mt-1 text-xs text-white/60">Güneş ekinoks gününe göre hesaplanır; huzmeler pencerelerden o saatin açısıyla girer.</p>
          <button onClick={() => { hagiaAudio.unlock(); setMusic(!music); }} aria-pressed={music} className={`mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg ${music ? 'bg-amber-500 text-black' : 'bg-white/15'}`}><Music size={16} /> Ortam müziği (sentez): {music ? 'açık' : 'kapalı'}</button>
          <p className="mt-3 text-xs text-white/60">Kalite: {prof.tier}{saver ? ' · pil tasarrufu' : ''} — {prof.bloom ? 'bloom' : 'efekt yok'}{prof.ao ? ' + AO' : ''}{prof.shadows ? ' · gölge' : ''}{prof.rays ? ' · huzme' : ''}</p>
          {!pinned && <div className="mt-2 flex gap-1">{(['low', 'medium', 'high'] as Tier[]).map((t) => <button key={t} onClick={() => setTier(t)} className={`h-9 flex-1 rounded-lg text-xs ${tier === t ? 'bg-white text-black' : 'bg-white/15'}`}>{t}</button>)}</div>}
        </div>
      )}

      {/* hareket düğmeleri ve otomatik tur */}
      {started && !card && (
        <div className="absolute bottom-6 left-5 z-20 flex items-end gap-2">
          <div className="flex flex-col gap-2">
            <button {...hold(1)} className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur active:bg-white/35" aria-label="İleri"><ChevronUp /></button>
            <button {...hold(-1)} className="grid h-14 w-14 place-items-center rounded-full bg-white/20 backdrop-blur active:bg-white/35" aria-label="Geri"><ChevronDown /></button>
          </div>
          <button onClick={() => setAuto(!auto)} aria-pressed={auto} className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${auto ? 'bg-amber-500 text-black' : 'bg-white/20 backdrop-blur'}`}>{auto ? <Pause size={16} /> : <Play size={16} />} Otomatik tur</button>
        </div>
      )}
      {started && atEnd && !card && (
        <button onClick={() => switchRail(rail === 0 ? 1 : 0)} className="absolute bottom-6 left-1/2 z-20 h-12 -translate-x-1/2 rounded-xl bg-brand px-6 font-semibold shadow-lg">{rail === 0 ? 'Üst galeriye çık' : 'Zemine dön'}</button>
      )}
      {started && !atEnd && !card && !target && <p className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/45 px-4 py-1.5 text-xs sm:block">W/S ya da tekerlek: ilerle · sürükle: bak · E: incele</p>}

      <InfoCard poi={card} onClose={close} />
      {card && <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_200px_70px_rgba(0,0,0,.8)]" />}

      {!started && <StartCard stage={stage} onEnter={enter} />}
      <div className={`pointer-events-none absolute inset-0 z-50 bg-black transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
    </div>
  );
}
const ZONE_LABEL: Record<Zone, string> = { avlu: 'Avlu', narteks: 'Narteks', nef: 'Ana nef', apsis: 'Mihrap önü', galeri: 'Üst galeri' };

/* ---------- kamera: ray, bakış, inceleme, göz uyumu ---------- */
function Player({ sh, composer, onZone, onTarget, onEnd, active }: { sh: Shared; composer: boolean; onZone: (z: Zone) => void; onTarget: (p: Poi | null) => void; onEnd: (b: boolean) => void; active: boolean }) {
  const { camera, gl } = useThree();
  const V = useMemo(() => ({ eye: new THREE.Vector3(), gaze: new THREE.Vector3(), dir: new THREE.Vector3(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), m: new THREE.Matrix4(), e: new THREE.Euler(0, 0, 0, 'YXZ'), up: new THREE.Vector3(0, 1, 0), t: new THREE.Vector3(), ipos: new THREE.Vector3() }), []);
  const st = useRef({ zone: '' as Zone | '', target: null as string | null, end: false, exp: EXPOSURE.avlu, blend: 0, dist: 0, last: null as Poi | null, fov: 62, baseYaw: 0, basePitch: 0, init: false });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1), r = sh.rail.current, L = LENGTHS[r], S = st.current, insp = sh.inspect.current;
    // ray boyunca ilerleme
    if (active && !insp) {
      const v = sh.move.current !== 0 ? sh.move.current * SPEED : sh.auto.current ? 1.6 : 0, before = sh.s.current;
      sh.s.current = Math.max(0, Math.min(L, sh.s.current + v * dt));
      S.dist += Math.abs(sh.s.current - before); if (S.dist > 0.75) { S.dist = 0; hagiaAudio.footstep(); }
    }
    const u = sh.s.current / L;
    CURVES[r].getPointAt(u, V.eye);
    V.eye.y += Math.sin((sh.s.current / 0.75) * Math.PI) * 0.018;   // hafif baş sallanma
    // dinlenme bakışı (rota) + oyuncunun sınırlı baş hareketi
    gazeAt(r, u, V.gaze).sub(V.eye);
    const by = Math.atan2(-V.gaze.x, -V.gaze.z), bp = Math.atan2(V.gaze.y, Math.hypot(V.gaze.x, V.gaze.z));
    if (!S.init) { S.baseYaw = by; S.basePitch = bp; S.init = true; }
    const k = 1 - Math.exp(-dt * 2.5); S.baseYaw += Math.atan2(Math.sin(by - S.baseYaw), Math.cos(by - S.baseYaw)) * k; S.basePitch += (bp - S.basePitch) * k;
    const l = sh.look.current; l.pitch = Math.max(PITCH_MIN - S.basePitch, Math.min(PITCH_MAX - S.basePitch, l.pitch));
    if (sh.auto.current && sh.move.current === 0) { l.yaw *= 1 - k * 0.3; l.pitch *= 1 - k * 0.3; }   // otomatik turda bakış yavaşça rotaya döner
    V.e.set(S.basePitch + l.pitch, S.baseYaw - l.yaw, 0); V.q.setFromEuler(V.e);

    // inceleme: göz, önceden hesaplanan bakış noktasına süzülür; görüş açısı hedefe göre daralır
    if (insp) S.last = insp;
    S.blend += ((insp ? 1 : 0) - S.blend) * (1 - Math.exp(-dt * 1.8));
    let fov = 62;
    if (S.blend > 0.002 && S.last) {
      const p = S.last, ie = inspectEye(p, [V.eye.x, V.eye.y, V.eye.z]); V.ipos.set(...ie); V.t.set(...p.pos);
      V.m.lookAt(V.ipos, V.t, Math.abs(V.t.x - V.ipos.x) + Math.abs(V.t.z - V.ipos.z) < 0.05 ? new THREE.Vector3(1, 0, 0) : V.up); V.q2.setFromRotationMatrix(V.m);
      camera.position.copy(V.eye).lerp(V.ipos, S.blend); camera.quaternion.copy(V.q).slerp(V.q2, S.blend);
      fov = THREE.MathUtils.lerp(62, inspectFov(V.ipos.distanceTo(V.t), p.radius), S.blend);
    } else { camera.position.copy(V.eye); camera.quaternion.copy(V.q); }
    const cam = camera as THREE.PerspectiveCamera; if (Math.abs(cam.fov - fov) > 0.02) { cam.fov = fov; cam.updateProjectionMatrix(); }

    // bölge, hedef, uç
    const z = zoneAt([V.eye.x, V.eye.y, V.eye.z]); if (z !== S.zone) { S.zone = z; onZone(z); }
    camera.getWorldDirection(V.dir);
    const hit = insp || !active ? null : lookingAt([V.eye.x, V.eye.y, V.eye.z], [V.dir.x, V.dir.y, V.dir.z], RAILS[r].id);
    if ((hit?.id ?? null) !== S.target) { S.target = hit?.id ?? null; onTarget(hit); }
    const end = u > 0.985; if (end !== S.end) { S.end = end; onEnd(end); }

    // göz uyumu: hedef pozlama bölgeye göre; üstel yaklaşım (narteks → nef geçişinde ~2 sn kamaşma)
    S.exp = adapt(S.exp, EXPOSURE[z], dt);
    if (composer) { sh.exposure.uniforms.get('uExposure')!.value = S.exp; gl.toneMappingExposure = 1; } else gl.toneMappingExposure = S.exp;
  });
  return null;
}

/* ---------- arayüz ---------- */
function InfoCard({ poi, onClose }: { poi: Poi | null; onClose: () => void }) {
  const t = useTransition(poi, { keys: (p) => p?.id ?? 'x', from: { x: 40, opacity: 0 }, enter: { x: 0, opacity: 1 }, leave: { x: 40, opacity: 0 }, config: { tension: 230, friction: 24 } });
  const KIND = { mozaik: 'Mozaik', sutun: 'Sütun', mimari: 'Mimari', osmanli: 'Osmanlı eklemesi' } as const;
  return t((style, p) => p && (
    <animated.div style={{ transform: style.x.to((x) => `translateX(${x}px)`), opacity: style.opacity }} role="dialog" aria-label={p.name}
      className="absolute right-3 top-16 z-30 w-[min(24rem,calc(100%-1.5rem))] rounded-2xl bg-black/80 p-4 shadow-2xl backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">{KIND[p.kind]} · {p.era}</p>
      <h3 className="text-lg font-bold">{p.name}</h3>
      <p className="mt-1 text-sm text-white/85">{p.text}</p>
      {p.kind === 'mozaik' && <p className="mt-2 text-xs text-white/55">Modeldeki pano stilize bir canlandırmadır; özgün mozaiğin kopyası değildir.</p>}
      <a href={p.source.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-white/60 underline">{p.source.title} <ExternalLink size={12} /></a>
      <button onClick={onClose} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white/15 text-sm font-semibold"><X size={16} /> Kapat <span className="text-white/50">(E)</span></button>
    </animated.div>
  ));
}
function StartCard({ stage, onEnter }: { stage: number; onEnter: () => void }) {
  const pct = Math.round(((stage + 1) / 3) * 100), ready = stage >= 2;
  return (
    <div className="absolute inset-0 grid place-items-end bg-gradient-to-t from-black/90 via-black/50 to-black/20 p-4 sm:place-items-center">
      <div className="w-full max-w-xl rounded-2xl bg-black/70 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">İstanbul · UNESCO Dünya Mirası · 537</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Ayasofya: Işığın ve Taşın Dansı</h1>
        <p className="mt-2 text-sm text-white/80">Avludan karanlık nartekse, oradan kubbenin altına, oradan mihraba ve üst galerideki mozaiklere. Kamera önceden belirlenmiş rotada ilerler; sen yürür, başını çevirir ve incelemek istediğin yere bakarsın.</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1 text-xs text-white/55">{['Kubbe ve ana ayaklar…', 'Sütunlar ve galeriler…', 'Mozaikler, ışık huzmeleri…'][Math.min(2, stage)]}{ready ? ' hazır' : ''}</p>
        <button onClick={onEnter} disabled={!ready} className="mt-3 h-12 w-full rounded-xl bg-brand font-semibold disabled:opacity-50">İçeri gir</button>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Ayasofya').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const p = POIS[i];
  return (
    <div className="fixed inset-0 bg-[#0d0906] text-white">
      {img && <img src={img} alt="Ayasofya" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{p.name}</h2><p className="mt-1 text-sm">{p.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => hagiaAudio.speak(p.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % POIS.length)} className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
