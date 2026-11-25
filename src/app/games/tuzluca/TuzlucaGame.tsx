/**
 * Iğdır — Tuzluca Tuz Mağaraları: "Serin Nefes" (kısa). Ana yönetici (ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu sıcak ovadan tünelle tuz galerilerine iner; termometre içeri girdikçe düşer. Dört ayrıntı (E) ve en dipteki terapi
 * salonunda nefes ritmi: halka büyürken basılı tut (nefes al), küçülürken bırak (nefes ver). 4 ayrıntı + nefes.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, MousePointer2, Search, Wind, Thermometer, Armchair } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { BREATH, CARD_NEFES, SEAT_AT, SPOTS, START, atSeat, breathPhase, cycleGood, groundY, isInside, nearestSpot, slide, temperature, type Spot } from './site';
import { Furniture, Lamps, Mine, Mountains, Outside, useMats } from './TuzlucaModels';

const THEME = { accent: '#8a5a3c' };
const EYE = 1.62, SIT = 1.12, WALK = 1.6, RUN = 3.4, FOV = 66;
const audio = new WalkAudio({ freq: 520, gain: 0.07 }, 'any');
const SUN_DIR = new THREE.Vector3(0.35, 0.75, 0.55).normalize();

type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; seat: boolean; breathing: boolean; bk: number; bphase: 'in' | 'out'; bcycle: number; good: number; nefes: boolean; inside: boolean; temp: number; endShown: boolean; toast: string | null; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, seat: false, breathing: false, bk: 0, bphase: 'in' as const, bcycle: 0, good: 0, nefes: false, inside: false, temp: 34, endShown: false, toast: null as string | null };
const useTuz = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: 0.04 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();
/** Nefes: süre, basılı mı, döngü başına doğru geçen süreler */
const br = { t: 0, hold: false, inOk: 0, outOk: 0, cycle: 0, good: 0 };
let toastT: ReturnType<typeof setTimeout> | undefined;
const say = (t: string, ms = 3600) => { clearTimeout(toastT); useTuz.getState().set({ toast: t }); toastT = setTimeout(() => useTuz.getState().set({ toast: null }), ms); };
function startBreath() { Object.assign(br, { t: 0, hold: false, inOk: 0, outOk: 0, cycle: 0, good: 0 }); live.x = SEAT_AT[0]; live.z = SEAT_AT[1]; live.view.yaw = 0; live.view.pitch = 0.08;
  useTuz.getState().set({ breathing: true, bk: 0, bphase: 'in', bcycle: 0, good: 0 }); }
function stopBreath() { br.hold = false; useTuz.getState().set({ breathing: false }); }

export default function TuzlucaGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useTuz(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  const reset = () => { Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = 0.04; };
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useTuz.setState(INITIAL); reset(); }, []);
  const inspect = useCallback((s: Spot) => { const st = useTuz.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`); }, []);
  const close = useCallback(() => { useTuz.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); useTuz.setState({ ...INITIAL, started: true }); reset(); }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useTuz.getState(); if (!s.started || pause.on) return;
      if (e.code === 'Space' && s.breathing) br.hold = true;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.breathing) stopBreath(); else if (s.seat && !s.nefes) startBreath(); else if (s.near) inspect(s.near); }
      if (e.code === 'Escape') { if (s.card) close(); else if (s.breathing) stopBreath(); }
    };
    const up = (e: KeyboardEvent) => { keys.delete(e.code); if (e.code === 'Space') br.hold = false; };
    const blur = () => { keys.clear(); br.hold = false; };
    addEventListener('keydown', down); addEventListener('keyup', up); addEventListener('blur', blur);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); removeEventListener('blur', blur); keys.clear(); };
  }, [inspect, close]);

  useEffect(() => {
    if (!location.search.includes('debug')) return;
    (window as unknown as { __tuzluca: unknown }).__tuzluca = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useTuz.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; }, land: () => { live.fly = null; },
      breathe: () => { useTuz.getState().set({ started: true, card: null }); startBreath(); },
      hold: (v: boolean) => { br.hold = v; },
      skip: (t: number) => { br.t = t; }, phase: () => breathPhase(br.t).phase,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useTuz.getState(); return a.started && !a.card && !a.breathing && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.nefes ? 1 : 0), done = found >= total;
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e9e5da] text-white" style={{ touchAction: 'none' }} {...fpl.handlers}>
      <HudTheme theme={THEME}>
        <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }}
          camera={{ fov: FOV, near: 0.05, far: 14000, position: [START.at[0], EYE, START.at[1]] }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
          {adaptive(G) && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
          <Suspense fallback={null}>
            <World tier={tier} inside={S.inside} />
            <Controller stick={stick} />
            <SkyEnvironment sky="#dfe7ee" sun="#fff0d6" ground="#b39f78" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Wind size={15} />} label={done ? 'Hepsini buldun' : S.seen.length === SPOTS.length && !S.nefes ? 'Terapi salonunda nefes al' : `Ayrıntılar ${S.seen.length}/${SPOTS.length}`} done={found} total={total} /> : undefined}
          right={<GameMenu onPause={(v) => { pause.on = v; if (v) { keys.clear(); br.hold = false; } }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} />} />
        {S.started && !S.card && <Toast text={S.toast} tone={S.toast?.startsWith('Ritim') ? 'bad' : 'ok'} />}
        {S.started && !S.card && !S.breathing && <Thermo t={S.temp} />}
        {S.started && S.breathing && !S.card && <BreathHud k={S.bk} phase={S.bphase} cycle={S.bcycle} good={S.good} />}
        {S.started && (<>
          {!S.breathing && <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#8a5a3c]" />}
          <LookCrosshair locked={fpl.locked} />
          {!S.card && !S.breathing && S.seat && !S.nefes && <InteractPrompt icon={<Armchair size={18} />} label="Banka otur: nefes ritmi" onClick={startBreath} />}
          {!S.card && !S.breathing && !(S.seat && !S.nefes) && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && !S.breathing && <Hint>Tünelden içeri gir · termometreyi izle · parıltılı ayrıntılarda E · en dipteki terapi salonunda banka otur</Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.kicker} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => { audio.hush(); audio.speak(`${S.card!.name}. ${S.card!.text}`); }} />}
        {!S.started && <StartSheet kicker="Iğdır · Tuzluca" title="Serin Nefes"
          intro={<>Sıcak ovadan <b>Tuz Dağı'nın</b> içine gir. Tuz galerilerinde dört ayrıntıyı bul; termometre içeri girdikçe düşer. En dipteki <b>terapi salonunda</b> banka otur ve nefes ritmini tuttur.</>}
          controls={CONTROLS} note="Galerilerin düzeni, ölçüleri ve dış sıcaklık temsilîdir. Oyun tıbbi bilgi vermez." cta="İçeri gir" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && !S.breathing && <EndSheet kicker="Tuzluca" title="Yerin altında serinlik"
          text="Yüzyıllardır tuz çıkarılan galeriler bugün serinlemek ve dinlenmek isteyenleri ağırlıyor."
          stayLabel="Mağarada kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ile incele</> },
  { icon: <Wind size={16} />, text: <>Nefes: halka büyürken <b>Boşluk</b>'u ya da düğmeyi basılı tut, küçülürken bırak</> },
];
/** Termometre: sağ altta küçük gösterge */
function Thermo({ t }: { t: number }) {
  const c = t > 26 ? '#c4552f' : t > 17 ? '#c79a3a' : '#3f7fa8';
  return <div className="pointer-events-none absolute bottom-[calc(max(16px,env(safe-area-inset-bottom))+56px)] right-[max(14px,env(safe-area-inset-right))] flex items-center gap-1.5 rounded-full bg-[#f7f5f1]/92 px-3 py-1.5 text-sm font-bold text-[#1f1b17] shadow ring-1 ring-black/5" role="status">
    <Thermometer size={16} color={c} /><span style={{ color: c }}>{t} °C</span>
  </div>;
}
/** Nefes göstergesi: büyüyüp küçülen halka, evre yazısı, döngü sayısı ve basılı tutma düğmesi */
function BreathHud({ k, phase, cycle, good }: { k: number; phase: 'in' | 'out'; cycle: number; good: number }) {
  const s = phase === 'in' ? 0.45 + 0.55 * k : 1 - 0.55 * k;
  return <>
    <div className="pointer-events-none absolute left-1/2 top-[42%] grid h-40 w-40 -translate-x-1/2 -translate-y-1/2 place-items-center">
      <div className="absolute inset-0 rounded-full border-2 border-white/60" />
      <div className="absolute inset-0 rounded-full bg-white/25 ring-2 ring-white/80" style={{ transform: `scale(${s})` }} />
      <div className="relative rounded-full bg-[#f7f5f1]/90 px-3 py-1 text-sm font-bold text-[#1f1b17]">{phase === 'in' ? 'Nefes al' : 'Nefes ver'}</div>
    </div>
    <div className="pointer-events-none absolute left-1/2 top-[calc(42%+96px)] -translate-x-1/2 rounded-full bg-[#f7f5f1]/90 px-3 py-1 text-xs font-semibold text-[#1f1b17]">Döngü {Math.min(cycle + 1, BREATH.cycles)}/{BREATH.cycles} · iyi: {good}/{BREATH.need}</div>
    <div className="pointer-events-auto absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
      <button onPointerDown={(e) => { e.stopPropagation(); br.hold = true; }} onPointerUp={(e) => { e.stopPropagation(); br.hold = false; }} onPointerLeave={() => { br.hold = false; }} onPointerCancel={() => { br.hold = false; }}
        className="h-20 w-56 rounded-full bg-[#8a5a3c] text-sm font-bold text-white shadow-lg active:scale-95">Basılı tut: nefes al</button>
      <button onPointerDown={(e) => e.stopPropagation()} onClick={stopBreath} className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1f1b17]">Kalk</button>
    </div>
  </>;
}

/* ---------- 3B dünya ---------- */
function World({ tier, inside }: { tier: Tier; inside: boolean }) {
  const m = useMats(), g = useRef<THREE.Group>(null), low = tier === 'low';
  const { scene } = useThree();
  const fog = useMemo(() => new THREE.Fog('#e6e3da', 1500, 12000), []);
  useEffect(() => { scene.fog = fog; scene.environmentIntensity = inside ? 0.06 : 0.35; if (inside) { fog.color.set('#2a231d'); fog.near = 25; fog.far = 120; } else { fog.color.set('#e6e3da'); fog.near = 1500; fog.far = 12000; } }, [scene, fog, inside]);
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000);
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={4} rayleigh={1.2} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <hemisphereLight args={inside ? ['#b8a696', '#4a3f36', 0.85] : ['#e7eef2', '#8a7a5a', 0.5]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={inside ? 0 : 5.5} color="#fff0d6" />
      {!low && !inside && <Clouds />}
      <Mountains />
      <Outside m={m} />
      <Mine m={m} />
      <Furniture m={m} />
      <Lamps n={low ? 6 : 12} />
      <Markers />
    </group>
  );
}
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const st = useTuz.getState(); SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !st.seen.includes(s.id); m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.06; m.rotation.y = clock.elapsedTime * 1.2; }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera + nefes ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useTuz.getState(), active = S.started && !S.card && !S.breathing && !pause.on;
    if (S.breathing && !S.card && !pause.on) {
      const step = Math.min(raw, 0.1); const ph = breathPhase(br.t);
      if (ph.phase === 'in' ? br.hold : !br.hold) { if (ph.phase === 'in') br.inOk += step; else br.outOk += step; }
      br.t += step; const nx = breathPhase(br.t);
      if (nx.cycle > br.cycle) { const ok = cycleGood(br.inOk / BREATH.inhale, br.outOk / BREATH.exhale); if (ok) { br.good++; audio.tone(true); } else audio.step(300); br.inOk = 0; br.outOk = 0; br.cycle = nx.cycle;
        if (br.good >= BREATH.need) { S.set({ breathing: false, nefes: true, card: CARD_NEFES, good: br.good }); audio.speak(`${CARD_NEFES.name}. ${CARD_NEFES.text}`); }
        else if (br.cycle >= BREATH.cycles) { say('Ritim tutmadı: halka büyürken basılı tut, küçülürken bırak. Yeniden dene.', 4200); Object.assign(br, { t: 0, inOk: 0, outOk: 0, cycle: 0, good: 0 }); } }
      const cur = breathPhase(br.t); if (Math.abs(cur.k - S.bk) > 0.015 || cur.phase !== S.bphase || br.cycle !== S.bcycle || br.good !== S.good) S.set({ bk: cur.k, bphase: cur.phase, bcycle: br.cycle, good: br.good });
    }
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.7) { live.step = 0; audio.step(isInside(live.z) ? 700 : 900); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const seat = S.started && atSeat(live.x, live.z), inside = isInside(live.z), temp = Math.round(temperature(live.z));
    if (seat !== S.seat || inside !== S.inside || temp !== S.temp) S.set({ seat, inside, temp });
    const sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.03 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, groundY(live.x, live.z) + (S.breathing ? SIT : EYE), live.z, live.view, sway);
    easeFov(camera, FOV, dt);
  });
  return null;
}
