/**
 * Ertuğrul Gazi Türbesi — 3B modeller. Taş duvarlı bahçe ve kapı, altıgen gövdeli kubbeli türbe, nöbet kulübeleri, iki yanda büstler, çam ve servi,
 * batıdaki tepede küçük bir cami, şenlik alanında kıl çadır, çevrede Söğüt evleri ve dağlar. Ölçüler, büstlerin biçimi ve yerleşim TEMSİLÎDİR
 * (docs/ERTUGRUL.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { AREA, BUSTS, GARDEN, GATE, HILL, MOSQUE, POSTS, TENT, TOMB, WALL_T, groundY } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; dome: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; tent: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('ertugrul-tas', ['#c3b79f', '#b3a78e', '#cfc4ac', '#a39880'], [14, 10], [30, 40]);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.35, roughness: 0.95 })),
      plaster: new THREE.MeshStandardMaterial({ color: '#e8dfc9', roughness: 0.95 }),
      dome: new THREE.MeshStandardMaterial({ color: '#7d8a82', roughness: 0.55, metalness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6d4b2e', roughness: 0.85 }),
      tent: new THREE.MeshStandardMaterial({ color: '#2f2a26', roughness: 1, side: THREE.DoubleSide }),
      paving: new THREE.MeshStandardMaterial({ color: '#cdc4ae', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== bahçe ve türbe ===================== */
export function Garden({ m }: { m: Mats }) {
  const walls = useMemo(() => { const p: Parts = [], G = GARDEN, t = WALL_T, h = 3.2;
    slab(p, G.x0 - t, G.x1 + t, G.z0 - t, G.z0, h); slab(p, G.x0 - t, G.x0, G.z0, G.z1 + t, h); slab(p, G.x1, G.x1 + t, G.z0, G.z1 + t, h);
    slab(p, G.x0 - t, GATE.x0, G.z1, G.z1 + t, h); slab(p, GATE.x1, G.x1 + t, G.z1, G.z1 + t, h);
    // kapı sütunları
    for (const x of [GATE.x0 - 0.6, GATE.x1 + 0.6]) { const c = bx(1.4, h + 1.6, 1.4, 1.5); c.translate(x, (h + 1.6) / 2, G.z1 + t / 2); p.push(c); }
    const lint = bx(GATE.x1 - GATE.x0 + 2.8, 0.7, 1.4, 1.5); lint.translate(0, h + 1.2, G.z1 + t / 2); p.push(lint);
    return merge(p); }, []);
  const tomb = useMemo(() => { const p: Parts = [], c = TOMB.c, r = TOMB.r, H = 5.2;
    const body = new THREE.CylinderGeometry(r, r + 0.2, H, 6); body.rotateY(Math.PI / 6); body.translate(c[0], H / 2, c[1]); p.push(body);
    const band = new THREE.CylinderGeometry(r + 0.25, r + 0.25, 0.35, 6); band.rotateY(Math.PI / 6); band.translate(c[0], H, c[1]); p.push(band);
    const step = new THREE.CylinderGeometry(r + 1.4, r + 1.6, 0.4, 6); step.rotateY(Math.PI / 6); step.translate(c[0], 0.2, c[1]); p.push(step);
    return merge(p); }, []);
  const posts = useMemo(() => { const p: Parts = []; for (const q of POSTS) { slab(p, q[0] - 0.8, q[0] + 0.8, q[1] - 0.8, q[1] + 0.8, 0.5, 0, 1); const body = new THREE.CapsuleGeometry(0.28, 1.2, 4, 8); body.translate(q[0], 1.4, q[1]); p.push(body); } return merge(p); }, []);
  const busts = useMemo(() => { const p: Parts = [], q: Parts = []; for (const b of BUSTS) { slab(p, b[0] - 0.4, b[0] + 0.4, b[1] - 0.4, b[1] + 0.4, 1.3, 0, 1); const h = new THREE.SphereGeometry(0.34, 12, 10); h.translate(b[0], 1.7, b[1]); q.push(h); const sh = bx(0.7, 0.3, 0.35, 1); sh.translate(b[0], 1.4, b[1]); q.push(sh); } return { base: merge(p), heads: merge(q) }; }, []);
  const ground = useMemo(() => { const g = new THREE.PlaneGeometry(GARDEN.x1 - GARDEN.x0, GARDEN.z1 - GARDEN.z0); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, (GARDEN.z0 + GARDEN.z1) / 2); return g; }, []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ground} material={m.paving} receiveShadow />
    <mesh geometry={tomb} material={m.stone} castShadow receiveShadow />
    {/* kubbe, kırma çatı yerine yarım küre kubbe ve kapı */}
    <mesh position={[TOMB.c[0], 5.2 + 0.35, TOMB.c[1]]} castShadow><sphereGeometry args={[TOMB.r * 0.98, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
    <mesh position={[TOMB.c[0], 5.2 + 0.35 + TOMB.r * 0.98 + 0.4, TOMB.c[1]]}><sphereGeometry args={[0.35, 10, 8]} /><primitive object={m.dome} attach="material" /></mesh>
    <mesh position={[TOMB.c[0], 1.9, TOMB.c[1] + TOMB.r * 0.87 + 0.05]}><planeGeometry args={[1.9, 3.4]} /><primitive object={m.dark} attach="material" /></mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[s * 2.6, 3, TOMB.c[1] + TOMB.r * 0.75 + 0.3]} rotation-y={s * -0.5}><planeGeometry args={[0.9, 1.5]} /><primitive object={m.dark} attach="material" /></mesh>)}
    <mesh geometry={posts} material={m.stone} castShadow receiveShadow />
    <mesh geometry={busts.base} material={m.stone} castShadow receiveShadow />
    <mesh geometry={busts.heads} material={m.plaster} castShadow />
    <pointLight position={[TOMB.c[0], 3.2, TOMB.c[1] + TOMB.r + 1]} color="#ffe6bf" intensity={14} distance={14} decay={2} />
  </group>;
}

/* ===================== cami, çadır, şehir ===================== */
export function Landmarks({ m }: { m: Mats }) {
  const y = groundY(MOSQUE.c[0], MOSQUE.c[1]);
  return <group>
    {/* tepedeki cami */}
    <group position={[MOSQUE.c[0], y, MOSQUE.c[1]]}>
      <mesh position={[0, 2.4, 0]} castShadow receiveShadow><boxGeometry args={[7, 4.8, 7]} /><primitive object={m.plaster} attach="material" /></mesh>
      <mesh position={[0, 4.8, 0]} castShadow><sphereGeometry args={[3.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.dome} attach="material" /></mesh>
      <mesh position={[3.9, 6, 3.9]} castShadow><cylinderGeometry args={[0.45, 0.6, 12, 12]} /><primitive object={m.stone} attach="material" /></mesh>
      <mesh position={[3.9, 12.4, 3.9]} castShadow><coneGeometry args={[0.65, 2.4, 12]} /><primitive object={m.dome} attach="material" /></mesh>
      <mesh position={[0, 1.4, 3.52]}><planeGeometry args={[1.5, 2.6]} /><primitive object={m.dark} attach="material" /></mesh>
    </group>
    {/* şenlik alanındaki kıl çadır */}
    <mesh position={[TENT.c[0], 2, TENT.c[1]]} castShadow receiveShadow><coneGeometry args={[TENT.r + 0.6, 4, 8]} /><primitive object={m.tent} attach="material" /></mesh>
    <mesh position={[TENT.c[0], 4.2, TENT.c[1]]}><cylinderGeometry args={[0.05, 0.05, 1.6, 6]} /><primitive object={m.wood} attach="material" /></mesh>
  </group>;
}
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 70; i++) { const side = r(), x = side < 0.35 ? -72 - r() * 60 : side < 0.7 ? 72 + r() * 60 : -64 + r() * 128, z = side < 0.7 ? -36 + r() * 100 : 70 + r() * 40, w = 7 + r() * 5, d = 7 + r() * 5, h = 5 + r() * 4;
      const b = bx(w, h, d, 2.4); b.translate(x, h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.1, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.dark} castShadow />
  </group>;
}

/* ===================== arazi, ağaçlar, dağlar ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(360, 260, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 14);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#86a05a'), dry = new THREE.Color('#a9a672'), pave = new THREE.Color('#d2c9b2');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z));
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.05 + z * 0.04)); if (Math.abs(x) < 32 && z > 14 && z < 62) c.lerp(pave, 0.65); if (Math.abs(x) < 30 && z > GARDEN.z0 && z < GARDEN.z1) c.lerp(pave, 0.4);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: Parts = []; const t = new THREE.CylinderGeometry(0.25, 0.4, 3, 7); t.translate(0, 1.5, 0); parts.push(t);
    for (let k = 0; k < 3; k++) { const c = new THREE.ConeGeometry(2.2 - k * 0.5, 3.2, 8); c.translate(0, 4 + k * 1.8 + r() * 0.2, 0); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f5a33', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 10 && k < n; i++) { const x = -120 + r() * 240, z = -60 + r() * 150;
      if (x > AREA.x0 - 4 && x < AREA.x1 + 4 && z > AREA.z0 - 4 && z < AREA.z1 + 4) continue;
      o.position.set(x, groundY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1 + r() * 0.8); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    // bahçenin dış duvarı boyunca servi
    for (let x = -18; x <= 18; x += 12) { o.position.set(x, 0, GARDEN.z0 - 4); o.rotation.set(0, 0, 0); o.scale.setScalar(1.1); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n + 8]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -64 + r() * 128, z = -34 + r() * 98;
      if ((x > GARDEN.x0 - 2 && x < GARDEN.x1 + 2 && z > GARDEN.z0 - 2 && z < GARDEN.z1 + 2) || (Math.abs(x) < 30 && z > 14 && z < 62)) continue;
      if (Math.hypot(x - HILL.c[0], z - HILL.c[1]) < 4.5) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 700 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(360 + r() * 180, 140 + r() * 120, 290 + i, 0, '#5d7a48') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
