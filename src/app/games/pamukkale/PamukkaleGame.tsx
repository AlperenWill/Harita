/**
 * Pamukkale & Hierapolis — "Beyaz Basamaklar". Ana yönetici.
 *
 * Köyün altından traverten yolunu ÇIPLAK AYAKLA yukarı tırman (gerçekte travertenlerde ayakkabıyla yürünmez). Yamaçta kurumuş,
 * kararmış beş havuz var: yanına gelince suyu o havuza yönlendir; havuz dolar ve yeniden beyazlar (gerçekte su havuzlara sırayla
 * verilir). Platoya çıkınca Hierapolis: Antik Havuz (dibinde sütunlar), tiyatro ve nekropol.
 * KAMERA: birinci şahıs, rotaya kilitli (W/S ya da dikey sürükleme), bakış serbest (Efes ve Zil Kale ile aynı şema).
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__pamuk), tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 */
import { freePos, walkFree } from '../shared/route';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Controls, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { Info, MousePointer2 } from 'lucide-react';
import { ArrowLeft, Droplets, Footprints, Search } from 'lucide-react';
import { DRY, ROUTE_LEN, SPOTS, nearDry, nearSpot, routeAt, whiteness, type Pool, type Spot } from './terraces';
import { speakTr } from '../shared/voice';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';
import { Sun, Clouds } from '../shared/scenery';
import { AntiquePool, FrontinusGate, Grass, Mountains, Necropolis, Ruins, SUN_DIR, Terrain, Theatre, Travertines, Trees, Village, patchGeo, travertine, useMats } from './PamukkaleModels';
import { Polish, SkyEnvironment } from '../shared/Polish';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
const WALK = 3.2, EYE = 1.6, WATER = '#7fd3dc';

/* ---------- ses: akan su, çıplak ayak (ıslak) / taş adım, havuz dolarken şırıltı ---------- */
class PamukAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null; private water: GainNode | null = null; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; } const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8; this.water = ctx.createGain(); this.water.gain.value = 0; s.connect(f).connect(this.water).connect(this.master); s.start();
  }
  setWater(v: number) { if (this.ctx && this.water) this.water.gain.setTargetAtTime(v, this.ctx.currentTime, 0.4); }
  step(wet: boolean) { const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = wet ? 'bandpass' : 'highpass'; f.frequency.value = wet ? 900 : 1500; g.gain.setValueAtTime(wet ? 0.3 : 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + (wet ? 0.16 : 0.07)); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.2); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2); }
  speak(t: string) { if (!this.muted) speakTr(t); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.water = null; }
}
const audio = new PamukAudio();

/* ---------- durum ---------- */
interface S { started: boolean; filled: string[]; seen: string[]; card: Spot | null; near: Pool | null; spot: Spot | null; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, filled: [] as string[], seen: [] as string[], card: null, near: null, spot: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const pause = { on: false };   // ≡ menü açıkken oyun durur
const live = { s: 0, v: 0, input: 0, o: 0, strafe: 0, yaw: 0, pitch: 0.12, fill: {} as Record<string, number> };

export default function PamukkaleGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  const look = useMouseLook((dx, dy) => { live.yaw -= dx * LOOK_YAW; live.pitch = THREE.MathUtils.clamp(live.pitch - dy * LOOK_PITCH, -1, 0.9); }, () => { const s = useDb.getState(); return s.started && !s.card; });
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y0: number; y: number; mouse: boolean } | null>(null);
  const G = useSettings(); useEffect(() => { audio.setMuted(G.muted); }, [G.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { s: 0, v: 0, input: 0, yaw: 0, pitch: 0.12, fill: {} }); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const inspect = useCallback(() => { const s = useDb.getState(), sp = s.spot; if (!sp) return; s.set({ card: sp, seen: s.seen.includes(sp.id) ? s.seen : [...s.seen, sp.id] }); if (useSettings.getState().tts) audio.speak(`${sp.name}. ${sp.text}`); }, []);
  const pour = useCallback(() => { const s = useDb.getState(), p = s.near; if (!p || s.filled.includes(p.id)) return; s.set({ filled: [...s.filled, p.id], near: null }); if (useSettings.getState().tts) audio.speak(s.filled.length === 0 ? 'Su havuza akıyor. Kalsiyum karbonat yeniden çökelecek ve havuz zamanla beyazlayacak.' : 'Bir havuz daha doldu.'); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const s = useDb.getState(); if (!s.started || e.repeat) return; if (e.code === 'KeyE') { if (s.card) close(); else if (s.near) pour(); else inspect(); } if (e.code === 'Escape' && s.card) close(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current; const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb; live.strafe = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      void dt; raf = requestAnimationFrame(loop); };   // kamera klavyeyle çevrilmez: fareyle (imleç kilidi) ya da sürüklemeyle bakılır
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close, pour, inspect]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __pamuk: unknown }).__pamuk = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, pour, state: () => ({ ...useDb.getState(), s: live.s }), DRY, SPOTS, ROUTE_LEN }; }, [pour]);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); look.lock(e); if (!useDb.getState().started) return; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId || d.mouse) return; live.yaw += (e.clientX - d.x) * 0.005; if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + (e.clientY - d.y) * 0.004, -1, 0.9); else live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); d.x = e.clientX; d.y = e.clientY; };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } };
  const done = S.filled.length === DRY.length && S.seen.length === SPOTS.length;

  const nextP = DRY.find((p) => !S.filled.includes(p.id));
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dbeef3] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <HudTheme theme={THEME}>
      <LookCrosshair locked={look.locked} />
      <Canvas shadows={tier !== 'low' ? 'soft' : false} dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 1200, position: [30, 30, 190] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.72; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky={'#d6ecf3'} sun={'#fff6e6'} ground={'#f2f0ea'} sunDir={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopRow onExit={onExit} objective={S.started ? <Objective icon={<Droplets size={15} />} label={nextP ? 'Kuru havuzlara suyu yönlendir' : done ? 'Hepsi tamam' : 'Hierapolis: yapıları incele (E)'} done={nextP ? S.filled.length : S.seen.length} total={nextP ? DRY.length : SPOTS.length} /> : undefined} right={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onExit={onExit} />} />
      {S.started && !S.card && S.near && <InteractPrompt icon={<Droplets size={18} />} label="Suyu bu havuza yönlendir" onClick={pour} />}
      {S.started && !S.card && !S.near && S.spot && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.spot.name}`} onClick={inspect} muted={S.seen.includes(S.spot.id)} />}
      {S.started && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak<span className="hidden [@media(pointer:fine)]:inline"> · WASD · fareyle sürükle: bak · E: suyu aç</span></Hint>}
      {S.card && <Card s={S.card} onClose={close} />}
      {!S.started && <TitleCard onExit={onExit} onStart={() => { audio.unlock(); S.set({ started: true }); }} />}
      {S.started && done && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const m = useMats(), g = useRef<THREE.Group>(null);
  const { scene } = useThree(); useEffect(() => { scene.environmentIntensity = 0.35; }, [scene]);
  // gölge: noCast işaretli gruplar (arazi, traverten, ot, dağlar) gölge düşürmez; her şey gölge alır
  useEffect(() => { g.current?.traverse((o) => { const mesh = o as THREE.Mesh; if (!mesh.isMesh) return; let cast = true; for (let q: THREE.Object3D | null = o; q; q = q.parent) if (q.userData.noCast) { cast = false; break; } mesh.castShadow = cast; mesh.receiveShadow = true; }); }, [tier]);
  const sky = SUN_DIR.clone().multiplyScalar(1000), low = tier === 'low';
  return (
    <group ref={g}>
      <group userData={{ noCast: true }}><Sky sunPosition={[sky.x, sky.y, sky.z]} turbidity={3.2} rayleigh={1.4} mieCoefficient={0.005} mieDirectionalG={0.85} /></group>
      <fog attach="fog" args={['#d8e6ee', 300, 1900]} />
      <hemisphereLight args={['#dfeaf3', '#a89c80', 0.45]} />
      <Sun tier={tier} dir={SUN_DIR} intensity={5.2} color="#fff0dc" />
      {!low && <Clouds />}
      <Terrain tier={tier} />
      <Mountains />
      <Travertines tier={tier} />
      <DryPools />
      <Grass n={low ? 2500 : tier === 'medium' ? 6000 : 11000} />
      <Trees n={low ? 120 : 260} />
      <Village n={low ? 40 : 80} />
      <AntiquePool m={m} />
      <Theatre m={m} />
      <FrontinusGate m={m} />
      <Necropolis n={low ? 50 : 110} m={m} />
      <Ruins m={m} n={low ? 30 : 70} />
      <Controller />
    </group>
  );
}
/** Kurumuş havuzlar: kahverengi-gri leke; su verilince dolar ve yüzey beyazlar */
function DryPools() {
  const geos = useMemo(() => DRY.map((p) => ({ bed: patchGeo(p.at[0], p.at[1], p.r, false), water: patchGeo(p.at[0], p.at[1], p.r * 0.92, true), y: travertine(p.at[0], p.at[1]).y })), []);
  const refs = useRef<{ water: THREE.Mesh | null; bed: THREE.MeshStandardMaterial; marker: THREE.Mesh | null }[]>(DRY.map(() => ({ water: null, bed: new THREE.MeshStandardMaterial({ color: '#a8977a', roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }), marker: null })));
  const stain = new THREE.Color('#8f7d60'), white = new THREE.Color('#f7f7f3');
  useFrame(({ clock }, raw) => { const dt = Math.min(raw, 0.05), S = useDb.getState(); let flowing = 0;
    DRY.forEach((p, i) => { const want = S.filled.includes(p.id) ? 1 : 0, f = (live.fill[p.id] = (live.fill[p.id] ?? 0) + Math.sign(want - (live.fill[p.id] ?? 0)) * Math.min(Math.abs(want - (live.fill[p.id] ?? 0)), dt / 4)); if (f > 0 && f < 1) flowing = 1;
      const R = refs.current[i], w = whiteness(f) - 0.55; R.bed.color.copy(stain).lerp(white, w / 0.45);
      if (R.water) { R.water.position.y = -0.3 + 0.3 * f; R.water.visible = f > 0.01; }   // su seviyesi yükselir
      if (R.marker) { R.marker.visible = !S.filled.includes(p.id); R.marker.position.y = geos[i].y + 3 + Math.sin(clock.elapsedTime * 2 + i) * 0.25; } });
    audio.setWater(flowing ? 0.25 : live.s < 140 ? 0.08 : 0.02); });
  return (<group userData={{ noCast: true }}>{DRY.map((p, i) => (
    <group key={p.id} position={[p.at[0], 0, p.at[1]]}>
      <mesh geometry={geos[i].bed} material={refs.current[i].bed} receiveShadow />
      <mesh ref={(mm) => { refs.current[i].water = mm; }} geometry={geos[i].water}><meshStandardMaterial color={WATER} roughness={0.04} metalness={0.15} transparent opacity={0.85} envMapIntensity={1.4} /></mesh>
      <mesh ref={(mm) => { refs.current[i].marker = mm; }} position={[0, geos[i].y + 3, 0]}><octahedronGeometry args={[0.4, 0]} /><meshBasicMaterial color="#29b6c8" /></mesh>
    </group>))}</group>);
}

/* ---------- hareket + kamera ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
function Controller() {
  const { camera } = useThree(), st = useRef({ step: 0, bob: 0, grade: 0, head: NaN, near: '', spot: '' });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    const moved = walkFree(live, st.current, routeAt, ROUTE_LEN, dt, WALK, 2, S.started && !S.card && !pause.on), R = routeAt(live.s), P = freePos(routeAt, live.s, live.o);
    st.current.step += Math.abs(moved); if (st.current.step > 0.75) { st.current.step = 0; audio.step(R.barefoot); } st.current.bob += Math.abs(moved) * 2.2;
    const np = S.started ? nearDry(live.s, S.filled) : null; if ((np?.id ?? '') !== st.current.near) { st.current.near = np?.id ?? ''; S.set({ near: np }); }
    const sp = S.started ? nearSpot(live.s) : null; if ((sp?.id ?? '') !== st.current.spot) { st.current.spot = sp?.id ?? ''; S.set({ spot: sp }); }   // kart kendiliğinden açılmaz: "İncele" (E)
    
    const grade = (routeAt(live.s + 3).p[1] - routeAt(live.s - 3).p[1]) / 6; st.current.grade += (Math.atan(grade) * 0.5 - st.current.grade) * (1 - Math.exp(-dt * 2));
    if (!S.started) { camera.position.set(40, 22, 175); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 38, 40), THREE.Object3D.DEFAULT_UP))); return; }
    _e.set(live.pitch + st.current.grade - 0.12, st.current.head + live.yaw, 0); camera.quaternion.setFromEuler(_e);
    camera.position.set(P[0], P[1] + EYE + Math.sin(st.current.bob) * 0.03 * Math.min(1, Math.abs(live.v) / 2), P[2]);
  });
  return null;
}

/* ---------- arayüz ---------- */
function Card({ s, onClose }: { s: Spot; onClose: () => void }) {
  return <InfoSheet kicker={`Pamukkale · Hierapolis`} title={s.name} text={s.text} source={s.source} onClose={onClose} />;
}
const THEME = { accent: '#2a9bb0' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Dikey sürükle ya da WASD: bakılan yöne yürü (yolun çevresinde serbest)</> },
  { icon: <MousePointer2 size={16} />, text: <>yatay sürükle ya da fare: etrafa bak</> },
  { icon: <Info size={16} />, text: <>kuru havuzun yanında <b>E</b>: suyu yönlendir · yapıların yanında <b>E</b>: incele</> },
];
function TitleCard({ onStart, onExit }: { onStart: () => void; onExit?: () => void }) {
  return <StartSheet kicker="Denizli · UNESCO Dünya Mirası" title="Pamukkale: Beyaz Basamaklar" intro={<>Ayakkabılarını çıkar: travertenlerde çıplak ayakla yürünür. Yukarı tırmanırken kurumuş, kararmış beş havuza suyu yönlendir; havuzlar dolup yeniden beyazlasın. Tepede Hierapolis seni bekliyor.</>} controls={CONTROLS} note="Plan stilizedir, mesafeler kısaltılmıştır. Havuzların dolup beyazlaması hızlandırılmıştır; gerçekte uzun zaman alır." cta="Ayakkabılarını çıkar, başla" ctaIcon={<Footprints size={18} />} onStart={onStart} onExit={onExit} />;
}
function EndCard({ onStay, onExit, onRestart }: { onStay: () => void; onExit: () => void; onRestart?: () => void }) {
  return <EndSheet kicker="Beş havuz yeniden dolu" title="Pamukkale beyaz kaldı" text="Suyu havuzlara sırayla vermek travertenlerin beyaz kalmasını sağlar. Hierapolis’in havuzunu, tiyatrosunu ve nekropolünü de gördün." stayLabel="Gezmeye devam" onStay={onStay} onExit={onExit} onRestart={onRestart} />;
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Pamukkale').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const s = SPOTS[i];
  return (
    <div className="fixed inset-0 bg-[#16343a] text-white">
      {img && <img src={img} alt="Pamukkale" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{s.name}</h2><p className="mt-1 text-sm">{s.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => audio.speak(s.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % SPOTS.length)} className="h-10 rounded-lg bg-cyan-300 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
