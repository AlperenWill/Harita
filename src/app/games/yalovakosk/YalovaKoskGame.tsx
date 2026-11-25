/**
 * Yalova Atatürk Köşkü (Yürüyen Köşk) — "Ağaç İçin Kaydırılan Köşk". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu sokaktan bahçe kapısına yürür; köşkün önünde, çınarın altında ve ray izlerinin üzerinde dolaşır. Köşkün içine girilmez.
 * 5 ayrıntı: Yürüyen Köşk, çınar ağacı, raylarla kaydırma, restorasyon ve ziyaret, Termal'deki köşkün ayrı olduğu.
 * Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Landmark, Map as MapIcon, MousePointer2, RotateCw, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { AREA, BEDS, BOUNDS, GARDEN, GATE, KOSK, OLD_KOSK, POND, RAILS, SHIFT, SPOTS, START, TREE, WINCH, groundY, koskNow, nearestSpot, shift, slide, type Spot } from './site';
import { Backdrop, Garden, Grass, Ground, Kosk, PlaneTree, Rails, SUN_DIR, Town, Winch, useMats } from './YalovaKoskModels';

const THEME = { accent: '#5d7a4a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearWinch: boolean; moved: number; done: boolean; toast: string | null; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearWinch: false, moved: 0, done: false, toast: null as string | null, map: false, endShown: false };
const useYal = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const MOVED_CARD: Card = { id: 'kaydi', name: 'Dal kurtuldu', kicker: 'Köşk kaydırıldı',
  text: 'Köşk raylar üzerinde yaklaşık 4,8 m kaydırıldı ve çınarın dalı kesilmeden kurtuldu. İşlemin 10 Ağustos 1930\'da tamamlandığı aktarılır; bazı haberlerde mesafe "yaklaşık 5 m" diye geçer. Oyundaki kriko ve halat düzeneği temsilîdir; köşkün gerçekte hangi düzenekle kaydırıldığı bu oyunda doğrulanmadı.',
  source: { title: 'Timeturk — Atatürk ağaç için köşkü kaydırmış', url: 'https://www.timeturk.com/kultur/ataturk-agac-icin-kosku-kaydirmis/haber-1677866' } };
let toastTimer = 0;
function toast(t: string) { useYal.getState().set({ toast: t }); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => useYal.getState().set({ toast: null }), 2600); }
/** Krikoyu bir tur çevir: köşk bir adım doğuya kayar; yolda biri varsa durur */
function crank() { const s = useYal.getState(); if (s.done) return;
  const nv = Math.min(SHIFT, shift.v + WINCH.step), o = nv - SHIFT, r = koskNow();
  if (live.x > r.x0 + (nv - shift.v) - 0.4 && live.x < r.x1 + (nv - shift.v) + 0.4 && live.z > r.z0 - 0.4 && live.z < r.z1 + 0.4) { toast('Köşkün yolunda duruyorsun'); return; } void o;
  shift.v = nv; audio.step(380); const moved = Math.round(nv * 10) / 10;
  if (nv >= SHIFT - 1e-6) { s.set({ moved, done: true, card: MOVED_CARD }); audio.tone(true); audio.speak(`${MOVED_CARD.name}. ${MOVED_CARD.text}`); } else s.set({ moved }); }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function YalovaKoskGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useYal(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); shift.v = 0; useYal.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useYal.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useYal.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); shift.v = 0; useYal.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useYal.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearWinch && !s.done) crank(); else if (s.near) inspect(s.near); }
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
    (window as unknown as { __yal: unknown }).__yal = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useYal.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useYal.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useYal.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { shift.v = SHIFT; useYal.getState().set({ seen: SPOTS.map((s) => s.id), done: true, moved: SHIFT }); },
      shift: (v: number) => { shift.v = v; useYal.getState().set({ moved: v }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useYal.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.done ? 1 : 0), done = found >= total;
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
            <SkyEnvironment sky="#d6e4ee" sun="#fff1dc" ground="#7f9068" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.moved > 0 && !S.done ? `Köşk ${S.moved.toFixed(1).replace('.', ',')} / 4,8 m kaydı` : 'Köşkü kaydır, izleri bul'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} moved={S.moved} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#5d7a4a]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone="info" />
          {!S.card && S.nearWinch && !S.done && <InteractPrompt icon={<RotateCw size={18} />} label={`Krikoyu çevir (${S.moved.toFixed(1).replace('.', ',')} / 4,8 m)`} onClick={crank} />}
          {!S.card && !(S.nearWinch && !S.done) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · rayların doğu ucundaki krikoyu çevirerek köşkü dalın altından kaydır<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'kaydi' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Yalova · 1929–1930" title="Ağaç İçin Kaydırılan Köşk"
          intro={<>Yıl 1930: köşk henüz eski yerinde ve çınarın dalı çatısına değiyor. Rayların doğu ucundaki <b>krikoyu çevir</b>, köşkü dalın altından yaklaşık 4,8 m kaydır. Bahçede dolaş, <b>5 ayrıntıyı</b> incele. Köşkün içine girilmez.</>}
          controls={CONTROLS} note="Köşkün biçimi, ray izleri ve ölçüler temsilîdir; kaydırma mesafesi kaynaklarda 4,8 ile yaklaşık 5 m arasında verilir." cta="Bahçeye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Yürüyen Köşk" title="Bir ağacın hatırına"
          text="Atatürk'ün bir çınarın dalı kesilmesin diye köşkü kaydırttığı anlatılır; ağaç yüzyıllardır aynı yerde duruyor."
          stayLabel="Bahçede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <RotateCw size={16} />, text: <>Krikonun yanında <b>E</b>'ye ya da düğmeye her basışta köşk 40 cm kayar</> },
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
      <fog attach="fog" args={['#e0e8e6', 280, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Backdrop />
      <Ground tier={tier} />
      <Garden m={m} />
      <Kosk m={m} />
      <Winch m={m} />
      <PlaneTree m={m} />
      <Rails m={m} />
      <Town m={m} />
      <Grass n={low ? 1500 : 4000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useYal.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useYal.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const nw = S.started && Math.hypot(live.x - WINCH.c[0], live.z - WINCH.c[1]) < WINCH.reach; if (nw !== S.nearWinch) S.set({ nearWinch: nw });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, moved }: { seen: string[]; moved: number }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Köşk krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c3d09a" opacity={0.75} />
        <rect x={sx(AREA.x0)} y={sz(AREA.z0)} width={AREA.x1 - AREA.x0} height={AREA.z1 - AREA.z0} fill="#d8d6b4" opacity={0.6} />
        <rect x={sx(GARDEN.x0)} y={sz(GARDEN.z0)} width={GARDEN.x1 - GARDEN.x0} height={GARDEN.z1 - GARDEN.z0} fill="#cfdcaa" stroke="#6b6450" strokeWidth={0.8} />
        <rect x={sx(GATE.x0)} y={sz(GARDEN.z1 - 0.6)} width={GATE.x1 - GATE.x0} height={1.4} fill="#e8e0cc" />
        <rect x={sx(OLD_KOSK.x0)} y={sz(OLD_KOSK.z0)} width={OLD_KOSK.x1 - OLD_KOSK.x0} height={OLD_KOSK.z1 - OLD_KOSK.z0} fill="none" stroke="#8a7e68" strokeWidth={0.6} strokeDasharray="1.2 1" />
        <rect x={sx(KOSK.x0 + moved - SHIFT)} y={sz(KOSK.z0)} width={KOSK.x1 - KOSK.x0} height={KOSK.z1 - KOSK.z0} fill="#e9e1cd" stroke="#6b5a46" strokeWidth={0.8} />
        <rect x={sx(WINCH.c[0]) - 0.8} y={sz(WINCH.c[1]) - 0.8} width={1.6} height={1.6} fill="#5b4a3a" />
        {RAILS.z.map((z, i) => <line key={i} x1={sx(RAILS.x0)} y1={sz(z)} x2={sx(RAILS.x1)} y2={sz(z)} stroke="#5b4a3a" strokeWidth={0.4} />)}
        <circle cx={sx(TREE.c[0])} cy={sz(TREE.c[1])} r={TREE.crown * 0.6} fill="#5a8a3a" opacity={0.45} />
        <circle cx={sx(TREE.c[0])} cy={sz(TREE.c[1])} r={TREE.r} fill="#6a5f4e" />
        <circle cx={sx(POND.c[0])} cy={sz(POND.c[1])} r={POND.r} fill="#4a7f8c" />
        {BEDS.map((b, i) => <rect key={i} x={sx(b.x0)} y={sz(b.z0)} width={b.x1 - b.x0} height={b.z1 - b.z0} fill="#e0b84a" />)}
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={1.8} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
