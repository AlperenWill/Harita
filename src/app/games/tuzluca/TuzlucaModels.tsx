/**
 * Tuzluca — 3B modeller: sıcak ova, Tuz Dağı yamacı ve tünel ağzı; içeride tuz bantlı duvarlar, düzenli tuz ayakları, sıcak ışıklı
 * lambalar, en dipte arkadan aydınlatılmış tuz tuğla duvarlı terapi salonu, banklar ve oturan ziyaretçiler. Uzakta Ağrı Dağı.
 * Ölçüler ve düzen TEMSİLÎDİR.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bx, groundTex, mountainGeo } from '../shared/scenery';
import { BENCHES, COR_X, COR_Z, CROWN, GALLERY, HALL, PASS, PILLAR_HALF, PILLAR_X, PILLAR_Z, TABLES, TUNNEL, VAULT } from './site';

export function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 5) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
const merge = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => { g.translate(x, y, z); return g; };

/** Tuz duvarı dokusu: yatay dalgalı bantlar (beyaz, gri, pembemsi, kahve), kristal benekleri, kazı izleri */
function saltTex(seed: number, base = '#d9d3cb') {
  return canvasTex(512, 512, (g, r) => {
    g.fillStyle = base; g.fillRect(0, 0, 512, 512);
    const bands = ['#cfc6ba', '#a79e93', '#bdb2a4', '#8f877d', '#d8d0c4', '#b3a796', '#9c9184'];
    for (let y = 0; y < 512;) { const h = 3 + r() * 16, c = bands[(r() * bands.length) | 0]; g.fillStyle = c; g.globalAlpha = 0.55 + r() * 0.35; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 70 + y) * 4 + (r() - 0.5) * 3); for (let x = 512; x >= 0; x -= 32) g.lineTo(x, y + h + Math.sin(x / 60 + y) * 4); g.closePath(); g.fill(); y += h; }
    g.globalAlpha = 1; for (let i = 0; i < 2600; i++) { const v = 200 + r() * 55 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.5})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(90,80,70,0.18)'; g.lineWidth = 2; for (let i = 0; i < 70; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + r() * 30, y + (r() - 0.5) * 50); g.stroke(); }
  }, seed);
}
export interface Mats { wall: THREE.MeshStandardMaterial; floor: THREE.MeshStandardMaterial; ceil: THREE.MeshStandardMaterial; frame: THREE.MeshStandardMaterial; wood: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial }
export function useMats(): Mats {
  return useMemo(() => {
    const w = saltTex(7, '#b5ab9e'), c = canvasTex(256, 256, (g, r) => { g.fillStyle = '#b3aaa0'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 160; i++) { const v = 140 + r() * 80 | 0; g.fillStyle = `rgba(${v},${v - 5},${v - 12},0.35)`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 24, 4 + r() * 14, r() * 3, 0, 7); g.fill(); } for (let i = 0; i < 1500; i++) { const v = 190 + r() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v},0.4)`; g.fillRect(r() * 256, r() * 256, 1.5, 1.5); } }, 17);
    const f = canvasTex(256, 256, (g, r) => { g.fillStyle = '#4d4842'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 5000; i++) { const v = 50 + r() * 50 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 8},0.55)`; g.fillRect(r() * 256, r() * 256, 2, 2); } });
    const rk = canvasTex(256, 256, (g, r) => { g.fillStyle = '#9c7f68'; g.fillRect(0, 0, 256, 256); const bands = ['#a88a70', '#8f7562', '#b39e86', '#a07058', '#8c8378']; for (let y = 0; y < 256;) { const h = 4 + r() * 20; g.fillStyle = bands[(r() * bands.length) | 0]; g.globalAlpha = 0.6; g.fillRect(0, y, 256, h); y += h; } g.globalAlpha = 1; for (let i = 0; i < 2500; i++) { const v = 100 + r() * 90 | 0; g.fillStyle = `rgba(${v + 20},${v},${v - 15},0.35)`; g.fillRect(r() * 256, r() * 256, 2, 2); } }, 23);
    return {
      wall: new THREE.MeshStandardMaterial({ map: w, bumpMap: w, bumpScale: 0.8, roughness: 0.85, side: THREE.DoubleSide }),
      floor: new THREE.MeshStandardMaterial({ map: f, roughness: 0.95 }),
      ceil: new THREE.MeshStandardMaterial({ map: c, roughness: 0.9, side: THREE.DoubleSide }),
      frame: new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: 0.85 }),
      wood: new THREE.MeshStandardMaterial({ color: '#7a5a3e', roughness: 0.75 }),
      rock: new THREE.MeshStandardMaterial({ map: rk, roughness: 1 }),
    };
  }, []);
}

/* ===================== dışarısı ===================== */
export function Outside({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const ground = new THREE.PlaneGeometry(1600, 900, 1, 1); ground.rotateX(-Math.PI / 2); ground.translate(0, -0.02, 444);
    // Tuz Dağı yamacı: tünel ağzının arkasında yükselen engebeli yüzey
    const hill = new THREE.PlaneGeometry(1600, 600, 160, 60); hill.rotateX(-Math.PI / 2); hill.translate(0, 0, -304);
    const p = hill.attributes.position as THREE.BufferAttribute, r = rng(4);
    const n = (x: number, z: number) => Math.sin(x * 0.045) * 3 + Math.sin(z * 0.06 + x * 0.02) * 2.5 + Math.sin(x * 0.13 + z * 0.11) * 1.2;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), d = -z - 4; p.setY(i, 10.4 + d * 0.55 + n(x, z) * 0.45 * Math.min(1, d / 8) + r() * 0.3); }   // eğim bakış açısından dik kalır: alt yüz görünmez
    hill.computeVertexNormals(); const hu = hill.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < hu.count; i++) hu.setXY(i, hu.getX(i) * 1600 / 6, hu.getY(i) * 600 / 6);
    // ön yüz: tünel ağzı açık bırakılan kaya duvar
    const front = (() => { const NX = 240, NY = 16, X0 = -240, X1 = 240, pos: number[] = [], uv: number[] = [], idx: number[] = [], rf = rng(9);
      const top = (x: number) => 12.2 + Math.sin(x * 0.07) * 1.1 + Math.sin(x * 0.23 + 1) * 0.5;   // tepe yamacın başladığı yükseklikten (10.4) yukarıda: arada gök görünmez
      for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) { const x = X0 + (i / NX) * (X1 - X0), t = j / NY, y = top(x) * t + (t > 0 && t < 1 ? (rf() - 0.5) * 0.4 : 0), near = Math.max(0, 1 - Math.max(0, Math.abs(x) - TUNNEL.w / 2 - 0.6) / 6);
        const bulge = (Math.sin(x * 0.31 + y * 0.7) * 0.6 + Math.sin(x * 0.11 - y * 0.3) * 1.1 + (rf() - 0.5) * 0.5) * (1 - near) * Math.sin(Math.PI * Math.min(1, t * 1.6)) ;
        pos.push(x, y, -0.3 - (1 - near) * 0.9 + bulge - t * t * 2.2 * (1 - near)); uv.push(x / 5, y / 5); }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const cx = X0 + ((i + 0.5) / NX) * (X1 - X0), cy = top(cx) * (j + 0.5) / NY; if (Math.abs(cx) < TUNNEL.w / 2 && cy < TUNNEL.h + 0.2) continue; const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); gg.computeVertexNormals(); return gg; })();
    const lintel = at(bx(TUNNEL.w + 0.4, 11 - TUNNEL.h, 3, 5), 0, TUNNEL.h + (11 - TUNNEL.h) / 2, -1.6);
    // yıkıntı taşları
    const rocks: THREE.BufferGeometry[] = []; const rr = rng(21); for (let i = 0; i < 40; i++) { const x = (rr() - 0.5) * 120, z = 2 + rr() * 6; if (Math.abs(x) < 6) continue; const s = 0.4 + rr() * 1.4, d = new THREE.DodecahedronGeometry(s, 0); d.scale(1, 0.6, 1); rocks.push(at(d, x, s * 0.25, z)); }
    return { ground, hill, front, lintel, rocks: merge(rocks) };
  }, []);
  const tex = useMemo(() => groundTex(), []);
  const sign = useMemo(() => canvasTex(512, 128, (c) => { c.fillStyle = '#f2efe8'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#3c4a52'; c.font = 'bold 52px sans-serif'; c.textAlign = 'center'; c.fillText('TUZ MAĞARASI', 256, 84); }), []);
  return <group>
    <group userData={{ noCast: true }}><mesh geometry={g.ground} receiveShadow><meshStandardMaterial color="#c9b78e" map={tex.map} bumpMap={tex.bump} bumpScale={0.2} roughness={1} /></mesh></group>
    <mesh geometry={g.hill} castShadow receiveShadow><meshStandardMaterial map={m.rock.map} color="#bcab9b" roughness={1} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={g.front} material={m.rock} castShadow receiveShadow />
    <mesh geometry={g.lintel} material={m.rock} castShadow receiveShadow />
    <mesh geometry={g.rocks} material={m.rock} castShadow receiveShadow />
    {/* tünel ağzı çerçevesi ve tabela */}
    {[-1, 1].map((s) => <mesh key={s} material={m.frame} position={[s * (TUNNEL.w / 2 + 0.25), TUNNEL.h / 2, 0.15]} castShadow><boxGeometry args={[0.5, TUNNEL.h, 0.5]} /></mesh>)}
    <mesh material={m.frame} position={[0, TUNNEL.h + 0.3, 0.15]} castShadow><boxGeometry args={[TUNNEL.w + 1, 0.6, 0.5]} /></mesh>
    <mesh position={[0, TUNNEL.h + 1.3, 0.05]}><planeGeometry args={[4.4, 1.1]} /><meshStandardMaterial map={sign} roughness={0.8} /></mesh>
  </group>;
}
export function Mountains() {
  const list = useMemo(() => [
    { p: [2600, -10, 3800] as [number, number, number], g: mountainGeo(2400, 2100, 3, 0.5, '#7d6f5c') },   // Ağrı Dağı (güneydoğu; yön ve uzaklık temsilî)
    { p: [2300, -10, 2000] as [number, number, number], g: mountainGeo(600, 520, 5, 0.75, '#8a7d66') },
    { p: [-1800, -10, 900] as [number, number, number], g: mountainGeo(900, 320, 7, 1, '#93856a') },
  ], []);
  return <group userData={{ noCast: true }}>{list.map((mm, i) => <mesh key={i} geometry={mm.g} position={mm.p}><meshStandardMaterial vertexColors roughness={1} /></mesh>)}</group>;
}

/* ===================== içerisi ===================== */
/** Konuma bağlı vektör gürültüsü: komşu yüzeyler aynı noktada aynı kayar (dikiş açılmaz) */
const nz = (x: number, y: number, z: number, k: number) => Math.sin(x * 0.9 + y * 0.35 + k) * 0.5 + Math.sin(z * 0.7 - y * 0.8 + k * 2) * 0.35 + Math.sin((x + z) * 2.1 + y * 1.7 + k * 3) * 0.15 + Math.sin(y * 3.3 + x * 0.4 + k) * 0.12;
function rough(g: THREE.BufferGeometry, amp: number, fade?: (x: number, y: number, z: number) => number) {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = amp * (fade ? fade(x, y, z) : 1); p.setXYZ(i, x + nz(x, y, z, 1) * k, y + nz(x, y, z, 2) * k * 0.6 * Math.min(1, Math.max(0, y - 0.05)), z + nz(x, y, z, 3) * k); }   // zemine değen kenar yerinde kalır
  g.computeVertexNormals(); return g;
}
/** Izgara yüzey: f(u,v) → nokta; keep(u,v) hücre kalsın mı; doku metre başına */
function grid(nu: number, nv: number, f: (u: number, v: number) => [number, number, number], lu: number, lv: number, keep?: (u: number, v: number) => boolean) {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const u = i / nu, v = j / nv; pos.push(...f(u, v)); uv.push((u * lu) / 5, (v * lv) / 5); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { if (keep && !keep((i + 0.5) / nu, (j + 0.5) / nv)) continue; const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
/** Dikey düz duvar (x0,z0)→(x1,z1), 0..h; keep(s, y) */
const wallG = (x0: number, z0: number, x1: number, z1: number, h: number, keep?: (s: number, y: number) => boolean, cell = 0.5) => { const L = Math.hypot(x1 - x0, z1 - z0);
  return grid(Math.max(2, Math.ceil(L / cell)), Math.max(2, Math.ceil(h / cell)), (u, v) => [x0 + (x1 - x0) * u, v * h, z0 + (z1 - z0) * u], L, h, keep ? (u, v) => keep(u * L, v * h) : undefined); };
/** Beşik tonoz: eksen boyunca a→b (dir 'x' ya da 'z'), merkez c, yarıçap r, Hs'den başlar */
function vaultG(dir: 'x' | 'z', a: number, b: number, c: number, r: number, hs: number) { const L = Math.abs(b - a);
  return grid(Math.max(2, Math.ceil(L / 0.6)), 22, (u, v) => { const t = a + (b - a) * u, ang = Math.PI * v, w = c + r * Math.cos(ang), y = hs + r * Math.sin(ang); return dir === 'x' ? [t, y, w] : [w, y, t]; }, L, Math.PI * r); }
/** Kemer üstü dolgu: kesişimin bir kenarında, koridor kemeri ile tepe arasındaki duvar */
function spandrel(cx: number, cz: number, side: 'n' | 's' | 'e' | 'w') { const { W, Hs } = VAULT, h = W / 2;
  const sh = new THREE.Shape(); sh.moveTo(-h - 0.3, Hs); sh.lineTo(-h - 0.3, CROWN + 1.6); sh.lineTo(h + 0.3, CROWN + 1.6); sh.lineTo(h + 0.3, Hs); sh.lineTo(h, Hs); sh.absarc(0, Hs, h, 0, Math.PI, false); sh.lineTo(-h - 0.3, Hs);
  const g = new THREE.ShapeGeometry(sh, 24); if (side === 'e' || side === 'w') g.rotateY(Math.PI / 2); const o = side === 'n' ? [0, -h] : side === 's' ? [0, h] : side === 'e' ? [h, 0] : [-h, 0]; g.translate(cx + o[0], 0, cz + o[1]); return g; }

export function Mine({ m }: { m: Mats }) {
  const g = useMemo(() => {
    const { W, P, Hs } = VAULT, h = W / 2, rock: THREE.BufferGeometry[] = [], tw = TUNNEL.w / 2;
    // ayaklar: dört yan yüz, ortası hafif şişkin, köşeler yuvarlak
    for (const px of PILLAR_X) for (const pz of PILLAR_Z) for (let f = 0; f < 4; f++) { const H = CROWN + 0.6, hp = P / 2;
      const fg = grid(16, 22, (u, v) => { const t = -hp + P * u, out = hp + Math.sin(Math.PI * u) * 0.45 - 0.25; const loc: [number, number] = f === 0 ? [t, out] : f === 1 ? [out, -t] : f === 2 ? [-t, -out] : [-out, t]; return [px + loc[0], v * H, pz + loc[1]]; }, P, H);
      rock.push(rough(fg, 0.32)); }
    // koridor tonozları
    for (const zc of COR_Z) for (let i = 0; i < COR_X.length - 1; i++) rock.push(rough(vaultG('x', COR_X[i] + h - 0.2, COR_X[i + 1] - h + 0.2, zc, h + 0.15, Hs), 0.28));
    for (const xc of COR_X) for (let j = 0; j < COR_Z.length - 1; j++) rock.push(rough(vaultG('z', COR_Z[j] - h + 0.2, COR_Z[j + 1] + h - 0.2, xc, h + 0.15, Hs), 0.28));
    // kesişimler: hafif kubbeli tavan ve dört yanda kemer üstü dolgular
    for (const xc of COR_X) for (const zc of COR_Z) {
      rock.push(rough(grid(10, 10, (u, v) => { const x = (u - 0.5) * (W + 0.6), z = (v - 0.5) * (W + 0.6), q = 1 - (x * x + z * z) / (h * h * 2); return [xc + x, CROWN + 0.2 + q * 0.9, zc - z]; }, W, W), 0.3));
      const xi = COR_X.indexOf(xc), zi = COR_Z.indexOf(zc);
      const sp = (d: 'n' | 's' | 'e' | 'w') => rock.push(rough(spandrel(xc, zc, d), 0.12));
      if (zi > 0) sp('s'); if (zi < COR_Z.length - 1) sp('n'); if (xi > 0) sp('w'); if (xi < COR_X.length - 1) sp('e'); }
    // dış duvarlar
    const GH = CROWN + 1.4;
    rock.push(rough(wallG(GALLERY.x0, GALLERY.z1, GALLERY.x0, GALLERY.z0, GH), 0.4));
    rock.push(rough(wallG(GALLERY.x1, GALLERY.z0, GALLERY.x1, GALLERY.z1, GH), 0.4));
    rock.push(rough(wallG(GALLERY.x1, GALLERY.z1, GALLERY.x0, GALLERY.z1, GH, (s, y) => !(Math.abs(GALLERY.x1 - s) < tw && y < TUNNEL.h)), 0.4, (x, y) => Math.min(1, Math.max(Math.abs(x) - tw, y - TUNNEL.h) / 1.2 + 0.05)));
    const inArch = (x: number, y: number, hw: number, hs: number) => Math.abs(x) < hw && (y < hs || x * x + (y - hs) ** 2 < hw * hw);
    rock.push(rough(wallG(GALLERY.x0, GALLERY.z0, GALLERY.x1, GALLERY.z0, GH, (s, y) => !inArch(GALLERY.x0 + s, y, PASS.w / 2, PASS.Hs), 0.4), 0.4, (x, y) => (inArch(x, y, PASS.w / 2 + 1, PASS.Hs + 0.6) ? 0.1 : 1)));
    // tünel: düz yan duvarlar ve tavan
    for (const sx of [-1, 1]) rock.push(rough(wallG(sx * tw, 0, sx * tw, TUNNEL.z0 - 0.3, TUNNEL.h + 0.2), 0.12));
    rock.push(rough(grid(4, 30, (u, v) => [-tw - 0.2 + (TUNNEL.w + 0.4) * u, TUNNEL.h, TUNNEL.z0 * v - 0.2 * v], TUNNEL.w, -TUNNEL.z0), 0.05));
    // geçit
    for (const sx of [-1, 1]) rock.push(rough(wallG(sx * PASS.w / 2, PASS.z1, sx * PASS.w / 2, PASS.z0, PASS.Hs + 0.1), 0.15));
    rock.push(rough(vaultG('z', PASS.z1 + 0.3, PASS.z0 - 0.3, 0, PASS.w / 2 + 0.1, PASS.Hs), 0.15));
    // terapi salonu: yan duvarlar, büyük tonoz, kemer biçimli uç duvarlar
    const HR = (HALL.x1 - HALL.x0) / 2;
    for (const sx of [-1, 1]) rock.push(rough(wallG(sx * HR, HALL.z1, sx * HR, HALL.z0, HALL.Hs + 0.3), 0.35));
    rock.push(rough(vaultG('z', HALL.z1 + 0.3, HALL.z0 - 0.3, 0, HR + 0.2, HALL.Hs), 0.4));
    const inHall = (x: number, y: number) => inArch(x, y, HR + 0.5, HALL.Hs);
    rock.push(rough(wallG(-HR - 0.5, HALL.z1, HR + 0.5, HALL.z1, HALL.Hs + HR + 0.6, (s, y) => inHall(-HR - 0.5 + s, y) && !inArch(-HR - 0.5 + s, y, PASS.w / 2, PASS.Hs), 0.5), 0.35, (x, y) => (inArch(x, y, PASS.w / 2 + 1, PASS.Hs + 0.6) ? 0.1 : 1)));
    rock.push(rough(wallG(HR + 0.5, HALL.z0, -HR - 0.5, HALL.z0, HALL.Hs + HR + 0.6, (s, y) => inHall(HR + 0.5 - s, y), 0.5), 0.35, (x, y) => (Math.abs(x) < 11 && y < 4.4 ? 0 : 1)));
    // zemin
    const fl = (x0: number, x1: number, z0: number, z1: number) => { const p = new THREE.PlaneGeometry(x1 - x0, z1 - z0); p.rotateX(-Math.PI / 2); const uv = p.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / 4, (uv.getY(i) * (z1 - z0)) / 4); p.translate((x0 + x1) / 2, 0, (z0 + z1) / 2); return p; };
    const floor = merge([fl(-tw - 0.5, tw + 0.5, TUNNEL.z0 - 0.5, 0.2), fl(GALLERY.x0 - 0.6, GALLERY.x1 + 0.6, GALLERY.z0 - 0.6, GALLERY.z1 + 0.6), fl(-PASS.w / 2 - 0.3, PASS.w / 2 + 0.3, PASS.z0 - 0.3, PASS.z1 + 0.3), fl(HALL.x0 - 0.6, HALL.x1 + 0.6, HALL.z0 - 0.6, HALL.z1 + 0.6)]);
    return { rock: merge(rock), floor };
  }, []);
  return <group>
    <mesh geometry={g.rock} material={m.wall} receiveShadow />
    <mesh geometry={g.floor} material={m.floor} receiveShadow />
  </group>;
}
/** Işıklar: ayak diplerinde yukarı vuran sıcak ışıklar (fotoğraftaki gibi); seçilmiş yerlerde gerçek nokta ışıkları */
const base = (px: number, pz: number, dx: number, dz: number): [number, number, number] => [px + dx * (PILLAR_HALF + 0.55), 0.7, pz + dz * (PILLAR_HALF + 0.55)];
export const LIGHTS: [number, number, number][] = [
  [0, 3.2, -10],
  base(-8, -34, 1, 1), base(8, -34, -1, 1), base(-24, -50, 1, 0), base(24, -50, -1, 0), base(-8, -50, 0, 1), base(8, -66, 0, -1), base(-24, -66, 0, 1), base(24, -34, 0, -1),
  [-10, 0.8, -97.5], [10, 0.8, -97.5], [0, 6, -88],
];
export function Lamps({ n }: { n: number }) {
  const geo = useMemo(() => merge(LIGHTS.slice(1).filter((p) => p[1] < 1).map(([x, , z]) => at(new THREE.CylinderGeometry(0.16, 0.2, 0.18, 10), x, 0.09, z))), []);
  const list = LIGHTS.slice(0, n);
  return <group userData={{ noCast: true }}>
    <mesh geometry={geo}><meshStandardMaterial color="#fff1c8" emissive="#ffc46b" emissiveIntensity={3} /></mesh>
    {list.map((p, i) => <pointLight key={i} position={p} color={i === 0 ? '#ffe6c4' : '#ffb35c'} intensity={p[1] > 5 ? 40 : 34} distance={p[1] > 5 ? 22 : 15} decay={1.4} />)}
  </group>;
}
/** Sade figür parçaları (oturan ya da ayakta) — tek renkli köşe rengiyle */
function figure(x: number, z: number, yaw: number, sit: boolean, col: THREE.Color): THREE.BufferGeometry[] {
  const parts = sit ? [at(new THREE.CapsuleGeometry(0.2, 0.42, 3, 8), 0, 0.92, 0.04), at(new THREE.SphereGeometry(0.12, 10, 8), 0, 1.42, 0.02), at(bx(0.36, 0.14, 0.45, 2), 0, 0.55, -0.2), at(bx(0.32, 0.45, 0.14, 2), 0, 0.25, -0.4)]
    : [at(new THREE.CapsuleGeometry(0.2, 0.55, 3, 8), 0, 1.1, 0), at(new THREE.SphereGeometry(0.12, 10, 8), 0, 1.7, 0), at(bx(0.34, 0.8, 0.2, 2), 0, 0.4, 0)];
  return parts.map((pg, k) => { const ng = pg.index ? pg.toNonIndexed() : pg; ng.rotateY(yaw); ng.translate(x, 0, z); const n = ng.attributes.position.count, cc = new Float32Array(n * 3), cl = k === 1 ? new THREE.Color('#c9a48a') : col; for (let i = 0; i < n; i++) cc.set([cl.r, cl.g, cl.b], i * 3); ng.setAttribute('color', new THREE.BufferAttribute(cc, 3)); ng.deleteAttribute('uv'); return ng; });
}
/** Salonun kuzey duvarı: arkadan aydınlatılmış tuz tuğlalar; banklar; galeride piknik masaları; ziyaretçiler */
export function Furniture({ m }: { m: Mats }) {
  const glow = useMemo(() => canvasTex(512, 128, (g, r) => { g.fillStyle = '#5a2c14'; g.fillRect(0, 0, 512, 128); const bw = 48, bh = 24;
    for (let row = 0; row < 6; row++) for (let i = -1; i < 12; i++) { const x = i * bw + (row % 2 ? bw / 2 : 0) + 2, y = row * bh + 2, gr = g.createRadialGradient(x + bw / 2, y + bh / 2, 2, x + bw / 2, y + bh / 2, bw * 0.7); const hh = 18 + r() * 14, l = 52 + r() * 18;
      gr.addColorStop(0, `hsl(${hh},90%,${l + 14}%)`); gr.addColorStop(1, `hsl(${hh - 6},85%,${l - 10}%)`); g.fillStyle = gr; g.fillRect(x, y, bw - 4, bh - 4); } }, 13), []);
  const g = useMemo(() => {
    const wood: THREE.BufferGeometry[] = [];
    for (const b of BENCHES) wood.push(at(bx(b.w, 0.08, 0.5, 2), b.x, 0.45, b.z), at(bx(b.w, 0.5, 0.08, 2), b.x, 0.72, b.z + 0.24), ...[-1, 1].map((s) => at(bx(0.08, 0.45, 0.45, 2), b.x + s * (b.w / 2 - 0.2), 0.22, b.z)));
    for (const [tx, tz] of TABLES) { const rot = Math.abs(tx) > 30; const piece = (w: number, h: number, d: number, x: number, y: number, z: number) => { const q = bx(rot ? d : w, h, rot ? w : d, 2); return at(q, tx + (rot ? z : x), y, tz + (rot ? x : z)); };
      wood.push(piece(2, 0.07, 0.8, 0, 0.76, 0), piece(2, 0.06, 0.28, 0, 0.45, 0.65), piece(2, 0.06, 0.28, 0, 0.45, -0.65), ...[-0.85, 0.85].flatMap((x) => [piece(0.08, 0.76, 0.08, x, 0.38, 0), piece(0.08, 0.45, 0.08, x, 0.22, 0.65), piece(0.08, 0.45, 0.08, x, 0.22, -0.65)])); }
    const r = rng(31), ppl: THREE.BufferGeometry[] = []; const pal = ['#5a6b7d', '#8a5a4a', '#6f7d5a', '#7a6a8a', '#3f4a55', '#a0785a'], c = () => new THREE.Color(pal[(r() * pal.length) | 0]);
    for (const b of BENCHES) for (let k = 0; k < 2; k++) { if (r() < 0.3) continue; ppl.push(...figure(b.x + (k ? 1.2 : -1.4), b.z, Math.PI, true, c())); }
    ppl.push(...figure(-1.2, -44, 0.4, false, c()), ...figure(-0.4, -44.6, 3.4, false, c()), ...figure(17.5, -60, -1.2, false, c()), ...figure(-30.5, -30, 2.2, false, c()), ...figure(-33, -42.3, Math.PI / 2, true, c()));
    return { wood: merge(wood), ppl: mergeGeometries(ppl)! };
  }, []);
  return <group>
    <mesh position={[0, 2.25, HALL.z0 + 0.12]}><planeGeometry args={[21, 3.9]} /><meshStandardMaterial map={glow} emissiveMap={glow} emissive="#ffffff" emissiveIntensity={1} roughness={0.6} /></mesh>
    <mesh geometry={g.wood} material={m.wood} castShadow receiveShadow />
    <mesh geometry={g.ppl} castShadow><meshStandardMaterial vertexColors roughness={0.85} /></mesh>
  </group>;
}
