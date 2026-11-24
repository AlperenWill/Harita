/**
 * Hasankeyf — "Türbeyi Taşı". Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * 1) Yürüyüş: Dicle'nin kuzey kıyısında Zeynel Bey Türbesi, Eski Köprü'nün ayakları, El Rızk minaresi ve kayalıktaki mağaralar (E ile kart).
 * 2) Taşıma: türbenin yanında E → türbe tekerlekli taşıyıcı platformdadır; yol boyunca sür (joystick/WASD). Yokuşta hızlı gidersen sarsıntı
 *    artar, dolunca platform durur; yoldan çıkılmaz. Kültür Park'taki temele varınca türbe yerine konur.
 * 3) Baraj: parkta E → göl yükselir; aşağı kent ve köprü ayakları su altında kalır.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Map as MapIcon, MousePointer2, Search, Truck, Waves } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, ToolPanel, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, BRIDGE, CARD_BARAJ, CARD_TASIMA, CLIFF, DRIVE_AT, LAKE_Y, MAX_SPEED, MINARET, PAD, PARK, PLATEAU_Y, RIVER, ROAD, ROAD_LEN, SPOTS, START, TOMB0, groundY, nearestOnRoad, nearestSpot, onRoad, safeSpeed, slide, terrainY, type Spot, type V2 } from './site';
import { Bridge, Cliff, Grass, Ground, Hills, LowerTown, Park, Road, SUN_DIR, Tomb, Transporter, Trees, Water, useMats } from './HasankeyfModels';

const THEME = { accent: '#2f6f7a' };
const EYE = 1.62, WALK = 1.8, RUN = 4.2, FOV = 66;
const audio = new WalkAudio({ freq: 560, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
type Phase = 'walk' | 'drive' | 'placed' | 'flooding' | 'flooded';
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; map: boolean; endShown: boolean; phase: Phase; atDrive: boolean; shake: number; prog: number; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, map: false, endShown: false, phase: 'walk' as Phase, atDrive: false, shake: 0, prog: 0, toast: null as string | null };
const useHk = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const yawOf = (dx: number, dz: number) => Math.atan2(-dx, -dz);
const firstDir = () => { const [a, b] = [ROAD[0], ROAD[1]]; return yawOf(b[0] - a[0], b[1] - a[1]); };
const live = {
  x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number],
  veh: { x: TOMB0[0], z: TOMB0[1], yaw: firstDir(), speed: 0, pitch: 0, stall: 0, shake: 0 },
  tomb: [TOMB0[0], TOMB0[1]] as V2, water: { y: RIVER.y },
};
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useHk.getState().set({ toast: t }); toastT = setTimeout(() => useHk.getState().set({ toast: null }), ms); };
function resetLive() {
  Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0, fly: null }); live.view.yaw = START.yaw; live.view.pitch = 0.04;
  Object.assign(live.veh, { x: TOMB0[0], z: TOMB0[1], yaw: firstDir(), speed: 0, pitch: 0, stall: 0, shake: 0 }); live.tomb = [TOMB0[0], TOMB0[1]]; live.water.y = RIVER.y;
}
function startDrive() { const s = useHk.getState(); if (s.phase !== 'walk') return; s.set({ phase: 'drive', atDrive: false }); audio.tone(true); say('Türbe platformda. Yol boyunca sür: yokuşta yavaşla, yoldan çıkma.', 4600); }
function deliver() {
  const s = useHk.getState(); live.veh.speed = 0; live.tomb = [PAD[0], PAD[1]]; Object.assign(live.veh, { x: PAD[0] + 22, z: PAD[1] - 8, yaw: firstDir(), pitch: 0 });
  live.x = PAD[0] + 9; live.z = PAD[1] + 12; live.view.yaw = yawOf(PAD[0] - live.x, PAD[1] - live.z); live.view.pitch = 0.12;
  s.set({ phase: 'placed', card: CARD_TASIMA, prog: 1, shake: 0 }); audio.tone(true); audio.speak(`${CARD_TASIMA.name}. ${CARD_TASIMA.text}`);
}
function startFlood() { const s = useHk.getState(); if (s.phase !== 'placed' || s.card) return; s.set({ phase: 'flooding' }); audio.tone(false); say('Baraj gölü doluyor…', 5000); }

export default function HasankeyfGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useHk(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useHk.setState(INITIAL); resetLive(); }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useHk.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useHk.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useHk.setState({ ...INITIAL, started: true }); resetLive(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useHk.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.phase === 'walk' && s.atDrive) startDrive(); else if (s.phase === 'placed') startFlood(); else if (s.near && s.phase !== 'drive') inspect(s.near); }
      if (e.code === 'Escape' && s.card) { close(); e.preventDefault(); }
      if (e.code === 'KeyM') s.set({ map: !s.map });
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __hk: unknown }).__hk = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useHk.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      drive: () => { useHk.getState().set({ started: true, card: null }); startDrive(); },
      /** taşıyıcıyı yolun f oranındaki noktaya koy */
      along: (f: number) => { const target = f * ROAD_LEN; let acc = 0; for (let i = 0; i < ROAD.length - 1; i++) { const a = ROAD[i], b = ROAD[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (acc + L >= target) { const t = (target - acc) / L; Object.assign(live.veh, { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: yawOf(b[0] - a[0], b[1] - a[1]) }); return; } acc += L; } },
      deliver: () => { useHk.getState().set({ started: true }); deliver(); },
      flood: () => { useHk.getState().set({ card: null }); startFlood(); },
      water: (y: number) => { live.water.y = y; },
      map: (v: boolean) => useHk.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useHk.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const placed = S.phase === 'placed' || S.phase === 'flooding' || S.phase === 'flooded';
  const total = SPOTS.length + 2, found = S.seen.length + (placed ? 1 : 0) + (S.phase === 'flooded' ? 1 : 0), done = found >= total;
  const label = S.phase === 'drive' ? 'Türbeyi Kültür Park\'a taşı' : S.phase === 'placed' ? 'Baraj gölünü doldur' : S.phase === 'flooding' ? 'Göl yükseliyor' : done ? 'Hepsini buldun' : S.phase === 'walk' && S.seen.length >= 1 ? 'Gez, sonra türbeyi taşı' : 'Hasankeyf\'i gez';
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e8e2d4] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.1, far: 4000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#d9e4ec" sun="#fff0d6" ground="#a8936a" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Truck size={15} />} label={label} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.includes('sarsıl') || S.toast?.includes('dışına') ? 'bad' : 'info'} />}
        {S.started && S.phase === 'drive' && !S.card && <ToolPanel title={<span className="flex items-center gap-1.5"><Truck size={14} /> Taşıyıcı</span>}>
          <div className="w-40 space-y-1.5 text-[11px] font-semibold text-[#4a433c]">
            <div>Yol: %{Math.round(S.prog * 100)}</div>
            <div className="h-1.5 w-full rounded-full bg-black/10"><div className="h-full rounded-full bg-[#2f6f7a]" style={{ width: `${S.prog * 100}%` }} /></div>
            <div>Sarsıntı</div>
            <div className="h-1.5 w-full rounded-full bg-black/10"><div className="h-full rounded-full" style={{ width: `${S.shake * 100}%`, background: S.shake > 0.7 ? '#d14343' : S.shake > 0.4 ? '#d9a21b' : '#1f9d63' }} /></div>
          </div>
        </ToolPanel>}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f6f7a]" />
          {S.phase !== 'drive' && <LookCrosshair locked={fpl.locked} />}
          {!S.card && S.phase === 'walk' && S.atDrive && <InteractPrompt icon={<Truck size={18} />} label="Türbeyi taşımaya başla" onClick={startDrive} />}
          {!S.card && S.phase === 'placed' && <InteractPrompt icon={<Waves size={18} />} label="Baraj gölünü doldur (2019–2020)" onClick={startFlood} />}
          {!S.card && S.phase !== 'drive' && S.phase !== 'placed' && !(S.phase === 'walk' && S.atDrive) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>{S.phase === 'drive' ? 'İleri/geri ve sağa/sola: joystick ya da WASD · yokuşta yavaş git · yoldan çıkma' : S.phase !== 'walk' ? 'Parkta dolaş · aşağıda Dicle vadisine bak · parıltılı ayrıntıda E' : <>Joystick ya da WASD ile yürü · parıltılı ayrıntıda E · türbenin arkasında taşımayı başlat<span className="hidden [@media(pointer:fine)]:inline"> · M: kroki</span></>}</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Batman · Hasankeyf · Dicle" title="Türbeyi Taşı"
          intro={<>Dicle kıyısında Hasankeyf'i gez: köprü ayakları, El Rızk minaresi, kayalıktaki mağaralar. Sonra <b>Zeynel Bey Türbesi'ni</b> tekerlekli platformla yokuş yukarı <b>Kültür Park'a taşı</b>; ardından baraj gölünün yükselişini izle.</>}
          controls={CONTROLS} note="Uzaklıklar çok kısaltıldı; yol, su seviyesi, kayalık ve yapıların ölçüleri temsilîdir." cta="Kıyıya in" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Hasankeyf" title="Sudan önce, sudan sonra"
          text="Türbe yukarıda, yeni yerinde; aşağı kent, köprü ayakları ve kıyı artık gölün altında. Kayalığın üstü ve kale suyun üstünde kaldı."
          stayLabel="Parkta kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Truck size={16} />, text: <>Taşıma: <b>W/S</b> ileri-geri, <b>A/D</b> dönüş; yokuşta yavaşla</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={4.5} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e3e2d8', 350, 3000]} />
      <hemisphereLight args={['#e7eef2', '#8a7a58', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={6} color="#fff0d6" />
      {!low && <Clouds />}
      <Hills />
      <Ground tier={tier} />
      <Road />
      <Water level={live.water} />
      <Cliff m={m} />
      <LowerTown m={m} />
      <Bridge m={m} />
      <Park m={m} />
      <Carried m={m} />
      <Trees n={low ? 300 : 700} />
      <Grass n={low ? 2500 : 6000} />
      <Markers />
    </group>
  );
}
/** Türbe ve taşıyıcı: taşıma sırasında birlikte hareket eder; platform yokuşa göre eğilir */
function Carried({ m }: { m: Mats }) {
  const veh = useRef<THREE.Group>(null), tomb = useRef<THREE.Group>(null);
  useFrame(() => { const v = live.veh, ph = useHk.getState().phase, onVeh = ph === 'drive' || ph === 'walk';
    if (veh.current) { veh.current.position.set(v.x, terrainY(v.x, v.z), v.z); veh.current.rotation.set(v.pitch, v.yaw, 0, 'YXZ'); }
    if (tomb.current) { if (onVeh) { tomb.current.position.set(v.x, terrainY(v.x, v.z) + (ph === 'walk' ? 0 : 1.9), v.z); tomb.current.rotation.set(v.pitch, v.yaw, 0, 'YXZ'); }
      else { tomb.current.position.set(PAD[0], PLATEAU_Y + 0.5, PAD[1]); tomb.current.rotation.set(0, 0, 0); } }
    if (veh.current) veh.current.visible = ph !== 'walk'; });
  return <group>
    <group ref={veh}><Transporter m={m} /></group>
    <group ref={tomb}><Tomb m={m} /></group>
  </group>;
}
type Mats = ReturnType<typeof useMats>;
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useHk.getState(), seen = st.seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id) && (s.id !== 'turbe' || st.phase === 'walk') && (s.id !== 'park' || st.phase !== 'walk'); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.1; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 30 ? 1.6 : 1); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera + taşıma + su ---------- */
const _look = new THREE.Vector3(), _cam = new THREE.Vector3();
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), tick = useRef(0);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useHk.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    // su seviyesi
    if (S.phase === 'flooding') { live.water.y = Math.min(LAKE_Y, live.water.y + dt * ((LAKE_Y - RIVER.y) / 14)); if (live.water.y >= LAKE_Y) { S.set({ phase: 'flooded', card: CARD_BARAJ }); audio.tone(true); audio.speak(`${CARD_BARAJ.name}. ${CARD_BARAJ.text}`); } }

    if (S.phase === 'drive') {
      const v = live.veh; v.stall = Math.max(0, v.stall - dt);
      const want = v.stall > 0 ? 0 : -wy * MAX_SPEED; v.speed += Math.max(-dt * 1.6, Math.min(dt * 1.2, want - v.speed));
      if (Math.abs(v.speed) > 0.05) v.yaw -= wx * 0.45 * dt * Math.sign(v.speed);
      const nx = v.x - Math.sin(v.yaw) * v.speed * dt, nz = v.z - Math.cos(v.yaw) * v.speed * dt;
      if (onRoad(nx, nz)) { const dy = terrainY(nx, nz) - terrainY(v.x, v.z), ds = Math.hypot(nx - v.x, nz - v.z), slope = ds > 1e-4 ? dy / ds * Math.sign(v.speed) : 0;
        v.x = nx; v.z = nz; v.pitch += (Math.atan(Math.sign(v.speed || 1) * slope) - v.pitch) * Math.min(1, dt * 3);
        const over = Math.abs(v.speed) - safeSpeed(slope); v.shake = Math.max(0, Math.min(1, v.shake + (over > 0 ? over * dt * 0.8 : -dt * 0.18)));
        if (v.shake >= 1) { v.stall = 2.2; v.speed = 0; v.shake = 0.65; audio.tone(false); say('Türbe sarsıldı: platform durdu. Yokuşta yavaş git.', 3400); } }
      else if (Math.abs(v.speed) > 0.1) { v.speed = 0; say('Yolun dışına çıkılmaz: platform yalnızca sağlam zeminde ilerler.', 2600); }
      live.x = v.x; live.z = v.z;
      if (Math.hypot(v.x - PAD[0], v.z - PAD[1]) < 3.2) deliver();
      tick.current += dt; if (tick.current > 0.1) { tick.current = 0; S.set({ shake: v.shake, prog: Math.min(1, nearestOnRoad(v.x, v.z).s / (ROAD_LEN - 6)) }); }
      // takip kamerası
      const gy = terrainY(v.x, v.z), asp = (camera as THREE.PerspectiveCamera).aspect, back = asp < 1 ? 27 : 17, up = asp < 1 ? 13 : 9; _cam.set(v.x + Math.sin(v.yaw) * back, gy + up, v.z + Math.cos(v.yaw) * back); if (terrainY(_cam.x, _cam.z) + 3 > _cam.y) _cam.y = terrainY(_cam.x, _cam.z) + 3;
      camera.position.lerp(_cam, Math.min(1, dt * 3)); _look.set(v.x, gy + 5, v.z); camera.lookAt(_look); easeFov(camera, FOV, dt);
      return;
    }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz, live.water.y, live.tomb), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.74) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; const nearOk = near && (near.id !== 'park' || S.phase !== 'walk') ? near : null;
    if ((nearOk?.id ?? '') !== nearId.current) { nearId.current = nearOk?.id ?? ''; S.set({ near: nearOk }); }
    const atDrive = S.phase === 'walk' && Math.hypot(live.x - DRIVE_AT[0], live.z - DRIVE_AT[1]) < 4; if (atDrive !== S.atDrive) S.set({ atDrive });
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const z0 = BOUNDS.z0, z1 = CLIFF.z + 20, W = BOUNDS.x1 - BOUNDS.x0, Hh = z1 - z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - z0;
  const flooded = live.water.y > 5;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-40 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-52" aria-label="Hasankeyf krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#cbbd92" />
        <rect x={0} y={sz(flooded ? -120 : RIVER.z0)} width={W} height={(flooded ? 180 : RIVER.z1 - RIVER.z0)} fill="#6f9aa3" />
        <rect x={0} y={sz(CLIFF.z)} width={W} height={20} fill="#a8946c" />
        {BRIDGE.piers.map((z) => <rect key={z} x={sx(BRIDGE.x - 3.5)} y={sz(z - 3)} width={7} height={6} fill="#5c5244" />)}
        <circle cx={sx(MINARET[0])} cy={sz(MINARET[1])} r={3} fill="#5c5244" />
        <polyline points={ROAD.map(([x, z]) => `${sx(x)},${sz(z)}`).join(' ')} fill="none" stroke="#efe6d0" strokeWidth={6} strokeLinejoin="round" />
        <circle cx={sx(PARK.at[0])} cy={sz(PARK.at[1])} r={PARK.r} fill="#e7dcc4" stroke="#8a7a5c" strokeWidth={1.2} />
        <circle cx={sx(live.tomb[0])} cy={sz(live.tomb[1])} r={5} fill="#9b6a4a" />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={4} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={1.4} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-(useHk.getState().phase === 'drive' ? live.veh.yaw : live.view.yaw) * 180) / Math.PI})`}><path d="M0,-8 L6,6 L0,3 L-6,6 Z" fill="#1f1b17" stroke="#fff" strokeWidth={1} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı</p>
    </div>
  );
}
