/**
 * Tokat — 3B modeller: küçük yazma atölyesi (sıvalı duvarlar, ahşap döşeme ve kirişler, pencere, kapı), ortada baskı tezgâhı ve üstünde
 * baskı bezi, raflarda ıhlamur kalıplar, boya kapları, iplerde kuruyan yazmalar, duvarda örnek yazma. Yazma desenleri tuvalde çizilir.
 * Düzen TEMSİLÎDİR.
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx } from '../shared/scenery';
import { BENCH, COLORS, ROOM, TARGET, type Cell, type ColorId, type KalipId } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };
const hex = (c: ColorId) => COLORS.find((q) => q.id === c)!.hex;

/* ===================== yazma çizimi ===================== */
/** Motif yolu (merkez 0,0, boyut s): gül, yaprak, nar çiçeği */
function motifPath(g: CanvasRenderingContext2D, k: KalipId, s: number) {
  g.beginPath();
  if (k === 'gul') { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.moveTo(Math.cos(a) * s * 0.18, Math.sin(a) * s * 0.18); g.ellipse(Math.cos(a) * s * 0.24, Math.sin(a) * s * 0.24, s * 0.17, s * 0.11, a, 0, Math.PI * 2); } g.moveTo(s * 0.12, 0); g.arc(0, 0, s * 0.12, 0, Math.PI * 2); }
  else if (k === 'yaprak') { g.moveTo(0, -s * 0.42); g.quadraticCurveTo(s * 0.3, 0, 0, s * 0.42); g.quadraticCurveTo(-s * 0.3, 0, 0, -s * 0.42); g.moveTo(0, -s * 0.36); g.lineTo(0, s * 0.36); for (const t of [-0.2, 0, 0.2]) { g.moveTo(0, s * t); g.lineTo(s * 0.12, s * (t - 0.1)); g.moveTo(0, s * t); g.lineTo(-s * 0.12, s * (t - 0.1)); } }
  else { g.moveTo(0, -s * 0.12); g.arc(0, s * 0.06, s * 0.26, -Math.PI / 2, Math.PI * 1.5); g.moveTo(-s * 0.14, -s * 0.16); g.lineTo(-s * 0.1, -s * 0.36); g.lineTo(0, -s * 0.22); g.lineTo(s * 0.1, -s * 0.36); g.lineTo(s * 0.14, -s * 0.16); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.moveTo(Math.cos(a) * s * 0.06, s * 0.06 + Math.sin(a) * s * 0.06); g.arc(Math.cos(a) * s * 0.12, s * 0.06 + Math.sin(a) * s * 0.12, s * 0.035, 0, Math.PI * 2); } }
}
/** Yazma: krem zemin, kara bordür, 3×3 hücrede basılmış motifler; boyalı olanlar renkli */
export function drawYazma(g: CanvasRenderingContext2D, N: number, cells: Cell[], ground = '#efe6d2', border = true) {
  g.fillStyle = ground; g.fillRect(0, 0, N, N);
  const r = rng(11); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(150,130,100,${r() * 0.08})`; g.fillRect(r() * N, r() * N, 2, 2); }
  const m = N * 0.08, cs = (N - 2 * m) / 3;
  if (border) { g.strokeStyle = '#2a201a'; g.lineWidth = N * 0.012; g.strokeRect(m * 0.5, m * 0.5, N - m, N - m); g.lineWidth = N * 0.004; g.strokeRect(m * 0.8, m * 0.8, N - m * 1.6, N - m * 1.6);
    g.fillStyle = '#2a201a'; for (let i = 0; i < 24; i++) { const t = (i + 0.5) / 24; for (const [x, y] of [[t * N, m * 0.32], [t * N, N - m * 0.32], [m * 0.32, t * N], [N - m * 0.32, t * N]]) { g.beginPath(); g.arc(x, y, N * 0.006, 0, 7); g.fill(); } } }
  cells.forEach((cell, i) => { if (!cell.k) return; const cx = m + cs * ((i % 3) + 0.5), cy = m + cs * (Math.floor(i / 3) + 0.5); g.save(); g.translate(cx, cy);
    if (cell.c) { g.fillStyle = hex(cell.c); motifPath(g, cell.k, cs * 0.92); g.fill('evenodd'); }
    g.strokeStyle = '#2a201a'; g.lineWidth = Math.max(1.5, N * 0.006); motifPath(g, cell.k, cs * 0.92); g.stroke(); g.restore(); });
}
export const TARGET_CELLS: Cell[] = TARGET.map((t) => ({ k: t.k, c: t.c }));
/** Örnek yazmanın küçük resmi (arayüz için) */
export function targetDataUrl(): string { const c = document.createElement('canvas'); c.width = c.height = 160; drawYazma(c.getContext('2d')!, 160, TARGET_CELLS); return c.toDataURL(); }

/* ===================== malzemeler ===================== */
export interface Mats { wall: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; beam: THREE.MeshStandardMaterial; felt: THREE.MeshStandardMaterial; win: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const wl = canvasTex(256, 256, (g, r) => { g.fillStyle = '#ece4d4'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '200,185,160' : '255,250,240'},${0.15 + r() * 0.15})`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, 7); g.fill(); } });
    const fl = canvasTex(256, 256, (g, r) => { for (let y = 0; y < 256; y += 32) { const v = r(); g.fillStyle = `rgb(${110 + v * 30 | 0},${76 + v * 20 | 0},${48 + v * 12 | 0})`; g.fillRect(0, y, 256, 31); g.fillStyle = 'rgba(30,20,10,.6)'; g.fillRect(0, y + 31, 256, 1); for (let k = 0; k < 16; k++) { g.fillStyle = 'rgba(60,40,25,.25)'; g.fillRect(r() * 256, y + r() * 30, 30 + r() * 60, 1); } } }); fl.repeat.set(3, 3);
    const wn = canvasTex(128, 128, (g) => { g.fillStyle = '#5b3b24'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#e8f0f3'; g.fillRect(8, 8, 52, 112); g.fillRect(68, 8, 52, 112); g.strokeStyle = '#5b3b24'; g.lineWidth = 4; g.beginPath(); g.moveTo(8, 64); g.lineTo(120, 64); g.stroke(); });
    return {
      wall: new THREE.MeshStandardMaterial({ map: wl, roughness: 0.95, side: THREE.DoubleSide }),
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.75 }),
      wood: new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.7 }),
      beam: new THREE.MeshStandardMaterial({ color: '#4e3420', roughness: 0.8 }),
      felt: new THREE.MeshStandardMaterial({ color: '#6e5a48', roughness: 1 }),
      win: new THREE.MeshStandardMaterial({ map: wn, emissive: '#f4f1e8', emissiveIntensity: 0.7, roughness: 0.3 }),
    };
  }, []);
}

/* ===================== oda ===================== */
export function Room({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const { x0, x1, z0, z1, h } = ROOM, W = x1 - x0, D = z1 - z0, walls: THREE.BufferGeometry[] = [], beams: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [];
    walls.push(at(bx(W, h, 0.3, 3), 0, h / 2, z0 - 0.15), at(bx(0.3, h, D, 3), x0 - 0.15, h / 2, 0));
    // doğu duvarı: pencere boşluğu
    walls.push(at(bx(0.3, 1.0, D, 3), x1 + 0.15, 0.5, 0), at(bx(0.3, h - 2.4, D, 3), x1 + 0.15, 2.4 + (h - 2.4) / 2, 0), at(bx(0.3, 1.4, D / 2 - 1.1, 3), x1 + 0.15, 1.7, z0 + (D / 2 - 1.1) / 2), at(bx(0.3, 1.4, D / 2 - 1.1, 3), x1 + 0.15, 1.7, z1 - (D / 2 - 1.1) / 2));
    // güney duvarı: kapı
    walls.push(at(bx(W / 2 - 0.8, h, 0.3, 3), x0 + (W / 2 - 0.8) / 2, h / 2, z1 + 0.15), at(bx(W / 2 - 0.8, h, 0.3, 3), x1 - (W / 2 - 0.8) / 2, h / 2, z1 + 0.15), at(bx(1.6, h - 2.2, 0.3, 3), 0, 2.2 + (h - 2.2) / 2, z1 + 0.15));
    walls.push(at(bx(W + 0.6, 0.2, D + 0.6, 3), 0, h + 0.1, 0));
    for (let x = x0 + 0.8; x < x1; x += 1.6) beams.push(at(new THREE.BoxGeometry(0.2, 0.22, D), x, h - 0.11, 0));
    // kapı kanadı (aralık) ve raflar
    wood.push(at(new THREE.BoxGeometry(0.06, 2.15, 0.8), 0.78, 1.08, z1 - 0.25));
    for (const y of [0.9, 1.5, 2.1]) wood.push(at(bx(W - 1.2, 0.05, 0.45, 2), 0.2, y, z0 + 0.25), at(bx(0.45, 0.05, 5.2, 2), x0 + 0.25, y, -1.2));
    for (const s of [-1, 1]) wood.push(at(new THREE.BoxGeometry(0.06, 2.2, 0.45), s * (W / 2 - 0.62) + 0.2, 1.1, z0 + 0.25));
    const floor = new THREE.PlaneGeometry(W, D); floor.rotateX(-Math.PI / 2); floor.translate(0, 0, 0);
    const win = at(new THREE.PlaneGeometry(2.2, 1.4).rotateY(-Math.PI / 2), x1 + 0.02, 1.7, 0);
    // kapının dışı: küçük avlu (taş döşeme, alçak duvarlar), karşıda sıvalı komşu ev ve kiremit çatısı; kapıdan bakınca boşluk görünmesin
    const yard = new THREE.PlaneGeometry(14, 9); yard.rotateX(-Math.PI / 2); const yu = yard.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < yu.count; i++) yu.setXY(i, yu.getX(i) * 4, yu.getY(i) * 3); yard.translate(0, -0.01, z1 + 4.8);
    walls.push(at(bx(12, 5.6, 2, 3), 0, 2.8, z1 + 7.2));
    for (const s of [-1, 1]) walls.push(at(bx(0.4, 2.2, 6, 3), s * 5.4, 1.1, z1 + 3.2));
    const roof = new THREE.CylinderGeometry(0.01, 3, 1.8, 4, 1); roof.rotateY(Math.PI / 4); roof.scale(13.2 / 4.24, 1, 3.6 / 4.24); roof.translate(0, 5.6 + 0.9, z1 + 7.2);
    const ywin = [-3.5, 0, 3.5].map((x) => at(new THREE.PlaneGeometry(1.1, 1.4).rotateY(Math.PI), x, 3.4, z1 + 6.18));
    return { walls: merge(walls), beams: merge(beams), wood: merge(wood), floor, win: merge([win, ...ywin]), yard, roof };
  }, []);
  return <group>
    <mesh geometry={g.walls} material={m.wall} receiveShadow castShadow />
    <mesh geometry={g.beams} material={m.beam} castShadow />
    <mesh geometry={g.wood} material={m.wood} castShadow receiveShadow />
    <mesh geometry={g.floor} material={m.floor} receiveShadow />
    <mesh geometry={g.win} material={m.win} />
    <mesh geometry={g.yard} receiveShadow><meshStandardMaterial color="#9a9284" roughness={0.95} /></mesh>
    <mesh geometry={g.roof} castShadow><meshStandardMaterial color="#9c4a32" roughness={0.85} /></mesh>
  </group>;
}
/** Raflarda ıhlamur kalıplar (üstleri oyma desenli), tezgâh yanında boya kapları */
export function Tools({ m }: { m: Mats }) {
  const top = useMemo(() => canvasTex(128, 128, (g, r) => { g.fillStyle = '#c8a77a'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#6b4c2e'; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.save(); g.translate(32 + (i % 2) * 64, 32 + Math.floor(i / 2) * 64); g.rotate(r() * 3); motifPath(g, (['gul', 'yaprak', 'nar'] as KalipId[])[i % 3], 56); g.stroke(); g.restore(); } }), []);
  const g = useMemo(() => { const r = rng(5), blocks: THREE.BufferGeometry[] = [], handles: THREE.BufferGeometry[] = [];
    for (const y of [0.9, 1.5, 2.1]) for (let x = ROOM.x0 + 1.1; x < ROOM.x1 - 1; x += 0.42 + r() * 0.2) { const s = 0.18 + r() * 0.14; blocks.push(at(new THREE.BoxGeometry(s, 0.07, s), x, y + 0.06, ROOM.z0 + 0.25 + (r() - 0.5) * 0.1)); handles.push(at(new THREE.CylinderGeometry(0.025, 0.03, 0.08, 8), x, y + 0.13, ROOM.z0 + 0.25)); }
    for (const y of [0.9, 1.5]) for (let z = -3.4; z < 1.2; z += 0.5 + r() * 0.2) { const s = 0.2 + r() * 0.12; blocks.push(at(new THREE.BoxGeometry(s, 0.07, s), ROOM.x0 + 0.25, y + 0.06, z)); }
    return { blocks: merge(blocks), handles: merge(handles) }; }, []);
  return <group>
    <mesh geometry={g.blocks} castShadow receiveShadow><meshStandardMaterial map={top} roughness={0.8} /></mesh>
    <mesh geometry={g.handles} material={m.beam} />
    {COLORS.map((c, i) => <group key={c.id} position={[BENCH.x + BENCH.w / 2 - 0.25, BENCH.h + 0.04, BENCH.z - 0.6 + i * 0.4]}>
      <mesh castShadow><cylinderGeometry args={[0.13, 0.1, 0.08, 16]} /><meshStandardMaterial color="#d9d2c4" roughness={0.6} /></mesh>
      <mesh position={[0, 0.035, 0]}><circleGeometry args={[0.115, 16]} /><meshStandardMaterial color={c.hex} roughness={0.3} /></mesh>
    </group>)}
  </group>;
}
/** Baskı tezgâhı ve üstündeki bez (kumaş durumundan çizilir); onCell: dokunulan hücre */
export function Bench({ m, cloth, onCell }: { m: Mats; cloth: Cell[]; onCell: (i: number) => void }) {
  const tex = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 1024; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }, []);
  useEffect(() => { const c = tex.image as HTMLCanvasElement; drawYazma(c.getContext('2d')!, 1024, cloth); tex.needsUpdate = true; }, [cloth, tex]);
  const g = useMemo(() => { const legs: THREE.BufferGeometry[] = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) legs.push(at(new THREE.BoxGeometry(0.1, BENCH.h - 0.06, 0.1), BENCH.x + sx * (BENCH.w / 2 - 0.12), (BENCH.h - 0.06) / 2, BENCH.z + sz * (BENCH.d / 2 - 0.12))); return merge(legs); }, []);
  const S = 1.3;
  return <group>
    <mesh position={[BENCH.x, BENCH.h - 0.03, BENCH.z]} material={m.wood} castShadow receiveShadow><boxGeometry args={[BENCH.w, 0.06, BENCH.d]} /></mesh>
    <mesh position={[BENCH.x - 0.15, BENCH.h + 0.005, BENCH.z]} material={m.felt} receiveShadow><boxGeometry args={[S + 0.2, 0.01, S + 0.2]} /></mesh>
    <mesh geometry={g} material={m.wood} castShadow />
    <mesh position={[BENCH.x - 0.15, BENCH.h + 0.012, BENCH.z]} rotation-x={-Math.PI / 2} receiveShadow
      onPointerDown={(e) => { if (!e.uv) return; e.stopPropagation(); const mm = 0.08, u = (e.uv.x - mm) / (1 - 2 * mm), v = 1 - (e.uv.y - mm) / (1 - 2 * mm) - 1e-6; const v2 = (e.uv.y - mm) / (1 - 2 * mm); void v; if (u < 0 || u >= 1 || v2 < 0 || v2 >= 1) return; const col = Math.floor(u * 3), row = Math.floor((1 - v2) * 3); onCell(row * 3 + col); }}>
      <planeGeometry args={[S, S]} /><meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  </group>;
}
/** İplerde kuruyan yazmalar ve duvarda örnek yazma */
export function Hanging() {
  const texs = useMemo(() => { const r = rng(21), out: THREE.CanvasTexture[] = []; const grounds = ['#efe6d2', '#f3e9e0', '#e9dfc9'];
    for (let n = 0; n < 6; n++) { const c = document.createElement('canvas'); c.width = c.height = 256; const cells: Cell[] = TARGET.map(() => { const ks: KalipId[] = ['gul', 'yaprak', 'nar'], cs: ColorId[] = ['kirmizi', 'yesil', 'sari', 'lacivert']; return { k: ks[(r() * 3) | 0], c: cs[(r() * 4) | 0] }; }); drawYazma(c.getContext('2d')!, 256, cells, grounds[n % 3]); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; out.push(t); }
    const c = document.createElement('canvas'); c.width = c.height = 512; drawYazma(c.getContext('2d')!, 512, TARGET_CELLS); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; out.push(t); return out; }, []);
  const rope = useMemo(() => merge([at(new THREE.CylinderGeometry(0.008, 0.008, 6, 6).rotateZ(Math.PI / 2), 0.4, 2.96, 2.2), at(new THREE.CylinderGeometry(0.008, 0.008, 6, 6).rotateZ(Math.PI / 2), 0.4, 2.96, 0.6)]), []);
  return <group>
    <mesh geometry={rope}><meshStandardMaterial color="#6b5a48" /></mesh>
    {texs.slice(0, 6).map((t, i) => <mesh key={i} position={[-2 + (i % 3) * 1.6 + (i > 2 ? 0.6 : 0), 2.42, i > 2 ? 0.6 : 2.2]} rotation-y={0.02 * i}>
      <planeGeometry args={[1.0, 1.0]} /><meshStandardMaterial map={t} side={THREE.DoubleSide} roughness={0.95} />
    </mesh>)}
    {/* örnek yazma: tezgâhın arkasındaki duvarda, çerçeveli */}
    <mesh position={[BENCH.x - 0.15, 2.55, ROOM.z0 + 0.03]}><planeGeometry args={[0.95, 0.95]} /><meshStandardMaterial map={texs[6]} roughness={0.9} /></mesh>
  </group>;
}
