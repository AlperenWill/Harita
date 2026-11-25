/**
 * Mudurnu — 3B modeller: Arnavut kaldırımlı çarşı zemini, Orta Çarşı meydanı ve çınar, doğuya uzanan arasta (iki yanda tek katlı
 * dükkânlar: taş yan duvarlar, ahşap kepenk ve tezgâh, sokağa taşan kiremit saçak, önlerinde mallar), Yıldırım Bayezid Camii
 * (tek kubbe, revaklı son cemaat yeri, minare), çok kubbeli hamam, taş zemin katlı ve ahşap karkaslı, üst katı taşan ahşap konaklar.
 * Çevrede ormanlı tepeler. Biçimler ve ölçüler TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { archGeo, bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { ARASTA, BOUNDS, HAMAM, KONAKS, MINARET, MOSQUE, SHOPS, TREE, shopRect, type Rect } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => { const n = g.index ? g.toNonIndexed() : g; if (!n.attributes.normal) n.computeVertexNormals(); if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; }))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

export interface Mats { stone: THREE.MeshStandardMaterial; plaster: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; roof: THREE.MeshStandardMaterial; lead: THREE.MeshStandardMaterial; cobble: THREE.MeshStandardMaterial; grass: THREE.MeshStandardMaterial; copper: THREE.MeshStandardMaterial; leaf: THREE.MeshStandardMaterial; bark: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('mudurnu-tas', ['#a49a86', '#b0a690', '#978d7a', '#bab09a', '#a0937c'], [20, 14], [30, 36]);
    const cb = canvasTex(256, 256, (g, r) => { g.fillStyle = '#6f6a60'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 18) for (let x = (y / 18) % 2 ? -9 : 0; x < 256; x += 18) { const v = 118 + r() * 50 | 0; g.fillStyle = `rgb(${v},${v - 5},${v - 12})`; g.beginPath(); g.ellipse(x + 9, y + 9, 7.5 + r() * 1.5, 7 + r() * 1.5, r() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,35,30,.5)'; g.lineWidth = 1.4; g.stroke(); } });
    const gr = canvasTex(128, 128, (g, r) => { g.fillStyle = '#6a8346'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${50 + r() * 60 | 0},${85 + r() * 60 | 0},${30 + r() * 20 | 0},.7)`; g.fillRect(r() * 128, r() * 128, 2, 3); } });
    const tile = canvasTex(256, 256, (g, r) => { g.fillStyle = '#7c3a28'; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < 256; x += 16) { const v = r(); g.fillStyle = `rgb(${150 + v * 40 | 0},${70 + v * 25 | 0},${48 + v * 15 | 0})`; g.beginPath(); g.ellipse(x + 8, y + 10, 7, 9, 0, 0, Math.PI); g.fill(); } });
    const pl = canvasTex(128, 128, (g, r) => { g.fillStyle = '#f1ece2'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${200 + r() * 40 | 0},${190 + r() * 40 | 0},${175 + r() * 40 | 0},.25)`; g.fillRect(r() * 128, r() * 128, 3, 3); } });
    const wd = canvasTex(64, 256, (g, r) => { g.fillStyle = '#6b4a30'; g.fillRect(0, 0, 64, 256); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${40 + r() * 30 | 0},${25 + r() * 20 | 0},15,.35)`; g.beginPath(); const x = r() * 64; g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, 256); g.stroke(); } });
    cb.repeat.set(1, 1);
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 })),
      plaster: new THREE.MeshStandardMaterial({ map: pl, roughness: 0.92 }),
      wood: new THREE.MeshStandardMaterial({ map: wd, roughness: 0.85 }),
      dark: new THREE.MeshStandardMaterial({ color: '#2c241d', roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8 }),
      lead: new THREE.MeshStandardMaterial({ color: '#8d9298', roughness: 0.55, metalness: 0.35 }),
      cobble: new THREE.MeshStandardMaterial({ map: cb, roughness: 0.95 }),
      grass: new THREE.MeshStandardMaterial({ map: gr, roughness: 1 }),
      copper: new THREE.MeshStandardMaterial({ color: '#b8683c', roughness: 0.35, metalness: 0.75 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#4f7a36', roughness: 0.95 }),
      bark: new THREE.MeshStandardMaterial({ color: '#7a6a58', roughness: 1 }),
    };
  }, []);
}

/** Dünya ölçekli UV'li zemin: kaldırım (sınırlar içinde) ve çimen (dışında), çevrede ormanlı tepeler */
export function Ground({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const W = BOUNDS.x1 - BOUNDS.x0, D = BOUNDS.z1 - BOUNDS.z0, cx = (BOUNDS.x0 + BOUNDS.x1) / 2, cz = (BOUNDS.z0 + BOUNDS.z1) / 2;
    const pave = new THREE.PlaneGeometry(W, D); pave.rotateX(-Math.PI / 2); pave.translate(cx, 0, cz);
    const u = pave.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * W / 2.2, u.getY(i) * D / 2.2);
    const grass = new THREE.PlaneGeometry(900, 900, 60, 60); grass.rotateX(-Math.PI / 2); const p = grass.attributes.position as THREE.BufferAttribute, gu = grass.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), out = Math.max(0, Math.abs(x - cx) - W / 2 - 4, Math.abs(z - cz) - D / 2 - 4); p.setY(i, -0.03 + Math.pow(out, 1.25) * 0.18); gu.setXY(i, gu.getX(i) * 180, gu.getY(i) * 180); }
    grass.computeVertexNormals();
    return { pave, grass };
  }, []);
  const mts = useMemo(() => [
    { p: [-300, -8, -160] as [number, number, number], g: mountainGeo(200, 150, 3, 0, '#4f6a3c') }, { p: [260, -8, -230] as [number, number, number], g: mountainGeo(220, 170, 5, 0, '#4a663a') },
    { p: [0, -8, -380] as [number, number, number], g: mountainGeo(260, 190, 7, 0, '#4a663a') }, { p: [-280, -8, 260] as [number, number, number], g: mountainGeo(220, 130, 9, 0, '#56703f') }, { p: [300, -8, 240] as [number, number, number], g: mountainGeo(220, 140, 11, 0, '#56703f') },
  ], []);
  return <group userData={{ noCast: true }}>
    <mesh geometry={g.pave} material={m.cobble} position={[0, 0.005, 0]} receiveShadow />
    <mesh geometry={g.grass} material={m.grass} receiveShadow />
    {mts.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}
  </group>;
}

/** Kırma (piramit) çatı: dikdörtgen tabana oturan dört eğimli yüz */
function hipRoof(cx: number, cz: number, w: number, d: number, y: number, h: number) { const c = new THREE.ConeGeometry(Math.SQRT2, 1, 4, 1); c.rotateY(Math.PI / 4); c.scale(w / 2, h, d / 2); const u = c.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * w / 3, u.getY(i) * h * 1.2); return at(c, cx, y + h / 2, cz); }
/** Cephe öğesi: yüzün (dış normal yönü) önüne çok az taşan kutu */
type Face = { cx: number; cz: number; nx: number; nz: number; len: number };
function faces(x0: number, z0: number, x1: number, z1: number): Face[] { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  return [{ cx, cz: z1, nx: 0, nz: 1, len: w }, { cx, cz: z0, nx: 0, nz: -1, len: w }, { cx: x1, cz, nx: 1, nz: 0, len: d }, { cx: x0, cz, nx: -1, nz: 0, len: d }]; }
function onFace(f: Face, along: number, y: number, w: number, h: number, out: number, t = 0.08) { const b = bx(f.nx ? t : w, h, f.nx ? w : t, 1.2); const ax = f.nx ? 0 : 1, az = f.nx ? 1 : 0; return at(b, f.cx + ax * along + f.nx * (out + t / 2), y, f.cz + az * along + f.nz * (out + t / 2)); }

/** Konak: taş zemin kat, sokağa taşan sıvalı ve ahşap karkaslı üst kat(lar), pencereler, kırma çatı, geniş saçak */
function konak(r: Rect, seed: number, P: Record<'stone' | 'plaster' | 'wood' | 'dark' | 'roof', THREE.BufferGeometry[]>) {
  const rr = rng(seed), [x0, z0, x1, z1] = r, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, G = 2.8, F = 2.7, floors = rr() < 0.5 ? 2 : 1, o = 0.55;
  P.stone.push(at(bx(w, G, d, 3), cx, G / 2, cz));
  for (const f of faces(x0, z0, x1, z1)) { const L = f.len; for (let a = -L / 2 + 1.6; a < L / 2 - 1; a += 2.6) P.dark.push(onFace(f, a, 1.7, 0.7, 0.9, 0)); }
  // kapı: meydana en çok bakan yüzde
  const fs = faces(x0, z0, x1, z1), door = fs.reduce((b, f) => (-(f.cx * f.nx + f.cz * f.nz) / Math.hypot(f.cx, f.cz) > -(b.cx * b.nx + b.cz * b.nz) / Math.hypot(b.cx, b.cz) ? f : b));
  P.wood.push(onFace(door, 0, 1.1, 1.5, 2.2, 0, 0.1));
  for (let k = 0; k < floors; k++) {
    const y = G + k * F, X0 = x0 - o, Z0 = z0 - o, X1 = x1 + o, Z1 = z1 + o;
    P.plaster.push(at(bx(w + 2 * o, F, d + 2 * o, 3), cx, y + F / 2, cz));
    // kat kirişi (hatıl) ve köşe dikmeleri
    P.wood.push(at(bx(w + 2 * o + 0.1, 0.22, d + 2 * o + 0.1, 2), cx, y + 0.11, cz)); P.wood.push(at(bx(w + 2 * o + 0.1, 0.16, d + 2 * o + 0.1, 2), cx, y + F - 0.08, cz));
    for (const f of faces(X0, Z0, X1, Z1)) {
      const L = f.len; for (const a of [-L / 2 + 0.1, L / 2 - 0.1]) P.wood.push(onFace(f, a, y + F / 2, 0.2, F, 0));
      for (let a = -L / 2 + 1.4; a < L / 2 - 0.9; a += 1.8) { P.wood.push(onFace(f, a, y + 1.45, 1.0, 1.5, 0)); P.dark.push(onFace(f, a, y + 1.45, 0.78, 1.28, 0.05)); P.wood.push(onFace(f, a, y + 1.45, 0.06, 1.28, 0.1)); }
    }
    // çıkma altı ahşap konsollar
    if (k === 0) for (const f of faces(x0, z0, x1, z1)) for (let a = -f.len / 2 + 0.6; a < f.len / 2; a += 1.4) P.wood.push(onFace(f, a, G - 0.15, 0.14, 0.3, 0, o));
  }
  const top = G + floors * F, eave = 1.0;
  P.wood.push(at(bx(w + 2 * o + 2 * eave, 0.12, d + 2 * o + 2 * eave, 2), cx, top + 0.06, cz));
  P.roof.push(hipRoof(cx, cz, w + 2 * o + 2 * eave, d + 2 * o + 2 * eave, top + 0.12, 2.4 + rr() * 0.6));
}

/** Arasta dükkânı: üç yanı taş, sokağa bakan ahşap cephe (kepenk, tezgâh), saçak; önünde zanaatına göre mallar */
function shop(s: { x: number; side: 1 | -1 }, i: number, P: Record<'stone' | 'plaster' | 'wood' | 'dark' | 'roof' | 'copper', THREE.BufferGeometry[]>) {
  const [x0, z0, x1, z1] = shopRect(s), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, H = 3.3, fz = s.side * ARASTA.hw, n = -s.side;
  P.stone.push(at(bx(w, H, d, 3), cx, H / 2, cz));
  P.plaster.push(at(bx(w - 0.2, 0.9, 0.1), cx, H - 0.5, fz + n * 0.05));
  // ahşap cephe: dikmeler, açık dükkân ağzı (karanlık), tezgâh, yukarı açılmış kepenk
  for (const a of [-w / 2 + 0.15, w / 2 - 0.15, 0]) P.wood.push(at(bx(0.22, H - 0.9, 0.16), cx + a, (H - 0.9) / 2, fz + n * 0.08));
  P.dark.push(at(bx(w - 0.6, 2.1, 0.06), cx, 1.45, fz + n * 0.03));
  P.wood.push(at(bx(w - 0.4, 0.85, 0.55), cx, 0.43, fz + n * 0.28));
  { const k = bx(w - 0.4, 0.05, 0.9); k.rotateX(-s.side * 0.5); P.wood.push(at(k, cx, 2.7, fz + n * 0.45)); }
  // sokağa taşan kiremit saçak (tek eğim)
  { const r = bx(w + 0.1, 0.1, d + 1.4, 3); r.rotateX(s.side * 0.22); P.roof.push(at(r, cx, H + 0.25, cz + n * 0.5)); }
  // mallar
  const rr = rng(40 + i), kind = i % 4;
  if (kind === 0) for (let k = 0; k < 4; k++) P.copper.push(at(new THREE.SphereGeometry(0.16 + rr() * 0.08, 10, 8), cx - 1.6 + k * 1.05, 1.0, fz + n * 0.3));
  if (kind === 1) for (let k = 0; k < 3; k++) P.copper.push(at(new THREE.CylinderGeometry(0.22, 0.3, 0.3, 12), cx - 1.2 + k * 1.2, 1.0, fz + n * 0.3));
  if (kind === 2) for (let k = 0; k < 5; k++) P.wood.push(at(bx(0.4, 0.25, 0.3), cx - 1.8 + k * 0.9, 1.0, fz + n * 0.3));
  if (kind === 3) for (let k = 0; k < 6; k++) P.copper.push(at(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), cx - 2 + k * 0.8, 2.3, fz + n * 0.6));
}

/** Arasta, konaklar, cami, hamam ve çınar: malzemeye göre birleştirilmiş geometri */
export function Town({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const P = { stone: [] as THREE.BufferGeometry[], plaster: [] as THREE.BufferGeometry[], wood: [] as THREE.BufferGeometry[], dark: [] as THREE.BufferGeometry[], roof: [] as THREE.BufferGeometry[], lead: [] as THREE.BufferGeometry[], copper: [] as THREE.BufferGeometry[], leaf: [] as THREE.BufferGeometry[], bark: [] as THREE.BufferGeometry[] };
    SHOPS.forEach((s, i) => shop(s, i, P));
    KONAKS.forEach((r, i) => konak(r, 11 + i * 7, P));
    // cami: harim (kare, tek kubbe), güneyde revaklı son cemaat yeri, minare
    { const [x0, z0, x1] = MOSQUE, hz1 = -24, w = x1 - x0, d = hz1 - z0, cx = (x0 + x1) / 2, cz = (z0 + hz1) / 2, H = 8;
      P.stone.push(at(bx(w, H, d, 3), cx, H / 2, cz));
      for (const y of [2.6, 5.4]) P.roof.push(at(bx(w + 0.06, 0.18, d + 0.06, 2), cx, y, cz));   // tuğla hatıllar
      P.stone.push(at(new THREE.CylinderGeometry(6.6, 6.9, 1.6, 8), cx, H + 0.8, cz));
      { const dm = new THREE.SphereGeometry(6.2, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2); P.lead.push(at(dm, cx, H + 1.6, cz)); }
      P.copper.push(at(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), cx, H + 8.4, cz));
      for (const f of faces(x0, z0, x1, hz1)) for (const a of [-4.2, 0, 4.2]) { if (f.nz === 1 && a === 0) continue; for (const y of [1.2, 4.2]) { const ar = archGeo(1.3, 2.2, true); if (f.nx) ar.rotateY(f.nx * Math.PI / 2); else if (f.nz < 0) ar.rotateY(Math.PI); P.dark.push(at(ar, f.cx + (f.nx ? f.nx * 0.03 : a), y, f.cz + (f.nz ? f.nz * 0.03 : a))); } }
      { const dr = archGeo(2.0, 3.6, true); P.dark.push(at(dr, cx, 0, hz1 + 0.03)); }
      // son cemaat yeri: 4 sütun, düz örtü üstünde üç küçük kubbe
      const pz = -21.2; for (const a of [-6.5, -2.2, 2.2, 6.5]) P.stone.push(at(new THREE.CylinderGeometry(0.32, 0.36, 4.2, 12), cx + a, 2.1, pz));
      P.stone.push(at(bx(w, 0.9, 4, 3), cx, 4.65, -22)); for (const a of [-4.4, 0, 4.4]) P.lead.push(at(new THREE.SphereGeometry(1.7, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), cx + a, 5.1, -22));
      const [mx, mz] = MINARET; P.stone.push(at(bx(2.4, 6, 2.4, 3), mx, 3, mz)); P.stone.push(at(new THREE.CylinderGeometry(0.95, 1.05, 14, 12), mx, 13, mz));
      P.stone.push(at(new THREE.CylinderGeometry(1.5, 1.1, 0.6, 14), mx, 17.6, mz)); P.wood.push(at(new THREE.CylinderGeometry(1.5, 1.5, 0.7, 14, 1, true), mx, 18.25, mz));
      P.stone.push(at(new THREE.CylinderGeometry(0.85, 0.95, 3, 12), mx, 19.6, mz)); P.lead.push(at(new THREE.ConeGeometry(1.0, 4.2, 12), mx, 23.2, mz)); }
    // hamam: alçak taş gövde, bir büyük ve birkaç küçük kubbe, güneyde kapı
    { const [x0, z0, x1, z1] = HAMAM, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, H = 4.2;
      P.stone.push(at(bx(w, H, d, 3), cx, H / 2, cz));
      P.stone.push(at(new THREE.CylinderGeometry(3.6, 3.6, 1, 8), cx - 2.5, H + 0.5, cz - 1)); P.lead.push(at(new THREE.SphereGeometry(3.4, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), cx - 2.5, H + 1, cz - 1));
      for (const [dx, dz] of [[3.6, -3], [3.6, 2.4], [-2.5, 4], [0.8, 4]] as [number, number][]) P.lead.push(at(new THREE.SphereGeometry(1.5, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), cx + dx, H, cz + dz));
      P.dark.push(at(archGeo(1.6, 2.6, false), cx, 0, z1 + 0.03)); }
    // çınar
    { const [tx, tz] = TREE; P.bark.push(at(new THREE.CylinderGeometry(0.75, 1.1, 6, 10), tx, 3, tz)); const r = rng(9);
      for (const [dx, dz] of [[1.4, 0.5], [-1.2, 0.8], [0.2, -1.4]] as [number, number][]) { const b = new THREE.CylinderGeometry(0.25, 0.4, 4, 7); b.rotateZ(-dx * 0.35); b.rotateX(dz * 0.35); P.bark.push(at(b, tx + dx * 0.9, 6.8, tz + dz * 0.9)); }
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rr = 3 + r() * 2.5, s = 2.8 + r() * 1.6; P.leaf.push(at(new THREE.IcosahedronGeometry(s, 1), tx + Math.cos(a) * rr, 8.5 + r() * 2.5, tz + Math.sin(a) * rr)); }
      P.leaf.push(at(new THREE.IcosahedronGeometry(4, 1), tx, 11, tz));
      const bench = new THREE.CylinderGeometry(2.1, 2.1, 0.45, 16, 1, true); P.wood.push(at(bench, tx, 0.22, tz)); }
    return Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v.length ? merge(v) : null])) as Record<keyof typeof P, THREE.BufferGeometry | null>;
  }, []);
  return <group>
    {(Object.keys(g) as (keyof typeof g)[]).map((k) => g[k] && <mesh key={k} geometry={g[k]!} material={m[k]} castShadow receiveShadow />)}
  </group>;
}
/** Çevredeki tepelerde ağaçlar (örnek çoğaltma): kasaba sınırlarının dışında */
export function Trees({ m, n }: { m: Mats; n: number }) {
  const geo = useMemo(() => {
    const r = rng(21), parts: THREE.BufferGeometry[] = [], W = (BOUNDS.x1 - BOUNDS.x0) / 2, D = (BOUNDS.z1 - BOUNDS.z0) / 2, cx = (BOUNDS.x0 + BOUNDS.x1) / 2, cz = (BOUNDS.z0 + BOUNDS.z1) / 2;
    for (let i = 0; i < n * 3 && parts.length < n; i++) { const x = cx + (r() - 0.5) * 320, z = cz + (r() - 0.5) * 300, out = Math.max(Math.abs(x - cx) - W - 4, Math.abs(z - cz) - D - 4); if (out < 2) continue;
      const y = Math.pow(out, 1.25) * 0.18 - 0.3, s = 1.6 + r() * 1.6, c = new THREE.ConeGeometry(s, s * 3, 7); parts.push(at(c, x, y + s * 1.5 + 1, z)); }
    return merge(parts);
  }, [n]);
  return <mesh geometry={geo} material={m.leaf} castShadow />;
}
