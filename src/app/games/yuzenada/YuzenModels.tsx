/**
 * Yüzen Adalar — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Krater çanağı (otlak yamaçlar, seyrek meşe), dalgacıklı göl yüzeyi, kıyıda saz kuşağı, kıyı yolu ve otopark patikası, ahşap iskeleler,
 * üç yüzen ada (turba kenarlı, çayırlı, sazlı, üzerinde söğüt), uzak karlı dağlar. Adalar her karede `islandAt` ile konumlanır.
 * Ölçüler ve ada biçimleri TEMSİLÎDİR (docs/YUZEN-ADALAR.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { ISLANDS, ISLAND_Y, LAKE_R, PIERS, PIER_W, RING_R, RING_W, SPUR, SPUR_W, WATER_Y, groundY, islandAt, onPier, onRing, onSpur, terrainBase } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.45, 0.66, 0.6).normalize();
/** Simülasyon zamanı (oyun yöneticisi ilerletir; adalar buna göre konumlanır) */
export const sim = { t: 0 };
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ===================== arazi, su, yol ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 300 : tier === 'medium' ? 230 : 160, S = 720, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 30);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const grass = new THREE.Color('#7f9a4c'), lush = new THREE.Color('#5f8a3c'), dry = new THREE.Color('#a8a066'), mud = new THREE.Color('#5d5444'), path = new THREE.Color('#a89a7c'), rock = new THREE.Color('#8f8676');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = terrainBase(x, z), rr = Math.hypot(x, z); p.setY(i, y); uv.setXY(i, x / S + 0.5, -z / S + 0.5);
      const sl = Math.hypot(terrainBase(x + 1, z) - terrainBase(x - 1, z), terrainBase(x, z + 1) - terrainBase(x, z - 1)) / 2;
      c.copy(grass).lerp(lush, smooth(LAKE_R + 14, LAKE_R, rr) * 0.8).lerp(dry, smooth(LAKE_R + 40, LAKE_R + 110, rr) * 0.6 + 0.15 * Math.sin(x * 0.04 + z * 0.03)).lerp(rock, smooth(0.45, 0.9, sl) * 0.6 * r());
      if (y < 0.3) c.lerp(mud, 0.7);
      if (onRing(x, z, -0.6) || onSpur(x, z, -0.6)) c.lerp(path, 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Lake() {
  const tex = useMemo(() => { const t = canvasTex(256, 256, (g, r) => { g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; const x = r() * 256, y = r() * 256, w = 8 + r() * 24; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 3, x + w, y); g.stroke(); } }, false); t.repeat.set(10, 10); return t; }, []);
  useFrame((_, dt) => { tex.offset.x += dt * 0.006; tex.offset.y += dt * 0.004; });
  return <mesh rotation-x={-Math.PI / 2} position={[0, WATER_Y, 0]} userData={{ noCast: true }} receiveShadow>
    <circleGeometry args={[LAKE_R + 6, 96]} /><meshStandardMaterial color="#4d7f86" roughness={0.08} metalness={0.25} bumpMap={tex} bumpScale={0.15} envMapIntensity={1.4} />
  </mesh>;
}
export function Paths() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const ringG = new THREE.RingGeometry(RING_R - RING_W / 2 - 0.2, RING_R + RING_W / 2 + 0.2, 160, 2); ringG.rotateX(-Math.PI / 2); parts.push(ringG.toNonIndexed());
    for (let i = 0; i < SPUR.length - 1; i++) { const a = SPUR[i], b = SPUR[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + SPUR_W, g = new THREE.PlaneGeometry(SPUR_W + 0.4, L, 2, Math.ceil(L / 0.8)); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1])); g.translate((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2); parts.push(g.toNonIndexed()); }
    const g = mergeGeometries(parts.map((q) => { q.deleteAttribute('normal'); return q; }))!; const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, Math.max(terrainBase(x, z), 0.45) + 0.05); uv.setXY(k, x / 3, z / 3); }
    g.computeVertexNormals(); return g;
  }, []);
  const tex = useMemo(() => canvasTex(256, 256, (g, r) => { g.fillStyle = '#a9997a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const v = 0.7 + r() * 0.45; g.fillStyle = `rgb(${(172 * v) | 0},${(158 * v) | 0},${(130 * v) | 0})`; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 3, 0, 7); g.fill(); } }), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial map={tex} roughness={1} /></mesh>;
}
export function Piers() {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (const p of PIERS) { const L = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]), ux = (p.b[0] - p.a[0]) / L, uz = (p.b[1] - p.a[1]) / L, yaw = Math.atan2(ux, uz);
      for (let s = 0; s < L; s += 0.42) { const x = p.a[0] + ux * s, z = p.a[1] + uz * s, g = new THREE.BoxGeometry(PIER_W + 0.2, 0.09, 0.36); g.rotateY(yaw); g.translate(x, groundY(x, z) - 0.05, z); parts.push(g); }
      for (let s = 2; s <= L; s += 2.5) for (const side of [-1, 1]) { const x = p.a[0] + ux * s + uz * side * (PIER_W / 2 + 0.05), z = p.a[1] + uz * s - ux * side * (PIER_W / 2 + 0.05), y = groundY(p.a[0] + ux * s, p.a[1] + uz * s), g = new THREE.CylinderGeometry(0.09, 0.1, y + 2.2, 6); g.translate(x, (y - 2.2) / 2 + 0.55, z); parts.push(g); }
      for (const side of [-1, 1]) { const x1 = p.a[0] + uz * side * (PIER_W / 2 + 0.05), z1 = p.a[1] - ux * side * (PIER_W / 2 + 0.05), g = new THREE.BoxGeometry(0.07, 0.07, L - 2); g.rotateY(yaw); g.translate(x1 + ux * (L / 2 - 1), 1.5, z1 + uz * (L / 2 - 1)); parts.push(g); }
    }
    return mergeGeometries(parts.map((g) => g.toNonIndexed()))!; }, []);
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#7d5c3c" roughness={0.85} /></mesh>;
}

/* ===================== sazlar, ot, ağaç ===================== */
function useReedCards() {
  return useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!, r = rng(21);
    for (let i = 0; i < 13; i++) { const x = 6 + r() * 52, h = 150 + r() * 100, lean = (r() - 0.5) * 16, v = 0.75 + r() * 0.35; g.strokeStyle = `rgb(${(150 * v) | 0},${(165 * v) | 0},${(85 * v) | 0})`; g.lineWidth = 2 + r() * 1.5; g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + lean * 0.3, 256 - h * 0.6, x + lean, 256 - h); g.stroke(); if (r() < 0.4) { g.fillStyle = '#6b4a30'; g.fillRect(x + lean - 2, 256 - h, 4, 16); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter;   // ince saplar uzakta kararmasın
    const a = new THREE.PlaneGeometry(0.7, 1.5); a.translate(0, 0.9, 0); const geo = mergeGeometries([a.clone(), a.clone().rotateY(Math.PI / 2)])!;
    const n = geo.attributes.normal as THREE.BufferAttribute; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    return { geo, mat: new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 }) };
  }, []);
}
/** Kıyı kuşağında sazlık (yolun ve iskelelerin önü açık) */
export function Reeds({ n }: { n: number }) {
  const { geo, mat } = useReedCards(), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(3), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const a = r() * Math.PI * 2, rr = LAKE_R - 3 + r() * 4.5, x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (onPier(x, z, -2) || onRing(x, z, -0.8) || Math.sin(a * 5 + 1) < -0.4) continue;   // kuşak yer yer kesilir: göl görünür
      o.position.set(x, Math.max(terrainBase(x, z), -0.6), z); o.rotation.set(0, r() * 3, 0); const s = 0.6 + r() * 0.5; o.scale.set(s, s * (0.7 + r() * 0.5), s); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Grass({ n }: { n: number }) {
  const tuft = useRef<THREE.InstancedMesh>(null), flower = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0, f = 0; const nf = Math.floor(n / 6);
    for (let i = 0; i < n * 5 && k < n; i++) { const a = r() * Math.PI * 2, rr = LAKE_R + 2 + r() * 90, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (onRing(x, z, -0.6) || onSpur(x, z, -0.6) || onPier(x, z, -0.6) || terrainBase(x, z) < 0.3) continue;
      o.position.set(x, terrainBase(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.45 + r() * 0.45; o.scale.set(s, s * (0.8 + r() * 0.5), s); o.updateMatrix(); tuft.current?.setMatrixAt(k, o.matrix); c.setHSL(0.2 + r() * 0.06, 0.4, 0.42 + r() * 0.12); tuft.current?.setColorAt(k, c); k++;
      if (f < nf && r() < 0.3) { o.position.y += 0.3 * s; o.scale.setScalar(0.035 + r() * 0.025); o.updateMatrix(); flower.current?.setMatrixAt(f, o.matrix); flower.current?.setColorAt(f, c.set(['#e9c93a', '#f2efe6', '#b85a9a'][Math.floor(r() * 3)])); f++; } }
    for (const [m, cc] of [[tuft.current, k], [flower.current, f]] as const) if (m) { m.count = cc; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}>
    <instancedMesh ref={tuft} args={[geo, mat, n]} />
    <instancedMesh ref={flower} args={[undefined, undefined, Math.floor(n / 6)]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </group>;
}
function treeGeo(kind: 'sogut' | 'mese', seed: number) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], c = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
  const noisy = (g: THREE.BufferGeometry, a: number) => { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 4.1 + p.getY(i) * 3.3) * Math.cos(p.getZ(i) * 3.7) * a; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } return g; };
  if (kind === 'sogut') { parts.push(paint(new THREE.CylinderGeometry(0.18, 0.3, 2.4, 7).translate(0, 1.2, 0), '#5f5040', 0.05)); for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1 + r() * 0.7 : 0; parts.push(paint(noisy(new THREE.SphereGeometry(1.2 + r() * 0.4, 9, 7), 0.14).scale(1, 1.3, 1).translate(Math.cos(a) * d, 2.8 + r() * 1.1, Math.sin(a) * d), '#8fa856', 0.12)); } }
  else { parts.push(paint(new THREE.CylinderGeometry(0.2, 0.35, 2.4, 7).translate(0, 1.2, 0), '#5a4330', 0.05)); for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = i ? 1 + r() * 0.6 : 0; parts.push(paint(noisy(new THREE.IcosahedronGeometry(1.4 + r() * 0.5, 1), 0.12).translate(Math.cos(a) * d, 3 + r() * 1.2, Math.sin(a) * d), '#5b7234', 0.1)); } }
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g;
}
const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => treeGeo('mese', 4), []), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 10 && k < n; i++) { const a = r() * Math.PI * 2, rr = LAKE_R + 14 + r() * 140, x = Math.cos(a) * rr, z = Math.sin(a) * rr; if (onRing(x, z, -4) || onSpur(x, z, -4) || (Math.sin(a * 3 + 1) < 0.2 && r() < 0.7)) continue;
      o.position.set(x, terrainBase(x, z) - 0.15, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.7 + r() * 0.5); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, treeMat, n]} castShadow receiveShadow />;
}

/* ===================== yüzen adalar ===================== */
function islandGeo(r: number, seed: number) {
  const rr = rng(seed), g = new THREE.CylinderGeometry(r, r * 0.92, 1.1, 40, 2), p = g.attributes.position as THREE.BufferAttribute, col: number[] = [], c = new THREE.Color();
  const wob = Array.from({ length: 5 }, () => [rr() * 6.28, 0.06 + rr() * 0.08]);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + wob.reduce((s, [ph, am], j) => s + Math.sin(a * (j + 2) + ph) * am, 0);
    p.setXYZ(i, x * k, y + (y > 0.5 ? (rr() - 0.5) * 0.12 : 0), z * k);
    c.set(y > 0.5 && Math.hypot(x, z) < r * 0.85 ? '#7d9a48' : y > 0.5 ? '#6b7a3a' : '#3f3226').offsetHSL(0, 0, (rr() - 0.5) * 0.08); col.push(c.r, c.g, c.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.translate(0, -0.55 + ISLAND_Y, 0); g.computeVertexNormals(); return g;
}
const islandMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
/** Bir adanın üstü: ot, kenarda saz, ortada söğütler (adanın yerel koordinatında) */
function IslandTop({ r, trees, seed }: { r: number; trees: number; seed: number }) {
  const { geo, mat } = useGrassCards(), reeds = useReedCards(), tuft = useRef<THREE.InstancedMesh>(null), reed = useRef<THREE.InstancedMesh>(null);
  const tree = useMemo(() => treeGeo('sogut', seed), [seed]);
  const treePos = useMemo(() => { const q = rng(seed + 7); return Array.from({ length: trees }, (_, i) => { const a = (i / trees) * 6.28 + q(), d = trees === 1 ? 0 : r * (0.25 + q() * 0.3); return [Math.cos(a) * d, ISLAND_Y, Math.sin(a) * d, 0.6 + q() * 0.4] as const; }); }, [r, trees, seed]);
  const nT = Math.round(r * r * 3), nR = Math.round(r * 9);
  useEffect(() => { const q = rng(seed), o = new THREE.Object3D(), c = new THREE.Color();
    for (let k = 0; k < nT; k++) { const a = q() * 6.28, d = Math.sqrt(q()) * r * 0.85; o.position.set(Math.cos(a) * d, ISLAND_Y - 0.02, Math.sin(a) * d); o.rotation.set(0, q() * 3, 0); const s = 0.45 + q() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); tuft.current?.setMatrixAt(k, o.matrix); c.setHSL(0.21 + q() * 0.05, 0.45, 0.4 + q() * 0.12); tuft.current?.setColorAt(k, c); }
    for (let k = 0; k < nR; k++) { const a = q() * 6.28, d = r * (0.82 + q() * 0.14); o.position.set(Math.cos(a) * d, ISLAND_Y - 0.3, Math.sin(a) * d); o.rotation.set(0, q() * 3, 0); o.scale.setScalar(0.7 + q() * 0.5); o.updateMatrix(); reed.current?.setMatrixAt(k, o.matrix); }
    for (const m of [tuft.current, reed.current]) if (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [r, seed, nT, nR]);
  return <group>
    <group userData={{ noCast: true }}><instancedMesh ref={tuft} args={[geo, mat, nT]} /><instancedMesh ref={reed} args={[reeds.geo, reeds.mat, nR]} /></group>
    {treePos.map(([x, y, z, s], i) => <mesh key={i} geometry={tree} material={treeMat} position={[x, y, z]} scale={s} castShadow receiveShadow />)}
  </group>;
}
/** Üç yüzen ada: her karede konum + hafif sallanma (salın etkisi) */
export function Islands() {
  const geos = useMemo(() => ISLANDS.map((s, i) => islandGeo(s.r, 11 + i * 7)), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => { ISLANDS.forEach((_, i) => { const g = refs.current[i]; if (!g) return; const { c, yaw } = islandAt(i, sim.t); g.position.set(c[0], islandBob(i, sim.t), c[1]); g.rotation.set(Math.sin(sim.t * 0.7 + i) * 0.012, yaw, Math.cos(sim.t * 0.6 + i * 2) * 0.012); }); });
  return <group>{ISLANDS.map((s, i) => <group key={s.id} ref={(m) => { refs.current[i] = m; }}>
    <mesh geometry={geos[i]} material={islandMat} castShadow receiveShadow />
    <IslandTop r={s.r} trees={s.trees} seed={31 + i * 13} />
  </group>)}</group>;
}
export const islandBob = (i: number, t: number) => Math.sin(t * 0.9 + i * 1.7) * 0.04;
export function Mountains() {
  const list = useMemo(() => { const r = rng(51), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + r() * 0.3, dd = 900 + r() * 600; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(420 + r() * 260, 220 + r() * 260, 80 + i, i % 2 ? 0.7 : 2, '#7f8466') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
