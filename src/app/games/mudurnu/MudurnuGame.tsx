/**
 * Bolu — Mudurnu Tarihî Çarşısı: "Cuma Duası" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Çarşıya ve sokaklara dağılmış beş ustayı bul, E ile cuma duasına davet et: usta işini bırakıp Orta Çarşı'daki çınarın altına yürür.
 * Hepsi toplanınca esnaf duası kartı açılır. 5 ayrıntı + 5 usta.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Users, Hand } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { Character, newRig, type Palette, type RigState } from '../kiz-kulesi/NPCController';
import { Crowd, type Walker } from '../shared/Crowd';
import { ARASTA, CARD_DUA, GATHER, MASTERS, SPOTS, START, TREE, groundY, nearMaster, nearestSpot, slide, type Spot } from './site';
import { Ground, Town, Trees, useMats } from './MudurnuModels';

const THEME = { accent: '#7a5a3a' };
const EYE = 1.62, WALK = 2, RUN = 4.2, FOV = 66;
const audio = new WalkAudio({ freq: 820, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.8, 0.45).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearM: number; invited: string[]; dua: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearM: -1, invited: [] as string[], dua: false, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0 };
const pause = { on: false };
const keys = new Set<string>();
/** Ustaların konumu (ritim: dükkân önünde bekler; davet edilince meydana yürür) */
const faceStreet = (z: number) => (z < 0 ? Math.PI : 0);
const mkRigs = () => MASTERS.map((m) => newRig(m.at[0], m.at[1], Math.abs(m.at[1]) < ARASTA.hw ? faceStreet(m.at[1]) : 0));
let rigs: RigState[] = mkRigs();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3200) => { clearTimeout(toastT); useAs.getState().set({ toast: t }); toastT = setTimeout(() => useAs.getState().set({ toast: null }), ms); };
function invite(k: number) { const s = useAs.getState(), m = MASTERS[k]; if (s.invited.includes(m.id)) return; const invited = [...s.invited, m.id]; s.set({ invited, nearM: -1 }); audio.tone(true);
  say(`${m.craft}: “${m.line}” · ${invited.length}/${MASTERS.length}`); }
const PAL = (m: (typeof MASTERS)[number], i: number): Palette => ({ skin: ['#d9a982', '#c99272', '#e2b48d', '#b98262', '#d4a07a'][i], hair: '#3a2c22', top: m.shirt, topStripe: m.apron, pants: '#3b3a36', shoes: '#3a2a1e', hat: i % 2 ? 'bork' : undefined, hatColor: '#4a3a2c', beard: i % 3 === 0 ? '#5a4a3a' : undefined });
const CROWD: Walker[] = [
  { id: 'w1', at: [20, 0.8], yaw: -Math.PI / 2, path: [[20, 0.8], [58, 0.8], [58, -0.8], [20, -0.8]], palette: { skin: '#d9a982', hair: '#2a2018', top: '#a6533a', pants: '#3b3f4a', shoes: '#3a2a1e', hat: 'yemeni', hatColor: '#d8cbb0' } },
  { id: 'w2', at: [-6, 6], yaw: 0, path: [[-6, 6], [-14, -4], [-6, -12], [12, -10], [14, 6]], palette: { skin: '#c99272', hair: '#151515', top: '#3f6e5a', pants: '#2b3445', shoes: '#e9e6df' } },
  { id: 't1', at: [40, 2.2], yaw: 0, talk: true, palette: { skin: '#e2b48d', hair: '#3b2a20', top: '#6b5a8a', pants: '#3a3a42', shoes: '#5a3a26' } },
  { id: 't2', at: [40.6, 0.8], yaw: Math.PI, talk: true, palette: { skin: '#b98262', hair: '#222', top: '#c9b48a', pants: '#3b3a36', shoes: '#3a2a1e', hat: 'bork', hatColor: '#5a4a3a' } },
];

export default function MudurnuGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAs(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.08; rigs.splice(0, rigs.length, ...mkRigs()); };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useAs.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useAs.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useAs.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useAs.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAs.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearM >= 0) invite(s.nearM); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __mudurnu: unknown }).__mudurnu = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      inviteAll: (n = MASTERS.length) => { for (let k = 0; k < n; k++) invite(k); },
      arrive: () => { useAs.getState().invited.forEach((id) => { const k = MASTERS.findIndex((m) => m.id === id); rigs[k].x = GATHER[k][0]; rigs[k].z = GATHER[k][1]; }); },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + MASTERS.length, found = S.seen.length + S.invited.length, done = S.dua && S.seen.length >= SPOTS.length;
  const nm = S.nearM >= 0 ? MASTERS[S.nearM] : null;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Masters />
            {tier !== 'low' && <Crowd list={CROWD} player={{ current: live }} />}
            <Controller stick={stick} />
            <SkyEnvironment sky="#cfe1ee" sun="#fff0d6" ground="#6a6455" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Users size={15} />} label={done ? 'Hepsi tamam' : `Ustalar ${S.invited.length}/${MASTERS.length} · ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone="ok" />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7a5a3a]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && nm && <InteractPrompt icon={<Hand size={18} />} label={`Davet et: ${nm.craft}`} onClick={() => invite(S.nearM)} />}
          {!S.card && !nm && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>{S.invited.length < MASTERS.length ? 'Arastada ve sokaklarda beş ustayı bul, E ile cuma duasına davet et · meydandaki çınarın altında toplanırlar' : S.dua ? 'Parıltılı ayrıntıları incele' : 'Ustalar çınarın altına yürüyor'}</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Bolu · Mudurnu · Orta Çarşı" title="Cuma Duası"
          intro={<>Cuma günü, Orta Çarşı'da esnaf duası vakti. Arastaya ve sokaklara dağılmış <b>beş ustayı</b> bul, duaya davet et; hepsi <b>çınarın altında</b> toplansın. Yolda camiye, hamama ve konaklara da bak.</>}
          controls={CONTROLS} note="Çarşının yerleşimi, dükkânlar, ustaların zanaatleri ve toplanma temsilîdir." cta="Çarşıya gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Mudurnu" title="Ahi kentinde bir cuma"
          text="Ustalar çınarın altında buluştu. Mudurnu'nun çarşısı, camisi ve hamamıyla yüzyıllardır süren esnaf geleneğini taşıyor."
          stayLabel="Çarşıda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Hand size={16} />, text: <>Ustaya yaklaş: <b>E</b> ile cuma duasına davet et</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree();
  useEffect(() => { scene.environmentIntensity = 0.4; scene.fog = new THREE.Fog('#d9e4ea', 120, 520); return () => { scene.fog = null; }; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <hemisphereLight args={['#e7eef2', '#6a6050', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.6} color="#fff0d6" />
      {!low && <Clouds />}
      <Ground m={m} />
      <Town m={m} />
      <group userData={{ noCast: true }}><Trees m={m} n={low ? 220 : 520} /></group>
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.16, 0]} /></mesh>)}</group>;
}
/** Ustalar: dükkân önünde bekler, oyuncuya bakar; davet edilince çınarın altına yürür ve ağaca döner */
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Masters() {
  const refs = useMemo(() => MASTERS.map((_, i) => ({ current: rigs[i] })), []);
  const ring = useRef<(THREE.Mesh | null)[]>([]);
  const look = useMemo(() => MASTERS.map(() => new THREE.Vector3()), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(); let arrived = 0;
    MASTERS.forEach((m, i) => { const r = rigs[i]; refs[i].current = r;
      if (S.invited.includes(m.id)) { const [tx, tz] = GATHER[i], dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz);
        if (d > 0.15) { const st = Math.min(d, 1.5 * dt); r.x += (dx / d) * st; r.z += (dz / d) * st; r.speed = 1.5; r.yaw += wrap(Math.atan2(-dx, -dz) - r.yaw) * (1 - Math.exp(-dt * 8)); r.look = null; }
        else { arrived++; r.speed = 0; r.yaw += wrap(Math.atan2(-(TREE[0] - r.x), -(TREE[1] - r.z)) - r.yaw) * (1 - Math.exp(-dt * 4)); r.look = null; } }
      else { const pd = Math.hypot(live.x - r.x, live.z - r.z); r.look = pd < 7 ? look[i].set(live.x, EYE, live.z) : null; if (pd < 4.5) r.yaw += wrap(Math.atan2(-(live.x - r.x), -(live.z - r.z)) - r.yaw) * (1 - Math.exp(-dt * 3)); }
      const g = ring.current[i]; if (g) { g.visible = S.started && !S.invited.includes(m.id); g.position.set(r.x, 0.03, r.z); } });
    if (arrived === MASTERS.length && !S.dua && !S.card) { S.set({ dua: true, card: CARD_DUA }); audio.tone(true); audio.speak(`${CARD_DUA.name}. ${CARD_DUA.text}`); }
  });
  return <group>
    {MASTERS.map((m, i) => <group key={m.id}><Character rig={refs[i]} palette={PAL(m, i)} castShadow />
      <mesh ref={(x) => { ring.current[i] = x; }} rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.7, 28]} /><meshBasicMaterial color="#f2c14e" transparent opacity={0.85} depthWrite={false} /></mesh></group>)}
  </group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), nearM = useRef(-1);
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
    const mk = S.started ? nearMaster(live.x, live.z, S.invited) : -1; if (mk !== nearM.current) { nearM.current = mk; S.set({ nearM: mk }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    applyFp(camera, live.x, groundY() + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
