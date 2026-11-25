/**
 * Samsun — Bandırma Vapuru Müzesi: "Seyir Defteri" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu parkta karada duran gemi kopyasına iskele merdiveninden çıkar, güvertede dört ayrıntıyı inceler (E), salondaki harita masasında
 * 1919 yolculuğunun limanlarını sırayla işaretler (İstanbul → Sinop → Samsun). 4 ayrıntı + seyir defteri.
 */
import { SceneFog } from '../shared/SceneFog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Ship as ShipIcon, Map as MapIcon } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_ROTA, PORTS, ROUTE, SHIP, SPOTS, START, TABLE, atTable, groundY, nearestSpot, nextOk, slide, type PortId, type Spot } from './site';
import { ChartOnTable, Park, Ship, chartCanvas, useMats } from './BandirmaModels';

const THEME = { accent: '#26415c' };
const EYE = 1.62, WALK = 1.5, RUN = 3.6, FOV = 66;
const audio = new WalkAudio({ freq: 640, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(0.4, 0.66, 0.6).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; atTable: boolean; chart: boolean; picked: PortId[]; done: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, atTable: false, chart: false, picked: [] as PortId[], done: false, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3000) => { clearTimeout(toastT); useAs.getState().set({ toast: t }); toastT = setTimeout(() => useAs.getState().set({ toast: null }), ms); };
const openChart = () => useAs.getState().set({ chart: true, picked: [] });
const closeChart = () => useAs.getState().set({ chart: false });
function pickPort(id: PortId) { const s = useAs.getState(); if (s.picked.includes(id)) return;
  if (!nextOk(s.picked, id)) { audio.tone(false); say(s.picked.length === 0 ? 'Yolculuk nereden başladı? Gemi 16 Mayıs\'ta yola çıktı.' : s.picked.length === 1 ? 'Gemi Samsun\'dan önce bir limana uğradı (18 Mayıs).' : 'Son durak: 19 Mayıs sabahı demir atılan liman.', 3200); return; }
  const picked = [...s.picked, id]; audio.step(600);
  if (picked.length === ROUTE.length) { s.set({ picked }); setTimeout(() => { useAs.getState().set({ chart: false, done: true, card: CARD_ROTA }); audio.tone(true); audio.speak(`${CARD_ROTA.name}. ${CARD_ROTA.text}`); }, 1200); }
  else s.set({ picked }); }

export default function BandirmaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAs(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.08; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useAs.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useAs.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useAs.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useAs.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAs.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.chart) closeChart(); else if (s.atTable && !s.done) openChart(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.chart) closeChart(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __bandirma: unknown }).__bandirma = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      chart: () => { useAs.getState().set({ started: true, card: null }); openChart(); }, pick: (id: PortId) => pickPort(id),
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !a.chart && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.done ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 6000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dbe7ee" sun="#fff0d6" ground="#5f6a50" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<ShipIcon size={15} />} label={done ? 'Hepsini buldun' : S.chart ? `Rota ${S.picked.length}/${ROUTE.length}` : `Ayrıntılar ${S.seen.length}/${SPOTS.length}${S.done ? '' : ' · seyir defteri'}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="bad" />}
        {S.started && S.chart && !S.card && <ChartPanel picked={S.picked} />}
        {S.started && (<>
          {!S.chart && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#26415c]" />}
          {!S.chart && <LookCrosshair locked={fpl.locked} />}
          {!S.card && !S.chart && S.atTable && !S.done && <InteractPrompt icon={<MapIcon size={18} />} label="Harita masası: seyir defteri" onClick={openChart} />}
          {!S.card && !S.chart && !(S.atTable && !S.done) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.chart && <Hint>İskele merdiveninden güverteye çık · parıltılı ayrıntılarda E · salondaki harita masasında rotayı işaretle</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Samsun · Bandırma Vapuru Müzesi" title="Seyir Defteri"
          intro={<>Parkta karada duran <b>Bandırma Vapuru</b> kopyasına iskele merdiveninden çık. Güvertede dolaş, salondaki <b>harita masasında</b> 1919 yolculuğunun limanlarını sırayla işaretle.</>}
          controls={CONTROLS} note="Geminin boyu ve eni kaynaktan alındı; renkler, üst yapı ve güverte düzeni temsilîdir." cta="Gemiye çık" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Samsun" title="19 Mayıs 1919"
          text="İstanbul'dan Samsun'a üç günlük yolculuk, bugün parktaki bu gemide anlatılıyor."
          stayLabel="Gemide kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
  { icon: <MapIcon size={16} />, text: <>Harita masasında limanlara yolculuk sırasıyla dokun</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.4; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <SceneFog args={['#dfe6ea', 600, 4000]} />
      <hemisphereLight args={['#e7eef2', '#4f5d48', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.2} color="#fff0d6" />
      {!low && <Clouds />}
      <Park m={m} />
      <Ship m={m} />
      <ChartOnTable />
      <pointLight position={[TABLE.x, SHIP.deckY + 2.2, TABLE.z]} intensity={8} distance={8} decay={1.6} color="#ffe6c4" />
      <Markers />
    </group>
  );
}
function Markers() {
  const pts = useMemo(() => SPOTS.map((s) => ({ id: s.id, p: s.mark })), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); pts.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.p[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{pts.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.p} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(), active = S.started && !S.card && !S.chart && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const at = S.started && atTable(live.x, live.z); if (at !== S.atTable) S.set({ atTable: at });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}

/** Harita masası paneli: şematik Karadeniz haritası, limanlara dokunarak rota */
function ChartPanel({ picked }: { picked: PortId[] }) {
  const bg = useMemo(() => chartCanvas(640).toDataURL(), []);
  const pts = picked.map((id) => PORTS.find((p) => p.id === id)!.p);
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-3xl bg-[#f7f5f1]/96 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#26415c]"><span>Seyir defteri · Mayıs 1919</span><button onClick={closeChart} className="rounded-lg bg-black/5 px-2 py-1 text-xs">Çık</button></div>
    <div className="relative w-full overflow-hidden rounded-xl ring-1 ring-black/10" style={{ aspectRatio: '1 / 0.62', backgroundImage: `url(${bg})`, backgroundSize: '100% 100%' }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 62" preserveAspectRatio="none">{pts.length > 1 && <polyline points={pts.map(([x, y]) => `${x * 100},${(1 - y) * 62}`).join(' ')} fill="none" stroke="#b8322a" strokeWidth="0.8" strokeDasharray="2 1.2" />}</svg>
      {PORTS.map((p) => { const k = picked.indexOf(p.id); return <button key={p.id} onClick={() => pickPort(p.id)} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${p.p[0] * 100}%`, top: `${(1 - p.p[1]) * 100}%` }}>
        <span className={`mx-auto block h-4 w-4 rounded-full ring-2 ${k >= 0 ? 'bg-[#b8322a] ring-white' : 'bg-white ring-[#26415c]'}`} /><span className="mt-0.5 block whitespace-nowrap rounded bg-white/80 px-1 text-[10px] font-semibold">{p.name}{k >= 0 ? ` · ${k + 1}` : ''}</span></button>; })}
    </div>
    <ol className="mt-2 space-y-0.5 text-xs">{ROUTE.map((r, i) => <li key={r.id} className={i < picked.length ? 'font-semibold text-[#1f1b17]' : 'text-[#857b70]'}>{i + 1}. {i < picked.length ? PORTS.find((p) => p.id === r.id)!.name : '?'} — {r.when}</li>)}</ol>
  </div>;
}
