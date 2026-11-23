/**
 * Giresun Adası — 3B modeller. Kayalık ada ve çalılar, Bizans kilisesinin taş duvarları ve sütün kaideleri, altındaki Helenistik temel
 * taşları, sarnıç çukuru, iskele, tekneler ve deniz. Ölçüler, kilise planı ve kaya biçimleri TEMSİLÎDİR (docs/GIRESUN.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { CHURCH, CHURCH_T, CISTERN, DOOR_HALF, heightAt, ISLE } from './site';

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
  const geo = useMemo(() => { const N = 150, g = new THREE.PlaneGeometry(ISLE.a * 2.1, ISLE.b * 2.1, N, Math.round(N * 0.6)); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), rock = new THREE.Color('#8a8270'), grass = new THREE.Color('#6f8a4a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x / ISLE.a, z / ISLE.b); p.setY(i, d >= 1 ? -1.5 + Math.max(0, 1 - d) * 0 : heightAt(x, z));
      c.copy(rock).lerp(grass, Math.max(0, 1 - d * 1.3) * 0.7); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors roughness={1} /></mesh>;
}
export function Sea() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b6f86', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.93 }), []);
  return <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} userData={{ noCast: true }}><planeGeometry args={[1400, 1400]} /><primitive object={mat} attach="material" /></mesh>;
}

/* ===================== kilise kalıntısı ve temeller ===================== */
export function Church({ m }: { m: Mats }) {
  const walls = useMemo(() => { const p: Parts = [], C = CHURCH, t = CHURCH_T, H = 5.4, y = heightAt(0, 0) - 0.4;
    slab(p, C.x0, C.x1, C.z0, C.z0 + t, H, y); slab(p, C.x0, C.x0 + t, C.z0, C.z1, H, y); slab(p, C.x1 - t, C.x1, C.z0, C.z1, H, y);
    slab(p, C.x0, -DOOR_HALF, C.z1 - t, C.z1, H, y); slab(p, DOOR_HALF, C.x1, C.z1 - t, C.z1, H, y);
    slab(p, -DOOR_HALF, DOOR_HALF, C.z1 - t, C.z1, 1.6, y + 3.8);   // kapı üstü
    // kırık duvar parçaları (harabe görünümü)
    slab(p, C.x0 + 1, C.x0 + 3.5, C.z0, C.z0 + t, 2.2, y + H); slab(p, C.x1 - 4, C.x1 - 2, C.z0, C.z0 + t, 1.4, y + H);
    return merge(p); }, []);
  const floor = useMemo(() => { const parts: Parts = [];
    // Helenistik tapınağın temel taşları: kilisenin iç mekânında, kısmen açık, düzenli sıra
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const g = bx(2.4, 0.6, 2.4, 1.5); g.translate(-7.6 + i * 2.6, heightAt(0, 0) - 0.35, -2.4 + j * 2.6); parts.push(g); }
    // kilise zemini: düzgün taş döşeme
    const pav = bx(CHURCH.x1 - CHURCH.x0 - 2 * CHURCH_T, 0.1, CHURCH.z1 - CHURCH.z0 - 2 * CHURCH_T, 3); pav.translate(0, heightAt(0, 0) + 0.04, 0); parts.push(pav);
    // sütün kaideleri (nef iki yanında)
    for (const x of [-5, 5]) for (const z of [-2, 2]) { const c = new THREE.CylinderGeometry(0.55, 0.7, 1.2, 10); c.translate(x, heightAt(0, 0) + 0.5, z); parts.push(c); }
    return merge(parts); }, []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={floor} material={m.block} castShadow receiveShadow />
  </group>;
}

/* ===================== sarnıç, iskele, tekneler, çalılar ===================== */
export function Cistern({ m }: { m: Mats }) {
  const y = heightAt(CISTERN.x, CISTERN.z);
  return <group position={[CISTERN.x, y, CISTERN.z]}>
    <mesh position={[0, 0.02, 0]}><circleGeometry args={[CISTERN.r, 20]} /><primitive object={m.dark} attach="material" /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.2, 0]} castShadow receiveShadow><ringGeometry args={[CISTERN.r, CISTERN.r + 0.9, 24]} /><primitive object={m.block} attach="material" /></mesh>
  </group>;
}
export function Jetty({ m }: { m: Mats }) {
  return <group>
    <mesh position={[0, 0.25, 41]} castShadow receiveShadow><boxGeometry args={[4, 0.3, 12]} /><primitive object={m.wood} attach="material" /></mesh>
    {[-1.6, 1.6].map((x) => [36, 46].map((z) => <mesh key={`${x}${z}`} position={[x, -0.4, z]}><cylinderGeometry args={[0.12, 0.12, 2.4, 6]} /><primitive object={m.wood} attach="material" /></mesh>))}
  </group>;
}
export function Boats() {
  const list = useMemo(() => [{ x: -4, z: 52, c: '#2f5f8a', yaw: 0.2 }, { x: 5, z: 55, c: '#a83a2a', yaw: -0.3 }], []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useEffect(() => { let raf = 0; const t0 = performance.now(); const tick = () => { const t = (performance.now() - t0) / 1000; refs.current.forEach((g, i) => { if (g) { g.position.y = -0.3 + Math.sin(t * 0.9 + i) * 0.08; g.rotation.z = Math.sin(t * 0.7 + i) * 0.03; } }); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf); }, []);
  return <group>{list.map((b, i) => <group key={i} ref={(g) => { refs.current[i] = g; }} position={[b.x, -0.3, b.z]} rotation-y={b.yaw}>
    <mesh castShadow scale={[2, 1, 6]}><sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color={b.c} roughness={0.6} side={THREE.DoubleSide} /></mesh>
  </group>)}</group>;
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
