/**
 * Şırnak Cizre — Kırmızı Medrese: "Tuğla Tuğla" (kısa oyun). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu meydandan taç kapıdan avluya girer. 4 ayrıntı (E ile kart) ve avlu duvarlarındaki 3 tuğla pano: panoya yaklaşıp E ile aç,
 * eksik tuğlayı seç ve yönünü (yatay, dikey, sağa eğik, sola eğik) panonun örgü desenine göre ver. Üç pano tamamlanınca onarım kartı.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { BrickWall, Footprints, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_DONE, DIRS, PATCHES, SPOTS, START, groundY, nearestPatch, nearestSpot, patchSolved, slide, type Dir, type Patch, type Spot } from './site';
import { Ground, Hills, Madrasa, Patches, Town, drawPatch, useMats } from './CizreModels';

const THEME = { accent: '#a5482f' };
const EYE = 1.62, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.7, 0.55).normalize();
const DIR_NAME: Record<Dir, string> = { '—': 'Yatay', '|': 'Dikey', '/': 'Sağa eğik', '\\': 'Sola eğik' };

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearPatch: Patch | null; open: string | null; picks: Record<string, Dir>; solved: string[]; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearPatch: null, open: null, picks: {} as Record<string, Dir>, solved: [] as string[], endShown: false, toast: null as string | null };
const useCiz = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useCiz.getState().set({ toast: t }); toastT = setTimeout(() => useCiz.getState().set({ toast: null }), ms); };
function pick(p: Patch, key: string, d: Dir) {
  const s = useCiz.getState(), picks = { ...s.picks, [key]: d }; s.set({ picks }); audio.step(1200);
  if (!p.missing.every(([c, r]) => picks[`${p.id}:${c}:${r}`])) return;
  if (patchSolved(p, picks)) { const solved = [...s.solved, p.id]; s.set({ solved, open: null }); audio.tone(true);
    if (solved.length === PATCHES.length) { s.set({ card: CARD_DONE }); audio.speak(`${CARD_DONE.name}. ${CARD_DONE.text}`); } else say(`${p.name} tamam · ${solved.length}/${PATCHES.length}`); }
  else { audio.tone(false); say('Desen tutmuyor: komşu tuğlalara bak, kuralı bul.'); }
}

export default function CizreGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useCiz(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useCiz.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useCiz.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useCiz.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useCiz.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useCiz.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.open) s.set({ open: null }); else if (s.nearPatch && !s.solved.includes(s.nearPatch.id)) s.set({ open: s.nearPatch.id }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.open) s.set({ open: null }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __cizre: unknown }).__cizre = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useCiz.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      open: (id: string | null) => useCiz.getState().set({ open: id }),
      solve: (id: string) => { const p = PATCHES.find((q) => q.id === id)!; for (const [c, r] of p.missing) pick(p, `${p.id}:${c}:${r}`, p.orient(c, r)); },
      wrong: (id: string) => { const p = PATCHES.find((q) => q.id === id)!; for (const [c, r] of p.missing) pick(p, `${p.id}:${c}:${r}`, DIRS.find((d) => d !== p.orient(c, r))!); },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useCiz.getState(); return a.started && !a.card && !a.open && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + PATCHES.length, found = S.seen.length + S.solved.length, done = found >= total;
  const openP = S.open ? PATCHES.find((p) => p.id === S.open)! : null;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#eee4d6] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], groundY() + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dde6ec" sun="#fff0d6" ground="#a8936a" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<BrickWall size={15} />} label={done ? 'Hepsini buldun' : `Tuğla panoları onar · ${S.solved.length}/${PATCHES.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && !S.open && <Toast text={S.toast} tone={S.toast?.startsWith('Desen') ? 'bad' : 'ok'} />}
        {openP && <PatchPanel p={openP} picks={S.picks} onClose={() => S.set({ open: null })} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#a5482f]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.open && S.nearPatch && !S.solved.includes(S.nearPatch.id) && <InteractPrompt icon={<BrickWall size={18} />} label={`Onar: ${S.nearPatch.name}`} onClick={() => S.set({ open: S.nearPatch!.id })} />}
          {!S.card && !S.open && !(S.nearPatch && !S.solved.includes(S.nearPatch.id)) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.open && <Hint>Joystick ya da WASD ile yürü · koyu boşluklu tuğla panoya yaklaş, E ile onar · parıltılı ayrıntıda E</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Şırnak · Cizre · Medreseya Sor" title="Tuğla Tuğla"
          intro={<>Adını kırmızı tuğlalarından alan medrese yıllarca harabe kaldı, 2020'de başlayan onarımla yeniden açıldı. Avludaki <b>3 tuğla panonun</b> eksik tuğlalarını örgü desenine uyarak yerine koy; <b>4 ayrıntıyı</b> incele.</>}
          controls={CONTROLS} note="Oda düzeni, kubbe ölçüleri ve tuğla örgü desenleri temsilîdir." cta="Medreseye gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Cizre" title="Kırmızı tuğlalar yerinde"
          text="Bir beyliğin kurduğu, yüzyıllar sonra harabeye dönen medrese, onarımla yeniden ziyaretçilerini karşılıyor."
          stayLabel="Avluda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <BrickWall size={16} />, text: <>Panoda eksik tuğlaya dokun, yönünü seç; desen tutarsa pano tamamlanır</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];
/** Tuğla panosu: tuvalde çizilir; eksik hücreye dokun, alttan yön seç */
function PatchPanel({ p, picks, onClose }: { p: Patch; picks: Record<string, Dir>; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null), [sel, setSel] = useState(`${p.id}:${p.missing[0][0]}:${p.missing[0][1]}`), W = 480, H = 320;
  useEffect(() => { const c = ref.current; if (c) drawPatch(c.getContext('2d')!, p, picks, W, H, sel); }, [p, picks, sel]);
  const tap = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(), c = Math.floor(((e.clientX - r.left) / r.width) * p.cols), rr = Math.floor(((e.clientY - r.top) / r.height) * p.rows);
    if (p.missing.some(([a, b]) => a === c && b === rr)) setSel(`${p.id}:${c}:${rr}`); };
  const choose = (d: Dir) => { pick(p, sel, d); const nextIdx = p.missing.findIndex(([a, b]) => `${p.id}:${a}:${b}` === sel) + 1; if (nextIdx < p.missing.length) { const [a, b] = p.missing[nextIdx]; setSel(`${p.id}:${a}:${b}`); } };
  return <Modal title={p.name} onClose={onClose} wide>
    <p className="mb-2 text-sm text-[#4a433c]">Koyu boşluklar eksik tuğlalar. Birine dokun, sonra yönünü seç. İpucu: {p.rule}</p>
    <canvas ref={ref} width={W} height={H} onPointerDown={tap} className="mb-3 w-full touch-none rounded-xl" />
    <div className="grid grid-cols-4 gap-2">{DIRS.map((d) => <button key={d} onClick={() => choose(d)} className="flex flex-col items-center gap-1 rounded-xl bg-black/5 py-2 text-xs font-semibold text-[#1f1b17] active:scale-95">
      <svg viewBox="-12 -12 24 24" className="h-6 w-6"><rect x={-9} y={-3} width={18} height={6} fill="#a5482f" transform={`rotate(${d === '—' ? 0 : d === '|' ? 90 : d === '/' ? -45 : 45})`} /></svg>{DIR_NAME[d]}</button>)}</div>
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low', picks = useCiz((s) => s.picks), solved = useCiz((s) => s.solved);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={4} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e6e2d8', 300, 2600]} />
      <hemisphereLight args={['#e7eef2', '#8a7a58', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.5} color="#fff0d6" />
      {!low && <Clouds />}
      <Hills />
      <Ground />
      <Town m={m} />
      <Madrasa m={m} />
      <Patches picks={picks} solved={solved} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useCiz.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), patchId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useCiz.getState(), active = S.started && !S.card && !S.open && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const np = S.started ? nearestPatch(live.x, live.z) : null; if ((np?.id ?? '') !== patchId.current) { patchId.current = np?.id ?? ''; S.set({ nearPatch: np }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY() + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
