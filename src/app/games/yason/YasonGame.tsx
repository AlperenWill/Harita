/**
 * Ordu — Yason Burnu Kilisesi: "Açık Taş, Koyu Taş" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu burunda yürür, kiliseye iki kapısından girip dolaşır, dört ayrıntıyı inceler (E). Batı cephesinin önünde bulmacaya geçer:
 * eksik taşları açık-koyu düzene göre (sıralar dönüşümlü, kemer taşları dönüşümlü) yerine koyar. 4 ayrıntı + cephe.
 */
import { SceneFog } from '../shared/SceneFog';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, BrickWall, Church as ChurchIcon } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_FACADE, CH, MAX_WRONG, MISSING, SPOTS, START, atPuzzle, groundY, key, nearestSpot, slide, toneOf, type Spot, type Tone } from './site';
import { Church, Facade, Land, TONE_COL, useMats } from './YasonModels';

const THEME = { accent: '#3d6a5a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6, FOV = 66;
const audio = new WalkAudio({ freq: 640, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.45).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; atPuzzle: boolean; puzzle: boolean; tone: Tone; filled: Record<string, Tone>; wrong: number; done: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, atPuzzle: false, puzzle: false, tone: 'acik' as Tone, filled: {} as Record<string, Tone>, wrong: 0, done: false, endShown: false, toast: null as string | null };
const useAs = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.08 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3000) => { clearTimeout(toastT); useAs.getState().set({ toast: t }); toastT = setTimeout(() => useAs.getState().set({ toast: null }), ms); };
const CV = { yaw: -Math.PI / 2, pitch: 0.08 };
function startPuzzle() { useAs.getState().set({ puzzle: true }); say('Parlayan boşluklara taş koy: önce açık ya da koyu taşı seç. Sıralar ve kemer taşları dönüşümlüdür.', 4600); }
const stopPuzzle = () => useAs.getState().set({ puzzle: false });
function placeStone(c: number, r: number) { const s = useAs.getState(), k = key(c, r); if (!MISSING.some(([mc, mr]) => mc === c && mr === r) || s.filled[k]) return;
  if (toneOf(c, r) !== s.tone) { const wrong = s.wrong + 1; audio.tone(false); if (wrong >= MAX_WRONG) { s.set({ wrong: 0, filled: {} }); say('Desen bozuldu: taşları yeniden yerleştir. Komşu sıralara ve kemer taşlarına bak.', 4200); } else { s.set({ wrong }); say(`Bu ton buraya uymuyor (${wrong}/${MAX_WRONG}).`, 2400); } return; }
  const filled = { ...s.filled, [k]: s.tone }; audio.step(500);
  if (Object.keys(filled).length === MISSING.length) { s.set({ filled, done: true, puzzle: false, card: CARD_FACADE }); audio.tone(true); audio.speak(`${CARD_FACADE.name}. ${CARD_FACADE.text}`); } else s.set({ filled }); }

export default function YasonGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useAs(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.08; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useAs.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useAs.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useAs.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useAs.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useAs.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.puzzle) stopPuzzle(); else if (s.atPuzzle && !s.done) startPuzzle(); else if (s.near) inspect(s.near); }
      if (s.puzzle && e.code === 'Digit1') s.set({ tone: 'acik' }); if (s.puzzle && e.code === 'Digit2') s.set({ tone: 'koyu' });
      if (e.code === 'Escape') { if (s.card) close(); else if (s.puzzle) stopPuzzle(); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __yason: unknown }).__yason = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useAs.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      puzzle: () => { useAs.getState().set({ started: true, card: null }); startPuzzle(); }, place: (c: number, r: number, t: Tone) => { useAs.getState().set({ tone: t }); placeStone(c, r); },
      solveSome: (n: number) => { for (const [c, r] of MISSING.slice(0, n)) { useAs.getState().set({ tone: toneOf(c, r)! }); placeStone(c, r); } },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useAs.getState(); return a.started && !a.card && !a.puzzle && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.done ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 6000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} filled={S.filled} puzzle={S.puzzle} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dbe7ee" sun="#fff0d6" ground="#5f6a50" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<ChurchIcon size={15} />} label={done ? 'Hepsini buldun' : S.puzzle ? `Taşlar ${Object.keys(S.filled).length}/${MISSING.length}` : `Ayrıntılar ${S.seen.length}/${SPOTS.length}${S.done ? '' : ' · cephe'}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Bu ton') || S.toast?.startsWith('Desen') ? 'bad' : 'ok'} />}
        {S.started && S.puzzle && !S.card && <PuzzlePanel tone={S.tone} placed={Object.keys(S.filled).length} wrong={S.wrong} />}
        {S.started && (<>
          {!S.puzzle && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#3d6a5a]" />}
          {!S.puzzle && <LookCrosshair locked={fpl.locked} />}
          {!S.card && !S.puzzle && S.atPuzzle && !S.done && <InteractPrompt icon={<BrickWall size={18} />} label="Batı cephesindeki eksik taşları yerleştir" onClick={startPuzzle} />}
          {!S.card && !S.puzzle && !(S.atPuzzle && !S.done) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.puzzle && <Hint>Yoldan buruna yürü · kilisenin batı cephesinin önünde E · içeri batı ya da güney kapısından gir</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Ordu · Perşembe · Yason Burnu" title="Açık Taş, Koyu Taş"
          intro={<>Denize uzanan burunda Aziz Nikolaos'a adanmış küçük kilise. İçinde dolaş, sonra <b>batı cephesindeki eksik taşları</b> açık-koyu düzene göre yerine koy.</>}
          controls={CONTROLS} note="Kilisenin ölçüleri, cephe deseni ve eksik taşlar temsilîdir." cta="Buruna yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.puzzle && <EndSheet kicker="Yason Burnu" title="Denizcilerin kilisesi"
          text="Argonotların mitiyle anılan burunda, harabeyken onarılan küçük kilise denize bakmayı sürdürüyor."
          stayLabel="Burunda kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
  { icon: <BrickWall size={16} />, text: <>Cephe: açık (<b>1</b>) ya da koyu (<b>2</b>) taşı seç, parlayan boşluğa dokun</> },
];

/* ---------- 3B dünya ---------- */
function World({ tier, filled, puzzle }: { tier: Tier; filled: Record<string, Tone>; puzzle: boolean }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.4; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <SceneFog args={['#dfe6ea', 600, 4000]} />
      <hemisphereLight args={['#e7eef2', '#4f5d48', 0.55]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.2} color="#fff0d6" />
      {!low && <Clouds />}
      <Land m={m} />
      <Church m={m} />
      <Facade m={m} filled={filled} active={puzzle} onCell={placeStone} />
      <Markers />
    </group>
  );
}
function Markers() {
  const pts = useMemo(() => SPOTS.map((s) => ({ id: s.id, p: s.mark })), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useAs.getState(); pts.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.p[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{pts.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.p} material={mat}><octahedronGeometry args={[0.14, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useAs.getState(), active = S.started && !S.card && !S.puzzle && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const ap = S.started && atPuzzle(live.x, live.z); if (ap !== S.atPuzzle) S.set({ atPuzzle: ap });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (S.puzzle && !live.fly) { const asp = (camera as THREE.PerspectiveCamera).aspect, tv = Math.tan((FOV / 2) * Math.PI / 180), d = Math.max(5.2 / tv, (CH.hw + 0.8) / (tv * Math.max(0.3, asp))); applyFp(camera, CH.x0 - d, 3.6, 0, CV, 0); }
    else if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}

/** Cephe paneli: ton seçimi, sayaç, hata ve çıkış */
function PuzzlePanel({ tone, placed, wrong }: { tone: Tone; placed: number; wrong: number }) {
  const btn = (t: Tone, label: string) => <button onClick={() => useAs.getState().set({ tone: t })} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-bold ring-2 ${tone === t ? 'ring-[#1f1b17]' : 'ring-transparent'} bg-white`}><span className="h-5 w-7 rounded" style={{ background: TONE_COL[t] }} />{label}</button>;
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto max-w-md rounded-3xl bg-[#f7f5f1]/95 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="mb-2 flex items-center justify-between text-xs font-bold"><span>Taşlar {placed}/{MISSING.length} · hata {wrong}/{MAX_WRONG}</span><button onClick={stopPuzzle} className="rounded-lg bg-black/5 px-2 py-1">Çık</button></div>
    <div className="flex gap-2">{btn('acik', 'Açık taş')}{btn('koyu', 'Koyu taş')}</div>
    <div className="mt-1.5 text-[11px] text-[#5a524a]">Parlayan boşluğa dokun. Sıralar açık-koyu dönüşümlü; kapı kemerinin taşları da dönüşümlü.</div>
  </div>;
}
