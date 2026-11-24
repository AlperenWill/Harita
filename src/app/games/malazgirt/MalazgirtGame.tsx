/**
 * Muş — Malazgirt Meydan Muharebesi Tarihi Millî Parkı: "Zaman Çizelgesi" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Savaş sahnesi yoktur. Oyuncu yürüyüş yolunda kuzeye ilerler; yol boyunca karışık sırayla duran beş panodaki olayları toplar (E),
 * yolun ucundaki merasim alanında çizelgeyi açıp olayları tarih sırasına dizer. 2 ayrıntı + 5 pano + çizelge.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, ListOrdered, Milestone, Target, Map as MapIcon } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { ARCH, ARCH_AT, ARROWS, BOARD_ORDER, CARD_ARCH, CARD_DONE, CARD_MAP, EVENTS, HITS_NEEDED, MAP_Q, MAP_STEPS, SPOTS, START, TABLE, TABLE_FRONT, TARGETS, TIMELINE_AT, groundY, nearBoard, nearestSpot, orderOk, slide, type Spot } from './site';
import { Arrows, Boards, Grass, Ground, MapTable, Mountains, Path, Plaza, Range, arrows, useMats } from './MalazgirtModels';

const THEME = { accent: '#2f4a5c' };
const EYE = 1.62, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.7, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
type Mode = 'walk' | 'archery' | 'table';
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; board: number; got: string[]; atLine: boolean; panel: boolean; done: boolean; mode: Mode; atArch: boolean; atTable: boolean; left: number; hits: number; archDone: boolean; power: number; step: number; tableDone: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, board: -1, got: [] as string[], atLine: false, panel: false, done: false, mode: 'walk' as Mode, atArch: false, atTable: false, left: ARROWS, hits: 0, archDone: false, power: 0, step: 0, tableDone: false, endShown: false, toast: null as string | null };
const useMal = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useMal.getState().set({ toast: t }); toastT = setTimeout(() => useMal.getState().set({ toast: null }), ms); };
function takeBoard(k: number) { const s = useMal.getState(), id = BOARD_ORDER[k]; if (s.got.includes(id)) return; const e = EVENTS.find((q) => q.id === id)!, got = [...s.got, id];
  s.set({ got, card: { id: e.id, name: e.name, kicker: `${e.date} · pano ${got.length}/${EVENTS.length}`, text: e.text, source: e.source } }); audio.tone(true); audio.speak(`${e.date}. ${e.name}. ${e.text}`); }
const draw = { on: false, p: 0 }, relQ = { on: false };
function enterArch() { const s = useMal.getState(); arrows.length = 0; live.x = ARCH_AT[0]; live.z = ARCH_AT[1]; live.view.yaw = -Math.PI / 2; live.view.pitch = 0.05; s.set({ mode: 'archery', left: ARROWS, hits: 0 }); say('Yayı çekmek için düğmeyi ya da Boşluk tuşunu basılı tut, bırakınca ok uçar. Üç hedefi de vur.', 4600); }
function enterTable() { const s = useMal.getState(); live.x = TABLE_FRONT[0]; live.z = TABLE_FRONT[1]; live.view.yaw = 0; live.view.pitch = -0.62; s.set({ mode: 'table', step: 0 }); }
function exitMode() { useMal.getState().set({ mode: 'walk' }); draw.on = false; draw.p = 0; }
function release(camera: THREE.Camera) { const s = useMal.getState(); if (s.mode !== 'archery' || s.left <= 0) return; const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const v = ARCH.minV + (ARCH.maxV - ARCH.minV) * draw.p;
  arrows.push({ p: camera.position.clone().addScaledVector(dir, 0.6), v: dir.multiplyScalar(v), stuck: false }); draw.on = false; draw.p = 0; s.set({ left: s.left - 1, power: 0 }); audio.step(500); }
function answerMap(i: number) { const s = useMal.getState(); if (i !== MAP_Q.correct) { audio.tone(false); say('Kaynaklar bunu söylemiyor: akşamüstü adımına yeniden bak.'); return; } s.set({ tableDone: true, mode: 'walk', card: CARD_MAP }); audio.tone(true); audio.speak(`${CARD_MAP.name}. ${CARD_MAP.text}`); }
function checkLine(seq: string[]) { const s = useMal.getState(); if (orderOk(seq)) { s.set({ done: true, panel: false, card: CARD_DONE }); audio.tone(true); audio.speak(`${CARD_DONE.name}. ${CARD_DONE.text}`); } else { audio.tone(false); say('Sıra tutmuyor: panolardaki tarihlere yeniden bak.'); } }
export default function MalazgirtGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useMal(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useMal.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useMal.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useMal.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useMal.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useMal.getState(); if (!s.started || pause.on) return;
      if (e.code === 'Space' && s.mode === 'archery' && !s.card) draw.on = true;
      if (e.code === 'Escape' && s.mode !== 'walk') exitMode();
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.panel) s.set({ panel: false }); else if (s.mode !== 'walk') exitMode(); else if (s.atArch && !s.archDone) enterArch(); else if (s.atTable && !s.tableDone) enterTable(); else if (s.board >= 0) takeBoard(s.board); else if (s.atLine && s.got.length === EVENTS.length && !s.done) s.set({ panel: true }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.panel) s.set({ panel: false });
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.code); if (e.code === 'Space' && draw.on) relQ.on = true; };
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __malazgirt: unknown }).__malazgirt = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useMal.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      takeAll: () => useMal.getState().set({ got: [...BOARD_ORDER], card: null }),
      panel: (v: boolean) => useMal.getState().set({ panel: v, card: null }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      arrows: () => arrows.map((x) => [x.p.x, x.p.y, x.p.z, x.stuck].map((v) => typeof v === 'number' ? +v.toFixed(2) : v)), cam: () => camRef.c && camRef.c.position.toArray(),
      archery: () => { useMal.getState().set({ started: true, card: null }); enterArch(); },
      shot: (yaw: number, pitch: number, p: number) => { live.view.yaw = yaw; live.view.pitch = pitch; setTimeout(() => { draw.p = p; if (camRef.c) release(camRef.c); }, 120); },
      table: (k: number) => { useMal.getState().set({ started: true, card: null }); enterTable(); useMal.getState().set({ step: k }); },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMal.getState(); return a.started && !a.card && !a.panel && a.mode !== 'table' && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + EVENTS.length + 3, found = S.seen.length + S.got.length + (S.done ? 1 : 0) + (S.archDone ? 1 : 0) + (S.tableDone ? 1 : 0), done = found >= total, allGot = S.got.length === EVENTS.length;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 3000, position: [START.at[0], groundY(START.at[0], START.at[1]) + EYE, START.at[1]] }}
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
          objective={S.started ? <Objective icon={<ListOrdered size={15} />} label={done ? 'Hepsini buldun' : allGot && !S.done ? 'Yolun ucunda çizelgeyi aç' : `Panolar ${S.got.length}/${EVENTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && !S.panel && <Toast text={S.toast} tone={S.toast?.startsWith('Sıra') ? 'bad' : 'ok'} />}
        {S.panel && <Timeline got={S.got} onClose={() => S.set({ panel: false })} />}
        {S.started && S.mode === 'archery' && !S.card && <ArcheryHud left={S.left} hits={S.hits} power={S.power} />}
        {S.started && S.mode === 'table' && !S.card && <TablePanel step={S.step} onStep={(k) => S.set({ step: k })} />}
        {S.started && (<>
          {S.mode === 'walk' && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f4a5c]" />}
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.panel && S.mode === 'walk' && S.atArch && !S.archDone && <InteractPrompt icon={<Target size={18} />} label="Okçuluk alanı: atış yap" onClick={enterArch} />}
          {!S.card && !S.panel && S.mode === 'walk' && S.atTable && !S.tableDone && <InteractPrompt icon={<MapIcon size={18} />} label="Kum masası: savaşın seyri" onClick={enterTable} />}
          {!S.card && !S.panel && S.mode === 'walk' && !S.atArch && !S.atTable && S.board >= 0 && <InteractPrompt icon={<Milestone size={18} />} label="Panodaki olayı not al" onClick={() => takeBoard(S.board)} />}
          {!S.card && !S.panel && S.mode === 'walk' && S.board < 0 && S.atLine && allGot && !S.done && <InteractPrompt icon={<ListOrdered size={18} />} label="Zaman çizelgesini aç" onClick={() => S.set({ panel: true })} />}
          {!S.card && !S.panel && S.mode === 'walk' && !S.atArch && !S.atTable && S.board < 0 && !(S.atLine && allGot && !S.done) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.panel && S.mode === 'walk' && <Hint>Yol boyunca kuzeye yürü · panolarda E · okçuluk alanı yolun doğusunda · kum masası merasim alanının batısında</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Muş · Malazgirt · 26 Ağustos 1071" title="Zaman Çizelgesi"
          intro={<>Savaş alanı bugün bir tarihi millî park. Yol boyunca duran <b>beş panodaki olayları</b> topla ve yolun ucunda <b>tarih sırasına</b> diz. <b>Kum masasında</b> savaşın seyrini adım adım izle, <b>okçuluk alanında</b> üç hedefi vur.</>}
          controls={CONTROLS} note="Savaş sahnesi yoktur. Yolun uzunluğu, panoların yeri ve yapıların biçimi temsilîdir." cta="Yola çık" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.panel && <EndSheet kicker="Malazgirt" title="Sıraya giren tarih"
          text="1071'de bir ovada yapılan savaşın olayları, bugün yürüyüş yolları ve panolarla anlatılıyor."
          stayLabel="Parkta kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Milestone size={16} />, text: <>Panoda <b>E</b>: olayı not al · yolun ucunda çizelge</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];
/** Okçuluk göstergesi: kalan ok, isabet, yay gerginliği; dokunmatik çek-bırak düğmesi */
function ArcheryHud({ left, hits, power }: { left: number; hits: number; power: number }) {
  const { camera } = { camera: camRef.c };
  return <>
    <div className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2"><div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-white/90" /><div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-white/90" /></div>
    <div className="pointer-events-none absolute bottom-[96px] left-1/2 w-56 -translate-x-1/2 rounded-2xl bg-[#f7f5f1]/92 p-2 text-center text-xs font-semibold text-[#1f1b17] ring-1 ring-black/5">
      <div>Ok: {left} · İsabet: {hits}/{HITS_NEEDED}</div>
      <div className="mt-1 h-2 w-full rounded-full bg-black/10"><div className="h-full rounded-full bg-[#2f4a5c]" style={{ width: `${power * 100}%` }} /></div>
    </div>
    <div className="pointer-events-auto absolute bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] flex flex-col items-center gap-2">
      <button onPointerDown={(e) => { e.stopPropagation(); draw.on = true; }} onPointerUp={(e) => { e.stopPropagation(); if (camera) release(camera); }} className="grid h-20 w-20 place-items-center rounded-full bg-[#2f4a5c] text-sm font-bold text-white shadow-lg active:scale-95">Çek · Bırak</button>
      <button onPointerDown={(e) => e.stopPropagation()} onClick={exitMode} className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1f1b17]">Çık</button>
    </div>
  </>;
}
const camRef: { c: THREE.Camera | null } = { c: null }, TV = { yaw: 0, pitch: -0.98 };
/** Kum masası paneli: adım adım savaşın seyri, sonunda soru */
function TablePanel({ step, onStep }: { step: number; onStep: (k: number) => void }) {
  const st = MAP_STEPS[step], last = step === MAP_STEPS.length - 1;
  return <div className="pointer-events-auto absolute inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-3xl bg-[#f7f5f1]/95 p-3 text-[#1f1b17] shadow-lg ring-1 ring-black/5" onPointerDown={(e) => e.stopPropagation()}>
    <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#2f4a5c]"><span>{st.date} · {step + 1}/{MAP_STEPS.length}</span><span className="text-[10px] font-semibold text-[#857b70]">mavi: Bizans · açık mavi: arka koruma · kızıl: Selçuklu</span></div>
    <p className="mb-2 text-sm">{st.text}</p>
    {last && <div className="mb-2 space-y-1"><div className="text-xs font-bold">{MAP_Q.q}</div>{MAP_Q.options.map((o, i) => <button key={i} onClick={() => answerMap(i)} className="block w-full rounded-lg bg-black/5 px-2 py-1.5 text-left text-xs font-semibold">{o}</button>)}</div>}
    <div className="flex gap-2"><button disabled={step === 0} onClick={() => onStep(step - 1)} className="flex-1 rounded-xl bg-black/5 py-2 text-xs font-bold disabled:opacity-40">◀ Önceki</button>
      {!last && <button onClick={() => onStep(step + 1)} className="flex-1 rounded-xl bg-[#2f4a5c] py-2 text-xs font-bold text-white">Sonraki ▶</button>}
      <button onClick={exitMode} className="rounded-xl bg-black/5 px-3 py-2 text-xs font-bold">Çık</button></div>
  </div>;
}

/** Çizelge: olaylara sırayla dokun; yanlışsa baştan */
function Timeline({ got, onClose }: { got: string[]; onClose: () => void }) {
  const [seq, setSeq] = useState<string[]>([]);
  const pool = BOARD_ORDER.filter((id) => got.includes(id));
  const tap = (id: string) => { if (seq.includes(id)) return; const n = [...seq, id]; setSeq(n); if (n.length === EVENTS.length) { checkLine(n); setSeq([]); } };
  return <Modal title="Zaman çizelgesi" onClose={onClose} wide>
    <p className="mb-2 text-sm text-[#4a433c]">Olaylara en eskiden en yeniye doğru sırayla dokun.</p>
    <ol className="mb-3 space-y-1">{EVENTS.map((_, i) => { const e = EVENTS.find((q) => q.id === seq[i]); return <li key={i} className="flex items-center gap-2 rounded-lg bg-black/5 px-2 py-1.5 text-xs font-semibold text-[#1f1b17]"><span className="w-5 text-[#857b70]">{i + 1}.</span>{e ? `${e.date} · ${e.name}` : '—'}</li>; })}</ol>
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{pool.map((id) => { const e = EVENTS.find((q) => q.id === id)!; return <button key={id} disabled={seq.includes(id)} onClick={() => tap(id)} className="rounded-xl bg-white px-3 py-2 text-left text-xs font-semibold text-[#1f1b17] ring-1 ring-black/10 disabled:opacity-30"><div className="text-[10px] text-[#857b70]">{e.date}</div>{e.name}</button>; })}</div>
    {seq.length > 0 && <button onClick={() => setSeq([])} className="mt-2 text-xs font-semibold text-[#2f4a5c] underline">Baştan başla</button>}
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low', got = useMal((s) => s.got), step = useMal((s) => s.step);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.5} rayleigh={1.3} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#e4e6e2', 500, 4200]} />
      <hemisphereLight args={['#e7eef2', '#7a7458', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.5} color="#fff0d6" />
      {!low && <Clouds />}
      <Mountains />
      <Ground />
      <Path m={m} />
      <Boards m={m} got={got} />
      <Plaza m={m} />
      <Range m={m} />
      <Arrows />
      <MapTable m={m} step={step} />
      <Grass n={low ? 3000 : 7000} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useMal.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), bId = useRef(-2), lineRef = useRef(false);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useMal.getState(), active = S.started && !S.card && !S.panel && S.mode === 'walk' && !pause.on; camRef.c = camera;
    if (S.mode === 'archery') { if (draw.on) { draw.p = Math.min(1, draw.p + raw / 1.1); if (Math.abs(draw.p - S.power) > 0.04) S.set({ power: draw.p }); } if (relQ.on) { relQ.on = false; release(camera); } }
    const adt = Math.min(raw, 0.12), n = Math.ceil(adt / 0.01);
    for (let k = 0; k < n; k++) for (const a of arrows) { if (a.stuck) continue; const prev = a.p.clone(); a.v.y -= ARCH.g * adt / n; a.p.addScaledVector(a.v, adt / n);
      for (const t of TARGETS) { if ((prev.x - t.x) * (a.p.x - t.x) <= 0) { const f = (t.x - prev.x) / (a.p.x - prev.x || 1e-6), cy = prev.y + (a.p.y - prev.y) * f, cz = prev.z + (a.p.z - prev.z) * f, ty = groundY(t.x, t.z) + t.y;
        if (Math.hypot(cy - ty, cz - t.z) < t.r) { a.p.set(t.x - 0.25, cy, cz); a.stuck = true; const st = useMal.getState(), hits = st.hits + 1; st.set({ hits }); audio.tone(true);
          if (hits >= HITS_NEEDED) { st.set({ archDone: true, mode: 'walk', card: CARD_ARCH }); audio.speak(`${CARD_ARCH.name}. ${CARD_ARCH.text}`); } else say(`İsabet! ${hits}/${HITS_NEEDED}`, 1600); break; } } }
      if (!a.stuck && a.p.y < groundY(a.p.x, a.p.z)) { a.stuck = true; a.p.y = groundY(a.p.x, a.p.z) + 0.05; } }
    if (S.mode === 'archery' && S.left <= 0 && arrows.every((a) => a.stuck) && S.hits < HITS_NEEDED) { arrows.length = 0; S.set({ left: ARROWS, hits: 0 }); say('Oklar bitti. Yeniden dene: uzaktaki hedef için yayı daha çok ger ve biraz yukarı nişan al.', 4200); }
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const bd = S.started ? nearBoard(live.x, live.z, S.got) : -1; if (bd !== bId.current) { bId.current = bd; S.set({ board: bd }); }
    const aa = S.mode === 'walk' && Math.hypot(live.x - ARCH_AT[0], live.z - ARCH_AT[1]) < 2.4, at = S.mode === 'walk' && Math.hypot(live.x - TABLE_FRONT[0], live.z - TABLE_FRONT[1]) < 2.4; if (aa !== S.atArch || at !== S.atTable) S.set({ atArch: aa, atTable: at });
    const al = Math.hypot(live.x - TIMELINE_AT[0], live.z - TIMELINE_AT[1]) < 6; if (al !== lineRef.current) { lineRef.current = al; S.set({ atLine: al }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (S.mode === 'table' && !live.fly) { const k = (camera as THREE.PerspectiveCamera).aspect < 1 ? 2.6 : 1, ty = groundY(TABLE.at[0], TABLE.at[1]) + TABLE.h; applyFp(camera, TABLE.at[0], ty + 4.2 * k, TABLE.at[1] + 3.6 * k, TV, 0); }
    else if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
