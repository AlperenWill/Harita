/**
 * Munzur Vadisi — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Dik kireçtaşı yamaçlar (kar örtülü tepeler, kaya blokları), çiçekli vadi tabanı, dağ eteğinden çıkan gözeler ve köpüklü kolları,
 * akan Munzur Çayı (akış dokusu kayar), ahşap köprüler, söğüt/kavak/meşe, yamaçta yaban keçileri, millî park tabelası.
 * Vadi biçimi, göze yerleri ve yol düzeni TEMSİLÎDİR (docs/MUNZUR.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { GOATS, HEAD_X, RIVER_X0, SPRINGS, TRAILS, floorY, groundY, riverDist, riverW, riverZ, springDist, terrainBase, trailAt } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.35, 0.72, 0.6).normalize();
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const slopeAt = (x: number, z: number) => Math.hypot(terrainBase(x + 1, z) - terrainBase(x - 1, z), terrainBase(x, z + 1) - terrainBase(x, z - 1)) / 2;

/* ===================== arazi ===================== */
export function terrainY(x: number, z: number) { return terrainBase(x, z); }
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 360 : tier === 'medium' ? 270 : 180, W = 760, D = 620, g = new THREE.PlaneGeometry(W, D, N, Math.round(N * D / W)); g.rotateX(-Math.PI / 2); g.translate(70, 0, 0);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const meadow = new THREE.Color('#6f9a45'), lush = new THREE.Color('#5a8a3a'), rock = new THREE.Color('#b9b2a2'), rockD = new THREE.Color('#8f887a'), shrub = new THREE.Color('#5d7240'), snow = new THREE.Color('#f4f6f8'), path = new THREE.Color('#a8987a'), bed = new THREE.Color('#8d8a78');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = terrainBase(x, z), sl = slopeAt(x, z); p.setY(i, y); uv.setXY(i, x / 760 + 0.5, -z / 620 + 0.5);
      const n = Math.sin(x * 0.04) * Math.cos(z * 0.05) * 0.5 + 0.5;
      c.copy(meadow).lerp(lush, n * 0.6).lerp(rock, smooth(0.5, 1.1, sl)).lerp(rockD, smooth(1.3, 2.4, sl) * 0.5 * (0.5 + r()));
      if (sl > 0.5 && sl < 1.3) c.lerp(shrub, 0.35 * Math.max(0, Math.sin(x * 0.11 + z * 0.13)));   // yamaçta çalı ve meşe lekeleri
      if (y > 150) c.lerp(snow, smooth(150, 200, y + Math.sin(x * 0.05) * 15) * (sl > 1.8 ? 0.6 : 1));
      if (riverDist(x, z) < riverW(x) + 1 || (x > HEAD_X && springDist(x, z) < 2.2)) c.lerp(bed, 0.6);
      const t = trailAt(x, z); if (t.tr && !t.tr.bridge && t.d < t.tr.w / 2 + 0.6) c.lerp(path, 0.8);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>;   // renk dokusu yok: dik yamaçta gerilip çizgi yapmasın
}
/** Yamaçlardaki kireçtaşı blokları ve dere kenarındaki çakıl-kayalar */
export function Rocks({ n }: { n: number }) {
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 1), q = g.attributes.position as THREE.BufferAttribute, r = rng(66); for (let i = 0; i < q.count; i++) { const k = 0.75 + r() * 0.5; q.setXYZ(i, q.getX(i) * k, q.getY(i) * k * 0.75, q.getZ(i) * k); } g.computeVertexNormals(); return g; }, []);
  const ref = useRef<THREE.InstancedMesh>(null), mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c3bcab', roughness: 0.95 }), []);
  useEffect(() => { const r = rng(12), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 30 && k < n; i++) { const x = -110 + r() * 400, z = (r() - 0.5) * 300, sl = slopeAt(x, z), rd = riverDist(x, z), river = rd > riverW(x) * 0.5 && rd < riverW(x) + 2.5;
      if (!(sl > 0.8 || river) || trailAt(x, z).d < 3) continue; const s = river ? 0.4 + r() * 0.8 : 1.5 + r() * 4;
      o.position.set(x, terrainBase(x, z) - s * 0.25, z); o.rotation.set(r() * 3, r() * 3, r() * 3); o.scale.set(s * (0.8 + r() * 0.6), s * (0.6 + r() * 0.6), s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); ref.current?.setColorAt(k, c.set(river ? '#9c968a' : '#c9c2b1').offsetHSL(0, 0, (r() - 0.5) * 0.08)); k++; }
    const m = ref.current; if (m) { m.count = k; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
/** Yürüyüş yolu (köprüler hariç): toprak-çakıl şerit */
export function Trails() {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const tr of TRAILS) { if (tr.bridge) continue; for (let i = 0; i < tr.pts.length - 1; i++) {
      const a = tr.pts[i], b = tr.pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + tr.w, g = new THREE.PlaneGeometry(tr.w + 0.4, L, 2, Math.ceil(L / 0.8)).toNonIndexed();
      g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1])); g.translate((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
      const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute; for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, terrainBase(x, z) + 0.04); uv.setXY(k, x / 3, z / 3); }
      g.computeVertexNormals(); parts.push(g); } }
    return mergeGeometries(parts)!;
  }, []);
  const tex = useMemo(() => canvasTex(256, 256, (g, r) => { g.fillStyle = '#a69676'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 900; i++) { const v = 0.7 + r() * 0.45; g.fillStyle = `rgb(${(170 * v) | 0},${(158 * v) | 0},${(132 * v) | 0})`; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 3, 0, 7); g.fill(); } }), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial map={tex} roughness={1} /></mesh>;
}

/* ===================== su ===================== */
function flowTex() { return canvasTex(128, 256, (g, r) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '200,225,230' : '255,255,255'},${0.3 + r() * 0.5})`; g.fillRect(r() * 128, r() * 256, 1 + r() * 3, 6 + r() * 26); } }); }
/** Bir çizgi boyunca su şeridi (yükseklik fonksiyonu ile) */
function ribbon(pts: [number, number, number][], width: (i: number) => number) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; let acc = 0;
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, w = width(i);
    if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    pos.push(pts[i][0] + nx * w, pts[i][1], pts[i][2] + nz * w, pts[i][0] - nx * w, pts[i][1], pts[i][2] - nz * w); uv.push(0, acc / 6, 1, acc / 6);
    if (i < pts.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function Water({ tier }: { tier: Tier }) {
  const { river, springs } = useMemo(() => {
    const rp: [number, number, number][] = []; for (let x = RIVER_X0; x <= 420; x += 2) rp.push([x, floorY(x) - 0.45, riverZ(x)]);
    const sp = SPRINGS.map((s) => { const out: [number, number, number][] = [], e: [number, number] = [RIVER_X0, riverZ(RIVER_X0)]; for (let k = 0; k <= 20; k++) { const t = k / 20, x = s[0] + (e[0] - s[0]) * t, z = s[1] + (e[1] - s[1]) * t + Math.sin(t * Math.PI * 3 + s[1]) * 0.7 * (1 - t); out.push([x, floorY(x) - 0.35 + (1 - t) * 0.25, z]); } return ribbon(out, (k) => 0.45 + k * 0.02); });   // dar, kıvrımlı kollar
    return { river: ribbon(rp, (i) => riverW(RIVER_X0 + i * 2) * 0.82), springs: mergeGeometries(sp)! };
  }, []);
  const tex = useMemo(() => flowTex(), []), tex2 = useMemo(() => { const t = flowTex(); t.repeat.set(1, 2); return t; }, []);
  useFrame((_, dt) => { tex.offset.y -= dt * 0.35; tex2.offset.y -= dt * 0.8; });
  return <group userData={{ noCast: true }}>
    <mesh geometry={river}><meshStandardMaterial color="#5f9aa6" map={tex} roughness={0.12} metalness={0.2} transparent opacity={0.92} envMapIntensity={1.3} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={springs}><meshStandardMaterial color="#7fc0c8" map={tex2} roughness={0.1} metalness={0.15} transparent opacity={0.95} side={THREE.DoubleSide} /></mesh>
    {tier !== 'low' && <Foam />}
  </group>;
}
/** Göze ağızlarında ve kollarda köpük (beyaz kabarcık kümeleri, hafif titrer) */
function Foam() {
  const ref = useRef<THREE.InstancedMesh>(null), base = useRef<{ p: THREE.Vector3; s: number }[]>([]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f6fbfc', roughness: 0.4, transparent: true, opacity: 0.85 }), []);
  useEffect(() => { const r = rng(5), list: { p: THREE.Vector3; s: number }[] = [];
    for (const s of SPRINGS) { for (let k = 0; k < 10; k++) { const x = s[0] + r() * 2.5, z = s[1] + (r() - 0.5) * 1.6; list.push({ p: new THREE.Vector3(x, floorY(x) - 0.15 + r() * 0.3, z), s: 0.2 + r() * 0.35 }); }
      for (let k = 0; k < 14; k++) { const t = r(), x = s[0] + (RIVER_X0 - s[0]) * t, z = s[1] + (riverZ(RIVER_X0) - s[1]) * t + (r() - 0.5) * 1; list.push({ p: new THREE.Vector3(x, floorY(x) - 0.3 + (1 - t) * 0.25, z), s: 0.12 + r() * 0.18 }); } }
    for (let k = 0; k < 60; k++) { const x = RIVER_X0 + r() * 120, z = riverZ(x) + (r() - 0.5) * riverW(x); list.push({ p: new THREE.Vector3(x, floorY(x) - 0.38, z), s: 0.15 + r() * 0.25 }); }
    base.current = list; if (ref.current) ref.current.count = list.length; }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => { const m = ref.current; if (!m) return; const t = clock.elapsedTime;
    base.current.forEach((b, i) => { const k = 1 + Math.sin(t * 6 + i) * 0.18; o.position.copy(b.p); o.position.y += Math.sin(t * 4 + i * 1.3) * 0.03; o.scale.set(b.s * k, b.s * 0.45 * k, b.s * k); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={ref} args={[undefined, mat, 400]} frustumCulled={false}><icosahedronGeometry args={[1, 1]} /></instancedMesh>;
}
/** Göze ağızları: dağ eteğinde koyu kaya yarıkları ve yosunlu taşlar */
export function SpringMouths() {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [], r = rng(8);
    for (const s of SPRINGS) for (let k = 0; k < 5; k++) { const g = new THREE.IcosahedronGeometry(0.6 + r() * 1.1, 0); g.scale(1, 0.7, 1); g.translate(s[0] - 1.5 - r() * 2, floorY(s[0]) + 0.2 + r() * 1.2, s[1] + (r() - 0.5) * 4); parts.push(g); }
    const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }, []);
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#6f7a5a" roughness={0.9} flatShading /></mesh>;
}

/* ===================== köprüler, tabela ===================== */
export function Bridges() {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [];
    for (const tr of TRAILS) { if (!tr.bridge) continue; const a = tr.pts[0], b = tr.pts[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, yaw = Math.atan2(ux, uz);
      for (let s = 0.6; s < L; s += 0.45) { const t = s / L, x = a[0] + ux * s, z = a[1] + uz * s, y = groundY(x, z) - 0.06, g = new THREE.BoxGeometry(tr.w + 0.3, 0.1, 0.38); g.rotateY(yaw); g.translate(x, y, z); parts.push(g); void t; }
      for (let s = 1; s < L; s += 2.4) for (const side of [-1, 1]) { const x = a[0] + ux * s + uz * side * (tr.w / 2 + 0.1), z = a[1] + uz * s - ux * side * (tr.w / 2 + 0.1), y = groundY(a[0] + ux * s, a[1] + uz * s), g = new THREE.BoxGeometry(0.12, 1.1, 0.12); g.translate(x, y + 0.5, z); parts.push(g); }
      for (const side of [-1, 1]) for (const hgt of [1.0, 0.55]) for (let s = 1; s < L - 2.4; s += 2.4) { const s2 = Math.min(L - 1, s + 2.4), x1 = a[0] + ux * s + uz * side * (tr.w / 2 + 0.1), z1 = a[1] + uz * s - ux * side * (tr.w / 2 + 0.1), x2 = a[0] + ux * s2 + uz * side * (tr.w / 2 + 0.1), z2 = a[1] + uz * s2 - ux * side * (tr.w / 2 + 0.1);
        const y1 = groundY(a[0] + ux * s, a[1] + uz * s) + hgt, y2 = groundY(a[0] + ux * s2, a[1] + uz * s2) + hgt, len = Math.hypot(x2 - x1, y2 - y1, z2 - z1), g = new THREE.BoxGeometry(0.08, 0.08, len);
        g.lookAt(new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1)); g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2); parts.push(g); }
    }
    return mergeGeometries(parts.map((g) => g.toNonIndexed()))!; }, []);
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial color="#7d5a3a" roughness={0.85} /></mesh>;
}
export function ParkSign({ at }: { at: [number, number, number] }) {
  const tex = useMemo(() => canvasTex(512, 256, (g) => { g.fillStyle = '#5b3f28'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#3a2818'; g.lineWidth = 12; g.strokeRect(6, 6, 500, 244); g.fillStyle = '#f2e6c8'; g.textAlign = 'center'; g.font = 'bold 46px sans-serif'; g.fillText('MUNZUR VADİSİ', 256, 100); g.font = 'bold 40px sans-serif'; g.fillText('MİLLÎ PARKI', 256, 160); g.font = '26px sans-serif'; g.fillText('1971', 256, 212); }), []);
  return <group position={at} rotation-y={0}>
    {[-1.3, 1.3].map((x) => <mesh key={x} position={[x, -1, 0]} castShadow><boxGeometry args={[0.16, 2.6, 0.16]} /><meshStandardMaterial color="#4a3422" /></mesh>)}
    <mesh position={[0, 0.2, 0.05]} castShadow><boxGeometry args={[3, 1.5, 0.1]} /><meshStandardMaterial map={tex} roughness={0.8} /></mesh>
  </group>;
}

/* ===================== bitki ve hayvan ===================== */
function treeGeo(kind: 'sogut' | 'kavak' | 'mese', seed: number) {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [], paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], c = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
  const noisy = (g: THREE.BufferGeometry, a: number) => { const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getX(i) * 4.1 + p.getY(i) * 3.3) * Math.cos(p.getZ(i) * 3.7) * a; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } return g; };
  if (kind === 'kavak') { parts.push(paint(new THREE.CylinderGeometry(0.15, 0.28, 3, 6).translate(0, 1.5, 0), '#6a5a44', 0.05)); parts.push(paint(noisy(new THREE.SphereGeometry(1.4, 10, 12), 0.08).scale(1, 4.2, 1).translate(0, 7.5, 0), '#6f9a3e', 0.12)); }
  else if (kind === 'sogut') { parts.push(paint(new THREE.CylinderGeometry(0.3, 0.5, 3.2, 7).translate(0, 1.6, 0), '#5f5040', 0.05)); for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = i ? 1.4 + r() : 0; parts.push(paint(noisy(new THREE.SphereGeometry(1.8 + r() * 0.6, 9, 7), 0.14).scale(1, 1.25, 1).translate(Math.cos(a) * d, 3.8 + r() * 1.5, Math.sin(a) * d), '#93ad5a', 0.12)); } }
  else { parts.push(paint(new THREE.CylinderGeometry(0.2, 0.35, 2.4, 7).translate(0, 1.2, 0), '#5a4330', 0.05)); for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = i ? 1 + r() * 0.6 : 0; parts.push(paint(noisy(new THREE.IcosahedronGeometry(1.4 + r() * 0.5, 1), 0.12).translate(Math.cos(a) * d, 3 + r() * 1.2, Math.sin(a) * d), '#5b7234', 0.1)); } }
  const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => [treeGeo('sogut', 2), treeGeo('kavak', 3), treeGeo('mese', 4)], []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0, 0];
    for (let i = 0; i < n * 25 && cnt[0] + cnt[1] + cnt[2] < n; i++) { const x = -90 + r() * 470, z = (r() - 0.5) * 260, sl = slopeAt(x, z), rd = riverDist(x, z), w = riverW(x);
      if (trailAt(x, z).d < 5 || rd < w + 1.5 || (x > HEAD_X && springDist(x, z) < 3) || sl > 1.1) continue;
      const t = rd < w + 14 ? (r() < 0.6 ? 0 : 1) : sl > 0.35 ? 2 : r() < 0.85 ? -1 : 2; if (t < 0) continue; const m = refs.current[t]; if (!m) continue;
      o.position.set(x, terrainBase(x, z) - 0.15, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.65 + r() * 0.45); o.updateMatrix(); m.setMatrixAt(cnt[t]++, o.matrix); }
    refs.current.forEach((m, i) => { if (!m) return; m.count = cnt[i]; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }); }, [n]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const tuft = useRef<THREE.InstancedMesh>(null), flower = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0, f = 0; const nf = Math.floor(n / 3);
    for (let i = 0; i < n * 6 && k < n; i++) { const meadow = r() < 0.25, x = meadow ? -20 + r() * 40 : -85 + r() * 260, z = meadow ? 28 + r() * 14 : (r() - 0.5) * 120;
      if (trailAt(x, z).d < 1.8 || riverDist(x, z) < riverW(x) + 0.5 || (x > HEAD_X && springDist(x, z) < 1.8) || slopeAt(x, z) > 0.7) continue;
      o.position.set(x, terrainBase(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.45 + r() * 0.5; o.scale.set(s, s * (0.8 + r() * 0.5), s); o.updateMatrix(); tuft.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.06, 0.45, 0.38 + r() * 0.12); tuft.current?.setColorAt(k, c); k++;
      if (f < nf && (meadow || r() < 0.15)) { o.position.y += 0.32 * s; o.scale.setScalar(0.04 + r() * 0.03); o.updateMatrix(); flower.current?.setMatrixAt(f, o.matrix); flower.current?.setColorAt(f, c.set(['#e9c93a', '#f2efe6', '#c85a8a', '#7a6ad0', '#e0743a'][Math.floor(r() * 5)])); f++; } }
    for (const [m, cc] of [[tuft.current, k], [flower.current, f]] as const) if (m) { m.count = cc; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}>
    <instancedMesh ref={tuft} args={[geo, mat, n]} />
    <instancedMesh ref={flower} args={[undefined, undefined, Math.floor(n / 3)]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={0.8} /></instancedMesh>
  </group>;
}
/** Yaban keçisi: gövde, boyun, baş, dört bacak ve geriye kıvrık boynuzlar (basit, temsilî); hafifçe başını eğip kaldırır */
export function Goats() {
  const geo = useMemo(() => { const parts: THREE.BufferGeometry[] = [], add = (g: THREE.BufferGeometry, hex: string) => { const gg = g.index ? g.toNonIndexed() : g, c = new THREE.Color(hex), col: number[] = []; for (let i = 0; i < gg.attributes.position.count; i++) col.push(c.r, c.g, c.b); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); parts.push(gg); };
    add(new THREE.SphereGeometry(0.5, 10, 8).scale(1, 0.75, 1.6).translate(0, 0.95, 0), '#8a6a4a');
    for (const [x, z] of [[-0.22, 0.5], [0.22, 0.5], [-0.22, -0.5], [0.22, -0.5]]) add(new THREE.CylinderGeometry(0.06, 0.05, 0.7, 5).translate(x, 0.38, z), '#5a4430');
    add(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 6).rotateX(-0.6).translate(0, 1.3, 0.72), '#8a6a4a');
    add(new THREE.SphereGeometry(0.2, 8, 6).scale(0.8, 0.8, 1.3).translate(0, 1.5, 0.95), '#7a5c40');
    for (const s of [-1, 1]) add(new THREE.TorusGeometry(0.35, 0.05, 5, 10, Math.PI * 0.9).rotateY(Math.PI / 2).rotateZ(-0.2 * s).translate(0.09 * s, 1.55, 0.6), '#4a3f33');
    const g = mergeGeometries(parts)!; g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), []), ref = useRef<THREE.InstancedMesh>(null), o = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => { const m = ref.current; if (!m) return; const t = clock.elapsedTime;
    GOATS.forEach((g, i) => { o.position.set(g.x, terrainBase(g.x, g.z) - 0.05, g.z); o.rotation.set(Math.sin(t * 0.6 + i) * 0.05, g.yaw + Math.sin(t * 0.2 + i) * 0.3, 0); o.scale.setScalar(g.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.count = GOATS.length; m.instanceMatrix.needsUpdate = true; });
  return <instancedMesh ref={ref} args={[geo, mat, GOATS.length]} castShadow frustumCulled={false} />;
}
/** Uzak Munzur Dağları (karlı) */
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + r() * 0.3, dd = 900 + r() * 600; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(420 + r() * 260, 380 + r() * 300, 70 + i, 0.55, '#7d7a66') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
