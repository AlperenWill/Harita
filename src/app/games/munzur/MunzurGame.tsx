/**
 * Munzur Vadisi — "Kırk Göze". Ana yönetici (Cumalıkızık, Bayburt ve Şeytan Kalesi ile aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu vadi tabanındaki yürüyüş yolundan Munzur Gözeleri'ne yürür, ahşap köprülerle iki kıyı arasında döner ve 7 ayrıntıyı bulur:
 * gözeler, kutsal su, millî park, endemik bitkiler, yaban keçileri, Munzur Çayı, koruma. Yalnızca yol üzerinde yürünür.
 * Yaklaşınca yalnızca "İncele: … E" istemi çıkar; kart oyuncu E'ye basınca açılır. Kroki (M) bulunanları gösterir.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { DoorOpen, Footprints, Map as MapIcon, MousePointer2, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, RIVER_X0, SPOTS, SPRINGS, START, TRAILS, groundY, nearestSpot, riverZ, slide, type Spot } from './site';
import { Bridges, Goats, Grass, Mountains, ParkSign, Rocks, SpringMouths, SUN_DIR, Terrain, Trails, Trees, Water } from './MunzurModels';

const THEME = { accent: '#2f7d86' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 1400, gain: 0.07 }, 'any');   // rüzgâr yerine akan su uğultusu

/* ---------- durum ---------- */
interface S { started: boolean; card: Spot | null; seen: string[]; near: Spot | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, map: false, endShown: false };
const useMunzur = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function MunzurGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useMunzur(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useMunzur.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useMunzur.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useMunzur.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useMunzur.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useMunzur.getState(); if (!s.started || pause.on) return;
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
    (window as unknown as { __munzur: unknown }).__munzur = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useMunzur.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useMunzur.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useMunzur.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => useMunzur.getState().set({ seen: SPOTS.map((s) => s.id) }),
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMunzur.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const done = S.seen.length >= SPOTS.length;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfe8ec] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: 66, near: 0.1, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#d4e6f0" sun="#fff1dc" ground="#8f8a6a" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<DoorOpen size={15} />} label={done ? 'Hepsini buldun' : 'Vadinin ayrıntılarını bul'} done={S.seen.length} total={SPOTS.length} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f7d86]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · parıltılı ayrıntıya yaklaş, E ile incele<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={`${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Tunceli · Ovacık · Munzur Vadisi Millî Parkı" title="Kırk Göze"
          intro={<>Vadi boyunca yürü, Munzur Çayı'nın doğduğu gözelere ulaş. Köprülerden iki kıyıyı dolaş; kutsal suyu, endemik çiçekleri ve yaban keçilerini keşfet: <b>7 ayrıntıyı</b> bul ve incele.</>}
          controls={CONTROLS} note="Vadinin biçimi, gözelerin sayısı ve yeri, yol düzeni temsilîdir." cta="Vadiye gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Munzur Vadisi" title="Gözelerin bekçisi"
          text="Kutsal sayılan gözeleri, yaban keçileri ve yüzlerce endemik bitkisiyle Munzur Vadisi, Türkiye'nin en zengin doğal alanlarından biri; korunması hâlâ tartışılıyor."
          stayLabel="Vadide kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Spot) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.4} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#d9e4ea', 160, 2200]} />
      <hemisphereLight args={['#dfeaf3', '#7d7458', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.6} color="#fff0d8" />
      {!low && <Clouds />}
      <Terrain tier={tier} />
      <Mountains />
      <Water tier={tier} />
      <SpringMouths />
      <Rocks n={low ? 160 : 380} />
      <Trails />
      <Bridges />
      <ParkSign at={[118, groundY(118, 32.5) + 1.6, 32.5]} />
      <Trees n={low ? 160 : 360} />
      <Goats />
      <Grass n={low ? 3500 : tier === 'medium' ? 8000 : 14000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useMunzur.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useMunzur.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => BOUNDS.z1 - z;   // kuzey kıyı üstte
  const river = useMemo(() => { const out: string[] = []; for (let x = RIVER_X0; x <= BOUNDS.x1; x += 4) out.push(`${sx(x)},${sz(riverZ(x))}`); return out.join(' '); }, []);
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-56 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-72" aria-label="Vadi krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#a9c08a" opacity={0.55} />
        <polyline points={river} fill="none" stroke="#5f9aa6" strokeWidth={8} strokeLinecap="round" />
        {SPRINGS.map((s, i) => <line key={i} x1={sx(s[0])} y1={sz(s[1])} x2={sx(RIVER_X0)} y2={sz(riverZ(RIVER_X0))} stroke="#7fbfca" strokeWidth={1.6} />)}
        {TRAILS.map((t) => <polyline key={t.id} points={t.pts.map((p) => `${sx(p[0])},${sz(p[1])}`).join(' ')} fill="none" stroke={t.bridge ? '#7d5a3a' : '#e2d6b8'} strokeWidth={t.w + 1} strokeLinecap="round" strokeLinejoin="round" />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={4.5} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={1.6} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${((live.view.yaw + Math.PI) * 180) / Math.PI})`}><path d="M0,-7 L5,5 L0,2.5 L-5,5 Z" fill="#1f1b17" stroke="#fff" strokeWidth={1} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
