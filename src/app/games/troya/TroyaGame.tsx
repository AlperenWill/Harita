/**
 * Troya — "Dokuz Kent". Ana yönetici.
 *
 * Ören yerinin ziyaretçi yolunda yürü: girişteki tahta at (modern kopya) → Troya VI surları → Troya II megaronları ve rampası →
 * Schliemann yarması (duvarlarında üst üste binen kentlerin renkli bantları) → Athena Tapınağı (Troya VIII) → Odeon (Troya IX).
 * BİLMECE: her yapının yanında “Bu yapı hangi katmana ait?” sorusu; doğru katmanı seçince kart açılır, katman cetvelinde işaretlenir.
 * KAMERA: birinci şahıs, rotaya kilitli (W/S ya da dikey sürükleme), bakış serbest (Efes, Pamukkale ile aynı şema).
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__troya), tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { ArrowLeft, Captions, CaptionsOff, ExternalLink, Layers, Pickaxe, Volume2, VolumeX, X } from 'lucide-react';
import { LAYERS, ROUTE_LEN, STOPS, TRENCH, MOUND, heightAt, isCorrect, nearStop, routeAt, type Stop } from './site';
import { speakTr } from '../shared/voice';
import { LOOK_PITCH, LOOK_YAW, LookCrosshair, useMouseLook } from '../shared/mouseLook';
import { Polish, SkyEnvironment } from '../shared/Polish';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const WALK = 3.4, EYE = 1.65;

/* ---------- ses: rüzgâr (Çanakkale rüzgârı), toprak adım, doğru/yanlış tını ---------- */
class TroyaAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private noise: AudioBuffer | null = null; muted = false;
  unlock() { if (this.ctx) { void this.ctx.resume(); return; } const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, n, ctx.sampleRate); const d = this.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7; const g = ctx.createGain(); g.gain.value = 0.09; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = 0.05; lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(this.master); s.start(); lfo.start(); }
  step() { const ctx = this.ctx; if (!ctx || !this.noise || !this.master || this.muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = this.noise; const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 700; g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.12); }
  tone(ok: boolean) { const ctx = this.ctx; if (!ctx || !this.master || this.muted) return; const t = ctx.currentTime; (ok ? [523.3, 659.3, 784] : [220, 185]).forEach((fr, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = ok ? 'triangle' : 'sine'; o.frequency.value = fr; g.gain.setValueAtTime(0, t + i * 0.1); g.gain.linearRampToValueAtTime(0.08, t + i * 0.1 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + (ok ? 1.2 : 0.4)); o.connect(g).connect(this.master!); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 1.3); }); }
  setMuted(m: boolean) { this.muted = m; if (m) this.hush(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2); }
  speak(t: string) { if (!this.muted) speakTr(t); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; }
}
const audio = new TroyaAudio();

/* ---------- durum ---------- */
interface S { started: boolean; solved: string[]; quiz: Stop | null; wrong: string | null; card: Stop | null; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, solved: [] as string[], quiz: null, wrong: null, card: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const live = { s: 0, v: 0, input: 0, yaw: 0, pitch: 0 };

export default function TroyaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  const look = useMouseLook((dx, dy) => { live.yaw -= dx * LOOK_YAW; live.pitch = THREE.MathUtils.clamp(live.pitch - dy * LOOK_PITCH, -1, 0.9); }, () => { const s = useDb.getState(); return s.started && !s.card && !s.quiz; });
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y0: number; y: number; mouse: boolean } | null>(null);
  useEffect(() => { audio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { s: 0, v: 0, input: 0, yaw: 0, pitch: 0 }); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const answer = useCallback((pick: string) => { const s = useDb.getState(), q = s.quiz; if (!q) return;
    if (isCorrect(q, pick)) { audio.tone(true); s.set({ quiz: null, wrong: null, card: q, solved: [...s.solved, q.id] }); if (s.tts) audio.speak(`${q.name}. ${q.text}`); }
    else { audio.tone(false); const L = LAYERS.find((l) => l.n === pick); s.set({ wrong: `${pick} değil: Troya ${pick} ${L?.era ?? ''}. Yapının malzemesine ve biçimine bir daha bak.` }); } }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); const s = useDb.getState(); if (e.repeat) return; if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close();
      if (s.quiz && /^Digit[1-3]$/.test(e.code)) answer(s.quiz.options[Number(e.code.slice(5)) - 1]); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current; const kb = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); if (!drag.current || drag.current.mouse) live.input = kb;
      void dt; raf = requestAnimationFrame(loop); };   // kamera klavyeyle çevrilmez: fareyle (imleç kilidi) ya da sürüklemeyle bakılır
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close, answer]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __troya: unknown }).__troya = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, answer, state: () => ({ ...useDb.getState(), s: live.s }), STOPS, ROUTE_LEN }; }, [answer]);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); look.lock(e); if (!useDb.getState().started) return; drag.current = { id: e.pointerId, x: e.clientX, y0: e.clientY, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; live.yaw += (e.clientX - d.x) * 0.005; if (d.mouse) live.pitch = THREE.MathUtils.clamp(live.pitch + (e.clientY - d.y) * 0.004, -1, 0.9); else live.input = THREE.MathUtils.clamp(-(e.clientY - d.y0) / 70, -1, 1); d.x = e.clientX; d.y = e.clientY; };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (!drag.current.mouse) live.input = 0; drag.current = null; } };
  const quizzes = STOPS.filter((s) => s.answer);
  const solvedLayers = new Set(STOPS.filter((s) => S.solved.includes(s.id) && s.answer).map((s) => s.answer));

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfe7ec] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <LookCrosshair locked={look.locked} />
      <Canvas dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 1500, position: [120, 20, 110] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky={'#dfe7ec'} sun={'#fff2df'} ground={'#a99a6c'} sunDir={[-0.7, 0.5, 0.4]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { audio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { S.set({ tts: !S.tts }); if (S.tts) audio.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full ${S.tts ? 'bg-amber-300 text-black' : 'bg-black/45'}`} aria-label={S.tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={S.tts}>{S.tts ? <Captions size={18} /> : <CaptionsOff size={18} />}</button>
        {S.started && <div className="mx-auto rounded-2xl bg-black/45 px-3 py-2 text-xs"><p className="mb-1 flex items-center justify-center gap-1"><Layers size={12} /> Katmanlar · {S.solved.filter((id) => quizzes.some((q) => q.id === id)).length}/{quizzes.length}</p>
          <div className="flex gap-0.5">{LAYERS.map((l) => <span key={l.n} className={`rounded px-1.5 py-0.5 font-semibold ${solvedLayers.has(l.n) ? 'text-black' : 'text-white/50'}`} style={{ background: solvedLayers.has(l.n) ? l.color : 'rgba(255,255,255,.08)' }}>{l.n}</span>)}</div></div>}
      </div>
      {S.started && !S.card && !S.quiz && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs">Dikey sürükle: yürü · yatay: bak<span className="hidden [@media(pointer:fine)]:inline"> · W/S · tıkla, fareyle bak (Esc: bırak) · 1/2/3: cevap</span></p>}
      {S.quiz && <Quiz q={S.quiz} wrong={S.wrong} onPick={answer} />}
      {S.card && <Card s={S.card} onClose={close} />}
      {!S.started && <TitleCard onStart={() => { audio.unlock(); S.set({ started: true }); }} />}
      {S.started && S.solved.length === STOPS.length && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  return (
    <group>
      <Sky sunPosition={[-200, 90, 120]} turbidity={5} rayleigh={1.4} />
      <fog attach="fog" args={['#dfe7ec', 260, 1200]} />
      <hemisphereLight args={['#f2f7fb', '#9a8a62', 1.0]} />
      <directionalLight position={[-200, 140, 120]} intensity={2.0} color="#fff2df" />
      <Terrain tier={tier} />
      <Trench />
      <Horse />
      <Walls />
      <Megaron />
      <Temple />
      <Odeon />
      <Trees n={tier === 'low' ? 50 : 120} />
      <mesh rotation-x={-Math.PI / 2} position={[-560, 0.2, 0]}><planeGeometry args={[600, 1600]} /><meshStandardMaterial color="#4f86a3" roughness={0.25} /></mesh>
      <Controller />
    </group>
  );
}
function stoneTex(seed: number, base: string, light = 30) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 128, 128); let y = 0; while (y < 128) { const h = 10 + r() * 14; let x = -r() * 20; while (x < 128) { const w = 16 + r() * 22, v = light * (r() - 0.5) | 0; g.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 250 : 0},${v > 0 ? 235 : 0},${Math.abs(v) / 120})`; g.fillRect(x + 1, y + 1, w - 2, h - 2); g.strokeStyle = 'rgba(40,30,20,.35)'; g.strokeRect(x + 1, y + 1, w - 2, h - 2); x += w; } y += h; } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 220 : 150, g = new THREE.PlaneGeometry(700, 700, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#9da35e'), dirt = new THREE.Color('#b59a6e'), r = rng(3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y); c.copy(grass).lerp(dirt, Math.min(1, y / MOUND.h * 1.4) * 0.8 + r() * 0.15); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={1} /></mesh>;
}
/** Schliemann yarması: iki duvarda katman bantları (en altta Troya I) + dipte Troya I duvarları */
function Trench() {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!; const n = LAYERS.length; LAYERS.forEach((l, i) => { g.fillStyle = l.color; g.fillRect(0, 256 - ((i + 1) * 256) / n, 64, 256 / n + 1); }); const r = rng(9); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(30,20,10,${r() * 0.25})`; g.fillRect(r() * 64, r() * 256, 2, 1 + r() * 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); return t; }, []);
  const len = TRENCH.z1 - TRENCH.z0, top = MOUND.h, bot = MOUND.h - TRENCH.d, stone = useMemo(() => stoneTex(5, '#8a7356'), []);
  return (<group>
    {[-1, 1].map((sd) => <mesh key={sd} position={[TRENCH.x + sd * TRENCH.w / 2, (top + bot) / 2, (TRENCH.z0 + TRENCH.z1) / 2]} rotation-y={sd * -Math.PI / 2}><planeGeometry args={[len, top - bot]} /><meshStandardMaterial map={tex} roughness={1} side={THREE.DoubleSide} /></mesh>)}
    {[[-2, -30, 6], [1.5, -20, 5], [-1, -13, 4]].map(([x, z, w], i) => <mesh key={i} position={[x, bot + 0.5, z]} rotation-y={0.2 * i}><boxGeometry args={[w, 1, 0.9]} /><meshStandardMaterial map={stone} roughness={0.95} /></mesh>)}
  </group>);
}
/** Girişteki tahta at (modern kopya, temsilî): tekerlekli platform, açılı bacaklar, kavisli boyun, kulaklar, yele, kuyruk; tahta dokusu */
function plankTex() { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!, r = rng(19); for (let x = 0; x < 64; x += 16) { const v = 120 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.66 | 0},${v * 0.4 | 0})`; g.fillRect(x, 0, 16, 256); g.fillStyle = 'rgba(30,15,5,.6)'; g.fillRect(x, 0, 1.5, 256); for (let k = 0; k < 20; k++) { g.fillStyle = `rgba(40,20,8,${r() * 0.25})`; g.fillRect(x + 2 + r() * 12, r() * 256, 1, 20 + r() * 60); } } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function Horse() {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ map: plankTex(), roughness: 0.85 }), []), dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4a2e18', roughness: 0.9 }), []), y = heightAt(80, 44);
  const body = useMemo(() => { const g = new THREE.CapsuleGeometry(1.9, 5.2, 4, 10); g.rotateZ(Math.PI / 2); g.scale(1, 1.05, 0.95); return g; }, []);
  return (<group position={[80, y, 44]} rotation-y={-0.8}>
    {/* tekerlekli platform */}
    <mesh material={wood} position={[0, 1.1, 0]}><boxGeometry args={[9.5, 0.5, 4.2]} /></mesh>
    {[-3.4, 3.4].flatMap((x) => [-2.2, 2.2].map((z) => <mesh key={`${x}${z}`} material={dark} position={[x, 0.9, z]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.9, 0.9, 0.35, 16]} /></mesh>))}
    {/* bacaklar: hafif açılı */}
    {[[-2.8, -1.1, 0.12], [-2.8, 1.1, 0.12], [2.6, -1.1, -0.1], [2.6, 1.1, -0.1]].map(([x, z, a], i) => <mesh key={i} material={wood} position={[x, 3.3, z]} rotation-z={a}><cylinderGeometry args={[0.32, 0.42, 4.2, 8]} /></mesh>)}
    <mesh geometry={body} material={wood} position={[0, 6.9, 0]} />
    {/* kavisli boyun (iki parça) + baş + kulaklar + yele */}
    <mesh material={wood} position={[3.9, 8.6, 0]} rotation-z={-0.75}><cylinderGeometry args={[0.95, 1.25, 3.6, 10]} /></mesh>
    <mesh material={wood} position={[5.0, 10.6, 0]} rotation-z={-0.35}><cylinderGeometry args={[0.8, 0.95, 2.4, 10]} /></mesh>
    <mesh material={wood} position={[6.1, 11.4, 0]} rotation-z={-1.25}><capsuleGeometry args={[0.7, 1.9, 3, 8]} /></mesh>
    {[-0.35, 0.35].map((z) => <mesh key={z} material={wood} position={[5.4, 12.5, z]} rotation-z={-0.2}><coneGeometry args={[0.22, 0.8, 5]} /></mesh>)}
    {[0, 1, 2, 3].map((i) => <mesh key={i} material={dark} position={[4.0 + i * 0.45, 9.3 + i * 0.75, 0]} rotation-z={-0.6}><boxGeometry args={[0.25, 0.9, 0.5]} /></mesh>)}
    {[-1.5, 1.5].map((z) => <mesh key={z} position={[6.4, 11.7, z * 0.32]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color="#120a04" /></mesh>)}
    {/* kuyruk */}
    <mesh material={dark} position={[-4.9, 6.2, 0]} rotation-z={0.5}><coneGeometry args={[0.45, 3.4, 6]} /></mesh>
    {/* yan pencereler ve merdiven (ziyaretçiler atın içine çıkabilir) */}
    {[-1.8, 0, 1.8].map((x) => <mesh key={x} position={[x, 7.3, 1.82]}><boxGeometry args={[0.9, 0.7, 0.05]} /><meshStandardMaterial color="#1e1208" /></mesh>)}
    <group position={[-1.2, 0, 2.9]} rotation-x={0.42}>{[-0.45, 0.45].map((x) => <mesh key={x} material={dark} position={[x, 3.6, 0]}><boxGeometry args={[0.12, 6.4, 0.12]} /></mesh>)}{[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <mesh key={k} material={dark} position={[0, 0.9 + k * 0.75, 0]}><boxGeometry args={[0.9, 0.08, 0.1]} /></mesh>)}</group>
  </group>);
}
/** Troya VI surları: eğimli kesme taş duvar parçaları + kule */
function Walls() {
  const tex = useMemo(() => stoneTex(7, '#b8a27c', 40), []), segs = useMemo(() => { const out: { x: number; z: number; yaw: number }[] = []; for (let a = -0.9; a <= 0.75; a += 0.08) { const r = 50; out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.87, yaw: -a + Math.PI / 2 }); } return out; /* sık adım: bloklar birleşip kesintisiz sur olur */ }, []);
  return (<group>
    {segs.map((s, i) => <mesh key={i} position={[s.x, heightAt(s.x, s.z) + 1.6, s.z]} rotation={[0, s.yaw, -0.18]}><boxGeometry args={[1.6, 3.4, 5.8]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>)}
    <mesh position={[51, heightAt(51, 4) + 2.6, 4]}><boxGeometry args={[7, 5.2, 9]} /><meshStandardMaterial map={tex} roughness={0.95} /></mesh>
  </group>);
}
/** Troya II: megaron temelleri + taş döşeli rampa */
function Megaron() {
  const tex = useMemo(() => stoneTex(11, '#9b8360'), []), y = heightAt(14, -50);
  return (<group position={[14, y, -50]}>
    {[[0, 0, 16, 7], [-11, 3, 10, 6]].map(([x, z, l, w], i) => <group key={i} position={[x, 0, z]}>{[[0, w / 2, l, 0.9], [0, -w / 2, l, 0.9], [-l / 2, 0, 0.9, w]].map(([px, pz, a, b], k) => <mesh key={k} position={[px, 0.5, pz]}><boxGeometry args={[a, 1, b]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>)}</group>)}
    <mesh position={[8, 0.4, -9]} rotation={[0.15, 0.4, 0]}><boxGeometry args={[4, 0.4, 14]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
  </group>);
}
/** Athena Tapınağı (Troya VIII): platform, sütun kaideleri, devrik sütun tamburları */
function Temple() {
  const y = heightAt(-40, 8), r = useMemo(() => rng(17), []), drums = useMemo(() => Array.from({ length: 14 }, () => ({ x: -8 + r() * 16, z: -5 + r() * 10, a: r() * 3, l: 1 + r() * 1.5 })), [r]);
  return (<group position={[-40, y, 10]}>
    <mesh position={[0, 0.4, 0]}><boxGeometry args={[18, 0.8, 11]} /><meshStandardMaterial color="#e6e0d2" roughness={0.7} /></mesh>
    {[-7, -3.5, 0, 3.5, 7].flatMap((x) => [-4.5, 4.5].map((z) => <mesh key={`${x}${z}`} position={[x, 1.2, z]}><cylinderGeometry args={[0.6, 0.65, 0.8, 14]} /><meshStandardMaterial color="#efebe2" roughness={0.6} /></mesh>))}
    {drums.map((d, i) => <mesh key={i} position={[d.x, 1.2, d.z]} rotation={[Math.PI / 2, 0, d.a]}><cylinderGeometry args={[0.55, 0.55, d.l, 14]} /><meshStandardMaterial color="#ebe6db" roughness={0.6} /></mesh>)}
  </group>);
}
/** Odeon (Troya IX) */
function Odeon() {
  const geo = useMemo(() => { const pts: THREE.Vector2[] = [new THREE.Vector2(5, 0)]; for (let i = 0; i < 12; i++) { pts.push(new THREE.Vector2(5 + i * 0.9, (i + 1) * 0.45)); pts.push(new THREE.Vector2(5 + (i + 1) * 0.9, (i + 1) * 0.45)); } pts.push(new THREE.Vector2(5 + 12 * 0.9, -0.1)); return new THREE.LatheGeometry(pts, 30, Math.PI * 0.5, Math.PI); }, []);
  const y = heightAt(-60, -44);
  return (<group position={[-60, y, -44]}><mesh geometry={geo}><meshStandardMaterial color="#dcd3c0" roughness={0.85} flatShading /></mesh><mesh position={[0, 1.2, 6]}><boxGeometry args={[14, 2.4, 1.2]} /><meshStandardMaterial color="#d2c7b0" roughness={0.9} /></mesh></group>);
}
function Trees({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 4 && k < n; i++) { const x = (r() - 0.5) * 500, z = (r() - 0.5) * 500; if (Math.hypot(x, z * 1.15) < MOUND.r + 14) continue; o.position.set(x, heightAt(x, z), z); o.scale.setScalar(0.8 + r() * 0.8); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(2.6, 0); g.scale(1, 1.1, 1); g.translate(0, 3.4, 0); return g; }, []);
  return <instancedMesh ref={ref} args={[geo, undefined, n]}><meshStandardMaterial color="#5d7040" roughness={0.9} flatShading /></instancedMesh>;
}

/* ---------- hareket + kamera ---------- */
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
function Controller() {
  const { camera } = useThree(), st = useRef({ step: 0, bob: 0, head: NaN, stop: '' });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    const back = Math.cos(live.yaw) < 0 ? -1 : 1, want = S.started && !S.card && !S.quiz ? live.input * WALK * back : 0;
    live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
    const before = live.s; live.s = Math.max(0, Math.min(ROUTE_LEN, live.s + live.v * dt)); const moved = live.s - before, R = routeAt(live.s);
    st.current.step += Math.abs(moved); if (st.current.step > 0.78) { st.current.step = 0; audio.step(); } st.current.bob += Math.abs(moved) * 2.2;
    const sp = S.started ? nearStop(live.s) : null;
    if ((sp?.id ?? '') !== st.current.stop) { st.current.stop = sp?.id ?? ''; if (sp && !S.solved.includes(sp.id)) { if (sp.answer) S.set({ quiz: sp, wrong: null, card: null }); else { S.set({ card: sp, solved: [...S.solved, sp.id] }); if (S.tts) audio.speak(`${sp.name}. ${sp.text}`); } } else if (!sp) { if (S.quiz) S.set({ quiz: null, wrong: null }); if (S.card) S.set({ card: null }); } }   // noktadan uzaklaşınca açık kart/bilmece kapanır
    const hd = Math.atan2(-R.dir[0], -R.dir[1]); if (Number.isNaN(st.current.head)) st.current.head = hd; st.current.head += wrapA(hd - st.current.head) * (1 - Math.exp(-dt * 3));
    if (!S.started) { camera.position.set(110, 22, 100); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(20, 4, 0), THREE.Object3D.DEFAULT_UP))); return; }
    _e.set(live.pitch - 0.05, st.current.head + live.yaw, 0); camera.quaternion.setFromEuler(_e);
    camera.position.set(R.p[0], R.p[1] + EYE + Math.sin(st.current.bob) * 0.03 * Math.min(1, Math.abs(live.v) / 2), R.p[2]);
  });
  return null;
}

/* ---------- arayüz ---------- */
function Quiz({ q, wrong, onPick }: { q: Stop; wrong: string | null; onPick: (p: string) => void }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-40 mx-auto max-w-md sm:bottom-6" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-amber-100/30 bg-[#2a2016]/90 p-5 shadow-2xl backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Katman bilmecesi</p>
        <h2 className="text-lg font-bold">{q.name}: hangi Troya?</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">{q.options.map((o, i) => { const L = LAYERS.find((l) => l.n === o)!; return <button key={o} onClick={() => onPick(o)} className="rounded-xl px-2 py-2.5 text-center font-bold text-black active:scale-95" style={{ background: L.color }}>Troya {o}<span className="block text-[10px] font-medium opacity-75">{L.era}</span><span className="hidden text-[10px] opacity-60 [@media(pointer:fine)]:block">{i + 1}</span></button>; })}</div>
        {wrong && <p className="mt-2 text-xs text-amber-200">{wrong}</p>}
      </div>
    </div>
  );
}
function Card({ s, onClose }: { s: Stop; onClose: () => void }) {
  return (
    <div className="absolute inset-x-3 bottom-14 z-40 mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-6 sm:mx-0" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-amber-100/30 bg-[#2a2016]/90 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">{s.answer ? `Troya ${s.answer} · ${LAYERS.find((l) => l.n === s.answer)!.era}` : 'Giriş'}</p><h2 className="text-xl font-bold">{s.name}</h2></div>
          <button onClick={onClose} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Kapat"><X size={18} /></button></div>
        <p className="mt-2 text-sm leading-relaxed text-white/85">{s.text}</p>
        <a href={s.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-white/60 underline">{s.source.title} <ExternalLink size={12} /></a>
      </div>
    </div>
  );
}
function TitleCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 p-4 sm:p-8" onPointerDown={(e) => e.stopPropagation()}>
      <div className="mx-auto max-w-xl rounded-2xl bg-black/60 p-5 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Çanakkale · Hisarlık · UNESCO Dünya Mirası</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Troya: Dokuz Kent</h1>
        <p className="mt-2 text-sm text-white/85">Troya tek bir kent değil: yaklaşık 4.000 yıl boyunca aynı tepede üst üste kurulmuş dokuz kent. Ören yerini gez, her yapının hangi katmana ait olduğunu bul ve katman cetvelini doldur.</p>
        <p className="mt-2 text-xs text-white/60">Dikey sürükle ya da W/S: ileri/geri · yatay sürükle ya da fare: etrafa bak · yapının yanında doğru katmanı seç</p>
        <p className="mt-1 text-[11px] text-white/45">Plan stilizedir. Katman tarihleri yaklaşıktır, kaynaklara göre değişir.</p>
        <button onClick={onStart} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 font-semibold text-black"><Pickaxe size={18} /> Ören yerine gir</button>
      </div>
    </div>
  );
}
function EndCard({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-3xl bg-[#f6efe2] p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-amber-700">Katman cetveli tamam</p><h2 className="mt-1 text-2xl font-bold">Dokuz kentin izinde</h2>
        <p className="mt-2 text-sm text-slate-600">Troya I’in duvarlarından Roma odeonuna kadar, aynı tepede binlerce yıl üst üste kurulmuş kentleri ayırt ettin.</p>
        <div className="mt-5 flex gap-2"><button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Gezmeye devam</button><button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button></div>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Truva').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const s = STOPS[i];
  return (
    <div className="fixed inset-0 bg-[#2a2016] text-white">
      {img && <img src={img} alt="Troya" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{s.name}</h2><p className="mt-1 text-sm">{s.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => audio.speak(s.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % STOPS.length)} className="h-10 rounded-lg bg-amber-300 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
