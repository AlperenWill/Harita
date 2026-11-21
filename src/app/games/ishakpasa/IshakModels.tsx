/**
 * İshak Paşa Sarayı — 3B modeller (temsilî, ölçekli değil).
 * Sarı-bej kesme taş; mazgallı dış duvarlar, sivri kemerli pencere dizileri ve silmeler; yüksek taç kapı (kademeli çerçeve,
 * mukarnaslı niş, kıvrık dal bordürleri); kaburgalı kubbeli cami ve iki renkli minare; sekizgen türbe; harem cephesi;
 * arkadaki kayalık ve Eski Bayazıt surları; uzakta karlı Ağrı Dağı.
 */
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { heightAt, type Stop } from './site';
import { rng, type Tier } from '../shared/walkKit';
import { archGeo, bx, groundTex, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { motifURL } from './motif';

export const SUN_DIR = new THREE.Vector3(0.55, 0.5, 0.67).normalize();   // güneydoğudan sabah ışığı: oyuncunun baktığı doğu ve güney cepheler aydınlık

export interface Mats { sand: THREE.Material; sandDark: THREE.Material; red: THREE.Material; pave: THREE.Material; trim: THREE.Material; hole: THREE.Material; wood: THREE.Material; stripe: THREE.Material; rock: THREE.Material }
export function useMats(): Mats {
  return useMemo(() => {
    const mk = (key: string, pal: string[], courses?: [number, number], bw?: [number, number], bump = 0.3) => { const t = stoneTex(key, pal, courses, bw); return weather(new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bump, bumpScale: bump, roughness: 0.9 })); };
    const stripeTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!; for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#9a4c37' : '#dcc39a'; g.fillRect(0, i * 32, 64, 32); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, i * 32 + 30, 64, 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 3); return t; })();
    return {
      sand: mk('ip-sand', ['#d9c094', '#cfb487', '#e1caa0', '#c8ab7e', '#d4ba8c']), sandDark: mk('ip-sandd', ['#b99b70', '#ad8f65', '#c2a47a']),
      red: mk('ip-red', ['#9c4f3a', '#a85b44', '#8f4733']), pave: mk('ip-pave', ['#bda781', '#c9b38c', '#b29c76', '#a99370'], [70, 40], [90, 90], 0.5),
      trim: weather(new THREE.MeshStandardMaterial({ color: '#e6d3ae', roughness: 0.8 })), hole: new THREE.MeshStandardMaterial({ color: '#1d140d', roughness: 1, side: THREE.DoubleSide }),
      wood: new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.7 }), stripe: weather(new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.85 })),
      rock: new THREE.MeshStandardMaterial({ color: '#8b7458', roughness: 1, flatShading: true }),
    };
  }, []);
}

/* ---------- yardımcı parçalar ---------- */
/** Silme (korniş): duvar üstünde dışa taşan ince bant */
const Cornice = ({ w, d, y, m }: { w: number; d: number; y: number; m: Mats }) => <mesh geometry={bx(w + 0.5, 0.45, d + 0.5)} material={m.trim} position={[0, y, 0]} />;
/** Mazgal dizisi: uzunluk boyunca (yerel x) aralıklı dişler */
function Merlons({ len, y, z, m }: { len: number; y: number; z: number; m: Mats }) {
  const n = Math.floor(len / 1.6); return <group>{Array.from({ length: n }, (_, i) => <mesh key={i} geometry={bx(0.8, 0.9, 0.6)} material={m.sand} position={[-len / 2 + 0.8 + i * (len - 1.6) / Math.max(1, n - 1), y + 0.45, z]} />)}</group>;
}
/** Pencere: açık renk çerçeve + koyu sivri kemerli açıklık (yerel +z'ye bakar) */
function Win({ w = 1.2, h = 2.4, m }: { w?: number; h?: number; m: Mats }) {
  const frame = useMemo(() => archGeo(w + 0.5, h + 0.45), [w, h]), hole = useMemo(() => archGeo(w, h), [w, h]);
  return <group><mesh geometry={frame} material={m.trim} position={[0, -0.22, 0.02]} /><mesh geometry={hole} material={m.hole} position={[0, 0, 0.04]} /></group>;
}
/** Kutu bina: duvar + korniş + isteğe bağlı mazgal; ön (+z) yüzde pencere dizileri */
function Block({ p, s, rotY = 0, m, rows = [], merlons = true }: { p: [number, number, number]; s: [number, number, number]; rotY?: number; m: Mats; rows?: { y: number; n: number; w?: number; h?: number }[]; merlons?: boolean }) {
  const [w, h, d] = s;
  return (<group position={p} rotation-y={rotY}>
    <mesh geometry={bx(w, h, d)} material={m.sand} position={[0, h / 2, 0]} />
    <mesh geometry={bx(w + 0.2, 0.8, d + 0.2)} material={m.sandDark} position={[0, 0.4, 0]} />
    <group position={[0, h, 0]}><Cornice w={w} d={d} y={0} m={m} /></group>
    {merlons && <><Merlons len={w} y={h + 0.22} z={d / 2} m={m} /><Merlons len={w} y={h + 0.22} z={-d / 2} m={m} /></>}
    {rows.map((r, k) => Array.from({ length: r.n }, (_, i) => <group key={`${k}-${i}`} position={[-w / 2 + (w / r.n) * (i + 0.5), r.y, d / 2]}><Win w={r.w} h={r.h} m={m} /></group>))}
  </group>);
}

/* ---------- arazi, kayalık, dağ, otlar ---------- */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 240 : tier === 'medium' ? 180 : 120, g = new THREE.PlaneGeometry(900, 900, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), dry = new THREE.Color('#bba874'), rock = new THREE.Color('#8a7358'), rock2 = new THREE.Color('#6e5a45'), plain = new THREE.Color('#9fa062'), r = rng(9);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y);
      c.copy(dry).lerp(plain, Math.max(0, Math.sin(x * 0.013) * Math.cos(z * 0.011)) * 0.5); if (y > 4) c.lerp(Math.sin(y * 0.7 + x * 0.05) > 0 ? rock : rock2, Math.min(1, (y - 4) / 8)); else if (y < -8) c.lerp(plain, 0.6); c.lerp(rock, r() * 0.08);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
/** Sarayın arkasındaki kayalıkta iri kaya blokları */
export function Boulders({ m, n }: { m: Mats; n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(17), o = new THREE.Object3D(); let k = 0; for (let i = 0; i < n * 5 && k < n; i++) { const x = -260 + r() * 420, z = -200 + r() * 150, y = heightAt(x, z); if (y < 5) continue; o.position.set(x, y + 0.5, z); o.rotation.set(r() * 3, r() * 3, r() * 3); const s = 2 + r() * 6; o.scale.set(s, s * (0.5 + r() * 0.5), s * (0.7 + r() * 0.5)); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); } if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[undefined, m.rock, n]}><dodecahedronGeometry args={[1, 1]} /></instancedMesh>;
}
/** Ağrı Dağı: gürültülü dönel profil, köşe renkleriyle kar örtüsü; yanında Küçük Ağrı (ölçekli değil) */
export function Mountain() {
  const make = (R: number, H: number, seed: number, snow: number) => { const r = rng(seed), pts: THREE.Vector2[] = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(R * (1 - t) ** 1.35 + 0.01, H * t)); }
    const g = new THREE.LatheGeometry(pts, 64); const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), rockC = new THREE.Color('#7d7a7e'), snowC = new THREE.Color('#f5f7fa'), low = new THREE.Color('#9a8e78');
    const ridges = Array.from({ length: 9 }, () => [r() * Math.PI * 2, 0.04 + r() * 0.06]);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x); let k = 1; for (const [ra, amp] of ridges) k += amp * Math.cos((a - ra) * 3) * Math.sin(y / H * Math.PI); p.setXYZ(i, x * k, y, z * k);
      const t = y / H, sn = THREE.MathUtils.smoothstep(t + 0.06 * Math.sin(a * 7), snow - 0.05, snow + 0.05); c.copy(low).lerp(rockC, Math.min(1, t * 2.5)).lerp(snowC, sn); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; };
  const big = useMemo(() => make(2000, 1500, 3, 0.58), []), small = useMemo(() => make(1000, 760, 5, 0.85), []);
  return (<group position={[900, -20, -3400]} userData={{ noCast: true }}>
    <mesh geometry={big}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
    <mesh geometry={small} position={[-1750, 0, 700]}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
  </group>);
}
/** Saray dışındaki bozkır otu (avlular ve rota hariç) */
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null), { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(33), o = new THREE.Object3D(), col = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = -160 + r() * 330, z = -80 + r() * 200; if (x > -74 && x < 50 && z > -40 && z < 27) continue; if (Math.abs(z - 2) < 4 && x > 40 && x < 100) continue; if (x > -30 && x < 20 && z > 22 && z < 52 && Math.abs((x + 20) * 0.6 - (z - 24)) < 6) continue;
      const y = heightAt(x, z); if (y > 8) continue; o.position.set(x, y - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.7 + r() * 0.8; o.scale.set(s, s * (0.8 + r() * 0.5), s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); col.setHSL(0.11 + r() * 0.05, 0.3 + r() * 0.15, 0.6 + r() * 0.2); ref.current?.setColorAt(k, col); k++; }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} userData={{ noCast: true }} />;
}

/* ---------- saray ---------- */
export function Palace({ m }: { m: Mats }) {
  const rumi = useMemo(() => { const t = new THREE.TextureLoader().load(motifURL('rumi')); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t; }, []);
  const muq = useMemo(() => archGeo(0.9, 0.9), []);
  return (<group>
    {/* avlu döşemesi */}
    <mesh geometry={bx(112, 0.6, 64, 6)} material={m.pave} position={[-12, -0.3, -4]} userData={{ noCast: true }} />
    {/* doğu dış duvarı (taç kapının iki yanı) + köşe burçları */}
    <Block p={[40, 0, -14]} s={[3, 9, 18]} rotY={Math.PI / 2} m={m} rows={[{ y: 4.2, n: 3, w: 1, h: 2 }]} />
    <Block p={[40, 0, 14]} s={[3, 9, 18]} rotY={Math.PI / 2} m={m} rows={[{ y: 4.2, n: 3, w: 1, h: 2 }]} />
    {[-24, 24].map((z) => <group key={z} position={[40, 0, z]}><mesh material={m.sand} position={[0, 6, 0]}><cylinderGeometry args={[3.2, 3.5, 12, 20]} /></mesh><mesh material={m.trim} position={[0, 12.1, 0]}><cylinderGeometry args={[3.55, 3.55, 0.45, 20]} /></mesh>
      {Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2).map((a) => <mesh key={a} geometry={bx(0.8, 0.9, 0.6)} material={m.sand} position={[Math.sin(a) * 3.2, 12.8, Math.cos(a) * 3.2]} rotation-y={a} />)}</group>)}
    {/* ortadaki ikinci kapı duvarı */}
    <Block p={[0, 0, -14]} s={[2.4, 9, 16]} rotY={Math.PI / 2} m={m} merlons={false} />
    <Block p={[0, 0, 14]} s={[2.4, 9, 16]} rotY={Math.PI / 2} m={m} merlons={false} />
    <group position={[0, 0, 0]}><mesh geometry={bx(3, 13, 7)} material={m.sandDark} position={[0, 6.5, 0]} /><Cornice w={3} d={7} y={13} m={m} />
      {[1, -1].map((s) => <group key={s} position={[s * 1.52, 0, 0]} rotation-y={s * Math.PI / 2}><mesh geometry={archGeo(3.8, 8)} material={m.trim} position={[0, 0, 0.01]} /><mesh geometry={archGeo(3, 7.4)} material={m.hole} position={[0, 0, 0.03]} /></group>)}</group>
    {/* güney duvarı */}
    <Block p={[20, 0, 23]} s={[40, 8, 2.4]} m={m} rows={[{ y: 3.6, n: 8, w: 1, h: 2 }]} />
    <Block p={[-12, 0, 23]} s={[24, 8, 2.4]} m={m} rows={[{ y: 3.6, n: 5, w: 1, h: 2 }]} />
    <Block p={[-34, 0, 23]} s={[12, 8, 2.4]} m={m} rows={[{ y: 3.6, n: 2, w: 1, h: 2 }]} />
    {/* TAÇ KAPI: yüksek kütle, kademeli çerçeve, mukarnaslı sivri niş, rumi bordürler, ahşap kapı */}
    <group position={[41.5, 0, 0]}>
      <mesh geometry={bx(4, 17, 13)} material={m.sand} position={[0, 8.5, 0]} />
      <mesh geometry={bx(4.4, 0.6, 13.4)} material={m.trim} position={[0, 17.2, 0]} />
      <group position={[2.01, 0, 0]} rotation-y={Math.PI / 2}>
        {[[9.6, 15.4, m.trim], [8.4, 14.6, m.sandDark], [7.4, 13.8, m.trim]].map(([w, h, mat], i) => <mesh key={i} geometry={archGeo(w as number, h as number)} material={mat as THREE.Material} position={[0, 0.2, 0.02 + i * 0.02]} />)}
        <mesh geometry={archGeo(5.8, 12.6)} material={m.sandDark} position={[0, 0.2, 0.08]} />
        {/* mukarnas: nişin tepesinde küçülen kemercik sıraları */}
        {[0, 1, 2, 3].map((row) => { const n = 5 - row; return Array.from({ length: n }, (_, i) => <mesh key={`${row}-${i}`} geometry={muq} material={row % 2 ? m.trim : m.hole} position={[(i - (n - 1) / 2) * 1.0, 8.6 + row * 0.95, 0.1]} scale={[1, 1, 1]} />); })}
        <mesh geometry={bx(3.4, 6.4, 0.2)} material={m.wood} position={[0, 3.4, 0.12]} />
        {[-0.85, 0.85].map((x) => <mesh key={x} geometry={bx(0.08, 6.2, 0.05)} material={m.hole} position={[x * 0.02, 3.4, 0.24]} />)}
        {[-3.9, 3.9].map((x) => <mesh key={x} position={[x, 7, 0.1]}><planeGeometry args={[0.9, 12]} /><meshStandardMaterial map={rumi} roughness={0.85} /></mesh>)}
      </group>
    </group>
    {/* selamlık: iki kat pencere */}
    <Block p={[20, 0, -30]} s={[36, 11, 12]} m={m} rows={[{ y: 1.6, n: 6, w: 1.2, h: 2.6 }, { y: 6.4, n: 9, w: 0.9, h: 2 }]} />
    {/* cami: harim, kubbe kasnağı pencereleri, kaburgalı kubbe, iki renkli minare, şerefe */}
    <Block p={[-22, 0, -30]} s={[18, 10, 14]} m={m} rows={[{ y: 1.4, n: 1, w: 2, h: 3.6 }, { y: 5.6, n: 4, w: 1, h: 2.2 }]} merlons={false} />
    <group position={[-22, 10.2, -30]}>
      <mesh material={m.sand} position={[0, 1.3, 0]}><cylinderGeometry args={[5.6, 6, 2.6, 16]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2).map((a) => <group key={a} position={[Math.sin(a) * 5.82, 0.6, Math.cos(a) * 5.82]} rotation-y={a}><mesh geometry={archGeo(0.7, 1.5, false)} material={m.hole} /></group>)}
      <mesh material={m.sandDark} position={[0, 2.6, 0]}><sphereGeometry args={[5.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      {Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2).map((a) => <mesh key={a} material={m.trim} position={[0, 2.6, 0]} rotation-y={a}><torusGeometry args={[5.72, 0.09, 4, 16, Math.PI / 2]} /></mesh>)}
      <mesh material={m.trim} position={[0, 8.5, 0]}><cylinderGeometry args={[0.2, 0.35, 1.2, 8]} /></mesh>
    </group>
    <group position={[-9, 0, -34]}>
      <mesh material={m.sand} position={[0, 2, 0]}><cylinderGeometry args={[2.1, 2.3, 4, 12]} /></mesh>
      <mesh material={m.stripe} position={[0, 12, 0]}><cylinderGeometry args={[1.45, 1.65, 16, 14]} /></mesh>
      <mesh material={m.trim} position={[0, 20.2, 0]}><cylinderGeometry args={[2.2, 1.6, 0.6, 14]} /></mesh>
      <mesh material={m.trim} position={[0, 21.1, 0]}><torusGeometry args={[2.05, 0.1, 4, 20]} /></mesh>
      <mesh material={m.sand} position={[0, 22.2, 0]}><cylinderGeometry args={[1.2, 1.3, 2.4, 14]} /></mesh>
      <mesh material={m.red} position={[0, 24.6, 0]}><coneGeometry args={[1.35, 3, 14]} /></mesh>
    </group>
    {/* türbe: sekizgen, her yüzde kör kemer, silme, taş külah */}
    <group position={[-16, 0, -10]}>
      <mesh material={m.sandDark} position={[0, 0.6, 0]}><cylinderGeometry args={[4.2, 4.3, 1.2, 8]} /></mesh>
      <mesh material={m.sand} position={[0, 4.4, 0]}><cylinderGeometry args={[3.3, 3.4, 6.6, 8]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2 + Math.PI / 8).map((a) => <group key={a} position={[Math.sin(a) * 3.12, 2, Math.cos(a) * 3.12]} rotation-y={a}><mesh geometry={archGeo(1.6, 4)} material={m.trim} /><mesh geometry={archGeo(1.1, 3.4)} material={m.sandDark} position={[0, 0.15, 0.01]} /></group>)}
      <mesh material={m.trim} position={[0, 7.9, 0]}><cylinderGeometry args={[3.6, 3.6, 0.45, 8]} /></mesh>
      <mesh material={m.red} position={[0, 10, 0]}><coneGeometry args={[3.6, 3.9, 8]} /></mesh>
    </group>
    {/* harem ve tören salonu: iki kat pencere, orta cumba */}
    <Block p={[-56, 0, 0]} s={[44, 13, 28]} rotY={Math.PI / 2} m={m} rows={[{ y: 1.6, n: 7, w: 1.3, h: 2.8 }, { y: 7.2, n: 9, w: 1, h: 2.3 }]} />
    <group position={[-41.2, 6.4, -12]}><mesh geometry={bx(1.6, 3.8, 5)} material={m.sandDark} position={[0, 1.9, 0]} /><mesh geometry={bx(1.9, 0.4, 5.4)} material={m.trim} position={[0, 3.9, 0]} /></group>
  </group>);
}
/** Arkadaki kayalıkta Eski Bayazıt kalesinin mazgallı sur kalıntıları ve kuleler (temsilî) */
export function OldFortress({ m }: { m: Mats }) {
  const segs = useMemo(() => { const r = rng(91), out: [number, number, number, number][] = []; for (let i = 0; i < 10; i++) { const x = -170 + i * 22, z = -132 - r() * 18 + i * 3; out.push([x, z, 4 + r() * 6, r() * 0.5 - 0.25]); } return out; }, []);
  return <group>{segs.map(([x, z, h, a], i) => <group key={i} position={[x, heightAt(x, z) - 0.5, z]} rotation-y={a}>
    <mesh geometry={bx(18, h, 3)} material={m.sandDark} position={[0, h / 2, 0]} />
    {Array.from({ length: 8 }, (_, k) => <mesh key={k} geometry={bx(1, 1, 3)} material={m.sandDark} position={[-8 + k * 2.3, h + 0.5, 0]} />)}
    {i % 3 === 0 && <mesh material={m.sandDark} position={[9, h * 0.75, 0]}><cylinderGeometry args={[2.6, 3, h * 1.5, 12]} /></mesh>}
  </group>)}</group>;
}
/** Süsleme panosu: önce aşınmış taş; bulmaca çözülünce motif dokusu */
export function Panel({ stop, done, m }: { stop: Stop; done: boolean; m: Mats }) {
  const tex = useMemo(() => { const t = new THREE.TextureLoader().load(motifURL(stop.motif)); t.colorSpace = THREE.SRGBColorSpace; return t; }, [stop.motif]);
  const worn = useMemo(() => stoneTex('ip-worn', ['#a58c68', '#9a8261', '#ad946f'], [60, 40], [90, 80]).map, []);
  const { at, yaw, size } = stop.panel;
  return <group position={at} rotation-y={yaw}>
    {stop.id === 'teras' && <mesh geometry={bx(2.4, 2.1, 0.5)} material={m.sandDark} position={[0, -1.05, -0.3]} />}
    <mesh geometry={bx(size + 0.4, size + 0.4, 0.14)} material={m.trim} position={[0, 0, -0.06]} />
    <mesh><planeGeometry args={[size, size]} /><meshStandardMaterial map={done ? tex : worn} roughness={0.85} emissive={done ? '#5a3c18' : '#000'} emissiveIntensity={done ? 0.2 : 0} polygonOffset polygonOffsetFactor={-2} /></mesh></group>;
}
