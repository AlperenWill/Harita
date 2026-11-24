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
import { Footprints, MousePointer2, Search, ListOrdered, Milestone } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BOARD_ORDER, CARD_DONE, EVENTS, SPOTS, START, TIMELINE_AT, groundY, nearBoard, nearestSpot, orderOk, slide, type Spot } from './site';
import { Boards, Grass, Ground, Mountains, Path, Plaza, useMats } from './MalazgirtModels';

const THEME = { accent: '#2f4a5c' };
const EYE = 1.62, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.7, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; board: number; got: string[]; atLine: boolean; panel: boolean; done: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, board: -1, got: [] as string[], atLine: false, panel: false, done: false, endShown: false, toast: null as string | null };
const useMal = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useMal.getState().set({ toast: t }); toastT = setTimeout(() => useMal.getState().set({ toast: null }), ms); };
function takeBoard(k: number) { const s = useMal.getState(), id = BOARD_ORDER[k]; if (s.got.includes(id)) return; const e = EVENTS.find((q) => q.id === id)!, got = [...s.got, id];
  s.set({ got, card: { id: e.id, name: e.name, kicker: `${e.date} · pano ${got.length}/${EVENTS.length}`, text: e.text, source: e.source } }); audio.tone(true); audio.speak(`${e.date}. ${e.name}. ${e.text}`); }
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
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.panel) s.set({ panel: false }); else if (s.board >= 0) takeBoard(s.board); else if (s.atLine && s.got.length === EVENTS.length && !s.done) s.set({ panel: true }); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape' && s.panel) s.set({ panel: false });
      if (e.code === 'Escape' && s.card) close();
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
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
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useMal.getState(); return a.started && !a.card && !a.panel && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + EVENTS.length + 1, found = S.seen.length + S.got.length + (S.done ? 1 : 0), done = found >= total, allGot = S.got.length === EVENTS.length;
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
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#2f4a5c]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.panel && S.board >= 0 && <InteractPrompt icon={<Milestone size={18} />} label="Panodaki olayı not al" onClick={() => takeBoard(S.board)} />}
          {!S.card && !S.panel && S.board < 0 && S.atLine && allGot && !S.done && <InteractPrompt icon={<ListOrdered size={18} />} label="Zaman çizelgesini aç" onClick={() => S.set({ panel: true })} />}
          {!S.card && !S.panel && S.board < 0 && !(S.atLine && allGot && !S.done) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.panel && <Hint>Yol boyunca kuzeye yürü · panolarda E · yolun ucundaki merasim alanında olayları sıraya diz</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Muş · Malazgirt · 26 Ağustos 1071" title="Zaman Çizelgesi"
          intro={<>Savaş alanı bugün bir tarihi millî park. Yol boyunca duran <b>beş panodaki olayları</b> topla; panolar karışık sırada. Yolun ucunda olayları <b>tarih sırasına</b> diz.</>}
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
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low', got = useMal((s) => s.got);
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
    const dt = Math.min(raw, 0.05), S = useMal.getState(), active = S.started && !S.card && !S.panel && !pause.on;
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
    const al = Math.hypot(live.x - TIMELINE_AT[0], live.z - TIMELINE_AT[1]) < 6; if (al !== lineRef.current) { lineRef.current = al; S.set({ atLine: al }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
