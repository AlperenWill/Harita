/**
 * Meydan Medresesi — 3B modeller. Moloz taş dış duvarlar, kemerli taç kapı ve kitabe levhası, avlu döşemesi, yan hücre blokları,
 * kuzey eyvanı, avlu havuzu, meydan ve dağlar. Ölçüler, hücre sayısı ve kitabe metni TEMSİLÎDİR (docs/MEYDAN-MEDRESE.md).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BUILD, CELLS, COURT, EYVAN, HOUSES as HOUSE_RECTS, POOL, PORTAL, SQUARE, WALL_T } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
/** Sivri kemer biçimi (taban 0'da) */
function archShape(w: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, sp); s.quadraticCurveTo(r, sp + r * 0.9, 0, sp + r * 1.25); s.quadraticCurveTo(-r, sp + r * 0.9, -r, sp); s.closePath(); return s; }
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
const H = 7;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; court: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; plaque: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('meydan-moloz', ['#a89a84', '#9a8c78', '#b6a993', '#8c7f6c'], [16, 12], [28, 36]);
    const court = canvasTex(256, 256, (g, r) => { g.fillStyle = '#c4b89e'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { g.fillStyle = `rgba(${r() < 0.5 ? '90,80,62' : '240,232,214'},${0.08 + r() * 0.12})`; g.fillRect(x + 1, y + 1, 30, 30); } });
    court.repeat.set(3, 3);
    const roofT = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8f8270'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '50,44,36' : '220,212,196'},${r() * 0.2})`; g.fillRect(r() * 256, r() * 256, 3, 3); } });
    const plaque = canvasTex(256, 128, (g) => { g.fillStyle = '#e9e1cc'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#6a5a44'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 108); g.fillStyle = '#3a2e22'; g.font = 'bold 26px serif'; g.textAlign = 'center'; g.fillText('H. 1112', 128, 58); g.font = '20px serif'; g.fillText('M. 1700–1701', 128, 92); });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.45, roughness: 0.95 })),
      court: new THREE.MeshStandardMaterial({ map: court, roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ map: roofT, roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a2c', roughness: 0.85 }),
      plaque: new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.7 }),
      water: new THREE.MeshStandardMaterial({ color: '#3e7f8e', roughness: 0.15, metalness: 0.1 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2320', roughness: 1 }),
    };
  }, []);
}

/* ===================== medrese ===================== */
export function Madrasa({ m }: { m: Mats }) {
  const walls = useMemo(() => { const p: Parts = [], B = BUILD, t = WALL_T;
    // dış duvarlar: güneyde taç kapı, kuzeyde eyvan açıklığı
    slab(p, B.x0, EYVAN.x0, B.z0, B.z0 + t, H, 0);   // kuzey duvarı (sol parça)
    slab(p, B.x0, B.x0 + t, B.z0, B.z1, H, 0); slab(p, B.x1 - t, B.x1, B.z0, B.z1, H, 0);
    slab(p, B.x0, PORTAL.x0, B.z1 - t, B.z1, H, 0); slab(p, PORTAL.x1, B.x1, B.z1 - t, B.z1, H, 0);
    slab(p, PORTAL.x0, PORTAL.x1, B.z1 - t, B.z1, H - 5.2, 5.2, 1.6);   // taç kapı üstü
    slab(p, -4.4, 4.4, B.z1 - t, B.z1 + 0.4, 2, H, 1.6);   // duvarın üstüne taşan taç kapı kütlesi
    // kuzey duvarı, eyvan açıklığının iki yanı ve üstü
    slab(p, EYVAN.x1, B.x1, B.z0, B.z0 + t, H, 0);
    slab(p, EYVAN.x0, EYVAN.x1, B.z0, B.z0 + t, H - 4, 4);
    // hücre blokları: iki yanda duvar ve kubbe-benzeri düz çatı
    for (const c of CELLS) { slab(p, c.x0, c.x1, c.z0, c.z1, 4.2, 0, 3); }
    return merge(p); }, []);
  const cellRoof = useMemo(() => { const p: Parts = []; for (const c of CELLS) { const g = bx(c.x1 - c.x0 + 0.2, 0.5, c.z1 - c.z0 + 0.2, 2); g.translate((c.x0 + c.x1) / 2, 4.45, (c.z0 + c.z1) / 2); p.push(g); } return merge(p); }, []);
  const cellDoors = useMemo(() => { const p: Parts = []; for (const c of CELLS) { const xf = c.x1 > 0 ? c.x0 : c.x1; for (let k = 0; k < 6; k++) { const z = c.z0 + 1.5 + k * 3.8; const g = bx(0.2, 2.2, 1.4, 1); g.translate(xf + (c.x1 > 0 ? 0.1 : -0.1), 1.1, z); p.push(g); } } return merge(p); }, []);
  // taç kapı çerçevesi: dış kemerin içinde geçit boşluğu bırakılır (dolu şekil geçidi kapatırdı)
  const archG = useMemo(() => { const o = archShape(PORTAL.x1 - PORTAL.x0 + 1.8, 6.6), hole = archShape(PORTAL.x1 - PORTAL.x0, 5.2); o.holes.push(hole); return new THREE.ExtrudeGeometry(o, { depth: 0.35, bevelEnabled: false, curveSegments: 8 }); }, []);
  const court = useMemo(() => { const g = new THREE.PlaneGeometry(COURT.x1 - COURT.x0, COURT.z1 - COURT.z0); g.rotateX(-Math.PI / 2); return g; }, []);
  return <group>
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={cellRoof} material={m.roof} castShadow receiveShadow />
    <mesh geometry={cellDoors} material={m.wood} castShadow />
    <mesh geometry={court} material={m.court} position={[0, 0.02, 0]} receiveShadow />
    {/* taç kapı: sivri kemerli çerçeve ve kitabe levhası */}
    <mesh geometry={archG} material={m.stone} position={[0, 0, BUILD.z1 - 0.05]} castShadow />
    <mesh material={m.plaque} position={[0, 7.95, BUILD.z1 + 0.42]}><planeGeometry args={[3.2, 1.4]} /></mesh>
    {/* eyvan: kuzey açıklığında ahşap kapı kanatları (açık) */}
    {[-1, 1].map((s) => <mesh key={s} material={m.wood} position={[s * (EYVAN.x1 - 0.2), 2.2, BUILD.z0 + WALL_T + 0.3]} rotation-y={s * 1.2}><boxGeometry args={[1.6, 4.2, 0.12]} /></mesh>)}
    {/* havuz */}
    <mesh position={[POOL.x, 0.05, POOL.z]} rotation-x={-Math.PI / 2}><circleGeometry args={[POOL.r, 24]} /><primitive object={m.water} attach="material" /></mesh>
    <mesh position={[POOL.x, 0.2, POOL.z]} rotation-x={-Math.PI / 2}><torusGeometry args={[POOL.r + 0.1, 0.25, 8, 24]} /><primitive object={m.stone} attach="material" /></mesh>
    <pointLight position={[0, 4.5, 0]} color="#ffe3b5" intensity={18} distance={16} decay={2} />
  </group>;
}

/* ===================== meydan, çevre ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 40 : 20, g = new THREE.PlaneGeometry(SQUARE.x1 - SQUARE.x0 + 80, SQUARE.z1 - SQUARE.z0 + 80, N, N); g.rotateX(-Math.PI / 2); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.3, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#b8a87e" map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>;
}
export function Square({ m }: { m: Mats }) {
  const g = useMemo(() => { const x = SQUARE.x1 - SQUARE.x0, z = SQUARE.z1 - SQUARE.z0; const p = new THREE.PlaneGeometry(x, z); p.rotateX(-Math.PI / 2); p.translate(0, -0.12, 0); return p; }, []);
  return <mesh geometry={g} material={m.court} receiveShadow />;
}
export function Houses({ m }: { m: Mats }) {
  const list = useMemo(() => HOUSE_RECTS.map((r) => ({ x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, w: r.x1 - r.x0, d: r.z1 - r.z0 })), []);
  return <group>{list.map((h, i) => <group key={i}>
    <mesh material={m.stone} position={[h.x, 2.6, h.z]} castShadow receiveShadow><boxGeometry args={[h.w, 5.2, h.d]} /></mesh>
    <mesh material={m.roof} position={[h.x, 5.8, h.z]} rotation-y={Math.PI / 4} castShadow><coneGeometry args={[Math.max(h.w, h.d) * 0.72, 1.6, 4]} /></mesh>
  </group>)}</group>;
}
export function Mountains() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI * (0.95 + (i / 8) * 1.1) + r() * 0.1, dd = 700 + r() * 400; out.push({ p: [Math.cos(a) * dd, -4, Math.sin(a) * dd], g: mountainGeo(420 + r() * 220, 210 + r() * 180, 170 + i, 2.5, '#6d6a4e') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = [];
    const trunk = new THREE.CylinderGeometry(0.2, 0.3, 4, 6); trunk.translate(0, 2, 0); parts.push(trunk);
    const crown = new THREE.SphereGeometry(1.8, 10, 8); crown.scale(1, 2.4, 1); crown.translate(0, 6, 0); parts.push(crown);
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3f6a3a', roughness: 0.95 }), []);
  // ağaçlar yalnızca meydanın dışında, yürünmeyen bölgede dikilir
  const spots: [number, number][] = useMemo(() => { const r = rng(12); return Array.from({ length: n }, (_, i) => i % 2 === 0 ? [(r() < 0.5 ? -1 : 1) * (46 + r() * 22), -50 + r() * 100] as [number, number] : [-60 + r() * 120, (r() < 0.5 ? -1 : 1) * (42 + r() * 14)] as [number, number]); }, [n]);
  return <group>{spots.map(([x, z], i) => <mesh key={i} geometry={geo} material={mat} position={[x, 0, z]} castShadow receiveShadow />)}</group>;
}
