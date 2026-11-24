/**
 * Ahlat — 3B modeller: çayırda yüzlerce mezar (baş ve ayak şahidesi, sanduka; volkanik taş rengi, liken lekeleri, hafif eğilmiş
 * taşlar), dört süslü şahide (motif ve usta imzası), Ulu Kümbet, Bayındır Kümbeti (mukarnas başlıklı sütunlu bölüm), uzakta Van Gölü
 * ve dağlar. Motif çizimleri ve imzalar TEMSİLÎDİR (docs/AHLAT.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { BAYINDIR, FIELD, GRAVE, LAKE, NI, NJ, STELES, ULU, graveAt, groundY, hasGrave, type Motif } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];

/* ===================== motif ve imza çizimleri (tuval) ===================== */
export function drawMotif(g: CanvasRenderingContext2D, m: Motif, W: number, H: number, ink = '#5a2f22', bg = '#b77a5c') {
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = W * 0.03; g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeRect(W * 0.06, H * 0.04, W * 0.88, H * 0.92); g.strokeRect(W * 0.12, H * 0.08, W * 0.76, H * 0.84);
  const cx = W / 2, cy = H * 0.45;
  if (m === 'ejder') { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * W * 0.05, H * 0.8); g.bezierCurveTo(cx + s * W * 0.35, H * 0.7, cx - s * W * 0.25, H * 0.45, cx + s * W * 0.22, H * 0.28); g.bezierCurveTo(cx + s * W * 0.32, H * 0.22, cx + s * W * 0.2, H * 0.15, cx + s * W * 0.1, H * 0.2); g.stroke();
      g.beginPath(); g.arc(cx + s * W * 0.1, H * 0.2, W * 0.03, 0, 7); g.fill(); g.beginPath(); g.moveTo(cx + s * W * 0.07, H * 0.21); g.lineTo(cx + s * W * 0.01, H * 0.25); g.lineTo(cx + s * W * 0.07, H * 0.24); g.stroke(); } }
  if (m === 'palmet') { g.beginPath(); g.moveTo(cx, H * 0.85); g.lineTo(cx, H * 0.45); g.stroke(); for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.32; g.beginPath(); g.moveTo(cx, H * 0.5); g.quadraticCurveTo(cx + Math.cos(a) * W * 0.18, H * 0.5 + Math.sin(a) * W * 0.1, cx + Math.cos(a) * W * 0.3, H * 0.5 + Math.sin(a) * W * 0.36); g.stroke(); }
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * W * 0.12, H * 0.72, W * 0.08, 0, 7); g.stroke(); } }
  if (m === 'kandil') { g.beginPath(); g.moveTo(W * 0.22, H * 0.85); g.lineTo(W * 0.22, H * 0.35); g.quadraticCurveTo(W * 0.22, H * 0.12, cx, H * 0.1); g.quadraticCurveTo(W * 0.78, H * 0.12, W * 0.78, H * 0.35); g.lineTo(W * 0.78, H * 0.85); g.stroke();
    g.beginPath(); g.moveTo(cx, H * 0.1); g.lineTo(cx, H * 0.36); g.stroke(); g.beginPath(); g.moveTo(cx - W * 0.12, H * 0.4); g.lineTo(cx + W * 0.12, H * 0.4); g.lineTo(cx + W * 0.07, H * 0.55); g.lineTo(cx - W * 0.07, H * 0.55); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(cx - W * 0.05, H * 0.36); g.lineTo(cx + W * 0.05, H * 0.36); g.stroke(); }
  if (m === 'geometrik') { const R = W * 0.3; for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 2 + k * Math.PI / 8; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
    g.beginPath(); g.arc(cx, cy, R * 0.45, 0, 7); g.stroke(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); } }
}
/** Usta imzaları (temsilî işaretler) */
export const USTA_STROKES: [number, number][][][] = [
  [[[0.1, 0.8], [0.1, 0.2], [0.5, 0.5], [0.9, 0.2], [0.9, 0.8]]],
  [[[0.1, 0.5], [0.9, 0.5]], [[0.3, 0.2], [0.3, 0.8]], [[0.7, 0.2], [0.7, 0.8]]],
  [[[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]],
];
export function drawUsta(g: CanvasRenderingContext2D, usta: number, x: number, y: number, w: number, h: number, ink = '#5a2f22') {
  g.strokeStyle = ink; g.lineWidth = Math.max(2, w * 0.08); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeRect(x, y, w, h);
  for (const st of USTA_STROKES[usta]) { g.beginPath(); st.forEach(([u, v], i) => { const px = x + u * w, py = y + v * h; if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); }
}

/* ===================== mezar taşları ===================== */
function steleShape(w: number) { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, 0.82); s.quadraticCurveTo(r, 0.95, 0, 1); s.quadraticCurveTo(-r, 0.95, -r, 0.82); s.closePath(); return s; }
function steleGeo(w = 0.9, t = 0.18) { const g = new THREE.ExtrudeGeometry(steleShape(w), { depth: t, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -t / 2); g.rotateY(Math.PI / 2);   // yüzü ±x yönünde
  const uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getZ(i) + w / 2) / w, pos.getY(i)); return g; }
export function Graves() {
  const { stele, foot, sand, n, mats } = useMemo(() => {
    const tex = canvasTex(128, 256, (g, r) => { g.fillStyle = '#9c6a52'; g.fillRect(0, 0, 128, 256); g.strokeStyle = 'rgba(60,32,22,0.55)'; g.lineWidth = 3; g.strokeRect(10, 10, 108, 236); g.strokeRect(20, 22, 88, 150);
      for (let y = 36; y < 160; y += 22) { g.beginPath(); for (let x = 26; x < 104; x += 6) g.lineTo(x, y + Math.sin(x * 0.4) * 3); g.stroke(); }
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '214,170,60' : '200,200,170'},${0.25 + r() * 0.35})`; g.beginPath(); g.ellipse(r() * 128, r() * 256, 2 + r() * 8, 2 + r() * 6, 0, 0, 7); g.fill(); }
      for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,210'},${r() * 0.15})`; g.fillRect(r() * 128, r() * 256, 1.5, 1.5); } });
    const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.95 });
    const sTex = canvasTex(128, 64, (g, r) => { g.fillStyle = '#8e624c'; g.fillRect(0, 0, 128, 64); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(214,170,60,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 128, r() * 64, 2 + r() * 6, 2 + r() * 4, 0, 0, 7); g.fill(); } }); sTex.wrapS = sTex.wrapT = THREE.RepeatWrapping;
    const smat = new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.95 });
    let n = 0; for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) if (hasGrave(i, j) && !STELES.some((s) => s.cell[0] === i && s.cell[1] === j)) n++;
    const sg = new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.45, 0); s.lineTo(0.45, 0); s.lineTo(0.3, 0.42); s.lineTo(-0.3, 0.42); s.closePath(); return s; })(), { depth: GRAVE.len - 0.4, bevelEnabled: false }); sg.translate(0, 0, -(GRAVE.len - 0.4) / 2); sg.rotateY(Math.PI / 2);
    const make = (geo: THREE.BufferGeometry, m: THREE.Material) => { const im = new THREE.InstancedMesh(geo, m, n); im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3); im.castShadow = true; im.receiveShadow = true; return im; };
    return { stele: make(steleGeo(), mat), foot: make(steleGeo(0.7, 0.16), mat), sand: make(sg, smat), n, mats: [mat, smat] };
  }, []);
  useEffect(() => { const o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) { if (!hasGrave(i, j) || STELES.some((s) => s.cell[0] === i && s.cell[1] === j)) continue; const g = graveAt(i, j), y = groundY(g.x, g.z), v = 0.82 + ((i * 13 + j * 7) % 10) / 40;
      c.setRGB(v, v * (0.95 + ((i + j) % 3) * 0.03), v * 0.95);
      o.position.set(g.x - GRAVE.len / 2, y - 0.1, g.z); o.rotation.set(0, 0, g.tilt); o.scale.set(1, g.h, 1); o.updateMatrix(); stele.setMatrixAt(k, o.matrix); stele.setColorAt(k, c);
      o.position.set(g.x + GRAVE.len / 2, y - 0.1, g.z); o.rotation.set(0, 0, -g.tilt * 0.6); o.scale.set(1, Math.max(0.9, g.h * 0.55), 1); o.updateMatrix(); foot.setMatrixAt(k, o.matrix); foot.setColorAt(k, c);
      o.position.set(g.x, y - 0.05, g.z); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); sand.setMatrixAt(k, o.matrix); sand.setColorAt(k, c); k++; }
    for (const m of [stele, foot, sand]) { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [stele, foot, sand]);
  void n; void mats;
  return <group><primitive object={stele} /><primitive object={foot} /><primitive object={sand} /></group>;
}
/** Dört süslü şahide: ön yüzde motif, altta usta imzası */
export function SpecialSteles({ done }: { done: string[] }) {
  const items = useMemo(() => STELES.map((s) => { const t = canvasTex(256, 512, (g) => { drawMotif(g, s.id, 256, 400); g.fillStyle = '#b77a5c'; g.fillRect(0, 400, 256, 112); drawUsta(g, s.usta, 88, 420, 80, 70); }); const g = graveAt(...s.cell); return { s, t, g }; }), []);
  const geo = useMemo(() => steleGeo(1.2, 0.24), []), side = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9c6a52', roughness: 0.95 }), []);
  return <group>{items.map(({ s, t, g }) => { const y = groundY(g.x, g.z), h = 3.6; void done;
    return <group key={s.id} position={[g.x - GRAVE.len / 2, y - 0.1, g.z]}>
      <mesh geometry={geo} scale={[1, h, 1]} material={side} castShadow receiveShadow />
      <mesh position={[-0.125, h * 0.47, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[1.08, h * 0.88]} /><meshStandardMaterial map={t} bumpMap={t} bumpScale={-1.2} roughness={0.9} /></mesh>
      <mesh position={[GRAVE.len / 2, 0.25, 0]}><boxGeometry args={[GRAVE.len - 0.4, 0.5, 0.9]} /><primitive object={side} attach="material" /></mesh>
      <mesh position={[GRAVE.len, 0.9, 0]} castShadow><boxGeometry args={[0.16, 1.8, 0.8]} /><primitive object={side} attach="material" /></mesh>
    </group>; })}</group>;
}

/* ===================== kümbetler ===================== */
function stoneMat(hex: string) { const t = canvasTex(256, 256, (g, r) => { g.fillStyle = hex; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 20) for (let x = -((y / 20) % 2) * 20; x < 256; x += 40) { const v = 0.85 + r() * 0.25; const c = new THREE.Color(hex).multiplyScalar(v); g.fillStyle = `#${c.getHexString()}`; g.fillRect(x + 1.5, y + 1.5, 37, 17); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }); }
function scaleUV(g: THREE.BufferGeometry, su: number, sv: number) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
export function Kumbets() {
  const mat = useMemo(() => stoneMat('#9a6a52'), []);
  const ulu = useMemo(() => { const p: Parts = [], [x, z] = ULU, y = groundY(x, z);
    const base = bx(10, 2.4, 10, 2); base.translate(x, y + 0.7, z); p.push(base);
    const body = scaleUV(new THREE.CylinderGeometry(4.5, 4.6, 11, 24), 8, 4); body.translate(x, y + 1.9 + 5.5, z); p.push(body);
    const band = scaleUV(new THREE.CylinderGeometry(4.7, 4.7, 0.6, 24), 8, 0.3); band.translate(x, y + 12.6, z); p.push(band);
    const cone = scaleUV(new THREE.ConeGeometry(4.8, 6.5, 24), 8, 3); cone.translate(x, y + 16.2, z); p.push(cone);
    return merge(p); }, []);
  const bay = useMemo(() => { const p: Parts = [], dark: Parts = [], [x, z] = BAYINDIR, y = groundY(x, z);
    const base = bx(9, 1.2, 9, 2); base.translate(x, y + 0.2, z); p.push(base);
    const body = scaleUV(new THREE.CylinderGeometry(3.6, 3.6, 6.4, 24, 1, false, Math.PI * 0.75, Math.PI * 1.5), 6, 3); body.translate(x, y + 0.8 + 3.2, z); p.push(body);
    const ring = scaleUV(new THREE.CylinderGeometry(3.8, 3.8, 0.7, 24), 6, 0.3); ring.translate(x, y + 7.35, z); p.push(ring);
    const cone = scaleUV(new THREE.ConeGeometry(3.9, 4, 24), 6, 2); cone.translate(x, y + 9.7, z); p.push(cone);
    // güney yanında mukarnas başlıklı sütunlar (açık bölüm)
    for (let k = 0; k < 5; k++) { const a = Math.PI * 0.25 + (k / 4) * Math.PI * 0.5, cx = x + Math.sin(a) * 3.45, cz = z + Math.cos(a) * 3.45;
      const col = new THREE.CylinderGeometry(0.22, 0.24, 5.2, 10); col.translate(cx, y + 0.8 + 2.6, cz); p.push(col);
      for (let s = 0; s < 3; s++) { const c = bx(0.6 - s * 0.12 + 0.24, 0.22, 0.6 - s * 0.12 + 0.24, 1); c.translate(cx, y + 6.1 + s * 0.22, cz); p.push(c); } }
    const inner = new THREE.CylinderGeometry(3.2, 3.2, 5.2, 20, 1, true); inner.translate(x, y + 0.8 + 2.6, z); dark.push(inner);
    return { p: merge(p), dark: merge(dark) }; }, []);
  return <group>
    <mesh geometry={ulu} material={mat} castShadow receiveShadow />
    <mesh geometry={bay.p} material={mat} castShadow receiveShadow />
    <mesh geometry={bay.dark}><meshStandardMaterial color="#3a2a22" side={THREE.BackSide} roughness={1} /></mesh>
  </group>;
}

/* ===================== arazi, göl, dağlar ===================== */
export function Ground({ tier }: { tier: 'low' | 'medium' | 'high' }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 220 : 150, g = new THREE.PlaneGeometry(600, 500, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 40);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), a = new THREE.Color('#8f9a58'), b = new THREE.Color('#a8a066'), path = new THREE.Color('#b8a07a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z) - 0.03); c.copy(a).lerp(b, 0.4 + 0.3 * Math.sin(x * 0.05 + z * 0.04)); if (x > FIELD.x0 && x < FIELD.x1 && z > FIELD.z0 && z < FIELD.z1) c.lerp(path, 0.25); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Lake() {
  return <mesh rotation-x={-Math.PI / 2} position={[0, -7, LAKE.z + 1500]} userData={{ noCast: true }}><planeGeometry args={[8000, 3000]} /><meshStandardMaterial color="#3e7a9a" roughness={0.2} metalness={0.1} /></mesh>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [-1500, -10, 300] as [number, number, number], g: mountainGeo(900, 420, 3, 0.8, '#7f7462') },   // batıda Nemrut
    { p: [1300, -10, -1700] as [number, number, number], g: mountainGeo(1100, 780, 7, 0.55, '#7a705f') },   // kuzeydoğuda Süphan
    { p: [-800, -10, -1600] as [number, number, number], g: mountainGeo(800, 300, 11, 2, '#857a62') },
    { p: [600, -20, 3600] as [number, number, number], g: mountainGeo(1400, 380, 13, 0.7, '#8a8470') },   // gölün öte yakası
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -140 + r() * 280, z = -90 + r() * 200; if (Math.hypot(x - ULU[0], z - ULU[1]) < 7 || Math.hypot(x - BAYINDIR[0], z - BAYINDIR[1]) < 7) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.45; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.16 + r() * 0.06, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
