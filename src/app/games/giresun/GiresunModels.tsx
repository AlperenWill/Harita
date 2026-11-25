/**
 * Giresun Adası — 3B modeller. Kayalık ada ve çalılar, Bizans kilisesinin taş duvarları ve sütün kaideleri, altındaki Helenistik temel
 * taşları, sarnıç çukuru, iskele, tekneler ve deniz. Ölçüler, kilise planı ve kaya biçimleri TEMSİLÎDİR (docs/GIRESUN.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { CHURCH, CHURCH_T, CISTERN, DOOR_HALF, HAMZA, JETTY, LAP, heightAt, isleD, ISLE } from './site';
import { useFrame } from '@react-three/fiber';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.6, 0.62).normalize();
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0: number, s = 1.6) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; block: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; shrub: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('giresun-kilise', ['#b8ad98', '#a89d88', '#c4b9a3', '#9a9078'], [14, 10], [30, 36]);
    const bl = stoneTex('giresun-temel', ['#8f8676', '#7f7768', '#9b9280'], [8, 6], [40, 60]);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.95 })),
      block: weather(new THREE.MeshStandardMaterial({ map: bl.map, bumpMap: bl.bump, bumpScale: 0.5, roughness: 0.95 })),
      dark: new THREE.MeshStandardMaterial({ color: '#1f2c30', roughness: 0.2 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.85 }),
      shrub: new THREE.MeshStandardMaterial({ color: '#4f7a3c', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== ada ===================== */
export function Island() {
  // ada: ormanlık yeşil yamaçlar, kıyıda kum ve kaya kuşağı, suyun altında yumuşakça inen taban (önceden kare bir taban levhası saydam denizden görünüyordu)
  const geo = useMemo(() => { const N = 170, g = new THREE.PlaneGeometry(ISLE.a * 2.6, ISLE.b * 2.6, N, Math.round(N * 0.6)); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), forest = new THREE.Color('#4f6f38'), grass = new THREE.Color('#6f8a4a'), sand = new THREE.Color('#c9b98e'), rock = new THREE.Color('#77705f'), sea = new THREE.Color('#2d5f6e');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x / ISLE.a, z / ISLE.b);
      p.setY(i, d < 1 ? heightAt(x, z) : -1.5 - (d - 1) * 14 + 0.6 * Math.max(0, 1.04 - d) * 25);
      if (d < 0.86) c.copy(forest).lerp(grass, 0.3 + 0.3 * Math.sin(x * 0.2 + z * 0.3)); else if (d < 0.97) c.copy(grass).lerp(rock, (d - 0.86) / 0.11); else if (d < 1.03) c.copy(sand).lerp(rock, 0.4 + 0.4 * Math.sin(x * 0.9)); else c.copy(sea);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, []);
  // kıyı kayaları
  const rocks = useMemo(() => { const p: Parts = [], r = rng(31); for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2, d = 0.97 + r() * 0.07, x = Math.cos(a) * ISLE.a * d, z = Math.sin(a) * ISLE.b * d; if (Math.abs(x) < 5 && z > 30) continue;
      const q = new THREE.DodecahedronGeometry(0.6 + r() * 1.4, 0); q.scale(1.3, 0.7 + r() * 0.5, 1); q.rotateY(r() * 6); q.translate(x, -0.6 + r() * 0.6, z); p.push(q); } return merge(p); }, []);
  return <group>
    <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors roughness={1} /></mesh>
    <mesh geometry={rocks} castShadow receiveShadow><meshStandardMaterial color="#6e695c" roughness={0.95} flatShading /></mesh>
  </group>;
}
export function Sea() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b6f86', roughness: 0.18, metalness: 0.15 }), []);
  const shallow = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4fa0a8', roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false }), []);
  const ring = useMemo(() => { const g = new THREE.RingGeometry(1.0, 1.22, 64, 1); g.rotateX(-Math.PI / 2); g.scale(ISLE.a, 1, ISLE.b); return g; }, []);
  return <group userData={{ noCast: true }}>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}><planeGeometry args={[2600, 2600]} /><primitive object={mat} attach="material" /></mesh>
    <mesh geometry={ring} position-y={0.01} material={shallow} />
  </group>;
}
/** Adanın ormanı: yapraklı ağaçlar (kilise çevresi ve iskele yolu açık) */
export function Forest({ n }: { n: number }) {
  // gövde ve taç ayrı renkte: köşe renkleri (gövde kahverengi, taç beyaz) × örnek rengi (yeşil tonları); önceden gövdeler de yeşildi
  const geo = useMemo(() => { const parts: Parts = [], r = rng(8); const paint = (g: THREE.BufferGeometry, c: THREE.Color) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
    const t = new THREE.CylinderGeometry(0.22, 0.35, 4.2, 6).toNonIndexed(); t.translate(0, 2.1, 0); parts.push(paint(t, new THREE.Color('#7a6248').multiplyScalar(2.2)));
    for (let i = 0; i < 5; i++) { const c = new THREE.IcosahedronGeometry(1.4 + r() * 0.6, 1).toNonIndexed(); c.translate((r() - 0.5) * 2, 4.7 + r() * 1.4, (r() - 0.5) * 2); /* taç altı göz hizasının üstünde */ parts.push(paint(c, new THREE.Color(1, 1, 1))); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(19), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 8 && k < n; i++) { const x = -66 + r() * 132, z = -38 + r() * 76, d = isleD(x, z); if (d > 0.9) continue;
      if (Math.abs(x) < 15 && Math.abs(z) < 11) continue; if (Math.abs(x) < 3.5 && z > 8) continue; if (Math.hypot(x - CISTERN.x, z - CISTERN.z) < 4) continue; if (Math.hypot(x - HAMZA.c[0], z - HAMZA.c[1]) < 8) continue;
      if (Math.hypot(x + 28, z + 16) < 4 || Math.hypot(x - 46, z - 8) < 4) continue;
      o.position.set(x, heightAt(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.7); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.26 + r() * 0.06, 0.4, 0.3 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
/** Hamza Taşı: doğu kıyısında büyük siyah kaya */
export function Hamza() {
  const geo = useMemo(() => { const p: Parts = [], r = rng(4); for (let i = 0; i < 5; i++) { const q = new THREE.DodecahedronGeometry(HAMZA.r * (0.55 + r() * 0.4), 1); q.scale(1.1, 0.8 + r() * 0.5, 1); q.translate(HAMZA.c[0] + (r() - 0.5) * 3, -0.5 + r() * 1.4, HAMZA.c[1] + (r() - 0.5) * 3); p.push(q); } return merge(p); }, []);
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#26282a" roughness={0.6} metalness={0.1} flatShading /></mesh>;
}

/* ===================== kilise kalıntısı ve temeller ===================== */
/** Katolikon kalıntısı: kazıyla açılmış alçak ve kırık duvarlar, doğuda yarım daire apsis, iç payeler; altında Helenistik temel blokları (önceden sağlam, kapısı lentolu bir kutuydu) */
export function Church({ m }: { m: Mats }) {
  const walls = useMemo(() => { const p: Parts = [], C = CHURCH, t = CHURCH_T, y = heightAt(0, 0) - 0.4, r = rng(12);
    const run = (x0: number, z0: number, x1: number, z1: number) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / 1.4)), ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, h = 0.8 + r() * 2.8 * (r() < 0.2 ? 0.4 : 1); slab(p, ax ? x0 + (x1 - x0) * (i / n) : x0, ax ? x0 + (x1 - x0) * ((i + 1) / n) : x1, ax ? z0 : z0 + (z1 - z0) * (i / n), ax ? z1 : z0 + (z1 - z0) * ((i + 1) / n), h, y); void u; } };
    run(C.x0, C.z0, C.x1 - 3, C.z0 + t); run(C.x0, C.z0, C.x0 + t, C.z1); run(C.x0, C.z1 - t, -DOOR_HALF, C.z1); run(DOOR_HALF, C.z1 - t, C.x1 - 3, C.z1);
    run(C.x1 - t, C.z0, C.x1, C.z0 + 2.2); run(C.x1 - t, C.z1 - 2.2, C.x1, C.z1);
    // doğu apsisi: yarım daire, kırık üst kenar
    for (let k = 0; k < 10; k++) { const a0 = -Math.PI / 2 + (k / 10) * Math.PI, a1 = -Math.PI / 2 + ((k + 1) / 10) * Math.PI, R = 4.6, h = 1.2 + r() * 2.2;
      const g = new THREE.CylinderGeometry(R, R, h, 3, 1, true, Math.PI / 2 + a0, a1 - a0); g.translate(C.x1 - 1.0, y + h / 2, 0); p.push(g); const g2 = g.clone(); g2.scale(1, 1, 1); p.push(new THREE.CylinderGeometry(R - t, R - t, h, 3, 1, true, Math.PI / 2 + a0, a1 - a0).translate(C.x1 - 1.0, y + h / 2, 0)); }
    return merge(p); }, []);
  const floor = useMemo(() => { const parts: Parts = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const g = bx(2.4, 0.6, 2.4, 1.5); g.translate(-7.6 + i * 2.6, heightAt(0, 0) - 0.35, -2.4 + j * 2.6); parts.push(g); }
    for (const x of [-5, 0, 5]) for (const z of [-2.4, 2.4]) { const c = bx(1.0, 0.9 + (Math.abs(x) % 3) * 0.3, 1.0, 1); c.translate(x, heightAt(0, 0) + 0.4, z); parts.push(c); }
    return merge(parts); }, []);
  const apseMat = useMemo(() => { const mm = m.stone.clone(); mm.side = THREE.DoubleSide; return mm; }, [m.stone]);
  return <group>
    <mesh geometry={walls} material={apseMat} castShadow receiveShadow />
    <mesh geometry={floor} material={m.block} castShadow receiveShadow />
  </group>;
}
export function Cistern({ m }: { m: Mats }) {
  const y = heightAt(CISTERN.x, CISTERN.z);
  return <group position={[CISTERN.x, y, CISTERN.z]}>
    {/* su yüzeyi yatay (önceden dik duran bir diskti); taş ağız yerden yükselen bilezik */}
    <mesh position={[0, -0.25, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[CISTERN.r, 20]} /><primitive object={m.dark} attach="material" /></mesh>
    <mesh position={[0, 0.15, 0]} castShadow receiveShadow><cylinderGeometry args={[CISTERN.r + 0.6, CISTERN.r + 0.7, 0.9, 24, 1, true]} /><primitive object={m.block} attach="material" /></mesh>
    <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[CISTERN.r, CISTERN.r, 0.9, 24, 1, true]} /><meshStandardMaterial color="#5c5548" side={THREE.BackSide} roughness={1} /></mesh>
    <mesh position={[0, 0.6, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[CISTERN.r, CISTERN.r + 0.65, 24]} /><primitive object={m.block} attach="material" /></mesh>
  </group>;
}
export function Jetty({ m }: { m: Mats }) {
  return <group>
    <mesh position={[0, 0.45, (JETTY.z0 + JETTY.z1) / 2]} castShadow receiveShadow><boxGeometry args={[JETTY.x1 - JETTY.x0, 0.3, JETTY.z1 - JETTY.z0]} /><primitive object={m.wood} attach="material" /></mesh>
    {[-1.8, 1.8].map((x) => [38, 42, 46].map((z) => <mesh key={`${x}${z}`} position={[x, -0.3, z]}><cylinderGeometry args={[0.14, 0.14, 2.2, 6]} /><primitive object={m.wood} attach="material" /></mesh>))}
  </group>;
}
/** Kayık gövdesi: uçları daralan, altı yuvarlanan tekne (önceden suyun üstünde yassı mavi elipslerdi) */
function hullGeo(L = 4.4, W = 1.5, H = 0.65) { const g = new THREE.BoxGeometry(W, H, L, 4, 2, 10); const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = Math.abs(z) / (L / 2), taper = 1 - u ** 2.2 * 0.92, bottom = y < 0 ? 0.55 + 0.45 * (1 - u) : 1;
    p.setX(i, x * taper * bottom); p.setY(i, y < 0 ? y * (1 - 0.3 * u) : y + u * u * 0.25); }
  g.computeVertexNormals(); return g; }
export const boatState = { on: false, x: 0, z: 0, yaw: 0 };
export function Boats() {
  const list = useMemo(() => [{ x: -9, z: 47, c: '#2f5f8a', yaw: 0.2 }, { x: 8, z: 46, c: '#a83a2a', yaw: -0.3 }], []);
  const hull = useMemo(() => hullGeo(), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; refs.current.forEach((g, i) => { if (g) { g.position.y = 0.05 + Math.sin(t * 0.9 + i) * 0.06; g.rotation.z = Math.sin(t * 0.7 + i) * 0.03; } }); });
  return <group>{list.map((b, i) => <group key={i} ref={(g) => { refs.current[i] = g; }} position={[b.x, 0, b.z]} rotation-y={b.yaw}>
    <mesh geometry={hull} castShadow><meshStandardMaterial color={b.c} roughness={0.6} /></mesh>
    <mesh position={[0, 0.3, 0]}><boxGeometry args={[1.1, 0.06, 0.35]} /><meshStandardMaterial color="#7a5636" /></mesh>
  </group>)}</group>;
}
/** Oyuncunun kayığı: kayık kipinde oyuncunun altında, bakış yönünde */
export function PlayerBoat() {
  const hull = useMemo(() => hullGeo(4.0, 1.4, 0.6), []), ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const g = ref.current; if (!g) return; g.visible = boatState.on; if (!boatState.on) return; g.position.set(boatState.x, 0.05 + Math.sin(clock.elapsedTime * 1.1) * 0.05, boatState.z); g.rotation.y = boatState.yaw; g.rotation.z = Math.sin(clock.elapsedTime * 0.8) * 0.025; });
  return <group ref={ref} visible={false}>
    <group position={[0, 0, -0.9]}><mesh geometry={hull} castShadow><meshStandardMaterial color="#e8e1cf" roughness={0.6} /></mesh>
      <mesh position={[0, 0.32, 0.7]}><boxGeometry args={[1.0, 0.06, 0.3]} /><meshStandardMaterial color="#7a5636" /></mesh>
      {[-1, 1].map((s2) => <mesh key={s2} position={[s2 * 0.85, 0.35, 0.4]} rotation-z={s2 * 1.2}><boxGeometry args={[0.06, 2.0, 0.1]} /><meshStandardMaterial color="#7a5636" /></mesh>)}</group>
  </group>;
}
/** Tur şamandıraları: sıradaki parlak, geçilenler yeşil */
export const lapState = { next: 0 };
export function Buoys() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => LAP.map(() => new THREE.MeshStandardMaterial({ color: '#e04a2f', emissive: '#e04a2f', emissiveIntensity: 0.3 })), []);
  useFrame(({ clock }) => { refs.current.forEach((mm, i) => { if (!mm) return; const k = i === LAP.length - 1 ? 0 : i; mm.visible = i < LAP.length - 1;
    const done = lapState.next > k && !(k === 0 && lapState.next < LAP.length), cur = lapState.next === i || (k === 0 && lapState.next === LAP.length - 1);
    mats[i].color.set(done ? '#2fbf62' : '#e04a2f'); mats[i].emissive.set(done ? '#2fbf62' : '#e04a2f'); mats[i].emissiveIntensity = cur ? 0.6 + 0.4 * Math.sin(clock.elapsedTime * 5) : 0.25; mm.position.y = 0.5 + Math.sin(clock.elapsedTime * 1.3 + i) * 0.12; }); });
  return <group>{LAP.map((l, i) => <mesh key={l.id} ref={(mm) => { refs.current[i] = mm; }} position={[l.at[0], 0.5, l.at[1]]} material={mats[i]} castShadow><cylinderGeometry args={[0.4, 0.7, 1.6, 12]} /></mesh>)}</group>;
}
export function Shrubs({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const r = rng(5);
    for (let i = 0; i < 3; i++) { const s = new THREE.IcosahedronGeometry(1.2 + r() * 0.4, 1); s.translate(i * 1.2 - 1.2, 0.9, r() * 0.6); parts.push(s); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(17), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 6 && k < n; i++) { const x = -60 + r() * 120, z = -36 + r() * 72;
      const d = Math.hypot(x / ISLE.a, z / ISLE.b); if (d > 0.9 || d < 0.1) continue; if (Math.hypot(x, z) < 12) continue;
      o.position.set(x, heightAt(x, z) - 0.2, z); o.rotation.set(0, r() * 6, 0); const s = 0.5 + r() * 0.6; o.scale.set(s, s * 0.7, s); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, undefined, n]}><meshStandardMaterial color="#5a7d43" roughness={0.95} /></instancedMesh>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.9 + (i / 5) * 0.9) + r() * 0.1, dd = 700 + r() * 300; out.push({ p: [Math.cos(a) * dd, -6, Math.sin(a) * dd], g: mountainGeo(360 + r() * 180, 160 + r() * 120, 150 + i, 1.5, '#5d6e4c') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
