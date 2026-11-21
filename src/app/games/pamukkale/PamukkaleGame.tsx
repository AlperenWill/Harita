/**
 * Pamukkale & Hierapolis — "Beyaz Basamaklar". Ana yönetici.
 *
 * Köyün altından traverten yolunu ÇIPLAK AYAKLA yukarı tırman (gerçekte travertenlerde ayakkabıyla yürünmez). Yamaçta kurumuş,
 * kararmış beş havuz var: yanına gelince suyu o havuza yönlendir; havuz dolar ve yeniden beyazlar (gerçekte su havuzlara sırayla
 * verilir). Platoya çıkınca Hierapolis: Antik Havuz (dibinde sütunlar), tiyatro ve nekropol.
 * KAMERA: birinci şahıs, rotaya kilitli (W/S ya da dikey sürükleme), bakış serbest (Efes ve Zil Kale ile aynı şema).
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__pamuk), tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Controls, GameMenu, Hint, HudTheme, InfoSheet, InteractPrompt, StartSheet, EndSheet, TopRow, Objective } from '../shared/hud/Hud';
import { useSettings } from '../shared/hud/settings';
import { Info, MousePointer2 } from 'lucide-react';
import { ArrowLeft, Droplets, Footprints, Search } from 'lucide-react';
import { DRY, PLATEAU, poolY, ROUTE_LEN, SLOPE_Z0, SLOPE_Z1, SPOTS, heightAt, isTravertine, nearDry, nearSpot, routeAt, whiteness, type Pool, type Spot } from './terraces';
import { speakTr } from '../shared/voice';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';
import { normalFrom } from '../topkapi/kit';
import { Polish, SkyEnvironment } from '../shared/Polish';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
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
const live = { s: 0, v: 0, input: 0, yaw: 0, pitch: 0.12, fill: {} as Record<string, number> };

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
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current; const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb;
      void dt; raf = requestAnimationFrame(loop); };   // kamera klavyeyle çevrilmez: fareyle (imleç kilidi) ya da sürüklemeyle bakılır
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close, pour, inspect]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __pamuk: unknown }).__pamuk = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, pour, state: () => ({ ...useDb.getState(), s: live.s }), DRY, SPOTS, ROUTE_LEN }; }, [pour]);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); look.lock(e); if (!useDb.getState().started) return; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; live.yaw += (e.clientX - d.x) * 0.005; if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + (e.clientY - d.y) * 0.004, -1, 0.9); else live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); d.x = e.clientX; d.y = e.clientY; };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } };
  const done = S.filled.length === DRY.length && S.seen.length === SPOTS.length;

  const nextP = DRY.find((p) => !S.filled.includes(p.id));
  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dbeef3] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <HudTheme theme={THEME}>
      <LookCrosshair locked={look.locked} />
      <Canvas dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 1200, position: [30, 30, 190] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.72; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky={'#d6ecf3'} sun={'#fff6e6'} ground={'#f2f0ea'} sunDir={[0.7, 0.6, 0.5]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopRow onExit={onExit} objective={S.started ? <Objective icon={<Droplets size={15} />} label={nextP ? 'Kuru havuzlara suyu yönlendir' : 'Bütün havuzlar dolu'} done={S.filled.length} total={DRY.length} /> : undefined} right={<GameMenu onPause={(v) => { pause.on = v; }} help={<Controls items={CONTROLS} />} onExit={onExit} />} />
      {S.started && !S.card && S.near && <InteractPrompt icon={<Droplets size={18} />} label="Suyu bu havuza yönlendir" onClick={pour} />}
      {S.started && !S.card && !S.near && S.spot && <InteractPrompt icon={<Search size={18} />} label={`İncele: ${S.spot.name}`} onClick={inspect} muted={S.seen.includes(S.spot.id)} />}
      {S.started && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak<span className="hidden [@media(pointer:fine)]:inline"> · W/S · tıkla, fareyle bak (Esc: bırak) · E: suyu aç</span></Hint>}
      {S.card && <Card s={S.card} onClose={close} />}
      {!S.started && <TitleCard onExit={onExit} onStart={() => { audio.unlock(); S.set({ started: true }); }} />}
      {S.started && done && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
      </HudTheme>
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  return (
    <group>
      <Sky sunPosition={[200, 120, 160]} turbidity={5} rayleigh={1.1} />
      <fog attach="fog" args={['#cfe2ec', 220, 900]} />
      <hemisphereLight args={['#f4fbff', '#c9c0a8', 0.75]} />
      <directionalLight position={[200, 160, 160]} intensity={1.35} color="#fff6e6" />
      <Terrain tier={tier} />
      <Pools tier={tier} />
      <DryPools />
      <AntiquePool />
      <Theatre />
      <Necropolis n={tier === 'low' ? 40 : 90} />
      <Controller />
    </group>
  );
}
function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 260 : tier === 'medium' ? 200 : 140, g = new THREE.PlaneGeometry(500, 520, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, -20);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), white = new THREE.Color('#f7f8f6'), cream = new THREE.Color('#d6c9ad'), green = new THREE.Color('#8fa064'), dry = new THREE.Color('#c8b98f'), r = rng(7);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = heightAt(x, z); if (Math.abs(x) > 84 && z > SLOPE_Z0) y += (Math.abs(x) - 84) * 0.25; if (z > SLOPE_Z1) y -= (z - SLOPE_Z1) * 0.02; p.setY(i, y);
      if (isTravertine(x, z)) c.copy(white).lerp(cream, 0.2 + 0.35 * Math.abs(Math.sin(x * 0.07 + z * 0.11) * Math.cos(z * 0.05)) + r() * 0.15); /* krem lekeler: beyaz yamaç gökyüzü/sisle karışmasın */ else c.copy(z < SLOPE_Z0 ? dry : green).lerp(dry, r() * 0.3); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={0.55} /></mesh>;
}
/** Rotanın verilen z'deki x'i (havuzları yoldan uzak tutmak için) */
function routeX(z: number) { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 2) { const p = routeAt(s).p; const d = Math.abs(p[2] - z); if (d < bd) { bd = d; best = p[0]; } } return best; }
/** Traverten duvar dokusu: aşağı sarkan damla izleri ve saçaklar (kalsiyum karbonat birikimi) + normal haritası */
let DRIP: { map: THREE.Texture; normal: THREE.Texture } | null = null;
function dripTex() {
  if (DRIP) return DRIP; const n = 256, mk = () => { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')!] as const; }, [c, g] = mk(), [h, hg] = mk(), r = rng(29);
  g.fillStyle = '#f6f5f0'; g.fillRect(0, 0, n, n); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 140; i++) { const x = r() * n, w = 2 + r() * 7, len = 40 + r() * 200, y0 = r() * 40; const gr = g.createLinearGradient(0, y0, 0, y0 + len); gr.addColorStop(0, 'rgba(225,220,205,.0)'); gr.addColorStop(0.5, `rgba(214,206,186,${0.25 + r() * 0.3})`); gr.addColorStop(1, 'rgba(240,238,230,0)'); g.fillStyle = gr; g.fillRect(x, y0, w, len);
    hg.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`; hg.fillRect(x, y0, w, len); hg.fillStyle = 'rgba(0,0,0,.25)'; hg.fillRect(x + w, y0, 1, len); }
  for (let i = 0; i < 60; i++) { const y = r() * 30; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, y, n, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1);
  const nm = normalFrom(h, 2.5); nm.repeat.set(4, 1); DRIP = { map: t, normal: nm }; return DRIP;
}
/** Yamaca oturan havuzlar: beyaz traverten gövde (yokuş aşağı yanı kenar duvar olarak görünür) + turkuaz su yüzeyi (instanced) */
function Pools({ tier }: { tier: Tier }) {
  const body = useRef<THREE.InstancedMesh>(null), water = useRef<THREE.InstancedMesh>(null), N = tier === 'low' ? 260 : 520;
  useEffect(() => { const r = rng(13), o = new THREE.Object3D(); let k = 0;
    for (let z = SLOPE_Z0 + 3; z < SLOPE_Z1 - 2 && k < N; z += 3.6 + r() * 1.2) { const rx = routeX(z);
      for (let x = -62 + r() * 5; x < 62 && k < N; x += 5 + r() * 4) { const rr = 2.2 + r() * 2; if (DRY.some((d) => Math.hypot(d.at[0] - x, d.at[1] - z) < d.r + rr)) continue; if (Math.abs(x - rx) < rr + 1.4) continue;   // yürüme yolu açık
        const zz = z + (r() - 0.5) * 1.5, y = poolY(x, zz), sx = rr, sz = rr * (0.6 + r() * 0.25);
        o.position.set(x, y - 0.8, zz); o.rotation.set(0, (r() - 0.5) * 0.4, 0); o.scale.set(sx, 1.6, sz); o.updateMatrix(); body.current?.setMatrixAt(k, o.matrix);
        o.position.set(x, y + 0.01, zz); o.scale.set(sx * 0.9, 1, sz * 0.86); o.updateMatrix(); water.current?.setMatrixAt(k, o.matrix); k++; } }
    for (const m of [body.current, water.current]) if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [N]);
  const disc = useMemo(() => { const g = new THREE.CircleGeometry(1, 22); g.rotateX(-Math.PI / 2); return g; }, []);
  return (<>
    <instancedMesh ref={body} args={[undefined, undefined, N]}><cylinderGeometry args={[1, 1.06, 1, 22]} /><meshStandardMaterial map={dripTex().map} normalMap={dripTex().normal} roughness={0.45} /></instancedMesh>
    <instancedMesh ref={water} args={[disc, undefined, N]}><meshStandardMaterial color={WATER} roughness={0.02} metalness={0.2} envMapIntensity={1.4} emissive="#2a8a96" emissiveIntensity={0.15} /></instancedMesh>
  </>);
}
/** Kurumuş havuzlar: lekeli kahverengi-gri; su verilince dolar ve beyazlar */
function DryPools() {
  const refs = useRef<{ water: THREE.Mesh | null; bed: THREE.MeshStandardMaterial; rim: THREE.MeshStandardMaterial; marker: THREE.Mesh | null }[]>(DRY.map(() => ({ water: null, bed: new THREE.MeshStandardMaterial({ color: '#a8977a', roughness: 0.9 }), rim: new THREE.MeshStandardMaterial({ color: '#b3a588', roughness: 0.8 }), marker: null })));
  const stain = new THREE.Color('#8f7d60'), white = new THREE.Color('#f7f7f3');
  useFrame(({ clock }, raw) => { const dt = Math.min(raw, 0.05), S = useDb.getState(); let flowing = 0;
    DRY.forEach((p, i) => { const want = S.filled.includes(p.id) ? 1 : 0, f = (live.fill[p.id] = (live.fill[p.id] ?? 0) + Math.sign(want - (live.fill[p.id] ?? 0)) * Math.min(Math.abs(want - (live.fill[p.id] ?? 0)), dt / 4)); if (f > 0 && f < 1) flowing = 1;
      const R = refs.current[i], w = whiteness(f) - 0.55; R.bed.color.copy(stain).lerp(white, w / 0.45); R.rim.color.copy(stain).lerp(white, Math.min(1, w / 0.45 + 0.15));
      if (R.water) { R.water.position.y = -0.25 + 0.27 * f; R.water.visible = f > 0.01; }   // su seviyesi yükselir
      if (R.marker) { R.marker.visible = !S.filled.includes(p.id); R.marker.position.y = 3 + Math.sin(clock.elapsedTime * 2 + i) * 0.25; } });
    audio.setWater(flowing ? 0.25 : live.s < 140 ? 0.08 : 0.02); });
  return (<>{DRY.map((p, i) => { const y = poolY(p.at[0], p.at[1]); return (
    <group key={p.id} position={[p.at[0], y, p.at[1]]}>
      <mesh position={[0, -0.8, 0]} scale={[p.r, 1.6, p.r * 0.8]} material={refs.current[i].rim}><cylinderGeometry args={[1, 1.06, 1, 26]} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.25, 0]} scale={[1, 0.8, 1]} material={refs.current[i].bed}><circleGeometry args={[p.r * 0.9, 26]} /></mesh>
      <mesh ref={(m) => { refs.current[i].water = m; }} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} scale={[1, 0.8, 1]}><circleGeometry args={[p.r * 0.9, 26]} /><meshStandardMaterial color={WATER} roughness={0.05} emissive="#2a8a96" emissiveIntensity={0.2} /></mesh>
      <mesh ref={(m) => { refs.current[i].marker = m; }} position={[0, 3, 0]}><octahedronGeometry args={[0.4, 0]} /><meshBasicMaterial color="#29b6c8" /></mesh>
    </group>); })}</>);
}
/** Antik Havuz: sıcak su, dibinde devrik sütun parçaları */
function AntiquePool() {
  const ref = useRef<THREE.InstancedMesh>(null), N = 14, c = SPOTS.find((s) => s.id === 'antik-havuz')!.at;
  useEffect(() => { const r = rng(31), o = new THREE.Object3D(); for (let i = 0; i < N; i++) { o.position.set(c[0] - 9 + r() * 18, PLATEAU - 1.1, c[1] - 6 - r() * 9); o.rotation.set(Math.PI / 2, 0, r() * 3); o.scale.set(1, 2 + r() * 3, 1); o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix); } if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [c]);
  return (<group>
    <mesh position={[c[0], PLATEAU - 0.9, c[1] - 10]}><boxGeometry args={[24, 1.8, 16]} /><meshStandardMaterial color="#cfc7b3" roughness={0.8} side={THREE.BackSide} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[c[0], PLATEAU - 0.25, c[1] - 10]}><planeGeometry args={[23.6, 15.6]} /><meshStandardMaterial color="#6fc3cf" roughness={0.05} transparent opacity={0.7} /></mesh>
    <instancedMesh ref={ref} args={[undefined, undefined, N]}><cylinderGeometry args={[0.38, 0.42, 1, 10]} /><meshStandardMaterial color="#e9e3d6" roughness={0.6} /></instancedMesh>
  </group>);
}
function Theatre() {
  const at = SPOTS.find((s) => s.id === 'tiyatro')!.at, cx = at[0] + 40, cz = at[1] - 6;
  const geo = useMemo(() => { const pts: THREE.Vector2[] = [new THREE.Vector2(8, 0)]; for (let i = 0; i < 22; i++) { pts.push(new THREE.Vector2(8 + i * 1.3, (i + 1) * 0.75)); pts.push(new THREE.Vector2(8 + (i + 1) * 1.3, (i + 1) * 0.75)); } pts.push(new THREE.Vector2(8 + 22 * 1.3, -0.1)); return new THREE.LatheGeometry(pts, 36, 0, Math.PI); }, []);
  return (<group position={[cx, PLATEAU, cz]}>
    <mesh geometry={geo}><meshStandardMaterial color="#ddd3bd" roughness={0.85} flatShading /></mesh>
    <mesh position={[-10, 3.5, 0]}><boxGeometry args={[3, 7, 30]} /><meshStandardMaterial color="#d6cbb3" roughness={0.85} /></mesh>
  </group>);
}
/** Nekropol: lahitler (kapaklı) ve tümülüsler */
function Necropolis({ n }: { n: number }) {
  const box = useRef<THREE.InstancedMesh>(null), lid = useRef<THREE.InstancedMesh>(null), c = SPOTS.find((s) => s.id === 'nekropol')!.at;
  useEffect(() => { const r = rng(41), o = new THREE.Object3D(); for (let i = 0; i < n; i++) { const a = r() * 6.28, d = 6 + r() * 45, x = c[0] + Math.cos(a) * d, z = c[1] - 8 + Math.sin(a) * d, y = PLATEAU, yaw = r() * 0.6 - 0.3 + (r() < 0.5 ? 0 : Math.PI / 2);
      o.position.set(x, y + 0.6, z); o.rotation.set(0, yaw, 0); o.scale.set(1, 1, 1); o.updateMatrix(); box.current?.setMatrixAt(i, o.matrix); o.position.y = y + 1.45; o.rotation.set(r() < 0.25 ? 0.4 : 0, yaw, 0); o.updateMatrix(); lid.current?.setMatrixAt(i, o.matrix); }
    for (const m of [box.current, lid.current]) if (m) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [n, c]);
  return (<group>
    <instancedMesh ref={box} args={[undefined, undefined, n]}><boxGeometry args={[2.4, 1.2, 1.1]} /><meshStandardMaterial color="#d9d0bc" roughness={0.85} /></instancedMesh>
    <instancedMesh ref={lid} args={[undefined, undefined, n]}><cylinderGeometry args={[0.7, 0.7, 2.5, 3]} /><meshStandardMaterial color="#cfc5ae" roughness={0.85} flatShading /></instancedMesh>
    {[[-25, -12], [18, -30], [-8, -48]].map(([dx, dz], i) => <mesh key={i} position={[c[0] + dx, PLATEAU, c[1] + dz]} scale={[1, 0.45, 1]}><sphereGeometry args={[6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#a6a27a" roughness={1} /></mesh>)}
  </group>);
}

/* ---------- hareket + kamera ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Controller() {
  const { camera } = useThree(), st = useRef({ step: 0, bob: 0, grade: 0, head: NaN, near: '', spot: '' });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    const back = Math.cos(live.yaw) < 0 ? -1 : 1, want = S.started && !S.card && !pause.on ? live.input * WALK * back : 0;
    live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
    const before = live.s; live.s = Math.max(0, Math.min(ROUTE_LEN, live.s + live.v * dt)); const moved = live.s - before, R = routeAt(live.s);
    st.current.step += Math.abs(moved); if (st.current.step > 0.75) { st.current.step = 0; audio.step(R.barefoot); } st.current.bob += Math.abs(moved) * 2.2;
    const np = S.started ? nearDry(live.s, S.filled) : null; if ((np?.id ?? '') !== st.current.near) { st.current.near = np?.id ?? ''; S.set({ near: np }); }
    const sp = S.started ? nearSpot(live.s) : null; if ((sp?.id ?? '') !== st.current.spot) { st.current.spot = sp?.id ?? ''; S.set({ spot: sp }); }   // kart kendiliğinden açılmaz: "İncele" (E)
    const hd = Math.atan2(-R.dir[0], -R.dir[1]); if (Number.isNaN(st.current.head)) st.current.head = hd; st.current.head += wrapA(hd - st.current.head) * (1 - Math.exp(-dt * 3));
    const grade = (routeAt(live.s + 3).p[1] - routeAt(live.s - 3).p[1]) / 6; st.current.grade += (Math.atan(grade) * 0.5 - st.current.grade) * (1 - Math.exp(-dt * 2));
    if (!S.started) { camera.position.set(40, 22, 175); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 38, 40), THREE.Object3D.DEFAULT_UP))); return; }
    _e.set(live.pitch + st.current.grade - 0.12, st.current.head + live.yaw, 0); camera.quaternion.setFromEuler(_e);
    camera.position.set(R.p[0], R.p[1] + EYE + Math.sin(st.current.bob) * 0.03 * Math.min(1, Math.abs(live.v) / 2), R.p[2]);
  });
  return null;
}

/* ---------- arayüz ---------- */
function Card({ s, onClose }: { s: Spot; onClose: () => void }) {
  return <InfoSheet kicker={`Pamukkale · Hierapolis`} title={s.name} text={s.text} source={s.source} onClose={onClose} />;
}
const THEME = { accent: '#2a9bb0' };
const CONTROLS = [
  { icon: <Footprints size={16} />, text: <>Dikey sürükle ya da W/S: ileri/geri</> },
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
