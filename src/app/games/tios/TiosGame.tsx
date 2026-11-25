/**
 * Zonguldak — Tios (Filyos) Antik Kenti: "Gözcü Kulesi" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Akropolün kuzeybatısındaki gözcü kulesine çık; ortadaki nişangâhı limanın, tiyatronun, nehir ağzının, su kemerinin ve nekropolün
 * üzerine getirip E'ye bas. Tutmazsa hangi yöne bakılacağı söylenir. Yolda 5 ayrıntı. 5 ayrıntı + 5 yer.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { ArrowDown, ArrowUp, Eye, Footprints, MousePointer2, Search, Binoculars } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { AIM_TOL, CARD_ALL, EYE, SPOTS, START, TARGETS, TOWER_DOOR, WATCH_EYE, aimAt, eyeAt, groundY, nearDoor, nearestSpot, slide, type Spot } from './site';
import { Land, Ruins, Surround, useMats } from './TiosModels';

const THEME = { accent: '#2f6f80' };
const WALK = 2, RUN = 4.2, FOV = 66, ZOOM_FOV = 38;
const audio = new WalkAudio({ freq: 760, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.3, 0.75, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; door: boolean; up: boolean; found: string[]; allShown: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, door: false, up: false, found: [] as string[], allShown: false, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], y: groundY(START.at[0], START.at[1]), view: { yaw: START.yaw, pitch: 0.05 }, speed: 0, bob: 0, step: 0 };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 2800) => { clearTimeout(toastT); useAs.getState().set({ toast: t }); toastT = setTimeout(() => useAs.getState().set({ toast: null }), ms); };
/** Gözle: bakış yönü bir hedefe yakınsa bulunur; değilse en yakın hedefin yönü söylenir */
function look() {
  const s = useAs.getState(), from = eyeAt(live.view.yaw), { k, angle } = aimAt(live.view.yaw, live.view.pitch, s.found, from); if (k < 0) return;
  const t = TARGETS[k];
  if (angle < AIM_TOL) { const found = [...s.found, t.id]; s.set({ found, card: t }); audio.tone(true); audio.speak(`${t.name}. ${t.text}`); return; }
  const dx = t.at[0] - from[0], dy = t.at[1] - from[1], dz = t.at[2] - from[2], want = Math.atan2(-dx, -dz), wp = Math.atan2(dy, Math.hypot(dx, dz));
  const dYaw = Math.atan2(Math.sin(want - live.view.yaw), Math.cos(want - live.view.yaw)), dP = wp - live.view.pitch;
  const h = Math.abs(dYaw) > 0.08 ? (dYaw > 0 ? 'sola' : 'sağa') : '', v = Math.abs(dP) > 0.08 ? (dP > 0 ? 'yukarı' : 'aşağı') : '';
  audio.step(500); say(`Orada ${angle > 0.6 ? 'aradığın bir şey yok' : 'neredeyse'} · biraz daha ${[h, v].filter(Boolean).join(' ve ') || 'dikkatli'} bak`);
}

/** Kuleye çık / in: çıkınca bakış ufka (kuzeye) döner */
function climb(v: boolean) { const s = useAs.getState(); if (v) { live.view.yaw = 0.6; live.view.pitch = -0.12; s.set({ up: true, door: false }); audio.step(600); if (s.found.length < TARGETS.length) say('Gözcü kulesindesin · ufku tara', 2400); }
  else { live.x = TOWER_DOOR[0]; live.z = TOWER_DOOR[1] + 0.8; live.view.yaw = 0; live.view.pitch = 0; s.set({ up: false }); audio.step(600); } }

export default function TiosGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAs(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], y: groundY(START.at[0], START.at[1]), speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.05; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useAs.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useAs.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { const st = useAs.getState(); audio.hush();
    if (!st.allShown && st.found.length === TARGETS.length) { st.set({ card: CARD_ALL, allShown: true }); audio.tone(true); audio.speak(`${CARD_ALL.name}. ${CARD_ALL.text}`); } else st.set({ card: null }); }, []);
  const restart = useCallback(() => { audio.hush(); useAs.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAs.getState(); if (!s.started || pause.on || e.repeat) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.up) look(); else if (s.door) climb(true); else if (s.near) inspect(s.near); }
      if (e.code === 'KeyQ' && s.up && !s.card) climb(false);
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __tios: unknown }).__tios = {
      go: (x: number, z: number) => { live.x = x; live.z = z; live.y = groundY(x, z); useAs.getState().set({ started: true, card: null, up: false }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      up: (v = true) => climb(v), aim: (k: number, off = 0) => { const t = TARGETS[k], dx = t.at[0] - WATCH_EYE[0], dy = t.at[1] - WATCH_EYE[1], dz = t.at[2] - WATCH_EYE[2]; live.view.yaw = Math.atan2(-dx, -dz) + off; live.view.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      gaze: () => look(), close: () => close(),
    };
  }, [close]);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + TARGETS.length, done = S.found.length === TARGETS.length && S.seen.length >= SPOTS.length;
  const watching = S.up;
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
          objective={S.started ? <Objective icon={<Binoculars size={15} />} label={done ? 'Hepsi tamam' : `Kuleden ${S.found.length}/${TARGETS.length} · ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={S.found.length + S.seen.length} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="ok" />}
        {S.started && (<>
          {!S.up && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f6f80]" />}
          <LookCrosshair locked={fpl.locked} />
          {watching && !S.card && <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,.35)]"><div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" /></div>}
          {!S.card && watching && S.found.length < TARGETS.length && <InteractPrompt icon={<Eye size={18} />} label={`Gözle · ${TARGETS.length - S.found.length} yer kaldı`} onClick={look} />}
          {!S.card && watching && <button onPointerDown={(e) => e.stopPropagation()} onClick={() => climb(false)} className="pointer-events-auto absolute top-[calc(max(14px,env(safe-area-inset-top))+64px)] right-[max(14px,env(safe-area-inset-right))] flex items-center gap-1.5 rounded-full bg-[#f7f5f1]/92 px-4 py-2.5 text-sm font-semibold text-[#1f1b17] shadow ring-1 ring-black/5"><ArrowDown size={16} />Kuleden in (Q)</button>}
          {!S.card && !watching && S.door && <InteractPrompt icon={<ArrowUp size={18} />} label="Gözcü kulesine çık" onClick={() => climb(true)} />}
          {!S.card && !watching && !S.door && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>{S.found.length === TARGETS.length ? 'Parıltılı ayrıntıları incele' : watching && S.found.length < TARGETS.length ? `Ara: ${TARGETS.filter((t) => !S.found.includes(t.id)).map((t) => t.name.toLocaleLowerCase('tr')).join(', ')} · nişangâhı üzerine getir, E ile gözle` : 'Akropole güneydoğudaki kapıdan gir, kuzeybatıdaki gözcü kulesine çık'}</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Zonguldak · Filyos · Tios" title="Gözcü Kulesi"
          intro={<>Miletoslu kolonicilerin kurduğu liman kenti. Akropoldeki <b>gözcü kulesine</b> çık ve ufku tara: batık limanı, tiyatroyu, nehir ağzını, su kemerini ve nekropolü <b>bakışınla</b> bul.</>}
          controls={CONTROLS} note="Kentin yerleşimi, uzaklıklar, gözcü kulesi ve yapıların biçimi temsilîdir." cta="Kente gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Tios" title="Kıyıdaki koloni"
          text="Limanı, nehri ve denizi aynı anda gören akropol, Tios'u Batı Karadeniz'in kıyı kentlerinden biri yaptı."
          stayLabel="Kentte kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Binoculars size={16} />, text: <>Kule kapısında <b>E</b>: çık · nişangâhı yerin üzerine getir, <b>E</b> ile gözle · <b>Q</b>: in</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree();
  useEffect(() => { scene.environmentIntensity = 0.4; scene.fog = new THREE.Fog('#d9e4ea', 160, 700); return () => { scene.fog = null; }; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <hemisphereLight args={['#e7eef2', '#6a6050', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.6} color="#fff0d6" />
      {!low && <Clouds />}
      <Land m={m} />
      <Ruins m={m} />
      <group userData={{ noCast: true }}><Surround m={m} n={low ? 160 : 380} /></group>
      <Markers />
      <Found />
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
/** Bulunan yerlerin üstünde ince ışık sütunu (kuleden bakınca ne bulunduğu görünsün) */
function Found() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => { const st = useAs.getState(); TARGETS.forEach((t, i) => { const m = refs.current[i]; if (!m) return; m.visible = st.found.includes(t.id); (m.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.elapsedTime * 2 + i) * 0.1; }); });
  return <group userData={{ noCast: true }}>{TARGETS.map((t, i) => <mesh key={t.id} ref={(m) => { refs.current[i] = m; }} position={[t.at[0], t.at[1] + 9, t.at[2]]} visible={false}><cylinderGeometry args={[0.35, 0.35, 18, 8, 1, true]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.4} depthWrite={false} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), watchR = useRef(false);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(), active = S.started && !S.card && !pause.on && !S.up;
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
    const w = S.started && !S.up && nearDoor(live.x, live.z); if (w !== watchR.current) { watchR.current = w; S.set({ door: w }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (S.up) { const e = eyeAt(live.view.yaw); applyFp(camera, e[0], e[1], e[2], live.view, 0); } else applyFp(camera, live.x, live.y + EYE, live.z, live.view, sway);
    easeFov(camera, S.up ? ZOOM_FOV : FOV, dt);
  });
  return null;
}
