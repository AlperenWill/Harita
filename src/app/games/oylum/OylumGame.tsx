/**
 * Kilis — Oylum Höyük: "Katman Katman" (kısa oyun). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu ovadan höyüğe yürür, güney yamacındaki basamaklı açmaya iner. Üç kesitte E ile kazar: kazı yukarıdan aşağı ilerler (üstteki
 * kazılmadan alttakine geçilmez). Üç buluntudan sonra kesit panosunda katmanlara dönemleri yerleştir. 3 ayrıntı + 3 buluntu + kesit.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Layers, MousePointer2, Pickaxe, Search } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Modal, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { CARD_ORDER, CUTS, PERIODS, SPOTS, START, canDig, groundY, nearestCut, nearestSpot, orderOk, slide, type Cut, type Period, type Spot } from './site';
import { Camp, Finds, Grass, Ground, Hills, Olives, Trench } from './OylumModels';

const THEME = { accent: '#8a6a3c' };
const EYE = 1.62, WALK = 2.2, RUN = 4.6, FOV = 66;
const audio = new WalkAudio({ freq: 600, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(-0.4, 0.7, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearCut: Cut | null; digging: number; dug: number[]; board: boolean; ordered: boolean; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearCut: null, digging: -1, dug: [] as number[], board: false, ordered: false, endShown: false, toast: null as string | null };
const useOy = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useOy.getState().set({ toast: t }); toastT = setTimeout(() => useOy.getState().set({ toast: null }), ms); };
const DIG_S = 1.6;
const live2 = { dig: 0 };
function startDig(c: Cut) { const s = useOy.getState(); if (s.digging >= 0 || s.dug.includes(c.k)) return;
  if (!canDig(c.k, s.dug)) { audio.tone(false); say('Önce üstteki kesit kazılmalı: kazı yukarıdan aşağı, katman katman ilerler.'); return; }
  live2.dig = 0; s.set({ digging: c.k }); audio.step(700); }
function finishDig() { const s = useOy.getState(), c = CUTS[s.digging], dug = [...s.dug, c.k]; s.set({ digging: -1, dug, card: { id: `kesit${c.k}`, name: c.find, kicker: `${c.k + 1}. kesit · buluntu`, text: c.text, source: c.source } }); audio.tone(true); audio.speak(`${c.find}. ${c.text}`); }
export default function OylumGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useOy(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useOy.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useOy.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { const st = useOy.getState(); st.set({ card: null }); audio.hush(); if (st.dug.length === CUTS.length && !st.ordered && st.card?.id.startsWith('kesit')) st.set({ board: true }); }, []);
  const restart = useCallback(() => { audio.hush(); useOy.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useOy.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.board) s.set({ board: false }); else if (s.nearCut && !s.dug.includes(s.nearCut.k)) startDig(s.nearCut); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.board) s.set({ board: false }); }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const blur = () => keys.clear();
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __oylum: unknown }).__oylum = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useOy.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      dig: (k: number) => { useOy.getState().set({ card: null }); startDig(CUTS[k]); },
      digAll: () => useOy.getState().set({ dug: [0, 1, 2], card: null }),
      board: (v: boolean) => useOy.getState().set({ board: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useOy.getState(); return a.started && !a.card && !a.board && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + CUTS.length + 1, found = S.seen.length + S.dug.length + (S.ordered ? 1 : 0), done = found >= total;
  const canBoard = S.dug.length === CUTS.length && !S.ordered;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#ece4d2] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
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
          objective={S.started ? <Objective icon={<Layers size={15} />} label={done ? 'Hepsini buldun' : canBoard ? 'Kesiti oku: dönemleri yerleştir' : `Katman katman kaz · ${S.dug.length}/${CUTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && !S.board && <Toast text={S.toast} tone={S.toast?.startsWith('Önce') || S.toast?.startsWith('Sıra') ? 'bad' : 'ok'} />}
        {S.board && <Board onClose={() => S.set({ board: false })} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#8a6a3c]" />
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.board && S.digging >= 0 && <InteractPrompt icon={<Pickaxe size={18} />} label="Kazılıyor…" onClick={() => undefined} />}
          {!S.card && !S.board && S.digging < 0 && S.nearCut && !S.dug.includes(S.nearCut.k) && <InteractPrompt icon={<Pickaxe size={18} />} label={`Kaz: ${S.nearCut.k + 1}. kesit`} onClick={() => startDig(S.nearCut!)} />}
          {!S.card && !S.board && S.digging < 0 && canBoard && !(S.nearCut && !S.dug.includes(S.nearCut.k)) && <InteractPrompt icon={<Layers size={18} />} label="Kesit panosu: dönemleri yerleştir" onClick={() => S.set({ board: true })} />}
          {!S.card && !S.board && S.digging < 0 && !canBoard && !(S.nearCut && !S.dug.includes(S.nearCut.k)) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.board && <Hint>Joystick ya da WASD ile yürü · höyüğün güney yamacındaki açmaya in · toprak yığınında E ile kaz</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Kilis · Oylum Höyük · 1980'lerden beri kazılıyor" title="Katman Katman"
          intro={<>Höyük, aynı yerde binlerce yıl üst üste kurulan yerleşimlerin birikmesiyle yükselen bir tepedir. Güney yamaçtaki açmada <b>3 kesiti yukarıdan aşağı kaz</b>, buluntuları çıkar, sonra kesitte <b>dönemleri sıraya koy</b>.</>}
          controls={CONTROLS} note="Açmanın yeri ve ölçüleri, buluntuların biçimi temsilîdir; höyüğün boyutları kaynaklardandır." cta="Höyüğe yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.board && <EndSheet kicker="Oylum Höyük" title="Toprağın altındaki zaman"
          text="En altta en eski yerleşim, en üstte en yenisi: bir höyüğü kazmak, binlerce yılı tersinden okumaktır."
          stayLabel="Höyükte kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı sürükle ya da tıkla, fareyle bak (Esc bırakır)</> },
  { icon: <Pickaxe size={16} />, text: <>Kesit önündeki toprak yığınında <b>E</b>: kaz (yukarıdan aşağı)</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
];
/** Kesit panosu: her kesite bir dönem seç */
function Board({ onClose }: { onClose: () => void }) {
  const [assign, setAssign] = useState<Record<number, Period>>({});
  const check = () => { const st = useOy.getState(); if (CUTS.some((c) => !assign[c.k])) { say('Sıra eksik: her kesite bir dönem seç.'); return; }
    if (orderOk(assign)) { st.set({ ordered: true, board: false, card: CARD_ORDER }); audio.tone(true); audio.speak(`${CARD_ORDER.name}. ${CARD_ORDER.text}`); } else { audio.tone(false); say('Sıra tutmuyor: höyükte alttaki katman daha eskidir.'); } };
  return <Modal title="Kesit panosu" onClose={onClose} wide>
    <p className="mb-3 text-sm text-[#4a433c]">Açmanın kesitinde üç katman var. Her katmana bir dönem yerleştir. İpucu: yerleşimler üst üste biriktiği için en alttaki en eskidir.</p>
    <div className="space-y-2">{CUTS.map((c) => <div key={c.k} className="rounded-2xl p-2.5" style={{ background: ['#c4a57a', '#a7845c', '#8f6c49'][c.k] }}>
      <div className="mb-1.5 text-xs font-bold text-white">{c.k + 1}. kesit · {c.k === 0 ? 'en üst' : c.k === 2 ? 'en alt' : 'orta'} · {c.find}</div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">{PERIODS.map((p) => <button key={p.id} onClick={() => setAssign({ ...assign, [c.k]: p.id })} className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold ${assign[c.k] === p.id ? 'bg-white text-[#1f1b17]' : 'bg-black/15 text-white'}`}>{p.label}</button>)}</div>
    </div>)}</div>
    <button onClick={check} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ background: THEME.accent }}>Kesiti kontrol et</button>
  </Modal>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const g = useRef<THREE.Group>(null), low = tier === 'low', dug = useOy((s) => s.dug);
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
      <Trench />
      <Finds dug={dug} />
      <Camp />
      <Olives n={low ? 500 : 1400} />
      <Grass n={low ? 2500 : 6000} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useOy.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef(''), cutId = useRef(-1);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useOy.getState(), active = S.started && !S.card && !S.board && S.digging < 0 && !pause.on;
    if (S.digging >= 0) { live2.dig += Math.min(raw, 0.25); if (live2.dig >= DIG_S) finishDig(); }
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const nc = S.started ? nearestCut(live.x, live.z) : null; if ((nc?.k ?? -1) !== cutId.current) { cutId.current = nc?.k ?? -1; S.set({ nearCut: nc }); }
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + EYE, live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
