/**
 * Akdamar — "Taştaki Hikâyeler". Ana yönetici.
 *
 * BÖLÜM 1: Gevaş iskelesinden tekneyle adaya geç. Tekne kendiliğinden ilerler; yatay sürükleme ya da A/D dümeni çevirir,
 *   batı rüzgârı tekneyi doğuya iter. İskeleye yanaşınca adaya çıkılır.
 * BÖLÜM 2: Kamera kilisenin çevresinde döner (yatay sürükle / A-D; dikey sürükle yaklaş-uzaklaş). Üstteki ipucuna uyan
 *   kabartmayı bul ve dokun. Doğru sahne bilgi kartını açar; yanlışta hangi sahneye dokunduğun söylenir.
 * Öteki oyunlarla tutarlılık: ?q=, ?debug (__akdamar), tr-TR sesli okuma (rehber kadın sesi), WebGL yoksa Vikipedi yedeği.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Anchor, Search, Ship, Volume2, VolumeX } from 'lucide-react';
import { ARM_W, CHURCH_R, ISLAND, LAKE_LIMIT, PIER, RELIEFS, START, TARGETS, arrived, autoRudder, islandHeight, reliefPos, stepBoat, type Boat, type Relief, type Scene } from './site';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { EndCard, InfoCard, TitleCard, TopBar, WalkAudio, WikiFallback, ashlarTex, detectTier, dprFor, pinned, rng, supportsWebGL, wrapA, type Tier } from '../shared/walkKit';

const audio = new WalkAudio({ freq: 300, gain: 0.12 }, 'female');
type Phase = 'title' | 'boat' | 'island';
interface S { phase: Phase; found: string[]; card: Relief | null; wrong: string | null; muted: boolean; endShown: boolean; dist: number; set: (p: Partial<S>) => void }
const INITIAL = { phase: 'title' as Phase, found: [] as string[], card: null, wrong: null, endShown: false, dist: 0 };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, set: (p) => set(p) }));
const BASE = ISLAND.h - 1.2;
const newBoat = (): Boat => ({ x: START[0], z: START[1], heading: 0.05, t: 0 });
const live = { boat: newBoat(), rudder: 0, orbit: Math.PI, radius: 20, auto: false };

export default function AkdamarGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <WikiFallback wiki="Akdamar Kilisesi" alt="Akdamar Kilisesi" items={TARGETS} onExit={onExit} speak={(t) => audio.speak(t)} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  const keys = useRef(new Set<string>()), drag = useRef<{ id: number; x: number; y: number; mouse: boolean } | null>(null);
  useEffect(() => { audio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, { boat: newBoat(), rudder: 0, orbit: Math.PI, radius: 20, auto: false }); }, []);
  const next = TARGETS.find((t) => !S.found.includes(t.id)) ?? null;
  const pick = useCallback((id: Scene) => { const s = useDb.getState(); if (s.phase !== 'island' || s.card) return; const want = TARGETS.find((t) => !s.found.includes(t.id)), r = RELIEFS.find((x) => x.id === id)!;
    if (want && want.id === id) { audio.tone(true); s.set({ found: [...s.found, id], card: r, wrong: null }); audio.speak(`${r.name}. ${r.text}`); }
    else { audio.tone(false); s.set({ wrong: s.found.includes(id) ? `${r.name}: bunu zaten buldun.` : `Bu sahne: ${r.name}. Aradığın bu değil, kilisenin çevresinde dolaş.` }); } }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); if ((e.code === 'Escape' || e.code === 'KeyE') && useDb.getState().card) close(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    addEventListener('keydown', down); addEventListener('keyup', up);
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; const k = keys.current, lr = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      if (!drag.current || drag.current.mouse) { if (useDb.getState().phase === 'boat') live.rudder = lr; else live.orbit += lr * dt * 1.2; }
      live.radius = THREE.MathUtils.clamp(live.radius + ((k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0)) * dt * 8, 13, 28); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); cancelAnimationFrame(raf); };
  }, [close]);
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __akdamar: unknown }).__akdamar = { auto: (on = true) => { live.auto = on; }, land: () => { Object.assign(live.boat, { x: PIER[0], z: PIER[1] + 10 }); }, orbit: (a: number, r = 20) => { live.orbit = a; live.radius = r; }, pick, state: () => ({ ...useDb.getState(), boat: { ...live.boat } }), RELIEFS, TARGETS, reliefPos }; }, [pick]);
  const onDown = (e: React.PointerEvent) => { audio.unlock(); if (useDb.getState().phase === 'title') return; drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === 'mouse' }; };
  const onMove = (e: React.PointerEvent) => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const ph = useDb.getState().phase;
    if (ph === 'boat') live.rudder = THREE.MathUtils.clamp((e.clientX - (d.mouse ? d.x : d.x)) / 80, -1, 1);
    else { live.orbit -= (e.clientX - d.x) * 0.006; live.radius = THREE.MathUtils.clamp(live.radius + (e.clientY - d.y) * 0.04, 13, 28); d.x = e.clientX; d.y = e.clientY; } };
  const onUp = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) { if (useDb.getState().phase === 'boat') live.rudder = 0; drag.current = null; } };

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dce8f0]" style={{ touchAction: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Canvas dpr={dprFor(tier)} gl={{ antialias: tier === 'high' }} camera={{ fov: 58, near: 0.3, far: 6000, position: [-60, 20, 560] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.9; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} onPick={pick} /><SkyEnvironment sky="#dce8f0" sun="#fff3e2" ground="#6f8f9c" sunDir={[-0.5, 0.6, 0.5]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopBar onExit={onExit}>
        <button onClick={() => { audio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {S.phase === 'boat' && <div className="mx-auto rounded-full bg-black/45 px-3 py-2 text-xs text-white"><Anchor size={12} className="mr-1 inline" />İskeleye {Math.max(0, Math.round(S.dist))} m</div>}
        {S.phase === 'island' && <div className="mx-auto max-w-[70vw] rounded-2xl bg-black/50 px-3 py-2 text-center text-xs text-white"><p className="flex items-center justify-center gap-1 font-semibold text-amber-300"><Search size={12} /> Kabartma {Math.min(S.found.length + 1, TARGETS.length)}/{TARGETS.length}</p>{next ? <p className="mt-0.5">{next.clue}</p> : <p className="mt-0.5">Bütün sahneleri buldun.</p>}</div>}
      </TopBar>
      {S.phase === 'boat' && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-white">Sağa-sola sürükle: dümen · rüzgâr tekneyi doğuya iter<span className="hidden [@media(pointer:fine)]:inline"> · A/D</span></p>}
      {S.phase === 'island' && !S.card && <p className="pointer-events-none absolute bottom-6 left-1/2 w-max max-w-[92vw] -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-center text-xs text-white">{S.wrong ?? <>Yatay sürükle: kilisenin çevresinde dön · dikey: yaklaş · kabartmaya dokun<span className="hidden [@media(pointer:fine)]:inline"> · A/D, W/S</span></>}</p>}
      {S.card && <InfoCard kicker={`Kabartma ${S.found.indexOf(S.card.id) + 1} / ${TARGETS.length}`} title={S.card.name} text={S.card.text} source={{ title: 'Wikipedia — Akdamar Kilisesi', url: 'https://tr.wikipedia.org/wiki/Akdamar_Kilisesi' }} onClose={close} />}
      {S.phase === 'title' && <TitleCard kicker="Van · Gevaş · Van Gölü" title="Akdamar: Taştaki Hikâyeler" note="Mesafeler kısaltılmıştır; kabartmalar gerçeklerinden esinlenilmiş sade çizimlerdir." cta="Tekneye bin" icon={<Ship size={18} />} onStart={() => { audio.unlock(); S.set({ phase: 'boat' }); }}>
        <p>Van Gölü’ndeki Akdamar Adası’na tekneyle geç. 10. yüzyıldan kalma kilisenin dış duvarları taşa oyulmuş hikâyelerle kaplıdır: ipuçlarını izle, doğru kabartmayı bul.</p>
        <p className="mt-2 text-xs text-white/60">Teknede sağa-sola sürükle: dümen · adada sürükle: kilisenin çevresinde dön · kabartmaya dokun</p></TitleCard>}
      {S.phase === 'island' && S.found.length === TARGETS.length && !S.endShown && !S.card && <EndCard kicker="Hikâye kuşağı tamam" title="Taştaki hikâyeleri okudun" text="Kral Gagik’ten Yunus’a, asma kuşağına kadar beş sahneyi buldun. Kilise 2005–2007’deki restorasyondan sonra müze olarak açıldı." onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- kabartma çizimleri (canvas): kırmızımsı taş üstünde sade silüetler ---------- */
function reliefTex(id: Scene, w: number, h: number) {
  const W = Math.round(256 * Math.max(1, w / h)), c = document.createElement('canvas'); c.width = W; c.height = id === 'asma' ? 64 : 256; const g = c.getContext('2d')!, Hh = c.height, r = rng(id.length * 13);
  g.fillStyle = '#a5614a'; g.fillRect(0, 0, W, Hh); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,220,200' : '40,15,10'},${r() * 0.12})`; g.fillRect(r() * W, r() * Hh, 2, 2); }
  g.fillStyle = '#c98a6e'; g.strokeStyle = '#c98a6e'; g.lineWidth = 7; g.lineCap = 'round'; g.shadowColor = 'rgba(40,10,5,.75)'; g.shadowOffsetX = 3; g.shadowOffsetY = 4; g.shadowBlur = 2;
  const man = (x: number, y: number, s: number) => { g.beginPath(); g.arc(x, y - 70 * s, 13 * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x - 18 * s, y - 52 * s); g.lineTo(x + 18 * s, y - 52 * s); g.lineTo(x + 24 * s, y); g.lineTo(x - 24 * s, y); g.closePath(); g.fill(); };
  const lion = (x: number, y: number, f: number) => { g.beginPath(); g.ellipse(x, y, 34, 15, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + f * 34, y - 14, 16, 0, Math.PI * 2); g.fill(); [-22, -8, 10, 24].forEach((dx) => g.fillRect(x + dx, y + 6, 6, 22)); };
  if (id === 'gagik') { man(110, 230, 1.9); g.fillRect(150, 110, 44, 34); g.beginPath(); g.moveTo(146, 110); g.lineTo(172, 82); g.lineTo(198, 110); g.fill(); g.beginPath(); g.moveTo(96, 92); [-20, -10, 0, 10, 20].forEach((d, i) => g.lineTo(110 + d, i % 2 ? 84 : 70)); g.lineTo(124, 92); g.fill(); }
  if (id === 'yunus') { g.beginPath(); g.ellipse(120, 150, 92, 42, -0.15, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(205, 130); g.lineTo(245, 95); g.lineTo(240, 180); g.closePath(); g.fill(); g.fillStyle = '#a5614a'; g.beginPath(); g.moveTo(28, 150); g.lineTo(70, 135); g.lineTo(70, 168); g.fill(); g.fillStyle = '#c98a6e'; man(46, 135, 0.8); }
  if (id === 'davut') { man(70, 230, 0.95); g.beginPath(); g.moveTo(90, 140); g.lineTo(120, 110); g.stroke(); man(180, 236, 2.1); g.fillRect(212, 70, 8, 150); }
  if (id === 'adem') { g.fillRect(122, 120, 12, 120); g.beginPath(); g.arc(128, 96, 46, 0, Math.PI * 2); g.fill(); man(60, 236, 1.4); man(196, 236, 1.4); }
  if (id === 'daniel') { man(128, 236, 1.5); lion(52, 200, 1); lion(204, 200, -1); }
  if (id === 'ibrahim') { man(80, 236, 1.6); man(150, 236, 0.9); g.beginPath(); g.ellipse(205, 200, 30, 16, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(232, 186, 12, 0, Math.PI * 2); g.fill(); }
  if (id === 'hayvan') { lion(128, 110, 1); g.beginPath(); g.ellipse(128, 200, 40, 18, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(80, 190); g.lineTo(64, 170); g.stroke(); }
  if (id === 'asma') { g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= W; x += 4) g.lineTo(x, 32 + Math.sin(x * 0.05) * 14); g.stroke(); for (let x = 30; x < W; x += 64) { for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (k % 3) * 7 - 7, 40 + Math.floor(k / 3) * 8, 5, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.ellipse(x + 30, 18, 10, 6, 0.5, 0, Math.PI * 2); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- 3B dünya ---------- */
function World({ tier, onPick }: { tier: Tier; onPick: (id: Scene) => void }) {
  return (
    <group>
      <Sky sunPosition={[-300, 260, 280]} turbidity={2.5} rayleigh={1.0} />
      <fog attach="fog" args={['#dce8f0', 500, 5200]} />
      <hemisphereLight args={['#eef6fb', '#6f8f9c', 0.95]} />
      <directionalLight position={[-300, 260, 280]} intensity={2.0} color="#fff3e2" />
      <Lake />
      <Shore />
      <Island tier={tier} />
      <Church onPick={onPick} />
      <AlmondTrees n={tier === 'low' ? 24 : 60} />
      <Pier />
      <BoatMesh />
      <Controller />
    </group>
  );
}
function Lake() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!, r = rng(4); g.fillStyle = '#808080'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.35})`; g.fillRect(r() * 128, r() * 128, 6 + r() * 14, 1.5); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 90); return t; }, []);
  useFrame((st) => { if (mat.current?.roughnessMap) mat.current.roughnessMap.offset.set(st.clock.elapsedTime * 0.004, st.clock.elapsedTime * 0.002); });
  return <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}><planeGeometry args={[9000, 9000]} /><meshStandardMaterial ref={mat} color="#2f86a6" roughness={0.35} roughnessMap={tex} metalness={0.15} /></mesh>;
}
/** Uzak kıyılar ve dağlar (Gevaş tarafı ve göl çevresi; temsilî) */
function Shore() {
  const hills = useMemo(() => { const r = rng(12), out: [number, number, number, number, boolean][] = []; for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + r() * 0.2, d = 1700 + r() * 1100; out.push([Math.sin(a) * d, -Math.cos(a) * d, 260 + r() * 420, 500 + r() * 500, r() > 0.6]); } return out; }, []);
  return (<group>
    {hills.map(([x, z, h, rad, snow], i) => <group key={i} position={[x, 0, z]}><mesh position={[0, h / 2, 0]}><coneGeometry args={[rad, h, 8]} /><meshStandardMaterial color="#9a8d78" roughness={1} flatShading /></mesh>{snow && <mesh position={[0, h * 0.86, 0]}><coneGeometry args={[rad * 0.28, h * 0.28, 8]} /><meshStandardMaterial color="#f3f5f7" roughness={0.9} flatShading /></mesh>}</group>)}
    <mesh position={[0, 4, 720]}><boxGeometry args={[2600, 10, 260]} /><meshStandardMaterial color="#a99b77" roughness={1} /></mesh>
    <mesh position={[-40, 1.2, 585]}><boxGeometry args={[6, 2, 30]} /><meshStandardMaterial color="#7a6a58" roughness={0.9} /></mesh>
  </group>);
}
function Island({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'low' ? 70 : 110, g = new THREE.PlaneGeometry(200, 200, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), rock = new THREE.Color('#8c7a66'), grass = new THREE.Color('#9fa067'), r = rng(8);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = islandHeight(x, z); p.setY(i, y); c.copy(y < 2 ? rock : grass).lerp(rock, r() * 0.3); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={1} flatShading /></mesh>;
}
/** Kilise: haç planlı gövde, üçgen çatılar, apsisler, on altı kenarlı kasnak ve konik külah; cephelerde kabartmalar */
function Church({ onPick }: { onPick: (id: Scene) => void }) {
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ map: ashlarTex(73, '#b2705a', 26, [9, 6]), roughness: 0.9 }), []);
  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8f5948', roughness: 0.85 }), []);
  const roof = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 3, 1).rotateX(-Math.PI / 2), []);   // üçgen prizma, mahya yukarıda
  const L = CHURCH_R * 2, H = 9;
  const pick = (id: Scene) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 12) onPick(id); };
  return (<group position={[0, BASE, 0]}>
    <mesh material={stone} position={[0, H / 2, 0]}><boxGeometry args={[ARM_W, H, L]} /></mesh>
    <mesh material={stone} position={[0, H / 2, 0]}><boxGeometry args={[L, H, ARM_W]} /></mesh>
    {[0, Math.PI / 2].map((a) => <mesh key={a} geometry={roof} material={roofMat} position={[0, H + 0.8, 0]} rotation-y={a} scale={[(ARM_W / 2 + 0.2) / 0.866, 1.6, L + 0.4]} />)}
    {[[1, 0]].map(([sx, sz], i) => <mesh key={i} material={stone} position={[sx * (CHURCH_R + 0.4), H * 0.4, sz * (CHURCH_R + 0.4)]} rotation-y={Math.atan2(sx, sz)}><cylinderGeometry args={[2.2, 2.2, H * 0.8, 12, 1, false, -Math.PI / 2, Math.PI]} /></mesh>)}
    <mesh material={stone} position={[0, H + 3.2, 0]}><cylinderGeometry args={[3.3, 3.3, 5, 16]} /></mesh>
    <mesh material={roofMat} position={[0, H + 7.4, 0]}><coneGeometry args={[3.8, 3.6, 16]} /></mesh>
    <mesh material={stone} position={[0, H * 0.98, 0]}><boxGeometry args={[L + 0.3, 0.35, ARM_W + 0.3]} /></mesh>
    <mesh material={stone} position={[0, H * 0.98, 0]}><boxGeometry args={[ARM_W + 0.3, 0.35, L + 0.3]} /></mesh>
    <mesh position={[0, 2, -CHURCH_R - 0.02]}><boxGeometry args={[1.6, 3.4, 0.1]} /><meshStandardMaterial color="#2a1610" /></mesh>
    {RELIEFS.map((r) => { const { p, rotY } = reliefPos(r); return <ReliefPanel key={r.id} r={r} p={p} rotY={rotY} onClick={pick(r.id)} />; })}
  </group>);
}
function ReliefPanel({ r, p, rotY, onClick }: { r: Relief; p: [number, number, number]; rotY: number; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const tex = useMemo(() => reliefTex(r.id, r.w, r.h), [r]), found = useDb((s) => s.found.includes(r.id));
  return <mesh position={p} rotation-y={rotY} onClick={onClick} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
    <planeGeometry args={[r.w, r.h]} /><meshStandardMaterial map={tex} roughness={0.85} emissive={found ? '#ffcc80' : '#000'} emissiveIntensity={found ? 0.18 : 0} polygonOffset polygonOffsetFactor={-2} /></mesh>;
}
/** Badem ağaçları (ada baharda badem çiçekleriyle bilinir) */
function AlmondTrees({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), trunk = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(29), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 6 && k < n; i++) { const a = r() * Math.PI * 2, d = 24 + r() * 36, x = Math.sin(a) * d, z = -Math.cos(a) * d * 0.85; const y = islandHeight(x, z); if (y < 1.5) continue; if (Math.abs(x - PIER[0]) < 6 && z > 30) continue;
    const s = 0.7 + r() * 0.6; o.position.set(x, y + 2.6 * s, z); o.scale.setScalar(s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); o.position.set(x, y + 1.2 * s, z); o.updateMatrix(); trunk.current?.setMatrixAt(k, o.matrix); k++; }
    for (const m of [ref.current, trunk.current]) if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return (<group>
    <instancedMesh ref={ref} args={[undefined, undefined, n]}><icosahedronGeometry args={[1.8, 0]} /><meshStandardMaterial color="#f4dfe6" roughness={0.9} flatShading /></instancedMesh>
    <instancedMesh ref={trunk} args={[undefined, undefined, n]}><cylinderGeometry args={[0.18, 0.25, 2.4, 5]} /><meshStandardMaterial color="#5a4436" roughness={1} /></instancedMesh>
  </group>);
}
function Pier() { return <mesh position={[PIER[0], 0.6, PIER[1] - 12]}><boxGeometry args={[4, 0.6, 26]} /><meshStandardMaterial color="#7a6550" roughness={0.9} /></mesh>; }
const boatRef: { current: THREE.Group | null } = { current: null };
function BoatMesh() {
  const g = useRef<THREE.Group>(null); useEffect(() => { boatRef.current = g.current; }, []);
  const hull = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, -4.2); s.quadraticCurveTo(1.7, -1.5, 1.5, 3.4); s.lineTo(-1.5, 3.4); s.quadraticCurveTo(-1.7, -1.5, 0, -4.2); const geo = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false }); geo.rotateX(Math.PI / 2); geo.translate(0, 0.9, 0); return geo; }, []);
  return (<group ref={g}>
    <mesh geometry={hull}><meshStandardMaterial color="#f2f0ea" roughness={0.6} /></mesh>
    <mesh position={[0, 0.95, 0]}><boxGeometry args={[2.8, 0.1, 6.4]} /><meshStandardMaterial color="#8a5a36" roughness={0.8} /></mesh>
    <mesh position={[0, 1.9, 1.2]}><boxGeometry args={[2.2, 1.8, 2.4]} /><meshStandardMaterial color="#2d6c8c" roughness={0.6} /></mesh>
    <mesh position={[0, 2.9, 1.2]}><boxGeometry args={[2.6, 0.15, 2.8]} /><meshStandardMaterial color="#e94e3c" roughness={0.6} /></mesh>
  </group>);
}

/* ---------- tekne + kamera ---------- */
const _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Vector3();
function Controller() {
  const { camera } = useThree(), sm = useRef({ pos: new THREE.Vector3(-60, 20, 560), look: new THREE.Vector3(0, 10, 0), splash: 0, lastDist: -1 });
  useFrame((st, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState(), t = st.clock.elapsedTime, k = 1 - Math.exp(-dt * 2.5);
    const b = live.boat, bob = Math.sin(t * 1.6) * 0.18;
    if (S.phase === 'boat') {
      live.boat = stepBoat(b, live.auto ? autoRudder(b) : live.rudder, dt);
      const d = Math.hypot(live.boat.x, live.boat.z); if (d > LAKE_LIMIT) { live.boat.x *= LAKE_LIMIT / d; live.boat.z *= LAKE_LIMIT / d; }
      if (Math.hypot(live.boat.x, live.boat.z * 1.2) < ISLAND.r + 2 && !arrived(live.boat)) { live.boat.x -= Math.sin(live.boat.heading) * 9 * dt * 2; live.boat.z += Math.cos(live.boat.heading) * 9 * dt * 2; }   // kayalara çarpmasın
      const dist = Math.hypot(live.boat.x - PIER[0], live.boat.z - PIER[1]); if (Math.abs(dist - sm.current.lastDist) > 4) { sm.current.lastDist = dist; S.set({ dist }); }
      if (arrived(live.boat)) { S.set({ phase: 'island' }); audio.tone(true); audio.speak('Akdamar Adası’na hoş geldin. Kilisenin duvarlarındaki hikâyeleri bul.'); }
    }
    const B = live.boat; if (boatRef.current) { boatRef.current.position.set(B.x, bob, B.z); boatRef.current.rotation.set(Math.sin(t * 1.1) * 0.04, -B.heading, Math.sin(t * 1.3) * 0.05); }
    if (S.phase === 'title') { camera.position.set(-140, 40, 300); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 14, 0), THREE.Object3D.DEFAULT_UP))); return; }
    if (S.phase === 'boat') { const fx = Math.sin(B.heading), fz = -Math.cos(B.heading); _p.set(B.x - fx * 16, 7, B.z - fz * 16); _l.set(B.x + fx * 30, 3, B.z + fz * 30); }
    else { if (S.card) { const want = reliefPos(S.card).orbit; live.orbit += wrapA(want - live.orbit) * k; }
      _p.set(Math.sin(live.orbit) * live.radius, BASE + 4.5 + (live.radius - 13) * 0.25, -Math.cos(live.orbit) * live.radius); _l.set(0, BASE + 6.2, 0); }
    sm.current.pos.lerp(_p, S.phase === 'boat' ? k : 1 - Math.exp(-dt * 8)); sm.current.look.lerp(_l, k);
    camera.position.copy(sm.current.pos); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, sm.current.look, THREE.Object3D.DEFAULT_UP)));
  });
  return null;
}
