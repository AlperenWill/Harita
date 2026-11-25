/**
 * Zeugma Mozaik Müzesi — "Mozaiklerin Evi". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu meydandan müzenin girişine yürür, holden mozaik salonuna geçer, vitrinlerin arasında dolaşır ve karanlık salona girer. 5 ayrıntı:
 * müze binası, Zeugma kenti, mozaik zemin, "Çingene Kız" mozaiği, kaçırılan parçalar.
 * Yaklaşınca yalnızca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Landmark, Map as MapIcon, MousePointer2, Puzzle, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOUNDS, BUILD, CASES, DARK_DOOR, PUZZLE_START, RESTORE, ROOMS, SPOTS, SQUARE, START, TABLE, groundY, movesLeft, nearestSpot, rotateTile, slide, solved, type Spot } from './site';
import { Ground, Grass, Hills, Museum, Plaza, SUN_DIR, Trees, puzzleImage, puzzleState, useMats } from './ZeugmaModels';

const THEME = { accent: '#9a5a2c' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearTable: boolean; puzzle: boolean; rot: number[]; restored: boolean; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearTable: false, puzzle: false, rot: PUZZLE_START.slice(), restored: false, map: false, endShown: false };
const useZeugma = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const RESTORE_CARD: Card = { id: 'onarim', name: 'Pano tamamlandı', kicker: 'Restorasyon',
  text: 'Kazıdan çıkan mozaikler çoğu zaman parçalar hâlinde kaldırılır; restoratörler parçaları yeniden yerine oturtur ve eksikleri belgeler. Zeugma\'nın mozaikleri de kentin baraj suları altında kalma tehlikesi üzerine kurtarılıp bu müzede sergilendi. Oyundaki kuşlu madalyon ve bulmaca temsilîdir; gerçek bir Zeugma mozaiğinin kopyası değildir.',
  source: { title: 'Wikipedia — Zeugma Mosaic Museum', url: 'https://en.wikipedia.org/wiki/Zeugma_Mosaic_Museum' } };
function turnTile(i: number) { const s = useZeugma.getState(); if (s.restored) return; const rot = rotateTile(s.rot, i); puzzleState.rot = rot; audio.step(520);
  if (solved(rot)) { s.set({ rot, restored: true, puzzle: false, card: RESTORE_CARD }); audio.tone(true); audio.speak(`${RESTORE_CARD.name}. ${RESTORE_CARD.text}`); } else s.set({ rot }); }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function ZeugmaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useZeugma(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); puzzleState.rot = PUZZLE_START.slice(); useZeugma.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useZeugma.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useZeugma.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); puzzleState.rot = PUZZLE_START.slice(); useZeugma.setState({ ...INITIAL, rot: PUZZLE_START.slice(), started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useZeugma.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.puzzle) s.set({ puzzle: false }); else if (s.nearTable && !s.restored) s.set({ puzzle: true }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.puzzle) s.set({ puzzle: false });
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
    (window as unknown as { __zeugma: unknown }).__zeugma = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useZeugma.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useZeugma.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useZeugma.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => { puzzleState.rot = [0, 0, 0, 0, 0, 0, 0, 0, 0]; useZeugma.getState().set({ seen: SPOTS.map((s) => s.id), restored: true, rot: puzzleState.rot }); },
      puzzle: (v: boolean) => useZeugma.getState().set({ puzzle: v }),
      solve: () => { puzzleState.rot = [0, 0, 0, 0, 0, 0, 0, 0, 0]; useZeugma.getState().set({ rot: puzzleState.rot }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useZeugma.getState(); return a.started && !a.card && !a.puzzle && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.restored ? 1 : 0), done = found >= total;
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
            <SkyEnvironment sky="#d2e5f2" sun="#fff1dc" ground="#9a9270" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : 'İzleri bul, panoyu onar'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#9a5a2c]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && S.puzzle && <PuzzlePanel rot={S.rot} onClose={() => S.set({ puzzle: false })} />}
          {!S.card && !S.puzzle && S.nearTable && !S.restored && <InteractPrompt icon={<Puzzle size={18} />} label="Panoyu onar" onClick={() => S.set({ puzzle: true })} />}
          {!S.card && !S.puzzle && !(S.nearTable && !S.restored) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · salonun batısındaki restorasyon masasında panoyu onar<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'onarim' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Gaziantep · Zeugma · MÖ–MS · 2011" title="Mozaiklerin Evi"
          intro={<>Meydandan müzenin girişine yürü; holden mozaik salonuna geç, karanlık salonda <b>Çingene Kız</b> mozaiğine bak: <b>5 ayrıntıyı</b> bul ve incele. Salonun batısındaki <b>restorasyon masasında</b> dokuz parçayı döndürüp mozaik panoyu onar.</>}
          controls={CONTROLS} note="Bina biçimi, salon düzeni, mozaik desenleri ve karanlık salondaki portre temsilîdir; gerçek eserlerin kopyası değildir." cta="Müzeye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Zeugma Mozaik Müzesi" title="Taşa işlenmiş hayat"
          text="Zeugma'nın mozaikleri, kentin sular altında kalma tehlikesi üzerine bu müzede yeniden bir araya getirildi."
          stayLabel="Müzede kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Puzzle size={16} />, text: <>Restorasyon masasında <b>E</b>: parçalara dokunarak döndür, deseni tamamla</> },
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
      <fog attach="fog" args={['#dce6ee', 280, 2600]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Hills />
      <Ground tier={tier} />
      <Plaza m={m} />
      <Museum m={m} tier={tier} />
      <Trees n={low ? 60 : 140} />
      <Grass n={low ? 2000 : 5000} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useZeugma.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useZeugma.getState(), active = S.started && !S.card && !S.puzzle && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const nt = S.started && Math.hypot(live.x - RESTORE.c[0], live.z - RESTORE.c[1]) < RESTORE.reach; if (nt !== S.nearTable) S.set({ nearTable: nt });
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
/** Restorasyon bulmacası: 3×3 parça, dokununca 90° döner; hepsi doğru yöne gelince pano tamamlanır */
function PuzzlePanel({ rot, onClose }: { rot: number[]; onClose: () => void }) {
  const url = puzzleImage();
  return (
    <Modal title="Mozaik panoyu onar" onClose={onClose}>
      <p className="mb-3 text-sm text-[#4a433c]">Parçalara dokunarak döndür; kuşlu madalyon ve çevresindeki kuşaklar bütünleşince pano tamamlanır. En az {movesLeft(rot)} dokunuş kaldı.</p>
      <div className="mx-auto grid w-[min(78vw,300px)] grid-cols-3 gap-1 rounded-lg bg-[#cfc4ae] p-1">
        {rot.map((r, i) => <button key={i} onClick={() => turnTile(i)} aria-label={`Parça ${i + 1}`} className="aspect-square overflow-hidden rounded-sm transition active:scale-95"
          style={{ backgroundImage: `url(${url})`, backgroundSize: '300% 300%', backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%`, transform: `rotate(${r * 90}deg)`, transition: 'transform 180ms', imageRendering: 'pixelated' }} />)}
      </div>
    </Modal>
  );
}
function Kroki({ seen }: { seen: string[] }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Müze krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#b7c48f" opacity={0.6} />
        <rect x={sx(SQUARE.x0)} y={sz(SQUARE.z0)} width={SQUARE.x1 - SQUARE.x0} height={SQUARE.z1 - SQUARE.z0} fill="#d9d0b8" />
        <rect x={sx(BUILD.x0)} y={sz(BUILD.z0)} width={BUILD.x1 - BUILD.x0} height={BUILD.z1 - BUILD.z0} fill="#8f8775" stroke="#5b5146" strokeWidth={0.6} />
        <rect x={sx(ROOMS.hol.x0)} y={sz(ROOMS.hol.z0)} width={ROOMS.hol.x1 - ROOMS.hol.x0} height={ROOMS.hol.z1 - ROOMS.hol.z0} fill="#e6dcc5" />
        <rect x={sx(ROOMS.salon.x0)} y={sz(ROOMS.salon.z0)} width={ROOMS.salon.x1 - ROOMS.salon.x0} height={ROOMS.salon.z1 - ROOMS.salon.z0} fill="#d0b98c" />
        <rect x={sx(ROOMS.karanlik.x0)} y={sz(ROOMS.karanlik.z0)} width={ROOMS.karanlik.x1 - ROOMS.karanlik.x0} height={ROOMS.karanlik.z1 - ROOMS.karanlik.z0} fill="#2a2622" />
        <rect x={sx(DARK_DOOR.x0)} y={sz(ROOMS.salon.z0 - 0.4)} width={DARK_DOOR.x1 - DARK_DOOR.x0} height={0.8} fill="#e6dcc5" />
        {CASES.map((c, i) => <rect key={i} x={sx(c.x0)} y={sz(c.z0)} width={c.x1 - c.x0} height={c.z1 - c.z0} fill="#f2ece0" stroke="#7a6a52" strokeWidth={0.4} />)}
        <rect x={sx(TABLE.x0)} y={sz(TABLE.z0)} width={TABLE.x1 - TABLE.x0} height={TABLE.z1 - TABLE.z0} fill="#7a5636" />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={1.9} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={0.8} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-3 L2.2,2.2 L0,1.1 L-2.2,2.2 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.4} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu</p>
    </div>
  );
}
