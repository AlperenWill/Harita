/**
 * Düzce — Prusias ad Hypium (Konuralp): "Kazı Sezonu" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Roma tiyatrosunda ve çevresinde beş kazı açması var. Açmaya yaklaş, E ile toprağı katman katman kaldır (4 katman); buluntu ortaya
 * çıkınca bilgi kartı açılır. Beşi bitince kazı sezonu kartı. 4 ayrıntı + 5 açma.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Footprints, MousePointer2, Search, Shovel } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_ALL, DIGS, LAYERS, SPOTS, START, TH, groundY, inCavea, seatY, nearDig, nearestSpot, slide, type Dig, type Spot } from './site';
import { Surround, Terrain, Theatre, at, canvasTex, useMats, type Mats } from './KonuralpModels';

const THEME = { accent: '#8a5a3a' };
const EYE = 1.62, WALK = 2, RUN = 4.2, FOV = 66;
const audio = new WalkAudio({ freq: 700, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(0.35, 0.8, 0.5).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearD: number; dug: Record<string, number>; allShown: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearD: -1, dug: {} as Record<string, number>, allShown: false, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], y: groundY(START.at[0], START.at[1]), view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0 };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 2600) => { clearTimeout(toastT); useAs.getState().set({ toast: t }); toastT = setTimeout(() => useAs.getState().set({ toast: null }), ms); };
const found = (dug: Record<string, number>) => DIGS.filter((d) => (dug[d.id] ?? 0) >= LAYERS).length;
const LAYER_NAME = ['Üst toprağı kaldırdın', 'Dolgu toprağını kazdın', 'Mala ile inceltiyorsun', 'Fırçayla temizledin'];
function digOnce(k: number) {
  const s = useAs.getState(), d = DIGS[k], n = (s.dug[d.id] ?? 0) + 1; if (n > LAYERS) return; const dug = { ...s.dug, [d.id]: n };
  audio.step(n < LAYERS ? 420 : 900);
  if (n < LAYERS) { s.set({ dug }); say(`${LAYER_NAME[n - 1]} · katman ${n}/${LAYERS}`); }
  else { s.set({ dug, card: d, nearD: -1 }); audio.tone(true); audio.speak(`${d.name}. ${d.text}`); }
}

export default function KonuralpGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAs(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], y: groundY(START.at[0], START.at[1]), speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.08; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useAs.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useAs.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { const st = useAs.getState(); audio.hush();
    if (!st.allShown && found(st.dug) === DIGS.length) { st.set({ card: CARD_ALL, allShown: true }); audio.tone(true); audio.speak(`${CARD_ALL.name}. ${CARD_ALL.text}`); } else st.set({ card: null }); }, []);
  const restart = useCallback(() => { audio.hush(); useAs.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAs.getState(); if (!s.started || pause.on || e.repeat) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearD >= 0) digOnce(s.nearD); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __konuralp: unknown }).__konuralp = {
      go: (x: number, z: number) => { live.x = x; live.z = z; live.y = groundY(x, z); useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      dig: (k: number, n = 1) => { for (let i = 0; i < n; i++) digOnce(k); },
      digAll: () => { DIGS.forEach((_, k) => { for (let i = 0; i < LAYERS; i++) digOnce(k); }); useAs.getState().set({ card: null }); },
      close: () => close(),
    };
  }, [close]);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const nf = found(S.dug), total = SPOTS.length + DIGS.length, done = nf === DIGS.length && S.seen.length >= SPOTS.length;
  const nd = S.nearD >= 0 ? DIGS[S.nearD] : null;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], live.y + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#cfe1ee" sun="#fff0d6" ground="#6a6455" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Shovel size={15} />} label={done ? 'Hepsi tamam' : `Buluntular ${nf}/${DIGS.length} · ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={nf + S.seen.length} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="ok" />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#8a5a3a]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && nd && <InteractPrompt icon={<Shovel size={18} />} label={`Kaz: ${nd.kicker} açması (${(S.dug[nd.id] ?? 0)}/${LAYERS})`} onClick={() => digOnce(S.nearD)} />}
          {!S.card && !nd && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>{nf < DIGS.length ? 'Bayraklı kazı açmalarını bul, E ile toprağı katman katman kaldır · açmalar orkestrada, sıralarda, sahnenin önünde ve arkasında, tepede' : 'Parıltılı ayrıntıları incele'}</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Düzce · Konuralp · Prusias ad Hypium" title="Kazı Sezonu"
          intro={<>Batı Karadeniz'in Roma tiyatrosunda kazı sürüyor. <b>Beş açmada</b> toprağı katman katman kaldır, buluntuları ortaya çıkar: bilet, heykel, maske ve mozaik seni bekliyor.</>}
          controls={CONTROLS} note="Tiyatronun ölçüleri, açmaların yeri, buluntuların konumu ve biçimi temsilîdir." cta="Kazı alanına gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Prusias ad Hypium" title="Tiyatro gün ışığında"
          text="Konuralp'in Roma tiyatrosu, kazılarla yeniden ortaya çıkıyor; bir kısmı hâlâ köy evlerinin altında bekliyor."
          stayLabel="Alanda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Shovel size={16} />, text: <>Bayraklı açmaya yaklaş: <b>E</b> ile her basışta bir katman kaz</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree();
  useEffect(() => { scene.environmentIntensity = 0.4; scene.fog = new THREE.Fog('#d9e4ea', 140, 560); return () => { scene.fog = null; }; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <hemisphereLight args={['#e7eef2', '#6a6050', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.6} color="#fff0d6" />
      {!low && <Clouds />}
      <Terrain m={m} />
      <Theatre m={m} />
      <group userData={{ noCast: true }}><Surround m={m} n={low ? 160 : 380} /></group>
      {DIGS.map((d) => <Trench key={d.id} d={d} m={m} />)}
      <Markers />
    </group>
  );
}
function Markers() {
  const pts = useMemo(() => SPOTS.map((s) => [s.at[0], groundY(s.at[0], s.at[1]) + 1.9, s.at[1]] as [number, number, number]), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = pts[i][1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={pts[i]} material={mat}><octahedronGeometry args={[0.16, 0]} /></mesh>)}</group>;
}

/* ---------- kazı açması: kazıklar ve ip, toprak yığını (katman katman alçalır), bayrak, buluntu ---------- */
function lionTex() {
  return canvasTex(256, 256, (g, r) => {
    g.fillStyle = '#e9dfc8'; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 6) for (let x = 0; x < 256; x += 6) { const v = r() * 18; g.fillStyle = `rgba(${120 + v | 0},${100 + v | 0},${70 + v | 0},.12)`; g.fillRect(x, y, 5, 5); }
    g.strokeStyle = '#7a3b22'; g.lineWidth = 10; g.strokeRect(14, 14, 228, 228); g.strokeStyle = '#2f4a5a'; g.lineWidth = 5; g.strokeRect(30, 30, 196, 196);
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#7a3b22' : '#c08a3a'; g.fillRect(36 + i * 16, 36, 10, 10); g.fillRect(36 + i * 16, 210, 10, 10); }
    g.fillStyle = '#b8742e'; g.beginPath(); g.ellipse(128, 140, 58, 30, 0, 0, 7); g.fill();                       // gövde
    g.fillStyle = '#8a4a1e'; g.beginPath(); g.arc(78, 116, 30, 0, 7); g.fill();                                     // yele
    g.fillStyle = '#c98a3a'; g.beginPath(); g.arc(74, 118, 18, 0, 7); g.fill();                                     // baş
    g.fillStyle = '#b8742e'; for (const x of [88, 104, 150, 166]) g.fillRect(x, 160, 10, 34);                       // bacaklar
    g.strokeStyle = '#b8742e'; g.lineWidth = 7; g.beginPath(); g.moveTo(184, 134); g.quadraticCurveTo(214, 110, 206, 84); g.stroke();   // kuyruk
    g.fillStyle = '#2a1a10'; g.beginPath(); g.arc(68, 114, 2.5, 0, 7); g.fill();
  }, 7);
}
function findGeo(d: Dig, m: Mats): [THREE.BufferGeometry, THREE.Material][] {
  switch (d.id) {
    case 'bilet': { const c = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20); const h = new THREE.TorusGeometry(0.05, 0.015, 6, 12); h.rotateX(Math.PI / 2); return [[at(c, 0, 0.03, 0), m.terra], [at(h, 0.08, 0.06, 0), m.dark]]; }
    case 'thyrsus': { const c = new THREE.ConeGeometry(0.16, 0.45, 12); c.rotateZ(Math.PI / 2); const s = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8); s.rotateZ(Math.PI / 2); return [[at(c, 0, 0.16, 0), m.marble], [at(s, 0.4, 0.06, 0), m.marble]]; }
    case 'apollon': { const b = new THREE.CylinderGeometry(0.2, 0.26, 1.3, 12); b.rotateZ(Math.PI / 2); const h = new THREE.SphereGeometry(0.16, 14, 10); const l = new THREE.CylinderGeometry(0.1, 0.09, 0.8, 8); l.rotateZ(Math.PI / 2); const l2 = l.clone();
      return [[at(b, 0, 0.24, 0), m.marble], [at(h, -0.82, 0.24, 0), m.marble], [at(l, 1.0, 0.14, 0.11), m.marble], [at(l2, 1.0, 0.14, -0.11), m.marble]]; }
    case 'maske': { const b = new THREE.BoxGeometry(1.7, 0.6, 0.7); const f = new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); f.scale(1, 1.3, 0.5); f.rotateX(Math.PI / 2); const f2 = f.clone();
      const e = new THREE.SphereGeometry(0.05, 8, 6), e2 = e.clone(), e3 = e.clone(), e4 = e.clone();
      return [[at(b, 0, 0.3, 0), m.marble], [at(f, -0.4, 0.3, 0.35), m.marble], [at(f2, 0.4, 0.3, 0.35), m.marble], [at(e, -0.48, 0.36, 0.45), m.dark], [at(e2, -0.32, 0.36, 0.45), m.dark], [at(e3, 0.32, 0.36, 0.45), m.dark], [at(e4, 0.48, 0.36, 0.45), m.dark]]; }
    case 'mozaik': return [];
  }
}
function Trench({ d, m }: { d: Dig; m: Mats }) {
  const y0 = useMemo(() => { const [x, z] = d.at, r = Math.hypot(x, z); return inCavea(x, z) ? seatY(TH.r0 + Math.ceil((r - TH.r0) / 0.8) * 0.8) : groundY(x, z); }, [d]);   // sıralarda: basamağın üst yüzü
  const mound = useRef<THREE.Mesh>(null), flag = useRef<THREE.Group>(null);
  const parts = useMemo(() => findGeo(d, m), [d, m]);
  const mosaic = useMemo(() => (d.id === 'mozaik' ? new THREE.MeshStandardMaterial({ map: lionTex(), roughness: 0.7 }) : null), [d]);
  const frame = useMemo(() => { const s = d.size, g: THREE.BufferGeometry[] = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.push(at(new THREE.BoxGeometry(0.06, 0.5, 0.06), (sx * s) / 2, 0.25, (sz * s) / 2));
    for (const sz of [-1, 1]) g.push(at(new THREE.BoxGeometry(s, 0.012, 0.012), 0, 0.42, (sz * s) / 2)); for (const sx of [-1, 1]) g.push(at(new THREE.BoxGeometry(0.012, 0.012, s), (sx * s) / 2, 0.42, 0));
    return mergeGeometries(g)!; }, [d]);
  useFrame((_, dt) => { const n = useAs.getState().dug[d.id] ?? 0, want = (LAYERS - n) * 0.22 + 0.001;
    if (mound.current) { const cur = mound.current.scale.y; mound.current.scale.y = cur + (want - cur) * Math.min(1, dt * 5); mound.current.scale.y = Math.max(mound.current.scale.y, 0); mound.current.position.y = y0 - 0.5 + mound.current.scale.y / 2; mound.current.visible = mound.current.scale.y > 0.52 || n < LAYERS; }
    if (flag.current) flag.current.visible = n < LAYERS; });
  const s = d.size;
  return <group position={[d.at[0], 0, d.at[1]]}>
    <group position={[0, y0, 0]}>
      <mesh geometry={frame} material={m.terra} />
      <group rotation-y={d.id === 'apollon' ? Math.PI / 2 : 0}>{parts.map(([g, mat], i) => <mesh key={i} geometry={g} material={mat} castShadow />)}</group>
      {mosaic && <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} material={mosaic}><planeGeometry args={[s, s]} /></mesh>}
      <group ref={flag} position={[s / 2 + 0.2, 0, -s / 2 - 0.2]}>
        <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.025, 0.025, 2.2, 6]} /><meshStandardMaterial color="#d8d2c4" /></mesh>
        <mesh position={[0.3, 2.0, 0]}><planeGeometry args={[0.6, 0.38]} /><meshStandardMaterial color="#d84a2a" side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
    <mesh ref={mound} material={m.soil} scale={[1, LAYERS * 0.22 + 0.5, 1]} position={[0, y0 - 0.5 + (LAYERS * 0.22 + 0.5) / 2, 0]} castShadow receiveShadow><boxGeometry args={[s, 1, s]} /></mesh>
  </group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), nearD = useRef(-1);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.y += (groundY(nx, nz) - live.y) * Math.min(1, dt * 10);
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const dk = S.started ? nearDig(live.x, live.z, S.dug) : -1; if (dk !== nearD.current) { nearD.current = dk; S.set({ nearD: dk }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    applyFp(camera, live.x, live.y + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
