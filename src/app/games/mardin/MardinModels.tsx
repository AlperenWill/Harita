/**
 * Mardin — 3B modeller. Bal rengi kalker taşından kademeli kent dokusu (her kademe bir taş blok; güney yüzü evlerin cephesi: kemerli
 * pencereler, kapılar, eyvan nişleri; üstte alçak korkuluk), merdivenler ve bir abbara (tonozlu geçit), Zinciriye Medresesi (avlu,
 * revaklar, taç kapı, yıldız tonozlu hol, dilimli kubbeler), kayalık üstünde kale, aşağıda inen kent ve Mezopotamya ovası.
 * Ölçüler ve düzen TEMSİLÎDİR (docs/MARDIN.md).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { bx, mountainGeo, stoneTex, weather } from '../shared/scenery';
import { BOUNDS_Z, BUMP, BUMPS, COURT, DOMES, PLAIN_Y, PORTAL, STAIRS, STAIR_LEN, STAIR_W, STEP, ZIN, Z_BOT, Z_TOP, boundaryZ, levelY } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const SUN_DIR = new THREE.Vector3(0.35, 0.6, 0.72).normalize();
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, srgb = true, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
type Parts = THREE.BufferGeometry[];
const slab = (p: Parts, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, s = 3) => { if (x1 - x0 < 0.01 || z1 - z0 < 0.01 || y1 - y0 < 0.01) return; const g = bx(x1 - x0, y1 - y0, z1 - z0, s); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); p.push(g); };
/** Sivri kemer silüeti (taban 0'da, genişlik w, yükseklik h) */
function pointed(w: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r * 1.15; s.moveTo(-r, 0); s.lineTo(-r, sp); s.quadraticCurveTo(-r, sp + r * 0.95, 0, h); s.quadraticCurveTo(r, sp + r * 0.95, r, sp); s.lineTo(r, 0); s.closePath(); return s; }
/** Kemer köşeliği: dikdörtgenden kemer çıkarılmış tek çizgi (delik kenara değmez) */
function spandrel(w: number, H: number, h: number) { const s = new THREE.Shape(), r = w / 2, sp = h - r * 1.15; s.moveTo(-r, 0); s.lineTo(-r, H); s.lineTo(r, H); s.lineTo(r, 0); s.lineTo(r, sp); s.quadraticCurveTo(r, sp + r * 0.95, 0, h); s.quadraticCurveTo(-r, sp + r * 0.95, -r, sp); s.closePath(); return s; }
const VIS_X = 170;

/* ===================== malzemeler ===================== */
export interface Mats { stone: THREE.MeshStandardMaterial; dressed: THREE.MeshStandardMaterial; dark: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; carve: THREE.MeshStandardMaterial; vault: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial; iron: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const st = stoneTex('mardin-kalker', ['#d6bf94', '#cbb286', '#dcc8a0', '#c4a97c', '#d0b88c', '#bfa477'], [24, 18], [46, 50]);
    const dr = stoneTex('mardin-kesme', ['#dcc7a0', '#d4bd94', '#e0cda8', '#cfb68c'], [22, 6], [64, 36]);
    const rk = stoneTex('mardin-kaya', ['#b29a76', '#a68d6a', '#bba381', '#9c8462'], [60, 50], [90, 120]);
    // oyma kuşak: geçmeli geometrik motif (temsilî)
    const carve = canvasTex(256, 256, (g) => { g.fillStyle = '#d8c29a'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#8f7650'; g.lineWidth = 5;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = i * 64 + 32, y = j * 64 + 32; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, rr = k % 2 ? 14 : 28; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.stroke(); g.strokeRect(x - 32, y - 32, 64, 64); } });
    // yıldız tonoz: tavanda kesişen kaburgalar
    const vault = canvasTex(256, 256, (g) => { g.fillStyle = '#d2bb92'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#9a8158'; g.lineWidth = 6;
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 180, 128 + Math.sin(a) * 180); g.stroke(); }
      g.beginPath(); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? 60 : 110; g.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } g.closePath(); g.stroke();
      g.fillStyle = '#9a8158'; g.beginPath(); g.arc(128, 128, 14, 0, 7); g.fill(); });
    return {
      stone: weather(new THREE.MeshStandardMaterial({ map: st.map, bumpMap: st.bump, bumpScale: 0.5, roughness: 0.92 }), -200),
      dressed: weather(new THREE.MeshStandardMaterial({ map: dr.map, bumpMap: dr.bump, bumpScale: 0.4, roughness: 0.88 }), -200),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2219', roughness: 1 }),
      wood: new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.8 }),
      carve: new THREE.MeshStandardMaterial({ map: carve, bumpMap: carve, bumpScale: -1.5, roughness: 0.85 }),
      vault: new THREE.MeshStandardMaterial({ map: vault, bumpMap: vault, bumpScale: -1, roughness: 0.9 }),
      rock: weather(new THREE.MeshStandardMaterial({ map: rk.map, bumpMap: rk.bump, bumpScale: 0.8, roughness: 0.97 }), -200),
      iron: new THREE.MeshStandardMaterial({ color: '#2c2a28', roughness: 0.5, metalness: 0.6 }),
    };
  }, []);
}

/* ===================== kademeli kent ===================== */
/** j. sınırın x boyunca kesimleri (taşma başı/sonu kırılma noktaları) */
function segs(j: number, x0: number, x1: number) { const pts = [x0, x1]; if (j >= 0 && j < BUMPS.length) for (const [a, b] of BUMPS[j]) pts.push(a, b); const s = [...new Set(pts)].filter((v) => v >= x0 && v <= x1).sort((a, b) => a - b); const out: [number, number][] = []; for (let i = 0; i < s.length - 1; i++) out.push([s[i], s[i + 1]]); return out; }
/** Görsel sınır: oyun alanının dışında da kademeler sürer (hafif düzensiz) */
function visBoundary(j: number, x: number) { if (Math.abs(x) <= 60) return boundaryZ(j, x); return BOUNDS_Z[j] + ((Math.floor(x / 11) * 7 + j * 3) % 3 === 0 ? BUMP : 0); }
export function Terraces({ m }: { m: Mats }) {
  const { blocks, dark, wood, para } = useMemo(() => { const blocks: Parts = [], dark: Parts = [], wood: Parts = [], para: Parts = [], r = rng(17);
    // x kesimleri: bütün sınırların kırılma noktaları + görsel kesimler
    const xs = new Set<number>([-VIS_X, VIS_X]); for (const B of BUMPS) for (const [a, b] of B) xs.add(a).add(b); for (let x = -VIS_X; x < VIS_X; x += 11) if (Math.abs(x) > 60) xs.add(Math.floor(x / 11) * 11);
    xs.add(-60); xs.add(60);
    const X = [...xs].sort((a, b) => a - b);
    for (let k = 0; k <= BOUNDS_Z.length; k++) for (let i = 0; i < X.length - 1; i++) { const x0 = X[i], x1 = X[i + 1], xm = (x0 + x1) / 2;
      const zN = k < BOUNDS_Z.length ? visBoundary(k, xm) : Z_TOP - 40, zS = k > 0 ? visBoundary(k - 1, xm) : Z_BOT + 2;
      const parts: [number, number][] = (k === 3 || k === 4) ? [[x0, Math.min(x1, ZIN.x0)], [Math.max(x0, ZIN.x1), x1]] : [[x0, x1]];
      for (const [a, b] of parts) { if (b - a < 0.01) continue; slab(blocks, a, b, zN, zS, -40, levelY(k), 3); }
    }
    // alt kent: güneye doğru inen kademeler (yalnızca görünür)
    for (let k = 1; k <= 9; k++) { const zN = Z_BOT + 2 + (k - 1) * 11, zS = zN + 11; for (let x = -VIS_X; x < VIS_X; x += 9 + r() * 6) { const w = 8 + r() * 8; slab(blocks, x, Math.min(VIS_X, x + w), zN + r() * 2, zS, -60, -k * STEP * 1.3 + (r() < 0.3 ? STEP : 0), 3); } }
    // cepheler: j. sınırın güney yüzünde pencere, kapı, eyvan nişi
    const face = (x: number, y: number, z: number, w: number, h: number, mat: Parts) => { const g = new THREE.ShapeGeometry(pointed(w, h), 6); g.translate(x, y, z + 0.02); mat.push(g); };
    for (let j = 0; j < BOUNDS_Z.length; j++) { const y0 = levelY(j);
      for (const [a, b] of segs(j, -VIS_X, VIS_X)) { const zb = visBoundary(j, (a + b) / 2), L = b - a; if (j >= 2 && j <= 4 && b > ZIN.x0 && a < ZIN.x1) continue;
        for (let x = a + 2; x < b - 1.5; x += 3.2 + r() * 2.5) { if (STAIRS.some((s) => s.j === j && Math.abs(s.x - x) < 3)) continue; const t = r();
          if (t < 0.18 && L > 6) { face(x, y0 + 0.02, zb, 2.4, 3.1, dark); x += 2; }   // eyvan nişi
          else if (t < 0.38) { const d = new THREE.PlaneGeometry(1.1, 2.1); d.translate(x, y0 + 1.05, zb + 0.03); wood.push(d); const h = new THREE.ShapeGeometry(pointed(1.5, 2.7), 6); h.translate(x, y0, zb + 0.015); dark.push(h); }   // kapı
          else { face(x, y0 + 1.1, zb, 0.8, 1.6, dark); } } }
      // korkuluk: üst kademenin güney kenarı (merdiven ağızları açık)
      for (const [a, b] of segs(j, -VIS_X, VIS_X)) { const zb = visBoundary(j, (a + b) / 2); let x = a;
        const gaps = STAIRS.filter((s) => s.j === j && s.x > a && s.x < b).map((s) => s.x).sort((p, q) => p - q);
        for (const gx of gaps) { slab(para, x, gx - STAIR_W / 2 - 0.1, zb - 0.4, zb, levelY(j + 1), levelY(j + 1) + 0.75, 1.5); x = gx + STAIR_W / 2 + 0.1; }
        if (!(j >= 2 && j <= 4 && b > ZIN.x0 && a < ZIN.x1)) slab(para, x, b, zb - 0.4, zb, levelY(j + 1), levelY(j + 1) + 0.75, 1.5); else { slab(para, x, ZIN.x0, zb - 0.4, zb, levelY(j + 1), levelY(j + 1) + 0.75, 1.5); slab(para, ZIN.x1, b, zb - 0.4, zb, levelY(j + 1), levelY(j + 1) + 0.75, 1.5); } }
    }
    // taşan damların yan yüzlerinde de korkuluk
    for (let j = 0; j < BUMPS.length; j++) for (const [a, b] of BUMPS[j]) for (const x of [a, b]) slab(para, x - 0.2, x + 0.2, BOUNDS_Z[j], BOUNDS_Z[j] + BUMP, levelY(j + 1), levelY(j + 1) + 0.75, 1.5);
    return { blocks: merge(blocks), dark: merge(dark), wood: merge(wood), para: merge(para) }; }, []);
  return <group>
    <mesh geometry={blocks} material={m.stone} castShadow receiveShadow />
    <mesh geometry={para} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={dark} material={m.dark} />
    <mesh geometry={wood} material={m.wood} />
  </group>;
}

/** Merdivenler (basamaklı) ve yan duvarlar; abbara: merdivenin üstünü örten tonozlu ev */
export function Stairs({ m }: { m: Mats }) {
  const { steps, walls, dark } = useMemo(() => { const steps: Parts = [], walls: Parts = [], dark: Parts = [];
    for (const s of STAIRS) { const b = boundaryZ(s.j, s.x), n = 14, y0 = levelY(s.j);
      for (let i = 0; i < n; i++) { const z1 = b + STAIR_LEN - (i * STAIR_LEN) / n, z0 = b + STAIR_LEN - ((i + 1) * STAIR_LEN) / n; slab(steps, s.x - STAIR_W / 2 - 0.05, s.x + STAIR_W / 2 + 0.05, z0 - 0.6 * (i === n - 1 ? 1 : 0), z1, y0 - 0.5, y0 + ((i + 1) * STEP) / n, 1.2); }
      for (const sx of [-1, 1]) { const x0 = s.x + sx * (STAIR_W / 2) + (sx > 0 ? 0 : -0.7), sh = new THREE.Shape(); sh.moveTo(b - 0.4, 0); sh.lineTo(b + STAIR_LEN + 0.4, 0); sh.lineTo(b + STAIR_LEN + 0.4, 0.9); sh.lineTo(b, STEP + 0.9); sh.lineTo(b - 0.4, STEP + 0.9); sh.closePath();
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x0 + 0.7, y0, 0); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3); walls.push(g); }
      if (s.abbara) { const za = b + 2.4, zb2 = b + 5.4, yc = y0 + STEP + 1.4, w = STAIR_W + 1.6;
        slab(walls, s.x - w / 2, s.x + w / 2, za, zb2, yc + 1.0, y0 + STEP * 2 + 0.2, 3);   // geçidin üstündeki oda
        for (const sx of [-1, 1]) slab(walls, s.x + sx * (w / 2 - 0.35) - 0.35, s.x + sx * (w / 2 - 0.35) + 0.35, za, zb2, y0, yc + 1.0, 3);   // yan ayaklar
        for (const zz of [za, zb2]) { const sp = new THREE.ShapeGeometry(spandrel(w - 1.4, 1.6, 1.5), 8); if (zz === za) sp.rotateY(Math.PI); sp.translate(s.x, yc - 0.2, zz + (zz === za ? -0.01 : 0.01)); walls.push(sp); }
        const v = new THREE.CylinderGeometry((w - 1.4) / 2, (w - 1.4) / 2, zb2 - za, 16, 1, true, -Math.PI / 2, Math.PI); v.rotateX(-Math.PI / 2); v.translate(s.x, yc - 0.2, (za + zb2) / 2); dark.push(v);
        for (let wx = -1; wx <= 1; wx += 2) { const win = new THREE.ShapeGeometry(pointed(0.7, 1.2), 6); win.translate(s.x + wx * 0.8, yc + 1.5, zb2 + 0.03); dark.push(win); } }
    }
    return { steps: merge(steps), walls: merge(walls), dark: merge(dark) }; }, []);
  return <group>
    <mesh geometry={steps} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={walls} material={m.stone} castShadow receiveShadow />
    <mesh geometry={dark} receiveShadow><meshStandardMaterial color="#b49c74" roughness={0.95} side={THREE.DoubleSide} /></mesh>
  </group>;
}

/* ===================== Zinciriye Medresesi ===================== */
/** Dilimli kubbe: yarım küre, boylamlar boyunca oluklu */
function flutedDome(r: number, ribs = 16) { const g = new THREE.SphereGeometry(r, ribs * 4, 12, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.06 * Math.abs(Math.cos((a * ribs) / 2)) * Math.min(1, (r - y) / r * 2); p.setXYZ(i, x * k, y, z * k); }
  g.computeVertexNormals(); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * 2, uv.getY(i) * r * 0.8); return g; }
export function Zinciriye({ m }: { m: Mats }) {
  const y3 = levelY(3), y5 = levelY(5), cx0 = COURT.x0 - 3, cx1 = COURT.x1 + 1, cz0 = COURT.z0 - 1.6, cz1 = COURT.z1 + 1.6;
  const { body, trim, dark, arches } = useMemo(() => { const body: Parts = [], trim: Parts = [], dark: Parts = [], arches: Parts = [], Z = ZIN;
    slab(body, Z.x0, Z.x1, Z.z0, Z.z1, -40, y3, 3);   // taban
    // avlu çevresindeki kanatlar (avlu katından dama)
    slab(body, Z.x0, Z.x1, Z.z0, cz0, y3, y5, 3); slab(body, Z.x0, Z.x1, cz1, Z.z1, y3, y5, 3); slab(body, Z.x0, cx0, cz0, cz1, y3, y5, 3);
    const pz0 = PORTAL.z - PORTAL.w / 2, pz1 = PORTAL.z + PORTAL.w / 2, ph = 3.4;
    slab(body, cx1, Z.x1, cz0, pz0, y3, y5, 3); slab(body, cx1, Z.x1, pz1, cz1, y3, y5, 3); slab(body, cx1, Z.x1, pz0, pz1, y3 + ph, y5, 3);
    // revak tavanı (dam döşemesi) ve payeler
    const ox0 = COURT.x0, ox1 = COURT.x1, oz0 = COURT.z0, oz1 = COURT.z1, ry = y5 - 0.7;
    slab(body, cx0, cx1, cz0, oz0, ry, y5, 2); slab(body, cx0, cx1, oz1, cz1, ry, y5, 2); slab(body, cx0, ox0, oz0, oz1, ry, y5, 2); slab(body, ox1, cx1, oz0, oz1, ry, y5, 2);
    const pier = (x: number, z: number) => slab(trim, x - 0.35, x + 0.35, z - 0.35, z + 0.35, y3, ry, 1.5);
    const nX = 6, nZ = 3, dxp = (ox1 - ox0) / nX, dzp = (oz1 - oz0) / nZ, aH = ry - y3 - 0.1;
    for (let i = 0; i <= nX; i++) { pier(ox0 + i * dxp, oz0); pier(ox0 + i * dxp, oz1); }
    for (let i = 1; i < nZ; i++) { pier(ox0, oz0 + i * dzp); pier(ox1, oz0 + i * dzp); }
    // payeler arası sivri kemer köşelikleri (dört yüz)
    for (let i = 0; i < nX; i++) for (const [z, rot] of [[oz0, 0], [oz1, Math.PI]] as const) { const g = new THREE.ExtrudeGeometry(spandrel(dxp - 0.7, aH, aH * 0.82), { depth: 0.5, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -0.25); g.rotateY(rot); g.translate(ox0 + (i + 0.5) * dxp, y3, z); arches.push(g); }
    for (let i = 0; i < nZ; i++) for (const [x, rot] of [[ox0, Math.PI / 2], [ox1, -Math.PI / 2]] as const) { const g = new THREE.ExtrudeGeometry(spandrel(dzp - 0.7, aH, aH * 0.82), { depth: 0.5, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -0.25); g.rotateY(rot); g.translate(x, y3, oz0 + (i + 0.5) * dzp); arches.push(g); }
    // avlunun batısında mescit eyvanı, kuzeyde ana eyvan (koyu nişler) ve mihrap
    { const g = new THREE.ShapeGeometry(pointed(3.6, 5.2), 8); g.rotateY(Math.PI / 2); g.translate(cx0 + 0.02, y3, 0); dark.push(g); }
    { const g = new THREE.ShapeGeometry(pointed(4.4, 5.6), 8); g.translate(2, y3, cz0 + 0.02); dark.push(g); }
    // dış cepheler: güney cephesinde sivri kemerli pencereler; dam korkuluğu
    for (let x = Z.x0 + 2.4; x < Z.x1 - 1.5; x += 3.3) { const g = new THREE.ShapeGeometry(pointed(0.9, 1.8), 6); g.translate(x, y3 + 2.2, Z.z1 + 0.02); dark.push(g); const g2 = new THREE.ShapeGeometry(pointed(0.7, 1.3), 6); g2.translate(x, levelY(2) + 1.4, Z.z1 + 0.02); dark.push(g2); }
    slab(trim, Z.x0, Z.x1, Z.z1 - 0.4, Z.z1, y5, y5 + 0.8, 1.5); slab(trim, Z.x0, Z.x0 + 0.4, Z.z0, Z.z1, y5, y5 + 0.8, 1.5); slab(trim, Z.x1 - 0.4, Z.x1, Z.z0, Z.z1, y5, y5 + 0.8, 1.5);
    for (const [x0, x1, z0, z1] of [[cx0, cx1, cz0 - 0.3, cz0], [cx0, cx1, cz1, cz1 + 0.3], [cx0 - 0.3, cx0, cz0, cz1], [cx1, cx1 + 0.3, cz0, cz1]]) slab(trim, x0, x1, z0, z1, y5, y5 + 0.8, 1.5);   // avlu boşluğu korkuluğu
    slab(trim, Z.x0 - 0.2, Z.x1 + 0.2, Z.z1 - 0.2, Z.z1 + 0.15, y5 - 0.3, y5, 1.5);   // saçak silmesi
    // taç kapı: doğu cephesinden taşan yüksek çerçeve, derin sivri kemerli niş
    const tx = Z.x1, tw = 6.2, th = y5 + 3.4 - y3;
    slab(trim, tx, tx + 0.7, PORTAL.z - tw / 2, pz0, y3 - 0.6, y3 + th, 2); slab(trim, tx, tx + 0.7, pz1, PORTAL.z + tw / 2, y3 - 0.6, y3 + th, 2); slab(trim, tx, tx + 0.7, pz0, pz1, y3 + ph, y3 + th, 2);
    return { body: merge(body), trim: merge(trim), dark: merge(dark), arches: merge(arches) }; }, [y3, y5, cx0, cx1, cz0, cz1]);
  // taç kapının nişi (oyma çerçeve + koyu üst niş + açık kapı), yıldız tonoz
  const niche = useMemo(() => { const o = pointed(4.6, 9.6), h = new THREE.Path(), w = 3.4, hh = 8.4, r = w / 2, sp = hh - r * 1.15;
    h.moveTo(-r, 0.4); h.lineTo(-r, sp); h.quadraticCurveTo(-r, sp + r * 0.95, 0, hh); h.quadraticCurveTo(r, sp + r * 0.95, r, sp); h.lineTo(r, 0.4); h.closePath(); o.holes.push(h);
    const g = new THREE.ExtrudeGeometry(o, { depth: 0.2, bevelEnabled: false, curveSegments: 10 }); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2); return g; }, []);
  const nicheTop = useMemo(() => { const w = 3.4, hh = 8.4, r = w / 2, sp = hh - r * 1.15, s = new THREE.Shape(); s.moveTo(-r, 4.0); s.lineTo(-r, sp); s.quadraticCurveTo(-r, sp + r * 0.95, 0, hh); s.quadraticCurveTo(r, sp + r * 0.95, r, sp); s.lineTo(r, 4.0); s.closePath(); return new THREE.ShapeGeometry(s, 10); }, []);
  const domes = useMemo(() => DOMES.map((d) => { const drum = new THREE.CylinderGeometry(d.r, d.r, 1.1, 32), uv = drum.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * d.r * 2, uv.getY(i) * 0.4); drum.translate(0, 0.55, 0);
    const dm = flutedDome(d.r * 0.98); dm.translate(0, 1.1, 0); const fin = new THREE.CylinderGeometry(0.03, 0.06, 0.8, 6); fin.translate(0, 1.1 + d.r + 0.35, 0); return { d, g: merge([drum, dm]), fin }; }), []);
  const ceil = useMemo(() => { const g = new THREE.PlaneGeometry(ZIN.x1 - (COURT.x1 + 1), PORTAL.w + 0.2); g.rotateX(Math.PI / 2); return g; }, []);
  return <group>
    <mesh geometry={body} material={m.stone} castShadow receiveShadow />
    <mesh geometry={trim} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={arches} material={m.dressed} castShadow receiveShadow />
    <mesh geometry={dark} material={m.dark} />
    <group position={[ZIN.x1 + 0.72, y3 - 0.6, PORTAL.z]} rotation-y={Math.PI / 2}>
      <mesh geometry={niche} material={m.carve} castShadow />
      <mesh geometry={nicheTop} material={m.vault} position={[0, 0, 0.02]} />
    </group>
    <mesh geometry={ceil} material={m.vault} position={[(COURT.x1 + 1 + ZIN.x1) / 2, y3 + 3.38, PORTAL.z]} />
    {domes.map(({ d, g, fin }) => <group key={d.x} position={[d.x, y5, d.z]}><mesh geometry={g} material={m.dressed} castShadow receiveShadow /><mesh geometry={fin} material={m.iron} /></group>)}
    <mesh rotation-x={-Math.PI / 2} position={[(COURT.x0 + COURT.x1) / 2, y3 + 0.02, 0]} receiveShadow><planeGeometry args={[COURT.x1 - COURT.x0 + 6, COURT.z1 - COURT.z0 + 3.2]} /><meshStandardMaterial color="#cdb78f" roughness={0.9} /></mesh>
  </group>;
}

/* ===================== kale, ova ===================== */
export function Citadel({ m }: { m: Mats }) {
  const { rock, wall } = useMemo(() => { const r = rng(5), rock: Parts = [], wall: Parts = [];
    const g = new THREE.PlaneGeometry(2 * VIS_X + 120, 160, 80, 40); g.rotateX(-Math.PI / 2); const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) - 80 + Z_TOP - 2, t = Math.min(1, Math.max(0, (Z_TOP - 2 - z) / 26)); p.setZ(i, z); p.setY(i, levelY(5) + t * 26 + (t > 0.05 ? (r() - 0.5) * 2.2 * t : 0) + Math.sin(x * 0.05) * 3 * t); }
    g.computeVertexNormals(); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 60, uv.getY(i) * 25); rock.push(g);
    { const h = new THREE.PlaneGeometry(3400, 200, 60, 20); h.rotateX(-Math.PI / 2); const q = h.attributes.position as THREE.BufferAttribute; for (let i = 0; i < q.count; i++) { const z = q.getZ(i) + 70, x = q.getX(i), t = Math.min(1, Math.max(0, (z - Z_TOP) / (Z_BOT + 80 - Z_TOP))); q.setZ(i, z); q.setY(i, levelY(5) * (1 - t) - 55 * t - (Math.abs(x) < VIS_X ? 6 : 0) + Math.sin(x * 0.02) * 4); }
      h.computeVertexNormals(); const u2 = h.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u2.count; i++) u2.setXY(i, u2.getX(i) * 400, u2.getY(i) * 25); rock.push(h); }
    const wy = levelY(5) + 26; for (let x = -90; x < 90; x += 8) { slab(wall, x, x + 8.2, Z_TOP - 32, Z_TOP - 29, wy - 2, wy + 7 + (x % 24 === 0 ? 3 : 0), 3); for (let k = 0; k < 4; k++) slab(wall, x + k * 2, x + k * 2 + 1.1, Z_TOP - 29.6, Z_TOP - 29, wy + 7, wy + 8.2, 1.5); }
    for (const x of [-70, -30, 10, 50]) { const t = new THREE.CylinderGeometry(4, 4.4, 14, 20); t.translate(x, wy + 4, Z_TOP - 29); wall.push(t); }
    return { rock: merge(rock), wall: merge(wall) }; }, []);
  return <group>
    <mesh geometry={rock} material={m.rock} receiveShadow castShadow />
    <mesh geometry={wall} material={m.stone} castShadow receiveShadow />
  </group>;
}
export function Plain() {
  const { geo, tex } = useMemo(() => { const g = new THREE.PlaneGeometry(9000, 6000, 120, 80); g.rotateX(-Math.PI / 2); g.translate(0, 0, 3000 + Z_BOT + 60);
    const p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), t = Math.min(1, Math.max(0, (z - (Z_BOT + 100)) / 260)); p.setY(i, -STEP * 12 * (1 - t) + PLAIN_Y * t - (1 - t) * 10); }
    g.computeVertexNormals();
    const tex = canvasTex(512, 512, (c, r) => { c.fillStyle = '#9b8c5c'; c.fillRect(0, 0, 512, 512); for (let i = 0; i < 160; i++) { const v = r(); c.fillStyle = v < 0.35 ? '#7f8d4a' : v < 0.6 ? '#a88f5a' : v < 0.8 ? '#6f6a44' : '#937a4c'; c.save(); c.translate(r() * 512, r() * 512); c.rotate((r() - 0.5) * 0.3); c.fillRect(0, 0, 20 + r() * 70, 14 + r() * 50); c.restore(); } });
    tex.repeat.set(36, 24); return { geo: g, tex }; }, []);
  return <mesh geometry={geo} receiveShadow userData={{ noCast: true }}><meshStandardMaterial map={tex} roughness={1} /></mesh>;
}
/** Ovada uzak alçak tepeler (ufuk çizgisi) */
export function FarHills() {
  const list = useMemo(() => { const r = rng(41), out: { p: [number, number, number]; g: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < 6; i++) out.push({ p: [-3000 + i * 1200 + r() * 300, PLAIN_Y - 10, 4200 + r() * 600], g: mountainGeo(700, 90 + r() * 60, 30 + i, 2, '#a79a76') });
    for (let i = 0; i < 4; i++) out.push({ p: [-1500 + i * 1000, levelY(5) - 20, -700 - r() * 300], g: mountainGeo(500, 160 + r() * 80, 50 + i, 2, '#9b8a64') });
    return out; }, []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}
/** Bir minare ve birkaç kubbe: alt kentte (temsilî) */
export function Skyline({ m }: { m: Mats }) {
  const geo = useMemo(() => { const p: Parts = [], x = -44, z = Z_BOT + 14, y = -STEP * 1.3; const sh = new THREE.CylinderGeometry(1.3, 1.5, 22, 16); sh.translate(x, y + 11, z); p.push(sh);
    const bal = new THREE.CylinderGeometry(2, 1.6, 0.8, 16); bal.translate(x, y + 17, z); p.push(bal); const top = new THREE.ConeGeometry(1.4, 3, 16); top.translate(x, y + 23.5, z); p.push(top);
    for (const [dx, dz, r] of [[18, 22, 3.2], [60, 30, 2.6], [-80, 18, 3]] as const) { const d = flutedDome(r); d.translate(dx, -STEP * 1.3 * 2 + 1.5, Z_BOT + dz); p.push(d); }
    return merge(p); }, []);
  return <mesh geometry={geo} material={m.dressed} castShadow receiveShadow />;
}
/** Yükseldikçe ovanın pusu açılır */
export function Haze({ far }: { far: (y: number) => number }) {
  const ref = useRef<THREE.Fog>(null);
  useFrame(({ camera }) => { const f = ref.current; if (!f) return; const want = far(camera.position.y); f.far += (want - f.far) * 0.05; f.near = f.far * 0.08; });
  return <fog ref={ref} attach="fog" args={['#dfdccd', 40, 400]} />;
}
