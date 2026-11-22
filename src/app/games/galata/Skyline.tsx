/**
 * Galata Kulesi teras manzarası: Tarihi Yarımada silueti (v2).
 *
 * Neden: Dürbünle (görüş açısı 18°) 1–2,5 km'deki yapılara bakılır. Bu uzaklıkta yapıyı tanıtan şey ayrıntı değil, kütle ve siluettir:
 *   - Tarihi Yarımada'nın tepeleri: camiler tepelerin üstüne oturur; şehir dokusu da tepeleri izler.
 *   - Osmanlı camisi: pencereli kubbe kasnağı, kıble ekseninde ya da dört yanda yarım kubbeler, köşelerde ağırlık kuleleri,
 *     küçük kubbe dizileri, revaklı avlu; çok ince, şerefeli, sivri kurşun külahlı minareler.
 *   - Ayasofya: Bizans yapısı. Alçak kubbe tabanında pencere kuşağı, doğu-batıda yarım kubbeler, kuzey-güneyde dev payandalar, aşı boyası;
 *     dört minareden biri tuğla.
 * Ölçüler yayımlanmış yaklaşık değerlerdir (kubbe çapı/yüksekliği, minare sayısı ve şerefeleri); plan ayrıntıları temsilîdir.
 * Kaynaklar: README.md (Galata) ve UNESCO — Historic Areas of Istanbul.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { isWater, toLocal } from './panorama';

/* ---------- tepeler ---------- */
type Hill = [number, number, number, number];   // x, z, yükseklik, yayılım (m)
const HILLS: Hill[] = [
  [-850, 1100, 58, 420],   // 3. tepe — Süleymaniye
  [-860, 1720, 52, 420],   // Beyazıt
  [-280, 1560, 44, 330],   // 2. tepe — Nuruosmaniye/Çemberlitaş
  [420, 2020, 36, 380],    // 1. tepe — Sultanahmet/Ayasofya
  [820, 1560, 30, 300],    // Topkapı / Sarayburnu
  [-2100, 1500, 55, 800],  // Fatih yönü
  [3900, -200, 55, 900],   // Üsküdar
  [8100, -500, 240, 1500], // Büyük Çamlıca
  [-700, -1100, 45, 800],  // Beyoğlu sırtı (kulenin çevresi düz kalır)
];
const GALATA_FLAT = 450;
/** Kara yüksekliği (m); su 0. Kıyıda yumuşak iniş. */
export function landHeight(x: number, z: number): number {
  if (isWater(x, z)) return 0;
  let h = 0; for (const [hx, hz, hh, s] of HILLS) h += hh * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (2 * s * s));
  const r = Math.hypot(x, z); h *= THREE.MathUtils.smoothstep(r, GALATA_FLAT, GALATA_FLAT + 500);
  let shore = 1; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; for (const d of [60, 140]) if (isWater(x + Math.cos(a) * d, z + Math.sin(a) * d)) shore = Math.min(shore, d === 60 ? 0.25 : 0.6); }
  return h * shore;
}
/** Kıble yönü (~151°, güney-güneydoğu): mihrap tarafı yerel +z'nin döndüğü yer */
const QIBLA = Math.atan2(Math.sin((151 * Math.PI) / 180), -Math.cos((151 * Math.PI) / 180));

/* ---------- malzemeler ve dokular ---------- */
function facadeTex(base: string, rows: 1 | 2) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,.08)'; for (let y = 8; y < 128; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }   // taş sıraları
  const win = (y0: number, h: number) => { g.fillStyle = '#26262c'; g.beginPath(); g.moveTo(46, y0 + h); g.lineTo(46, y0 + 10); g.arc(64, y0 + 10, 18, Math.PI, 0); g.lineTo(82, y0 + h); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(44, y0 + h, 40, 3); };
  if (rows === 2) { win(14, 40); win(72, 44); } else win(30, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function drumTex(base: string) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 64, 64); g.fillStyle = '#202026'; g.beginPath(); g.moveTo(22, 54); g.lineTo(22, 22); g.arc(32, 22, 10, Math.PI, 0); g.lineTo(42, 54); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
/** Kutu: UV'ler dünya ölçeğinde — yatayda `s` m'de bir; dikeyde `sy` m'de bir (verilmezse duvar yüksekliği = tek sıra döşeme: 2 pencere katı) */
function bx(w: number, h: number, d: number, s: number, sy = h) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv as THREE.BufferAttribute, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i, vert = f !== 2 && f !== 3; uv.setXY(k, (uv.getX(k) * dims[f][0]) / s, vert ? (uv.getY(k) * dims[f][1]) / sy : (uv.getY(k) * dims[f][1]) / s); }
  return g;
}
function useMats() {
  return useMemo(() => {
    const stone = '#ddd6c9', ochre = '#d7a27a';
    const fac2 = facadeTex(stone, 2), fac1 = facadeTex(stone, 1), facO = facadeTex(ochre, 2);
    const drum = (base: string, n: number) => { const t = drumTex(base); t.repeat.set(n, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); };
    return {
      wall: new THREE.MeshStandardMaterial({ map: fac2, roughness: 0.85 }), wall1: new THREE.MeshStandardMaterial({ map: fac1, roughness: 0.85 }),
      plain: new THREE.MeshStandardMaterial({ color: stone, roughness: 0.85 }),
      ochreWall: new THREE.MeshStandardMaterial({ map: facO, roughness: 0.9 }), ochre: new THREE.MeshStandardMaterial({ color: ochre, roughness: 0.9 }),
      brick: new THREE.MeshStandardMaterial({ color: '#a4553f', roughness: 0.9 }),
      lead: new THREE.MeshStandardMaterial({ color: '#8f9ba6', roughness: 0.42, metalness: 0.45 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d4a640', roughness: 0.3, metalness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 1 }),
      drum16: drum(stone, 16), drum24: drum(stone, 24), drum40: drum(ochre, 40),
      white: new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.7 }), redRoof: new THREE.MeshStandardMaterial({ color: '#9c5a44', roughness: 0.9 }),
      rock: new THREE.MeshStandardMaterial({ color: '#6f6a62', roughness: 1, flatShading: true }),
    };
  }, []);
}
type Mats = ReturnType<typeof useMats>;

/* ---------- parçalar ---------- */
/** Kubbe: hafif basık yarım küre + kurşun, tepede alem */
function Dome({ r, y, m, flat = 0.82, alem = true }: { r: number; y: number; m: Mats; flat?: number; alem?: boolean }) {
  return <group position={[0, y, 0]}>
    <mesh material={m.lead} scale={[1, flat, 1]}><sphereGeometry args={[r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    {alem && <><mesh material={m.gold} position={[0, r * flat + 1.2, 0]}><cylinderGeometry args={[0.18, 0.25, 2.4, 6]} /></mesh><mesh material={m.gold} position={[0, r * flat + 2.6, 0]}><sphereGeometry args={[0.55, 8, 6]} /></mesh></>}
  </group>;
}
/** Yarım kubbe: dörtte bir küre; rotY = dışa doğru yön (0 → +z). Küre parçası φ ∈ [0, π] → yerel +z yarısı. */
function SemiDome({ r, y, at, rotY, m }: { r: number; y: number; at: [number, number]; rotY: number; m: Mats }) {
  return <mesh material={m.lead} position={[at[0], y, at[1]]} rotation-y={rotY} scale={[1, 0.85, 1]}><sphereGeometry args={[r, 20, 8, 0, Math.PI, 0, Math.PI / 2]} /></mesh>;
}
/** Osmanlı minaresi: kare kaide, 16 köşeli ince gövde, şerefeler (altı koyu mukarnas), uzun sivri kurşun külah, alem */
function Minaret({ x, z, h, balconies, m, mat }: { x: number; z: number; h: number; balconies: number; m: Mats; mat?: THREE.Material }) {
  const body = mat ?? m.plain, capH = h * 0.16, shaftH = h - capH, r = 1.55;
  const bal = Array.from({ length: balconies }, (_, i) => shaftH * (0.62 + (i * 0.3) / Math.max(1, balconies)));
  return <group position={[x, 0, z]}>
    <mesh material={body} position={[0, 4, 0]}><boxGeometry args={[4.4, 8, 4.4]} /></mesh>
    <mesh material={body} position={[0, 8 + (shaftH - 8) / 2, 0]}><cylinderGeometry args={[r * 0.82, r, shaftH - 8, 16]} /></mesh>
    {bal.map((y, i) => <group key={i} position={[0, y, 0]}>
      <mesh material={m.dark} position={[0, -0.7, 0]}><cylinderGeometry args={[r * 1.7, r * 0.95, 1.4, 16]} /></mesh>
      <mesh material={body} position={[0, 0.3, 0]}><cylinderGeometry args={[r * 1.75, r * 1.75, 0.7, 16]} /></mesh>
      <mesh material={body} position={[0, 1.1, 0]}><cylinderGeometry args={[r * 1.72, r * 1.72, 0.9, 16, 1, true]} /></mesh>
    </group>)}
    <mesh material={m.lead} position={[0, shaftH + capH / 2, 0]}><coneGeometry args={[r * 0.95, capH, 16]} /></mesh>
    <mesh material={m.gold} position={[0, h + 1.2, 0]}><cylinderGeometry args={[0.12, 0.15, 2.4, 6]} /></mesh>
  </group>;
}
/** Küçük kubbe dizisi (revak, yan nefler): tek InstancedMesh */
function SmallDomes({ list, r, m }: { list: [number, number, number][]; r: number; m: Mats }) {
  const mesh = useMemo(() => { const g = new THREE.SphereGeometry(r, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.8, 1); const im = new THREE.InstancedMesh(g, m.lead, list.length), o = new THREE.Object3D(); list.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); return im; }, [list, r, m]);
  return <primitive object={mesh} />;
}

/* ---------- klasik Osmanlı camisi (Süleymaniye, Sultanahmet, Yeni Cami) ---------- */
interface MosqueSpec {
  at: [number, number]; hall: number; wallH: number; domeR: number; drumH: number; drumMat: 'drum16' | 'drum24'; semis: 'axis' | 'four';
  court: number; minarets: { x: number; z: number; h: number; b: number }[];
}
function OttomanMosque({ s, m }: { s: MosqueSpec; m: Mats }) {
  const y0 = landHeight(s.at[0], s.at[1]), H = s.hall / 2, domeBase = s.wallH + 4 + s.drumH;
  const corner = useMemo(() => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * (s.domeR + 2.5), b * (s.domeR + 2.5)] as [number, number]), [s.domeR]);
  const small = useMemo(() => {
    const out: [number, number, number][] = [], c = s.court, cz = -H - c / 2, step = c / 5;
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) out.push([sx * (s.hall / 2 - 3), 7.5, cz - c / 2 + i * step]);   // avlu yan revakları
    for (let i = 1; i < 5; i++) out.push([-s.hall / 2 + 3 + (i * (s.hall - 6)) / 5, 7.5, cz - c / 2 + 3]);                // avlu kuzey revağı
    for (let i = 0; i < 5; i++) out.push([-s.hall / 2 + 3 + (i * (s.hall - 6)) / 4, s.wallH + 1, -H + 3]);               // son cemaat yeri
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) out.push([sx * (H - 5), s.wallH + 1, -H + 10 + i * ((s.hall - 20) / 2)]);   // yan nefler
    return out;
  }, [s, H]);
  return <group position={[s.at[0], y0, s.at[1]]} rotation-y={QIBLA}>
    {/* harim: pencereli duvarlar, saçak */}
    <mesh geometry={useMemo(() => bx(s.hall, s.wallH, s.hall, 6.5), [s])} material={m.wall} position={[0, s.wallH / 2, 0]} />
    <mesh material={m.plain} position={[0, s.wallH + 0.4, 0]}><boxGeometry args={[s.hall + 1.2, 0.8, s.hall + 1.2]} /></mesh>
    {/* kubbeyi taşıyan kare kasnak tabanı + köşe ağırlık kuleleri */}
    <mesh material={m.plain} position={[0, s.wallH + 2, 0]}><boxGeometry args={[s.domeR * 2 + 6, 4, s.domeR * 2 + 6]} /></mesh>
    {corner.map(([x, z], i) => <group key={i} position={[x, s.wallH + 4, z]}>
      <mesh material={m.plain} position={[0, 3, 0]}><cylinderGeometry args={[2.2, 2.4, 6, 8]} /></mesh>
      <mesh material={m.lead} position={[0, 6, 0]}><sphereGeometry args={[2.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    </group>)}
    {/* pencereli kubbe kasnağı + kubbe */}
    <mesh material={m[s.drumMat]} position={[0, s.wallH + 4 + s.drumH / 2, 0]}><cylinderGeometry args={[s.domeR + 0.6, s.domeR + 1, s.drumH, 32, 1, true]} /></mesh>
    <Dome r={s.domeR + 0.6} y={domeBase} m={m} />
    {/* yarım kubbeler: kıble ekseninde (Süleymaniye) ya da dört yanda (Sultanahmet, Yeni Cami) */}
    {(s.semis === 'four' ? [0, 1, 2, 3] : [0, 2]).map((k) => { const a = (k * Math.PI) / 2; return <SemiDome key={k} r={s.domeR * 0.98} y={s.wallH + 1} at={[Math.sin(a) * s.domeR * 0.98, Math.cos(a) * s.domeR * 0.98]} rotY={a} m={m} />; })}
    {/* avlu: alçak revak duvarları, ortada şadırvan */}
    <group position={[0, 0, -H - s.court / 2]}>
      {[[0, -s.court / 2, s.hall, 2], [-s.hall / 2, 0, 2, s.court], [s.hall / 2, 0, 2, s.court]].map(([x, z, w, d], i) => <mesh key={i} geometry={bx(w, 7, d, 7)} material={m.wall1} position={[x, 3.5, z]} />)}
      <mesh material={m.lead} position={[0, 4, 0]}><sphereGeometry args={[3, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
    </group>
    <SmallDomes list={small} r={2.6} m={m} />
    {s.minarets.map((n, i) => <Minaret key={i} x={n.x} z={n.z} h={n.h} balconies={n.b} m={m} />)}
  </group>;
}

/* ---------- Ayasofya (Bizans) ---------- */
function Ayasofya({ m }: { m: Mats }) {
  const at = toLocal([28.98008, 41.00854]), y0 = landHeight(at[0], at[1]);
  const R = 15.5, base = 40;   // kubbe çapı ~31 m; tepe ~55,6 m
  return <group position={[at[0], y0, at[1]]} rotation-y={QIBLA - 0.35}>
    {/* gövde ve iki katlı yan bölümler */}
    <mesh geometry={useMemo(() => bx(72, 26, 78, 9), [])} material={m.ochreWall} position={[0, 13, 0]} />
    <mesh geometry={useMemo(() => bx(36, 38, 70, 9, 19), [])} material={m.ochreWall} position={[0, 19, 0]} />
    {/* kuzey-güney dev payandalar (dışarı taşan dört kütle) */}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <mesh key={i} geometry={bx(10, 36, 14, 8)} material={m.ochre} position={[sx * 33, 18, sz * 15]} />)}
    {/* kubbe tabanı: pencere kuşağı (40 pencere), alçak kubbe */}
    <mesh material={m.ochre} position={[0, base - 1, 0]}><boxGeometry args={[36, 2, 36]} /></mesh>
    <mesh material={m.drum40} position={[0, base + 1.6, 0]}><cylinderGeometry args={[R + 0.4, R + 0.8, 3.2, 40, 1, true]} /></mesh>
    <Dome r={R + 0.4} y={base + 3.2} m={m} flat={0.6} alem={false} />
    {/* doğu ve batı yarım kubbeler + küçük eksedra yarım kubbeleri */}
    {[0, 1].map((k) => { const s = k ? 1 : -1; return <group key={k}>
      <SemiDome r={R * 0.95} y={30} at={[0, s * R * 0.95]} rotY={s > 0 ? 0 : Math.PI} m={m} />
      {[-1, 1].map((e) => <SemiDome key={e} r={7} y={24} at={[e * 9, s * (R + 6)]} rotY={s > 0 ? 0 : Math.PI} m={m} />)}
    </group>; })}
    {/* minareler: biri tuğla (II. Mehmed dönemi, daha kalın), üçü beyaz taş */}
    <Minaret x={40} z={-44} h={58} balconies={1} m={m} mat={m.brick} />
    {[[-40, -44], [-40, 44], [40, 44]].map(([x, z], i) => <Minaret key={i} x={x} z={z} h={60} balconies={i === 0 ? 1 : 2} m={m} />)}
  </group>;
}

/* ---------- Kız Kulesi ---------- */
function KizKulesi({ m }: { m: Mats }) {
  const at = toLocal([29.00412, 41.02109]);
  const rock = useMemo(() => { const g = new THREE.CylinderGeometry(26, 32, 5, 14, 1); const p = g.attributes.position as THREE.BufferAttribute; let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); for (let i = 0; i < p.count; i++) { const k = 0.85 + r() * 0.3; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * (0.7 + r() * 0.2)); } g.computeVertexNormals(); return g; }, []);
  // ölçek 0,8: kule ~30 m (yaklaşık)
  return <group position={[at[0], 0, at[1]]} rotation-y={0.3} scale={0.8}>
    <mesh geometry={rock} material={m.rock} position={[0, 0.5, 0]} />
    {/* rıhtım ve teras */}
    <mesh material={m.plain} position={[0, 3.4, 0]}><boxGeometry args={[40, 1.2, 24]} /></mesh>
    {/* iki katlı ana yapı: beyaz, kemerli pencereler, kırma çatı */}
    <mesh geometry={useMemo(() => bx(22, 9, 14, 5), [])} material={m.wall} position={[-6, 8.5, 0]} />
    <mesh material={m.redRoof} position={[-6, 14.2, 0]} rotation-y={Math.PI / 4}><coneGeometry args={[13, 3.4, 4]} /></mesh>
    {/* kule: on iki köşeli gövde, şerefe, kurşun külah, en üstte fener */}
    <group position={[8, 4, 0]}>
      <mesh material={m.white} position={[0, 4, 0]}><boxGeometry args={[9, 8, 9]} /></mesh>
      <mesh material={m.white} position={[0, 15, 0]}><cylinderGeometry args={[3.4, 3.8, 14, 12]} /></mesh>
      <mesh material={m.dark} position={[0, 22.4, 0]}><cylinderGeometry args={[4.6, 3.6, 0.9, 12]} /></mesh>
      <mesh material={m.white} position={[0, 23.1, 0]}><cylinderGeometry args={[4.6, 4.6, 0.5, 12]} /></mesh>
      <mesh material={m.white} position={[0, 25, 0]}><cylinderGeometry args={[2.6, 3.0, 3.6, 12]} /></mesh>
      <mesh material={m.lead} position={[0, 30, 0]}><coneGeometry args={[3.1, 6.4, 12]} /></mesh>
      <mesh material={m.gold} position={[0, 33.8, 0]}><cylinderGeometry args={[0.15, 0.2, 1.6, 6]} /></mesh>
    </group>
  </group>;
}

/* ---------- Galata Köprüsü (Karaköy – Eminönü) ---------- */
function Bridge({ m }: { m: Mats }) {
  const a: [number, number] = [-30, 320], b: [number, number] = [-200, 800], L = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const lamps = useMemo(() => Array.from({ length: 16 }, (_, i) => -L / 2 + (i + 0.5) * (L / 16)), [L]);
  return <group position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation-y={yaw}>
    <mesh material={m.plain} position={[0, 4.5, 0]}><boxGeometry args={[42, 2.4, L]} /></mesh>
    <mesh material={m.dark} position={[0, 2.2, 0]}><boxGeometry args={[38, 2.4, L]} /></mesh>
    {lamps.map((z) => [-19, 19].map((x) => <mesh key={`${x}${z}`} material={m.dark} position={[x, 8, z]}><cylinderGeometry args={[0.15, 0.2, 5, 5]} /></mesh>))}
  </group>;
}

export function Skyline() {
  const m = useMats();
  const specs = useMemo<MosqueSpec[]>(() => [
    // Süleymaniye: kubbe çapı ~26,5 m, yüksekliği ~53 m; kıble ekseninde iki yarım kubbe; avlu köşelerinde 4 minare (10 şerefe)
    { at: toLocal([28.96403, 41.01611]), hall: 58, wallH: 22, domeR: 13.3, drumH: 9, drumMat: 'drum24', semis: 'axis', court: 46,
      minarets: [{ x: -30, z: -30, h: 72, b: 3 }, { x: 30, z: -30, h: 72, b: 3 }, { x: -30, z: -77, h: 56, b: 2 }, { x: 30, z: -77, h: 56, b: 2 }] },
    // Sultanahmet: kubbe ~23,5 m, ~43 m; dört yarım kubbe; 6 minare
    { at: toLocal([28.97684, 41.00539]), hall: 53, wallH: 17, domeR: 11.75, drumH: 6, drumMat: 'drum16', semis: 'four', court: 56,
      minarets: [{ x: -30, z: -30, h: 64, b: 3 }, { x: 30, z: -30, h: 64, b: 3 }, { x: -30, z: 30, h: 64, b: 3 }, { x: 30, z: 30, h: 64, b: 3 }, { x: -30, z: -84, h: 54, b: 2 }, { x: 30, z: -84, h: 54, b: 2 }] },
    // Yeni Cami (Eminönü): kubbe ~17,5 m, ~36 m; dört yarım kubbe; 2 minare
    { at: toLocal([28.97197, 41.01702]), hall: 41, wallH: 15, domeR: 8.75, drumH: 5, drumMat: 'drum16', semis: 'four', court: 40,
      minarets: [{ x: -22, z: -22, h: 58, b: 3 }, { x: 22, z: -22, h: 58, b: 3 }] },
  ], []);
  return <group>
    {specs.map((s, i) => <OttomanMosque key={i} s={s} m={m} />)}
    <Ayasofya m={m} />
    <KizKulesi m={m} />
    <Bridge m={m} />
  </group>;
}

/** Tepeli arazi (su maskesinin dışında yükselir); kıyıda su düzleminin altına iner */
export function Terrain({ texture, extent }: { texture: THREE.Texture; extent: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(extent, extent, 220, 220); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, isWater(x, z) ? -3 : landHeight(x, z)); }
    g.computeVertexNormals(); return g;
  }, [extent]);
  return <mesh geometry={geo} position={[0, -0.5, 0]}><meshStandardMaterial map={texture} roughness={0.8} /></mesh>;
}
