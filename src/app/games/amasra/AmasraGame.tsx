/**
 * Bartın — Amasra Kalesi: "Taştaki Armalar" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu karadan iki limanın arasındaki boyundan Zindan Kapısı'na yürür, surların iç yüzündeki dört kabartmayı (Cenova arması, aile
 * arması, kartal, öküzbaşı) bulup inceler (E), Kemere Köprüsü'nden Boztepe'ye geçer ve ucundaki seyir yerinden iki limana bakar.
 * 3 ayrıntı + 4 kabartma + seyir yeri.
 */
import { SceneFog } from '../shared/SceneFog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Shield, Eye } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_VIEW, PEN, RELIEFS, SPOTS, SRC, START, atView, groundY, nearRelief, nearestSpot, reliefPos, slide, type Spot } from './site';
import { Bridge, Mountains, Reliefs, Terrain, Town, Viewpoint, Walls, useMats } from './AmasraModels';

const THEME = { accent: '#2f5d6e' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6, FOV = 66;
const audio = new WalkAudio({ freq: 640, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.35, 0.66, 0.66).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; relief: number; got: string[]; atView: boolean; viewed: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, relief: -1, got: [] as string[], atView: false, viewed: false, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
function takeRelief(k: number) { const s = useAs.getState(), r = RELIEFS[k]; if (s.got.includes(r.id)) return; const got = [...s.got, r.id];
  s.set({ got, card: { id: r.id, name: r.name, kicker: `${r.kicker} · kabartma ${got.length}/${RELIEFS.length}`, text: r.text, source: SRC.kure } }); audio.tone(true); audio.speak(`${r.name}. ${r.text}`); }
function lookOut() { const s = useAs.getState(); if (s.viewed) return; s.set({ viewed: true, card: CARD_VIEW }); audio.tone(true); audio.speak(`${CARD_VIEW.name}. ${CARD_VIEW.text}`); }

export default function AmasraGame({ onExit }: { onExit: () => void }) {
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
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.relief >= 0) takeRelief(s.relief); else if (s.atView && !s.viewed) lookOut(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __amasra: unknown }).__amasra = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      relief: (k: number) => { const r = RELIEFS[k], [x, z] = reliefPos(r.a, 0.12); live.x = x; live.z = z; live.view.yaw = Math.atan2(-Math.cos(r.a) * PEN.rx, -Math.sin(r.a) * PEN.rz); live.view.pitch = 0.1; useAs.getState().set({ started: true, card: null }); },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + RELIEFS.length + 1, found = S.seen.length + S.got.length + (S.viewed ? 1 : 0), done = found >= total;
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
          objective={S.started ? <Objective icon={<Shield size={15} />} label={done ? 'Hepsini buldun' : S.got.length < RELIEFS.length ? `Kabartmalar ${S.got.length}/${RELIEFS.length}` : !S.viewed ? 'Boztepe\'nin ucundaki seyir yerine git' : `Ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="ok" />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f5d6e]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.relief >= 0 && <InteractPrompt icon={<Shield size={18} />} label={`Kabartmayı incele: ${RELIEFS[S.relief].name}`} onClick={() => takeRelief(S.relief)} />}
          {!S.card && S.relief < 0 && S.atView && !S.viewed && <InteractPrompt icon={<Eye size={18} />} label="Seyir yerinden bak" onClick={lookOut} />}
          {!S.card && S.relief < 0 && !(S.atView && !S.viewed) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Zindan Kapısı'ndan gir · surların iç yüzünde parıldayan kabartmalarda E · kuzeydeki köprüden Boztepe'ye geç</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Bartın · Amasra · Zindan ve Sormagir kaleleri" title="Taştaki Armalar"
          intro={<>İki limanın arasındaki boyundan <b>Zindan Kapısı</b>'na yürü. Surların iç yüzündeki <b>dört kabartmayı</b> bul, sonra <b>Kemere Köprüsü</b>'nden Boztepe'ye geçip ucundaki seyir yerinden limanlara bak.</>}
          controls={CONTROLS} note="Sur çizgisi, burçların sayısı ve yeri, kabartmaların biçimi ve yeri temsilîdir." cta="Kaleye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Amasra" title="Dünyanın gözü"
          text="Roma, Bizans, Ceneviz ve Osmanlı'nın izlerini taşıyan surlar, iki limanın ortasındaki yarımadayı bugün de çeviriyor."
          stayLabel="Kalede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Shield size={16} />, text: <>Surda parıldayan kabartmaya yaklaş: <b>E</b> ile incele</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntılar ve Boztepe seyir yeri: <b>E</b></> },
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
      <Mountains />
      <Terrain m={m} />
      <Walls m={m} />
      <Bridge m={m} />
      <Town m={m} />
      <Reliefs />
      <Viewpoint m={m} />
      <Markers />
    </group>
  );
}
function Markers() {
  const pts = useMemo(() => [...SPOTS.map((s) => ({ id: s.id, p: s.mark })), ...RELIEFS.map((r) => { const [x, z] = reliefPos(r.a, 0.03); return { id: r.id, p: [x, PEN.y + 3.1, z] as [number, number, number] }; })], []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); pts.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id) && !st.got.includes(s.id); m.position.y = s.p[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{pts.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.p} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), rId = useRef(-2);
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
    const rl = S.started ? nearRelief(live.x, live.z, S.got) : -1; if (rl !== rId.current) { rId.current = rl; S.set({ relief: rl }); }
    const av = S.started && atView(live.x, live.z); if (av !== S.atView) S.set({ atView: av });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
