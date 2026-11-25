/**
 * Justinianus (Beşköprü) Köprüsü — "Taş Kemerler". Ana yönetici (öteki yeni oyunlarla aynı ortak arayüz ve yürüyüş düzeni).
 *
 * Oyuncu ovadan köprünün batı rampasına yürür, tabliyede yürür, doğu yakaya iner; kemerleri yandan, dereyi kıyıdan görür. 5 ayrıntı:
 * Justinianus'un köprüsü, on iki kemer, taş köprüden önceki dubalı köprü, Çark Deresi, UNESCO geçici listesi.
 * Yaklaşınca "İncele: … E" istemi çıkar; kart E ile açılır. Kroki (M).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Footprints, Landmark, Map as MapIcon, MousePointer2, Search, Waves } from 'lucide-react';
import { Controls, EndSheet, GameMenu, Hint, HudTheme, IconButton, InfoSheet, InteractPrompt, Objective, StartSheet, Toast, TopRow } from '../shared/hud/Hud';
import { adaptive, initialTier, useSettings } from '../shared/hud/settings';
import { applyFp, easeFov, useFpLook } from '../shared/fpLook';
import { LookCrosshair } from '../shared/mouseLook';
import { Joystick } from '../shared/Joystick';
import { WalkAudio, type Tier } from '../shared/walkKit';
import { Clouds, Sun } from '../shared/scenery';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { APSE, AREA, BOUNDS, DECK_X, FLOOD, GAUGE, HALF_W, PIER_X, PIER_W, RAMP_X, SPOTS, START, STREAM, floodDanger, floodLevel, groundY, nearestSpot, slide, type Spot } from './site';
import { Bridge, FloodWater, Gauge, Hills, Pontoon, Poplars, Reeds, SUN_DIR, Stream, Terrain, floodState, useMats } from './JustinianusModels';

const THEME = { accent: '#7a6a4a' };
const EYE = 1.62, WALK = 1.7, RUN = 3.6;
const audio = new WalkAudio({ freq: 620, gain: 0.07 }, 'any');

/* ---------- durum ---------- */
type Card = Pick<Spot, 'id' | 'name' | 'kicker' | 'text' | 'source'>;
type Phase = 'idle' | 'run' | 'done';
interface S { started: boolean; card: Card | null; seen: string[]; near: Spot | null; nearGauge: boolean; phase: Phase; level: number; survived: boolean; toast: string | null; toastTone: 'ok' | 'bad' | 'info'; map: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, card: null, seen: [] as string[], near: null, nearGauge: false, phase: 'idle' as Phase, level: 0, survived: false, toast: null as string | null, toastTone: 'info' as const, map: false, endShown: false };
const useJust = create<S>((set) => ({ ...INITIAL, set: (p) => set(p) }));
const FLOOD_CARD: Card = { id: 'taskin', name: 'Taşkını atlattın', kicker: 'Taşkın',
  text: 'Su ovayı kapladı ama taş köprü yerinde duruyor; ahşap dubalı köprü ise sürüklenip gitti. Prokopios, taş köprüden önce nehrin üzerindeki dubalı köprünün taşkınlarda sık sık sürüklendiğini ve birçok kişinin ölümüne yol açtığını anlatır. Oyundaki taşkının yüksekliği ve hızı temsilîdir.',
  source: { title: 'Wikipedia — Sangarius Bridge', url: 'https://en.wikipedia.org/wiki/Sangarius_Bridge' } };
const flood = { t: -1 };
let toastTimer = 0;
function toast(text: string, tone: 'ok' | 'bad' | 'info', ms = 3200) { useJust.getState().set({ toast: text, toastTone: tone }); clearTimeout(toastTimer); if (ms > 0) toastTimer = window.setTimeout(() => useJust.getState().set({ toast: null }), ms); }
function resetFlood() { flood.t = -1; floodState.level = 0; floodState.reset++; useJust.getState().set({ phase: 'idle', level: 0 }); }
function startFlood() { const s = useJust.getState(); if (s.phase === 'run') return; flood.t = 0; floodState.reset++; s.set({ phase: 'run', level: 0 }); audio.tone(true); toast('Taşkın başladı! Su yükselmeden köprünün tabliyesine çık.', 'bad', 4000); }
const live = { x: START.at[0], z: START.at[1], view: { yaw: START.yaw, pitch: -0.02 }, speed: 0, bob: 0, step: 0, fly: null as null | [number, number, number] };
const pause = { on: false };
const keys = new Set<string>();

export default function JustinianusGame({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(() => initialTier());
  const S = useJust(), G = useSettings();
  const stick = useRef({ x: 0, y: 0 });
  useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); flood.t = -1; floodState.level = 0; floodState.reset++; useJust.setState(INITIAL); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  const inspect = useCallback((s: Spot) => {
    const st = useJust.getState(); st.set({ card: s, seen: st.seen.includes(s.id) ? st.seen : [...st.seen, s.id] }); audio.tone(true); audio.speak(`${s.name}. ${s.text}`);
  }, []);
  const close = useCallback(() => { useJust.getState().set({ card: null }); audio.hush(); }, []);
  const restart = useCallback(() => { audio.hush(); resetFlood(); useJust.setState({ ...INITIAL, started: true }); Object.assign(live, { x: START.at[0], z: START.at[1], speed: 0 }); live.view.yaw = START.yaw; live.view.pitch = -0.02; }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      const s = useJust.getState(); if (!s.started || pause.on) return;
      if (e.code === 'KeyE') { if (s.card) close(); else if (s.nearGauge && s.phase !== 'run') startFlood(); else if (s.near) inspect(s.near); }
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
    (window as unknown as { __just: unknown }).__just = {
      go: (x: number, z: number) => { live.x = x; live.z = z; useJust.getState().set({ started: true, card: null }); },
      look: (yaw: number, pitch = 0) => { live.view.yaw = yaw; live.view.pitch = pitch; },
      spot: (id: string) => { const s = SPOTS.find((q) => q.id === id); if (s) { live.x = s.at[0]; live.z = s.at[1]; useJust.getState().set({ started: true, card: null }); } },
      map: (v: boolean) => useJust.getState().set({ map: v }),
      fly: (x: number, y: number, z: number) => { live.fly = [x, y, z]; },
      land: () => { live.fly = null; },
      seeAll: () => useJust.getState().set({ seen: SPOTS.map((s) => s.id), survived: true }),
      flood: (t: number) => { flood.t = t; useJust.getState().set({ phase: 'run' }); },
      SPOTS,
    };
  }, []);

  const fpl = useFpLook(live.view, () => { const a = useJust.getState(); return a.started && !a.card && !pause.on; }, () => audio.unlock());
  const total = SPOTS.length + 1, found = S.seen.length + (S.survived ? 1 : 0), done = found >= total;
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
            <SkyEnvironment sky="#d4e4ef" sun="#fff1dc" ground="#7f9068" sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} />
            <Polish tier={tier} />
          </Suspense>
        </Canvas>
        <TopRow onExit={onExit}
          objective={S.started ? <Objective icon={<Landmark size={15} />} label={done ? 'Hepsini buldun' : S.phase === 'run' ? `Su ${S.level.toFixed(1).replace('.', ',')} m · köprüye çık!` : 'İzleri bul, taşkını atlat'} done={found} total={total} /> : undefined}
          right={<>{S.started && <IconButton label="Krokiyi aç/kapat (M)" active={S.map} onClick={() => S.set({ map: !S.map })}><MapIcon size={18} /></IconButton>}<GameMenu onPause={(v) => { pause.on = v; if (v) keys.clear(); }} help={<Controls items={CONTROLS} />} onRestart={restart} onExit={onExit} /></>} />
        {S.started && S.map && <Kroki seen={S.seen} level={S.level} />}
        {S.started && (<>
          <Joystick stick={stick} onTouch={() => audio.unlock()} color="bg-[#7a6a4a]" />
          <LookCrosshair locked={fpl.locked} />
          <Toast text={S.toast} tone={S.toastTone} />
          {!S.card && S.nearGauge && S.phase !== 'run' && <InteractPrompt icon={<Waves size={18} />} label={S.survived ? 'Taşkını yeniden başlat' : 'Taşkını başlat'} onClick={startFlood} muted={S.survived} />}
          {!S.card && !(S.nearGauge && S.phase !== 'run') && S.near && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.near.name}`} onClick={() => inspect(S.near!)} muted={S.seen.includes(S.near.id)} />}
          {!S.card && <Hint>Joystick ya da WASD ile yürü · E ile incele · ovadaki taşkın ölçeğinden taşkını başlat, köprüye çık<span className="hidden [@media(pointer:fine)]:inline"> · fareyle sürükle: bak · M: kroki</span></Hint>}
        </>)}
        {S.card && <InfoSheet kicker={S.card.id === 'taskin' ? S.card.kicker : `${S.card.kicker} · ${S.seen.length}/${SPOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} onListen={() => speakAgain(S.card!)} />}
        {!S.started && <StartSheet kicker="Sakarya · Beşköprü · MS 562" title="Taş Kemerler"
          intro={<>Ovadan köprünün batı rampasına yürü; tabliyede dolaş, doğu yakaya in, kemerlere ve ayaklara yandan bak: <b>7 ayrıntıyı</b> incele. Ovadaki <b>taşkın ölçeğinden</b> taşkını başlat: su yükselmeden köprünün üstüne çık ve ahşap dubalı köprünün başına geleni izle.</>}
          controls={CONTROLS} note="Oyundaki köprü 152 m'dir; gerçek köprünün 365–430 m olduğu aktarılır. Taşkının yüksekliği ve dubalı köprü temsilîdir." cta="Köprüye yürü" ctaIcon={<Footprints size={18} />}
          onStart={() => { audio.unlock(); S.set({ started: true }); }} onExit={onExit} />}
        {S.started && done && !S.endShown && !S.card && <EndSheet kicker="Justinianus Köprüsü" title="Bin beş yüz yıllık kemerler"
          text="Taşkını taş köprünün üstünde atlattın. Yaklaşık MS 562'de tamamlanan köprü, ahşap köprüleri sürükleyen selleri aşmak için yapıldı; bugün küçük bir derenin üzerinde duruyor ve UNESCO Dünya Mirası Geçici Listesi'nde."
          stayLabel="Köprüde kal" onStay={() => S.set({ endShown: true })} onExit={onExit} onRestart={restart} />}
      </HudTheme>
    </div>
  );
}
function speakAgain(s: Card) { audio.hush(); audio.speak(`${s.name}. ${s.text}`); }
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Joystick ya da <b>WASD</b> ile yürü (A/D yana adım, Shift: hızlı)</> },
  { icon: <MousePointer2 size={16} />, text: <>Ekranı ya da fareyle basılı tutup sürükle: bak</> },
  { icon: <Search size={16} />, text: <>Parıltılı ayrıntıya yaklaş: <b>E</b> ya da düğme ile incele · <b>M</b>: kroki</> },
  { icon: <Waves size={16} />, text: <>Taşkın ölçeğinde <b>E</b>: taşkını başlat. Su belini geçerse sel seni sürükler; köprünün tabliyesine ya da rampanın yüksek kısmına çık</> },
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
      <fog attach="fog" args={['#dde6e4', 300, 2800]} />
      <hemisphereLight args={['#e6eef4', '#8a8266', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.4} color="#fff0d8" />
      {!low && <Clouds />}
      <Hills />
      <Terrain tier={tier} />
      <Stream m={m} />
      <Bridge m={m} />
      <Gauge />
      <Pontoon />
      <FloodWater />
      <Poplars n={low ? 14 : 36} />
      <Reeds n={low ? 1500 : 4500} />
      <Markers />
    </group>
  );
}
/** Bulunmamış ayrıntıların üstünde hafif parıltı (yakınken belirginleşir) */
function Markers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.85, depthWrite: false }), []);
  useFrame(({ clock }) => { const seen = useJust.getState().seen;
    SPOTS.forEach((s, i) => { const m = refs.current[i]; if (!m) return; m.visible = !seen.includes(s.id); const d = Math.hypot(live.x - s.at[0], live.z - s.at[1]);
      m.position.y = s.mark[1] + Math.sin(clock.elapsedTime * 2 + i) * 0.08; m.rotation.y = clock.elapsedTime * 1.2; m.scale.setScalar(d < 25 ? 1 : 0.6); }); });
  return <group userData={{ noCast: true }}>{SPOTS.map((s, i) => <mesh key={s.id} ref={(m) => { refs.current[i] = m; }} position={s.mark} material={mat}><octahedronGeometry args={[0.1, 0]} /></mesh>)}</group>;
}

/* ---------- hareket + kamera ---------- */
function Controller({ stick }: { stick: React.MutableRefObject<{ x: number; y: number }> }) {
  const { camera } = useThree(), nearId = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useJust.getState(), active = S.started && !S.card && !pause.on;
    const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
    let wx = active ? Math.max(-1, Math.min(1, stick.current.x + kx)) : 0, wy = active ? Math.max(-1, Math.min(1, stick.current.y + ky)) : 0;
    const len = Math.hypot(wx, wy); if (len > 1) { wx /= len; wy /= len; }
    const wading = S.phase === 'run' && floodDanger(floodState.level, groundY(live.x, live.z)) === 'wade';
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN : WALK) * Math.min(1, len) * (wading ? 0.75 : 1), y = live.view.yaw, f = -wy, s = wx;
    let dx = 0, dz = 0; if (len > 0.08) { const k = 1 / Math.max(1e-6, Math.hypot(f, s)); dx = (-Math.sin(y) * f + Math.cos(y) * s) * k * sp * dt; dz = (-Math.cos(y) * f - Math.sin(y) * s) * k * sp * dt; }
    const [nx, nz] = slide([live.x, live.z], dx, dz), moved = Math.hypot(nx - live.x, nz - live.z); live.x = nx; live.z = nz; live.speed = dt > 0 ? moved / dt : 0;
    live.step += moved; if (live.step > 0.72) { live.step = 0; audio.step(1000); } live.bob += moved * 2.4;
    const near = S.started ? nearestSpot(live.x, live.z) : null; if ((near?.id ?? '') !== nearId.current) { nearId.current = near?.id ?? ''; S.set({ near }); }
    const ng = S.started && Math.hypot(live.x - GAUGE.c[0], live.z - GAUGE.c[1]) < GAUGE.reach; if (ng !== S.nearGauge) S.set({ nearGauge: ng });
    // taşkın: seviye eğrisi, sürüklenme ve atlatma
    if (S.phase === 'run' && !S.card && !pause.on) { flood.t += dt; const L = floodLevel(flood.t); floodState.level = L;
      if (Math.abs(L - S.level) > 0.05) S.set({ level: L });
      if (floodDanger(L, groundY(live.x, live.z)) === 'swept') { resetFlood(); live.x = GAUGE.c[0] + 2.5; live.z = GAUGE.c[1] + 2; audio.tone(false); toast('Sel seni sürükledi! Su belini geçmeden köprüye çıkmalısın. Ölçekten yeniden başlat.', 'bad', 5000); }
      else if (!S.survived && flood.t >= FLOOD.rise) { S.set({ survived: true, card: FLOOD_CARD }); audio.tone(true); audio.speak(`${FLOOD_CARD.name}. ${FLOOD_CARD.text}`); }
      else if (flood.t >= FLOOD.rise + FLOOD.hold + FLOOD.fall) { floodState.level = 0; S.set({ phase: 'done', level: 0 }); } }
    const gy = groundY(live.x, live.z), sway = live.speed > 0.2 ? Math.sin(live.bob) * 0.035 : 0;
    if (live.fly) applyFp(camera, live.fly[0], live.fly[1], live.fly[2], live.view, 0); else applyFp(camera, live.x, gy + EYE, live.z, live.view, sway);
    easeFov(camera, 66, dt);
  });
  return null;
}

/* ---------- kroki ---------- */
function Kroki({ seen, level }: { seen: string[]; level: number }) {
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((x) => x + 1), 200); return () => clearInterval(id); }, []);
  const W = BOUNDS.x1 - BOUNDS.x0, Hh = BOUNDS.z1 - BOUNDS.z0, sx = (x: number) => x - BOUNDS.x0, sz = (z: number) => z - BOUNDS.z0;
  return (
    <div className="pointer-events-none absolute right-3 top-[68px] z-30 w-44 rounded-xl bg-[#f7f5f1]/92 p-1.5 text-[#1f1b17] ring-1 ring-black/5 backdrop-blur-md sm:top-[72px] sm:w-56" aria-label="Köprü krokisi">
      <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full">
        <rect width={W} height={Hh} rx={6} fill="#c3d09a" opacity={0.75} />
        <rect x={sx(AREA.x0)} y={sz(AREA.z0)} width={AREA.x1 - AREA.x0} height={AREA.z1 - AREA.z0} fill="#d8d6b4" opacity={0.6} />
        <rect x={sx(STREAM.x0)} y={sz(AREA.z0)} width={STREAM.x1 - STREAM.x0} height={AREA.z1 - AREA.z0} fill="#6aa0a8" />
        <rect x={sx(-RAMP_X)} y={sz(-HALF_W)} width={RAMP_X * 2} height={HALF_W * 2} fill="#a89c84" stroke="#5b5146" strokeWidth={0.6} />
        <rect x={sx(-DECK_X)} y={sz(-HALF_W)} width={DECK_X * 2} height={HALF_W * 2} fill="#8f8570" />
        {level > 0.05 && <rect x={sx(AREA.x0)} y={sz(AREA.z0)} width={AREA.x1 - AREA.x0} height={AREA.z1 - AREA.z0} fill="#7a6f4e" opacity={Math.min(0.75, 0.2 + level * 0.15)} />}
        {PIER_X.map((x) => <rect key={x} x={sx(x - PIER_W / 2)} y={sz(-HALF_W - 3.4)} width={PIER_W} height={HALF_W * 2 + 6.8} fill="#5b5146" />)}
        <circle cx={sx(APSE.c[0])} cy={sz(APSE.c[1])} r={APSE.r} fill="#8f8570" />
        <rect x={sx(GAUGE.c[0]) - 1.6} y={sz(GAUGE.c[1]) - 1.6} width={3.2} height={3.2} fill="#b3392b" />
        {SPOTS.map((s) => <circle key={s.id} cx={sx(s.at[0])} cy={sz(s.at[1])} r={3} fill={seen.includes(s.id) ? THEME.accent : '#fff'} stroke={THEME.accent} strokeWidth={1.2} />)}
        <g transform={`translate(${sx(live.x)} ${sz(live.z)}) rotate(${(-live.view.yaw * 180) / Math.PI})`}><path d="M0,-5 L3.6,3.6 L0,1.8 L-3.6,3.6 Z" fill="#1f1b17" stroke="#fff" strokeWidth={0.7} /></g>
      </svg>
      <p className="px-1 pb-0.5 text-[11px] font-semibold text-[#4a433c]">Kroki · {seen.length}/{SPOTS.length} bulundu{level > 0.05 ? ` · su ${level.toFixed(1).replace('.', ',')} m` : ''}</p>
    </div>
  );
}
