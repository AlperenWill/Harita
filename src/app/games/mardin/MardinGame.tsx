/**
 * Mardin — Zinciriye Medresesi ve taş evler: "Damdan Dama". Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu yamacın dibindeki sokaktan başlar; kademe kademe yükselen evlerin damlarından, merdivenlerden ve bir abbaradan geçerek yukarı
 * tırmanır. Her yeni kademe (dam) sayılır; yükseldikçe Mezopotamya ovasının pusu açılır. Zinciriye'nin taç kapısından avluya girer,
 * en üst sokaktan medresenin damına çıkar. 8 ayrıntı (E ile kart) + 5 dam. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Map as MapIcon, MousePointer2, MoveUp, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, BOUNDS_Z, BUMP, BUMPS, LEVELS, SPOTS, STAIRS, STAIR_LEN, STAIR_W, START, ZIN, boundaryZ, groundY, hazeFar, levelOf, nearestSpot, slide, type Spot } from './site';
import { Citadel, FarHills, Haze, Plain, SUN_DIR, Skyline, Stairs, Terraces, Zinciriye, useMats } from './MardinModels';

const THEME = { accent: '#9a6b2f' };
const EYE = 1.62, WALK = 1.7, RUN = 3.8, FOV = 66;
const audio = new WalkAudio({ freq: 640, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
interface S { started: boolean; card: Spot | null; seen: string[]; near: Spot | null; map: boolean; endShown: boolean; levels: number[]; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, map: false, endShown: false, levels: [] as number[], toast: null as string | null };
const DAMS = LEVELS - 1;
const DAM_TEXT = ['', 'Alttaki evlerin damındasın; bu dam bir üstteki evin terası.', 'Bir kademe daha: avlular ve eyvanlar damların üstüne açılır.', 'Zinciriye\'nin avlusu bu kademede; taç kapı doğu yanında.', 'Kubbeler göründü; pus açılıyor.', 'En üst sokak: buradan medresenin damına geçilir.'];
const useMar = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useMar.getState().set({ toast: t }); toastT = setTimeout(() => useMar.getState().set({ toast: null }), ms); };
export default function MardinGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useMar(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.02; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useMar.setState(INITIAL); reset(); }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useMar.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useMar.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useMar.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useMar.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.near) inspect(s.near); }
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
    (window as unknown as { __mardin: unknown }).__mardin = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useMar.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      map: (v: boolean) => useMar.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => useMar.getState().set({ seen: SPOTS.map((s) => s.id), levels: [1, 2, 3, 4, 5] }),
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMar.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + DAMS, found = S.seen.length + S.levels.length, done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#efe6d4] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.1, far: 3500, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dfe6ea" sun="#fff0d6" ground="#b39a6c" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<MoveUp size={15} />} label={done ? 'Hepsini buldun' : `Damdan dama · ${S.levels.length}/${DAMS} dam`} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} levels={S.levels} />}
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.includes('. dam') ? 'ok' : 'info'} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#9a6b2f]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · merdivenlerden damdan dama tırman · parıltılı ayrıntıda E<span className="hidden [@media(pointer:fine)]:inline"> · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={`${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Mardin · Zinciriye Medresesi · 1385" title="Damdan Dama"
          intro={<>Yamacın dibindeki sokaktan başla. Her evin damı bir üstteki evin terası: merdivenlerden ve abbaranın altından geçip <b>5 dam</b> yüksel, Zinciriye'nin avlusuna gir, damından ovaya bak. <b>8 ayrıntıyı</b> incele.</>}
          controls={CONTROLS} note="Kademe sayısı, ev düzeni, merdivenler ve medresenin iç düzeni temsilîdir." cta="Tırmanmaya başla" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Mardin" title="Ovaya bakan kent"
          text="Taş evler yamaca kademe kademe tutunuyor; her dam bir üstteki evin terası. Zinciriye'nin damından Mezopotamya ovası ufka kadar uzanıyor."
          stayLabel="Damda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Spot) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <MoveUp size={16} />, text: <>Merdivenlerden bir üst dama çık; her yeni dam sayılır</> },
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
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={6} rayleigh={1.1} mieCoefficient={0.006} mieDirectionalG={0.85} /></group>
      <Haze far={hazeFar} />
      <hemisphereLight args={['#eef0ec', '#a58a5c', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={6} color="#fff0d6" />
      {!low && <Clouds />}
      <FarHills />
      <Plain />
      <Citadel m={m} />
      <Terraces m={m} />
      <Stairs m={m} />
      <Zinciriye m={m} />
      <Skyline m={m} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useMar.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.1; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 30 ? 1.4 : 0.8); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.12, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera + dürbün ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useMar.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.74) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
    // dam sayacı: oyuncu yeni bir kademeye ilk kez ayak basınca
    if (S.started) { const lv = levelOf(gy); if (lv >= 1 && Math.abs(gy - lv * 3.6) < 0.05 && !S.levels.includes(lv)) { const levels = [...S.levels, lv].sort(); S.set({ levels }); audio.tone(true); say(`${lv}. dam · ${DAM_TEXT[lv]} · ${levels.length}/${DAMS}`, 4200); } }
  });
  return null;
}

/* ---------- kroki ---------- */
const SHADES = ['#e8dcc0', '#ddcda9', '#d2bf94', '#c6b17f', '#b9a26c', '#ab935c'];
function Kroki({ seen, levels }: { seen: string[]; levels: number[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  const band = (k: number) => { const pts: string[] = []; const N = k < BOUNDS_Z.length ? (x: number) => boundaryZ(k, x) : () => BOUNDS.z0, S2 = k > 0 ? (x: number) => boundaryZ(k - 1, x) : () => BOUNDS.z1;
    for (let x = BOUNDS.x0; x <= BOUNDS.x1; x += 1) pts.push(`${sx(x)},${sz(Math.max(BOUNDS.z0, N(x)))}`); for (let x = BOUNDS.x1; x >= BOUNDS.x0; x -= 1) pts.push(`${sx(x)},${sz(Math.min(BOUNDS.z1, S2(x)))}`); return pts.join(' '); };
  void BUMP; void BUMPS;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-48 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-64" aria-label="Damlar krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        {Array.from({ length: BOUNDS_Z.length + 1 }, (_, k) => <polygon key={k} points={band(k)} fill={SHADES[k]} stroke={levels.includes(k) ? THEME.accent : '#8a7a5c'} strokeWidth={levels.includes(k) ? 0.8 : 0.3} />)}
        <rect x={sx(ZIN.x0)} y={sz(ZIN.z0)} width={ZIN.x1 - ZIN.x0} height={ZIN.z1 - ZIN.z0} fill="#c8a46a" stroke="#7a5a2a" strokeWidth={0.6} />
        {STAIRS.map((s, i) => <rect key={i} x={sx(s.x - STAIR_W / 2)} y={sz(boundaryZ(s.j, s.x))} width={STAIR_W} height={STAIR_LEN} fill="#7a6a4c" />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={1.8} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.6} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı · {levels.length}/{DAMS} dam · merdivenler koyu</p>
    </div>
  );
}
