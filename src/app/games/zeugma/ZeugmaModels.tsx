/**
 * Zeugma Mozaik Müzesi — 3B modeller. Taş cephe ve iç duvarlar, mozaik zeminli büyük salon, cam vitrinler, karanlık salonda ışıklı sergi kaidesi,
 * meydan ve ağaçlar. Bina biçimi, salon düzeni ve mozaik desenleri TEMSİLÎDİR (docs/ZEUGMA.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BUILD, CASES, DARK_DOOR, HOL_DOOR, PUZZLE_START, ROOMS, SPOTLIGHT, SQUARE, TABLE, WALL_T } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.5, 0.6, 0.62).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4) => { const g = bx(x1 - x0, h, z1 - z0, s); g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); p.push(g); };
const H = 5.2;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; plinth: THREE.MeshStandardMaterial; glass: THREE.MeshStandardMaterial; mosaic: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; paving: THREE.MeshStandardMaterial; portrait: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('zeugma-kireç', ['#e2d6bd', '#d6c8a8', '#eadfc8', '#cbbb98'], [14, 10], [30, 40]);
    // mozaik: küçük renkli taşlar (tesserae) ve ortada bir rozet (temsilî)
    const mos = canvasTex(512, 512, (g, r) => { const pal = ['#b5553a', '#d9a441', '#2f5f7d', '#eae1cc', '#3d6b4a', '#7d3f2c', '#c9824f', '#1f3a4d'];
      g.fillStyle = '#e8dcc2'; g.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 8) for (let x = 0; x < 512; x += 8) { g.fillStyle = pal[(r() * pal.length) | 0]; g.fillRect(x + 1, y + 1, 6, 6); }
      g.fillStyle = '#2f5f7d'; g.beginPath(); g.arc(256, 256, 120, 0, 7); g.fill(); g.strokeStyle = '#d9a441'; g.lineWidth = 10; g.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillStyle = i % 2 ? '#b5553a' : '#eae1cc'; g.beginPath(); g.arc(256 + Math.cos(a) * 80, 256 + Math.sin(a) * 80, 16, 0, 7); g.fill(); } }, true, 9);
    mos.repeat.set(2, 2);
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8c8577'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,36,30' : '220,214,200'},${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.35, roughness: 0.92 })),
      plinth: new THREE.MeshStandardMaterial({ color: '#d9ccb0', roughness: 0.9 }),
      glass: new THREE.MeshStandardMaterial({ color: '#cfe6ef', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0 }),
      mosaic: new THREE.MeshStandardMaterial({ map: mos, roughness: 0.55 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1d1a18', roughness: 1 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.9 }),
      paving: new THREE.MeshStandardMaterial({ color: '#c9bca2', roughness: 0.95 }),
      portrait: new THREE.MeshStandardMaterial({ map: mos, roughness: 0.55 }),
    };
  }, []);
}

/* ===================== mozaik dokuları (taşçık ızgarası; desenler temsilî) ===================== */
type Col = (x: number, y: number) => string;
/** wc×hc hücrelik deseni, her hücre küçük bir taşçık (tessera) olacak biçimde çizer: harç derzi, hafif renk ve boyut oynaması */
function tess(wc: number, hc: number, at: Col, seed: number, cell = 8) {
  const c = document.createElement('canvas'); c.width = wc * cell; c.height = hc * cell; const g = c.getContext('2d')!, r = rng(seed);
  g.fillStyle = '#cfc4ae'; g.fillRect(0, 0, c.width, c.height);
  for (let y = 0; y < hc; y++) for (let x = 0; x < wc; x++) { const col = new THREE.Color(at(x, y)); const k = 0.88 + r() * 0.2; col.multiplyScalar(k);
    g.fillStyle = `#${col.getHexString()}`; const j = () => (r() - 0.5) * 1.2; g.fillRect(x * cell + 1 + j(), y * cell + 1 + j(), cell - 2, cell - 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const P = { cream: '#ece2cb', ochre: '#c9923f', red: '#a8442e', blue: '#2f5f7d', dblue: '#1f3a4d', green: '#4d7350', black: '#2a2520', white: '#f4efe2', pink: '#d39a86', brown: '#6e3f2a' };
/** Meander kuşaklı rozet */
const designA: Col = (x, y) => { const W = 72, H = 52, b = Math.min(x, y, W - 1 - x, H - 1 - y);
  if (b < 2) return P.black; if (b < 8) { const u = (x + y) % 8, v = b - 2; return (u < 4) !== (v < 3) ? P.red : P.cream; } if (b < 10) return P.black;
  const cx = W / 2, cy = H / 2, d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx);
  if (d < 4) return P.ochre; if (d < 9) return Math.cos(a * 8) > 0 ? P.red : P.white; if (d < 11) return P.black; if (d < 15) return Math.sin(a * 16 + d) > 0 ? P.blue : P.cream; if (d < 16.5) return P.black;
  return (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? P.cream : P.white; };
/** Baklava ızgaralı, dalga kuşaklı */
const designB: Col = (x, y) => { const W = 72, H = 52, b = Math.min(x, y, W - 1 - x, H - 1 - y);
  if (b < 2) return P.dblue; if (b < 7) { const w = Math.sin((x + y) * 0.55) * 2 + 3.5; return b - 2 < w ? P.blue : P.cream; } if (b < 9) return P.dblue;
  const u = ((x + y) % 10 + 10) % 10, v = ((x - y) % 10 + 10) % 10; if (u === 0 || v === 0) return P.brown; return (Math.floor((x + y) / 10) + Math.floor((x - y + 100) / 10)) % 2 ? P.ochre : P.green; };
/** Yıldız ve iç içe halkalar */
const designC: Col = (x, y) => { const W = 72, H = 52, b = Math.min(x, y, W - 1 - x, H - 1 - y), cx = W / 2, cy = H / 2, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  if (b < 3) return P.black; if (b < 5) return P.ochre; const star = 10 + 5 * Math.cos(a * 8); if (d < star) return d < 4 ? P.white : P.red;
  if (d < star + 2) return P.black; return Math.floor(d / 3) % 2 ? P.cream : P.pink; };
/** Restorasyon panosu: madalyon içinde kuş (temsilî) */
const designD: Col = (x, y) => { const N = 48, cx = N / 2, cy = N / 2, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  if (d > 22) return (x + y) % 6 < 3 ? P.red : P.cream; if (d > 20) return P.black; if (d > 17.5) return Math.cos(a * 12) > 0 ? P.ochre : P.blue; if (d > 16.5) return P.black;
  const tail = dx < 0 && Math.abs(dy - 2) < -dx * 0.9 && d < 15; if (tail) return Math.floor(Math.hypot(dx, dy - 2) / 2.5) % 2 ? P.green : P.blue;
  const body = Math.hypot((dx - 2) / 6, (dy - 1) / 4) < 1; if (body) return P.dblue; const head = Math.hypot(dx - 8, dy + 4) < 2.6; if (head) return x === Math.round(cx + 9) && y === Math.round(cy - 5) ? P.white : P.dblue;
  if (dx > 9.5 && dx < 13 && Math.abs(dy + 4) < 0.8) return P.ochre; if (y > cy + 5 && y < cy + 8 && Math.abs(dx - 2) < 1 && x % 3 === 0) return P.brown; if (y > cy + 9 && y < cy + 11) return P.green; return P.cream; };
/** Temsilî mozaik portre (gerçek eserin kopyası değildir): koyu zemin, dağınık koyu saç, iri gözler */
const portrait: Col = (x, y) => { const W = 48, H = 60, cx = W / 2, cy = H * 0.44, dx = x - cx, dy = y - cy;
  const face = Math.hypot(dx / 12, (dy - 1) / 15.5) < 1; const hair = Math.hypot(dx / 19, (dy + 3) / 20) < 1 && !face && y < H * 0.8;
  if (face) { const lx = Math.abs(dx);
    if (lx > 2 && lx < 9 && Math.abs(dy + 3) < 2.6) { const ex = lx - 5.5; if (Math.hypot(ex, dy + 3) < 1.6) return '#1a1410'; return Math.hypot(ex / 3.5, (dy + 3) / 2.2) < 1 ? '#f3ede2' : '#c98d66'; }
    if (lx > 2 && lx < 9.5 && Math.abs(dy + 7.2) < 0.8) return '#3b2418'; if (lx < 1.2 && dy > -2 && dy < 5) return '#a86e4e'; if (lx < 1.8 && Math.abs(dy - 5) < 0.8) return '#8a5a40';
    if (lx < 4 && Math.abs(dy - 9) < 1.1) return dy < 9 ? '#b0453a' : '#8e3328';
    return dx > 6 ? '#b97f5c' : dx < -7 ? '#c48a66' : '#d9a37c'; }
  if (hair) return (Math.sin(x * 1.1 + y * 0.4) + Math.cos(y * 0.9 - x * 0.3)) > 0.2 ? '#2a170f' : '#4a2a1a';
  if (y > H * 0.76 && Math.abs(dx) < 5 + (y - H * 0.76) * 1.6) return y > H * 0.84 ? '#b2702e' : '#c98d66';
  return (x + y) % 3 === 0 ? '#1d3836' : '#163130'; };

let puzzleURL = '';
/** Bulmaca panelinde kullanılan aynı mozaiğin resmi (önbellekli) */
export function puzzleImage(): string { if (!puzzleURL) puzzleURL = (tess(48, 48, designD, 6, 10).image as HTMLCanvasElement).toDataURL(); return puzzleURL; }

/* ===================== müze binası ===================== */
/** Restorasyon bulmacasının durumu (oyun yöneticisi yazar) */
export const puzzleState = { rot: PUZZLE_START.slice() };
export function useMosaicTextures() { return useMemo(() => ({ a: tess(72, 52, designA, 3), b: tess(72, 52, designB, 4), c: tess(72, 52, designC, 5), d: tess(48, 48, designD, 6, 10), face: tess(48, 60, portrait, 7, 10) }), []); }
export function Museum({ m, tier }: { m: Mats; tier: Tier }) {
  const tx = useMosaicTextures();
  const mats = useMemo(() => { const plaster = canvasTex(256, 256, (g, r) => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '160,150,130' : '255,255,250'},${r() * 0.05})`; g.fillRect(r() * 256, r() * 256, 6, 6); } });
    const floor = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 128) for (let x = 0; x < 256; x += 128) { const v = 0.92 + r() * 0.08; g.fillStyle = `rgb(${(214 * v) | 0},${(204 * v) | 0},${(186 * v) | 0})`; g.fillRect(x, y, 128, 128); g.strokeStyle = 'rgba(90,80,64,0.35)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 126, 126); } for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(120,110,90,${r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 4, 1); } });
    floor.repeat.set(20, 14);
    const clad = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 128) { const v = 0.9 + r() * 0.12, o = (y / 64) % 2 ? 64 : 0; g.fillStyle = `rgb(${(222 * v) | 0},${(206 * v) | 0},${(172 * v) | 0})`; g.fillRect(x + o - 128, y, 126, 62); g.fillRect(x + o, y, 126, 62); } for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(150,128,90,${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1); } });
    clad.repeat.set(0.45, 0.45);
    return { plaster: new THREE.MeshStandardMaterial({ map: plaster, roughness: 0.92 }), floor: new THREE.MeshStandardMaterial({ map: floor, roughness: 0.35, metalness: 0.05 }), clad: new THREE.MeshStandardMaterial({ map: clad, roughness: 0.85 }),
      darkWall: new THREE.MeshStandardMaterial({ color: '#1e1c1b', roughness: 1 }), rail: new THREE.MeshStandardMaterial({ color: '#4a4540', roughness: 0.4, metalness: 0.6 }), wood: new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.7 }),
      light: new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff4dc', emissiveIntensity: 0.9 }), glassDoor: new THREE.MeshStandardMaterial({ color: '#3d4b52', roughness: 0.1, metalness: 0.6 }) }; }, []);
  const walls = useMemo(() => { const p: Parts = [], B = BUILD, t = WALL_T, y = 0;
    slab(p, B.x0, B.x1, B.z0, B.z0 + t, H, y); slab(p, B.x0, B.x0 + t, B.z0, B.z1, H, y); slab(p, B.x1 - t, B.x1, B.z0, B.z1, H, y);
    slab(p, B.x0, HOL_DOOR.x0, B.z1 - t, B.z1, H, y); slab(p, HOL_DOOR.x1, B.x1, B.z1 - t, B.z1, H, y);
    slab(p, HOL_DOOR.x0, HOL_DOOR.x1, B.z1 - t, B.z1, H - 3.2, y + 3.2);
    slab(p, B.x0, HOL_DOOR.x0, ROOMS.hol.z0 - t, ROOMS.hol.z0, H, y); slab(p, HOL_DOOR.x1, B.x1, ROOMS.hol.z0 - t, ROOMS.hol.z0, H, y); slab(p, HOL_DOOR.x0, HOL_DOOR.x1, ROOMS.hol.z0 - t, ROOMS.hol.z0, H - 3.4, y + 3.4);
    slab(p, B.x0, DARK_DOOR.x0 - 0.2, ROOMS.salon.z0 - 0.3, ROOMS.salon.z0, H, y); slab(p, DARK_DOOR.x1 + 0.2, B.x1, ROOMS.salon.z0 - 0.3, ROOMS.salon.z0, H, y); slab(p, DARK_DOOR.x0 - 0.2, DARK_DOOR.x1 + 0.2, ROOMS.salon.z0 - 0.3, ROOMS.salon.z0, H - 3.2, y + 3.2);
    slab(p, B.x0, ROOMS.karanlik.x0 - 0.2, B.z0, ROOMS.salon.z0 - 0.3, H, y);
    return merge(p); }, []);
  // dış kaplama: taş paneller, giriş saçağı, cam kapı, ad levhası; çatı parapeti ve üst ışık bandı
  const shell = useMemo(() => { const c: Parts = [], dk: Parts = [], B = BUILD, e = 0.15;
    slab(c, B.x0 - e, B.x1 + e, B.z0 - e, B.z0, H + 0.8, 0); slab(c, B.x0 - e, B.x0, B.z0, B.z1 + e, H + 0.8, 0); slab(c, B.x1, B.x1 + e, B.z0, B.z1 + e, H + 0.8, 0);
    slab(c, B.x0 - e, HOL_DOOR.x0 - 1.2, B.z1, B.z1 + e, H + 0.8, 0); slab(c, HOL_DOOR.x1 + 1.2, B.x1 + e, B.z1, B.z1 + e, H + 0.8, 0); slab(c, HOL_DOOR.x0 - 1.2, HOL_DOOR.x1 + 1.2, B.z1, B.z1 + e, H + 0.8 - 3.6, 3.6);
    slab(c, HOL_DOOR.x0 - 3.5, HOL_DOOR.x1 + 3.5, B.z1, B.z1 + 4, 0.35, 3.7);   // saçak
    for (const x of [HOL_DOOR.x0 - 3.2, HOL_DOOR.x1 + 3.2]) slab(c, x - 0.15, x + 0.15, B.z1 + 3.6, B.z1 + 3.9, 3.7, 0);
    for (let x = B.x0 + 2; x < B.x1 - 1; x += 3) { if (Math.abs(x) < 5) continue; dk.push(bx(1.6, 0.9, 0.06, 1).translate(x, H - 0.5, B.z1 + e + 0.03)); dk.push(bx(1.6, 0.9, 0.06, 1).translate(x, H - 0.5, B.z0 - e - 0.03)); }
    for (let z = B.z0 + 2; z < B.z1 - 1; z += 3) { dk.push(bx(0.06, 0.9, 1.6, 1).translate(B.x1 + e + 0.03, H - 0.5, z)); dk.push(bx(0.06, 0.9, 1.6, 1).translate(B.x0 - e - 0.03, H - 0.5, z)); }
    for (const sx of [-1, 1]) dk.push(bx(1.15, 3.1, 0.05, 1).translate(sx * 1.3, 1.55, B.z1 + 0.02));
    return { c: merge(c), dk: merge(dk) }; }, []);
  const nameTex = useMemo(() => canvasTex(1024, 128, (g) => { g.fillStyle = '#3a342c'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#efe6d2'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZEUGMA MOZAİK MÜZESİ', 512, 66); }), []);
  const roof = useMemo(() => { const g = bx(BUILD.x1 - BUILD.x0 + 0.4, 0.5, BUILD.z1 - BUILD.z0 + 0.4, 2); g.translate(0, H + 0.25, 0); return g; }, []);
  const floors = useMemo(() => { const g = new THREE.PlaneGeometry(BUILD.x1 - BUILD.x0 - 1.4, ROOMS.hol.z1 - ROOMS.salon.z0 + 0.6); g.rotateX(-Math.PI / 2); g.translate(0, 0.02, (ROOMS.salon.z0 + ROOMS.hol.z1) / 2); return g; }, []);
  // tavan ışık şeritleri
  const lights = useMemo(() => { const p: Parts = []; for (let x = -16; x <= 16; x += 8) for (const z of [-3.5, 0.5, 4, 9.6]) p.push(new THREE.PlaneGeometry(4, 0.35).rotateX(Math.PI / 2).translate(x, H - 0.02, z)); return merge(p); }, []);
  // zemin mozaikleri: taş bordür + korkuluk direkleri ve tutamak
  const pits = useMemo(() => { const st: Parts = [], rl: Parts = [];
    for (const c of CASES) { const e = 0.35, x0 = c.x0 - e, x1 = c.x1 + e, z0 = c.z0 - e, z1 = c.z1 + e;
      slab(st, x0, x1, z0, z0 + 0.3, 0.18, 0, 1); slab(st, x0, x1, z1 - 0.3, z1, 0.18, 0, 1); slab(st, x0, x0 + 0.3, z0, z1, 0.18, 0, 1); slab(st, x1 - 0.3, x1, z0, z1, 0.18, 0, 1);
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1], [(x0 + x1) / 2, z0], [(x0 + x1) / 2, z1]]) rl.push(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8).translate(px, 0.45, pz));
      rl.push(bx(x1 - x0, 0.04, 0.04, 1).translate((x0 + x1) / 2, 0.9, z0), bx(x1 - x0, 0.04, 0.04, 1).translate((x0 + x1) / 2, 0.9, z1), bx(0.04, 0.04, z1 - z0, 1).translate(x0, 0.9, (z0 + z1) / 2), bx(0.04, 0.04, z1 - z0, 1).translate(x1, 0.9, (z0 + z1) / 2)); }
    return { st: merge(st), rl: merge(rl) }; }, []);
  const designs = [tx.a, tx.b, tx.c];
  // karanlık salon: koyu iç kaplama
  const dark = useMemo(() => { const p: Parts = [], R = ROOMS.karanlik; slab(p, R.x0 - 0.05, R.x1, R.z0 - 0.05, R.z0, H, 0, 1); slab(p, R.x1 - 0.02, R.x1, R.z0, R.z1, H, 0, 1); slab(p, R.x0 - 0.05, R.x0, R.z0, R.z1, H, 0, 1);
    slab(p, R.x0, DARK_DOOR.x0 - 0.2, R.z1 - 0.32, R.z1 - 0.3, H, 0, 1); slab(p, DARK_DOOR.x1 + 0.2, R.x1, R.z1 - 0.32, R.z1 - 0.3, H, 0, 1);
    const f = new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0); f.rotateX(-Math.PI / 2); f.translate((R.x0 + R.x1) / 2, 0.03, (R.z0 + R.z1) / 2); p.push(f);
    const c = new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0); c.rotateX(Math.PI / 2); c.translate((R.x0 + R.x1) / 2, H - 0.03, (R.z0 + R.z1) / 2); p.push(c); return merge(p); }, []);
  const spotRef = useRef<THREE.SpotLight>(null), tgt = useMemo(() => { const o = new THREE.Object3D(); o.position.set(SPOTLIGHT.x, 1.9, SPOTLIGHT.z - 0.4); return o; }, []);
  useEffect(() => { if (spotRef.current) spotRef.current.target = tgt; }, [tgt]);
  return <group>
    <mesh geometry={walls} material={mats.plaster} castShadow receiveShadow />
    <mesh geometry={shell.c} material={mats.clad} castShadow receiveShadow />
    <mesh geometry={shell.dk} material={mats.glassDoor} />
    <mesh position={[0, 4.6, BUILD.z1 + 0.18]}><planeGeometry args={[7, 0.88]} /><meshStandardMaterial map={nameTex} roughness={0.6} /></mesh>
    <mesh geometry={roof} material={m.roof} castShadow receiveShadow />
    <mesh rotation-x={Math.PI / 2} position={[0, H - 0.01, 0]}><planeGeometry args={[BUILD.x1 - BUILD.x0, BUILD.z1 - BUILD.z0]} /><primitive object={mats.plaster} attach="material" /></mesh>
    <mesh geometry={lights} material={mats.light} />
    <mesh geometry={floors} material={mats.floor} receiveShadow />
    <mesh geometry={pits.st} material={m.plinth} castShadow receiveShadow />
    <mesh geometry={pits.rl} material={mats.rail} />
    {CASES.map((c, i) => <mesh key={i} rotation-x={-Math.PI / 2} position={[(c.x0 + c.x1) / 2, 0.06, (c.z0 + c.z1) / 2]} receiveShadow><planeGeometry args={[c.x1 - c.x0 + 0.1, c.z1 - c.z0 + 0.1]} /><meshStandardMaterial map={designs[i % 3]} roughness={0.55} /></mesh>)}
    {/* duvar mozaikleri */}
    <mesh position={[-8, 2.4, ROOMS.salon.z0 + 0.02]}><planeGeometry args={[5, 3.6]} /><meshStandardMaterial map={tx.c} roughness={0.55} /></mesh>
    <mesh position={[ROOMS.salon.x1 - 0.02, 2.4, 2]} rotation-y={-Math.PI / 2}><planeGeometry args={[5, 3.6]} /><meshStandardMaterial map={tx.b} roughness={0.55} /></mesh>
    {/* restorasyon masası ve döndürülebilir 3×3 pano */}
    <RestoreTable tex={tx.d} wood={mats.wood} />
    {/* karanlık salon ve portre */}
    <mesh geometry={dark} material={mats.darkWall} receiveShadow />
    <mesh position={[SPOTLIGHT.x, 0.55, SPOTLIGHT.z]} castShadow receiveShadow><boxGeometry args={[1.6, 1.1, 1.2]} /><primitive object={mats.darkWall} attach="material" /></mesh>
    <group position={[SPOTLIGHT.x, 1.95, SPOTLIGHT.z - 0.3]} rotation-x={-0.12}>
      <mesh position={[0, 0, -0.06]}><boxGeometry args={[1.5, 1.85, 0.1]} /><primitive object={mats.rail} attach="material" /></mesh>
      <mesh><planeGeometry args={[1.3, 1.62]} /><meshStandardMaterial map={tx.face} roughness={0.5} /></mesh>
    </group>
    <spotLight ref={spotRef} position={[SPOTLIGHT.x, H - 0.3, SPOTLIGHT.z + 2.4]} angle={0.32} penumbra={0.5} intensity={tier === 'low' ? 26 : 34} distance={9} decay={1.6} color="#fff0d6" />
    <primitive object={tgt} />
    <pointLight position={[0, H - 0.6, 0]} color="#fff1d6" intensity={tier === 'low' ? 30 : 50} distance={15} decay={2} />
    <pointLight position={[0, H - 0.6, 9.6]} color="#fff1d6" intensity={25} distance={12} decay={2} />
  </group>;
}
function RestoreTable({ tex, wood }: { tex: THREE.Texture; wood: THREE.Material }) {
  const T = TABLE, cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2, S = Math.min(T.x1 - T.x0, T.z1 - T.z0) - 0.4, s = S / 3;
  const tiles = useMemo(() => Array.from({ length: 9 }, (_, i) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1 / 3); t.offset.set((i % 3) / 3, 1 - (Math.floor(i / 3) + 1) / 3); return t; }), [tex]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, dt) => { refs.current.forEach((mm, i) => { if (!mm) return; const target = -puzzleState.rot[i] * Math.PI / 2; let cur = mm.rotation.z; while (target - cur > Math.PI) cur += Math.PI * 2; mm.rotation.z = cur + (target - cur) * Math.min(1, dt * 10); }); });
  return <group>
    <mesh position={[cx, 0.78, cz]} castShadow receiveShadow material={wood}><boxGeometry args={[T.x1 - T.x0, 0.08, T.z1 - T.z0]} /></mesh>
    {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => <mesh key={i} position={[cx + sx * ((T.x1 - T.x0) / 2 - 0.1), 0.38, cz + sz * ((T.z1 - T.z0) / 2 - 0.1)]} material={wood}><boxGeometry args={[0.08, 0.76, 0.08]} /></mesh>)}
    <group position={[cx, 0.83, cz]} rotation-x={-Math.PI / 2}>
      {tiles.map((t, i) => <mesh key={i} ref={(mm) => { refs.current[i] = mm; }} position={[((i % 3) - 1) * s, (1 - Math.floor(i / 3)) * s, 0]}><planeGeometry args={[s * 0.97, s * 0.97]} /><meshStandardMaterial map={t} roughness={0.5} /></mesh>)}
    </group>
  </group>;
}

/* ===================== meydan ve çevre ===================== */
export function Plaza({ m }: { m: Mats }) {
  return <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, (SQUARE.z0 + SQUARE.z1) / 2]} receiveShadow>
    <planeGeometry args={[SQUARE.x1 - SQUARE.x0, SQUARE.z1 - SQUARE.z0]} /><primitive object={m.paving} attach="material" />
  </mesh>;
}
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 160 : 100, g = new THREE.PlaneGeometry(700, 700, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#7a9a4c'), dry = new THREE.Color('#a7a06a');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, 0); c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.03 + z * 0.02)); col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Trees({ n }: { n: number }) {
  const geo = useMemo(() => { const r = rng(3), parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.25, 0.35, 3, 6); trunk.translate(0, 1.5, 0); parts.push(trunk);
    for (let i = 0; i < 6; i++) { const a = r() * 6.28, d = i ? 1.4 + r() : 0; const cr = new THREE.IcosahedronGeometry(1.9 + r() * 0.4, 1); cr.translate(Math.cos(a) * d, 4.2 + r() * 1.2, Math.sin(a) * d); parts.push(cr); }
    const g = merge(parts); g.computeVertexNormals(); return g; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.95 }), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(); let k = 0;
    for (let i = 0; i < n * 8 && k < n; i++) { const a = r() * 6.28, d = 30 + r() * 110, x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
      if (Math.abs(x) < 26 && z > -20 && z < 22) continue; if (Math.abs(x) < SQUARE.x1 + 3 && z > SQUARE.z0 - 3 && z < SQUARE.z1 + 3) continue;
      o.position.set(x, -0.05, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); ref.current?.setMatrixAt(k++, o.matrix); }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <instancedMesh ref={ref} args={[geo, mat, n]} castShadow receiveShadow />;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -110 + r() * 220, z = -90 + r() * 170;
      if (Math.abs(x) < 26 && z > -20 && z < 22) continue; if (Math.abs(x) < SQUARE.x1 && z > SQUARE.z0 && z < SQUARE.z1) continue;
      o.position.set(x, -0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.24 + r() * 0.05, 0.45, 0.4 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r() * 0.2, dd = 800 + r() * 400; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(420 + r() * 220, 160 + r() * 140, 70 + i, 2, '#8a8160') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
