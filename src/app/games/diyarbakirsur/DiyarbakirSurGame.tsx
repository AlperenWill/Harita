/**
 * Diyarbakır Surları ve Hevsel Bahçeleri. Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu Mardin Kapı'nın önünden başlar; surun dışında burçlara yürür, kapıdan içeri girip merdivenle sur üstüne çıkar, doğuda
 * Hevsel Bahçeleri'ne ve Dicle kıyısına iner. 8 ayrıntı (E ile kart) ve dürbünle bulunacak 6 kitabe/kabartma: dürbünü aç (B ya da düğme),
 * hedefi artı işaretinin ortasında kısa bir süre tut. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Binoculars, Footprints, Map as MapIcon, MousePointer2, ScrollText, Search } from 'lucide-react';
import { ActionDock, Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, RoundAction, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, BRIDGE, BRIDGE_X0, GATE, HEVSEL, HOUSES, LENS, RAMP, SPOTS, START, TARGETS, TOWERS, WALL, aimedTarget, groundY, nearestSpot, slide, type Spot } from './site';
import { Bridge, City, Grass, Ground, Hills, Houses, Paving, River, SUN_DIR, Stairs, Towers, Trees, Walls, useMats } from './DiyarbakirModels';

const THEME = { accent: '#4a5560' };
const EYE = 1.62, WALK = 1.8, RUN = 4.2, FOV = 66;
const audio = new WalkAudio({ freq: 520, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
interface S { started: boolean; card: Spot | null; seen: string[]; near: Spot | null; map: boolean; endShown: boolean; lens: boolean; read: string[]; aim: string | null; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, map: false, endShown: false, lens: false, read: [] as string[], aim: null as string | null, toast: null as string | null };
const useDiy = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.02 }, speed: 0, bob: 0, step: 0, hold: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useDiy.getState().set({ toast: t }); toastT = setTimeout(() => useDiy.getState().set({ toast: null }), ms); };
/** Dürbün açıkken bakış duyarlılığı düşer: büyütmeyle birlikte hedefi tutmak kolaylaşır */
const lookView = {
  get yaw() { return live.view.yaw; }, set yaw(v: number) { live.view.yaw += (v - live.view.yaw) * (useDiy.getState().lens ? 0.25 : 1); },
  get pitch() { return live.view.pitch; }, set pitch(v: number) { live.view.pitch += (v - live.view.pitch) * (useDiy.getState().lens ? 0.25 : 1); },
};
function toggleLens() { const s = useDiy.getState(); s.set({ lens: !s.lens, aim: null }); live.hold = 0; audio.tone(!s.lens); }

export default function DiyarbakirSurGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useDiy(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0, hold: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.02; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useDiy.setState(INITIAL); reset(); }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useDiy.getState(); st.set({ card: s, lens: false, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useDiy.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useDiy.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useDiy.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.card) { close(); e.preventDefault(); }
      if (e.code === 'KeyB' && !s.card) toggleLens();
      if (e.code === 'KeyM') s.set({ map: !s.map });
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __diy: unknown }).__diy = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useDiy.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      /** hedefe bak: göz konumundan hedefin yönünü hesaplar */
      aimAt: (id: string) => { const t = TARGETS.find((q) => q.id === id); if (!t) return; const ey = groundY(live.x, live.z) + EYE, dx = t.at[0] - live.x, dy = t.at[1] - ey, dz = t.at[2] - live.z;
        live.view.yaw = Math.atan2(-dx, -dz); live.view.pitch = Math.atan2(dy, Math.hypot(dx, dz)); },
      lens: (v: boolean) => { if (useDiy.getState().lens !== v) toggleLens(); },
      map: (v: boolean) => useDiy.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => useDiy.getState().set({ seen: SPOTS.map((s) => s.id), read: TARGETS.map((t) => t.id) }),
      SPOTS, TARGETS,
    };
  }, []);

  const fpl = useFpLook(lookView, () => { const a = useDiy.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + TARGETS.length, found = S.seen.length + S.read.length, done = found >= total;
  const aimT = S.aim ? TARGETS.find((t) => t.id === S.aim) : null;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e6e2d8] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.1, far: 3500, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#d9e4ec" sun="#fff0d6" ground="#9a8a68" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        {S.lens && <Scope aiming={!!S.aim} />}
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<ScrollText size={15} />} label={done ? 'Hepsini buldun' : 'Surların izlerini bul'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} read={S.read} />}
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Okundu') ? 'ok' : 'info'} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#4a5560]" />
          {!S.lens && <LookCrosshair locked={fpl.locked} />}
          {!S.card && <ActionDock><RoundAction label="Dürbün (B)" primary={S.lens} size={56} onClick={toggleLens}><Binoculars size={24} /></RoundAction></ActionDock>}
          {!S.card && !S.lens && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && S.lens && aimT && <InteractPrompt icon={<ScrollText size={18} />} label={`Okunuyor: ${aimT.name}`} onClick={() => undefined} />}
          {!S.card && <Hint>{S.lens ? 'Kitabeyi artı işaretinin ortasında tut · B: dürbünü kapat' : <>Joystick ya da WASD ile yürü · parıltılı ayrıntıda E · dürbünle kitabeleri ara<span className="hidden [@media(pointer:fine)]:inline"> · B: dürbün · M: kroki</span></>}</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={`${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Diyarbakır · Sur ve Hevsel · UNESCO 2015" title="Bazalt Surların Kitabeleri"
          intro={<>Mardin Kapı'dan yola çık; Yedi Kardeş ve Ulu Beden burçlarına yürü, merdivenle sur üstüne çık, Hevsel Bahçeleri'ne in. <b>8 ayrıntıyı</b> incele, <b>dürbünle 6 kitabe ve kabartmayı</b> bul.</>}
          controls={CONTROLS} note="Uzaklıklar kısaltıldı; burç ölçüleri, kapı biçimi ve yazıların görünümü temsilîdir." cta="Surlara yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Diyarbakır Surları" title="Taşa yazılmış bir kent"
          text="Bazalt surlar, üzerlerindeki onlarca kitabeyle yüzyılların onarımlarını taşıyor; Hevsel Bahçeleri de surlarla Dicle arasındaki yeşil kuşağı koruyor."
          stayLabel="Surlarda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Spot) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Binoculars size={16} />, text: <><b>B</b> ya da dürbün düğmesi: yakınlaştır; kitabeyi ortada kısa bir süre tut</> },
];
/** Dürbün görünümü: iki daire maskesi ve ortada artı işareti */
function Scope({ aiming }: { aiming: boolean }) {
  return <div className="pointer-events-none absolute inset-0">
    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 0, transparent min(34vw,34vh), rgba(12,12,12,0.88) calc(min(34vw,34vh) + 2px))' }} />
    <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2">
      <div className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 ${aiming ? 'bg-[#ffd27a]' : 'bg-white/80'}`} />
      <div className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 ${aiming ? 'bg-[#ffd27a]' : 'bg-white/80'}`} />
    </div>
  </div>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={4.5} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e2e3dc', 350, 3000]} />
      <hemisphereLight args={['#e7eef2', '#7a6a4c', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={6} color="#fff0d6" />
      {!low && <Clouds />}
      <Hills />
      <Ground tier={tier} />
      <Paving />
      <River />
      <Bridge m={m} />
      <Walls m={m} />
      <Towers m={m} />
      <Stairs m={m} />
      <Houses m={m} />
      <City m={m} />
      <Trees n={low ? 900 : 2200} />
      <Grass n={low ? 2500 : 6000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useDiy.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.1; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 30 ? 1.4 : 0.8); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.12, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera + dürbün ---------- */
const _dir = new THREE.Vector3();
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDiy.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len) * (S.lens ? 0.4 : 1), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.74) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 && !S.lens ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, S.lens ? LENS.fov : FOV, dt);
    // dürbün: hedef ortada tutulursa okunur
    if (S.lens && active && (camera as THREE.PerspectiveCamera).fov < LENS.fov + 6) {
      camera.getWorldDirection(_dir);
      const t = aimedTarget([camera.position.x, camera.position.y, camera.position.z], [_dir.x, _dir.y, _dir.z], S.read);
      if ((t?.id ?? null) !== S.aim) { S.set({ aim: t?.id ?? null }); live.hold = 0; }
      if (t) { live.hold += Math.min(raw, 0.25); if (live.hold >= LENS.hold) { live.hold = 0; const read = [...S.read, t.id]; S.set({ read, aim: null }); audio.tone(true); say(`Okundu: ${t.name} · ${t.note} · ${read.length}/${TARGETS.length} (surlarda 63 kitabe var)`, 5200); } }
    } else if (S.aim) S.set({ aim: null });
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, read }: { seen: string[]; read: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-52 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-72" aria-label="Sur krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#d6c79f" opacity={0.8} />
        <rect x={sx(WALL.x0)} y={0} width={WALL.eastX - WALL.x0} height={sz(WALL.zIn)} fill="#8f8a80" />
        <rect x={sx(HEVSEL.x0)} y={0} width={BOUNDS.x1 - 8 - HEVSEL.x0} height={Hh} fill="#8fae6a" />
        <rect x={sx(BOUNDS.x1 - 8)} y={0} width={8} height={Hh} fill="#6f9aa3" />
        <rect x={sx(BRIDGE_X0)} y={sz(BRIDGE.z) - 3} width={BOUNDS.x1 - BRIDGE_X0} height={6} fill="#6a645c" />
        {HOUSES.map((h, i) => <rect key={i} x={sx(h.x0)} y={sz(h.z0)} width={h.x1 - h.x0} height={h.z1 - h.z0} fill="#5c5852" />)}
        <rect x={sx(WALL.x0)} y={sz(WALL.zIn)} width={WALL.x1 - WALL.x0 + 2.4} height={WALL.zOut - WALL.zIn} fill="#2f2d2b" />
        <rect x={sx(WALL.eastX - 2.4)} y={0} width={4.8} height={sz(WALL.zOut)} fill="#2f2d2b" />
        <rect x={sx(GATE.x - GATE.w / 2)} y={sz(WALL.zIn)} width={GATE.w} height={WALL.zOut - WALL.zIn} fill="#d6c79f" />
        <rect x={sx(RAMP.x0)} y={sz(RAMP.zBot)} width={RAMP.x1 - RAMP.x0} height={RAMP.zTop - RAMP.zBot} fill="#3f3c38" />
        {TOWERS.map((t) => t.round ? <circle key={t.id} cx={sx(t.x)} cy={sz(t.z)} r={t.r} fill="#2f2d2b" /> : <rect key={t.id} x={sx(t.x - t.r)} y={sz(WALL.zOut - 1)} width={t.r * 2} height={t.z + t.r - WALL.zOut + 1} fill="#2f2d2b" />)}
        {TARGETS.map((t) => <rect key={t.id} x={sx(t.at[0]) - 2.5} y={sz(t.at[2]) - 2.5} width={5} height={5} transform={`rotate(45 ${sx(t.at[0])} ${sz(t.at[2])})`} fill={read.includes(t.id) ? '#ffd27a' : 'none'} stroke="#ffd27a" strokeWidth={1.2} />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={3.6} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={1.2} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-6 L4.4,4.4 L0,2.2 L-4.4,4.4 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.8} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı · {read.length}/{TARGETS.length} kitabe</p>
    </div>
  );
}
