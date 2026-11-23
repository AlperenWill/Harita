/**
 * Rákóczi Müzesi — 3B modeller. İki katlı ahşap konak (beyaz sıvalı zemin kat, çıkmalı ahşap üst kat, kırma çatı), içeride ahşap döşeme, bölme duvar,
 * bronz büstlü kaide, vitrinler, merdiven bloğu, Mikes'in masası; avluda çit, çeşme ve ağaçlar; çevrede Tekirdağ evleri ve Marmara. Ölçüler, oda düzeni
 * ve eşyalar TEMSİLÎDİR (docs/RAKOCZI.md).
 */
import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, useGrassCards } from '../shared/scenery';
import { CASES, DESK, ENTRY, FLOOR_H, FOUNTAIN, HOUSE, LETTERS, PARTITION_DOOR, PARTITION_X, PEDESTAL, SHELF, STAIRS, TREES, WALL_T } from './site';
import { useFrame } from '@react-three/fiber';

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
const H1 = 3.6, F = FLOOR_H;

/* ===================== malzemeler ===================== */
export interface Mats { plaster: THREE.MeshStandardMaterial; timber: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; bronze: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const tm = canvasTex(128, 512, (g, r) => { g.fillStyle = '#6e4a2c'; g.fillRect(0, 0, 128, 512); for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,26,14' : '150,108,70'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512); g.stroke(); } });
    const fl = canvasTex(256, 256, (g, r) => { for (let x = 0; x < 256; x += 32) { const v = 0.8 + r() * 0.3; g.fillStyle = `rgb(${(150 * v) | 0},${(108 * v) | 0},${(70 * v) | 0})`; g.fillRect(x, 0, 30, 256); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 30, 0, 2, 256); } });
    fl.repeat.set(6, 3);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#a4553a'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 12) for (let x = 0; x < 256; x += 16) { const v = 0.78 + r() * 0.35; g.fillStyle = `rgb(${(170 * v) | 0},${(88 * v) | 0},${(62 * v) | 0})`; g.fillRect(x + ((y / 12) % 2) * 8, y, 14, 10); } });
    return {
      plaster: new THREE.MeshStandardMaterial({ color: '#efe7d6', roughness: 0.95 }),
      timber: new THREE.MeshStandardMaterial({ map: tm, roughness: 0.85 }),
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.7 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      bronze: new THREE.MeshStandardMaterial({ color: '#7a5a36', roughness: 0.35, metalness: 0.75 }),
      glass: new THREE.MeshStandardMaterial({ color: '#cfe6ef', transparent: true, opacity: 0.22, roughness: 0.05 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#8a6038', roughness: 0.8 }),
      stone: new THREE.MeshStandardMaterial({ color: '#b7ad98', roughness: 0.95 }),
      water: new THREE.MeshStandardMaterial({ color: '#4a7f8c', roughness: 0.12, metalness: 0.15 }),
    };
  }, []);
}

/* ===================== konak ===================== */
export function House({ m, tier }: { m: Mats; tier: Tier }) {
  const walls = useMemo(() => { const p: Parts = [], B = HOUSE, t = WALL_T, y = F - 0.1;
    slab(p, B.x0 - t, B.x1 + t, B.z0 - t, B.z0, H1, y); slab(p, B.x0 - t, B.x0, B.z0, B.z1 + t, H1, y); slab(p, B.x1, B.x1 + t, B.z0, B.z1 + t, H1, y);
    slab(p, B.x0 - t, ENTRY.x0, B.z1, B.z1 + t, H1, y); slab(p, ENTRY.x1, B.x1 + t, B.z1, B.z1 + t, H1, y); slab(p, ENTRY.x0, ENTRY.x1, B.z1, B.z1 + t, H1 - 2.5, y + 2.5);
    // bölme duvarı (Mikes'in odası)
    slab(p, PARTITION_X - 0.2, PARTITION_X + 0.2, B.z0, PARTITION_DOOR.z0, H1, y); slab(p, PARTITION_X - 0.2, PARTITION_X + 0.2, PARTITION_DOOR.z1, B.z1, H1, y);
    slab(p, PARTITION_X - 0.2, PARTITION_X + 0.2, PARTITION_DOOR.z0, PARTITION_DOOR.z1, H1 - 2.4, y + 2.4);
    return merge(p); }, []);
  const upper = useMemo(() => { const p: Parts = [], B = HOUSE, t = WALL_T, y = F + H1;
    // çıkmalı üst kat: zemin kattan 0,7 m taşar; ahşap çerçeveli
    slab(p, B.x0 - t - 0.7, B.x1 + t + 0.7, B.z0 - t - 0.7, B.z1 + t + 0.7, 3.2, y, 2.2);
    return merge(p); }, []);
  const frame = useMemo(() => { const p: Parts = [], B = HOUSE, t = WALL_T, y = F + H1 + 1.6, x0 = B.x0 - t - 0.7, x1 = B.x1 + t + 0.7, z1 = B.z1 + t + 0.7;
    for (let x = x0; x <= x1 + 0.01; x += 4.4) { const g = bx(0.25, 3.2, 0.12, 1); g.translate(x, y, z1 + 0.06); p.push(g); }
    for (const yy of [F + H1 + 0.1, F + H1 + 3.1]) { const g = bx(x1 - x0, 0.25, 0.14, 2); g.translate((x0 + x1) / 2, yy, z1 + 0.07); p.push(g); }
    // üst kat pencereleri: koyu pervazlı kutular
    for (let x = x0 + 2.2; x < x1; x += 4.4) { const g = bx(1.4, 1.5, 0.14, 1); g.translate(x, y + 0.2, z1 + 0.05); p.push(g); }
    return merge(p); }, []);
  const roof = useMemo(() => { const B = HOUSE, t = WALL_T, w = B.x1 - B.x0 + 2 * t + 3.6, d = B.z1 - B.z0 + 2 * t + 3.6, g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); g.scale(w, 3.4, d); return g; }, []);
  const interior = useMemo(() => { const p: Parts = [], q: Parts = [], dk: Parts = [];
    // vitrinler: ahşap gövde + cam kapak
    for (const c of CASES) { const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, w = c.x1 - c.x0, d = c.z1 - c.z0; p.push(bx(w, 0.9, d, 1.5).translate(cx, F + 0.45, cz)); q.push(new THREE.BoxGeometry(w - 0.1, 1.2, d - 0.1).translate(cx, F + 1.5, cz)); p.push(bx(w, 0.06, d, 1).translate(cx, F + 2.13, cz)); }
    // merdiven: iki yan tahta (eğik), basamaklar ve korkuluk; üst kata (tavandaki açıklığa) çıkar
    const S = STAIRS, n = 9, rise = H1 / n, run = (S.z1 - S.z0) / n, sw = S.x1 - S.x0;
    for (let i = 0; i < n; i++) { const z = S.z1 - (i + 0.5) * run; p.push(bx(sw - 0.3, 0.06, run + 0.05, 1).translate((S.x0 + S.x1) / 2, F + (i + 1) * rise, z)); p.push(bx(sw - 0.3, rise, 0.04, 1).translate((S.x0 + S.x1) / 2, F + (i + 0.5) * rise, z + run / 2)); }
    const ang = Math.atan2(H1, S.z1 - S.z0), L = Math.hypot(H1, S.z1 - S.z0);
    for (const x of [S.x0 + 0.1, S.x1 - 0.1]) { const st = bx(0.12, 0.32, L, 1); st.rotateX(ang); st.translate(x, F + H1 / 2, (S.z0 + S.z1) / 2); p.push(st); }
    { const rl = bx(0.08, 0.08, L, 1); rl.rotateX(ang); rl.translate(S.x0 + 0.05, F + H1 / 2 + 0.95, (S.z0 + S.z1) / 2); p.push(rl); for (let i = 0; i <= 4; i++) { const zz = S.z1 - i * ((S.z1 - S.z0) / 4), yy = F + ((S.z1 - zz) / (S.z1 - S.z0)) * H1; p.push(bx(0.06, 0.95, 0.06, 1).translate(S.x0 + 0.05, yy + 0.48, zz)); } }
    // tavandaki merdiven boşluğu (koyu) — üst kat ziyaretçiye kapalı
    dk.push(new THREE.PlaneGeometry(sw, 1.6).rotateX(Math.PI / 2).translate((S.x0 + S.x1) / 2, F + H1 - 0.03, S.z0 + 0.8));
    // Mikes'in yazı masası: tabla, dört bacak, çekmece; üstünde hokka, tüy kalem, kâğıtlar; sandalye
    const D = DESK, dcx = (D.x0 + D.x1) / 2, dcz = (D.z0 + D.z1) / 2;
    p.push(bx(D.x1 - D.x0, 0.07, D.z1 - D.z0, 1).translate(dcx, F + 0.78, dcz)); p.push(bx(D.x1 - D.x0 - 0.2, 0.18, D.z1 - D.z0 - 0.2, 1).translate(dcx, F + 0.66, dcz));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(bx(0.08, 0.75, 0.08, 1).translate(dcx + sx * ((D.x1 - D.x0) / 2 - 0.1), F + 0.375, dcz + sz * ((D.z1 - D.z0) / 2 - 0.1)));
    { const ch = [dcx, D.z1 + 0.55]; p.push(bx(0.5, 0.05, 0.5, 1).translate(ch[0], F + 0.47, ch[1])); p.push(bx(0.5, 0.6, 0.05, 1).translate(ch[0], F + 0.8, ch[1] + 0.23)); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) p.push(bx(0.05, 0.47, 0.05, 1).translate(ch[0] + sx * 0.2, F + 0.235, ch[1] + sz * 0.2)); }
    dk.push(new THREE.CylinderGeometry(0.06, 0.07, 0.09, 10).translate(dcx + 0.6, F + 0.86, dcz - 0.4));
    // kitaplık: raflı kasa ve cilt sırtları
    const SH = SHELF, scx = (SH.x0 + SH.x1) / 2, scz = (SH.z0 + SH.z1) / 2;
    p.push(bx(SH.x1 - SH.x0, 2.6, 0.06, 1).translate(scx, F + 1.3, SH.z0)); p.push(bx(SH.x1 - SH.x0, 2.6, 0.06, 1).translate(scx, F + 1.3, SH.z1)); p.push(bx(0.06, 2.6, SH.z1 - SH.z0, 1).translate(SH.x0 + 0.03, F + 1.3, scz));
    for (const y of [0.05, 0.7, 1.35, 2.0, 2.6]) p.push(bx(SH.x1 - SH.x0, 0.05, SH.z1 - SH.z0, 1).translate(scx, F + y, scz));
    const rr = rng(12); for (const y of [0.08, 0.73, 1.38, 2.03]) for (let z = SH.z0 + 0.12; z < SH.z1 - 0.12; z += 0.11) { const h = 0.38 + rr() * 0.18; dk.push(bx(0.5, h, 0.09, 1).translate(scx + 0.05, F + y + h / 2, z)); }
    return { wood: merge(p), glass: merge(q), dark: merge(dk) }; }, []);
  // iç yüzdeki ışıklı pencere camları (dış pencerelerle aynı yerlerde)
  const windows = useMemo(() => { const p: Parts = [], B = HOUSE, A = (x: number, z: number, ry: number) => { const g = new THREE.PlaneGeometry(1.1, 1.4); g.rotateY(ry); g.translate(x, F + 1.9, z); p.push(g); };
    for (const x of [-8, -4, 5.5, 8.5]) A(x, B.z1 - 0.02, Math.PI); for (const x of [-8, -2, 4, 8]) A(x, B.z0 + 0.02, 0);
    for (const z of [-4, 3]) { A(B.x1 - 0.02, z, -Math.PI / 2); A(B.x0 + 0.02, z, Math.PI / 2); }
    return merge(p); }, []);
  // dış pencereler: zemin katta demir parmaklıklı, üst katta ahşap kayıtlı (dört yüz)
  const outWin = useMemo(() => { const gl: Parts = [], fr: Parts = [], B = HOUSE, t = WALL_T, U = 0.7;
    const put = (x: number, y: number, z: number, ry: number, w: number, h: number, bars: boolean) => { const g = new THREE.PlaneGeometry(w, h); g.rotateY(ry); g.translate(x, y, z); gl.push(g);
      const nx = Math.sin(ry), nz = Math.cos(ry), tx = Math.cos(ry), tz = -Math.sin(ry);
      for (const [dx, dy, ww, hh] of [[0, h / 2 + 0.06, w + 0.24, 0.12], [0, -h / 2 - 0.06, w + 0.3, 0.14], [-w / 2 - 0.06, 0, 0.12, h + 0.24], [w / 2 + 0.06, 0, 0.12, h + 0.24], [0, 0, 0.06, h]] as const) { const f = bx(ww, hh, 0.08, 1); f.rotateY(ry); f.translate(x + tx * dx + nx * 0.04, y + dy, z + tz * dx + nz * 0.04); fr.push(f); }
      if (bars) for (let k = 1; k < 5; k++) { const bb = new THREE.CylinderGeometry(0.018, 0.018, h, 5); bb.translate(x + tx * (-w / 2 + (k * w) / 5) + nx * 0.07, y, z + tz * (-w / 2 + (k * w) / 5) + nz * 0.07); fr.push(bb); } };
    const g0 = F + 1.9, g1 = F + H1 + 1.7;
    for (const x of [-8, -4, 5.5, 8.5]) { put(x, g0, B.z1 + t + 0.02, 0, 1.1, 1.4, true); }
    for (const x of [-8, -2, 4, 8]) put(x, g0, B.z0 - t - 0.02, Math.PI, 1.1, 1.4, true);
    for (const z of [-4, 3]) { put(B.x1 + t + 0.02, g0, z, Math.PI / 2, 1.1, 1.4, true); put(B.x0 - t - 0.02, g0, z, -Math.PI / 2, 1.1, 1.4, true); }
    for (const x of [-9, -5, -1, 3, 7, 10]) put(x, g1, B.z0 - t - U - 0.02, Math.PI, 1.0, 1.4, false);
    for (const z of [-5.5, -1.5, 2.5, 6.5]) { put(B.x1 + t + U + 0.02, g1, z, Math.PI / 2, 1.0, 1.4, false); put(B.x0 - t - U - 0.02, g1, z, -Math.PI / 2, 1.0, 1.4, false); }
    // çıkmanın altındaki eğik payandalar (konsollar)
    for (let x = B.x0 - t; x <= B.x1 + t + 0.01; x += 2.2) for (const sz of [-1, 1]) { const k = bx(0.14, 0.14, 1.0, 1); k.rotateX(sz * 0.75); k.translate(x, F + H1 - 0.32, sz > 0 ? B.z1 + t + 0.33 : B.z0 - t - 0.33); fr.push(k); }
    for (let z = B.z0 - t; z <= B.z1 + t + 0.01; z += 2.2) for (const sx of [-1, 1]) { const k = bx(1.0, 0.14, 0.14, 1); k.rotateZ(sx * -0.75); k.translate(sx > 0 ? B.x1 + t + 0.33 : B.x0 - t - 0.33, F + H1 - 0.32, z); fr.push(k); }
    // giriş kapısı: ahşap pervaz ve iki kanat (açık)
    const ex = (ENTRY.x0 + ENTRY.x1) / 2; for (const [dx, ww, hh, yy] of [[-(ENTRY.x1 - ENTRY.x0) / 2 - 0.08, 0.16, 2.6, F + 1.3], [(ENTRY.x1 - ENTRY.x0) / 2 + 0.08, 0.16, 2.6, F + 1.3], [0, ENTRY.x1 - ENTRY.x0 + 0.32, 0.16, F + 2.55]] as const) fr.push(bx(ww, hh, 0.12, 1).translate(ex + dx, yy, B.z1 + t + 0.06));
    return { gl: merge(gl), fr: merge(fr) }; }, []);
  return <group>
    <mesh geometry={walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={upper} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={frame} material={m.timber} castShadow />
    <mesh geometry={roof} material={m.roof} position={[0, F + H1 + 3.2, 0]} castShadow receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, F + 0.02, 0]} receiveShadow><planeGeometry args={[HOUSE.x1 - HOUSE.x0, HOUSE.z1 - HOUSE.z0]} /><primitive object={m.floor} attach="material" /></mesh>
    <mesh geometry={interior.wood} material={m.wood} castShadow receiveShadow />
    <mesh geometry={interior.glass} material={m.glass} />
    <mesh geometry={interior.dark} material={m.dark} />
    <mesh geometry={outWin.gl}><meshStandardMaterial color="#3b4448" roughness={0.2} metalness={0.4} /></mesh>
    <mesh geometry={outWin.fr} material={m.timber} castShadow />
    {/* ahşap tavan (zemin katın tavanı) */}
    <mesh rotation-x={Math.PI / 2} position={[0, F + H1 - 0.05, 0]}><planeGeometry args={[HOUSE.x1 - HOUSE.x0, HOUSE.z1 - HOUSE.z0]} /><primitive object={m.floor} attach="material" /></mesh>
    <mesh geometry={windows}><meshStandardMaterial color="#f4f6f6" emissive="#e8eef0" emissiveIntensity={0.7} side={THREE.DoubleSide} /></mesh>
    {/* Rákóczi'nin bronz büstü ve kaidesi (biçim temsilî) */}
    <mesh position={[PEDESTAL.c[0], F + 0.6, PEDESTAL.c[1]]} castShadow receiveShadow><boxGeometry args={[1.1, 1.2, 1.1]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 1.25, PEDESTAL.c[1]]} castShadow receiveShadow><boxGeometry args={[1.25, 0.1, 1.25]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 1.55, PEDESTAL.c[1]]} scale={[1, 0.62, 0.62]} castShadow><sphereGeometry args={[0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={m.bronze} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 1.42, PEDESTAL.c[1]]} castShadow><cylinderGeometry args={[0.42, 0.36, 0.25, 14]} /><primitive object={m.bronze} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 1.86, PEDESTAL.c[1]]} castShadow><cylinderGeometry args={[0.08, 0.1, 0.22, 10]} /><primitive object={m.bronze} attach="material" /></mesh>
    <mesh position={[PEDESTAL.c[0], F + 2.08, PEDESTAL.c[1]]} scale={[0.85, 1.1, 0.95]} castShadow><sphereGeometry args={[0.17, 14, 10]} /><primitive object={m.bronze} attach="material" /></mesh>
    <pointLight position={[0, F + 3.2, 0]} color="#ffe6bf" intensity={tier === 'low' ? 40 : 55} distance={18} decay={2} />
    <pointLight position={[-7, F + 3, 0]} color="#ffe0b0" intensity={30} distance={10} decay={2} />
  </group>;
}

/* ===================== avlu, çevre ===================== */
export function Yard({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [];
    // çit: avlunun üç kenarında alçak taş duvar, güneyde kapı boşluğu
    const x0 = -30, x1 = 30, z1 = 42;
    p.push(bx(x1 - x0, 1.3, 0.5, 3).translate(0, 0.65, z1)); p.push(bx(0.5, 1.3, z1 - 8.8, 3).translate(x0, 0.65, (8.8 + z1) / 2)); p.push(bx(0.5, 1.3, z1 - 8.8, 3).translate(x1, 0.65, (8.8 + z1) / 2));
    return merge(p); }, []);
  const ground = useMemo(() => { const g = new THREE.PlaneGeometry(60, 33); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, 25); return g; }, []);
  return <group>
    <mesh geometry={geo} material={m.stone} castShadow receiveShadow />
    <mesh geometry={ground} receiveShadow><meshStandardMaterial color="#b9b196" roughness={0.95} /></mesh>
    {/* giriş yolu */}
    <mesh rotation-x={-Math.PI / 2} position={[(ENTRY.x0 + ENTRY.x1) / 2, 0.04, 26]} receiveShadow><planeGeometry args={[3, 34]} /><meshStandardMaterial color="#cfc6ae" roughness={0.95} /></mesh>
    {/* çeşme */}
    <mesh position={[FOUNTAIN.c[0], 0.42, FOUNTAIN.c[1]]} rotation-x={-Math.PI / 2}><circleGeometry args={[FOUNTAIN.r, 24]} /><primitive object={m.water} attach="material" /></mesh>
    {/* havuz kenarı: yerden yükselen taş bilezik (önceden havada duran düz halkaydı) */}
    <mesh position={[FOUNTAIN.c[0], 0.3, FOUNTAIN.c[1]]} castShadow receiveShadow><cylinderGeometry args={[FOUNTAIN.r + 0.5, FOUNTAIN.r + 0.55, 0.6, 24, 1, true]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[FOUNTAIN.c[0], 0.3, FOUNTAIN.c[1]]}><cylinderGeometry args={[FOUNTAIN.r, FOUNTAIN.r, 0.6, 24, 1, true]} /><meshStandardMaterial color="#9d947f" roughness={0.95} side={THREE.BackSide} /></mesh>
    <mesh position={[FOUNTAIN.c[0], 0.6, FOUNTAIN.c[1]]} rotation-x={-Math.PI / 2} castShadow receiveShadow><ringGeometry args={[FOUNTAIN.r, FOUNTAIN.r + 0.55, 24]} /><primitive object={m.stone} attach="material" /></mesh>
    <mesh position={[FOUNTAIN.c[0], 1.4, FOUNTAIN.c[1]]} castShadow><cylinderGeometry args={[0.25, 0.4, 2.2, 10]} /><primitive object={m.stone} attach="material" /></mesh>
  </group>;
}
export function Garden({ n }: { n: number }) {
  const geo = useMemo(() => { const parts: Parts = []; const t = new THREE.CylinderGeometry(0.3, 0.45, 3.4, 7); t.translate(0, 1.7, 0); parts.push(t);
    for (let k = 0; k < 5; k++) { const c = new THREE.IcosahedronGeometry(1.9, 1); c.translate(Math.cos(k * 1.3) * 1.4, 4.4 + (k % 2) * 0.8, Math.sin(k * 1.3) * 1.4); parts.push(c); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const o = new THREE.Object3D(); let k = 0; const r = rng(21);
    for (const t of TREES) { o.position.set(t[0], 0, t[1]); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(1.1); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    for (let i = 0; i < n && k < n + TREES.length; i++) { const x = -90 + r() * 180, z = -50 + r() * 140; if (x > -36 && x < 36 && z > -32 && z < 48) continue; o.position.set(x, 0, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.9 + r() * 0.6); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n + TREES.length + 4]} castShadow receiveShadow />;
}
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(33), walls: Parts = [], roofs: Parts = [];
    for (let i = 0; i < 70; i++) { const side = r(), x = side < 0.35 ? -44 - r() * 70 : side < 0.7 ? 44 + r() * 70 : -40 + r() * 80, z = side < 0.7 ? -34 + r() * 90 : -50 - r() * 40, w = 7 + r() * 5, d = 7 + r() * 5, h = 5 + r() * 5;
      const b = bx(w, h, d, 2.4); b.translate(x, h / 2, z); walls.push(b);
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.4, 4); roof.rotateY(Math.PI / 4); roof.translate(x, h + 1.2, z); roofs.push(roof); }
    return { walls: merge(walls), roofs: merge(roofs) }; }, []);
  return <group>
    <mesh geometry={geo.walls} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={geo.roofs} material={m.roof} castShadow />
  </group>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(420, 320, tier === 'high' ? 30 : 16, tier === 'high' ? 30 : 16); g.rotateX(-Math.PI / 2); g.translate(0, 0, 20); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} position={[0, -0.2, 0]} receiveShadow userData={{ noCast: true }}><meshStandardMaterial color="#8da466" map={tex.map} bumpMap={tex.bump} bumpScale={0.15} roughness={1} /></mesh>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -34 + r() * 68, z = -30 + r() * 76; if (x > HOUSE.x0 - 2 && x < HOUSE.x1 + 2 && z > HOUSE.z0 - 2 && z < HOUSE.z1 + 2) continue; if (Math.abs(x - 1.7) < 2.4 && z > 8) continue;
      o.position.set(x, -0.1, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Backdrop() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 6; i++) { const a = Math.PI * (1.0 + (i / 5) * 1.0) + r() * 0.1, dd = 800 + r() * 200; out.push({ p: [Math.cos(a) * dd, -8, Math.sin(a) * dd], g: mountainGeo(320 + r() * 140, 100 + r() * 80, 350 + i, 0, '#7a8c5a') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>
    {list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.4, 330]}><planeGeometry args={[2600, 560]} /><meshStandardMaterial color="#3a7f93" roughness={0.2} metalness={0.1} /></mesh>
  </group>;
}

/* ===================== Mikes'in belgeleri (bulunana dek hafifçe parlayan kâğıt tomarı) ===================== */
export const letterState = { found: [] as string[] };
export function Letters() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const paper = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f1e6c8', emissive: '#ffe2a0', emissiveIntensity: 0.35, roughness: 0.8 }), []);
  const seal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8c2a22', roughness: 0.5 }), []);
  useFrame(({ clock }) => { refs.current.forEach((g, i) => { if (!g) return; g.visible = !letterState.found.includes(LETTERS[i].id); paper.emissiveIntensity = 0.25 + 0.2 * Math.sin(clock.elapsedTime * 2.4); }); });
  return <group userData={{ noCast: true }}>{LETTERS.map((l, i) => <group key={l.id} ref={(g) => { refs.current[i] = g; }} position={l.item} rotation-y={i * 0.7}>
    <mesh material={paper}><boxGeometry args={[0.32, 0.03, 0.24]} /></mesh>
    <mesh position={[0.06, 0.02, 0.04]} rotation-y={0.3} material={paper}><boxGeometry args={[0.3, 0.02, 0.22]} /></mesh>
    <mesh position={[0, 0.035, 0]} material={seal}><cylinderGeometry args={[0.035, 0.035, 0.015, 10]} /></mesh>
  </group>)}</group>;
}
