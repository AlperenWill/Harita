/**
 * Amasya — Kral Kaya Mezarları ve Yalıboyu Evleri: "Kayadan Ayır" (detaylı). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu güney kıyıdan köprüyle Yalıboyu'na geçer, evlerin arkasındaki sokaktan kayaya oyulmuş merdivenle mezar terasına çıkar.
 * Mezarların ters U galerilerinde dolaşır, tünelle batıdaki mezarlara geçer. Terasın doğusundaki yarım bırakılmış nişte galeriyi
 * yukarıdan aşağıya oyarak mezar bloğunu ana kayadan ayırır (bloğa vurmak çatlak açar). 7 ayrıntı + oyma.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Hammer, Landmark } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_WORK, FACE_Z, GALLERY_CELLS, MAX_CRACKS, SPOTS, START, TERRACE, WORK, atWork, canCarve, groundY, nearestSpot, slide, type Spot } from './site';
import { Banks, Cliff, CliffPlants, Houses, Mountains, River, WORK_CELLS, WorkCells, useMats } from './AmasyaModels';

const THEME = { accent: '#7a4e2d' };
const EYE = 1.62, WALK = 1.6, RUN = 3.6, FOV = 66;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(0.3, 0.62, 0.72).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; atWork: boolean; carving: boolean; carved: string[]; cracks: number; workDone: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, atWork: false, carving: false, carved: [] as string[], cracks: 0, workDone: false, endShown: false, toast: null as string | null };
const useAm = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.1 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
const CV = { yaw: 0, pitch: 0.02 };
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useAm.getState().set({ toast: t }); toastT = setTimeout(() => useAm.getState().set({ toast: null }), ms); };
function startCarve() { useAm.getState().set({ carving: true }); say('Galeriyi yukarıdan aşağıya oy: yalnızca üstü açılmış hücreler oyulabilir. Mezar bloğuna dokunma.', 5200); }
function stopCarve() { useAm.getState().set({ carving: false }); }
function carveCell(c: number, r: number) { const s = useAm.getState(), set = new Set(s.carved);
  if (!canCarve(c, r, set)) { audio.tone(false); say('Önce üstündeki kayayı oy: işçiler yukarıdan aşağıya çalışır.', 2600); return; }
  set.add(`${c},${r}`); audio.step(260); const carved = [...set];
  if (carved.length >= GALLERY_CELLS) { s.set({ carved, workDone: true, carving: false, card: CARD_WORK }); audio.tone(true); audio.speak(`${CARD_WORK.name}. ${CARD_WORK.text}`); } else s.set({ carved }); }
function hitBlock() { const s = useAm.getState(), cracks = s.cracks + 1; audio.tone(false);
  if (cracks >= MAX_CRACKS) { s.set({ cracks: 0, carved: [] }); say('Blok çatladı! Baştan başla: yalnızca çevresindeki galeriyi oy.', 4200); }
  else { s.set({ cracks }); say(`Bloğa vurdun: çatlak ${cracks}/${MAX_CRACKS}.`, 2400); } }

export default function AmasyaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAm(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.1; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useAm.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useAm.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useAm.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useAm.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAm.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.carving) stopCarve(); else if (s.atWork && !s.workDone) startCarve(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.carving) stopCarve(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __amasya: unknown }).__amasya = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAm.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      carve: () => { useAm.getState().set({ started: true, card: null }); startCarve(); },
      cut: (c: number, r: number) => carveCell(c, r),
      cutTop: (n: number) => { for (let k = 0; k < n; k++) { const set = new Set(useAm.getState().carved), nx = WORK_CELLS.find(({ c, r }) => canCarve(c, r, set)); if (nx) carveCell(nx.c, nx.r); } },
    };
  }, []);

  const carvedSet = useMemo(() => new Set(S.carved), [S.carved]);
  const canSet = useMemo(() => new Set(WORK_CELLS.filter(({ c, r }) => canCarve(c, r, carvedSet)).map(({ c, r }) => `${c},${r}`)), [carvedSet]);
  const fpl = useFpLook(live.view, () => { const a = useAm.getState(); return a.started && !a.card && !a.carving && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.workDone ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 6000, position: [START.at[0], EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} carved={carvedSet} can={canSet} carving={S.carving} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dfe7ee" sun="#fff0d6" ground="#8a8466" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.carving ? `Galeri ${S.carved.length}/${GALLERY_CELLS}` : `Ayrıntılar ${S.seen.length}/${SPOTS.length}${S.workDone ? '' : ' · oyma'}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Blok') || S.toast?.startsWith('Bloğa') || S.toast?.startsWith('Önce') ? 'bad' : 'ok'} />}
        {S.started && S.carving && !S.card && <CarvePanel carved={S.carved.length} cracks={S.cracks} />}
        {S.started && (<>
          {!S.carving && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7a4e2d]" />}
          {!S.carving && <LookCrosshair locked={fpl.locked} />}
          {!S.card && !S.carving && S.atWork && !S.workDone && <InteractPrompt icon={<Hammer size={18} />} label="Yarım nişi oy" onClick={startCarve} />}
          {!S.card && !S.carving && !(S.atWork && !S.workDone) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.carving && <Hint>Köprüden karşıya geç · sokağın doğusundaki kaya merdiveninden mezar terasına çık · terasın doğusundaki yarım nişte E</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Amasya · Yeşilırmak kıyısı" title="Kayadan Ayır"
          intro={<>Yeşilırmak'ın karşı kıyısında <b>Yalıboyu evleri</b>, arkalarındaki kayalıkta <b>Pontus kral mezarları</b>. Köprüden geç, kaya merdiveninden mezar terasına çık, galerilerde dolaş. Terasın ucundaki <b>yarım bırakılmış nişte</b> mezar bloğunu kayadan ayır.</>}
          controls={CONTROLS} note="Terasın yüksekliği, mezarların yerleşimi ve evlerin görünüşü temsilîdir." cta="Kıyıya çık" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.carving && <EndSheet kicker="Amasya" title="Kayadaki krallar"
          text="Pontus krallarının mezarları kayadan oyuldu; altlarında yüzyıllar sonra Yalıboyu evleri yükseldi. Kent bu iki katmanla tanınır."
          stayLabel="Kıyıda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
  { icon: <Hammer size={16} />, text: <>Oyma: parlayan kaya hücrelerine dokun; yukarıdan aşağıya, bloğa dokunmadan</> },
];
function CarvePanel({ carved, cracks }: { carved: number; cracks: number }) {
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto flex max-w-md items-center gap-3 rounded-3xl bg-[#f7f5f1]/95 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="flex-1 text-xs"><div className="font-bold">Galeri: {carved}/{GALLERY_CELLS} · Çatlak: {cracks}/{MAX_CRACKS}</div><div className="text-[#5a524a]">Parlayan hücreler oyulabilir. Ortadaki blok kalsın.</div></div>
    <button onClick={stopCarve} className="rounded-xl bg-black/5 px-3 py-2 text-xs font-bold">Çık</button>
  </div>;
}

/* ---------- 3B dünya ---------- */
function World({ tier, carved, can, carving }: { tier: Tier; carved: Set<string>; can: Set<string>; carving: boolean }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.4; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.5} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e2e5e0', 900, 5000]} />
      <hemisphereLight args={['#e7eef2', '#6f6a50', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.2} color="#fff0d6" />
      {!low && <Clouds />}
      <Mountains />
      <River m={m} />
      <Banks m={m} />
      <Houses m={m} />
      <Cliff m={m} />
      <CliffPlants />
      <WorkCells m={m} carved={carved} can={can} active={carving} onCell={carveCell} onBlock={hitBlock} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAm.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAm.getState(), active = S.started && !S.card && !S.carving && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const aw = S.started && atWork(live.x, live.z); if (aw !== S.atWork) S.set({ atWork: aw });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (S.carving && !live.fly) { const asp = (camera as THREE.PerspectiveCamera).aspect, d = Math.max(14, 7.6 / Math.max(0.3, asp) / Math.tan((FOV / 2) * Math.PI / 180) * 0.5 + 2); applyFp(camera, WORK.x, TERRACE.y + 5.6, FACE_Z + d, CV, 0); }
    else if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
