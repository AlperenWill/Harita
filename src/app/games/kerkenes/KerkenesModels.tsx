/**
 * Kerkenes Dağı — 3B modeller. Tepe ve kuru step arazisi, dairesel taş sur ve yedi kapı (iki yanda kuleler), ışınsal sokaklar, taş evler,
 * saray platformu ve sütunlar, kazı çukuru ve ahşap çerçeve. Ölçüler, ev sayısı ve saray düzeni TEMSİLÎDİR (docs/KERKENES.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards } from '../shared/scenery';
import { GATE_ANGLES, GATE_HALF, HOUSES, PALACE, RING, STREET_W, TRENCH, heightAt } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; street: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('kerkenes-tas', ['#a58e6e', '#9a8464', '#b39c7c', '#8c7757', '#a99274'], [16, 12], [26, 34]);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7d6446'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '50,38,24' : '190,160,120'},${r() * 0.25})`; g.fillRect(r() * 256, r() * 256, 3, 3); } });
    const sv = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8f8270'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '70,60,46' : '200,186,160'},${0.1 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 3 + r() * 5, 2 + r() * 3, 0, 0, 7); g.fill(); } }, true, 11);
    sv.repeat.set(4, 4);
    return {
      stone: new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.4, roughness: 0.95 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.9 }),
      street: new THREE.MeshStandardMaterial({ map: sv, roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6d4b2e', roughness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2219', roughness: 1 }),
      plaster: new THREE.MeshStandardMaterial({ color: '#d6c8ab', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 220 : 150, g = new THREE.PlaneGeometry(420, 420, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), dry = new THREE.Color('#9c8b5e'), grass = new THREE.Color('#8a9a5a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, heightAt(x, z));
      c.copy(grass).lerp(dry, 0.5 + 0.3 * Math.sin(x * 0.03 + z * 0.02)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}

/* ===================== sur, kapılar, kuleler ===================== */
export function Wall({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: Parts = [], N = 720, rm = (RING.r0 + RING.r1) / 2, gateSpan = (GATE_HALF + 0.4) / rm;
    const gateAt = (a: number) => GATE_ANGLES.some((g) => { let d = Math.abs(((a - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return d < gateSpan; });
    for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; if (gateAt(a)) continue;
      const seg = (2 * Math.PI * rm) / N, x = Math.cos(a) * rm, z = Math.sin(a) * rm, y = heightAt(x, z);
      const g = bx(RING.r1 - RING.r0, RING.h, seg * 1.04, 2.4); g.rotateY(-a); g.translate(x, y + RING.h / 2 - 0.3, z); parts.push(g);
      if (i % 2 === 0) { const b = bx(RING.r1 - RING.r0, 0.7, seg * 0.5, 1.5); b.rotateY(-a); b.translate(x, y + RING.h + 0.2, z); parts.push(b); } }
    return merge(parts); }, []);
  const gates = useMemo(() => { const parts: Parts = [];
    for (const g of GATE_ANGLES) for (const side of [-1, 1]) { const a = g + side * (GATE_HALF + 1.6) / ((RING.r0 + RING.r1) / 2), rm = (RING.r0 + RING.r1) / 2, x = Math.cos(a) * rm, z = Math.sin(a) * rm, y = heightAt(x, z);
      const t = bx(4.2, RING.h + 2.2, 4.2, 2); t.translate(x, y + (RING.h + 2.2) / 2 - 0.3, z); parts.push(t); }
    return merge(parts); }, []);
  return <group>
    <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
    <mesh geometry={gates} material={m.stone} castShadow receiveShadow />
  </group>;
}

/* ===================== ışınsal sokaklar ===================== */
export function Streets({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (const a of GATE_ANGLES) { const N = 60, pos: number[] = [], idx: number[] = [], ux = Math.cos(a), uz = Math.sin(a), px = -uz, pz = ux;
      for (let i = 0; i <= N; i++) { const r = 4 + (i / N) * (RING.r0 - 6), cx = ux * r, cz = uz * r, y = heightAt(cx, cz) + 0.04, hw = STREET_W / 2;
        pos.push(cx + px * hw, y, cz + pz * hw, cx - px * hw, y, cz - pz * hw); }
      for (let i = 0; i < N; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);   // yüz yukarı baksın (ters sırada şerit görünmüyordu) }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const uv: number[] = []; for (let i = 0; i <= N; i++) uv.push(0, i / 6, 1, i / 6); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals(); parts.push(g); }
    return merge(parts); }, []);
  return <mesh geometry={geo} material={m.street} receiveShadow />;
}

/* ===================== evler ===================== */
export function Houses({ m }: { m: Mats }) {
  const walls = useMemo(() => { const parts: Parts = [];
    for (const h of HOUSES) { const g = bx(h.w, 2.8, h.d, 2.2); g.rotateY(h.yaw); g.translate(h.x, heightAt(h.x, h.z) + 1.4, h.z); parts.push(g); }
    return merge(parts); }, []);
  const roofs = useMemo(() => { const parts: Parts = [];
    for (const h of HOUSES) { const g = new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.62, 1.6, 4, 1); g.rotateY(Math.PI / 4 + h.yaw); g.scale(h.w / Math.max(h.w, h.d), 1, h.d / Math.max(h.w, h.d)); g.translate(h.x, heightAt(h.x, h.z) + 2.8 + 0.8, h.z); parts.push(g); }
    return merge(parts); }, []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={roofs} material={m.roof} castShadow />
  </group>;
}

/* ===================== saray kompleksi ===================== */
export function Palace({ m }: { m: Mats }) {
  const cx = (PALACE.x0 + PALACE.x1) / 2, cz = (PALACE.z0 + PALACE.z1) / 2, W = PALACE.x1 - PALACE.x0, D = PALACE.z1 - PALACE.z0;
  const base = heightAt(cx, cz) + 0.9;
  const walls = useMemo(() => { const parts: Parts = [], t = 2.2, h = 4.4;
    const add = (x0: number, x1: number, z0: number, z1: number) => { const g = bx(x1 - x0, h, z1 - z0, 2.4); g.translate((x0 + x1) / 2, base + h / 2 - 0.6, (z0 + z1) / 2); parts.push(g); };
    add(PALACE.x0, PALACE.x1, PALACE.z0, PALACE.z0 + t); add(PALACE.x0, PALACE.x0 + t, PALACE.z0, PALACE.z1); add(PALACE.x1 - t, PALACE.x1, PALACE.z0, PALACE.z1);
    add(PALACE.x0, -3.2, PALACE.z1 - t, PALACE.z1); add(3.2, PALACE.x1, PALACE.z1 - t, PALACE.z1);
    // giriş kemeri: üst kiriş
    const lint = bx(6.4, 1.1, t, 1.5); lint.translate(0, base + h - 0.4, PALACE.z1 - t / 2); parts.push(lint);
    // iç avlu sütunları
    for (const x of [-12, -4, 4, 12]) for (const z of [-58, -48]) { const c = new THREE.CylinderGeometry(0.5, 0.6, 4.2, 10); c.translate(x, base + 2.1 - 0.6, z); parts.push(c); }
    return merge(parts); }, [base]);
  return <group>
    <mesh position={[cx, base - 1.5, cz]} castShadow receiveShadow><boxGeometry args={[W + 1.2, 3, D + 1.2]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh position={[cx, base + 0.02, cz]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[W - 4.4, D - 4.4]} /><primitive object={m.plaster} attach="material" /></mesh>
    {/* giriş basamakları (güney) */}
    {[0, 1, 2].map((i) => <mesh key={i} position={[0, base - 0.3 + i * 0.3 - 0.5, PALACE.z1 + 1.2 + i * 0.6]} receiveShadow><boxGeometry args={[7, 0.3, 0.7]} /><primitive object={m.stone} attach="material" /></mesh>)}
  </group>;
}

/* ===================== kazı çukuru ===================== */
export function Trench({ m }: { m: Mats }) {
  const cx = (TRENCH.x0 + TRENCH.x1) / 2, cz = (TRENCH.z0 + TRENCH.z1) / 2, W = TRENCH.x1 - TRENCH.x0, D = TRENCH.z1 - TRENCH.z0, y = heightAt(cx, cz);
  const frame = useMemo(() => { const parts: Parts = [];
    for (const [x, z] of [[TRENCH.x0, TRENCH.z0], [TRENCH.x1, TRENCH.z0], [TRENCH.x0, TRENCH.z1], [TRENCH.x1, TRENCH.z1]] as const) { const p = bx(0.3, 1.4, 0.3, 1); p.translate(x, y + 0.5, z); parts.push(p); }
    // ip ağı (gerilmiş ipler)
    for (let i = 1; i < 4; i++) { const g = bx(0.04, 0.04, D, 1); g.translate(TRENCH.x0 + (W * i) / 4, y + 1.2, cz); parts.push(g); const h = bx(W, 0.04, 0.04, 1); h.translate(cx, y + 1.2, TRENCH.z0 + (D * i) / 4); parts.push(h); }
    return merge(parts); }, [cx, cz, W, D, y]);
  return <group>
    <mesh position={[cx, y + 0.03, cz]} receiveShadow><boxGeometry args={[W, 0.06, D]} /><primitive object={m.dark} attach="material" /></mesh>
    <mesh position={[cx, y + 0.25, TRENCH.z0 - 0.4]} castShadow receiveShadow><boxGeometry args={[W + 1.2, 0.5, 0.6]} /><primitive object={m.plaster} attach="material" /></mesh>
    <mesh position={[cx, y + 0.25, TRENCH.z1 + 0.4]} castShadow receiveShadow><boxGeometry args={[W + 1.2, 0.5, 0.6]} /><primitive object={m.plaster} attach="material" /></mesh>
    <mesh geometry={frame} material={m.wood} castShadow />
  </group>;
}

/* ===================== çevre ===================== */
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const a = r() * 6.28, d = 6 + r() * (RING.r0 - 8), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (inStreet(x, z) || HOUSES.some((h) => Math.hypot(h.x - x, h.z - z) < Math.max(h.w, h.d) / 2 + 0.5) || (x > PALACE.x0 - 2 && x < PALACE.x1 + 2 && z > PALACE.z0 - 2 && z < PALACE.z1 + 2) || (x > TRENCH.x0 - 1 && x < TRENCH.x1 + 1 && z > TRENCH.z0 - 1 && z < TRENCH.z1 + 1)) continue;
      o.position.set(x, heightAt(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.35; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.13 + r() * 0.06, 0.4, 0.42 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
function inStreet(x: number, z: number): boolean {
  return GATE_ANGLES.some((a) => { const ux = Math.cos(a), uz = Math.sin(a), t = x * ux + z * uz; return t > 0 && Math.abs(x * uz - z * ux) < STREET_W / 2 + 0.3; });
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.25, dd = 900 + r() * 450; out.push({ p: [Math.cos(a) * dd, -6, Math.sin(a) * dd], g: mountainGeo(520 + r() * 260, 170 + r() * 150, 90 + i, 1.5, '#8a7a58') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
