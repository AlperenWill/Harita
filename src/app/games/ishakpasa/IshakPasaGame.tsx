/**
 * İshak Paşa Sarayı — "Taşın Nakışı". Ana yönetici.
 *
 * Taç kapıdan gir; selamlık → türbe → cami → harem → teras. Her durakta aşınmış bir süsleme panosu var:
 * 3×3 parçayı dokunarak çevir, motifi tamamla. Tamamlanan motif saraydaki panoya oturur ve bilgi kartı açılır.
 * KAMERA: birinci şahıs, rotaya kilitli (Troya, Ani ile aynı şema). Bulmaca açıkken yürüme durur.
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Puzzle, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { CENTER, GRID, ROUTE_LEN, STOPS, heightAt, isSolved, nearStop, rotateTile, routeAt, scramble, type Motif, type Stop } from './site';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { EndCard, Hint, InfoCard, TitleCard, TopBar, WalkAudio, WikiFallback, ashlarTex, bicolorTex, detectTier, dprFor, newLive, pinned, rng, stepWalk, supportsWebGL, useWalkInput, wrapA, type CamState, type Tier } from '../shared/walkKit';

const audio = new WalkAudio({ freq: 380, gain: 0.1 }, 'male');
interface S { started: boolean; done: string[]; near: Stop | null; puzzle: Stop | null; tiles: number[]; card: Stop | null; muted: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, done: [] as string[], near: null, puzzle: null, tiles: [] as number[], card: null, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, set: (p) => set(p) }));
const live = newLive();

/* ---------- motif çizimleri (canvas): sivri kemerli çerçeve + üstten ışık → parçaların yönü okunur ---------- */
const motifCache = new Map<Motif, string>();
export function motifURL(kind: Motif): string {
  const hit = motifCache.get(kind); if (hit) return hit;
  const N = 240, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d')!, cx = N / 2, cy = N / 2 + 10;
  const bg = g.createLinearGradient(0, 0, 0, N); bg.addColorStop(0, '#f1e2c2'); bg.addColorStop(1, '#c9ab7c'); g.fillStyle = bg; g.fillRect(0, 0, N, N);
  g.strokeStyle = '#7a5532'; g.fillStyle = '#9c7347'; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(16, N - 14); g.lineTo(16, 92); g.quadraticCurveTo(18, 30, cx, 12); g.quadraticCurveTo(N - 18, 30, N - 16, 92); g.lineTo(N - 16, N - 14); g.closePath(); g.stroke();   // sivri kemer
  g.lineWidth = 4;
  if (kind === 'yildiz') { for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + k * Math.PI / 4; g.lineTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); } g.closePath(); g.stroke(); } g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); g.lineTo(cx + Math.cos(a) * 98, cy + Math.sin(a) * 98); g.stroke(); } }
  if (kind === 'rumi') { for (let i = 0; i < 3; i++) { const y = 70 + i * 55; g.beginPath(); for (let x = 30; x <= N - 30; x += 4) g.lineTo(x, y + Math.sin(x * 0.06 + i) * 14); g.stroke(); for (let x = 50; x < N - 30; x += 46) { g.beginPath(); g.arc(x, y + Math.sin(x * 0.06 + i) * 14 - 10, 9, Math.PI * 0.2, Math.PI * 1.6); g.stroke(); g.beginPath(); g.ellipse(x + 10, y - 22 + Math.sin(x * 0.06 + i) * 14, 6, 11, 0.7, 0, Math.PI * 2); g.fill(); } } }
  if (kind === 'rozet') { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46, 30, 11, a, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.arc(cx, cy, 20, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(cx, cy, 88, 0, Math.PI * 2); g.stroke(); }
  if (kind === 'lale') { g.beginPath(); g.moveTo(cx, N - 22); g.lineTo(cx, 70); g.stroke(); for (let i = 0; i < 3; i++) { const y = 190 - i * 40; [-1, 1].forEach((s) => { g.beginPath(); g.moveTo(cx, y); g.quadraticCurveTo(cx + s * 50, y - 10, cx + s * 62, y - 40); g.stroke(); g.beginPath(); g.ellipse(cx + s * 64, y - 48, 9, 16, s * 0.3, 0, Math.PI * 2); g.fill(); }); } g.beginPath(); g.moveTo(cx - 22, 70); g.quadraticCurveTo(cx - 24, 34, cx, 28); g.quadraticCurveTo(cx + 24, 34, cx + 22, 70); g.quadraticCurveTo(cx, 58, cx - 22, 70); g.fill(); }
  if (kind === 'mukarnas') { for (let row = 0; row < 5; row++) { const n = 5 - row, w = 180 / 5, y = 50 + row * 36; for (let i = 0; i < n; i++) { const x = cx - (n * w) / 2 + i * w; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y + 12); g.quadraticCurveTo(x + w / 2, y - 8, x + w, y + 12); g.lineTo(x + w, y + 30); g.stroke(); g.fillStyle = `rgba(90,60,30,${0.15 + row * 0.08})`; g.fill(); } } g.fillStyle = '#9c7347'; }
  if (kind === 'zincir') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(48 + i * 48, 70 + j * 44, 26, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI * 2); g.fill(); }
  const r = rng(kind.length * 31); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(60,40,20,${r() * 0.12})`; g.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
  const url = c.toDataURL(); motifCache.set(kind, url); return url;
}

export default function IshakPasaGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <WikiFallback wiki="İshak Paşa Sarayı" alt="İshak Paşa Sarayı" items={STOPS} onExit={onExit} speak={(t) => audio.speak(t)} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  useEffect(() => { audio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, newLive()); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const tap = useCallback((i: number) => { const s = useDb.getState(), p = s.puzzle; if (!p || i === CENTER) return; const tiles = rotateTile(s.tiles, i); audio.click();
    if (isSolved(tiles)) { audio.tone(true); s.set({ tiles, puzzle: null, card: p, done: [...s.done, p.id] }); audio.speak(`${p.name}. ${p.text}`); } else s.set({ tiles }); }, []);
  const solveAll = useCallback(() => { const s = useDb.getState(); if (!s.puzzle) return; s.tiles.forEach((v, i) => { for (let k = 0; k < (4 - v) % 4; k++) tap(i); }); }, [tap]);
  const input = useWalkInput(live, () => useDb.getState().started, (e) => { const s = useDb.getState(); if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); }, () => audio.unlock());
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __ishak: unknown }).__ishak = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, tap, solveAll, state: () => ({ ...useDb.getState(), s: live.s }), STOPS, ROUTE_LEN }; }, [tap, solveAll]);

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#e3e8ec]" style={{ touchAction: 'none' }} {...input} onPointerCancel={input.onPointerUp}>
      <Canvas dpr={dprFor(tier)} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 6000, position: [120, 30, 90] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.88; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} done={S.done} /><SkyEnvironment sky="#e3e8ec" sun="#fff1dc" ground="#a8956a" sunDir={[0.5, 0.6, 0.6]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopBar onExit={onExit}>
        <button onClick={() => { audio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {S.started && <div className="mx-auto flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-xs text-white"><Sparkles size={14} /> Nakışlar · {S.done.length}/{STOPS.length}
          <span className="flex gap-0.5">{STOPS.map((x) => <span key={x.id} className={`h-2 w-2 rounded-full ${S.done.includes(x.id) ? 'bg-amber-300' : 'bg-white/25'}`} />)}</span></div>}
      </TopBar>
      {S.puzzle && <PuzzlePanel stop={S.puzzle} tiles={S.tiles} onTap={tap} onLeave={() => S.set({ puzzle: null })} />}
      {S.started && !S.puzzle && !S.card && S.near && !S.done.includes(S.near.id) && <button onPointerDown={(e) => e.stopPropagation()} onClick={() => S.set({ puzzle: S.near })} className="absolute bottom-16 left-1/2 z-30 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-amber-300 px-5 font-semibold text-black shadow-lg"><Puzzle size={18} /> Nakışı onar</button>}
      {S.started && !S.puzzle && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak<span className="hidden [@media(pointer:fine)]:inline"> · W/S · fareyle bak</span></Hint>}
      {S.card && <InfoCard kicker={`Nakış ${S.done.indexOf(S.card.id) + 1} / ${STOPS.length} · ${S.card.motifName}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} />}
      {!S.started && <TitleCard kicker="Ağrı · Doğubayazıt · 18. yüzyıl" title="İshak Paşa Sarayı: Taşın Nakışı" note="Plan stilizedir; motifler saraydaki süslemelerden esinlenilmiş temsilî çizimlerdir." cta="Taç kapıdan gir" icon={<Puzzle size={18} />} onStart={() => { audio.unlock(); S.set({ started: true }); }}>
        <p>Ağrı Dağı’na bakan sarayın avlularını gez. Her durakta yüzyıllar içinde aşınmış bir taş süsleme var: parçalara dokunarak çevir, motifi tamamla, panoyu yerine oturt.</p>
        <p className="mt-2 text-xs text-white/60">Dikey sürükle ya da W/S: ileri/geri · yatay sürükle ya da fare: bak · parçaya dokun: çevir</p></TitleCard>}
      {S.started && S.done.length === STOPS.length && !S.endShown && !S.card && <EndCard kicker="Bütün nakışlar tamam" title="Saray yeniden süslendi" text="Taç kapıdan terasa kadar altı süsleme panosunu tamamladın. Sarayda Osmanlı, Selçuklu ve İran ustalarının izleri yan yana durur." onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- bulmaca paneli ---------- */
function PuzzlePanel({ stop, tiles, onTap, onLeave }: { stop: Stop; tiles: number[]; onTap: (i: number) => void; onLeave: () => void }) {
  const url = motifURL(stop.motif), size = 'min(72vw, 300px, 46vh)';
  return (
    <div className="absolute inset-x-3 bottom-4 z-40 mx-auto max-w-sm" onPointerDown={(e) => e.stopPropagation()}>
      <div className="rounded-2xl border border-white/15 bg-[#2a2016]/90 p-4 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start gap-2"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">Nakış bulmacası · {stop.name}</p><h2 className="text-base font-bold">{stop.motifName}</h2></div>
          <button onClick={onLeave} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10" aria-label="Bulmacayı kapat"><X size={16} /></button></div>
        <div className="mx-auto mt-3 grid gap-[3px] rounded-lg bg-[#5a4128] p-[3px]" style={{ width: size, height: size, gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {tiles.map((r, i) => <button key={i} onClick={() => onTap(i)} aria-label={`Parça ${i + 1}${i === CENTER ? ' (sabit)' : ''}`} className={`relative overflow-hidden rounded-sm transition-transform duration-200 ${i === CENTER ? 'ring-2 ring-amber-300/70' : 'active:scale-95'}`}
            style={{ backgroundImage: `url(${url})`, backgroundSize: `${GRID * 100}% ${GRID * 100}%`, backgroundPosition: `${((i % GRID) / (GRID - 1)) * 100}% ${(Math.floor(i / GRID) / (GRID - 1)) * 100}%`, transform: `rotate(${r * 90}deg)` }} />)}
        </div>
        <p className="mt-2 text-center text-xs text-white/60">Parçaya dokun: 90° döner. Ortadaki parça sabit; kemer yukarıda, ışık üstten gelir.</p>
      </div>
    </div>
  );
}

/* ---------- 3B dünya ---------- */
function World({ tier, done }: { tier: Tier; done: string[] }) {
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ map: ashlarTex(51, '#d2b98e', 34, [8, 8]), roughness: 0.9 }), []);
  const stoneDark = useMemo(() => new THREE.MeshStandardMaterial({ map: ashlarTex(53, '#b0926a', 30, [8, 8]), roughness: 0.92 }), []);
  const stripe = useMemo(() => new THREE.MeshStandardMaterial({ map: bicolorTex(57, '#d6be95', '#8a4a35', 'rows'), roughness: 0.9 }), []);
  return (
    <group>
      <Sky sunPosition={[200, 220, 260]} turbidity={3} rayleigh={1.2} />
      <fog attach="fog" args={['#e3e8ec', 400, 5200]} />
      <hemisphereLight args={['#f2f6fa', '#9c8a60', 1.0]} />
      <directionalLight position={[200, 220, 260]} intensity={2.0} color="#fff1dc" />
      <Terrain tier={tier} />
      <Mountain />
      <Palace stone={stone} dark={stoneDark} stripe={stripe} />
      <OldFortress mat={stoneDark} />
      {STOPS.map((s) => <Panel key={s.id} stop={s} done={done.includes(s.id)} />)}
      <Controller />
    </group>
  );
}
function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 220 : tier === 'medium' ? 170 : 120, g = new THREE.PlaneGeometry(900, 900, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), dry = new THREE.Color('#bfae7c'), rock = new THREE.Color('#8a7358'), plain = new THREE.Color('#a9a067'), r = rng(9);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y); c.copy(dry).lerp(y > 6 ? rock : y < -8 ? plain : dry, 0.7).lerp(rock, r() * 0.15); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={1} flatShading={tier === 'low'} /></mesh>;
}
/** Ağrı Dağı: uzakta karlı koni (Büyük Ağrı) ve yanında Küçük Ağrı — ölçekli değil */
function Mountain() {
  return (<group position={[900, 0, -3400]}>
    <mesh position={[0, 650, 0]}><coneGeometry args={[1900, 1300, 40, 1]} /><meshStandardMaterial color="#8d8a8c" roughness={1} flatShading /></mesh>
    <mesh position={[0, 1100, 0]}><coneGeometry args={[720, 494, 40, 1]} /><meshStandardMaterial color="#f4f6f8" roughness={0.8} flatShading /></mesh>
    <mesh position={[-1700, 380, 700]}><coneGeometry args={[1000, 760, 30, 1]} /><meshStandardMaterial color="#8a8486" roughness={1} flatShading /></mesh>
  </group>);
}
/** Saray: birinci avlu (doğu), iç avlu (batı), selamlık, cami + iki renkli minare, türbe, harem, taç kapı */
function Palace({ stone, dark, stripe }: { stone: THREE.Material; dark: THREE.Material; stripe: THREE.Material }) {
  const B = ({ p, s, m = stone }: { p: [number, number, number]; s: [number, number, number]; m?: THREE.Material }) => <mesh material={m} position={[p[0], p[1] + s[1] / 2, p[2]]}><boxGeometry args={s} /></mesh>;
  return (<group>
    <mesh position={[-10, -0.3, 0]} material={dark}><boxGeometry args={[110, 0.6, 62]} /></mesh>
    {/* dış duvarlar (geçitlerde boşluk) */}
    <B p={[40, 0, -13]} s={[3, 9, 20]} /><B p={[40, 0, 13]} s={[3, 9, 20]} />
    <B p={[0, 0, -14]} s={[2.4, 9, 16]} /><B p={[0, 0, 14]} s={[2.4, 9, 16]} />
    <B p={[20, 0, 23]} s={[40, 8, 2.4]} /><B p={[-12, 0, 23]} s={[24, 8, 2.4]} /><B p={[-34, 0, 23]} s={[12, 8, 2.4]} />
    {/* taç kapı: yüksek kütle, derin niş, mukarnas izi */}
    <B p={[41.5, 0, 0]} s={[4, 16, 12]} />
    <mesh position={[43.55, 5, 0]}><boxGeometry args={[0.2, 10, 4.4]} /><meshStandardMaterial color="#3b2a1d" /></mesh>
    {[0, 1, 2, 3].map((k) => <mesh key={k} material={dark} position={[43.6, 10.4 + k * 0.9, 0]}><boxGeometry args={[0.3, 0.8, 5.6 - k * 1.2]} /></mesh>)}
    {/* ikinci kapı */}
    <B p={[0, 0, 0]} s={[3, 13, 6]} m={dark} />
    {/* selamlık */}
    <B p={[20, 0, -30]} s={[36, 11, 12]} />
    {[8, 14, 26, 32].map((x) => <mesh key={x} position={[x, 6, -23.9]}><boxGeometry args={[1.6, 2.4, 0.1]} /><meshStandardMaterial color="#2c1f15" /></mesh>)}
    {/* cami + kubbe + minare */}
    <B p={[-22, 0, -30]} s={[18, 10, 14]} />
    <mesh material={stone} position={[-22, 10, -30]}><cylinderGeometry args={[5.5, 6, 2.5, 16]} /></mesh>
    <mesh material={stone} position={[-22, 11.2, -30]}><sphereGeometry args={[5.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    <mesh material={stripe} position={[-9, 11, -34]}><cylinderGeometry args={[1.5, 1.7, 22, 12]} /></mesh>
    <mesh material={stone} position={[-9, 18, -34]}><cylinderGeometry args={[2.1, 2.1, 0.8, 12]} /></mesh>
    <mesh material={dark} position={[-9, 23.2, -34]}><coneGeometry args={[1.6, 3.6, 12]} /></mesh>
    {/* türbe: sekizgen gövde + külah */}
    <group position={[-16, 0, -10]}><mesh material={stone} position={[0, 3.6, 0]}><cylinderGeometry args={[3.2, 3.4, 7.2, 8]} /></mesh><mesh material={dark} position={[0, 8.6, 0]}><coneGeometry args={[3.6, 3.6, 8]} /></mesh><mesh material={stone} position={[0, 0.6, 0]}><cylinderGeometry args={[4, 4, 1.2, 8]} /></mesh></group>
    {/* harem + tören salonu */}
    <B p={[-56, 0, 0]} s={[28, 13, 44]} />
    {[-14, -7, 0, 7, 14].map((z) => <mesh key={z} position={[-41.9, 7.5, z]}><boxGeometry args={[0.1, 3, 1.8]} /><meshStandardMaterial color="#2c1f15" /></mesh>)}
    {[-15, 0, 15].map((z) => <B key={z} p={[-56, 13, z]} s={[24, 2.2, 8]} m={dark} />)}
  </group>);
}
/** Arkadaki kayalıkta Eski Bayazıt kalesinin sur kalıntıları (temsilî) */
function OldFortress({ mat }: { mat: THREE.Material }) {
  const segs = useMemo(() => { const r = rng(91), out: [number, number, number, number][] = []; for (let i = 0; i < 9; i++) { const x = -150 + i * 22, z = -130 - r() * 20 + i * 4; out.push([x, z, 4 + r() * 6, r() * 0.5]); } return out; }, []);
  return <group>{segs.map(([x, z, h, a], i) => <mesh key={i} material={mat} position={[x, heightAt(x, z) + h / 2 - 0.5, z]} rotation-y={a}><boxGeometry args={[16, h, 3]} /></mesh>)}</group>;
}
/** Süsleme panosu: önce aşınmış düz taş; bulmaca çözülünce motif dokusu */
function Panel({ stop, done }: { stop: Stop; done: boolean }) {
  const tex = useMemo(() => { const t = new THREE.TextureLoader().load(motifURL(stop.motif)); t.colorSpace = THREE.SRGBColorSpace; return t; }, [stop.motif]);
  const worn = useMemo(() => ashlarTex(stop.id.length * 7, '#a58c68', 20, [30, 20]), [stop.id]);
  const { at, yaw, size } = stop.panel;
  return <group position={at} rotation-y={yaw}>
    {stop.id === 'teras' && <mesh position={[0, -1.05, -0.3]}><boxGeometry args={[2.4, 2.1, 0.5]} /><meshStandardMaterial color="#b0926a" roughness={0.95} /></mesh>}
    <mesh position={[0, 0, -0.06]}><boxGeometry args={[size + 0.35, size + 0.35, 0.12]} /><meshStandardMaterial color="#7a5c3c" roughness={0.9} /></mesh>
    <mesh><planeGeometry args={[size, size]} /><meshStandardMaterial map={done ? tex : worn} roughness={0.85} emissive={done ? '#5a3c18' : '#000'} emissiveIntensity={done ? 0.25 : 0} polygonOffset polygonOffsetFactor={-2} /></mesh></group>;
}

/* ---------- hareket + kamera ---------- */
const _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
function Controller() {
  const { camera } = useThree(), cs = useRef<CamState>({ step: 0, bob: 0, head: NaN }), last = useRef('');
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    if (!S.started) { camera.position.set(110, 26, 70); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 6, -6), THREE.Object3D.DEFAULT_UP))); return; }
    if (stepWalk(camera, live, cs.current, { ROUTE_LEN, routeAt }, dt, !S.card && !S.puzzle, 3.2)) audio.step(800);
    const n = nearStop(live.s), id = n?.id ?? '';
    const focus = S.puzzle ?? S.card;   // bulmaca/kart açıkken kamera panoya döner: tamamlanan motif görünür
    if (focus) { const [px, py, pz] = focus.panel.at, dx = px - camera.position.x, dz = pz - camera.position.z, want = wrapA(Math.atan2(-dx, -dz) - cs.current.head);
      live.yaw += wrapA(want - live.yaw) * (1 - Math.exp(-dt * 3)); live.pitch += (THREE.MathUtils.clamp(Math.atan2(py - camera.position.y + (S.puzzle ? -1.2 : 0), Math.hypot(dx, dz)), -0.5, 0.5) - live.pitch) * (1 - Math.exp(-dt * 3)); }
    if (id !== last.current) { last.current = id;
      if (n && !S.done.includes(n.id)) S.set({ near: n, puzzle: n, tiles: scramble(STOPS.indexOf(n) + 1), card: null });
      else S.set({ near: n, ...(n ? {} : { card: null, puzzle: null }) }); }
  });
  return null;
}
