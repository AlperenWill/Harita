/**
 * Gümüşhane — Santa Harabeleri: "Sisteki Yedi Kilise" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Sisli, ladin ormanlı vadide yedi mahallenin kiliselerini bul (kilisenin kapısına yaklaşmak yeter). Her kilisede sis biraz açılır.
 * Pusula en yakın bulunmamış kilisenin yönünü birkaç saniye gösterir. 4 ayrıntı + 7 kilise.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Compass, Church as ChurchIcon } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_ALL, HAMLETS, SPOTS, START, churchFront, fogFar, groundY, nearChurch, nearestSpot, slide, type Spot } from './site';
import { Forest, Hamlets, Terrain, useMats } from './SantaModels';

const THEME = { accent: '#4a5d4a' };
const EYE = 1.62, WALK = 2, RUN = 4.2, FOV = 66;
const audio = new WalkAudio({ freq: 640, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.3, 0.75, 0.5).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; found: string[]; compass: number | null; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, found: [] as string[], compass: null as number | null, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined, compassT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3000) => { clearTimeout(toastT); useAs.getState().set({ toast: t }); toastT = setTimeout(() => useAs.getState().set({ toast: null }), ms); };
function findChurch(k: number) { const s = useAs.getState(), h = HAMLETS[k]; if (s.found.includes(h.id)) return; const found = [...s.found, h.id]; audio.tone(true);
  if (found.length === HAMLETS.length) { s.set({ found, card: CARD_ALL }); audio.speak(`${CARD_ALL.name}. ${CARD_ALL.text}`); } else { s.set({ found }); say(`Kilise ${found.length}/${HAMLETS.length} bulundu · sis biraz açıldı`, 2800); } }
/** Pusula: en yakın bulunmamış kilisenin yönü, bakış yönüne göre (radyan; 0 = ileri) */
function useCompass() { const s = useAs.getState(); let best = -1, bd = Infinity; HAMLETS.forEach((h, i) => { if (s.found.includes(h.id)) return; const [fx, fz] = churchFront(h), d = Math.hypot(fx - live.x, fz - live.z); if (d < bd) { bd = d; best = i; } });
  if (best < 0) return; const [fx, fz] = churchFront(HAMLETS[best]), world = Math.atan2(-(fx - live.x), -(fz - live.z)); let rel = world - live.view.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  clearTimeout(compassT); s.set({ compass: -rel }); audio.step(700); compassT = setTimeout(() => useAs.getState().set({ compass: null }), 3200); }

export default function SantaGame({ onExit }: { onExit: () => void }) {
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
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.near) inspect(s.near); }
      if (e.code === 'KeyQ' && !s.card) useCompass();
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __santa: unknown }).__santa = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      church: (k: number) => { const [x, z] = churchFront(HAMLETS[k]); live.x = x; live.z = z + 6; live.view.yaw = 0; live.view.pitch = 0.08; useAs.getState().set({ started: true, card: null }); },
      findAll: (n: number) => { for (let k = 0; k < n; k++) findChurch(k); useAs.getState().set({ card: null }); }, compass: () => useCompass(),
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + HAMLETS.length, found = S.seen.length + S.found.length, done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 6000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} found={S.found.length} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dbe7ee" sun="#fff0d6" ground="#5f6a50" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<ChurchIcon size={15} />} label={done ? 'Hepsini buldun' : `Kiliseler ${S.found.length}/${HAMLETS.length} · ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="ok" />}
        {S.started && !S.card && <button onPointerDown={(e) => e.stopPropagation()} onClick={useCompass} aria-label="Pusula" className="pointer-events-auto absolute bottom-[calc(max(16px,env(safe-area-inset-bottom))+64px)] right-[max(14px,env(safe-area-inset-right))] grid h-14 w-14 place-items-center rounded-full bg-[#f7f5f1]/92 text-[#1f1b17] shadow ring-1 ring-black/5">
          <Compass size={22} />{S.compass !== null && <span className="absolute -top-14 left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-[#4a5d4a] text-lg font-bold text-white shadow" style={{ transform: `translateX(-50%) rotate(${S.compass}rad)` }}>↑</span>}</button>}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#4a5d4a]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Sisin içinde yedi mahallenin kiliselerini bul: kapısına yaklaşman yeter · pusula (Q) en yakını gösterir</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Gümüşhane · Dumanlı · Santa" title="Sisteki Yedi Kilise"
          intro={<>Ladin ormanlı vadiye sis çökmüş. Yamaçlara dağılmış <b>yedi mahallenin kiliselerini</b> bul; her kilisede sis biraz açılır. Takılırsan <b>pusulaya</b> bak.</>}
          controls={CONTROLS} note="Mahallelerin yeri, evlerin sayısı, kiliselerin biçimi ve sisin açılması temsilîdir." cta="Vadiye in" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Santa" title="Sisten çıkan köy"
          text="Yedi mahallesi ve kiliseleriyle Santa, sisin içinden ortaya çıkan bir maden köyünün izlerini taşıyor."
          stayLabel="Vadide kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <ChurchIcon size={16} />, text: <>Kilisenin kapısına yaklaş: bulunmuş sayılır</> },
  { icon: <Compass size={16} />, text: <>Pusula (<b>Q</b> ya da düğme): en yakın bulunmamış kilise</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier, found }: { tier: Tier; found: number }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); const fog = useMemo(() => new THREE.Fog('#dfe3e2', 2, fogFar(0)), []);
  useEffect(() => { scene.environmentIntensity = 0.4; scene.fog = fog; return () => { scene.fog = null; scene.background = null; }; }, [scene, fog]);
  useEffect(() => { scene.background = found < 4 ? new THREE.Color('#dfe3e2') : null; }, [scene, found]);   // sis kalınken gök görünmez
  useFrame((_, dt) => { const want = fogFar(found); fog.far += (want - fog.far) * Math.min(1, dt * 0.8); fog.near = fog.far * 0.05; });   // sis yavaşça açılır
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      {found >= 4 && <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>}
            <hemisphereLight args={['#e7eef2', '#4f5d48', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.2} color="#fff0d6" />
      {!low && found >= 5 && <Clouds />}
      <Terrain m={m} />
      <Forest n={low ? 700 : 1600} />
      <Hamlets m={m} />
      <Markers />
    </group>
  );
}
function Markers() {
  const pts = useMemo(() => SPOTS.map((s) => ({ id: s.id, p: [s.at[0], groundY(s.at[0], s.at[1]) + 1.9, s.at[1]] as [number, number, number] })), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); pts.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.p[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{pts.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.p} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const ck = S.started && !S.card ? nearChurch(live.x, live.z, S.found) : -1; if (ck >= 0) findChurch(ck);
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
