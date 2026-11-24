/**
 * Amasya — 3B modeller: Yeşilırmak, güney kıyıda rıhtım ve gezinti yolu, köprü; kuzey kıyıda nehirden yükselen taş temeller üstünde
 * cumbalı Yalıboyu evleri (Hazeranlar Konağı simetrik cepheli); arkada Harşena kayalığı, kayaya oyulmuş zikzak merdiven, mezar terası,
 * kaya yüzüne oyulmuş kemerli nişler ve içlerinde ters U galeriyle ayrılmış mezar blokları; batıda kaya tüneli; oyma atölyesi.
 * Ölçek ve yerleşim TEMSİLÎDİR.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, mountainGeo, stoneTex, useGrassCards, weather } from '../shared/scenery';
import { BLOCK_SET, BRIDGE, FACE_Z, HOUSE_ROW, RIVER, STAIR, STREET, TERRACE, TOMBS, TUNNEL, WEST, WORK, WORK_GRID, stairY, type Tomb } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
const TY = TERRACE.y;

/* ---------- yardımcı yüzeyler ---------- */
const nz = (x: number, y: number, z: number, k: number) => Math.sin(x * 0.7 + y * 0.31 + k) * 0.5 + Math.sin(z * 0.6 - y * 0.9 + k * 2) * 0.32 + Math.sin((x + z) * 1.9 + y * 1.5 + k * 3) * 0.14 + Math.sin(y * 0.15 + x * 0.12 + k) * 0.5;
function rough(g: THREE.BufferGeometry, amp: number, fade?: (x: number, y: number, z: number) => number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = amp * (fade ? fade(x, y, z) : 1); p.setXYZ(i, x + nz(x, y, z, 1) * k, y + nz(x, y, z, 2) * k * 0.5, z + nz(x, y, z, 3) * k); }
  g.computeVertexNormals(); return g;
}
function grid(nu: number, nv: number, f: (u: number, v: number) => [number, number, number], lu: number, lv: number, keep?: (u: number, v: number) => boolean, tex = 6) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv; pos.push(...f(u, v)); uv.push((u * lu) / tex, (v * lv) / tex); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { if (keep && !keep((i + 0.5) / nu, (j + 0.5) / nv)) continue; const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
const wallG = (x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, cell = 0.6) => { const L = Math.hypot(x1 - x0, z1 - z0), h = y1 - y0;
  return grid(Math.max(2, Math.ceil(L / cell)), Math.max(2, Math.ceil(h / cell)), (u, v) => [x0 + (x1 - x0) * u, y0 + v * h, z0 + (z1 - z0) * u], L, h); };
/** Niş biçimi: genişlik 2R, tepe yüksekliği top, yarım daire kemer (yukarıdan R) */
const nicheR = (t: Tomb) => t.w / 2 + t.g, nicheTop = (t: Tomb) => t.h + t.g, nicheSpring = (t: Tomb) => nicheTop(t) - nicheR(t);
const inNiche = (t: Tomb, x: number, y: number) => { const dx = x - t.x, R = nicheR(t), sp = nicheSpring(t); return Math.abs(dx) < R && y >= 0 && (y < sp || dx * dx + (y - sp) ** 2 < R * R); };
/** Niş sınırına en yakın nokta (yan duvarlar ya da kemer) */
function toOutline(t: Tomb, x: number, y: number): [number, number] { const R = nicheR(t), sp = nicheSpring(t), dx = x - t.x;
  const side: [number, number] = [t.x + (dx < 0 ? -R : R), Math.min(y, sp)], dS = Math.hypot(side[0] - x, side[1] - y);
  const vy = Math.max(0, y - sp), L2 = Math.hypot(dx, vy) || 1, arc: [number, number] = [t.x + (dx / L2) * R, sp + (vy / L2) * R], dA = Math.hypot(arc[0] - x, arc[1] - y);
  return y >= sp && dA < dS ? arc : side; }
export const WORK_NICHE: Tomb = { id: 'atolye', x: WORK.x, w: 5, h: 10, d: 4, g: 2 };

/* ---------- malzemeler ---------- */
export interface Mats { rock: THREE.MeshStandardMaterial; rockDark: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; pave: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; iron: THREE.MeshStandardMaterial; water: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    // kireçtaşı: gri-bej, düşey yağmur izleri, ince çatlaklar
    const lime = canvasTex(512, 512, (g, r) => { g.fillStyle = '#b9ad98'; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '150,140,122' : '214,205,186'},${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 70, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
      for (let i = 0; i < 70; i++) { const x = r() * 512, gr = g.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, 'rgba(70,60,50,.22)'); gr.addColorStop(1, 'rgba(70,60,50,0)'); g.fillStyle = gr; g.save(); g.translate(x, r() * 400); g.fillRect(0, 0, 2 + r() * 7, 120 + r() * 200); g.restore(); }
      g.strokeStyle = 'rgba(60,52,44,.35)'; g.lineWidth = 1.5; for (let i = 0; i < 40; i++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += 10 + r() * 25; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 6000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${r() * 0.12})` : `rgba(255,250,235,${r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 2, 2); } }, 3);
    const st = stoneTex('amasya-temel', ['#8c8478', '#9a9183', '#7f776c', '#a59c8c'], [22, 14], [40, 40]);
    const pv = canvasTex(256, 256, (g, r) => { g.fillStyle = '#8b8378'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? -24 : 0; x < 256; x += 48) { const v = 140 + r() * 40 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.fillRect(x + 2, y + 2, 44, 28); } });
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7c3a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) { const v = r(); g.fillStyle = `rgb(${150 + v * 40 | 0},${70 + v * 25 | 0},${48 + v * 15 | 0})`; g.beginPath(); g.ellipse(x + 8, y + 10, 7, 9, 0, 0, Math.PI); g.fill(); } });
    const gr = canvasTex(128, 128, (g, r) => { g.fillStyle = '#6f7a3f'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + r() * 60 | 0},${80 + r() * 50 | 0},${30 + r() * 20 | 0},.7)`; g.fillRect(r() * 128, r() * 128, 2, 3); } });
    return {
      rock: weather(new THREE.MeshStandardMaterial({ map: lime, bumpMap: lime, bumpScale: 1.2, roughness: 0.95, side: THREE.DoubleSide })),
      rockDark: new THREE.MeshStandardMaterial({ map: lime, color: '#8f8576', roughness: 1, side: THREE.DoubleSide }),
      stone: new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.6, roughness: 0.9 }),
      pave: new THREE.MeshStandardMaterial({ map: pv, roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: '#5e4330', roughness: 0.8 }),
      iron: new THREE.MeshStandardMaterial({ color: '#2f3336', roughness: 0.5, metalness: 0.6 }),
      water: new THREE.MeshStandardMaterial({ color: '#3f5a52', roughness: 0.08, metalness: 0.25, transparent: true, opacity: 0.94 }),
      grass: new THREE.MeshStandardMaterial({ map: gr, roughness: 1 }),
    };
  }, []);
}

/* ===================== nehir ve kıyılar ===================== */
export function River({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const water = new THREE.PlaneGeometry(600, RIVER.z1 - RIVER.z0 + 4, 1, 1); water.rotateX(-Math.PI / 2); water.translate(0, RIVER.water, (RIVER.z0 + RIVER.z1) / 2);
    const bed = new THREE.PlaneGeometry(600, 40); bed.rotateX(-Math.PI / 2); bed.translate(0, RIVER.water - 2, 15);
    // güney rıhtım duvarı ve korkuluk
    const quay = at(bx(600, 3, 1, 3), 0, -1.5, RIVER.z1 + 0.5);
    const rail: THREE.BufferGeometry[] = []; for (let x = -150; x <= 150; x += 2.4) { if (Math.abs(x) < BRIDGE.w / 2 + 0.4) continue; rail.push(at(new THREE.BoxGeometry(0.06, 1, 0.06), x, 0.5, RIVER.z1 + 0.25)); }
    for (const s of [-1, 1]) { const L = 150 - BRIDGE.w / 2 - 0.4; rail.push(at(new THREE.BoxGeometry(L, 0.06, 0.06), s * (BRIDGE.w / 2 + 0.4 + L / 2), 1, RIVER.z1 + 0.25), at(new THREE.BoxGeometry(L, 0.04, 0.04), s * (BRIDGE.w / 2 + 0.4 + L / 2), 0.55, RIVER.z1 + 0.25)); }
    // köprü: tabliye, iki ayak, korkuluklar
    const L = BRIDGE.z1 - BRIDGE.z0, bc = (BRIDGE.z0 + BRIDGE.z1) / 2;
    const deck = at(bx(BRIDGE.w, 0.6, L, 3), 0, -0.3, bc);
    const piers = merge([10, 20].map((z) => at(bx(BRIDGE.w + 0.6, 2.6, 2.2, 3), 0, -1.6, z)));
    const par = merge([-1, 1].map((s) => at(bx(0.3, 0.9, L, 3), s * (BRIDGE.w / 2 - 0.15), 0.45, bc)));
    return { water, bed, quay, rail: merge(rail), deck, piers, par };
  }, []);
  return <group>
    <mesh geometry={g.bed}><meshStandardMaterial color="#3a3a30" roughness={1} /></mesh>
    <mesh geometry={g.water} material={m.water} receiveShadow />
    <mesh geometry={g.quay} material={m.stone} receiveShadow />
    <mesh geometry={g.rail} material={m.iron} />
    <mesh geometry={g.deck} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.piers} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.par} material={m.stone} castShadow receiveShadow />
  </group>;
}
export function Banks({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const south = new THREE.PlaneGeometry(600, 220); south.rotateX(-Math.PI / 2); south.translate(0, 0, RIVER.z1 + 110);
    const walk = new THREE.PlaneGeometry(600, 8); walk.rotateX(-Math.PI / 2); const wu = walk.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < wu.count; i++) wu.setXY(i, wu.getX(i) * 150, wu.getY(i) * 2); walk.translate(0, 0.02, RIVER.z1 + 4.6);
    const street = new THREE.PlaneGeometry(600, STREET.z1 - STREET.z0 + 0.4); street.rotateX(-Math.PI / 2); const su = street.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < su.count; i++) su.setXY(i, su.getX(i) * 150, su.getY(i) * 2); street.translate(0, 0.01, (STREET.z0 + STREET.z1) / 2);
    const lane = new THREE.PlaneGeometry(HOUSE_ROW.lane * 2, -HOUSE_ROW.z0 + 0.6); lane.rotateX(-Math.PI / 2); lane.translate(0, 0.01, HOUSE_ROW.z0 / 2);
    // gezinti yolunda ağaçlar ve fenerler
    const r = rng(17), trunks: THREE.BufferGeometry[] = [], crowns: THREE.BufferGeometry[] = [], lamps: THREE.BufferGeometry[] = [];
    for (let x = -140; x <= 140; x += 13) { if (Math.abs(x) < 16) continue; const tx = x + (r() - 0.5) * 3, tz = RIVER.z1 + 9 + r() * 2, s = 0.8 + r() * 0.5;
      trunks.push(at(new THREE.CylinderGeometry(0.14 * s, 0.22 * s, 3.4 * s, 7), tx, 1.7 * s, tz));
      for (let k = 0; k < 5; k++) { const c = new THREE.IcosahedronGeometry((1.1 + r() * 0.7) * s, 2); crowns.push(at(c, tx + (r() - 0.5) * 2.2 * s, (3.8 + r() * 1.6) * s, tz + (r() - 0.5) * 2.2 * s)); } }
    for (let x = -132; x <= 132; x += 22) { lamps.push(at(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6), x, 1.8, RIVER.z1 + 1.4), at(new THREE.BoxGeometry(0.3, 0.4, 0.3), x, 3.7, RIVER.z1 + 1.4)); }
    // güney kıyının arkasında sade kent dokusu
    const town: THREE.BufferGeometry[] = [], troofs: THREE.BufferGeometry[] = [], tcols = ['#e9e0cf', '#e2cba2', '#efe9df', '#d8c3ae', '#e6d8c0'];
    for (let i = 0; i < 46; i++) { const w = 7 + r() * 8, d = 8 + r() * 6, h = 6 + r() * 9, x = -150 + i * 6.6 + r() * 2, z = RIVER.z1 + 30 + r() * 30, b = bx(w, h, d, 4).toNonIndexed(), cc = new THREE.Color(tcols[(r() * tcols.length) | 0]), n = b.attributes.position.count, col = new Float32Array(n * 3); for (let k = 0; k < n; k++) col.set([cc.r, cc.g, cc.b], k * 3); b.setAttribute('color', new THREE.BufferAttribute(col, 3)); town.push(at(b, x, h / 2, z));
      const rf = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); rf.rotateY(Math.PI / 4); rf.scale(w + 1, 2, d + 1); troofs.push(at(rf, x, h + 1, z)); }
    return { south, walk, street, lane, trunks: merge(trunks), crowns: merge(crowns), lamps: merge(lamps), town: merge(town), troofs: merge(troofs) };
  }, []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g.south} material={m.grass} receiveShadow /></group>
    <mesh geometry={g.walk} material={m.pave} receiveShadow />
    <mesh geometry={g.street} material={m.pave} receiveShadow />
    <mesh geometry={g.lane} material={m.pave} receiveShadow />
    <mesh geometry={g.trunks} material={m.wood} castShadow />
    <mesh geometry={g.crowns} castShadow><meshStandardMaterial color="#5f7a3e" roughness={0.95} /></mesh>
    <mesh geometry={g.lamps} material={m.iron} />
    <mesh geometry={g.town} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={0.9} /></mesh>
    <mesh geometry={g.troofs} material={m.roof} castShadow />
  </group>;
}

/* ===================== Yalıboyu evleri ===================== */
interface House { x: number; w: number; floors: number; col: string; bay: boolean; haz?: boolean }
export const HOUSES: House[] = (() => { const r = rng(5), out: House[] = [], cols = ['#efe6d2', '#e7cf9e', '#ecd5c8', '#f4f1ea', '#d9c09a', '#e9dcc0'];
  let x = -96; while (x < 96) { if (x > -HOUSE_ROW.lane - 6 && x < HOUSE_ROW.lane + 0.5) { x = HOUSE_ROW.lane + 0.6; continue; }
    if (x > -37 && x < -23) { out.push({ x: -30, w: 12, floors: 2, col: "#f6f2ea", bay: true, haz: true }); x = -23.7 + 0.8; continue; }
    const w = 6 + r() * 3, cx = x + w / 2; if (cx + w / 2 > -HOUSE_ROW.lane - 0.4 && cx - w / 2 < HOUSE_ROW.lane + 0.4) { x += 1; continue; }
    out.push({ x: cx, w: w - 0.3, floors: r() < 0.55 ? 2 : 3, col: cols[(r() * cols.length) | 0], bay: r() < 0.75 }); x += w; }
  return out; })();
const FLOOR_H = 2.9, BASE_H = 2.4;
/** Cephe dokusu: sıva rengi, ahşap kuşaklar, her katta pencereler (beyaz çerçeve, koyu cam, kafes) */
function facadeTex(col: string, floors: number, wins: number, door: boolean, sym = false) {
  return canvasTex(256, 64 * floors, (g) => { g.fillStyle = col; g.fillRect(0, 0, 256, 64 * floors);
    g.fillStyle = '#6b4b33'; for (let f = 0; f <= floors; f++) g.fillRect(0, f * 64 - 2, 256, 4);
    for (let f = 0; f < floors; f++) for (let i = 0; i < wins; i++) { const cx = (256 / wins) * (i + 0.5), y = f * 64 + 14; if (door && f === floors - 1 && i === Math.floor(wins / 2)) { g.fillStyle = '#5a3d28'; g.fillRect(cx - 12, y - 2, 24, 50); continue; }
      g.fillStyle = '#f7f4ee'; g.fillRect(cx - 11, y, 22, 34); g.fillStyle = '#3a4248'; g.fillRect(cx - 8, y + 3, 16, 28); g.fillStyle = '#f7f4ee'; g.fillRect(cx - 1, y + 3, 2, 28); g.fillRect(cx - 8, y + 15, 16, 2);
      if (sym && i === Math.floor(wins / 2)) { g.strokeStyle = '#6b4b33'; g.lineWidth = 2; g.strokeRect(cx - 14, y - 3, 28, 40); } } });
}
export function Houses({ m }: { m: Mats }) {
  const data = useMemo(() => {
    const base: THREE.BufferGeometry[] = [], roofs: THREE.BufferGeometry[] = [], brackets: THREE.BufferGeometry[] = [];
    const bodies: { geo: THREE.BufferGeometry; mat: THREE.Material[] }[] = [];
    const texCache = new Map<string, THREE.MeshStandardMaterial>(); const mat = (col: string, floors: number, wins: number, door: boolean, sym = false) => { const k = `${col}${floors}${wins}${door}${sym}`; let mm = texCache.get(k); if (!mm) { mm = new THREE.MeshStandardMaterial({ map: facadeTex(col, floors, wins, door, sym), roughness: 0.9 }); texCache.set(k, mm); } return mm; };
    const plain = (col: string) => mat(col, 1, 0, false);
    const D = -HOUSE_ROW.z0 - 0.6;
    for (const h of HOUSES) {
      // taş temel: sudan yükselen eski sur/rıhtım
      base.push(at(bx(h.w + 0.3, BASE_H - RIVER.water, D + 0.6, 3), h.x, (BASE_H + RIVER.water) / 2, HOUSE_ROW.z0 / 2 + 0.3));
      const H = h.floors * FLOOR_H, wins = Math.max(2, Math.round(h.w / 2.3)) + (h.haz ? 1 : 0);
      const body = new THREE.BoxGeometry(h.w, H, D); body.translate(h.x, BASE_H + H / 2, HOUSE_ROW.z0 / 2 - 0.1);
      const front = mat(h.col, h.floors, wins, false, h.haz), back = mat(h.col, h.floors, wins, true), side = plain(h.col);
      bodies.push({ geo: body, mat: [side, side, side, side, front, back] });
      if (h.bay) { const bw = h.haz ? 5 : Math.min(4, h.w * 0.55), bh = FLOOR_H * 0.92, by = BASE_H + FLOOR_H * (h.floors - 1) + bh / 2 + 0.05, bayG = new THREE.BoxGeometry(bw, bh, 1.1); bayG.translate(h.x, by, 0.45);
        const bm = mat(h.col, 1, Math.max(2, Math.round(bw / 1.3)), false); bodies.push({ geo: bayG, mat: [plain(h.col), plain(h.col), plain(h.col), plain(h.col), bm, bm] });
        for (const s of [-1, 1]) { const b = new THREE.BoxGeometry(0.14, 0.14, 1.4); b.rotateX(-0.6); brackets.push(at(b, h.x + s * (bw / 2 - 0.3), by - bh / 2 - 0.45, 0.35)); } }
      // kırma çatı: geniş saçaklı alçak piramit
      const roof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(h.w + 1.4, h.haz ? 2.4 : 1.9, D + 1.8); roof.translate(h.x, BASE_H + H + (h.haz ? 1.2 : 0.95), HOUSE_ROW.z0 / 2);
      roofs.push(roof);
    }
    return { base: merge(base), roofs: merge(roofs), brackets: merge(brackets), bodies };
  }, []);
  return <group>
    <mesh geometry={data.base} material={m.stone} castShadow receiveShadow />
    {data.bodies.map((b, i) => <mesh key={i} geometry={b.geo} material={b.mat} castShadow receiveShadow />)}
    <mesh geometry={data.roofs} material={m.roof} castShadow receiveShadow />
    <mesh geometry={data.brackets} material={m.wood} castShadow />
  </group>;
}

/* ===================== kayalık, merdiven, teras, nişler ===================== */
const SLOPE = (z: number) => Math.max(0, Math.min(TY, ((STREET.z0 - z) / (STREET.z0 - TERRACE.z1)) * TY));
export function Cliff({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const rock: THREE.BufferGeometry[] = [], steps: THREE.BufferGeometry[] = [], dark: THREE.BufferGeometry[] = [];
    const holes = [...TOMBS, WORK_NICHE], holeAt = (x: number, yy: number) => holes.find((t) => inNiche(t, x, yy - TY));
    const workCellN = (x: number, yy: number) => { const c = Math.floor(x - (WORK.x - WORK.cols / 2)), r = Math.floor(yy - TY); return c >= 0 && c < WORK.cols && r >= 0 && r < WORK.rows ? WORK_GRID[r][c] !== 'n' : false; };
    // 1) dik kaya yüzü: nişlerin yerinde delik; delik kenarındaki köşeler kemer çizgisine çekilir
    const X0 = -130, X1 = 130, FH = 52, cell = 0.5, nu = (X1 - X0) / cell, nv = FH / cell;
    const top = (x: number) => TY + FH - 6 + Math.sin(x * 0.05) * 4 + Math.sin(x * 0.17 + 2) * 1.5;
    const face = grid(nu, nv, (u, v) => { const x = X0 + u * (X1 - X0); return [x, TY + v * (top(x) - TY), FACE_Z]; }, X1 - X0, FH,
      (u, v) => { const x = X0 + u * (X1 - X0), yy = TY + v * (top(x) - TY); if (Math.abs(x - WORK.x) < WORK.cols / 2 + 0.01 && yy < TY + WORK.rows) return !workCellN(x, yy); return !holeAt(x, yy); }, 5);
    { const p = face.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); if (y < TY + 0.01) continue; const t = TOMBS.find((tt) => inNiche(tt, x, y - TY)); if (!t) continue; const [ox, oy] = toOutline(t, x, y - TY); p.setXY(i, ox, oy + TY); } }
    const nearHole = (x: number, y: number) => { let d = 9; for (const t of holes) { const dx = Math.abs(x - t.x) - nicheR(t), dy = y - TY - nicheTop(t); d = Math.min(d, Math.max(dx, dy, 0) + (dx < 0 && dy < 0 ? 0 : 0)); } return d; };
    const ff = (x: number, y: number) => Math.min(1, Math.max(0, nearHole(x, y) - 0.2) / 1.6) * Math.min(1, (y - TY) / 1.2);
    rough(face, 0.55, ff);
    { const p = face.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), k = Math.min(1, Math.max(0, nearHole(x, y) - 0.5) / 4) * Math.min(1, (y - TY) / 3);
      p.setZ(i, p.getZ(i) + k * (Math.sin(x * 0.09) * 1.6 + Math.sin(x * 0.23 + y * 0.07) * 0.8 + Math.sin(y * 0.13 + x * 0.02) * 1.1 + Math.abs(Math.sin(x * 0.045 + 1)) * 1.4)); }
      face.computeVertexNormals(); }
    rock.push(face);
    // 2) dağın üst yamacı
    const hill = grid(130, 40, (u, v) => { const x = X0 + u * (X1 - X0), z = FACE_Z - 0.5 - v * 260; return [x, top(x) - 0.6 + v * 140 + Math.sin(x * 0.04 + v * 9) * 6 * v, z]; }, X1 - X0, 260, undefined, 12);
    const hillG = rough(hill, 1.2);
    // 3) teras zemini (tüm kaya boyunca bir set) ve niş zeminleri
    const terr = grid(130, 8, (u, v) => [X0 + u * (X1 - X0), TY, TERRACE.z1 + 0.2 - v * (TERRACE.z1 + 0.2 - FACE_Z - 0.3)], X1 - X0, 8.5, undefined, 5); rock.push(rough(terr, 0.12, (_x, _y, z) => (z < FACE_Z + 1.2 ? 0 : 1)));
    // 4) eğimli yamaç (merdivenin dışında) ve merdiven
    rock.push(rough(grid(130, 12, (u, v) => { const x = X0 + u * (X1 - X0), z = STREET.z0 - v * (STREET.z0 - TERRACE.z1); return [x, SLOPE(z) + 0.02, z]; }, X1 - X0, 20, (u) => { const x = X0 + u * (X1 - X0); return x < STAIR.x0 || x > STAIR.x1; }), 0.35, (x) => Math.min(1, Math.abs(x - (STAIR.x0 + STAIR.x1) / 2) - 8)));
    const SW = 0.8;
    for (let i = 0; i < 3; i++) { const [za, zb] = STAIR.rows[i];
      for (let x = STAIR.x0; x < STAIR.x1 - 0.01; x += SW) { const y = stairY(x + SW / 2, i); steps.push(at(bx(SW + 0.02, Math.max(0.2, y + 0.15 - (i === 0 ? 0 : STAIR.rise * i - 0.4)), zb - za, 2), x + SW / 2, (y + 0.15 + (i === 0 ? 0 : STAIR.rise * i - 0.4)) / 2, (za + zb) / 2)); }
      // kollar arasındaki dik yüzler (alçak kol ile yüksek kolun farkı)
      const zf = zb; const lo = (x: number) => (i === 0 ? 0 : stairY(x, i - 1)), hi = (x: number) => stairY(x, i);
      if (i === 0) rock.push(grid(32, 6, (u, v) => { const x = STAIR.x0 + u * (STAIR.x1 - STAIR.x0); return [x, v * hi(x), zf + 0.01]; }, 16, 6));
      else rock.push(grid(32, 6, (u, v) => { const x = STAIR.x0 + u * (STAIR.x1 - STAIR.x0), a = lo(x), b = hi(x); return [x, Math.min(a, b) + v * Math.abs(b - a), zf + 0.01]; }, 16, 6));
    }
    rock.push(grid(32, 6, (u, v) => { const x = STAIR.x0 + u * (STAIR.x1 - STAIR.x0), a = stairY(x, 2); return [x, a + v * (TY - a), TERRACE.z1 + 0.01]; }, 16, 6));
    for (const sx of [STAIR.x0, STAIR.x1]) rock.push(grid(14, 8, (u, v) => { const z = STREET.z0 - u * (STREET.z0 - TERRACE.z1), i = z > STAIR.rows[0][0] ? 0 : z > STAIR.rows[1][0] ? 1 : 2, a = stairY(sx, i), b = SLOPE(z); return [sx, Math.min(a, b) + v * Math.abs(b - a), z]; }, 7.5, 18));
    // korkuluk: her kolun güney kenarında demir dikmeler ve tırabzan
    const rail: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) { const zr = STAIR.rows[i][1] - 0.15; for (let x = STAIR.x0 + 0.4; x < STAIR.x1; x += 1.6) rail.push(at(new THREE.BoxGeometry(0.05, 1, 0.05), x, stairY(x, i) + 0.65, zr));
      const a = new THREE.Vector3(STAIR.x0, stairY(STAIR.x0, i) + 1.15, zr), b = new THREE.Vector3(STAIR.x1, stairY(STAIR.x1, i) + 1.15, zr), L = a.distanceTo(b), bar = new THREE.BoxGeometry(L, 0.05, 0.05); bar.rotateZ(Math.atan2(b.y - a.y, b.x - a.x)); rail.push(at(bar, (a.x + b.x) / 2, (a.y + b.y) / 2, zr)); }
    for (let x = TERRACE.x0; x < STAIR.x0 - 1; x += 1.8) rail.push(at(new THREE.BoxGeometry(0.05, 1, 0.05), x, TY + 0.5, TERRACE.z1 + 0.25));
    rail.push(at(new THREE.BoxGeometry(STAIR.x0 - 1 - TERRACE.x0, 0.05, 0.05), (TERRACE.x0 + STAIR.x0 - 1) / 2, TY + 1, TERRACE.z1 + 0.25));
    for (let x = WEST.x0 + 1; x < WEST.x1; x += 1.8) rail.push(at(new THREE.BoxGeometry(0.05, 1, 0.05), x, TY + 0.5, TERRACE.z1 + 0.25));
    // 5) nişlerin içi: yan duvarlar, kemerli tavan, arka duvar, zemin; mezar blokları
    const blocks: THREE.BufferGeometry[] = [];
    for (const t of holes) { const R = nicheR(t) + (t === WORK_NICHE ? 0 : 0.14), sp = TY + nicheSpring(t), zb = FACE_Z - BLOCK_SET - t.d - t.g;
      for (const s of [-1, 1]) rock.push(rough(wallG(t.x + s * R, FACE_Z + 0.05, t.x + s * R, zb - 0.1, TY, sp + 0.1, 0.5), 0.12, (_x, _y, z) => (z > FACE_Z - 0.4 ? 0 : 1)));
      rock.push(rough(grid(Math.ceil((FACE_Z - zb) / 0.5), 20, (u, v) => { const ang = Math.PI * v; return [t.x + R * Math.cos(ang), sp + R * Math.sin(ang), FACE_Z + 0.05 - u * (FACE_Z + 0.05 - zb + 0.1)]; }, FACE_Z - zb, Math.PI * R, undefined, 5), 0.12, (_x, _y, z) => (z > FACE_Z - 0.4 ? 0 : 1)));
      rock.push(grid(Math.ceil(2 * R / 0.5), Math.ceil(nicheTop(t) / 0.5), (u, v) => [t.x - R + u * 2 * R, TY + v * nicheTop(t), zb - 0.05], 2 * R, nicheTop(t), (u, v) => inNiche(t, t.x - R + u * 2 * R, v * nicheTop(t)), 5));
      rock.push(grid(4, 6, (u, v) => [t.x - R + u * 2 * R, TY + 0.01, FACE_Z + 0.05 - v * (FACE_Z + 0.05 - zb)], 2 * R, FACE_Z - zb, undefined, 5));
      if (t === WORK_NICHE) continue;
      // blok: dikdörtgen gövde + yuvarlak tepe; ön yüzde mezar odasının kapısı
      const sh = new THREE.Shape(), hw = t.w / 2, bodyH = t.h - hw; sh.moveTo(-hw, 0); sh.lineTo(-hw, bodyH); sh.absarc(0, bodyH, hw, Math.PI, 0, true); sh.lineTo(hw, 0); sh.closePath();
      const ex = new THREE.ExtrudeGeometry(sh, { depth: t.d, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 20 }); const uvb = ex.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uvb.count; i++) uvb.setXY(i, uvb.getX(i) / 5, uvb.getY(i) / 5);
      ex.translate(t.x, TY, FACE_Z - BLOCK_SET - t.d); blocks.push(ex);
      dark.push(at(new THREE.PlaneGeometry(t.w * 0.22, t.h * 0.16), t.x, TY + t.h * 0.3, FACE_Z - BLOCK_SET + 0.1));
    }
    // 6) tünelli kaya çıkıntısı (terasın batısı)
    const bx0 = TUNNEL.x0, bx1 = TUNNEL.x1, tz = (TUNNEL.z0 + TUNNEL.z1) / 2, tr = (TUNNEL.z1 - TUNNEL.z0) / 2, tsp = TY + TUNNEL.h - tr;
    const portal = (zz: number, y: number) => Math.abs(zz - tz) < tr && (y - TY < TUNNEL.h - tr || (zz - tz) ** 2 + (y - tsp) ** 2 < tr * tr);
    rock.push(rough(grid(36, 30, (u, v) => [bx0 + u * (bx1 - bx0), TY + v * 16, TERRACE.z1 + 0.3], bx1 - bx0, 16), 0.5, (_x, y) => Math.min(1, (y - TY) / 1.5 + 0.1)));
    for (const sx of [bx0, bx1]) rock.push(rough(grid(18, 32, (u, v) => [sx, TY + v * 16, TERRACE.z1 + 0.3 - u * (TERRACE.z1 + 0.3 - FACE_Z)], 8.5, 16, (u, v) => !portal(TERRACE.z1 + 0.3 - u * (TERRACE.z1 + 0.3 - FACE_Z), TY + v * 16)), 0.4, (_x, y, z) => (Math.abs(z - tz) < tr + 1 && y < TY + TUNNEL.h + 1 ? 0 : 1)));
    rock.push(rough(grid(36, 18, (u, v) => [bx0 + u * (bx1 - bx0), TY + 16 + Math.sin(u * 9) * 1.2, TERRACE.z1 + 0.3 - v * (TERRACE.z1 + 0.3 - FACE_Z + 1)], bx1 - bx0, 9), 0.6));
    for (const s of [-1, 1]) rock.push(wallG(bx0, tz + s * tr, bx1, tz + s * tr, TY, tsp + 0.05, 0.5));
    rock.push(grid(36, 10, (u, v) => { const ang = Math.PI * v; return [bx0 + u * (bx1 - bx0), tsp + tr * Math.sin(ang), tz + tr * Math.cos(ang)]; }, bx1 - bx0, Math.PI * tr));
    return { rock: merge(rock), hill: hillG, steps: merge(steps), blocks: merge(blocks), dark: merge(dark), rail: merge(rail) };
  }, []);
  return <group>
    <mesh geometry={g.rock} material={m.rock} castShadow receiveShadow />
    <mesh geometry={g.hill} castShadow receiveShadow><meshStandardMaterial map={m.rock.map} color="#a8a283" roughness={1} /></mesh>
    <mesh geometry={g.blocks} material={m.rock} castShadow receiveShadow />
    <mesh geometry={g.steps} material={m.rockDark} castShadow receiveShadow />
    <mesh geometry={g.dark}><meshStandardMaterial color="#1c1814" roughness={1} /></mesh>
    <mesh geometry={g.rail} material={m.iron} />
  </group>;
}
/** Kayalıkta tutunan çalı ve ot kümeleri */
export function CliffPlants() {
  const ref = useRef<THREE.InstancedMesh>(null); const { geo, mat } = useGrassCards(), n = 900;
  const bush = useMemo(() => { const r = rng(77), parts: THREE.BufferGeometry[] = []; for (let i = 0; i < 70; i++) { const x = -125 + r() * 250, z = STREET.z0 - 0.5 - r() * 6.5; if (x > STAIR.x0 - 1 && x < STAIR.x1 + 1) continue; const s = 0.6 + r() * 1.2, b = new THREE.IcosahedronGeometry(s, 0); b.scale(1, 0.7, 1); parts.push(at(b, x, SLOPE(z) + s * 0.4, z)); }
    return merge(parts); }, []);
  useEffect(() => { const r = rng(19), o = new THREE.Object3D(); let k = 0; const mm = ref.current; if (!mm) return;
    for (let i = 0; i < n * 3 && k < n; i++) { const x = -125 + r() * 250, z = STREET.z0 - r() * (STREET.z0 - TERRACE.z1); if (x > STAIR.x0 - 0.5 && x < STAIR.x1 + 0.5) continue; o.position.set(x, SLOPE(z), z); o.rotation.set(0, r() * 3, 0); const s = 0.7 + r() * 0.7; o.scale.set(s, s, s); o.updateMatrix(); mm.setMatrixAt(k++, o.matrix); }
    mm.count = k; mm.instanceMatrix.needsUpdate = true; mm.computeBoundingSphere(); }, []);
  return <group userData={{ noCast: true }}>
    <instancedMesh ref={ref} args={[geo, mat, n]} />
    <mesh geometry={bush}><meshStandardMaterial color="#556b38" roughness={1} flatShading /></mesh>
  </group>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [-900, -10, -1400] as [number, number, number], g: mountainGeo(900, 420, 7, 1, '#7c7a5a') },
    { p: [1200, -10, -900] as [number, number, number], g: mountainGeo(800, 380, 9, 1, '#7c7a5a') },
    { p: [300, -10, 1600] as [number, number, number], g: mountainGeo(1100, 460, 11, 1, '#7f7c5e') },
    { p: [-1500, -10, 900] as [number, number, number], g: mountainGeo(900, 360, 13, 1, '#7f7c5e') },
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== oyma atölyesi hücreleri ===================== */
export const WORK_CELLS: { c: number; r: number }[] = (() => { const out: { c: number; r: number }[] = []; WORK_GRID.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'g') out.push({ c, r }); })); return out; })();
export const cellCenter = (c: number, r: number): [number, number, number] => [WORK.x - WORK.cols / 2 + c + 0.5, TY + r + 0.5, FACE_Z];
/** Galeri hücreleri (oyulabilir kutular) ve blok hücreleri (sabit). carved: oyulmuş hücreler, can: şimdi oyulabilenler */
export function WorkCells({ m, carved, can, active, onCell, onBlock }: { m: Mats; carved: Set<string>; can: Set<string>; active: boolean; onCell: (c: number, r: number) => void; onBlock: () => void }) {
  const ref = useRef<THREE.InstancedMesh>(null), depth = BLOCK_SET + WORK_NICHE.d + WORK_NICHE.g;
  const geo = useMemo(() => { const g = bx(0.98, 0.98, depth, 3); g.translate(0, 0, -depth / 2); return g; }, [depth]);
  const blockGeo = useMemo(() => { const parts: THREE.BufferGeometry[] = []; WORK_GRID.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== 'b') return; const [x, y] = cellCenter(c, r); parts.push(at(bx(1, 1, WORK_NICHE.d + BLOCK_SET, 3), x, y, FACE_Z - (WORK_NICHE.d + BLOCK_SET) / 2)); })); return merge(parts); }, []);
  useEffect(() => { const mm = ref.current; if (!mm) return; const o = new THREE.Object3D(), col = new THREE.Color();
    WORK_CELLS.forEach(({ c, r }, i) => { const k = `${c},${r}`, [x, y, z] = cellCenter(c, r); o.position.set(x, y, z); o.scale.setScalar(carved.has(k) ? 0.0001 : 1); o.updateMatrix(); mm.setMatrixAt(i, o.matrix);
      col.set(active && can.has(k) ? '#f3d9a4' : '#ffffff'); mm.setColorAt(i, col); });
    mm.instanceMatrix.needsUpdate = true; if (mm.instanceColor) mm.instanceColor.needsUpdate = true; }, [carved, can, active]);
  const guide = useMemo(() => { const parts: THREE.BufferGeometry[] = []; const isB = (c: number, r: number) => (WORK_GRID[r]?.[c] ?? 'n') === 'b';
    WORK_GRID.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== 'b') return; const [x, y] = cellCenter(c, r), z = FACE_Z + 0.03;
      if (!isB(c - 1, r)) parts.push(at(new THREE.PlaneGeometry(0.07, 1), x - 0.5, y, z)); if (!isB(c + 1, r)) parts.push(at(new THREE.PlaneGeometry(0.07, 1), x + 0.5, y, z));
      if (!isB(c, r + 1)) parts.push(at(new THREE.PlaneGeometry(1, 0.07), x, y + 0.5, z)); })); return merge(parts); }, []);
  return <group>
    {active && <mesh geometry={guide}><meshBasicMaterial color="#a0482a" /></mesh>}
    <instancedMesh ref={ref} args={[geo, m.rock, WORK_CELLS.length]} castShadow receiveShadow
      onPointerDown={(e) => { if (!active || e.instanceId === undefined) return; e.stopPropagation(); const cc = WORK_CELLS[e.instanceId]; onCell(cc.c, cc.r); }} />
    <mesh geometry={blockGeo} material={m.rock} castShadow receiveShadow onPointerDown={(e) => { if (!active) return; e.stopPropagation(); onBlock(); }} />
  </group>;
}
