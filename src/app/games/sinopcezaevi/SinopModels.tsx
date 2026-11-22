/**
 * Sinop Tarihi Cezaevi — 3B modeller (öteki yeni oyunlarla aynı ortak manzara kiti).
 * Mazgallı kalın iç kale surları ve yuvarlak kuleler, kemerli sur kapısı; avluda taş döşeme, gardiyan binası, bilgi panosu; iki katlı taş koğuş
 * binası (içeride koridor, dört koğuş ve ranzalar, on iki hücre ve açık demir parmaklıklı kapılar, kafesli pencereler); dışarıda rıhtım,
 * deniz ve kayıklar, beyaz badanalı kent evleri. Ölçüler, oda sayıları ve eşyalar TEMSİLÎDİR (docs/SINOP-CEZAEVI.md).
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { bx, groundTex, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { CASTLE, CELLS, CELL_N, CELL_W, END_DOOR_Z, FLOOR, GATE, GUARD, HOUSES, OUT, ROOMS, SHORE, STOREY, TOWERS, WALL, WARD, WARDS, WARD_T, inCastleBlock, terrainBase } from './site';

type Tier = 'low' | 'medium' | 'high';
export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(-0.45, 0.62, 0.64).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
/** Sivri kemer çerçevesi (taban 0'da) */
function archShape(w: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r; s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, sp); s.quadraticCurveTo(r, sp + r * 0.9, 0, sp + r * 1.25); s.quadraticCurveTo(-r, sp + r * 0.9, -r, sp); s.closePath(); return s; }
const slab = (parts: Parts, x0: number, x1: number, z0: number, z1: number, h: number, y0 = 0, s = 2.4, vOff = 0) => { const g = bx(x1 - x0, h, z1 - z0, s); if (vOff) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) + vOff); } g.translate((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); parts.push(g); };

/* ===================== malzemeler ===================== */
export interface Mats { castle: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; whitewash: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; iron: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; cloth: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const cs = stoneTex('sinop-sur', ['#8f8676', '#7f7768', '#9c9382', '#756d60', '#a39a88'], [14, 10], [20, 30]);
    const ws = stoneTex('sinop-kogus', ['#b3a892', '#a69b85', '#bdb29c', '#9d927d'], [22, 16], [34, 46]);
    const wood = canvasTex(128, 512, (g, r) => { g.fillStyle = '#6a4a30'; g.fillRect(0, 0, 128, 512); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '40,26,14' : '140,100,66'},${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 2; const x = r() * 128; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 170, x - 6, 340, x + 3, 512); g.stroke(); } });
    // eski sıva: alt kısmı koyu boyalı (yağlı boya bandı), üstte lekeler
    const pl = canvasTex(256, 256, (g, r) => { g.fillStyle = '#e4dccb'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#6f7f74'; g.fillRect(0, 170, 256, 86); g.fillStyle = '#4e5a52'; g.fillRect(0, 166, 256, 5);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.6 ? '120,100,70' : '255,255,245'},${r() * 0.12})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 4 + r() * 26, 3 + r() * 16, r() * 3, 0, 7); g.fill(); } });
    const rf = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9a4e36'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 14) { const v = 0.75 + r() * 0.4; g.fillStyle = `rgb(${(168 * v) | 0},${(86 * v) | 0},${(60 * v) | 0})`; g.fillRect(x + ((y / 16) % 2) * 7, y, 12, 14); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + ((y / 16) % 2) * 7, y + 12, 12, 3); } });
    return {
      castle: weather(new THREE.MeshStandardMaterial({ map: cs.map, bumpMap: cs.bump, bumpScale: 0.6, roughness: 0.95 })),
      stone: weather(new THREE.MeshStandardMaterial({ map: ws.map, bumpMap: ws.bump, bumpScale: 0.4, roughness: 0.92 })),
      plaster: new THREE.MeshStandardMaterial({ map: pl, roughness: 0.95 }),
      whitewash: new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.95 }),
      roof: new THREE.MeshStandardMaterial({ map: rf, roughness: 0.85 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2e3134', roughness: 0.55, metalness: 0.6 }),
      wood: new THREE.MeshStandardMaterial({ map: wood, roughness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: '#1e1c1a', roughness: 1 }),
      cloth: new THREE.MeshStandardMaterial({ color: '#7d806e', roughness: 1 }),
    };
  }, []);
}

/* ===================== iç kale surları ===================== */
export function Castle({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], C = CASTLE, t = WALL.t, h = WALL.h, gw = GATE.w / 2;
    slab(p, C.x0 - t, C.x1 + t, C.z0 - t, C.z0, h, 0, 3);
    slab(p, C.x0 - t, C.x0, C.z0, C.z1, h, 0, 3); slab(p, C.x1, C.x1 + t, C.z0, C.z1, h, 0, 3);
    slab(p, C.x0 - t, -gw, C.z1, C.z1 + t, h, 0, 3); slab(p, gw, C.x1 + t, C.z1, C.z1 + t, h, 0, 3); slab(p, -gw, gw, C.z1, C.z1 + t, h - GATE.h, GATE.h, 3);
    // mazgallar (dış kenarda)
    const merl = (x: number, z: number, rot: boolean) => { const g = bx(rot ? 0.6 : 0.9, 1.1, rot ? 0.9 : 0.6, 1.5); g.translate(x, h + 0.55, z); p.push(g); };
    for (let x = C.x0 - t + 0.5; x < C.x1 + t; x += 1.7) { merl(x, C.z0 - t + 0.3, false); merl(x, C.z1 + t - 0.3, false); }
    for (let z = C.z0; z < C.z1; z += 1.7) { merl(C.x0 - t + 0.3, z, true); merl(C.x1 + t - 0.3, z, true); }
    // kuleler
    for (const tw of TOWERS) { const H = h + 2.2, g = new THREE.CylinderGeometry(tw.r, tw.r * 1.08, H, 22, 1); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (tw.r * 6.28) / 3, uv.getY(i) * H / 3); g.translate(tw.c[0], H / 2, tw.c[1]); p.push(g);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2, mg = bx(0.9, 1.1, 0.6, 1.5); mg.rotateY(-a + Math.PI / 2); mg.translate(tw.c[0] + Math.cos(a) * (tw.r - 0.3), H + 0.55, tw.c[1] + Math.sin(a) * (tw.r - 0.3)); p.push(mg); } }
    return merge(p); }, []);
  // kapı: dışta sivri kemerli çerçeve, içinde iki kanat (açık)
  const archTop = useMemo(() => { const sh = archShape(GATE.w, GATE.h + 0.7), g = new THREE.ShapeGeometry(sh, 8), pos = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < pos.count; i++) pos.setY(i, Math.max(GATE.h, pos.getY(i))); return g; }, []);
  const arch = useMemo(() => { const o = archShape(GATE.w + 1.4, GATE.h + 1.5), hole = archShape(GATE.w, GATE.h + 0.7); o.holes.push(hole); return new THREE.ExtrudeGeometry(o, { depth: 0.35, bevelEnabled: false, curveSegments: 8 }); }, []);
  return <group>
    <mesh geometry={geo} material={m.castle} castShadow receiveShadow />
    <mesh geometry={arch} material={m.stone} position={[0, 0, CASTLE.z1 + WALL.t - 0.05]} castShadow />
    {/* kapı açıklığının sivri kemerli üst kısmı: duvara gömülü koyu kemer */}
    <mesh geometry={archTop} material={m.dark} position={[0, 0, CASTLE.z1 + WALL.t + 0.01]} />
    {[-1, 1].map((s) => <mesh key={s} material={m.wood} position={[s * (GATE.w / 2 - 0.1), GATE.h / 2 - 0.3, CASTLE.z1 - 0.7]} rotation-y={s * -1.3}><boxGeometry args={[1.6, GATE.h - 0.6, 0.14]} /></mesh>)}
  </group>;
}

/* ===================== koğuş binası ===================== */
export function WardBlock({ m, tier }: { m: Mats; tier: Tier }) {
  const R = ROOMS, T = WARD_T, H2 = STOREY * 2 + 0.6, y = FLOOR;
  const outer = useMemo(() => { const p: Parts = [], W = WARD;
    slab(p, W.x0, W.x1, W.z0, W.z0 + T, H2, y); slab(p, W.x0, W.x1, W.z1 - T, W.z1, H2, y);
    for (const [x0, x1] of [[W.x0, W.x0 + T], [W.x1 - T, W.x1]]) { const dz0 = END_DOOR_Z - 0.75, dz1 = END_DOOR_Z + 0.75;
      slab(p, x0, x1, W.z0 + T, dz0, H2, y); slab(p, x0, x1, dz1, W.z1 - T, H2, y); slab(p, x0, x1, dz0, dz1, H2 - 2.4, y + 2.4); }
    // kat silmesi ve saçak
    slab(p, W.x0 - 0.15, W.x1 + 0.15, W.z0 - 0.15, W.z0 + 0.1, 0.25, y + STOREY + 0.2, 1); slab(p, W.x0 - 0.15, W.x1 + 0.15, W.z1 - 0.1, W.z1 + 0.15, 0.25, y + STOREY + 0.2, 1);
    return merge(p); }, [H2, T, y]);
  const inner = useMemo(() => { const p: Parts = [], W = WARD, xa = W.x0 + T, xb = W.x1 - T, h = STOREY;
    // koridorun kuzey duvarı (koğuş kapıları) ve güney duvarı (hücre kapıları)
    const withGaps = (z0: number, z1: number, doors: number[], half: number, dh: number) => { let x = xa; for (const d of [...doors].sort((a, b) => a - b)) { slab(p, x, d - half, z0, z1, h, y, h); slab(p, d - half, d + half, z0, z1, h - dh, y + dh, h, dh / h); x = d + half; } slab(p, x, xb, z0, z1, h, y, h); };
    withGaps(R.wards.z1, R.corridor.z0, WARDS.map((w) => w.door), 0.65, 2.3);
    withGaps(R.corridor.z1, R.cells.z0, CELLS.map((c) => c.door), 0.5, 2.1);
    for (const x of [-10, 0, 10]) slab(p, x - 0.2, x + 0.2, W.z0 + T, R.wards.z1, h, y, h);
    for (let i = 1; i < CELL_N; i++) { const x = W.x0 + T + i * CELL_W; slab(p, x - 0.1, x + 0.1, R.cells.z0, W.z1 - T, h, y, h); }
    // dış duvarların iç yüzü sıvalı (koğuşlar kuzeyde, hücreler güneyde)
    const lining = (z: number, ry: number) => { const g = new THREE.PlaneGeometry(xb - xa, h); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (xb - xa) / h); g.rotateY(ry); g.translate(0, y + h / 2, z); p.push(g.toNonIndexed()); };
    lining(W.z0 + T + 0.01, 0); lining(W.z1 - T - 0.01, Math.PI);
    return merge(p); }, [T, y]);
  // tavan ve üst kat döşemesi; çatı
  const ceiling = useMemo(() => { const g = bx(WARD.x1 - WARD.x0 - 2 * T, 0.3, WARD.z1 - WARD.z0 - 2 * T, 3); g.translate(0, y + STOREY + 0.15, (WARD.z0 + WARD.z1) / 2); return g; }, [T, y]);
  const roof = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * 3); return g; }, []);
  // kafesli pencereler: dış yüzde koyu boşluk + demir çubuk; iç yüzde aydınlık
  const win = useMemo(() => { const dark: Parts = [], bars: Parts = [], glow: Parts = [];
    const add = (x: number, yy: number, z: number, dir: 1 | -1, w = 0.9, h = 1.1, inside = true) => {
      const d = new THREE.PlaneGeometry(w, h); if (dir < 0) d.rotateY(Math.PI); d.translate(x, yy, z + dir * 0.02); dark.push(d);
      for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.05, h, 0.05); b.translate(x - w / 2 + (k + 0.5) * (w / 4), yy, z + dir * 0.06); bars.push(b); }
      const b2 = new THREE.BoxGeometry(w, 0.05, 0.05); b2.translate(x, yy, z + dir * 0.06); bars.push(b2);
      if (inside) { const gl = new THREE.PlaneGeometry(w, h); if (dir > 0) gl.rotateY(Math.PI); gl.translate(x, yy, z - dir * (WARD_T + 0.03)); glow.push(gl);
        for (let k = 0; k < 4; k++) { const b = new THREE.BoxGeometry(0.04, h, 0.04); b.translate(x - w / 2 + (k + 0.5) * (w / 4), yy, z - dir * (WARD_T + 0.07)); bars.push(b); } } };
    for (const c of CELLS) { add(c.door, y + 2.5, WARD.z1, 1, 0.6, 0.6); add(c.door, y + STOREY + 1.9, WARD.z1, 1, 0.8, 1.2, false); }
    for (const w of WARDS) for (const dx of [-2.6, 2.6]) { add(w.door + dx, y + 2.1, WARD.z0, -1, 1, 1.2); add(w.door + dx, y + STOREY + 1.9, WARD.z0, -1, 1, 1.2, false); }
    return { dark: merge(dark), bars: merge(bars), glow: merge(glow) }; }, [y]);
  // eşyalar: koğuşlarda demir ranzalar, hücrelerde tek yatak; parmaklıklı hücre kapıları (açık), ahşap koğuş kapıları (açık)
  const furn = useMemo(() => { const iron: Parts = [], cloth: Parts = [];
    const bed = (x: number, z: number, along: 'x' | 'z', bunk: boolean) => { const L = 1.9, Wd = 0.8, lx = along === 'x' ? L : Wd, lz = along === 'x' ? Wd : L;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const g = new THREE.BoxGeometry(0.05, bunk ? 1.7 : 0.5, 0.05); g.translate(x + sx * lx / 2, y + (bunk ? 0.85 : 0.25), z + sz * lz / 2); iron.push(g); }
      for (const hh of bunk ? [0.45, 1.4] : [0.42]) { const f = new THREE.BoxGeometry(lx, 0.05, lz); f.translate(x, y + hh, z); iron.push(f); const mt = bx(lx - 0.06, 0.14, lz - 0.06, 1); mt.translate(x, y + hh + 0.1, z); cloth.push(mt); } };
    for (const w of WARDS) { for (const dx of [-3.3, -1.1, 1.1, 3.3]) bed(w.door + dx, R.wards.z0 + 1.15, 'z', true); bed(w.x0 + 0.7, R.wards.z0 + 3.5, 'x', false); }
    for (const c of CELLS) bed((c.x0 + c.x1) / 2 + 0.55, (R.cells.z0 + R.cells.z1) / 2 + 0.2, 'z', false);
    // hücre kapıları: koridora açılmış parmaklıklı demir kanat
    for (const c of CELLS) { const hx = c.door - 0.45, z = R.corridor.z1 - 0.05, a = -1.25, ca = Math.cos(a), sa = Math.sin(a);
      for (let k = 0; k <= 6; k++) { const u = (k / 6) * 0.9, g = new THREE.BoxGeometry(0.04, 2.05, 0.04); g.translate(hx + u * ca, y + 1.05, z - u * sa); iron.push(g); }
      for (const hh of [0.1, 1.0, 2.05]) { const g = new THREE.BoxGeometry(0.9, 0.06, 0.06); g.rotateY(a); g.translate(hx + 0.45 * ca, y + hh, z - 0.45 * sa); iron.push(g); } }
    return { iron: merge(iron), cloth: merge(cloth) }; }, [R, y]);
  const lights = tier === 'low' ? [[-8, END_DOOR_Z], [8, END_DOOR_Z]] : [[-13, END_DOOR_Z], [0, END_DOOR_Z], [13, END_DOOR_Z], [-5, -20], [15, -20]];
  return <group>
    <mesh geometry={outer} material={m.stone} castShadow receiveShadow />
    <mesh geometry={inner} material={m.plaster} castShadow receiveShadow />
    <mesh geometry={ceiling} material={m.whitewash} castShadow receiveShadow />
    <mesh geometry={roof} material={m.roof} position={[0, y + H2, (WARD.z0 + WARD.z1) / 2]} scale={[WARD.x1 - WARD.x0 + 1.8, 2.6, WARD.z1 - WARD.z0 + 1.8]} castShadow receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, y + 0.01, (WARD.z0 + WARD.z1) / 2]} receiveShadow><planeGeometry args={[WARD.x1 - WARD.x0 - 0.2, WARD.z1 - WARD.z0 - 0.2]} /><meshStandardMaterial color="#8d867a" roughness={0.9} /></mesh>
    <mesh geometry={win.dark} material={m.dark} />
    <mesh geometry={win.bars} material={m.iron} castShadow />
    <mesh geometry={win.glow}><meshStandardMaterial color="#b9cdd8" emissive="#c9dbe6" emissiveIntensity={0.45} /></mesh>
    <mesh geometry={furn.iron} material={m.iron} castShadow receiveShadow />
    <mesh geometry={furn.cloth} material={m.cloth} receiveShadow />
    {WARDS.map((w) => <mesh key={w.door} material={m.wood} position={[w.door - 0.62 - 0.05, y + 1.1, R.wards.z1 - 0.55]} rotation-y={Math.PI / 2 - 0.2}><boxGeometry args={[1.2, 2.2, 0.08]} /></mesh>)}
    {lights.map(([x, z], i) => <pointLight key={i} position={[x, y + STOREY - 0.4, z]} color="#ffe2b0" intensity={i < 3 ? 22 : 30} distance={i < 3 ? 11 : 9} decay={2} />)}
    {lights.slice(0, 3).map(([x, z], i) => <mesh key={`b${i}`} position={[x, y + STOREY - 0.15, z]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#fff3d6" emissive="#ffe2b0" emissiveIntensity={2} /></mesh>)}
  </group>;
}

/* ===================== avlu ===================== */
export function Courtyard({ m }: { m: Mats }) {
  const pave = useMemo(() => canvasTex(256, 256, (g, r) => { g.fillStyle = '#9d9483'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 40) { const v = 0.82 + r() * 0.3, o = ((y / 32) % 2) * 20; g.fillStyle = `rgb(${(190 * v) | 0},${(180 * v) | 0},${(160 * v) | 0})`; g.fillRect(x + o + 2, y + 2, 36, 28); } }), []);
  useEffect(() => { pave.repeat.set((CASTLE.x1 - CASTLE.x0) / 3, (CASTLE.z1 - CASTLE.z0) / 3); }, [pave]);
  const board = useMemo(() => canvasTex(512, 320, (g) => { g.fillStyle = '#2f3b44'; g.fillRect(0, 0, 512, 320); g.fillStyle = '#f2efe7'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.fillText('SİNOP TARİHİ', 256, 90); g.fillText('CEZAEVİ', 256, 145); g.font = '28px sans-serif'; g.fillText('1887 – 1997', 256, 200); g.fillStyle = '#c9a25a'; g.fillRect(96, 230, 320, 4); g.font = '24px sans-serif'; g.fillStyle = '#f2efe7'; g.fillText('Müze', 256, 275); }), []);
  return <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, (CASTLE.z0 + CASTLE.z1) / 2]} receiveShadow><planeGeometry args={[CASTLE.x1 - CASTLE.x0, CASTLE.z1 - CASTLE.z0]} /><meshStandardMaterial map={pave} roughness={0.95} /></mesh>
    {/* gardiyan binası */}
    <mesh material={m.whitewash} position={[(GUARD.x0 + GUARD.x1) / 2, 2.2, (GUARD.z0 + GUARD.z1) / 2]} castShadow receiveShadow><boxGeometry args={[GUARD.x1 - GUARD.x0, 4.4, GUARD.z1 - GUARD.z0]} /></mesh>
    <mesh material={m.roof} position={[(GUARD.x0 + GUARD.x1) / 2, 4.4, (GUARD.z0 + GUARD.z1) / 2]} rotation-y={Math.PI / 4} scale={[1, 1, 1]} castShadow><coneGeometry args={[(GUARD.x1 - GUARD.x0) * 0.8, 2, 4]} /></mesh>
    {[9.6, 12.4, 15.2].map((x) => <mesh key={x} material={m.dark} position={[x + 0.6, 2.4, GUARD.z0 - 0.01]} rotation-y={Math.PI}><planeGeometry args={[1, 1.3]} /></mesh>)}
    <mesh material={m.wood} position={[GUARD.x0 - 0.01, 1.1, 14]} rotation-y={-Math.PI / 2}><planeGeometry args={[1.1, 2.2]} /></mesh>
    {/* bilgi panoları */}
    <group position={[-14.5, 0, -6]} rotation-y={Math.PI / 2}>
      <mesh position={[0, 1.6, 0]}><planeGeometry args={[2.2, 1.4]} /><meshStandardMaterial map={board} roughness={0.7} /></mesh>
      <mesh material={m.iron} position={[0, 1.6, -0.04]}><boxGeometry args={[2.3, 1.5, 0.05]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} material={m.iron} position={[s * 1.05, 0.5, -0.04]}><boxGeometry args={[0.08, 1.0, 0.08]} /></mesh>)}
    </group>
    <group position={[-8, 0, 17.6]}>
      <mesh position={[0, 1.4, 0]}><planeGeometry args={[1.6, 1]} /><meshStandardMaterial map={board} roughness={0.7} /></mesh>
      <mesh material={m.iron} position={[0, 0.9, -0.05]}><boxGeometry args={[0.08, 1.8, 0.08]} /></mesh>
    </group>
  </group>;
}

/* ===================== kent, rıhtım, deniz ===================== */
export function Ground({ tier }: { tier: Tier }) {
  const geo = useMemo(() => { const N = tier === 'high' ? 200 : 140, g = new THREE.PlaneGeometry(900, 900, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), c = new THREE.Color(), grass = new THREE.Color('#6f8f48'), dry = new THREE.Color('#8f9a5a'), pave = new THREE.Color('#b4ada0');
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), sea = z > SHORE + 1; p.setY(i, sea ? -2.5 : inCastleBlock(x, z, 1) ? 0 : terrainBase(x, z));
      c.copy(grass).lerp(dry, 0.3 + 0.3 * Math.sin(x * 0.04 + z * 0.03)); if (x > OUT.x0 && x < OUT.x1 && z > CASTLE.z1 && z <= SHORE + 1) c.copy(pave); if (Math.abs(x) < 5 && z > -50 && z < CASTLE.z0) c.lerp(pave, 0.6);
      col.set([c.r, c.g, c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }, [tier]);
  const tex = useMemo(() => groundTex(), []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial vertexColors map={tex.map} bumpMap={tex.bump} bumpScale={0.25} roughness={1} /></mesh>;
}
export function Quay({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = []; slab(p, -450, 450, SHORE, SHORE + 1.2, 2.9, -2.6, 2);
    for (let x = -50; x <= 50; x += 7) { const g = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 8); g.translate(x, 0.3, SHORE - 0.4); p.push(g); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}
export function Sea() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2f6a80', roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.94 }), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = -0.5 + Math.sin(clock.elapsedTime * 0.6) * 0.05; });
  return <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -0.5, SHORE + 1000]} userData={{ noCast: true }}><planeGeometry args={[4000, 2000]} /><primitive object={mat} attach="material" /></mesh>;
}
export function Boats({ m }: { m: Mats }) {
  const list = useMemo(() => { const r = rng(11); return Array.from({ length: 6 }, (_, i) => ({ x: -40 + i * 15 + r() * 6, z: SHORE + 5 + r() * 16, yaw: r() * 6.28, c: ['#2f5f8a', '#e8e2d4', '#a83a2a'][i % 3] })); }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => { refs.current.forEach((g, i) => { if (g) { g.position.y = 0.1 + Math.sin(clock.elapsedTime * 0.9 + i) * 0.08; g.rotation.z = Math.sin(clock.elapsedTime * 0.7 + i) * 0.04; } }); });
  return <group>{list.map((b, i) => <group key={i} ref={(g) => { refs.current[i] = g; }} position={[b.x, 0.1, b.z]} rotation-y={b.yaw}>
    <mesh castShadow scale={[2.4, 1.3, 7]}><sphereGeometry args={[0.5, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><meshStandardMaterial color={b.c} roughness={0.6} side={THREE.DoubleSide} /></mesh>
    <mesh material={m.wood} position={[0, 0.02, 0]}><boxGeometry args={[2.2, 0.06, 6.2]} /></mesh>
    <mesh material={m.whitewash} position={[0, 0.55, -0.8]} castShadow><boxGeometry args={[1.3, 1.0, 1.6]} /></mesh>
    <mesh material={m.wood} position={[0, 1.6, 0.8]}><cylinderGeometry args={[0.05, 0.06, 3, 6]} /></mesh>
  </group>)}</group>;
}
/** Sinop kent evleri: taş zemin kat, badanalı üst kat, kiremit çatı (temsilî) */
export function Houses({ m }: { m: Mats }) {
  const N = HOUSES.length, base = useRef<THREE.InstancedMesh>(null), up = useRef<THREE.InstancedMesh>(null), roof = useRef<THREE.InstancedMesh>(null);
  const tex = useMemo(() => canvasTex(256, 128, (g) => { g.fillStyle = '#f1ece2'; g.fillRect(0, 0, 256, 128); for (const x of [36, 110, 184]) { g.fillStyle = '#3a4650'; g.fillRect(x, 30, 36, 56); g.fillStyle = '#5b4a3a'; g.fillRect(x - 3, 27, 42, 4); g.fillRect(x - 3, 86, 42, 4); g.fillRect(x + 16, 30, 4, 56); } }), []);
  const upMats = useMemo(() => { const s = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), f = new THREE.MeshStandardMaterial({ color: '#e4ddd0' }); return [s, s, f, f, s, s]; }, [tex]);
  const roofGeo = useMemo(() => { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 0.5, 0); return g; }, []);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => { const o = new THREE.Object3D();
    HOUSES.forEach((h, i) => { const y = terrainBase(h.x, h.z) - 0.5, gH = 3.2, uH = h.floors > 1 ? 2.9 : 0.01; o.rotation.set(0, h.yaw, 0);
      o.position.set(h.x, y + gH / 2, h.z); o.scale.set(h.w, gH, h.d); o.updateMatrix(); base.current?.setMatrixAt(i, o.matrix);
      o.position.set(h.x, y + gH + uH / 2, h.z); o.scale.set(h.w + 0.4, uH, h.d + 0.4); o.updateMatrix(); up.current?.setMatrixAt(i, o.matrix);
      o.position.set(h.x, y + gH + uH, h.z); o.scale.set(h.w + 1.6, 2, h.d + 1.6); o.updateMatrix(); roof.current?.setMatrixAt(i, o.matrix); });
    for (const mm of [base.current, up.current, roof.current]) if (mm) { mm.count = N; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); } }, [N]);
  return <group>
    <instancedMesh ref={base} args={[box, m.stone, N]} castShadow receiveShadow />
    <instancedMesh ref={up} args={[box, upMats, N]} castShadow receiveShadow />
    <instancedMesh ref={roof} args={[roofGeo, m.roof, N]} castShadow />
  </group>;
}
export function Trees({ n }: { n: number }) {
  const kinds = useMemo(() => { const r = rng(3), paint = (g: THREE.BufferGeometry, hex: string, j: number) => { const gg = g.index ? g.toNonIndexed() : g, col: number[] = [], cc = new THREE.Color(); for (let i = 0; i < gg.attributes.position.count; i++) { cc.set(hex).offsetHSL(0, 0, (r() - 0.5) * j); col.push(cc.r, cc.g, cc.b); } gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.deleteAttribute('uv'); return gg; };
    const plane = mergeGeometries([paint(new THREE.CylinderGeometry(0.35, 0.5, 3.8, 7).translate(0, 1.9, 0), '#6b5d4c', 0.05), ...Array.from({ length: 8 }, (_, i) => { const a = r() * 6.28, d = i ? 2 + r() : 0; return paint(new THREE.IcosahedronGeometry(2.2 + r() * 0.6, 1).translate(Math.cos(a) * d, 5.4 + r() * 1.6, Math.sin(a) * d), '#5a7f36', 0.12); })])!;
    const pine = mergeGeometries([paint(new THREE.CylinderGeometry(0.18, 0.3, 4, 6).translate(0, 2, 0), '#4a3828', 0.05), paint(new THREE.SphereGeometry(2.6, 10, 8).scale(1.2, 0.55, 1.2).translate(0, 5, 0), '#3f5f34', 0.12)])!;
    for (const g of [plane, pine]) g.computeVertexNormals(); return [plane, pine]; }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []), refs = useRef<(THREE.InstancedMesh | null)[]>([]);
  useEffect(() => { const r = rng(23), o = new THREE.Object3D(), cnt = [0, 0];
    const put = (t: number, x: number, z: number, s: number) => { const mm = refs.current[t]; if (!mm || cnt[t] >= n) return; o.position.set(x, terrainBase(x, z) - 0.1, z); o.rotation.set(0, r() * 6, 0); o.scale.setScalar(s); o.updateMatrix(); mm.setMatrixAt(cnt[t]++, o.matrix); };
    put(0, -22, 14, 1); put(0, 23, -3, 0.9);   // avludaki çınarlar
    for (let i = 0; i < n * 10 && cnt[0] + cnt[1] < n; i++) { const a = r() * 6.28, d = 40 + r() * 260, x = Math.cos(a) * d, z = Math.sin(a) * d - 20;
      if (z > SHORE - 4 || inCastleBlock(x, z, 5) || HOUSES.some((h) => Math.hypot(h.x - x, h.z - z) < Math.max(h.w, h.d) / 2 + 3) || (Math.abs(x) < 6 && z > CASTLE.z1)) continue;
      put(r() < 0.5 ? 0 : 1, x, z, 0.8 + r() * 0.5); }
    refs.current.forEach((mm, i) => { if (!mm) return; mm.count = cnt[i]; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); }); }, [n, kinds]);
  return <group>{kinds.map((g, i) => <instancedMesh key={i} ref={(mm) => { refs.current[i] = mm; }} args={[g, mat, n]} castShadow receiveShadow />)}</group>;
}
export function Grass({ n }: { n: number }) {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards();
  useEffect(() => { const r = rng(9), o = new THREE.Object3D(), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const x = -90 + r() * 180, z = -90 + r() * 120;
      if (inCastleBlock(x, z, 1.5) || z > CASTLE.z1 + 3 || (Math.abs(x) < 6 && z < CASTLE.z0) || HOUSES.some((h) => Math.abs(h.x - x) < h.w / 2 + 0.6 && Math.abs(h.z - z) < h.d / 2 + 0.6)) continue;
      o.position.set(x, terrainBase(x, z) - 0.05, z); o.rotation.set(0, r() * 3, 0); const s = 0.4 + r() * 0.4; o.scale.set(s, s, s); o.updateMatrix(); ref.current?.setMatrixAt(k, o.matrix); c.setHSL(0.22 + r() * 0.05, 0.4, 0.38 + r() * 0.1); ref.current?.setColorAt(k, c); k++; }
    const mm = ref.current; if (mm) { mm.count = k; mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; mm.computeBoundingSphere(); } }, [n]);
  return <group userData={{ noCast: true }}><instancedMesh ref={ref} args={[geo, mat, n]} /></group>;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1.05 + (i / 6) * 0.9) + r() * 0.15, dd = 800 + r() * 500; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(420 + r() * 220, 140 + r() * 120, 60 + i, 2, '#4a6338') }); }
    // körfezin karşısında, denizin ötesinde alçak sırtlar
    for (let i = 0; i < 3; i++) out.push({ p: [-900 + i * 700, -14, 1700 + r() * 300], g: mountainGeo(500, 110 + r() * 60, 80 + i, 2, '#5d7350') });
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
