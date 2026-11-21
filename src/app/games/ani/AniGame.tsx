/**
 * Ani — "Bin Bir Kilise Kenti". Ana yönetici.
 *
 * Oyuncu belgeleme ekibinin fotoğrafçısıdır. Aslanlı Kapı'dan girer, plato boyunca güneye yürür:
 * surlar → Katedral → Ebul Menuçehr Camii → Tigran Honents → Arpaçay Köprüsü kalıntısı → Kız Kalesi.
 * MEKANİK: her noktada vizör açılır; yapıyı ekranın ortasına (yatay yön) alınca deklanşör yanar, çekince albüme girer ve kart açılır.
 * KAMERA: birinci şahıs, rotaya kilitli (Troya, Efes ile aynı şema).
 */
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor, Sky } from '@react-three/drei';
import { create } from 'zustand';
import { Camera, Images, Volume2, VolumeX } from 'lucide-react';
import { GORGE_DEPTH, ROUTE_LEN, SHOTS, WALL_Z, AIM_TOL, aimError, edgeDist, heightAt, nearShot, routeAt, type Shot } from './site';
import { Polish, SkyEnvironment } from '../shared/Polish';
import { EndCard, Hint, InfoCard, TitleCard, TopBar, WalkAudio, WikiFallback, ashlarTex, bicolorTex, detectTier, dprFor, newLive, pinned, rng, stepWalk, supportsWebGL, useWalkInput, type CamState, type Tier } from '../shared/walkKit';

const audio = new WalkAudio({ freq: 420, gain: 0.11 }, 'female');
interface S { started: boolean; album: string[]; near: Shot | null; framed: boolean; card: Shot | null; flash: number; muted: boolean; endShown: boolean; set: (p: Partial<S>) => void }
const INITIAL = { started: false, album: [] as string[], near: null, framed: false, card: null, flash: 0, endShown: false };
const useDb = create<S>((set) => ({ ...INITIAL, muted: false, set: (p) => set(p) }));
const live = newLive();

export default function AniGame({ onExit }: { onExit: () => void }) {
  if (!supportsWebGL) return <WikiFallback wiki="Ani" alt="Ani" items={SHOTS} onExit={onExit} speak={(t) => audio.speak(t)} />;
  return <Game onExit={onExit} />;
}
function Game({ onExit }: { onExit: () => void }) {
  const [tier, setTier] = useState<Tier>(detectTier), S = useDb();
  useEffect(() => { audio.setMuted(S.muted); }, [S.muted]);
  useEffect(() => () => { audio.dispose(); useDb.setState(INITIAL); Object.assign(live, newLive()); }, []);
  const close = useCallback(() => { useDb.getState().set({ card: null }); audio.hush(); }, []);
  const shoot = useCallback(() => { const s = useDb.getState(), n = s.near; if (!n || !s.framed || s.album.includes(n.id)) return;
    audio.click(); audio.tone(true); s.set({ album: [...s.album, n.id], card: n, flash: Date.now() }); audio.speak(`${n.name}. ${n.text}`); }, []);
  const input = useWalkInput(live, () => useDb.getState().started, (e) => { const s = useDb.getState(); if ((e.code === 'Escape' || e.code === 'KeyE') && s.card) close(); if (e.code === 'Space' || e.code === 'Enter') shoot(); }, () => audio.unlock());
  useEffect(() => { if (location.search.includes('debug')) (window as unknown as { __ani: unknown }).__ani = { go: (s: number) => { live.s = s; useDb.getState().set({ started: true }); }, look: (y: number, p = 0) => { live.yaw = y; live.pitch = p; }, shoot, state: () => ({ ...useDb.getState(), s: live.s, yaw: live.yaw, pitch: live.pitch }), SHOTS, ROUTE_LEN }; }, [shoot]);
  const pending = S.near && !S.album.includes(S.near.id) && !S.card;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#dfe6ea]" style={{ touchAction: 'none' }} {...input} onPointerCancel={input.onPointerUp}>
      <Canvas dpr={dprFor(tier)} gl={{ antialias: tier === 'high' }} camera={{ fov: 62, near: 0.1, far: 2200, position: [60, 30, -260] }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.9; }}>
        {!pinned && <PerformanceMonitor bounds={() => [28, 55]} flipflops={2} onDecline={() => setTier((t) => (t === 'high' ? 'medium' : 'low'))} />}
        <Suspense fallback={null}><World tier={tier} /><SkyEnvironment sky="#dfe6ea" sun="#fff3e0" ground="#a59a68" sunDir={[0.6, 0.55, -0.4]} /><Polish tier={tier} /></Suspense>
      </Canvas>
      <TopBar onExit={onExit}>
        <button onClick={() => { audio.unlock(); S.set({ muted: !S.muted }); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white" aria-label={S.muted ? 'Sesi aç' : 'Sesi kapat'}>{S.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        {S.started && <div className="mx-auto flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 text-xs text-white"><Images size={14} /> Belge albümü · {S.album.length}/{SHOTS.length}
          <span className="flex gap-0.5">{SHOTS.map((x) => <span key={x.id} className={`h-2 w-2 rounded-full ${S.album.includes(x.id) ? 'bg-amber-300' : 'bg-white/25'}`} />)}</span></div>}
      </TopBar>
      {pending && <Viewfinder name={S.near!.name} framed={S.framed} onShoot={shoot} />}
      {S.flash > 0 && <Flash key={S.flash} />}
      {S.started && !pending && !S.card && <Hint>Dikey sürükle: yürü · yatay: bak<span className="hidden [@media(pointer:fine)]:inline"> · W/S · fareyle bak · Boşluk: çek</span></Hint>}
      {S.card && <InfoCard kicker={`Fotoğraf ${S.album.indexOf(S.card.id) + 1} / ${SHOTS.length}`} title={S.card.name} text={S.card.text} source={S.card.source} onClose={close} />}
      {!S.started && <TitleCard kicker="Kars · Arpaçay kıyısı · UNESCO Dünya Mirası" title="Ani: Bin Bir Kilise Kenti" note="Plan stilizedir; yapılar ve kanyonlar ölçekli değildir." cta="Surlardan gir" icon={<Camera size={18} />} onStart={() => { audio.unlock(); S.set({ started: true }); }}>
        <p>İki kanyonun arasındaki platoda kurulmuş Ortaçağ başkenti Ani’yi belgeleme ekibinin fotoğrafçısı olarak gez. Her yapının yanında vizör açılır: yapıyı ortala, deklanşöre bas, albümü doldur.</p>
        <p className="mt-2 text-xs text-white/60">Dikey sürükle ya da W/S: ileri/geri · yatay sürükle ya da fare: bak · Boşluk: fotoğraf çek</p></TitleCard>}
      {S.started && S.album.length === SHOTS.length && !S.endShown && !S.card && <EndCard kicker="Belge albümü tamam" title="Ani kayda geçti" text="Surlardan Kız Kalesi’ne kadar kentin altı yapısını belgeledin. Ani’de bunlardan çok daha fazlası var: ‘bin bir kilise’ deyişi abartılı olsa da kentte onlarca yapı kalıntısı durur." onStay={() => S.set({ endShown: true })} onExit={onExit} />}
    </div>
  );
}

/* ---------- arayüz: vizör ve flaş ---------- */
function Viewfinder({ name, framed, onShoot }: { name: string; framed: boolean; onShoot: () => void }) {
  const c = framed ? 'border-amber-300' : 'border-white/70';
  return (<>
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-[38vmin] w-[54vmin] -translate-x-1/2 -translate-y-1/2">
      {['left-0 top-0 border-l-4 border-t-4', 'right-0 top-0 border-r-4 border-t-4', 'left-0 bottom-0 border-l-4 border-b-4', 'right-0 bottom-0 border-r-4 border-b-4'].map((k) => <span key={k} className={`absolute h-8 w-8 ${k} ${c} transition-colors`} />)}
      <span className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${c}`} />
    </div>
    <div className="absolute inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
      <p className="rounded-full bg-black/50 px-4 py-1.5 text-center text-xs text-white">{framed ? `${name} vizörde, çek!` : `${name}: yapıyı vizörün ortasına al (yatay sürükle)`}</p>
      <button onClick={onShoot} disabled={!framed} className={`grid h-16 w-16 place-items-center rounded-full border-4 border-white transition ${framed ? 'bg-amber-300 text-black active:scale-90' : 'bg-white/20 text-white/60'}`} aria-label="Fotoğraf çek"><Camera size={26} /></button>
    </div>
  </>);
}
function Flash() { const [o, setO] = useState(0.85); useEffect(() => { const t = setTimeout(() => setO(0), 30); return () => clearTimeout(t); }, []); return <div className="pointer-events-none absolute inset-0 z-30 bg-white transition-opacity duration-500" style={{ opacity: o }} />; }

/* ---------- 3B dünya ---------- */
function World({ tier }: { tier: Tier }) {
  const tuff = useMemo(() => ashlarTex(31, '#8c5a45', 34), []), tuffDark = useMemo(() => ashlarTex(37, '#5e4038', 30), []), wallTex = useMemo(() => ashlarTex(41, '#9a7055', 40, [7, 8]), []);
  const red = useMemo(() => new THREE.MeshStandardMaterial({ map: tuff, roughness: 0.92 }), [tuff]), dark = useMemo(() => new THREE.MeshStandardMaterial({ map: tuffDark, roughness: 0.95 }), [tuffDark]);
  const wall = useMemo(() => { const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(8, 1.2); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); }, [wallTex]);
  return (
    <group>
      <Sky sunPosition={[300, 200, -200]} turbidity={3} rayleigh={1.1} />
      <fog attach="fog" args={['#dfe6ea', 320, 1800]} />
      <hemisphereLight args={['#eef4f8', '#8f8458', 1.0]} />
      <directionalLight position={[300, 220, -200]} intensity={2.1} color="#fff3e0" />
      <Terrain tier={tier} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -GORGE_DEPTH + 1.2, 0]}><planeGeometry args={[2400, 2400]} /><meshStandardMaterial color="#5f8a8f" roughness={0.3} /></mesh>
      <Walls mat={wall} accent={dark} />
      <Cathedral mat={red} />
      <Mosque mat={red} accent={dark} />
      <Tigran mat={red} accent={dark} />
      <Bridge mat={dark} />
      <MaidenCastle mat={red} />
      <Ruins mat={red} n={tier === 'low' ? 6 : 12} />
      <Rubble n={tier === 'low' ? 140 : 360} />
      <Controller />
    </group>
  );
}
function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 260 : tier === 'medium' ? 200 : 140, g = new THREE.PlaneGeometry(1100, 1100, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 60);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), steppe = new THREE.Color('#b3a868'), dry = new THREE.Color('#c9b98a'), rock = new THREE.Color('#6b4f43'), r = rng(5);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z), e = edgeDist(x, z); p.setY(i, y); c.copy(steppe).lerp(dry, r() * 0.5); if (e < 1.5) c.copy(rock).lerp(steppe, y < -GORGE_DEPTH + 3 ? 0.55 : r() * 0.12); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  return <mesh geometry={geo}><meshStandardMaterial vertexColors roughness={1} /></mesh>;
}
/** Kuzey surları: çifte duvar, yarım yuvarlak kuleler, ortada Aslanlı Kapı ve aslan kabartması */
function Walls({ mat, accent }: { mat: THREE.Material; accent: THREE.Material }) {
  const lion = useMemo(() => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const g = c.getContext('2d')!; g.fillStyle = '#b89478'; g.fillRect(0, 0, 128, 96); g.fillStyle = '#6e4c3a';
    g.beginPath(); g.ellipse(64, 54, 34, 15, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(96, 40, 13, 0, Math.PI * 2); g.fill(); [36, 50, 78, 90].forEach((x) => g.fillRect(x, 62, 6, 22)); g.beginPath(); g.moveTo(30, 50); g.quadraticCurveTo(10, 30, 20, 18); g.lineWidth = 4; g.strokeStyle = '#6e4c3a'; g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  const segs = useMemo(() => { const out: { x: number; w: number }[] = []; for (const [a, b] of [[-152, -4], [4, 152]]) for (let x = a; x < b; x += 24) { const e = Math.min(b, x + 24); out.push({ x: (x + e) / 2, w: e - x }); } return out; }, []);
  return (<group>
    {[0, 1].map((row) => segs.map((s, i) => <mesh key={`${row}-${i}`} material={mat} position={[row ? s.x * 1.02 : s.x, heightAt(s.x, WALL_Z) + (row ? 4 : 6), WALL_Z - row * 14]}><boxGeometry args={[s.w + 0.05, row ? 8 : 12, row ? 2.2 : 3]} /></mesh>))}
    {Array.from({ length: 11 }, (_, i) => -150 + i * 30).filter((x) => Math.abs(x) > 6).map((x) => <mesh key={x} material={mat} position={[x, heightAt(x, WALL_Z) + 7, WALL_Z - 2.5]}><cylinderGeometry args={[4.2, 4.6, 14, 14, 1, false, Math.PI / 2, Math.PI]} /></mesh>)}
    {[-6, 6].map((x) => <mesh key={x} material={accent} position={[x, 7.5, WALL_Z - 2.5]}><boxGeometry args={[4.5, 15, 7]} /></mesh>)}
    <mesh position={[-6, 8, WALL_Z - 6.06]} rotation-y={Math.PI}><planeGeometry args={[3.6, 2.7]} /><meshStandardMaterial map={lion} roughness={0.9} /></mesh>
    <mesh material={accent} position={[0, 12.5, WALL_Z - 2.5]}><boxGeometry args={[8, 2, 7]} /></mesh>
  </group>);
}
/** Katedral: dikdörtgen gövde, kör nişler, kubbesiz kasnak izi, yıkık kuzeybatı köşesi */
function Cathedral({ mat }: { mat: THREE.Material }) {
  const y = heightAt(20, 6);
  return (<group position={[20, y, 6]} rotation-y={0.05}>
    <mesh material={mat} position={[2, 8, 0]}><boxGeometry args={[18, 16, 22]} /></mesh>
    <mesh material={mat} position={[-9.5, 5.5, 4]}><boxGeometry args={[5, 11, 14]} /></mesh>
    <mesh material={mat} position={[-9.5, 2, -7]}><boxGeometry args={[5, 4, 8]} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} material={mat} position={[2 + s * 4.6, 17.6, 0]} rotation-z={s * -0.5}><boxGeometry args={[10.2, 0.6, 22.4]} /></mesh>)}
    <mesh material={mat} position={[0, 17.5, 0]}><cylinderGeometry args={[4.6, 4.8, 2.4, 16, 1, true]} /></mesh>
    {[-8, -4, 0, 4, 8].map((z) => [-1, 1].map((s) => <mesh key={`${z}${s}`} position={[2 + s * 9.05, 7, z]}><boxGeometry args={[0.2, 10, 1.6]} /><meshStandardMaterial color="#3e2a22" roughness={1} /></mesh>))}
    <mesh position={[11.06, 7, 0]}><boxGeometry args={[0.15, 6, 1.2]} /><meshStandardMaterial color="#251812" /></mesh>
  </group>);
}
/** Ebul Menuçehr Camii: dikdörtgen harim + sekizgen minare, kanyon kenarında */
function Mosque({ mat, accent }: { mat: THREE.Material; accent: THREE.Material }) {
  const y = heightAt(112, 62), checker = useMemo(() => new THREE.MeshStandardMaterial({ map: bicolorTex(43, '#9a6a52', '#3a2a26', 'checker'), roughness: 0.9 }), []);
  return (<group position={[112, y, 62]} rotation-y={-0.3}>
    <mesh material={mat} position={[0, 4, 0]}><boxGeometry args={[14, 8, 11]} /></mesh>
    <mesh material={checker} position={[-7.06, 4, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[8, 4]} /></mesh>
    {[-3, 0, 3].map((z) => <mesh key={z} position={[-7.08, 3, z]}><boxGeometry args={[0.1, 3.4, 1.4]} /><meshStandardMaterial color="#20140f" /></mesh>)}
    <mesh material={accent} position={[-6, 12, -6]}><cylinderGeometry args={[1.6, 1.8, 22, 8]} /></mesh>
    <mesh material={mat} position={[-6, 19, -6]}><cylinderGeometry args={[2.1, 2.1, 0.7, 8]} /></mesh>
  </group>);
}
/** Tigran Honents: haç planlı küçük kilise, kasnak ve konik külah */
function Tigran({ mat, accent }: { mat: THREE.Material; accent: THREE.Material }) {
  const y = heightAt(92, 142);
  return (<group position={[92, y, 142]} rotation-y={0.4}>
    <mesh material={mat} position={[0, 4.5, 0]}><boxGeometry args={[9, 9, 13]} /></mesh>
    <mesh material={mat} position={[0, 4, 0]}><boxGeometry args={[13, 8, 6]} /></mesh>
    <mesh material={mat} position={[0, 10.5, 0]}><cylinderGeometry args={[2.8, 2.8, 4, 12]} /></mesh>
    <mesh material={accent} position={[0, 14, 0]}><coneGeometry args={[3.3, 3, 12]} /></mesh>
    {[-1, 1].map((s) => <mesh key={s} material={accent} position={[0, 9.6, s * 3.6]} rotation-x={s * 0.6}><boxGeometry args={[9.2, 0.4, 4]} /></mesh>)}
    <mesh position={[0, 3, 6.52]}><boxGeometry args={[1.6, 3.2, 0.1]} /><meshStandardMaterial color="#20140f" /></mesh>
  </group>);
}
/** Arpaçay Köprüsü: kanyonun dibinde iki ayak + kopuk kemer başlangıcı */
function Bridge({ mat }: { mat: THREE.Material }) {
  const yb = -GORGE_DEPTH;
  return (<group position={[116, yb, 236]} rotation-y={1.2}>
    {[-13, 13].map((x) => <mesh key={x} material={mat} position={[x, 9, 0]}><boxGeometry args={[8, 18, 8]} /></mesh>)}
    {[-1, 1].map((s) => <mesh key={s} material={mat} position={[s * 7.4, 19.5, 0]} rotation-z={s * 0.5}><boxGeometry args={[7, 2.2, 8]} /></mesh>)}
  </group>);
}
/** Kız Kalesi: güney uçta kaya çıkıntısı + küçük şapel */
function MaidenCastle({ mat }: { mat: THREE.Material }) {
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b4f43', roughness: 1, flatShading: true }), []);
  const rockGeo = useMemo(() => { const g = new THREE.CylinderGeometry(7, 16, 30, 9, 3); const p = g.attributes.position as THREE.BufferAttribute, r = rng(61); for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.85 + r() * 0.3), p.getY(i), p.getZ(i) * (0.85 + r() * 0.3)); g.computeVertexNormals(); return g; }, []);
  return (<group position={[24, -GORGE_DEPTH, 336]}>
    <mesh geometry={rockGeo} material={rockMat} position={[0, 15, 0]} />
    <group position={[0, 30, 0]}><mesh material={mat} position={[0, 2, 0]}><boxGeometry args={[4, 4, 5]} /></mesh><mesh material={mat} position={[0, 4.8, 0]}><cylinderGeometry args={[1.3, 1.3, 1.6, 10]} /></mesh><mesh material={mat} position={[0, 6.2, 0]}><coneGeometry args={[1.6, 1.4, 10]} /></mesh></group>
  </group>);
}
/** "Bin bir kilise": platoya dağılmış küçük kilise kalıntıları (temsilî) */
function Ruins({ mat, n }: { mat: THREE.Material; n: number }) {
  const list = useMemo(() => { const r = rng(71), out: { x: number; z: number; h: number; a: number; dome: boolean }[] = []; let k = 0; while (out.length < n && k++ < 400) { const x = (r() - 0.5) * 240, z = -120 + r() * 380; if (edgeDist(x, z) < 12) continue; let ok = true; for (let s = 0; s < ROUTE_LEN; s += 6) { const p = routeAt(s).p; if (Math.hypot(p[0] - x, p[2] - z) < 16) { ok = false; break; } } if (ok) out.push({ x, z, h: 3 + r() * 6, a: r() * 3, dome: r() > 0.5 }); } return out; }, [n]);
  return (<group>{list.map((b, i) => <group key={i} position={[b.x, heightAt(b.x, b.z), b.z]} rotation-y={b.a}>
    <mesh material={mat} position={[0, b.h / 2, 0]}><boxGeometry args={[6, b.h, 8]} /></mesh>
    {b.dome ? <mesh material={mat} position={[0, b.h + 1, 0]}><cylinderGeometry args={[1.8, 2, 2, 10]} /></mesh> : <mesh material={mat} position={[2, b.h * 0.3, 4]}><boxGeometry args={[2, b.h * 0.6, 1]} /></mesh>}
  </group>)}</group>);
}
function Rubble({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(83), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 3 && k < n; i++) { const x = (r() - 0.5) * 300, z = -140 + r() * 420; if (edgeDist(x, z) < 2) continue; o.position.set(x, heightAt(x, z) + 0.1, z); o.rotation.set(r(), r() * 3, r()); o.scale.set(0.4 + r() * 0.9, 0.3 + r() * 0.5, 0.4 + r() * 0.8); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[undefined, undefined, n]}><dodecahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color="#7a5546" roughness={1} flatShading /></instancedMesh>;
}

/* ---------- hareket + kamera + vizör ---------- */
const _f = new THREE.Vector3(), _m = new THREE.Matrix4(), _l = new THREE.Vector3(), _q = new THREE.Quaternion();
function Controller() {
  const { camera } = useThree(), cs = useRef<CamState>({ step: 0, bob: 0, head: NaN });
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), S = useDb.getState();
    if (!S.started) { camera.position.set(70, 30, -270); camera.quaternion.copy(_q.setFromRotationMatrix(_m.lookAt(camera.position, _l.set(0, 4, -120), THREE.Object3D.DEFAULT_UP))); return; }
    if (stepWalk(camera, live, cs.current, { ROUTE_LEN, routeAt }, dt, !S.card)) audio.step(650);
    const n = nearShot(live.s);
    if (n && n.target[1] < -10) { const want = Math.max(-0.7, Math.atan2(n.target[1] - camera.position.y, Math.hypot(n.target[0] - camera.position.x, n.target[2] - camera.position.z)) + 0.05); live.pitch += (want - live.pitch) * (1 - Math.exp(-dt * 2)); }   // kanyon dibindeki hedef: dokunmatikte eğim olmadığı için kamera kendiliğinden aşağı bakar
    else if (n === null && live.pitch < -0.2) live.pitch += (0 - live.pitch) * (1 - Math.exp(-dt * 2));
    camera.getWorldDirection(_f); const framed = !!n && aimError([camera.position.x, camera.position.z], [_f.x, _f.z], [n.target[0], n.target[2]]) < AIM_TOL;
    if ((n?.id ?? null) !== (S.near?.id ?? null) || framed !== S.framed) S.set({ near: n, framed, ...(n ? {} : { card: null }) });
  });
  return null;
}
