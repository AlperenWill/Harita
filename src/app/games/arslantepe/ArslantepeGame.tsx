/**
 * Malatya — Arslantepe Höyüğü: "Mühür ve Kapı" (detaylı). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu höyüğün eteğindeki aslanlı kapıdan (kopyalar) yokuşla düzlüğe çıkar, koruma çatısı altındaki kerpiç saraya girer. Koridorun
 * kuzeyindeki dört deponun kapısı kil mühürle kapalıdır: mühürdeki baskı bir mührün ayna görüntüsüdür ve dönmüş olabilir; altı mühürden
 * doğrusunu seç, kapı açılır. Son depoda kılıçlar. 6 ayrıntı + 4 depo. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Map as MapIcon, MousePointer2, Search, Stamp } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { COR, GATE, LOCKS, PAL, ROOF, ROOMS, ROOM_CARDS, SEALS, SPOTS, START, TOMB, groundY, impression, nearestLock, nearestSpot, sealFits, slide, type Room, type Spot, type Stroke } from './site';
import { Desk, Doors, Gate, Grass, Ground, Hills, Orchards, Palace, Roof, StoreContents, Tomb, useMats } from './ArslantepeModels';

const THEME = { accent: '#9b5a34' };
const EYE = 1.62, WALK = 2.0, RUN = 4.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.45, 0.66, 0.6).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; lock: Room | null; panel: string | null; open: string[]; map: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, lock: null, panel: null, open: [] as string[], map: false, endShown: false, toast: null as string | null };
const useArs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useArs.getState().set({ toast: t }); toastT = setTimeout(() => useArs.getState().set({ toast: null }), ms); };
function trySeal(room: string, sealId: string) {
  const s = useArs.getState();
  if (!sealFits(room, sealId)) { audio.tone(false); say('Bu mühür baskıyla örtüşmüyor. Baskı, mührün ayna görüntüsüdür; döndürerek düşün.', 4200); return; }
  const open = [...s.open, room], c = ROOM_CARDS[room]; s.set({ open, panel: null, card: { id: room, name: c.name, kicker: c.kicker, text: c.text, source: c.source } }); audio.tone(true); audio.speak(`${c.name}. ${c.text}`);
}
export default function ArslantepeGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useArs(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useArs.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useArs.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useArs.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useArs.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useArs.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.panel) s.set({ panel: null }); else if (s.lock) s.set({ panel: s.lock.id }); else if (s.near) inspect(s.near); }
      if (e.code === 'KeyM') s.set({ map: !s.map });
      if (e.code === 'Escape') { if (s.card) close(); else if (s.panel) s.set({ panel: null }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __ars: unknown }).__ars = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useArs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      panel: (id: string | null) => useArs.getState().set({ panel: id, card: null }),
      seal: (room: string, seal: string) => trySeal(room, seal),
      openAll: () => useArs.getState().set({ open: LOCKS.map((l) => l.room), card: null }),
      map: (v: boolean) => useArs.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useArs.getState(); return a.started && !a.card && !a.panel && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + LOCKS.length, found = S.seen.length + S.open.length, done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#ece2d2] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 4000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
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
          objective={S.started ? <Objective icon={<Stamp size={15} />} label={done ? 'Hepsini buldun' : `Mühürlü depoları aç · ${S.open.length}/${LOCKS.length}`} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} open={S.open} />}
        {S.started && !S.card && !S.panel && <Toast text={S.toast} tone={S.toast?.startsWith('Bu mühür') ? 'bad' : 'ok'} />}
        {S.panel && <SealPanel room={S.panel} onClose={() => S.set({ panel: null })} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#9b5a34]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.panel && S.lock && <InteractPrompt icon={<Stamp size={18} />} label="Mühürlü kapı: baskıyı incele" onClick={() => S.set({ panel: S.lock!.id })} />}
          {!S.card && !S.panel && !S.lock && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.panel && <Hint>Joystick ya da WASD ile yürü · sarayın koridorunda mühürlü kapılara yaklaş, E ile aç<span className="hidden [@media(pointer:fine)]:inline"> · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Malatya · Arslantepe · UNESCO 2021" title="Mühür ve Kapı"
          intro={<>Aslanlı kapıdan höyüğe çık, 5.000 yılı aşkın kerpiç saraya gir. Depoların kapıları <b>kil mühürle</b> kapalı: baskıdaki deseni masadaki <b>altı mühürle</b> karşılaştır, doğrusunu bul. Son depoda dünyanın bilinen en eski kılıçları seni bekliyor.</>}
          controls={CONTROLS} note="Oda düzeni, kapı ve mühür desenleri, koruma çatısı ve heykellerin biçimi temsilîdir." cta="Höyüğe çık" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.panel && <EndSheet kicker="Arslantepe" title="Mühürlerin sarayı"
          text="Kim neyi ne zaman açtı? Binlerce kil mühür, devlet düzeninin ilk adımlarından birini kayda geçirmiş: depolar, dağıtılan paylar ve onları yöneten görevliler."
          stayLabel="Sarayda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Stamp size={16} />, text: <>Mühürlü kapıda <b>E</b>: baskıyla örtüşen mührü seç (baskı = mührün ayna görüntüsü)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele · <b>M</b>: kroki</> },
];
/** Desen çizimi (SVG): birim karede kırık çizgiler */
function Glyph({ strokes, color, w = 6 }: { strokes: Stroke[]; color: string; w?: number }) {
  return <>{strokes.map((st, i) => <polyline key={i} points={st.map(([x, y]) => `${x * 38},${-y * 38}`).join(' ')} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />)}</>;
}
/** Mühür paneli: solda kapının kil mührü (baskı), altında altı mühür */
function SealPanel({ room, onClose }: { room: string; onClose: () => void }) {
  const lock = LOCKS.find((l) => l.room === room)!, seal = SEALS.find((s) => s.id === lock.seal)!, imp = impression(seal, lock.rot);
  return <Modal title="Mühürlü kapı" onClose={onClose} wide>
    <p className="mb-2 text-sm text-[#4a433c]">Kapının mandalındaki kil mühürde bir baskı var. Baskı, mührün <b>ayna görüntüsüdür</b> ve dönmüş olabilir. Hangi mühür bu baskıyı bırakır?</p>
    <div className="mb-3 flex justify-center"><svg viewBox="-55 -55 110 110" className="h-32 w-32"><circle r={52} fill="#b5835a" /><circle r={46} fill="#c4956a" /><Glyph strokes={imp} color="#6a4126" w={7} /></svg></div>
    <div className="grid grid-cols-3 gap-2">{SEALS.map((s) => <button key={s.id} onClick={() => trySeal(room, s.id)} className="flex flex-col items-center gap-1 rounded-xl bg-black/5 py-2 text-xs font-semibold text-[#1f1b17] active:scale-95">
      <svg viewBox="-55 -55 110 110" className="h-16 w-16"><rect x={-50} y={-50} width={100} height={100} rx={18} fill="#e8dcc4" /><Glyph strokes={s.strokes} color="#3a3026" /></svg>{s.name}</button>)}</div>
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low', open = useArs((s) => s.open);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={4.5} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e6e2d6', 400, 3200]} />
      <hemisphereLight args={['#e7eef2', '#8a7a58', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.5} color="#fff0d6" />
      {!low && <Clouds />}
      <Hills />
      <Ground tier={tier} />
      <Gate m={m} />
      <Palace m={m} />
      <Doors m={m} open={open} />
      <StoreContents m={m} />
      <Desk m={m} />
      <group userData={{ noCast: true }}><Roof m={m} /></group>
      <Tomb m={m} />
      <Orchards n={low ? 700 : 1800} />
      <Grass n={low ? 2500 : 6000} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useArs.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), lockId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useArs.getState(), active = S.started && !S.card && !S.panel && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz, S.open), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const lk = S.started ? nearestLock(live.x, live.z, S.open) : null; if ((lk?.id ?? '') !== lockId.current) { lockId.current = lk?.id ?? ''; S.set({ lock: lk }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, open }: { seen: string[]; open: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const x0 = -110, z0 = -60, W = 220, Hh = 160, sx = (x: number) => x - x0, sz = (z: number) => z - z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-48 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-60" aria-label="Höyük krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#a8a46a" />
        <ellipse cx={sx(0)} cy={sz(0)} rx={130} ry={95} fill="#c4ab7c" />
        <ellipse cx={sx(0)} cy={sz(0)} rx={95} ry={66} fill="#d3bd92" />
        <rect x={sx(ROOF.x0)} y={sz(ROOF.z0)} width={ROOF.x1 - ROOF.x0} height={ROOF.z1 - ROOF.z0} fill="#eee9dd" stroke="#8a7a5c" strokeWidth={0.5} />
        {ROOMS.map((r) => <rect key={r.id} x={sx(r.x0)} y={sz(r.z0)} width={r.x1 - r.x0} height={r.z1 - r.z0} fill={r.side === 's' ? '#c9a77c' : open.includes(r.id) ? THEME.accent : '#8a6a4c'} stroke="#5a4532" strokeWidth={0.6} />)}
        <rect x={sx(PAL.x0)} y={sz(COR.z0)} width={PAL.x1 - PAL.x0} height={COR.z1 - COR.z0} fill="#efe3cc" />
        <rect x={sx(GATE.x - 5)} y={sz(GATE.z - 1.5)} width={10} height={3} fill="#7a7164" />
        <rect x={sx(TOMB[0] - 2)} y={sz(TOMB[1] - 1.2)} width={4} height={2.4} fill="#6f5a42" />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={2.4} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-4 L3,3 L0,1.5 L-3,3 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.6} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} ayrıntı · {open.length}/{LOCKS.length} depo</p>
    </div>
  );
}
