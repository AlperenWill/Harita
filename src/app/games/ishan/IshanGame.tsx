/**
 * Artvin — İşhan Manastırı: "Pencereden Bak" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Kilise kazı buluntuları yüzünden kapalıdır. Oyuncu köyde kilisenin çevresinde dolaşır, dört ayrıntıyı inceler (E) ve pencere
 * altlarındaki üç taşa çıkıp içeri bakar (payeler ve kazı, apsis, kubbe freski). 4 ayrıntı + 3 pencere.
 */
import { SceneFog } from '../shared/SceneFog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Eye, Church as ChurchIcon } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { PEEKS, SPOTS, SRC, START, groundY, nearPeek, nearestSpot, slide, type Spot } from './site';
import { Church, Interior, Terrain, Village, useMats } from './IshanModels';

const THEME = { accent: '#5d6b3a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6, FOV = 66;
const audio = new WalkAudio({ freq: 640, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(0.35, 0.7, 0.62).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; peekNear: number; peek: number; peeked: string[]; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, peekNear: -1, peek: -1, peeked: [] as string[], endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const back = { yaw: 0, pitch: 0 };
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
/** Taşa çık: kamera pencereden içeri bakar; bakış serbest */
function climb(k: number) { const s = useAs.getState(), p = PEEKS[k]; back.yaw = live.view.yaw; back.pitch = live.view.pitch; live.view.yaw = p.yaw; live.view.pitch = p.pitch;
  s.set({ peek: k, peeked: s.peeked.includes(p.id) ? s.peeked : [...s.peeked, p.id] }); audio.step(400); }
function climbDown() { const s = useAs.getState(); if (s.peek < 0) return; live.view.yaw = back.yaw; live.view.pitch = back.pitch; s.set({ peek: -1 }); }
function peekInfo() { const s = useAs.getState(), p = PEEKS[s.peek]; if (!p) return; s.set({ card: { id: p.id, name: p.name, kicker: p.kicker, text: p.text, source: p.id === 'payeler' ? SRC.ht : SRC.tsu } }); audio.tone(true); audio.speak(`${p.name}. ${p.text}`); }

export default function IshanGame({ onExit }: { onExit: () => void }) {
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
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.peek >= 0) climbDown(); else if (s.peekNear >= 0) climb(s.peekNear); else if (s.near) inspect(s.near); }
      if (e.code === 'KeyI' && s.peek >= 0 && !s.card) peekInfo();
      if (e.code === 'Escape') { if (s.card) close(); else if (s.peek >= 0) climbDown(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __ishan: unknown }).__ishan = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      peek: (k: number) => { const p = PEEKS[k]; live.x = p.stand[0]; live.z = p.stand[1]; useAs.getState().set({ started: true, card: null }); climb(k); }, down: () => climbDown(),
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + PEEKS.length, found = S.seen.length + S.peeked.length, done = found >= total;
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
            <SkyEnvironment sky="#dbe7ee" sun="#fff0d6" ground="#5d6a45" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<ChurchIcon size={15} />} label={done ? 'Hepsini buldun' : `Pencereler ${S.peeked.length}/${PEEKS.length} · ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="ok" />}
        {S.started && S.peek >= 0 && !S.card && <PeekPanel k={S.peek} />}
        {S.started && (<>
          {S.peek < 0 && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#5d6b3a]" />}
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.peek < 0 && S.peekNear >= 0 && <InteractPrompt icon={<Eye size={18} />} label={`Taşa çık, pencereden bak (${PEEKS[S.peekNear].kicker.toLowerCase()})`} onClick={() => climb(S.peekNear)} />}
          {!S.card && S.peek < 0 && S.peekNear < 0 && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && S.peek < 0 && <Hint>Kilise kapalı: çevresinde dolaş · pencere altındaki taşlara çık (E) · parıltılı ayrıntılarda E</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Artvin · Yusufeli · İşhan köyü" title="Pencereden Bak"
          intro={<>İşhan Kilisesi zeminde çıkan kazı buluntuları yüzünden kapalı. Köylülerin yaptığı gibi <b>pencere altındaki taşlara çık</b> ve içeri bak: <b>dört paye</b>, <b>apsis</b> ve <b>kubbe freski</b>.</>}
          controls={CONTROLS} note="Plan ölçüleri kaynaktan alındı; cephe süsleri, iç düzen, fresk ve kazı alanının görünüşü temsilîdir." cta="Köye gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && S.peek < 0 && <EndSheet kicker="İşhan" title="Taşın üstünden"
          text="Bin yılı aşkın kilise, kapıları kapalı olsa da pencerelerinden içindeki payeleri, apsisi ve kubbedeki melekleri gösteriyor."
          stayLabel="Köyde kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Eye size={16} />, text: <>Pencere altındaki taşta <b>E</b>: çık ve içeri bak (bakış serbest) · <b>I</b>: bilgi · <b>E</b>: in</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
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
      <Terrain m={m} />
      <Church m={m} />
      <Interior m={m} />
      <Village m={m} />
      <Markers />
    </group>
  );
}
function Markers() {
  const pts = useMemo(() => [...SPOTS.map((s) => ({ id: s.id, p: s.mark })), ...PEEKS.map((p) => ({ id: p.id, p: [p.stand[0], 1.6, p.stand[1]] as [number, number, number] }))], []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); pts.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id) && !st.peeked.includes(s.id) && st.peek < 0; m.position.y = s.p[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{pts.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.p} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), pId = useRef(-2);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(), active = S.started && !S.card && S.peek < 0 && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const pk = S.started ? nearPeek(live.x, live.z, []) : -1; if (pk !== pId.current) { pId.current = pk; S.set({ peekNear: pk }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (S.peek >= 0) { const c = PEEKS[S.peek].cam; applyFp(camera, c[0], c[1], c[2], live.view, 0); }
    else if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}

/** Pencereden bakarken: başlık, bilgi ve inme düğmeleri */
function PeekPanel({ k }: { k: number }) {
  const p = PEEKS[k];
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(14px,env(safe-area-inset-bottom))] mx-auto flex max-w-md items-center gap-2 rounded-3xl bg-[#f7f5f1]/95 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="min-w-0 flex-1"><div className="text-[11px] font-bold uppercase tracking-wide text-[#5d6b3a]">{p.kicker} · pencereden bakıyorsun</div><div className="truncate text-sm font-semibold">{p.name}</div></div>
    <button onClick={peekInfo} className="rounded-xl bg-[#5d6b3a] px-3 py-2 text-xs font-bold text-white">Bilgi</button>
    <button onClick={climbDown} className="rounded-xl bg-black/5 px-3 py-2 text-xs font-bold">İn</button>
  </div>;
}
