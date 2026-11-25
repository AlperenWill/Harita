/**
 * SEKA Kâğıt Müzesi — "Hamurdan Rulolara". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu avludan eski fabrika salonuna girer; uzun kâğıt makinesinin iki yanında dolaşır, vitrinleri ve matbaa makinelerini görür.
 * 6 ayrıntı: Sümerbank fabrikası, kâğıt makinesi, Mehmet Ali Kağıtçı, vitrinler, matbaa makineleri, kapanış ve müze.
 * Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Landmark, Map as MapIcon, MousePointer2, Power, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, CHIMNEY, DOOR, HALL, MACHINE, POND, PRESSES, SPOTS, START, STATIONS, VITRINS, YARD, groundY, nearestSpot, nearestStation, slide, stationAction, type Spot, type Station } from './site';
import { Grass, Ground, Hall, Hills, PaperLine, SUN_DIR, Trees, Yard, line, useMats } from './SekaModels';

const THEME = { accent: '#9a4a34' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearSt: Station | null; running: number; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearSt: null, running: 0, toast: null as string | null, map: false, endShown: false };
const useSeka = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
let toastTimer = 0;
function toast(text: string) { useSeka.getState().set({ toast: text }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useSeka.getState().set({ toast: null }), 2800); }
const stCard = (q: Station, i: number): Card => ({ id: `st-${q.id}`, name: q.name, kicker: `Kâğıt hattı · ${i + 1}/${STATIONS.length}`, text: q.text, source: q.source });
/** Pano: sıradaki bölümse çalıştırır ve kartını açar; çalışıyorsa kartı yeniden açar; sırası gelmediyse uyarır */
function operate(q: Station) { const st = useSeka.getState(), i = STATIONS.indexOf(q), act = stationAction(i, st.running);
  if (act === 'blocked') { toast(`Önce ${STATIONS[st.running].name} çalışmalı`); audio.tone(false); return; }
  if (act === 'start') { line.running = i + 1; st.set({ running: i + 1 }); }
  st.set({ card: stCard(q, i) }); audio.tone(true); audio.speak(`${q.name}. ${q.text}`); }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function SekaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useSeka(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useSeka.setState(INITIAL); line.running = 0; line.reel = 0; Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useSeka.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useSeka.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useSeka.setState({ ...INITIAL, started: true }); line.running = 0; line.reel = 0; Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useSeka.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearSt) operate(s.nearSt); else if (s.near) inspect(s.near); }
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
    (window as unknown as { __seka: unknown }).__seka = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useSeka.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useSeka.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useSeka.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { line.running = STATIONS.length; useSeka.getState().set({ seen: SPOTS.map((s) => s.id), running: STATIONS.length }); },
      run: (n: number) => { line.running = n; useSeka.getState().set({ running: n }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useSeka.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + STATIONS.length, found = S.seen.length + S.running, done = found >= total;
  const stAct = S.nearSt ? stationAction(STATIONS.indexOf(S.nearSt), S.running) : null;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dde7ee] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: 66, near: 0.1, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#d6e4ee" sun="#fff1dc" ground="#7a8a68" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.running < STATIONS.length ? 'Hattı çalıştır, izleri bul' : 'Fabrikanın izlerini bul'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} running={S.running} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#9a4a34]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="bad" />
          {!S.card && S.nearSt && <InteractPrompt icon={<Power size={18} />} label={`${stAct === 'again' ? 'İncele' : 'Çalıştır'}: ${S.nearSt.name}`} onClick={() => operate(S.nearSt!)} muted={stAct === 'again'} />}
          {!S.card && !S.nearSt && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · makinenin güneyindeki panolardan hattı sırayla çalıştır<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id.startsWith('st-') ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Kocaeli · İzmit · 1936" title="Hamurdan Rulolara"
          intro={<>Avludan eski fabrika salonuna gir. Uzun kâğıt makinesini <b>panolarından sırayla çalıştır</b>: hamur kasası, elek, pres, kurutma, kalender ve sarıcı. Hamur sudan kâğıda, kâğıt da ruloya dönüşsün. Vitrinleri ve matbaa makinelerini de bul: <b>6 ayrıntı</b>.</>}
          controls={CONTROLS} note="Bölümlerin sırası kâğıt makinelerinin genel düzenidir; SEKA'daki makinenin biçimi, vitrinlerin içeriği ve ölçüler temsilîdir." cta="Fabrikaya gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="SEKA Kâğıt Müzesi" title="Bir fabrikanın hafızası"
          text="Hattı baştan sona çalıştırdın: hamur, elekte kâğıt oldu, preste sıkıldı, silindirlerde kurudu ve ruloya sarıldı. Cumhuriyet'in sanayi kuruluşlarından biri olan fabrika 1998'de kapandı; bugün makineleriyle birlikte müze olarak yaşıyor."
          stayLabel="Salonda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Power size={16} />, text: <>Makinenin yanındaki panoya yaklaş, <b>E</b> ile bölümü çalıştır (lamba: yeşil çalışıyor, sarı sıradaki)</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.2} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#dfe3e6', 280, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Hills />
      <Ground tier={tier} />
      <Yard m={m} />
      <Hall m={m} tier={tier} />
      <PaperLine m={m} />
      <Trees n={low ? 10 : 28} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useSeka.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useSeka.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const ns = S.started ? nearestStation(live.x, live.z) : null; if (ns !== S.nearSt) S.set({ nearSt: ns });
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, running }: { seen: string[]; running: number }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Fabrika krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c9d3a8" opacity={0.7} />
        <rect x={sx(YARD.x0)} y={sz(YARD.z0)} width={YARD.x1 - YARD.x0} height={YARD.z1 - YARD.z0} fill="#d8d3c2" />
        <rect x={sx(HALL.x0)} y={sz(HALL.z0)} width={HALL.x1 - HALL.x0} height={HALL.z1 - HALL.z0} fill="#b86a50" stroke="#6b3a2a" strokeWidth={0.8} />
        <rect x={sx(HALL.x0 + 0.8)} y={sz(HALL.z0 + 0.8)} width={HALL.x1 - HALL.x0 - 1.6} height={HALL.z1 - HALL.z0 - 1.6} fill="#e6e0d2" />
        <rect x={sx(DOOR.x0)} y={sz(HALL.z1 - 0.6)} width={DOOR.x1 - DOOR.x0} height={1.4} fill="#e6e0d2" />
        <rect x={sx(MACHINE.x0)} y={sz(MACHINE.z0)} width={MACHINE.x1 - MACHINE.x0} height={MACHINE.z1 - MACHINE.z0} fill="#8c949a" />
        {STATIONS.map((q, i) => <g key={q.id}><rect x={sx(q.x0) + 0.2} y={sz(MACHINE.z0)} width={q.x1 - q.x0 - 0.4} height={MACHINE.z1 - MACHINE.z0} fill={i < running ? '#2fbf62' : i === running ? '#f2b233' : '#8c949a'} /><rect x={sx(q.panel[0]) - 0.8} y={sz(q.panel[1]) - 0.5} width={1.6} height={1} fill="#25272a" /></g>)}
        {VITRINS.map((v, i) => <rect key={i} x={sx(v.x0)} y={sz(v.z0)} width={v.x1 - v.x0} height={v.z1 - v.z0} fill="#5a5f64" />)}
        {PRESSES.map((p, i) => <rect key={i} x={sx(p.x0)} y={sz(p.z0)} width={p.x1 - p.x0} height={p.z1 - p.z0} fill="#3a3d40" />)}
        <circle cx={sx(CHIMNEY.c[0])} cy={sz(CHIMNEY.c[1])} r={CHIMNEY.r} fill="#8a4a38" />
        <circle cx={sx(POND.c[0])} cy={sz(POND.c[1])} r={POND.r} fill="#4a7f8c" />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={1.6} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.7} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı · hat {running}/{STATIONS.length}</p>
    </div>
  );
}
