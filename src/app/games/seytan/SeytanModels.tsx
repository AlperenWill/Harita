/**
 * Şeytan Kalesi — 3B modeller (Bayburt ve Cumalıkızık ile aynı ortak manzara kiti).
 * Karaçay Kanyonu (koyu volkanik kaya uçurumları, dere), kanyonun ortasındaki kayalık ve üstündeki yıkık surlar, boyunu kesen
 * sur ve sivri kemerli kapı, burçlar, tek nefli kilise kalıntısı (dört duvar, apsis), dereye inen kaya basamaklar, yayladaki köy.
 * Kanyon derinliği, sur ve yapı yerleri TEMSİLÎDİR (docs/SEYTAN-KALESI.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { CHURCH, GATE, GATE_T, PATH_PTS, PATH_W, RUINS, STEPS_T, STREAM, TOWERS, VIEW_T, VILLAGE, ell, groundY, inside, neckW, pathAt, terrainBase, wallPoint, type Tower } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const hillY = groundY;
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const streamDist = (x: number, z: number) => { let m = Infinity; for (let i = 0; i < STREAM.length - 1; i++) { const a = STREAM[i], b = STREAM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return m; };
/* ===================== malzemeler ===================== */
export interface Mats { wall: THREE.MeshStandardMaterial; rubble: THREE.MeshStandardMaterial; road: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; soil: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const w = stoneTex('seytan-sur', ['#8d7f6e', '#7c6f60', '#9a8b77', '#6f6457', '#a08f7a', '#857766'], [20, 14], [26, 40]);
    const rb = stoneTex('seytan-moloz', ['#857766', '#73675a', '#968672', '#685e52'], [14, 10], [16, 26]);
    const road = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9a8a70'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { const v = 0.8 + r() * 0.3; g.fillStyle = `rgb(${(170 * v) | 0},${(156 * v) | 0},${(132 * v) | 0})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 8 + r() * 14, 6 + r() * 10, r() * 3, 0, 7); g.fill(); } for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    return {
      wall: weather(new THREE.MeshStandardMaterial({ map: w.map, bumpMap: w.bump, bumpScale: 0.6, roughness: 0.95 })),
      rubble: weather(new THREE.MeshStandardMaterial({ map: rb.map, bumpMap: rb.bump, bumpScale: 0.6, roughness: 0.95 })),
      road: new THREE.MeshStandardMaterial({ map: road, roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      soil: new THREE.MeshStandardMaterial({ color: '#6e5a44', roughness: 1 }),
    };
  }, []);
}

/* ===================== arazi ===================== */
export function terrainY(x: number, z: number): number {
  const far = Math.max(0, Math.hypot(x * 0.8, z - 60) - 320); return groundY(x, z) + far * 0.1 * (0.6 + 0.4 * Math.sin(x * 0.012 + z * 0.01));
}
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 380 : tier === 'medium' ? 280 : 190, S = 760, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 80);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const grass = new THREE.Color('#8e9a58'), dry = new THREE.Color('#b0a46a'), rock = new THREE.Color('#5d5348'), rock2 = new THREE.Color('#7a6c5c'), bed = new THREE.Color('#7f8a5a'), path = new THREE.Color('#9a8a6c');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = terrainY(x, z); p.setY(i, y); uv.setXY(i, x / S + 0.5, -z / S + 0.5);
      const gx = terrainY(x + 1, z) - terrainY(x - 1, z), gz = terrainY(x, z + 1) - terrainY(x, z - 1), slope = Math.hypot(gx, gz) / 2;
      c.copy(grass).lerp(dry, 0.35 + 0.3 * Math.sin(x * 0.03 + z * 0.025)).lerp(rock, smooth(0.6, 1.4, slope)).lerp(rock2, smooth(1.6, 3, slope) * 0.5 * r());
      if (y < 4) c.lerp(bed, 0.6);
      if (pathAt(x, z).d < PATH_W / 2 + 1) c.lerp(path, 0.75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.35} roughness={1} /></mesh>;
}
/** Uçurum yüzlerinde iri kaya blokları (kayalığın ve kanyonun sert dokusu) */
export function CliffRocks({ n, m }: { n: number; m: Mats }) {
  const geo = useMemo(() => { const g = new THREE.IcosahedronGeometry(1, 1), q = g.attributes.position as THREE.BufferAttribute, r = rng(66); for (let i = 0; i < q.count; i++) { const k = 0.75 + r() * 0.5; q.setXYZ(i, q.getX(i) * k, q.getY(i) * k * 0.8, q.getZ(i) * k); } g.computeVertexNormals(); return g; }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(12), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 30 && k < n; i++) { const x = (r() - 0.5) * 360, z = -150 + r() * 330, gx = terrainY(x + 1, z) - terrainY(x - 1, z), gz = terrainY(x, z + 1) - terrainY(x, z - 1); if (Math.hypot(gx, gz) / 2 < 0.9 || neckW(x, z) > 0.5) continue;
      o.position.set(x, terrainY(x, z) - 0.6, z); o.rotation.set(r() * 3, r() * 3, r() * 3); const s = 1.5 + r() * 4; o.scale.set(s * (0.8 + r() * 0.6), s * (0.7 + r() * 0.8), s); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, m.rubble, n]} castShadow receiveShadow />;
}
/** Patika: yayladan boyuna, toprak/taş şerit */
export function Path({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < PATH_PTS.length - 1; i++) {
      const a = PATH_PTS[i], b = PATH_PTS[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + PATH_W, g = new THREE.PlaneGeometry(PATH_W + 0.5, L, 3, Math.ceil(L / 0.8)).toNonIndexed();
      g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1])); g.translate((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
      const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
      for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, groundY(x, z) + 0.05); uv.setXY(k, x / 4, z / 4); }
      g.computeVertexNormals(); parts.push(g);
    }
    return mergeGeometries(parts)!;
  }, []);
  return <mesh geometry={geo} material={m.road} receiveShadow userData={{ noCast: true }} />;
}

/* ===================== surlar, burçlar, kapı ===================== */
/** Sur parçaları tek geometride (dünya ölçekli UV). Dış yüz yamaca iner; içeride korkuluk yer yer yıkık, sağlam yerlerde mazgal dişi var. */
export function Walls({ m }: { m: Mats }) {
  const { wall, merl } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], mer: THREE.BufferGeometry[] = [], r = rng(12), n = 230;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2, tm = (t0 + t1) / 2;
      if (angDist(tm, GATE_T) < 0.105) continue;   // kapı yapısının yeri
      if (angDist(tm, STEPS_T) < 0.035) continue;   // basamakların başında gedik
      const a = wallPoint(t0), b = wallPoint(t1), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.12;
      const rr = Math.hypot(cx, cz), ox = cx / rr, oz = cz / rr, inner = hillY(cx - ox * 1.8, cz - oz * 1.8), outer = Math.max(hillY(cx + ox * 2.5, cz + oz * 2.5), inner - 7);   // uçurum kenarında sur kayaya oturur
      const neck = angDist(tm, GATE_T) < 0.55, intact = (neck || Math.sin(tm * 4 + 0.6) + Math.sin(tm * 9) * 0.4 > 0.6) && !VIEW_T.some((v) => angDist(tm, v) < 0.16), view = VIEW_T.some((v) => angDist(tm, v) < 0.16), para = intact ? (neck ? 4.2 : 2.4) + r() * 0.3 : view ? 0.45 + r() * 0.15 : 0.7 + r() * 0.6;
      const top = inner + para, bot = Math.min(outer, inner) - 2.5, h = top - bot, T = intact ? 2.4 : 1.5;
      const g = bx(L, h, T, 3.2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2); g.translate(cx, bot + h / 2, cz); parts.push(g);
      if (intact && i % 2 === 0) { const q = bx(L * 0.55, 0.9, 1.1, 1.6); q.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2); q.translate(cx + ox * 0.6, top + 0.45, cz + oz * 0.6); mer.push(q); }
    }
    return { wall: mergeGeometries(parts)!, merl: mer.length ? mergeGeometries(mer)! : null };
  }, []);
  return <group><mesh geometry={wall} material={m.wall} castShadow receiveShadow />{merl && <mesh geometry={merl} material={m.wall} castShadow />}</group>;
}
function towerGeo(t: Tower) {
  const rr = Math.hypot(t.at[0], t.at[1]), ox = t.at[0] / rr, oz = t.at[1] / rr, cx = t.at[0] + ox * t.r * 0.55, cz = t.at[1] + oz * t.r * 0.55;
  const inner = hillY(t.at[0] - ox * 2, t.at[1] - oz * 2), outer = Math.max(hillY(cx + ox * (t.r + 1), cz + oz * (t.r + 1)), inner - 8), top = inner + (t.id.startsWith('boyun') ? 7 : 3.6), bot = Math.min(outer, inner) - 3, h = top - bot;
  const yaw = Math.atan2(ox, oz);
  let g: THREE.BufferGeometry;
  if (t.kind === 'kare') g = bx(t.r * 2, h, t.r * 2, 3.2);
  else { g = new THREE.CylinderGeometry(t.r, t.r * 1.08, h, 20, 1); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (t.r * 6.28) / 3.2, uv.getY(i) * h / 3.2);
  }
  g.rotateY(yaw); g.translate(cx, bot + h / 2, cz);
  return g.index ? g.toNonIndexed() : g;
}
export function Towers({ m }: { m: Mats }) {
  const geo = useMemo(() => mergeGeometries(TOWERS.map(towerGeo).map((g) => { g.deleteAttribute('normal'); g.computeVertexNormals(); return g; }))!, []);
  return <mesh geometry={geo} material={m.wall} castShadow receiveShadow />;
}
/** Kale kapısı: iki burç arasında sivri kemerli geçit; üstünde onarım yazıtı (yazı temsilî) */
export function Gate({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const W = 9, H = 7.6, w = 3, h = 4.2, s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
    const hole = new THREE.Path(), r = w / 2, sp = h - r; hole.moveTo(-r, 0); hole.lineTo(-r, sp); hole.quadraticCurveTo(-r, sp + r * 0.9, 0, sp + r * 1.25); hole.quadraticCurveTo(r, sp + r * 0.9, r, sp); hole.lineTo(r, 0); hole.closePath(); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -1.5); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.2, uv.getY(i) / 3.2); return g;
  }, []);
  const plaque = useMemo(() => canvasTex(512, 160, (g, r) => { g.fillStyle = '#b8a283'; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#7c6a52'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 144); g.strokeStyle = '#5e4f3c'; g.lineWidth = 4; for (let row = 0; row < 3; row++) { let x = 30; while (x < 480) { const w = 10 + r() * 34; g.beginPath(); g.moveTo(x, 50 + row * 38); g.bezierCurveTo(x + w * 0.3, 24 + row * 38, x + w * 0.7, 62 + row * 38, x + w, 40 + row * 38); g.stroke(); if (r() < 0.4) { g.beginPath(); g.moveTo(x + w * 0.5, 30 + row * 38); g.lineTo(x + w * 0.5, 52 + row * 38); g.stroke(); } x += w + 6; } } }), []);
  const y = hillY(GATE[0], GATE[1]), yaw = GATE_T - Math.PI / 2;
  void plaque;   // kemer düzlemi sur boyunca
  return <group position={[GATE[0], y - 0.3, GATE[1]]} rotation-y={-yaw}>
    <mesh geometry={geo} material={m.wall} castShadow receiveShadow />
  </group>;
}
/** İç surun önündeki yürüme sınırını gösteren alçak duvar dibi (sur içi yüzü ile zemin arasındaki boşluğu kapatır) */
export function Ruins({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], r = rng(8);
    for (const ru of RUINS) { const y = hillY(...ru.c), c = Math.cos(ru.yaw), s = Math.sin(ru.yaw);
      for (const [u, v, L, along] of [[0, -ru.d / 2, ru.w, true], [0, ru.d / 2, ru.w, true], [-ru.w / 2, 0, ru.d, false], [ru.w / 2, 0, ru.d, false]] as const) {
        const h = 0.5 + r() * 1.3, g = bx(along ? L : 0.8, h, along ? 0.8 : L, 2); g.rotateY(-ru.yaw); g.translate(ru.c[0] + u * c + v * s, y + h / 2 - 0.15, ru.c[1] - u * s + v * c); parts.push(g); } }
    for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.55; if (!inside(x, z, 2)) continue; const s = 0.4 + r() * 0.7, g = bx(s * 1.4, s, s, 1.5); g.rotateY(r() * 3); g.translate(x, hillY(x, z) + s * 0.3, z); parts.push(g); }   // dağınık taş blokları
    return mergeGeometries(parts)!;
  }, []);
  return <mesh geometry={geo} material={m.rubble} castShadow receiveShadow />;
}
/** Aziz Stefanos Kilisesi kalıntısı: tek nef, dört duvar ayakta (çatısız), doğuda yarım yuvarlak apsis, kemerli kapı ve dar pencereler */
export function Church({ m }: { m: Mats }) {
  const { c, w, d, yaw } = CHURCH, y = hillY(c[0], c[1]), H = 6.2, T = 0.9;
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const wall = (L: number, h: number, px: number, pz: number, rot: number) => { const g = bx(L, h, T, 2.4); g.rotateY(rot); g.translate(px, h / 2 - 0.6, pz); parts.push(g.toNonIndexed()); };
    wall(d, H, -w / 2, 0, Math.PI / 2); wall(d, H - 0.8, w / 2, 0, Math.PI / 2);   // uzun duvarlar (biri daha yıkık)
    wall(w, H + 1.2, 0, -d / 2, 0);   // batı duvarı (kapılı)
    const ap = new THREE.CylinderGeometry(w / 2 - 0.2, w / 2, H - 1, 16, 1, true, -Math.PI / 2, Math.PI); ap.translate(0, (H - 1) / 2 - 0.6, d / 2); parts.push(ap.toNonIndexed());
    const g = mergeGeometries(parts.map((p) => { if (!p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); return p; }))!; g.computeVertexNormals(); return g;
  }, [w, d]);
  return <group position={[c[0], y, c[1]]} rotation-y={yaw}>
    <mesh geometry={geo} material={m.wall} castShadow receiveShadow material-side={THREE.DoubleSide} />
    <mesh material={m.dark} position={[0, 1.5, -d / 2 - T / 2 - 0.01]}><planeGeometry args={[1.4, 2.6]} /></mesh>
    {[-3, 0, 3].map((zz) => <mesh key={zz} material={m.dark} position={[-w / 2 - T / 2 - 0.01, 3.6, zz]} rotation-y={-Math.PI / 2}><planeGeometry args={[0.35, 1.3]} /></mesh>)}
  </group>;
}
/** Kayaya oyulmuş basamaklar: sur gediğinden uçurum boyunca dereye doğru iner */
export function Steps({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], top = wallPoint(STEPS_T, 1), out = [Math.cos(STEPS_T), Math.sin(STEPS_T)], side = [-out[1], out[0]];
    for (let i = 0; i < 60; i++) { const k = i * 0.9, zig = Math.sin(i * 0.18) * 4, x = top[0] + out[0] * k * 0.55 + side[0] * zig, z = top[1] + out[1] * k * 0.55 + side[1] * zig, y = hillY(top[0], top[1]) - i * 0.85;
      if (y < terrainBase(x, z) - 3 || y < 2) break; const g = bx(1.6, 0.35, 0.9, 1.2); g.rotateY(Math.atan2(out[0], out[1])); g.translate(x, y, z); parts.push(g); }
    return mergeGeometries(parts)!;
  }, []);
  return <mesh geometry={geo} material={m.rubble} castShadow receiveShadow />;
}
/** Karaçay deresi */
export function Stream() {
  const geo = useMemo(() => {
    const pos: number[] = [], idx: number[] = [], pts = STREAM, n = pts.length;
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L, w = 6;
      const y = Math.max(1.75, Math.min(terrainBase(pts[i][0], pts[i][1]) + 0.3, 2.4));
      pos.push(pts[i][0] + nx * w, y, pts[i][1] + nz * w, pts[i][0] - nx * w, y, pts[i][1] - nz * w); if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }, []);
  return <mesh geometry={geo} userData={{ noCast: true }}><meshStandardMaterial color="#4f7a80" roughness={0.12} metalness={0.25} side={THREE.DoubleSide} envMapIntensity={1.2} /></mesh>;
}
void streamDist;
/** Yıldırımtepe köyü: taş duvarlı, düz toprak damlı evler (temsilî) */
export function Village({ m }: { m: Mats }) {
  const N = VILLAGE.length, body = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const o = new THREE.Object3D();
    VILLAGE.forEach((b, i) => { const y = terrainY(b.x, b.z) - 0.4, h = 3.2; o.rotation.set(0, b.yaw, 0);
      o.position.set(b.x, y + h / 2, b.z); o.scale.set(b.w, h, b.d); o.updateMatrix(); body.current?.setMatrixAt(i, o.matrix);
      o.position.set(b.x, y + h + 0.15, b.z); o.scale.set(b.w + 0.6, 0.3, b.d + 0.6); o.updateMatrix(); roof.current?.setMatrixAt(i, o.matrix); });
    for (const mm of [body.current, roof.current]) if (mm) { mm.count = N; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [N]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <group>
    <instancedMesh ref={body} args={[box, m.rubble, N]} castShadow receiveShadow />
    <instancedMesh ref={roof} args={[box, undefined, N]} castShadow><meshStandardMaterial color="#6b6a52" roughness={1} /></instancedMesh>
  </group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 5 && k < n; i++) { const x = (r() - 0.5) * 300, z = -120 + r() * 330;
      if (pathAt(x, z).d < PATH_W / 2 + 0.5 || TOWERS.some((t) => Math.hypot(t.at[0] - x, t.at[1] - z) < t.r + 1.5)) continue;
      const gx = terrainY(x + 1, z) - terrainY(x - 1, z), gz = terrainY(x, z + 1) - terrainY(x, z - 1); if (Math.hypot(gx, gz) / 2 > 0.6) continue;   // uçurumda ot yok
      if (Math.abs(ell(x, z) - 0.97) < 0.04) continue;   // sur altında ot yok
      o.position.set(x, terrainY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.45; o.scale.set(s, s * (0.7 + r() * 0.5), s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.13 + r() * 0.05, 0.35, 0.5 + r() * 0.12); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
/** Bozkır dağları (çıplak, tepelerde kar) */
export function Mountains() {
  const list = useMemo(() => { const r = rng(31), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + r() * 0.3, dd = 900 + r() * 700; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(450 + r() * 300, 180 + r() * 260, 50 + i, i % 3 === 0 ? 0.78 : 2, '#8f8a6c') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
