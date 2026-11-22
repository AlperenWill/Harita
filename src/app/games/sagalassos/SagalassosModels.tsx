/**
 * Sagalassos — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Akdağ yamacı ve teras duvarları, Üst/Aşağı Agora döşemesi, akan sulu Antoninler Çeşmesi (iki katlı sütunlu cephe, havuz, ağızlardan dökülen su),
 * Hadrian Çeşmesi, dans eden kızlar frizli Heroon (naiskos ve heykel), Bouleuterion oturma basamakları, onur sütunları, sütunlu yollar,
 * dağınık bloklar, uzakta tiyatro, ardıç ve otlar, Toros dağları. Ölçüler ve kabartma görüntüleri TEMSİLÎDİR (docs/SAGALASSOS.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BOULE, BT, COLS, HADRIAN, HEROON, LA, NYMPH, STAIR, STEP_W, THEATRE, UA, hill, inR, terrainBase } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.68, 0.55).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;

/* ===================== malzemeler ===================== */
export interface Mats { lime: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const l = stoneTex('sagalassos-kirec', ['#d6cfbf', '#cbc3b1', '#ddd6c8', '#c1b8a5', '#d1c9b8'], [30, 18], [44, 56]);
    const mb = stoneTex('sagalassos-mermer', ['#ece7dd', '#e2dccf', '#f1ede5'], [70, 40], [140, 90]);
    const pv = stoneTex('sagalassos-doseme', ['#c9c1ae', '#bdb4a0', '#d2cab8', '#b5ac98'], [60, 30], [70, 60]);
    for (const t of [pv.map, pv.bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); }
    return {
      lime: weather(new THREE.MeshStandardMaterial({ map: l.map, bumpMap: l.bump, bumpScale: 0.45, roughness: 0.9 })),
      marble: new THREE.MeshStandardMaterial({ map: mb.map, roughness: 0.6 }),
      paving: new THREE.MeshStandardMaterial({ map: pv.map, bumpMap: pv.bump, bumpScale: 0.4, roughness: 0.95 }),
      dark: new THREE.MeshStandardMaterial({ color: '#3a342c', roughness: 1 }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 300 : tier === 'medium' ? 230 : 160, S = 760, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 60);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const dry = new THREE.Color('#9a8f58'), green = new THREE.Color('#748044'), rock = new THREE.Color('#8a8475'), pale = new THREE.Color('#bdb5a1');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = terrainBase(x, z);
      const onT = inR(UA, x, z) || inR(LA, x, z) || inR(BT, x, z) || inR(STAIR, x, z) || inR(STEP_W, x, z);
      if (!onT) y = hill(x, z) - 0.3; p.setY(i, y); uv.setXY(i, x / S + 0.5, -z / S + 0.5);
      const sl = Math.hypot(hill(x + 1, z) - hill(x - 1, z), hill(x, z + 1) - hill(x, z - 1)) / 2;
      c.copy(dry).lerp(green, 0.35 + 0.3 * Math.sin(x * 0.03 + z * 0.02)).lerp(rock, Math.min(1, Math.max(0, (-z - 60) / 60)) * 0.8 + smooth(0.6, 1.2, sl) * 0.4).lerp(pale, r() * 0.1);
      if (onT) c.copy(pale);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.3} roughness={1} /></mesh>;
}
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
/** Teras döşemeleri (agoralar, teras, merdiven basamakları) */
export function Pavements({ m }: { m: Mats }) {
  const flat = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (const r of [UA, LA, BT]) { const g = new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0); g.rotateX(-Math.PI / 2); g.translate((r.x0 + r.x1) / 2, r.y + 0.02, (r.z0 + r.z1) / 2); parts.push(g); }
    return merge(parts); }, []);
  const steps = useMemo(() => { const parts: THREE.BufferGeometry[] = [], n = 40;
    for (let i = 0; i < n; i++) { const z0 = UA.z1 + (i / n) * (LA.z0 - UA.z1), z1 = UA.z1 + ((i + 1) / n) * (LA.z0 - UA.z1), y = terrainBase(0, (z0 + z1) / 2); const g = bx(STAIR.x1 - STAIR.x0, 0.5, z1 - z0 + 0.02, 1.5); g.translate(0, y - 0.22, (z0 + z1) / 2); parts.push(g); }
    for (let i = 0; i < 6; i++) { const x0 = STEP_W.x1 - (i / 6) * (STEP_W.x1 - STEP_W.x0), x1 = STEP_W.x1 - ((i + 1) / 6) * (STEP_W.x1 - STEP_W.x0), y = terrainBase((x0 + x1) / 2, 0); const g = bx(Math.abs(x1 - x0) + 0.02, 0.5, STEP_W.z1 - STEP_W.z0, 1.5); g.translate((x0 + x1) / 2, y - 0.22, 0); parts.push(g); }
    return merge(parts); }, []);
  return <group><mesh geometry={flat} material={m.paving} receiveShadow userData={{ noCast: true }} /><mesh geometry={steps} material={m.lime} receiveShadow castShadow /></group>;
}
/** Teras kenarlarında istinat duvarları: yamaç ile teras arasındaki farkı kapatır (merdiven açıklıkları boş) */
export function TerraceWalls({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [], step = 2;
    const edge = (r: { x0: number; x1: number; z0: number; z1: number; y: number }) => {
      const sides: [number, number, number, number, 'x' | 'z'][] = [[r.x0, r.z0, r.x1, r.z0, 'x'], [r.x0, r.z1, r.x1, r.z1, 'x'], [r.x0, r.z0, r.x0, r.z1, 'z'], [r.x1, r.z0, r.x1, r.z1, 'z']];
      for (const [ax, az, bxp, bzp, dir] of sides) { const L = Math.hypot(bxp - ax, bzp - az);
        for (let s = 0; s < L; s += step) { const x = ax + ((bxp - ax) * (s + step / 2)) / L, z = az + ((bzp - az) * (s + step / 2)) / L;
          if (inR(STAIR, x, z, -0.6) || inR(STEP_W, x, z, -0.6)) continue;
          const out = dir === 'x' ? [x, z + (z === r.z0 ? -2 : 2)] : [x + (x === r.x0 ? -2 : 2), z], h = hill(out[0], out[1]), lo = Math.min(h, r.y) - 1.2, hi = Math.max(h + 0.3, r.y + 0.7);
          const g = bx(dir === 'x' ? step + 0.05 : 1, hi - lo, dir === 'x' ? 1 : step + 0.05, 2.4); g.translate(x, (lo + hi) / 2, z); parts.push(g); } } };
    edge(UA); edge(LA); edge(BT);
    return merge(parts); }, []);
  return <mesh geometry={geo} material={m.lime} castShadow receiveShadow />;
}

/* ===================== çeşmeler ===================== */
function flowTex() { return canvasTex(64, 256, (g, r) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 80; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '200,225,230' : '255,255,255'},${0.3 + r() * 0.5})`; g.fillRect(r() * 64, r() * 256, 1 + r() * 3, 8 + r() * 30); } }); }
function column(h: number, r = 0.42) { const g = new THREE.CylinderGeometry(r * 0.9, r, h, 16); const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.04 * Math.abs(Math.sin(a * 10)); p.setX(i, x * k); p.setZ(i, z * k); } g.computeVertexNormals(); return g; }
/** İki katlı sütunlu cephe (aediküla düzeni): arka duvar, iki kat sütun, saçaklıklar, nişler */
function facadeGeo(w: number, H1: number, H2: number, d: number) {
  const parts: THREE.BufferGeometry[] = [], add = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); parts.push(g); };
  add(bx(w, H1 + H2 + 2.2, 1.2, 2.4), 0, (H1 + H2 + 2.2) / 2, -d);
  add(bx(w + 0.6, 1.6, d + 0.6, 2), 0, 0.8, -d / 2);   // podyum
  const n = Math.max(4, Math.round(w / 3.2));
  for (let i = 0; i < n; i++) { const x = -w / 2 + 0.9 + (i * (w - 1.8)) / (n - 1); add(column(H1 - 0.6), x, 1.6 + (H1 - 0.6) / 2, 0); if (i % 2 === 0 || n < 6) add(column(H2 - 0.6, 0.34), x, 1.6 + H1 + 0.6 + (H2 - 0.6) / 2, -0.4); }
  add(bx(w + 0.4, 0.6, 1.4, 2), 0, 1.6 + H1 - 0.3, -0.2); add(bx(w + 0.2, 0.55, 1.2, 2), 0, 1.6 + H1 + H2 + 0.3, -0.5);
  return merge(parts);
}
function Fountain({ m, w, at, rotY, H1, H2, basin }: { m: Mats; w: number; at: [number, number, number]; rotY: number; H1: number; H2: number; basin: [number, number] }) {
  const geo = useMemo(() => facadeGeo(w, H1, H2, 1.6), [w, H1, H2]);
  const tex = useMemo(() => { const t = flowTex(); t.repeat.set(1, 1.5); return t; }, []);
  useFrame((_, dt) => { tex.offset.y += dt * 0.9; });
  const n = Math.max(3, Math.round(w / 6));
  return <group position={at} rotation-y={rotY}>
    <mesh geometry={geo} material={m.marble} castShadow receiveShadow />
    {Array.from({ length: n * 2 - 1 }, (_, i) => <mesh key={'n' + i} material={m.dark} position={[-w / 2 + 1.6 + (i * (w - 3.2)) / (n * 2 - 2), 1.6 + H1 * 0.45, -1.55]}><planeGeometry args={[1.1, H1 * 0.6]} /></mesh>)}
    {/* havuz: alçak korkuluk ve su yüzeyi */}
    <mesh geometry={bx(w - 0.4, 1, 0.5, 2)} material={m.lime} position={[0, 0.5, basin[0] - 0.25]} castShadow />
    {[-1, 1].map((s) => <mesh key={s} geometry={bx(0.5, 1, basin[0] + 0.4, 2)} material={m.lime} position={[s * (w / 2 - 0.45), 0.5, basin[0] / 2 - 0.2]} castShadow />)}
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.72, basin[0] / 2 - 0.3]}><planeGeometry args={[w - 1.2, basin[0] - 0.2]} /><meshStandardMaterial color="#4f8f96" roughness={0.08} metalness={0.25} envMapIntensity={1.3} transparent opacity={0.9} /></mesh>
    {/* ağızlardan dökülen su */}
    {Array.from({ length: n }, (_, i) => <mesh key={'s' + i} position={[-w / 2 + 2.4 + (i * (w - 4.8)) / Math.max(1, n - 1), 1.3, -0.2]}><planeGeometry args={[0.5, 1.4]} /><meshStandardMaterial map={tex} color="#cfe8ec" transparent opacity={0.8} side={THREE.DoubleSide} /></mesh>)}
  </group>;
}
export function Nymphaea({ m }: { m: Mats }) {
  return <group>
    {/* Antoninler Çeşmesi: Üst Agora kuzeyinde, yüzü güneye (+z) */}
    <Fountain m={m} w={NYMPH.x1 - NYMPH.x0} at={[0, UA.y, NYMPH.z1]} rotY={0} H1={5.2} H2={4} basin={[NYMPH.basin.z1 - NYMPH.z1 + 0.2, 0]} />
    {/* Hadrian Çeşmesi: Aşağı Agora batısında, yüzü doğuya (+x) */}
    <Fountain m={m} w={HADRIAN.z1 - HADRIAN.z0} at={[HADRIAN.x1, LA.y, (HADRIAN.z0 + HADRIAN.z1) / 2]} rotY={Math.PI / 2} H1={6.4} H2={5.6} basin={[HADRIAN.basin.x1 - HADRIAN.x1 + 0.2, 0]} />
  </group>;
}

/* ===================== heroon, bouleuterion, sütunlar, tiyatro ===================== */
export function Heroon({ m }: { m: Mats }) {
  const { c, w } = HEROON, y = UA.y;
  const frieze = useMemo(() => canvasTex(1024, 96, (g) => { g.fillStyle = '#e6e0d3'; g.fillRect(0, 0, 1024, 96); g.fillStyle = 'rgba(110,100,85,.55)';
    for (let k = 0; k < 14; k++) { const x = 36 + k * 72; g.beginPath(); g.arc(x, 22, 8, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 4, 30); g.quadraticCurveTo(x - 22, 60, x - 14, 88); g.lineTo(x + 14, 88); g.quadraticCurveTo(x + 22, 60, x + 4, 30); g.fill();
      g.strokeStyle = 'rgba(110,100,85,.55)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 6, 36); g.lineTo(x - 26, 22 + (k % 2) * 16); g.moveTo(x + 6, 36); g.lineTo(x + 26, 22 + ((k + 1) % 2) * 16); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.3)'; g.font = '12px sans-serif'; g.fillText('temsilî', 970, 92); }), []);
  const col = useMemo(() => column(4.6, 0.32), []);
  return <group position={[c[0], y, c[1]]}>
    <mesh geometry={bx(w, 3.2, w, 2)} material={m.lime} position={[0, 1.6, 0]} castShadow receiveShadow />
    {[0, 1, 2, 3].map((i) => { const a = (i * Math.PI) / 2; return <mesh key={i} position={[Math.sin(a) * (w / 2 + 0.01), 2.4, Math.cos(a) * (w / 2 + 0.01)]} rotation-y={a}><planeGeometry args={[w - 0.2, 0.9]} /><meshStandardMaterial map={frieze} roughness={0.9} /></mesh>; })}
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <mesh key={i} geometry={col} material={m.marble} position={[sx * (w / 2 - 0.8), 3.2 + 2.3, sz * (w / 2 - 0.8)]} castShadow />)}
    <mesh geometry={bx(w - 0.6, 0.6, w - 0.6, 2)} material={m.marble} position={[0, 8.1, 0]} castShadow />
    <mesh material={m.marble} position={[0, 8.9, 0]} rotation-y={Math.PI / 4} scale={[1, 0.35, 1]} castShadow><coneGeometry args={[w * 0.62, 2.4, 4]} /></mesh>
    {/* naiskostaki kahraman heykeli (temsilî) */}
    <group position={[0, 3.2, 0]}>
      <mesh material={m.marble} position={[0, 0.3, 0]}><boxGeometry args={[1.2, 0.6, 1.2]} /></mesh>
      <mesh material={m.marble} position={[0, 1.9, 0]} castShadow><cylinderGeometry args={[0.38, 0.55, 2.6, 10]} /></mesh>
      <mesh material={m.marble} position={[0, 3.55, 0]} castShadow><sphereGeometry args={[0.28, 12, 10]} /></mesh>
      <mesh material={m.marble} position={[0.45, 2.6, 0.1]} rotation-z={-0.5}><cylinderGeometry args={[0.1, 0.1, 1.2, 6]} /></mesh>
    </group>
  </group>;
}
export function Bouleuterion({ m }: { m: Mats }) {
  const { c, r } = BOULE;
  const cavea = useMemo(() => { const pts: THREE.Vector2[] = [new THREE.Vector2(5.5, -0.4), new THREE.Vector2(5.5, 0)]; const n = 12; for (let i = 0; i < n; i++) { const r0 = 5.5 + (i * (r - 5.5)) / n, r1 = 5.5 + ((i + 1) * (r - 5.5)) / n, y = (i + 1) * 0.42; pts.push(new THREE.Vector2(r0, y), new THREE.Vector2(r1, y)); } pts.push(new THREE.Vector2(r + 1, n * 0.42), new THREE.Vector2(r + 1, -0.4));
    const g = new THREE.LatheGeometry(pts.reverse(), 40, Math.PI, Math.PI); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 12, uv.getY(i) * 3); return g; }, [r]);
  const wall = useMemo(() => { const g = new THREE.CylinderGeometry(r + 1.4, r + 1.4, 8, 40, 1, true, Math.PI, Math.PI); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 18, uv.getY(i) * 3); return g; }, [r]);
  return <group position={[c[0], BT.y, c[1]]}>
    <mesh geometry={cavea} material={m.lime} castShadow receiveShadow material-side={THREE.DoubleSide} />
    <mesh geometry={wall} material={m.lime} position={[0, 4, 0]} castShadow receiveShadow material-side={THREE.DoubleSide} />
    {/* dış friz bandı (silahlar ve büstler; temsilî): düz duvar parçaları */}
    {[-1, 1].map((s) => <mesh key={s} geometry={bx(2, 7, 1.2, 2.4)} material={m.lime} position={[0, 3.5, s * (r + 1.4)]} castShadow />)}
  </group>;
}
export function HonorColumns({ m }: { m: Mats }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (const [x, z] of COLS) { const y = terrainBase(x, z); const base = bx(1.6, 1.2, 1.6, 2); base.translate(x, y + 0.6, z); parts.push(base); const sh = column(7, 0.45); sh.translate(x, y + 1.2 + 3.5, z); parts.push(sh); const cap = bx(1.3, 0.5, 1.3, 2); cap.translate(x, y + 8.45, z); parts.push(cap); }
    // sütunlu yollar: Üst Agora doğusu ve Aşağı Agora doğusu (bazı sütunlar devrik)
    const r = rng(5);
    for (const [x, z0, z1, y] of [[UA.x1 - 1.5, UA.z0 + 2, UA.z1 - 2, UA.y], [LA.x1 - 1.5, LA.z0 + 2, LA.z1 - 2, LA.y]] as const) for (let z = z0; z <= z1; z += 3.2) {
      if (r() < 0.3) { const g = column(5, 0.38); g.rotateZ(Math.PI / 2); g.rotateY(r() * 3); g.translate(x - 2 - r() * 3, y + 0.4, z); parts.push(g); }
      else { const g = column(5 - (r() < 0.3 ? r() * 3 : 0), 0.38); g.translate(x, y + 2.5, z); parts.push(g); } }
    return merge(parts); }, []);
  return <mesh geometry={geo} material={m.marble} castShadow receiveShadow />;
}
/** Dağınık mimari parçalar (yürüme alanlarının dışında) */
export function Blocks({ m, n }: { m: Mats; n: number }) {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [], r = rng(31);
    for (let i = 0; i < n * 4 && parts.length < n; i++) { const x = -90 + r() * 180, z = -40 + r() * 140; if (inR(UA, x, z, -2) || inR(LA, x, z, -2) || inR(BT, x, z, -2) || inR(STAIR, x, z, -3) || inR(STEP_W, x, z, -3)) continue;
      const s = 0.5 + r() * 0.9, g = r() < 0.4 ? column(1 + r() * 1.5, 0.4) : bx(s * 1.6, s, s, 1.5); if (g.type === 'CylinderGeometry') g.rotateZ(Math.PI / 2); g.rotateY(r() * 3); g.translate(x, hill(x, z) + s * 0.3, z); parts.push(g); }
    return merge(parts); }, [n]);
  return <mesh geometry={geo} material={m.lime} castShadow receiveShadow />;
}
export function Theatre({ m }: { m: Mats }) {
  const { c, r } = THEATRE;
  const geo = useMemo(() => { const pts: THREE.Vector2[] = [new THREE.Vector2(10, -1), new THREE.Vector2(10, 0)]; const n = 24; for (let i = 0; i < n; i++) { const r0 = 10 + (i * (r - 10)) / n, r1 = 10 + ((i + 1) * (r - 10)) / n, y = (i + 1) * 0.7; pts.push(new THREE.Vector2(r0, y), new THREE.Vector2(r1, y)); } pts.push(new THREE.Vector2(r + 1, n * 0.7), new THREE.Vector2(r + 1, -8));
    const g = new THREE.LatheGeometry(pts.reverse(), 48, Math.PI / 2, Math.PI); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 30, uv.getY(i) * 8); return g; }, [r]);
  const y = hill(c[0], c[1] + 8) - 2;
  return <group position={[c[0], y, c[1]]}>
    <mesh geometry={geo} material={m.lime} castShadow receiveShadow material-side={THREE.DoubleSide} />
    <mesh geometry={bx(2 * r, 6, 3, 2.4)} material={m.lime} position={[0, 3, 12]} castShadow />
  </group>;
}

/* ===================== bitki, dağ ===================== */
export function Junipers({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
    parts.push(paint(new THREE.CylinderGeometry(0.15, 0.28, 2, 6).translate(0, 1, 0), '#5a4636', 0.05)); for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = i ? 0.8 + r() * 0.6 : 0; parts.push(paint(new THREE.IcosahedronGeometry(1.1 + r() * 0.4, 1).scale(1, 1.3, 1).translate(Math.cos(a) * d, 2.4 + r() * 1.4, Math.sin(a) * d), '#46603a', 0.1)); }
    const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 8 && k < n; i++) { const x = -200 + r() * 400, z = -120 + r() * 360; if (inR(UA, x, z, -6) || inR(LA, x, z, -6) || inR(BT, x, z, -6) || inR(STAIR, x, z, -6) || Math.hypot(x - THEATRE.c[0], z - THEATRE.c[1]) < THEATRE.r + 6) continue;
      o.position.set(x, hill(x, z) - 0.2, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.7 + r() * 0.6); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = -120 + r() * 240, z = -60 + r() * 220; const onT = inR(UA, x, z, -0.5) || inR(LA, x, z, -0.5) || inR(BT, x, z, -0.5) || inR(STAIR, x, z, -1) || inR(STEP_W, x, z, -1);
      const edge = (inR(UA, x, z, 1) || inR(LA, x, z, 1)) && r() < 0.06;   // döşeme aralarından çıkan ot
      if (onT && !edge) continue; o.position.set(x, terrainBase(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.35 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.13 + r() * 0.06, 0.35, 0.5 + r() * 0.12); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
/** Akdağ kayalıkları (kuzeyde) ve Toros dağları */
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    out.push({ p: [-60, 10, -700], g: mountainGeo(430, 420, 7, 0.85, '#8f8a7c') });   // Akdağ: tabanı kentin altına girmesin
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + r() * 0.3, dd = 1000 + r() * 600; out.push({ p: [Math.cos(a) * dd, -60, Math.sin(a) * dd], g: mountainGeo(450 + r() * 300, 300 + r() * 300, 60 + i, 0.75, '#8a8670') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
export { NYMPH, HEROON };
