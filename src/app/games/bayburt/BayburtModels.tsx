/**
 * Bayburt Kalesi — 3B modeller (Cumalıkızık ile aynı ortak manzara kiti).
 * Tepe ve yamaç (kayalık), şehirden çıkan yol, surlar (yamaçtan yükselen dış yüz, içeride yer yer yıkık korkuluk + mazgal dişleri),
 * yarım yuvarlak / dörtgen / üçgen burçlar, sivri kemerli kale kapısı, kitabe levhası (yazı temsilî), yıkık yapı temelleri, kazı alanı,
 * Çoruh, nehir kıyısında kavaklar, eteklerdeki şehir ve çıplak bozkır dağları.
 * Sur çizgisi, burç yerleri ve ölçüler TEMSİLÎDİR (docs/BAYBURT.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { CITY, DIG, GATE, RAMP_PTS, RAMP_W, RIVER, RIVER_W, RUINS, TOWERS, VIEW_T, edgeR, groundY, hillY, inside, rampAt, riverDist, wallPoint, type Tower } from './kale';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.62, 0.6, 0.5).normalize();
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const GATE_T = Math.atan2(GATE[1], GATE[0]);
const angDist = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

/* ===================== malzemeler ===================== */
export interface Mats { wall: THREE.MeshStandardMaterial; rubble: THREE.MeshStandardMaterial; road: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; soil: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const w = stoneTex('bayburt-sur', ['#b9a283', '#a88f70', '#c4ae8e', '#9c8566', '#b29a7a', '#a99478'], [26, 16], [34, 46]);
    const rb = stoneTex('bayburt-moloz', ['#a38e72', '#8f7c63', '#b29d80', '#857561'], [14, 10], [16, 26]);
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
/** Kazı çukuru ve nehir yatağı araziye oyulur */
export function terrainY(x: number, z: number): number {
  let y = groundY(x, z);
  if (Math.abs(x - DIG.c[0]) < DIG.w / 2 && Math.abs(z - DIG.c[1]) < DIG.d / 2) y -= 1.3;
  const rd = riverDist(x, z); if (rd < RIVER_W / 2 + 10) y = THREE.MathUtils.lerp(-1.6, y, smooth(RIVER_W / 2 - 3, RIVER_W / 2 + 10, rd));
  const far = Math.max(0, Math.hypot(x, z * 1.3) - 330); y += far * 0.12 * (0.6 + 0.4 * Math.sin(x * 0.01 + z * 0.013));   // vadiyi saran bozkır sırtları
  return y;
}
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const N = tier === 'high' ? 300 : tier === 'medium' ? 220 : 150, S = 900, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 60);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), r = rng(4);
    const steppe = new THREE.Color('#a8a16a'), dry = new THREE.Color('#c2b083'), rock = new THREE.Color('#8f8068'), green = new THREE.Color('#7f8f4e'), road = new THREE.Color('#a39272');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = terrainY(x, z); p.setY(i, y); uv.setXY(i, x / S + 0.5, -z / S + 0.5);
      const e = edgeR(x, z), d = Math.hypot(x, z) - e, steep = d > 0 && d < 60 && z < 60 ? 1 - Math.abs(d - 25) / 35 : 0;
      c.copy(steppe).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.03 + z * 0.02)).lerp(rock, Math.max(0, steep) * 0.85 + r() * 0.08);
      if (riverDist(x, z) < RIVER_W / 2 + 16) c.lerp(green, 0.55);
      if (rampAt(x, z).d < RAMP_W / 2 + 1.5) c.lerp(road, 0.7);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.3} roughness={1} /></mesh>;
}
/** Yol: araziye oturan taş döşeli şerit ve kenar taşları */
export function Road({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < RAMP_PTS.length - 1; i++) {
      const a = RAMP_PTS[i], b = RAMP_PTS[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) + RAMP_W, g = new THREE.PlaneGeometry(RAMP_W + 0.6, L, 3, Math.ceil(L / 0.7)).toNonIndexed();
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
    const parts: THREE.BufferGeometry[] = [], mer: THREE.BufferGeometry[] = [], r = rng(12), n = 260;
    for (let i = 0; i < n; i++) {
      const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2, tm = (t0 + t1) / 2;
      if (angDist(tm, GATE_T) < 0.105) continue;   // kapı yapısının yeri
      const a = wallPoint(t0), b = wallPoint(t1), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.12;
      const rr = Math.hypot(cx, cz), ox = cx / rr, oz = cz / rr, inner = hillY(cx - ox * 1.8, cz - oz * 1.8), outer = hillY(cx + ox * 4, cz + oz * 4);
      const intact = Math.sin(tm * 3 + 1.1) + Math.sin(tm * 7) * 0.4 > 0.3 && !VIEW_T.some((v) => angDist(tm, v) < 0.14), para = intact ? 2.6 + r() * 0.3 : 0.9 + r() * 0.5;
      const top = inner + para, bot = Math.min(outer, inner) - 2.5, h = top - bot, T = 2.4;
      const g = bx(L, h, T, 3.2); g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2); g.translate(cx, bot + h / 2, cz); parts.push(g);
      if (intact && i % 2 === 0) { const q = bx(L * 0.55, 0.9, 1.1, 1.6); q.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2); q.translate(cx + ox * 0.6, top + 0.45, cz + oz * 0.6); mer.push(q); }
    }
    return { wall: mergeGeometries(parts)!, merl: mer.length ? mergeGeometries(mer)! : null };
  }, []);
  return <group><mesh geometry={wall} material={m.wall} castShadow receiveShadow />{merl && <mesh geometry={merl} material={m.wall} castShadow />}</group>;
}
function towerGeo(t: Tower) {
  const rr = Math.hypot(t.at[0], t.at[1]), ox = t.at[0] / rr, oz = t.at[1] / rr, cx = t.at[0] + ox * t.r * 0.55, cz = t.at[1] + oz * t.r * 0.55;
  const inner = hillY(t.at[0] - ox * 2, t.at[1] - oz * 2), outer = hillY(cx + ox * (t.r + 3), cz + oz * (t.r + 3)), top = inner + 4.2, bot = Math.min(outer, inner) - 3, h = top - bot;
  const yaw = Math.atan2(ox, oz);
  let g: THREE.BufferGeometry;
  if (t.kind === 'kare') g = bx(t.r * 2, h, t.r * 2, 3.2);
  else { g = new THREE.CylinderGeometry(t.r, t.r * 1.08, h, t.kind === 'ucgen' ? 3 : 20, 1); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (t.r * 6.28) / 3.2, uv.getY(i) * h / 3.2);
  }   // üçgen burcun sivri ucu (yerel +z) dışa bakar
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
    const W = 9, H = 8.5, w = 3.4, h = 4.8, s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
    const hole = new THREE.Path(), r = w / 2, sp = h - r; hole.moveTo(-r, 0); hole.lineTo(-r, sp); hole.quadraticCurveTo(-r, sp + r * 0.9, 0, sp + r * 1.25); hole.quadraticCurveTo(r, sp + r * 0.9, r, sp); hole.lineTo(r, 0); hole.closePath(); s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: 3, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -1.5); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.2, uv.getY(i) / 3.2); return g;
  }, []);
  const plaque = useMemo(() => canvasTex(512, 160, (g, r) => { g.fillStyle = '#b8a283'; g.fillRect(0, 0, 512, 160); g.strokeStyle = '#7c6a52'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 144); g.strokeStyle = '#5e4f3c'; g.lineWidth = 4; for (let row = 0; row < 3; row++) { let x = 30; while (x < 480) { const w = 10 + r() * 34; g.beginPath(); g.moveTo(x, 50 + row * 38); g.bezierCurveTo(x + w * 0.3, 24 + row * 38, x + w * 0.7, 62 + row * 38, x + w, 40 + row * 38); g.stroke(); if (r() < 0.4) { g.beginPath(); g.moveTo(x + w * 0.5, 30 + row * 38); g.lineTo(x + w * 0.5, 52 + row * 38); g.stroke(); } x += w + 6; } } }), []);
  const y = hillY(GATE[0], GATE[1]), yaw = GATE_T - Math.PI / 2;   // kemer düzlemi sur boyunca
  return <group position={[GATE[0], y - 0.3, GATE[1]]} rotation-y={-yaw}>
    <mesh geometry={geo} material={m.wall} castShadow receiveShadow />
    <mesh position={[0, 6.4, 1.52]}><planeGeometry args={[2.6, 0.8]} /><meshStandardMaterial map={plaque} roughness={0.9} /></mesh>
  </group>;
}
/** Selçuklu kitabesi (burcun iç yüzünde; yazı temsilî) */
export function Inscription({ t }: { t: Tower }) {
  const tex = useMemo(() => canvasTex(512, 256, (g, r) => { g.fillStyle = '#c2ab89'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#806b50'; g.lineWidth = 10; g.strokeRect(10, 10, 492, 236); g.strokeStyle = '#4f4232'; g.lineWidth = 5; g.lineCap = 'round';
    for (let row = 0; row < 4; row++) { let x = 36; while (x < 470) { const w = 14 + r() * 40, yb = 70 + row * 48; g.beginPath(); g.moveTo(x, yb); g.lineTo(x + w, yb); g.stroke(); if (r() < 0.6) { g.beginPath(); g.moveTo(x + w * 0.2, yb); g.lineTo(x + w * 0.2, yb - 26 - r() * 10); g.stroke(); } if (r() < 0.35) { g.beginPath(); g.arc(x + w * 0.6, yb - 8, 6, 0, Math.PI); g.stroke(); } x += w + 8; } } }), []);
  const rr = Math.hypot(t.at[0], t.at[1]), ox = t.at[0] / rr, oz = t.at[1] / rr, px = t.at[0] - ox * 1.25, pz = t.at[1] - oz * 1.25;
  return <mesh position={[px, hillY(px, pz) + 2.3, pz]} rotation-y={Math.atan2(-ox, -oz)}><planeGeometry args={[2.4, 1.2]} /><meshStandardMaterial map={tex} roughness={0.9} /></mesh>;
}
/** İç surun önündeki yürüme sınırını gösteren alçak duvar dibi (sur içi yüzü ile zemin arasındaki boşluğu kapatır) */
export function Ruins({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [], r = rng(8);
    for (const ru of RUINS) { const y = hillY(...ru.c), c = Math.cos(ru.yaw), s = Math.sin(ru.yaw);
      for (const [u, v, L, along] of [[0, -ru.d / 2, ru.w, true], [0, ru.d / 2, ru.w, true], [-ru.w / 2, 0, ru.d, false], [ru.w / 2, 0, ru.d, false]] as const) {
        const h = 0.5 + r() * 1.3, g = bx(along ? L : 0.8, h, along ? 0.8 : L, 2); g.rotateY(-ru.yaw); g.translate(ru.c[0] + u * c + v * s, y + h / 2 - 0.15, ru.c[1] - u * s + v * c); parts.push(g); } }
    for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = r() * 80, x = Math.cos(a) * d, z = Math.sin(a) * d * 0.4; if (!inside(x, z, 2)) continue; const s = 0.4 + r() * 0.7, g = bx(s * 1.4, s, s, 1.5); g.rotateY(r() * 3); g.translate(x, hillY(x, z) + s * 0.3, z); parts.push(g); }   // dağınık taş blokları
    return mergeGeometries(parts)!;
  }, []);
  return <mesh geometry={geo} material={m.rubble} castShadow receiveShadow />;
}
/** Kazı alanı: oyulmuş çukur, açma sınırı kazıkları, tahta geçit, eleme çerçevesi ve gölgelik */
export function Dig({ m }: { m: Mats }) {
  const y = hillY(...DIG.c), { c, w, d } = DIG;
  const stakes = useMemo(() => { const out: [number, number][] = []; for (let i = 0; i <= 6; i++) for (const s of [-1, 1]) { out.push([c[0] - w / 2 + (i * w) / 6, c[1] + s * d / 2]); } return out; }, [c, w, d]);
  return <group>
    <mesh material={m.soil} position={[c[0], y - 1.32, c[1]]} receiveShadow><boxGeometry args={[w - 0.2, 0.05, d - 0.2]} /></mesh>
    {[[-3, -2, 4, 3], [3, 1.5, 5, 4]].map(([dx, dz, ww, dd], i) => <mesh key={i} geometry={bx(ww, 0.7, dd, 2)} material={m.rubble} position={[c[0] + dx, y - 1.0, c[1] + dz]} castShadow receiveShadow />)}
    {stakes.map(([x, z], i) => <mesh key={i} material={m.wood} position={[x, y + 0.4, z]}><boxGeometry args={[0.06, 0.8, 0.06]} /></mesh>)}
    <mesh material={m.wood} position={[c[0], y + 0.05, c[1] + d / 2 + 0.9]} receiveShadow castShadow><boxGeometry args={[w * 0.6, 0.1, 1.2]} /></mesh>
    <group position={[c[0] + w / 2 + 3, y, c[1] - 2]}>
      {[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z], i) => <mesh key={i} material={m.wood} position={[x, 1.25, z]}><cylinderGeometry args={[0.05, 0.05, 2.5, 6]} /></mesh>)}
      <mesh position={[0, 2.6, 0]} castShadow><boxGeometry args={[3.6, 0.06, 3.6]} /><meshStandardMaterial color="#eae6dc" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh material={m.wood} position={[0, 0.7, 0]} rotation-z={0.3}><boxGeometry args={[1.2, 0.08, 0.8]} /></mesh>
    </group>
  </group>;
}

/* ===================== nehir, şehir, bitki, dağ ===================== */
export function River() {
  const geo = useMemo(() => {
    const pos: number[] = [], idx: number[] = [];
    const pts = RIVER, n = pts.length;
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L, w = RIVER_W / 2 + 2;
      pos.push(pts[i][0] + nx * w, -0.4, pts[i][1] + nz * w, pts[i][0] - nx * w, -0.4, pts[i][1] - nz * w); if (i < n - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }, []);
  return <mesh geometry={geo} userData={{ noCast: true }}><meshStandardMaterial color="#5f8a8e" roughness={0.15} metalness={0.25} side={THREE.DoubleSide} envMapIntensity={1.2} /></mesh>;
}
export function City() {
  const N = CITY.length, body = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => canvasTex(256, 256, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); for (let fl = 0; fl < 4; fl++) for (let k = 0; k < 4; k++) { g.fillStyle = '#5a6670'; g.fillRect(16 + k * 60, 18 + fl * 64, 30, 34); g.fillStyle = '#d9d3c8'; g.fillRect(14 + k * 60, 52 + fl * 64, 34, 4); } }), []);
  const mats = useMemo(() => { const side = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), top = new THREE.MeshStandardMaterial({ color: '#b8b0a2', roughness: 0.95 }); return [side, side, top, top, side, side]; }, [tex]);
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  useEffect(() => { const o = new THREE.Object3D(), c = new THREE.Color();
    CITY.forEach((b, i) => { const y = terrainY(b.x, b.z) - 0.5, h = b.floors * 3 + 0.5; o.rotation.set(0, b.yaw, 0);
      o.position.set(b.x, y + h / 2, b.z); o.scale.set(b.w, h, b.d); o.updateMatrix(); body.current?.setMatrixAt(i, o.matrix); body.current?.setColorAt(i, c.set(b.color));
      o.position.set(b.x, y + h, b.z); o.scale.set(b.w * 1.05, 2 + (i % 3) * 0.4, b.d * 1.05); o.updateMatrix(); roof.current?.setMatrixAt(i, o.matrix); roof.current?.setColorAt(i, c.set(['#9a4e3a', '#7d8288', '#a85c42'][i % 3])); });
    for (const mm of [body.current, roof.current]) if (mm) { mm.count = N; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [N]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return <group>
    <instancedMesh ref={body} args={[box, mats, N]} castShadow receiveShadow />
    <instancedMesh ref={roof} args={[roofGeo, undefined, N]} castShadow><meshStandardMaterial roughness={0.85} /></instancedMesh>
  </group>;
}
/** Çoruh kıyısında kavaklar (ince uzun) ve bahçe ağaçları */
export function Poplars({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), paint = (g: THREE.BufferGeometry, hex: string) => { const gg = g.toNonIndexed(), col: number[] = [], c = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { c.set(hex).offsetHSL(0, 0, (r() - 0.5) * 0.12); col.push(c.r, c.g, c.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
    const g = mergeGeometries([paint(new THREE.CylinderGeometry(0.15, 0.25, 3, 6).translate(0, 1.5, 0), '#6a5a44'), paint(new THREE.SphereGeometry(1.4, 10, 12).scale(1, 4.2, 1).translate(0, 7.5, 0), '#7f9a46')])!; g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(17), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 20 && k < n; i++) { const x = (r() - 0.5) * 760, z = -200 + r() * 520, rd = riverDist(x, z); if (rd < RIVER_W / 2 + 2 || rd > RIVER_W / 2 + 26 || CITY.some((b) => Math.abs(b.x - x) < b.w / 2 + 2 && Math.abs(b.z - z) < b.d / 2 + 2)) continue;
      o.position.set(x, terrainY(x, z) - 0.2, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    if (ref.current) { ref.current.count = k; ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 5 && k < n; i++) { const x = (r() - 0.5) * 240, z = -70 + r() * 210;
      if (rampAt(x, z).d < RAMP_W / 2 + 0.5 || (Math.abs(x - DIG.c[0]) < DIG.w / 2 + 1 && Math.abs(z - DIG.c[1]) < DIG.d / 2 + 1) || TOWERS.some((t) => Math.hypot(t.at[0] - x, t.at[1] - z) < t.r + 1.5)) continue;
      if (Math.abs(Math.hypot(x, z) - (edgeR(x, z) - 2)) < 2) continue;   // sur altında ot yok
      o.position.set(x, terrainY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.45; o.scale.set(s, s * (0.7 + r() * 0.5), s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.13 + r() * 0.05, 0.35, 0.5 + r() * 0.12); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
/** Bozkır dağları (çıplak, tepelerde kar) */
export function Mountains() {
  const list = useMemo(() => { const r = rng(31), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + r() * 0.3, dd = 900 + r() * 700; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(450 + r() * 300, 180 + r() * 260, 50 + i, i % 3 === 0 ? 0.78 : 2, '#9a8c6c') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
