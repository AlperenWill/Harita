/**
 * Elazığ — Harput Kalesi: "Süt Kalesi" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu eski Harput'tan yokuşla kaleye çıkar. Efsaneye göre kale yapılırken kuraklık vardı, harca su yerine süt katıldı: yamaçtaki üç
 * sürüden süt topla (E), surların içindeki harç teknesinde karıştır (E), doğudaki gediği üç sıra taşla ör (E). 4 ayrıntı + gedik.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Hammer, MousePointer2, Search, Milk, Castle } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_SUT, COURSES, SPOTS, START, atBreach, atTrough, groundY, nearHerd, nearestSpot, slide, type Spot } from './site';
import { Ground, Herds, Mountains, Town, Walls, Works, useMats } from './HarputModels';

const THEME = { accent: '#6b5a3e' };
const EYE = 1.62, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.7, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
type Act = 'herd' | 'trough' | 'breach' | null;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; act: Act; herd: number; milked: number[]; pails: number; mortar: number; courses: number; panel: number; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, act: null as Act, herd: -1, milked: [] as number[], pails: 0, mortar: 0, courses: 0, panel: -1, endShown: false, toast: null as string | null };
const useHar = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useHar.getState().set({ toast: t }); toastT = setTimeout(() => useHar.getState().set({ toast: null }), ms); };
function act() { const s = useHar.getState();
  if (s.act === 'herd' && s.herd >= 0 && !s.milked.includes(s.herd)) { s.set({ milked: [...s.milked, s.herd], pails: s.pails + 1 }); audio.step(1200); say(`Bir kova süt aldın · elinde ${s.pails + 1} kova`); return; }
  if (s.act === 'trough') { if (!s.pails) { say('Teknede su yok, çeşme kurumuş: yamaçtaki sürülerden süt getir.'); return; } s.set({ mortar: s.mortar + s.pails, pails: 0 }); audio.tone(true); say('Taş tozu, kireç ve sütle harcı karıştırdın.'); return; }
  if (s.act === 'breach') { if (!s.mortar) { say('Harç yok: önce teknede harç karıştır.'); return; } const courses = s.courses + 1; s.set({ courses, mortar: s.mortar - 1 }); audio.tone(true);
    if (courses >= COURSES) { s.set({ card: CARD_SUT }); audio.speak(`${CARD_SUT.name}. ${CARD_SUT.text}`); } else say(`Bir sıra örüldü · ${courses}/${COURSES}`); }
}
export default function HarputGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useHar(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useHar.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useHar.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useHar.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useHar.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useHar.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.act) act(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.panel >= 0) s.set({ panel: -1 }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __harput: unknown }).__harput = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useHar.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      build: (n: number) => useHar.getState().set({ courses: n, milked: [0, 1, 2].slice(0, n), card: null }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useHar.getState(); return a.started && !a.card && a.panel < 0 && !pause.on; }, () => audio.unlock());
  const built = S.courses >= COURSES;
  const total = SPOTS.length + 1, found = S.seen.length + (built ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e8e4d8] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
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
          objective={S.started ? <Objective icon={<Castle size={15} />} label={done ? 'Hepsini buldun' : `Gedik ${S.courses}/${COURSES} · süt ${S.pails} · harç ${S.mortar}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Teknede') || S.toast?.startsWith('Harç yok') ? 'bad' : 'ok'} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#6b5a3e]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.act === 'herd' && <InteractPrompt icon={<Milk size={18} />} label="Sürüden süt al" onClick={act} />}
          {!S.card && S.act === 'trough' && <InteractPrompt icon={<Milk size={18} />} label="Harcı sütle karıştır" onClick={act} />}
          {!S.card && S.act === 'breach' && <InteractPrompt icon={<Hammer size={18} />} label="Gediğe bir sıra taş ör" onClick={act} />}
          {!S.card && !S.act && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Yamaçtaki sürülerden süt topla · kale içindeki teknede harç karıştır · doğu surundaki gediği ör</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Elazığ · Harput · Efsane" title="Süt Kalesi"
          intro={<>Anlatıya göre Harput Kalesi yapılırken kuraklık vardı ve harca su yerine süt katıldı. Kuru çeşmenin başında kal: <b>sürülerden süt topla</b>, <b>harcı karıştır</b>, surdaki <b>gediği ör</b>. Yolda Ulu Camii'nin eğik minaresine uğra.</>}
          controls={CONTROLS} note="Süt anlatısı bir efsanedir. Surların biçimi, gedik, harç teknesi ve zindanın yeri temsilîdir." cta="Kaleye çık" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Harput" title="Sütle örülen sur"
          text="Efsane gerçek olsun ya da olmasın, kaleye adını vermiş: Süt Kalesi. Aşağıda eğik minare yüzyıllardır ayakta."
          stayLabel="Kalede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Milk size={16} />, text: <>Sürüde, teknede ve gedikte <b>E</b></> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low', courses = useHar((s) => s.courses), mortar = useHar((s) => s.mortar), milked = useHar((s) => s.milked);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={4} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e4e2d8', 400, 3600]} />
      <hemisphereLight args={['#e7eef2', '#7a7458', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.5} color="#fff0d6" />
      {!low && <Clouds />}
      <Mountains />
      <Ground m={m} />
      <Walls m={m} courses={courses} />
      <Works m={m} mortar={mortar} />
      <Herds milked={milked} />
      <Town m={m} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useHar.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), actId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useHar.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const hi = nearHerd(live.x, live.z), ac: Act = !S.started ? null : hi >= 0 && !S.milked.includes(hi) ? 'herd' : atTrough(live.x, live.z) ? 'trough' : atBreach(live.x, live.z) && S.courses < COURSES ? 'breach' : null;
    if (`${ac}:${hi}` !== actId.current) { actId.current = `${ac}:${hi}`; S.set({ act: ac, herd: hi }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
