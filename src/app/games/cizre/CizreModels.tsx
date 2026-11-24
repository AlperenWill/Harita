/**
 * Cizre Kırmızı Medrese — 3B modeller: avlunun çevresinde altı taş, üstü kırmızı tuğla kanatlar; kuzeyde eyvanlı cami ve tuğla kubbe,
 * batıda küçük kubbeli türbe, doğu ve batıda öğrenci odalarının kemerli kapıları, güneyde taç kapı; avludaki üç tuğla pano.
 * Ölçüler, oda düzeni ve tuğla desenleri TEMSİLÎDİR (docs/CIZRE.md).
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { COURT, GATE, PATCHES, SHELL_RECT, STONE_H, WALL_H, type Dir, type Patch } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s = 2) => { if (x1 - x0 < 0.01 || z1 - z0 < 0.01 || y1 - y0 < 0.01) return; const g = bx(x1 - x0, y1 - y0, z1 - z0, s); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); p.push(g); };
function arch(w: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r; s.moveTo(-r, 0); s.lineTo(-r, sp); s.absarc(0, sp, r, Math.PI, 0, true); s.lineTo(r, 0); s.closePath(); return s; }
const S = SHELL_RECT, C = COURT;

export interface Mats { brick: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; pave: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const brick = canvasTex(256, 256, (g, r) => { g.fillStyle = '#cdb9a0'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = -((y / 16) % 2) * 16; x < 256; x += 32) { const v = 0.82 + r() * 0.3; g.fillStyle = `rgb(${(168 * v) | 0},${(72 * v) | 0},${(52 * v) | 0})`; g.fillRect(x + 1.5, y + 1.5, 29, 13); } for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); } });
    const st = stoneTex('cizre-moloz', ['#a69a86', '#9a8e7a', '#b2a690', '#8f8470'], [22, 20], [30, 40]);
    const pave = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9c8f7c'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) { const v = 0.85 + r() * 0.25; g.fillStyle = `rgb(${(190 * v) | 0},${(176 * v) | 0},${(150 * v) | 0})`; g.fillRect(x + 2, y + 2, 28, 28); } });
    pave.repeat.set(14, 14);
    return {
      brick: weather(new THREE.MeshStandardMaterial({ map: brick, roughness: 0.9 })),
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.6, roughness: 0.94 })),
      dark: new THREE.MeshStandardMaterial({ color: '#2a1d16', roughness: 1 }),
      pave: new THREE.MeshStandardMaterial({ map: pave, roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#5b3f28', roughness: 0.85 }),
    };
  }, []);
}

/** Kanatlar: dört yanda oda sıraları (avluya bakan yüzde kemerli kapılar), kuzeyde cami ve kubbe, batıda türbe, güneyde taç kapı */
export function Madrasa({ m }: { m: Mats }) {
  const g = useMemo(() => { const stone: Parts = [], brick: Parts = [], dark: Parts = [], gx = GATE.w / 2;
    const block = (x0: number, x1: number, z0: number, z1: number, h = WALL_H) => { slab(stone, x0, x1, z0, z1, -0.5, STONE_H, 2.5); slab(brick, x0, x1, z0, z1, STONE_H, h, 2); slab(stone, x0 - 0.1, x1 + 0.1, z0 - 0.1, z1 + 0.1, h, h + 0.3, 1.5); };
    block(S.x0, C.x0, S.z0, S.z1); block(C.x1, S.x1, S.z0, S.z1);   // batı, doğu kanatları
    block(C.x0, C.x1, S.z0, C.z0, WALL_H + 1.2);   // kuzey: cami
    block(C.x0, -gx, C.z1, S.z1); block(gx, C.x1, C.z1, S.z1); slab(brick, -gx, gx, C.z1, S.z1, 4.2, WALL_H, 2); slab(stone, -gx - 0.1, gx + 0.1, C.z1 - 0.1, S.z1 + 0.1, WALL_H, WALL_H + 0.3, 1.5);   // güney ve kapı üstü
    // taç kapı çerçevesi (dışa taşan)
    slab(stone, -3.4, 3.4, S.z1, S.z1 + 0.8, -0.5, WALL_H + 1.6, 2);
    { const a = new THREE.ShapeGeometry(arch(GATE.w, 4.2), 10); a.translate(0, 0, S.z1 + 0.82); dark.push(a); }
    // avluya bakan kemerli kapılar
    const door = (x: number, z: number, ry: number, w = 1.4, h = 2.6) => { const d = new THREE.ShapeGeometry(arch(w, h), 8); d.rotateY(ry); d.translate(x, 0, z); dark.push(d); };
    for (const z of [-5, -2, 2, 5]) { if (z !== 2) door(C.x1 - 0.02, z, -Math.PI / 2); if (Math.abs(z - 5) > 0.1 && Math.abs(z + 2) > 0.1) door(C.x0 + 0.02, z, Math.PI / 2); }
    door(C.x0 + 0.02, 5, Math.PI / 2, 1.8, 3.2);   // türbe kapısı
    door(0, C.z0 + 0.02, 0, 5, 6.2);   // cami eyvanı
    door(-7, C.z0 + 0.02, 0, 1.4, 2.6);
    // üst kat pencereleri (avlu yüzleri)
    for (const z of [-5, 5]) for (const [x, ry] of [[C.x1 - 0.02, -Math.PI / 2], [C.x0 + 0.02, Math.PI / 2]] as const) { const w = new THREE.ShapeGeometry(arch(0.8, 1.3), 6); w.rotateY(ry); w.translate(x, 4.6, z); dark.push(w); }
    return { stone: merge(stone), brick: merge(brick), dark: merge(dark) }; }, []);
  // cami kubbesi ve türbe kubbesi (tuğla), kasnaklar
  const domes = useMemo(() => { const p: Parts = [];
    const dome = (x: number, z: number, r: number, y: number) => { const drum = new THREE.CylinderGeometry(r, r, 1.2, 8); drum.rotateY(Math.PI / 8); drum.translate(x, y + 0.6, z); p.push(drum); const d = new THREE.SphereGeometry(r * 0.96, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2); d.translate(x, y + 1.2, z);
      const uv = d.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 3, uv.getY(i) * r * 0.8); p.push(d); };
    dome(0, (S.z0 + C.z0) / 2, 4.2, WALL_H + 1.5); dome((S.x0 + C.x0) / 2, 5, 2.2, WALL_H + 0.3);
    return merge(p); }, []);
  return <group>
    <mesh geometry={g.stone} material={m.stone} castShadow receiveShadow />
    <mesh geometry={g.brick} material={m.brick} castShadow receiveShadow />
    <mesh geometry={g.dark} material={m.dark} />
    <mesh geometry={domes} material={m.brick} castShadow receiveShadow />
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, (C.z0 + C.z1) / 2]} receiveShadow><planeGeometry args={[C.x1 - C.x0, C.z1 - C.z0]} /><primitive object={m.pave} attach="material" /></mesh>
  </group>;
}

/* ===================== tuğla panoları ===================== */
/** Pano çizimi (tuval ve oyun içi panel için ortak): eksik ve seçilmiş tuğlalar */
export function drawPatch(g: CanvasRenderingContext2D, p: Patch, picks: Record<string, Dir>, W: number, H: number, sel?: string) {
  const cw = W / p.cols, ch = H / p.rows; g.fillStyle = '#d8c4a6'; g.fillRect(0, 0, W, H);
  for (let c = 0; c < p.cols; c++) for (let r = 0; r < p.rows; r++) {
    const key = `${p.id}:${c}:${r}`, miss = p.missing.some(([a, b]) => a === c && b === r), d = miss ? picks[key] : p.orient(c, r), x = c * cw, y = r * ch;
    if (miss && !d) { g.fillStyle = '#2a1d16'; g.fillRect(x + 3, y + 3, cw - 6, ch - 6); }
    if (d) { g.save(); g.translate(x + cw / 2, y + ch / 2); const L = Math.min(cw, ch) * (d === '/' || d === '\\' ? 1.05 : 0.86), T = Math.min(cw, ch) * 0.3;
      g.rotate(d === '—' ? 0 : d === '|' ? Math.PI / 2 : d === '/' ? -Math.PI / 4 : Math.PI / 4); g.fillStyle = miss ? '#c2603f' : '#a5482f'; g.fillRect(-L / 2, -T / 2, L, T); g.strokeStyle = 'rgba(60,20,10,0.5)'; g.lineWidth = 2; g.strokeRect(-L / 2, -T / 2, L, T); g.restore(); }
    if (miss && sel === key) { g.strokeStyle = '#ffd27a'; g.lineWidth = 5; g.strokeRect(x + 3, y + 3, cw - 6, ch - 6); }
  }
}
export function Patches({ picks, solved }: { picks: Record<string, Dir>; solved: string[] }) {
  const items = useMemo(() => PATCHES.map((p) => { const c = document.createElement('canvas'); c.width = 384; c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { p, c, t }; }), []);
  useEffect(() => { for (const it of items) { drawPatch(it.c.getContext('2d')!, it.p, picks, 384, 256); it.t.needsUpdate = true; } }, [items, picks]);
  return <group>{items.map(({ p, t }) => { const n = new THREE.Vector3(Math.sin(p.rotY), 0, Math.cos(p.rotY)), pos = new THREE.Vector3(...p.face).addScaledVector(n, 0.03);
    return <group key={p.id} position={pos} rotation-y={p.rotY}>
      <mesh><planeGeometry args={[2.4, 1.6]} /><meshStandardMaterial map={t} roughness={0.85} /></mesh>
      <mesh position={[0, 0, -0.02]}><planeGeometry args={[2.7, 1.9]} /><meshStandardMaterial color={solved.includes(p.id) ? '#c9a46a' : '#6b5446'} roughness={0.9} /></mesh>
    </group>; })}</group>;
}

/* ===================== çevre ===================== */
export function Ground() {
  const tex = useMemo(() => groundTex(), []);
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow userData={{ noCast: true }}><planeGeometry args={[1200, 1200]} /><meshStandardMaterial color="#b7a37c" map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh>
  </group>;
}
/** Çevre: düz damlı evler (yürünmez, uzakta) */
export function Town({ m }: { m: Mats }) {
  const geo = useMemo(() => { const r = rng(9), p: Parts = []; for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 34 + r() * 90, x = Math.cos(a) * d, z = Math.sin(a) * d; if (z > 0 && Math.abs(x) < 26 && z < 40) continue; const w = 6 + r() * 6, dd = 6 + r() * 5, h = 3.5 + r() * 4; slab(p, x - w / 2, x + w / 2, z - dd / 2, z + dd / 2, -0.3, h, 2.5); } return merge(p); }, []);
  return <mesh geometry={geo} material={m.stone} castShadow receiveShadow />;
}
export function Hills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 8; i++) { const a = Math.PI * (i / 4) + r() * 0.3, dd = 900 + r() * 400; out.push({ p: [Math.cos(a) * dd, -10, Math.sin(a) * dd], g: mountainGeo(420 + r() * 220, 140 + r() * 140, 60 + i, 2, '#8f8064') }); }
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
