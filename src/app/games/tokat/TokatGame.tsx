/**
 * Tokat — Yazmacılık: "Kalıp Bas" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Küçük atölyede üç ayrıntı (E) ve baskı tezgâhı: örnek yazmaya bakarak önce kalıplarla motiflerin çizgisini basar, sonra içlerini
 * fırçayla boyarsın (kalıp-kalem). Yanlış kalıp ya da renk hata sayılır; 3 hatada bez yenilenir. 3 ayrıntı + yazma.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Stamp, Paintbrush } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BENCH, CARD_YAZMA, COLORS, KALIPS, MAX_MISTAKES, ROOM, SPOTS, START, TARGET, apply, atBench, emptyCloth, nearestSpot, phaseOf, slide, type Cell, type ColorId, type KalipId, type Spot } from './site';
import { Bench, Hanging, Room, Tools, targetDataUrl, useMats } from './TokatModels';

const THEME = { accent: '#9a2f28' };
const EYE = 1.62, WALK = 1.3, RUN = 2.6, FOV = 66;
const audio = new WalkAudio({ freq: 480, gain: 0.07 }, 'any');

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; atBench: boolean; printing: boolean; cloth: Cell[]; kalip: KalipId | null; color: ColorId | null; mistakes: number; done: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, atBench: false, printing: false, cloth: emptyCloth(), kalip: null, color: null, mistakes: 0, done: false, endShown: false, toast: null as string | null };
const useTk = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0 }, speed: 0, bob: 0, step: 0 };
const PV = { yaw: 0, pitch: -1.15 };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3200) => { clearTimeout(toastT); useTk.getState().set({ toast: t }); toastT = setTimeout(() => useTk.getState().set({ toast: null }), ms); };
function startPrint() { useTk.getState().set({ printing: true }); say('Örnek yazmaya bak: önce kalıp seçip motiflerin yerine bas.', 4000); }
function stopPrint() { useTk.getState().set({ printing: false }); }
function hitCell(i: number) { const s = useTk.getState(); if (!s.printing) return; const ph = phaseOf(s.cloth);
  if (ph === 'kalip' && !s.kalip) { say('Önce bir kalıp seç.', 2000); return; } if (ph === 'kalem' && !s.color) { say('Önce bir boya seç.', 2000); return; }
  const res = apply(s.cloth, i, ph === 'kalip' ? { kalip: s.kalip! } : { color: s.color! });
  if (res.ok) { const next = phaseOf(res.cloth); s.set({ cloth: res.cloth }); audio.step(ph === 'kalip' ? 300 : 900);
    if (next === 'kalem' && ph === 'kalip') say('Çizgiler tamam. Şimdi boya seçip motiflerin içini fırçayla boya.', 3600);
    if (next === 'bitti') { s.set({ done: true, printing: false, card: CARD_YAZMA }); audio.tone(true); audio.speak(`${CARD_YAZMA.name}. ${CARD_YAZMA.text}`); } return; }
  if (res.reason === 'dolu') return;
  if (res.reason === 'once-hepsi') { say('Önce bütün motiflerin çizgisini bas, sonra boya.', 2600); return; }
  const mistakes = s.mistakes + 1; audio.tone(false);
  if (mistakes >= MAX_MISTAKES) { s.set({ mistakes: 0, cloth: emptyCloth() }); say('Bez lekelendi: yeni bir bez serildi. Örneğe dikkatle bak.', 3800); }
  else { s.set({ mistakes }); say(ph === 'kalip' ? `Yanlış kalıp: örnekte orada başka motif var (${mistakes}/${MAX_MISTAKES}).` : `Yanlış renk (${mistakes}/${MAX_MISTAKES}).`, 2800); } }

export default function TokatGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useTk(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useTk.setState({ ...INITIAL, cloth: emptyCloth() }); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useTk.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useTk.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useTk.setState({ ...INITIAL, cloth: emptyCloth(), started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useTk.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.printing) stopPrint(); else if (s.atBench && !s.done) startPrint(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.printing) stopPrint(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __tokat: unknown }).__tokat = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useTk.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      print: () => { useTk.getState().set({ started: true, card: null }); startPrint(); },
      kalip: (k: KalipId) => useTk.getState().set({ kalip: k }), color: (c: ColorId) => useTk.getState().set({ color: c }), hit: (i: number) => hitCell(i),
      allKalip: () => { for (let i = 0; i < 9; i++) { useTk.getState().set({ kalip: TARGET[i].k }); hitCell(i); } },
      someColor: (n: number) => { for (let i = 0; i < n; i++) { useTk.getState().set({ color: TARGET[i].c }); hitCell(i); } },
    };
  }, []);

  const thumb = useMemo(() => targetDataUrl(), []);
  const fpl = useFpLook(live.view, () => { const a = useTk.getState(); return a.started && !a.card && !a.printing && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.done ? 1 : 0), all = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.03, far: 200, position: [START.at[0], EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.9; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} cloth={S.cloth} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#e8ecee" sun="#fff3df" ground="#8a7458" sunDir={[1, 0.6, 0.2]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Stamp size={15} />} label={all ? 'Hepsini buldun' : S.printing ? (phaseOf(S.cloth) === 'kalip' ? 'Kalıpla çizgileri bas' : 'Fırçayla içlerini boya') : `Ayrıntılar ${S.seen.length}/${SPOTS.length}${S.done ? '' : ' · yazma'}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Yanlış') || S.toast?.startsWith('Bez') || S.toast?.startsWith('Önce') ? 'bad' : 'ok'} />}
        {S.started && S.printing && !S.card && <PrintPanel thumb={thumb} cloth={S.cloth} kalip={S.kalip} color={S.color} mistakes={S.mistakes} />}
        {S.started && (<>
          {!S.printing && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#9a2f28]" />}
          {!S.printing && <LookCrosshair locked={fpl.locked} />}
          {!S.card && !S.printing && S.atBench && !S.done && <InteractPrompt icon={<Stamp size={18} />} label="Tezgâhta yazma bas" onClick={startPrint} />}
          {!S.card && !S.printing && !(S.atBench && !S.done) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.printing && <Hint>Atölyede parıltılı ayrıntılarda E · ortadaki tezgâhta yazma bas</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Tokat · Yazmacılık" title="Kalıp Bas"
          intro={<>Bir yazma atölyesindesin. Duvardaki <b>örnek yazmaya</b> bakarak önce ıhlamur <b>kalıplarla</b> motiflerin çizgisini bas, sonra içlerini <b>fırçayla</b> boya.</>}
          controls={CONTROLS} note="Desen, renkler ve atölyenin düzeni temsilîdir." cta="Atölyeye gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && all && !S.endShown && !S.card && !S.printing && <EndSheet kicker="Tokat" title="Kalıptan kumaşa"
          text="Ihlamur kalıplar ve fırçayla basılan yazmalar, Tokat'ta kuşaktan kuşağa aktarılan bir el sanatı olarak sürüyor."
          stayLabel="Atölyede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
  { icon: <Paintbrush size={16} />, text: <>Tezgâhta: kalıp ya da boya seç, bezde motifin yerine dokun</> },
];
function PrintPanel({ thumb, cloth, kalip, color, mistakes }: { thumb: string; cloth: Cell[]; kalip: KalipId | null; color: ColorId | null; mistakes: number }) {
  const ph = phaseOf(cloth), S = useTk.getState();
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto flex max-w-md gap-3 rounded-3xl bg-[#f7f5f1]/95 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="shrink-0 text-center"><img src={thumb} alt="Örnek yazma" className="h-20 w-20 rounded-lg ring-1 ring-black/10" /><div className="mt-0.5 text-[10px] font-semibold text-[#857b70]">örnek</div></div>
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-xs font-bold text-[#9a2f28]">{ph === 'kalip' ? '1 · Kalıp bas (kara)' : '2 · Fırçayla boya'} · hata {mistakes}/{MAX_MISTAKES}</div>
      {ph === 'kalip'
        ? <div className="mb-2 grid grid-cols-3 gap-1.5">{KALIPS.map((k) => <button key={k.id} onClick={() => S.set({ kalip: k.id })} className={`rounded-xl px-1 py-2 text-[11px] font-semibold ring-1 ${kalip === k.id ? 'bg-[#9a2f28] text-white ring-[#9a2f28]' : 'bg-white ring-black/10'}`}>{k.name}</button>)}</div>
        : <div className="mb-2 grid grid-cols-4 gap-1.5">{COLORS.map((c) => <button key={c.id} onClick={() => S.set({ color: c.id })} className={`flex flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-semibold ring-2 ${color === c.id ? 'ring-[#1f1b17]' : 'ring-transparent'} bg-white`}><span className="mb-0.5 h-4 w-4 rounded-full" style={{ background: c.hex }} />{c.name}</button>)}</div>}
      <div className="flex items-center justify-between text-[11px] text-[#5a524a]"><span>Bezde motifin yerine dokun.</span><button onClick={stopPrint} className="rounded-xl bg-black/5 px-3 py-1.5 text-xs font-bold text-[#1f1b17]">Çık</button></div>
    </div>
  </div>;
}

/* ---------- 3B dünya ---------- */
function World({ tier, cloth }: { tier: Tier; cloth: Cell[] }) {
  const m = useMats(), g = useRef<THREE.Group>(null);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.5; scene.background = new THREE.Color('#dfe6ea'); }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; mesh.castShadow = true; mesh.receiveShadow = true; }); }, [tier]);
  return (
    <group ref={g}>
      <hemisphereLight args={['#fff6ea', '#6a5442', 0.7]} />
      <directionalLight position={[ROOM.x1 + 6, 4.5, 0.5]} intensity={2.4} color="#fff0d8" castShadow={tier !== 'low'} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[0, ROOM.h - 0.5, 0]} intensity={9} distance={12} decay={1.5} color="#ffe6c4" />
      <pointLight position={[BENCH.x, BENCH.h + 1.6, BENCH.z + 0.4]} intensity={4} distance={5} decay={1.5} color="#fff4e2" />
      <Room m={m} />
      <Tools m={m} />
      <Bench m={m} cloth={cloth} onCell={hitCell} />
      <Hanging />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useTk.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.04; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.06, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useTk.getState(), active = S.started && !S.card && !S.printing && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.6) { live.step = 0; audio.step(560); } live.bob += moved * 2.6;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const ab = S.started && atBench(live.x, live.z); if (ab !== S.atBench) S.set({ atBench: ab });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.025 : 0;
    const portrait = (camera as THREE.PerspectiveCamera).aspect < 1;
    if (S.printing) { const h = portrait ? 1.85 : 1.5; applyFp(camera, BENCH.x - 0.15, BENCH.h + h, BENCH.z + h * 0.42 + 0.3, PV, 0); }
    else applyFp(camera, live.x, EYE, live.z, live.view, sway);
    easeFov(camera, S.printing && portrait ? 96 : FOV, dt);
  });
  return null;
}
