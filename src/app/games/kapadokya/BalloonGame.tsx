/**
 * Kapadokya — "Gün Doğumunda Balon". Ana yönetici.
 *
 * Gün doğarken sıcak hava balonuyla Göreme vadilerinin üstünde uç. Dümen yok: brülörle yüksel, kapakla alçal; her yükseklikte
 * rüzgâr başka yöne eser (flight.ts). Beş noktayı (Göreme, Çavuşin, Paşabağı, Güvercinlik Vadisi, Uçhisar) ziyaret et.
 * KAMERA: balonun arkasında üçüncü şahıs; sürükleyerek etrafında döndür. Kamera araziye girmez (zeminden ≥ 3 m).
 * GÖRSEL: prosedürel tüf arazisi, instanced peribacaları (şapkalı), Uçhisar kayası ve oyukları, sürüklenen başka balonlar, gün doğumu göğü.
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__balon), pil tasarrufu, tr-TR sesli okuma, WebGL yoksa Vikipedi fotoğraflı yedek.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { ArrowDown, ArrowLeft, ArrowUp, Captions, CaptionsOff, ExternalLink, Flame, MapPin, Volume2, VolumeX, X } from 'lucide-react';
import { LAYERS, SPOTS, START, UCHISAR, heightAt, layerAt, nearSpot, step, wind, type Balloon, type Spot } from './flight';
import { speakTr } from '../shared/voice';
import { Polish, SkyEnvironment } from '../shared/Polish';

type Tier = 'low' | 'medium' | 'high';
const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const pinned = (() => { const q = new URLSearchParams(location.search).get('q'); return q === 'low' || q === 'medium' || q === 'high' ? (q as Tier) : null; })();
function detectTier(): Tier { if (pinned) return pinned; const nav = navigator as Navigator & { deviceMemory?: number }; if ((nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4) return 'low'; return matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'; }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/* ---------- ses: brülör kükremesi + rüzgâr ---------- */
class BalloonAudio {
  private ctx: AudioContext | null = null; private master: GainNode | null = null; private burner: GainNode | null = null; muted = false;
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; } const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()); this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.7; this.master.connect(ctx.destination);
    const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const mk = (type: BiquadFilterType, f: number, g: number) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const gn = ctx.createGain(); gn.gain.value = g; s.connect(fl).connect(gn).connect(this.master!); s.start(0, Math.random()); return gn; };
    mk('lowpass', 300, 0.06); this.burner = mk('bandpass', 180, 0);
  }
  setBurner(on: boolean) { if (this.ctx && this.burner) this.burner.gain.setTargetAtTime(on && !this.muted ? 0.9 : 0, this.ctx.currentTime, 0.08); }
  setMuted(m: boolean) { this.muted = m; if (m && 'speechSynthesis' in window) speechSynthesis.cancel(); if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.2); }
  speak(t: string) { if (!this.muted) speakTr(t); }
  hush() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  dispose() { this.hush(); void this.ctx?.close(); this.ctx = null; this.master = null; this.burner = null; }
}
const audio = new BalloonAudio();

/* ---------- durum ---------- */
interface S { started: boolean; seen: string[]; card: Spot | null; agl: number; layer: number; muted: boolean; tts: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, seen: [] as string[], card: null, agl: 0, layer: 0, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, tts: true, set: (p) => set(p) }));
const live = { b: { ...START } as Balloon, input: 0, t: 0, camYaw: 0, camPitch: 0.25, burn: false };

export default function BalloonGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <Fallback onExit={onExit} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y: number } | null>(null), hold = useRef(0);
  useEffect(() => { audio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { b: { ...START }, input: 0, t: 0, camYaw: 0, camPitch: 0.25 }); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if ((e.code === 'Escape' || e.code === 'KeyE') && useDb.getState().card) close(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0; const loop = () => { const k = keys.current, kb = (k.has('KeyW') || k.has('ArrowUp') || k.has('Space') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0); live.input = hold.current || kb;
      live.camYaw += ((k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0) - (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0)) * 0.03; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __balon: unknown }).__balon = { tp: (x: number, z: number, agl = 60) => { live.b = { x, z, y: heightAt(x, z) + agl, vy: 0 }; useDb.getState().set({ started: true }); }, cam: (y: number, p = 0.25) => { live.camYaw = y; live.camPitch = p; }, state: () => ({ ...useDb.getState(), b: { ...live.b } }), SPOTS }; }, []);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; live.camYaw -= (e.clientX - d.x) * 0.006; live.camPitch = THREE.MathUtils.clamp(live.camPitch + (e.clientY - d.y) * 0.004, -0.2, 1.2); d.x = e.clientX; d.y = e.clientY; };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; };
  const btn = (v: number) => ({ onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); audio.unlock(); hold.current = v; }, onPointerUp: () => { hold.current = 0; }, onPointerLeave: () => { hold.current = 0; }, onPointerCancel: () => { hold.current = 0; } });
  const start = () => { audio.unlock(); S.set({ started: true }); };
  const L = LAYERS[Math.max(0, S.layer)];

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#f3c9a0] text-white" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Canvas dpr={tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]} gl={{ antialias: tier === 'high' }} camera={{ fov: 55, near: 0.5, far: 2500, position: [60, 80, 220] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.95; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky={'#f3c9a0'} sun={'#ffc98a'} ground={'#d9b896'} sunDir={[0.8, 0.1, -0.6]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onExit} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
        <button onClick={() => { audio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <button onClick={() => { S.set({ tts: !S.tts }); if (S.tts) audio.hush(); }} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full ${S.tts ? 'bg-orange-300 text-black' : 'bg-black/45'}`} aria-label={S.tts ? 'Sesli okumayı kapat' : 'Sesli okumayı aç'} aria-pressed={S.tts}>{S.tts ? <Captions size={18} /> : <CaptionsOff size={18} />}</button>
        {S.started && <div className="mx-auto flex flex-col items-center gap-1 rounded-2xl bg-black/45 px-4 py-2"><div className="flex gap-1">{SPOTS.map((s) => <MapPin key={s.id} size={13} className={S.seen.includes(s.id) ? 'text-orange-300' : 'text-white/30'} />)}</div><p className="text-xs">{S.seen.length}/{SPOTS.length} nokta</p></div>}
      </div>
      {S.started && (
        <>
          {/* rüzgâr katmanları: hangi yükseklikte rüzgâr nereye eser (oklar kameraya göre) */}
          <div className="pointer-events-none absolute left-3 top-20 rounded-2xl bg-black/45 p-2.5 text-xs">
            <p className="mb-1 font-semibold">{Math.round(S.agl)} m · {L.name} rüzgâr</p>
            {[...LAYERS].map((l, i) => ({ l, i })).reverse().map(({ l, i }) => <WindRow key={l.name} name={l.name} dir={l.dir} on={i === S.layer} range={i === 0 ? `0–${l.top}` : i === LAYERS.length - 1 ? `${LAYERS[i - 1].top}+` : `${LAYERS[i - 1].top}–${l.top}`} />)}
          </div>
          <div className="absolute bottom-6 right-4 flex flex-col gap-3" onPointerDown={(e) => e.stopPropagation()}>
            <button {...btn(1)} className="grid h-16 w-16 place-items-center rounded-full bg-orange-500 shadow-xl active:scale-95" aria-label="Brülör: yüksel"><Flame size={26} /><span className="sr-only">Yüksel</span></button>
            <button {...btn(-1)} className="grid h-14 w-14 place-items-center self-center rounded-full bg-black/55 shadow-xl active:scale-95" aria-label="Kapak: alçal"><ArrowDown size={22} /></button>
          </div>
          {!S.card && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[60vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs">🔥 basılı tut: yüksel · ⬇: alçal · sürükle: etrafa bak<span className="hidden [@media(pointer:fine)]:inline"> · W/Boşluk · S</span></p>}
        </>
      )}
      {S.card && <Card s={S.card} onClose={close} />}
      {!S.started && <TitleCard onStart={start} />}
      {S.started && S.seen.length === SPOTS.length && !S.endShown && !S.card && <EndCard onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}
/** Katman satırı: rüzgâr yönü oku kameranın bakışına göre döndürülür */
function WindRow({ name, dir, on, range }: { name: string; dir: [number, number]; on: boolean; range: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { let raf = 0; const f = () => { if (ref.current) { const a = Math.atan2(dir[0], -dir[1]) + live.camYaw; ref.current.style.transform = `rotate(${a}rad)`; } raf = requestAnimationFrame(f); }; raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf); }, [dir]);
  return <div className={`flex items-center gap-2 rounded-lg px-1.5 py-0.5 ${on ? 'bg-orange-400/80 text-black' : 'opacity-80'}`}><span ref={ref} className="inline-block"><ArrowUp size={14} /></span><span className="w-12">{name}</span><span className="opacity-70">{range} m</span></div>;
}

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  return (
    <group>
      <Sky sunPosition={[400, 40, -300]} turbidity={8} rayleigh={2.5} mieCoefficient={0.006} mieDirectionalG={0.9} />
      <fog attach="fog" args={['#f1c9a6', 300, 1400]} />
      <hemisphereLight args={['#ffe6cc', '#8a6a52', 0.9]} />
      <directionalLight position={[400, 120, -300]} intensity={2.2} color="#ffc98a" />
      <ambientLight intensity={0.2} />
      <Terrain tier={tier} />
      <Chimneys n={tier === 'low' ? 350 : tier === 'medium' ? 700 : 1100} />
      <Uchisar />
      <OtherBalloons n={tier === 'low' ? 10 : 24} />
      <PlayerBalloon />
      <Controller />
    </group>
  );
}
function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 200 : tier === 'medium' ? 150 : 100, g = new THREE.PlaneGeometry(1600, 1600, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), tuff = new THREE.Color('#e8d3b0'), rose = new THREE.Color('#d9a38c'), vine = new THREE.Color('#9a9a5a'), r = rng(3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y);
      c.copy(tuff).lerp(rose, Math.max(0, Math.sin(x * 0.01 + z * 0.006)) * 0.6); if (y < 12 && r() < 0.8) c.lerp(vine, 0.55); c.multiplyScalar(0.92 + r() * 0.1); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={0.95} flatShading /></mesh>;
}
/** Peribacaları: koni gövde + koyu bazalt şapka; noktaların çevresinde (özellikle Paşabağı ve Göreme) yoğun */
function Chimneys({ n }: { n: number }) {
  const a = useRef<THREE.InstancedMesh>(null), b = useRef<THREE.InstancedMesh>(null);
  // peribacası profili (birim yükseklik): geniş etek → bel → hafif şişkinlik → ince boyun; yüzey gürültüyle aşınmış, tüf katmanları renk bandı
  const geo = useMemo(() => {
    const prof: [number, number][] = [[3.6, 0], [3.0, 0.08], [2.2, 0.2], [1.55, 0.38], [1.35, 0.52], [1.45, 0.64], [1.2, 0.78], [0.9, 0.9], [0.75, 0.97], [0.05, 1]];
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 14).toNonIndexed() as THREE.BufferGeometry, q = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(q.count * 3);
    const bands = ['#efdcbc', '#e7c9a6', '#f3e5cb', '#dcb898', '#ecd6b2'].map((c) => new THREE.Color(c)), c = new THREE.Color();
    for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i), a = Math.atan2(z, x), k = 1 + 0.09 * Math.sin(a * 5 + y * 9) + 0.05 * Math.sin(a * 11 - y * 17); q.setX(i, x * k); q.setZ(i, z * k);
      c.copy(bands[Math.floor(y * 9) % bands.length]).multiplyScalar(0.94 + 0.08 * Math.sin(a * 3 + y * 40)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, []);
  const cap = useMemo(() => { const g = new THREE.SphereGeometry(1.25, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55); g.scale(1.25, 0.75, 1.15); g.translate(0, 0.1, 0); return g; }, []);
  useEffect(() => { const r = rng(11), o = new THREE.Object3D(), centers = [...SPOTS.map((s) => s.at), [60, 60], [-20, -120], [200, -20]] as [number, number][]; let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const c = centers[Math.floor(r() * centers.length)], ang = r() * 6.28, d = 8 + Math.pow(r(), 0.7) * 120, x = c[0] + Math.cos(ang) * d, z = c[1] + Math.sin(ang) * d;
      if (Math.hypot(x - UCHISAR.x, z - UCHISAR.z) < UCHISAR.r * 0.9 || Math.hypot(x - START.x, z - START.z) < 18) continue;
      const h = 6 + r() * 16, w = 0.6 + r() * 0.7, y = heightAt(x, z) - 0.5; o.position.set(x, y, z); o.rotation.set(0, r() * 6, 0); o.scale.set(w, h, w); o.updateMatrix(); a.current?.setMatrixAt(k, o.matrix);
      o.position.set(x, y + h - 0.15, z); o.scale.set(w * 0.9, w * (0.8 + r() * 0.5), w * 0.9); o.updateMatrix(); b.current?.setMatrixAt(k, o.matrix); k++; }
    for (const m of [a.current, b.current]) if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return (<><instancedMesh ref={a} args={[geo, undefined, n]}><meshStandardMaterial vertexColors roughness={0.95} /></instancedMesh><instancedMesh ref={b} args={[cap, undefined, n]}><meshStandardMaterial color="#5e5048" roughness={0.85} flatShading /></instancedMesh></>);
}
/** Uçhisar: arazinin tepesi zaten kaya; üstüne oyuk pencereler (koyu, instanced) */
function Uchisar() {
  const ref = useRef<THREE.InstancedMesh>(null), N = 90;
  useEffect(() => { const r = rng(5), o = new THREE.Object3D(); for (let i = 0; i < N; i++) { const a = r() * 6.28, y0 = 30 + r() * 52, x = UCHISAR.x + Math.cos(a) * 60, z = UCHISAR.z + Math.sin(a) * 60;
      // yüzeye yaklaş: merkeze doğru ilerle, arazinin içine girdiği ilk nokta
      let px = x, pz = z; for (let s = 0; s < 60; s++) { if (heightAt(px, pz) > y0) break; px += (UCHISAR.x - px) * 0.04; pz += (UCHISAR.z - pz) * 0.04; }
      o.position.set(px, y0, pz); o.lookAt(UCHISAR.x, y0, UCHISAR.z); o.scale.set(1 + r(), 1.4 + r(), 0.6); o.updateMatrix(); ref.current?.setMatrixAt(i, o.matrix); }
    if (ref.current) { ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, []);
  return <instancedMesh ref={ref} args={[undefined, undefined, N]}><boxGeometry args={[1, 1.2, 1]} /><meshBasicMaterial color="#3b2b22" /></instancedMesh>;
}
/** Balon gövdesi: armut biçimli (Lathe), dilimli renkli doku */
function envelopeGeo() { const pts: THREE.Vector2[] = []; for (let i = 0; i <= 20; i++) { const t = i / 20, y = t * 20, r = t < 0.25 ? 2 + t * 22 : 7.5 * Math.sin(Math.PI * Math.min(1, 0.32 + t * 0.78)) + 0.4; pts.push(new THREE.Vector2(Math.max(0.01, i === 20 ? 0.01 : r), y)); } return new THREE.LatheGeometry(pts, 24); }
function stripeTex(colors: string[]) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d')!; colors.forEach((col, i) => { g.fillStyle = col; g.fillRect((i * 256) / colors.length, 0, 256 / colors.length + 1, 64); }); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 26, 256, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t; }
const ENV = envelopeGeo();
function PlayerBalloon() {
  const g = useRef<THREE.Group>(null), flame = useRef<THREE.Mesh>(null), tex = useMemo(() => stripeTex(['#e8483f', '#f2c230', '#2e7d8f', '#f2efe6']), []);
  useFrame(({ clock }) => { const b = live.b; if (!g.current) return; g.current.position.set(b.x, b.y, b.z); g.current.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.015;
    if (flame.current) { flame.current.visible = live.burn; flame.current.scale.setScalar(0.8 + Math.random() * 0.5); } });
  return (
    <group ref={g}>
      <mesh geometry={ENV} position={[0, 4.2, 0]}><meshStandardMaterial map={tex} roughness={0.7} side={THREE.DoubleSide} /></mesh>
      {[0, 1, 2, 3].map((i) => { const a = (i / 4) * Math.PI * 2 + 0.78; return <mesh key={i} position={[Math.cos(a) * 1.3, 3.1, Math.sin(a) * 1.3]} rotation={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]}><cylinderGeometry args={[0.03, 0.03, 2.6, 4]} /><meshStandardMaterial color="#3a2a1a" /></mesh>; })}
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[1.8, 1.2, 1.8]} /><meshStandardMaterial color="#8a6a3e" roughness={1} /></mesh>
      <mesh ref={flame} position={[0, 3.6, 0]}><coneGeometry args={[0.35, 1.6, 8]} /><meshBasicMaterial color="#ffb347" toneMapped={false} /></mesh>
    </group>
  );
}
function OtherBalloons({ n }: { n: number }) {
  const env = useRef<THREE.InstancedMesh>(null), seeds = useMemo(() => { const r = rng(21); return Array.from({ length: n }, () => ({ x: (r() - 0.5) * 500, z: (r() - 0.5) * 500, agl: 20 + r() * 220, s: 0.7 + r() * 0.5 })); }, [n]);
  const o = useMemo(() => new THREE.Object3D(), []), cols = ['#e8483f', '#f2c230', '#3a7bd5', '#43a047', '#8e44ad', '#ff7f50', '#ffffff'];
  useEffect(() => { const m = env.current; if (!m) return; const c = new THREE.Color(), r = rng(4); for (let i = 0; i < n; i++) m.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)])); if (m.instanceColor) m.instanceColor.needsUpdate = true; }, [n]);   // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, raw) => { const m = env.current; if (!m) return; const dt = Math.min(raw, 0.05);
    seeds.forEach((q, i) => { const [wx, wz] = wind(q.x, q.z, q.agl, live.t); q.x += wx * dt * 0.8; q.z += wz * dt * 0.8; if (Math.hypot(q.x, q.z) > 420) { q.x *= -0.8; q.z *= -0.8; }
      o.position.set(q.x, heightAt(q.x, q.z) + q.agl + 4, q.z); o.scale.setScalar(q.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={env} args={[ENV, undefined, n]} frustumCulled={false}><meshStandardMaterial roughness={0.7} /></instancedMesh>;
}

/* ---------- uçuş + kamera ---------- */
const _c = new THREE.Vector3(), _t = new THREE.Vector3();
function Controller() {
  const { camera } = useThree(), cam = useRef(new THREE.Vector3(60, 80, 220)), st = useRef({ spot: '', agl: -1, layer: -1 });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    if (S.started) { live.t += dt; live.burn = live.input > 0; audio.setBurner(live.burn); live.b = step(live.b, live.input, dt, live.t); }
    const b = live.b, agl = b.y - heightAt(b.x, b.z), layer = Math.max(0, layerAt(agl));
    if (Math.abs(agl - st.current.agl) > 1 || layer !== st.current.layer) { st.current.agl = agl; st.current.layer = layer; S.set({ agl, layer }); }
    const sp = S.started ? nearSpot(b) : null;
    if ((sp?.id ?? '') !== st.current.spot) { st.current.spot = sp?.id ?? ''; if (sp && !S.seen.includes(sp.id)) { S.set({ card: sp, seen: [...S.seen, sp.id] }); if (S.tts) audio.speak(`${sp.name}. ${sp.text}`); } }
    // kamera: balonun arkasından, gövdenin ortasına bakar; araziye girmez
    const D = 52, cp = Math.cos(live.camPitch);   // geniş çekim: balon + altındaki vadi kadrajda
    _c.set(b.x + Math.sin(live.camYaw) * cp * D, b.y + 12 + Math.sin(live.camPitch) * D, b.z + Math.cos(live.camYaw) * cp * D);
    _c.y = Math.max(_c.y, heightAt(_c.x, _c.z) + 3);
    if (!S.started) _c.set(b.x + 30, b.y + 14, b.z + 40);
    cam.current.lerp(_c, 1 - Math.exp(-dt * 3)); camera.position.copy(cam.current); camera.lookAt(_t.set(b.x, b.y + 4, b.z));
  });
  return null;
}

/* ---------- arayüz ---------- */
function Card({ s, onClose }: { s: Spot; onClose: () => void }) {
  return (
    <div className="absolute inset-x-3 bottom-28 z-40 mx-auto max-w-lg sm:bottom-6 sm:left-auto sm:right-24 sm:mx-0" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-orange-100/30 bg-[#2b1d16]/90 p-5 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">Kapadokya · balondan</p><h2 className="text-xl font-bold">{s.name}</h2></div>
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
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">Nevşehir · Göreme · UNESCO Dünya Mirası</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Kapadokya: Gün Doğumunda Balon</h1>
        <p className="mt-2 text-sm text-white/85">Balonun dümeni yok: brülörle yüksel, kapakla alçal. Her yükseklikte rüzgâr başka yöne eser. Doğru katmanı yakala ve beş noktanın üstünden geç: Göreme, Çavuşin, Paşabağı, Güvercinlik Vadisi ve Uçhisar.</p>
        <p className="mt-2 text-xs text-white/60">🔥 basılı tut ya da W/Boşluk: yüksel · ⬇ ya da S: alçal · sürükle: etrafa bak · soldaki tablo: hangi yükseklikte rüzgâr nereye eser</p>
        <p className="mt-1 text-[11px] text-white/45">Arazi stilizedir, mesafeler kısaltılmıştır. Rüzgâr katmanları oyun için basitleştirilmiştir.</p>
        <button onClick={onStart} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-400 font-semibold text-black"><Flame size={18} /> Havalan</button>
      </div>
    </div>
  );
}
function EndCard({ onStay, onExit }: { onStay: () => void; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/25 p-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="w-full max-w-md rounded-3xl bg-[#f6efe2] p-6 text-center text-ink shadow-2xl">
        <p className="text-sm font-semibold text-orange-700">Beş noktanın hepsi</p><h2 className="mt-1 text-2xl font-bold">Rüzgârı okumayı öğrendin</h2>
        <p className="mt-2 text-sm text-slate-600">Dümensiz bir balonla vadileri gezdin. Gerçek pilotlar da yönü böyle, yüksekliği değiştirerek seçer.</p>
        <div className="mt-5 flex gap-2"><button onClick={onStay} className="h-11 flex-1 rounded-xl border border-line font-semibold">Uçmaya devam</button><button onClick={onExit} className="h-11 flex-1 rounded-xl bg-brand font-semibold text-white">Haritaya dön</button></div>
      </div>
    </div>
  );
}
function Fallback({ onExit }: { onExit: () => void }) {
  const [img, setImg] = useState<string | null>(null), [i, setI] = useState(0);
  useEffect(() => { fetch('https://tr.wikipedia.org/api/rest_v1/page/summary/Kapadokya').then((r) => r.json()).then((j) => setImg(j.originalimage?.source ?? j.thumbnail?.source ?? null)).catch(() => {}); }, []);
  const s = SPOTS[i];
  return (
    <div className="fixed inset-0 bg-[#2b1d16] text-white">
      {img && <img src={img} alt="Kapadokya" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
      <button onClick={onExit} className="absolute left-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-black/60" aria-label="Haritaya dön"><ArrowLeft size={20} /></button>
      <div className="absolute inset-x-3 bottom-3 mx-auto max-w-2xl rounded-2xl bg-black/80 p-4">
        <p className="text-xs text-white/60">Bu cihazda 3D desteklenmiyor · Fotoğraf: Vikipedi / Wikimedia Commons</p>
        <h2 className="mt-1 text-lg font-bold">{s.name}</h2><p className="mt-1 text-sm">{s.text}</p>
        <div className="mt-3 flex gap-2"><button onClick={() => audio.speak(s.text)} className="h-10 rounded-lg bg-white/15 px-3 text-sm">Dinle</button><button onClick={() => setI((i + 1) % SPOTS.length)} className="h-10 rounded-lg bg-orange-400 px-4 text-sm font-semibold text-black">Sonraki</button></div>
      </div>
    </div>
  );
}
