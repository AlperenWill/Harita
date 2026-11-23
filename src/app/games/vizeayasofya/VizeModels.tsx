/**
 * Vize Ayasofyası — 3B modeller. Tuğla ve taş sıralı Bizans duvarları, nef ve yan nefleri ayıran sütunlar, yan nef galerileri, yüksek çokgen kasnaklı
 * kubbe, üç çokgen apsis, narteks, yamaçta kırmızı kiremitli Vize evleri, akropol eteğinde sur parçaları, servi ve dağlar. Ölçüler, galeri düzeni ve
 * pencere sayıları TEMSİLÎDİR (docs/VIZE-AYASOFYA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { AREA, CHURCH, DOOR, FLOOR_H, MIHRAB, NARTHEX, NAVE, PIERS, QIBLA_DEG, WALL_T, groundY } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.64, 0.58).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
const F = FLOOR_H, H_AISLE = 8, H_NAVE = 13;
const DOME = { c: [0, -2] as [number, number], r: 4.3, drumY: F + H_NAVE + 0.2, drumH: 3.8 };
/** sekizgen kasnağın köşe yarıçapı (iç teğet ≈ 4,4 m: nef duvarlarının üstüne oturur) ve kubbe bölümünün sınırları */
const DRUM_R = 4.75;
const BAY = { z0: DOME.c[1] - 5.2, z1: DOME.c[1] + 5.2 };
/** sivri kemerli pencere/niş biçimi (taban 0'da) */
const arch = (w: number, h: number) => { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.closePath(); return new THREE.ShapeGeometry(s, 8); };

/* ===================== malzemeler ===================== */
export interface Mats { wall: THREE.MeshStandardMaterial; inner: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; marble: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; lead: THREE.MeshStandardMaterial; glow: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; house: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // Bizans duvar düzeni: sıra sıra kesme taş, aralarda üçlü tuğla bandı (temsilî)
    // dört sıra kesme taş + beş sıra ince tuğla (geniş harç derzli) dönüşümlü bantlar; 256 px ≈ 3,4 m (temsilî)
    const wl = canvasTex(256, 256, (g, r) => { g.fillStyle = '#d8cfbd'; g.fillRect(0, 0, 256, 256); let y = 0;
      for (let k = 0; k < 4; k++, y += 30) for (let x = -(k % 2) * 30; x < 256; x += 60) { const v = 0.84 + r() * 0.22; g.fillStyle = `rgb(${(196 * v) | 0},${(186 * v) | 0},${(164 * v) | 0})`; g.fillRect(x + 2, y + 2, 56, 26); }
      for (let k = 0; k < 9; k++, y += 15.1) for (let x = -(k % 2) * 14; x < 256; x += 28) { const v = 0.8 + r() * 0.3; g.fillStyle = `rgb(${(160 * v) | 0},${(84 * v) | 0},${(60 * v) | 0})`; g.fillRect(x + 1, y + 4, 26, 8); } });
    wl.repeat.set(1.05, 1.05);
    const inner = canvasTex(256, 256, (g, r) => { g.fillStyle = '#d9cfb8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,100,70' : '255,250,235'},${r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 5, 5); } });
    const floor = canvasTex(256, 256, (g, r) => { g.fillStyle = '#cfc4a8'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(90,80,60,0.45)'; g.lineWidth = 2; for (let i = 0; i < 256; i += 64) { g.strokeRect(i + 2, 2, 60, 60); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 3, 3); } });
    floor.repeat.set(6, 9);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a45a3e'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 12) for (let x = 0; x < 256; x += 16) { const v = 0.78 + r() * 0.35; g.fillStyle = `rgb(${(170 * v) | 0},${(88 * v) | 0},${(62 * v) | 0})`; g.fillRect(x + ((y / 12) % 2) * 8, y, 14, 10); } });
    return {
      wall: new THREE.MeshStandardMaterial({ map: wl, roughness: 0.95 }),
      inner: new THREE.MeshStandardMaterial({ map: inner, roughness: 0.95, side: THREE.DoubleSide }),
      floor: new THREE.MeshStandardMaterial({ map: floor, roughness: 0.7 }),
      marble: new THREE.MeshStandardMaterial({ color: '#e1d9c5', roughness: 0.55 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      lead: new THREE.MeshStandardMaterial({ color: '#7d8680', roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide }),
      glow: new THREE.MeshStandardMaterial({ color: '#f0f4f4', emissive: '#e4eef2', emissiveIntensity: 0.85, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b3a88f', roughness: 0.95 }),
      house: new THREE.MeshStandardMaterial({ color: '#ece4d2', roughness: 0.95 }),
    };
  }, []);
}

/* ===================== kilise ===================== */
export function Church({ m, tier }: { m: Mats; tier: Tier }) {
  const apseMat = useMemo(() => { const mm = m.wall.clone(); mm.map = m.wall.map!.clone(); mm.map.repeat.set(2.4, 2.6); mm.map.needsUpdate = true; mm.side = THREE.DoubleSide; return mm; }, [m.wall]);
  const drumMat = useMemo(() => { const mm = m.wall.clone(); mm.map = m.wall.map!.clone(); mm.map.repeat.set(3, 1.2); mm.map.needsUpdate = true; mm.side = THREE.DoubleSide; return mm; }, [m.wall]);
  const walls = useMemo(() => { const p: Parts = [], C = CHURCH, t = WALL_T, y = F - 0.3;
    slab(p, C.x0, -2.5, C.z0, C.z0 + t, H_AISLE + 0.2, y); slab(p, 2.5, C.x1, C.z0, C.z0 + t, H_AISLE + 0.2, y); slab(p, -2.5, 2.5, C.z0, C.z0 + t, H_AISLE + 0.2 - 6.4, y + 6.4);   // kuzey (apsis) duvarı: ortada apsise açılan kemer gözü
    slab(p, C.x0, C.x0 + t, C.z0, C.z1, H_AISLE + 0.2, y); slab(p, C.x1 - t, C.x1, C.z0, C.z1, H_AISLE + 0.2, y);
    slab(p, C.x0, -DOOR, C.z1 - t, C.z1, H_AISLE - 0.8, y); slab(p, DOOR, C.x1, C.z1 - t, C.z1, H_AISLE - 0.8, y); slab(p, -DOOR, DOOR, C.z1 - t, C.z1, H_AISLE - 0.8 - 4.4, y + 4.4);
    slab(p, C.x0, -DOOR, NAVE.z1, NARTHEX.z0, H_AISLE + 0.2, y); slab(p, DOOR, C.x1, NAVE.z1, NARTHEX.z0, H_AISLE + 0.2, y); slab(p, -DOOR, DOOR, NAVE.z1, NARTHEX.z0, H_AISLE + 0.2 - 4.4, y + 4.4);
    // nefin yüksek yan duvarları (sütun sıralarının üstünde) ve nef duvarının batı/doğu alınlıkları
    slab(p, -4.4, -3.6, NAVE.z0, NAVE.z1, H_NAVE - H_AISLE + 0.3, F + H_AISLE); slab(p, 3.6, 4.4, NAVE.z0, NAVE.z1, H_NAVE - H_AISLE + 0.3, F + H_AISLE);
    // nefin iki ucunda (apsis duvarı ve narteks duvarı) yan nef çatısının üstüne çıkan alınlık duvarları: tonozun ağzını ve çatı üçgenini kapatır
    { const g = new THREE.Shape(), RH = 4.2, top = F + H_NAVE; g.moveTo(-4.4, F + H_AISLE - 0.2); g.lineTo(4.4, F + H_AISLE - 0.2); g.lineTo(4.4, top + RH * (1 - 4.4 / 5)); g.lineTo(0, top + RH); g.lineTo(-4.4, top + RH * (1 - 4.4 / 5)); g.closePath();
      for (const [z0, z1] of [[CHURCH.z0, NAVE.z0], [NAVE.z1, NARTHEX.z0]] as const) { const e = new THREE.ExtrudeGeometry(g, { depth: z1 - z0, bevelEnabled: false }); e.translate(0, 0, z0); p.push(e); } }
    // kubbe bölümünün iki ucunda tonoz ağzını kapatan duvarlar (dösemenin üstünde)
    { const tri = new THREE.Shape(); tri.moveTo(-5, F + H_NAVE); tri.lineTo(5, F + H_NAVE); tri.lineTo(0, F + H_NAVE + 4.2); tri.closePath();
      for (const z of [BAY.z0, BAY.z1]) { const e = new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }); e.translate(0, 0, z - 0.15); p.push(e); } }
    return merge(p); }, []);
  const columns = useMemo(() => { const p: Parts = [];
    for (const q of PIERS) { const c = new THREE.CylinderGeometry(0.55, 0.62, H_AISLE - 0.4, 14); c.translate(q[0], F + (H_AISLE - 0.4) / 2, q[1]); p.push(c); const cap = bx(1.3, 0.45, 1.3, 1); cap.translate(q[0], F + H_AISLE - 0.2, q[1]); p.push(cap); const base = bx(1.4, 0.3, 1.4, 1); base.translate(q[0], F + 0.15, q[1]); p.push(base); }
    for (const x of [-4, 4]) { const b = bx(0.9, 0.7, NAVE.z1 - NAVE.z0, 3); b.translate(x, F + H_AISLE + 0.35, (NAVE.z0 + NAVE.z1) / 2); p.push(b); }
    return merge(p); }, []);
  const galleries = useMemo(() => { const p: Parts = [];
    for (const [x0, x1] of [[-8, -4.4], [4.4, 8]] as const) slab(p, x0, x1, NAVE.z0, NAVE.z1, 0.45, F + 5, 1.5);
    return merge(p); }, []);
  // iç örtü: nefte kubbe bölümünün iki yanında beşik tonoz, yan neflerde düz tavan, kubbe bölümünde dairesel açıklıklı döşeme
  const ceilings = useMemo(() => { const p: Parts = [], R = 3.6, spring = F + H_NAVE - 1.6;
    for (const [z0, z1] of [[NAVE.z0, BAY.z0], [BAY.z1, NAVE.z1]] as const) { const v = new THREE.CylinderGeometry(R, R, z1 - z0, 28, 1, true, Math.PI / 2, Math.PI); v.rotateX(Math.PI / 2); v.translate(0, spring, (z0 + z1) / 2); p.push(v); }
    const sh = new THREE.Shape(); sh.moveTo(-4.4, BAY.z0); sh.lineTo(4.4, BAY.z0); sh.lineTo(4.4, BAY.z1); sh.lineTo(-4.4, BAY.z1); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(DOME.c[0], DOME.c[1], DOME.r - 0.1, 0, Math.PI * 2, true); sh.holes.push(hole);
    const d = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, curveSegments: 40 }); d.rotateX(Math.PI / 2); d.translate(0, F + H_NAVE + 0.2, 0); p.push(d);
    for (const sd of [-1, 1]) { const c = bx(3.6, 0.3, NAVE.z1 - NAVE.z0, 2); c.translate(sd * 6.2, F + H_AISLE + 0.05, (NAVE.z0 + NAVE.z1) / 2); p.push(c); }
    const nc = bx(NARTHEX.x1 - NARTHEX.x0, 0.3, NARTHEX.z1 - NARTHEX.z0, 2); nc.translate(0, F + H_AISLE - 0.4, (NARTHEX.z0 + NARTHEX.z1) / 2); p.push(nc);
    return merge(p); }, []);
  const roofs = useMemo(() => { const p: Parts = [], W = 10, RH = 4.2;
    const z0n = NAVE.z0 - 1.3, z1n = BAY.z0, z0s = BAY.z1, z1s = NAVE.z1 + 1;
    // içi boş kırma çatı: iki eğik levha (altındaki beşik tonoz görünsün diye dolu üçgen yerine)
    const a = Math.atan2(RH, W / 2), L = Math.hypot(W / 2, RH) + 0.5;
    for (const [z0, z1] of [[z0n, z1n], [z0s, z1s]] as const) for (const sd of [-1, 1]) { const g = bx(L, 0.25, z1 - z0, 2); g.rotateZ(sd * -a); g.translate(sd * (W / 4 + 0.1), F + H_NAVE + RH / 2 - 0.05, (z0 + z1) / 2); p.push(g); }
    { const sh = new THREE.Shape(); sh.moveTo(-4.8, BAY.z0); sh.lineTo(4.8, BAY.z0); sh.lineTo(4.8, BAY.z1); sh.lineTo(-4.8, BAY.z1); sh.closePath();
      const hole = new THREE.Path(); hole.absarc(DOME.c[0], DOME.c[1], DRUM_R - 0.05, 0, Math.PI * 2, true); sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 32 }); g.rotateX(Math.PI / 2); g.translate(0, F + H_NAVE + 0.5, 0); p.push(g); }
    for (const sd of [-1, 1]) { const g = bx(4.9, 0.4, NAVE.z1 - NAVE.z0 + 2, 2); g.rotateZ(sd * -0.28); g.translate(sd * 6.3, F + H_AISLE + 1.0, (NAVE.z0 + NAVE.z1) / 2); p.push(g); }
    const nt = bx(NARTHEX.x1 - NARTHEX.x0 + 2.4, 0.4, NARTHEX.z1 - NARTHEX.z0 + 2.4, 2); nt.translate(0, F + H_AISLE, (NARTHEX.z0 + NARTHEX.z1) / 2); p.push(nt);
    return merge(p); }, []);
  const apses = useMemo(() => { const p: Parts = [], cap: Parts = [];
    for (const [x, r] of [[0, 3.1], [-6, 1.9], [6, 1.9]] as const) { const h = H_AISLE + (x === 0 ? 1.5 : -0.5); const g = new THREE.CylinderGeometry(r, r, h, 5, 1, true, Math.PI * 0.5, Math.PI); g.translate(x, F - 0.3 + h / 2, CHURCH.z0 + 0.4); p.push(g);
      const c = new THREE.SphereGeometry(r * 1.02, 10, 5, Math.PI, Math.PI, 0, Math.PI / 2); c.scale(1, 0.55, 1); c.translate(x, F - 0.3 + h, CHURCH.z0 + 0.4); cap.push(c); }
    return { p: merge(p), cap: merge(cap) }; }, []);
  const windows = useMemo(() => { const glow: Parts = [], dk: Parts = [], A = (arr: Parts, x: number, y: number, z: number, ry: number, w: number, h: number) => { const g = arch(w, h); g.rotateY(ry); g.translate(x, y, z); arr.push(g); };
    // nefin üst pencereleri (iç yüz, ışıklı) ve kubbe kasnağı pencereleri
    for (let k = 0; k < 4; k++) { const z = NAVE.z0 + 3 + k * 7.2; if (z > BAY.z0 - 0.5 && z < BAY.z1 + 0.5) continue; A(glow, -3.58, F + 9.9, z, Math.PI / 2, 0.9, 1.4); A(glow, 3.58, F + 9.9, z, -Math.PI / 2, 0.9, 1.4); A(dk, -4.43, F + 9.9, z, -Math.PI / 2, 0.9, 1.4); A(dk, 4.43, F + 9.9, z, Math.PI / 2, 0.9, 1.4); }
    const n = 8, ap = DRUM_R * Math.cos(Math.PI / n);
    for (let k = 0; k < n; k++) { const a = (k + 0.5) * (2 * Math.PI / n), nx = Math.sin(a), nz = Math.cos(a);
      A(glow, DOME.c[0] + nx * (ap - 0.05), DOME.drumY + 1.0, DOME.c[1] + nz * (ap - 0.05), a + Math.PI, 0.9, 2.2);
      A(dk, DOME.c[0] + nx * (ap + 0.04), DOME.drumY + 1.0, DOME.c[1] + nz * (ap + 0.04), a, 0.9, 2.2); }
    // dış yüz: yan duvarlarda iki sıra, narteks cephesinde, apsislerde kemerli pencereler (koyu)
    for (let k = 0; k < 6; k++) { const z = CHURCH.z0 + 4 + k * 4.6; for (const sx of [-1, 1]) { A(dk, sx * (CHURCH.x1 + 0.03), F + 1.6, z, sx * Math.PI / 2, 0.9, 1.8); A(dk, sx * (CHURCH.x1 + 0.03), F + 5.4, z, sx * Math.PI / 2, 1.0, 1.9); } }
    for (const x of [-6, -3.4, 3.4, 6]) A(dk, x, F + 4.8, CHURCH.z1 + 0.03, 0, 1.0, 2.0);
    for (const x of [-5.6, 5.6]) A(dk, x, F + 1.4, CHURCH.z1 + 0.03, 0, 0.9, 1.7);
    for (const a of [-0.55, 0, 0.55]) { const r = 3.1 * Math.cos(Math.PI / 5) + 0.05, nx = Math.sin(a + Math.PI), nz = Math.cos(a + Math.PI); A(dk, nx * r, F + 4.2, CHURCH.z0 + 0.4 + nz * r, a + Math.PI, 0.9, 2.4); }
    return { glow: merge(glow), dk: merge(dk) }; }, []);
  return <group>
    <mesh geometry={walls} material={m.wall} castShadow receiveShadow />
    <mesh geometry={columns} material={m.marble} castShadow receiveShadow />
    <mesh geometry={galleries} material={m.inner} castShadow receiveShadow />
    <mesh geometry={ceilings} material={m.inner} receiveShadow />
    <mesh geometry={roofs} material={m.roof} castShadow receiveShadow />
    <mesh geometry={apses.p} material={apseMat} castShadow receiveShadow />
    <mesh geometry={apses.cap} material={m.roof} castShadow />
    <mesh position={[0, F - 0.3 + H_AISLE + 1.5, CHURCH.z0 + 0.4]} scale={[1, 0.55, 1]}><sphereGeometry args={[3.0, 12, 6, Math.PI, Math.PI, 0, Math.PI / 2]} /><primitive object={m.inner} attach="material" /></mesh>
    {/* sekizgen kasnak (içi de görünür) ve kurşun kubbe */}
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH / 2, DOME.c[1]]} material={drumMat} castShadow><cylinderGeometry args={[DRUM_R, DRUM_R, DOME.drumH, 8, 1, true]} /></mesh>
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH, DOME.c[1]]} rotation-x={-Math.PI / 2}><ringGeometry args={[DOME.r - 0.05, DRUM_R + 0.25, 8, 1]} /><primitive object={m.lead} attach="material" /></mesh>
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH, DOME.c[1]]} castShadow><sphereGeometry args={[DOME.r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.lead} attach="material" /></mesh>
    <mesh position={[DOME.c[0], DOME.drumY + DOME.drumH, DOME.c[1]]}><sphereGeometry args={[DOME.r - 0.25, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.inner} attach="material" /></mesh>
    <mesh geometry={windows.glow}><primitive object={m.glow} attach="material" /></mesh>
    <mesh geometry={windows.dk} material={m.dark} />
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, (NAVE.z0 + NARTHEX.z1) / 2]} receiveShadow><planeGeometry args={[NAVE.x1 - NAVE.x0, NARTHEX.z1 - NAVE.z0]} /><primitive object={m.floor} attach="material" /></mesh>
    <MosqueLayer m={m} />
    <pointLight position={[0, F + 6.2, 0]} color="#ffe6bf" intensity={tier === 'low' ? 60 : 90} distance={26} decay={2} />
    {tier !== 'low' && <pointLight position={[0, F + 5, -12]} color="#ffdcae" intensity={50} distance={18} decay={2} />}
  </group>;
}

/* ===================== cami katmanı: kıble bulununca mihrap, minber ve çapraz saflar belirir ===================== */
export const mosqueState = { on: false };
function MosqueLayer({ m }: { m: Mats }) {
  const ref = useRef<THREE.Group>(null), k = useRef(0);
  useFrame((_, dt) => { const g = ref.current; if (!g) return; const t = mosqueState.on ? 1 : 0; k.current += (t - k.current) * Math.min(1, dt * 2.5); g.scale.set(1, Math.max(0.001, k.current), 1); g.visible = k.current > 0.01; });
  const geo = useMemo(() => { const st: Parts = [], dk: Parts = [], rug: Parts = [], [mx, mz] = MIHRAB.at, ry = MIHRAB.ry;
    // mihrap: duvara yaslı çerçeve + koyu sivri niş
    const fr = bx(2.4, 4.2, 0.3, 1); fr.rotateY(ry); fr.translate(mx - Math.sin(ry) * -0.12, F + 2.1, mz - Math.cos(ry) * -0.12); st.push(fr);
    const ni = arch(1.4, 3.0); ni.rotateY(ry); ni.translate(mx + Math.sin(ry) * 0.3, F + 0.3, mz + Math.cos(ry) * 0.3); dk.push(ni);
    // saflar: kıble yönüne dik halı şeritleri (binanın eksenine göre çapraz)
    const b = (QIBLA_DEG * Math.PI) / 180, qx = -Math.cos(b), qz = -Math.sin(b), ang = Math.atan2(qx, qz);
    for (let i = 1; i <= 6; i++) { const cx = mx - qx * (1.4 + i * 1.5), cz = mz - qz * (1.4 + i * 1.5); const L = i < 3 ? 4 : 7; const g = new THREE.PlaneGeometry(L, 1.0); g.rotateX(-Math.PI / 2); g.rotateY(ang); g.translate(cx, F + 0.04, cz); rug.push(g); }
    // minber: mihrabın sağında basamaklı blok
    const sx = Math.cos(ry), sz = -Math.sin(ry);
    for (let i = 0; i < 6; i++) { const s0 = bx(0.9, 0.45 + i * 0.4, 0.8, 1); s0.rotateY(ry); s0.translate(mx + sx * 2.2 + Math.sin(ry) * (0.6 + i * 0.6), F + (0.45 + i * 0.4) / 2, mz + sz * 2.2 + Math.cos(ry) * (0.6 + i * 0.6)); st.push(s0); }
    return { st: merge(st), dk: merge(dk), rug: merge(rug) }; }, []);
  const rugMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7d2a28', roughness: 1 }), []);
  return <group ref={ref} visible={false}>
    <mesh geometry={geo.st} material={m.marble} castShadow receiveShadow />
    <mesh geometry={geo.dk} material={m.dark} />
    <mesh geometry={geo.rug} material={rugMat} receiveShadow />
  </group>;
}

/* ===================== kasaba, yamaç, çevre ===================== */
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 80; i++) { const a = r() * Math.PI * 2, d = 62 + r() * 60, x = Math.cos(a) * d * 1.3, z = Math.sin(a) * d * 0.9 + 10, w = 7 + r() * 5, dd = 7 + r() * 4, h = 5 + r() * 4, y = groundY(x, z);
      const b = bx(w, h, dd, 2.4); b.translate(x, y + h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, dd) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, y + h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.house} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(300, 240, N, N); g.rotateX(-Math.PI / 2); g.translate(0, 0, 10);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#86a05a'), dry = new THREE.Color('#a9a672'), dirt = new THREE.Color('#bdb08a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, groundY(x, z) - (groundY(x, z) === F ? 0.1 : 0));
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.05 + z * 0.04)); if (Math.abs(x) < 6 && z > 16 && z < 56) c.lerp(dirt, 0.7);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>;
}
export function WallRuins({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], r = rng(7);
    for (let i = 0; i < 12; i++) { const x = -40 + i * 7 + r() * 3, z = -34 - r() * 6, w = 4 + r() * 4, h = 1.2 + r() * 2.4; const g = bx(w, h, 1.4, 1.5); g.rotateY((r() - 0.5) * 0.3); g.translate(x, groundY(x, z) + h / 2 - 0.1, z); p.push(g); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}
export function Cypress({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.15, 0.25, 1.4, 6); t.translate(0, 0.7, 0); parts.push(t); const c = new THREE.ConeGeometry(1.3, 8, 9); c.translate(0, 5.2, 0); parts.push(c); const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a4d2f', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(15), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 12 && k < n; i++) { const x = -48 + r() * 96, z = -38 + r() * 96; if (x > CHURCH.x0 - 4 && x < CHURCH.x1 + 4 && z > CHURCH.z0 - 5 && z < CHURCH.z1 + 5) continue; if (Math.abs(x) < 8 && z > 16) continue;
      const near = x < AREA.x0 + 2 || x > AREA.x1 - 2 || z < AREA.z0 + 2 || z > AREA.z1 - 2; if (!near && r() < 0.6) continue;
      o.position.set(x, groundY(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.6); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -48 + r() * 96, z = -38 + r() * 96; if (x > CHURCH.x0 - 1.5 && x < CHURCH.x1 + 1.5 && z > CHURCH.z0 - 1.5 && z < CHURCH.z1 + 1.5) continue; if (Math.abs(x) < 6 && z > 16) continue;
      o.position.set(x, groundY(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.18 + r() * 0.06, 0.38, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 750 + r() * 300; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(340 + r() * 160, 120 + r() * 100, 330 + i, 0, '#6a8250') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
