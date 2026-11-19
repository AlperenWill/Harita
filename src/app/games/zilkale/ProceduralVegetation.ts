/**
 * Zil Kale — prosedürel bitki örtüsü: eğreltiotu, yosun öbekleri, orman gülü (Rhododendron ponticum), doğu ladini ve kızılağaç.
 *
 * NEDEN BÖYLE:
 *  - Hepsi InstancedMesh: tür başına tek çizim çağrısı (binlerce eğreltiotu ≈ 1 çağrı). Yerleşim tohumlu (her açılışta aynı orman).
 *  - Yoğunluk patikanın kenarında en yüksek: oyuncu hep patikada olduğu için gözün değdiği yer orasıdır. Uzak yamaçlar ağaçla dolar,
 *    alt bitki örtüsü orada seyrek tutulur (görünmeyen yere üçgen harcamamak).
 *  - Rüzgâr köşe gölgelendiricisinde: yükseklikle artan salınım  offset = A · h² · (sin(ωt + φ) + 0,35·sin(2,7ωt + 1,3φ)) · ŵ
 *    h = yerel yükseklik oranı (dip sabit kalır, uç savrulur), φ = örneğin dünya konumundan faz (komşular farklı anda eğilir,
 *    “dalga” ormanda yürür), ŵ = sisle aynı rüzgâr yönü (VolumetricFogSystem.wind). Pil tasarrufunda A = 0 (animasyon durur).
 *  - Düşük kademe: alt bitki örtüsü %50 ve yalnızca patika kenarında (≤ 7 m); uzak ağaçlar çapraz iki düzlemlik "pano" (billboard) olur.
 * Şanlıurfa/Nemrut ile tutarlılık: aynı kademe adları (low/medium/high), aynı tohumlu rastgele (16807), aynı onBeforeCompile deseni.
 */
import * as THREE from 'three';
import { CASTLE, ROUTE_LEN, SUMMIT_CAM, heightAt, riverX, routeAt } from './valley';

export type Tier = 'low' | 'medium' | 'high';
export type Kind = 'fern' | 'moss' | 'rhodo' | 'spruce' | 'alder';
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

/* ---------- patikaya uzaklık (yerleşim için önceden örneklenmiş) ---------- */
const PATH: [number, number][] = []; for (let s = 0; s <= ROUTE_LEN; s += 1.5) { const p = routeAt(s).p; PATH.push([p[0], p[2]]); }
export function pathDist(x: number, z: number) { let b = Infinity; for (const [px, pz] of PATH) { const d = (px - x) ** 2 + (pz - z) ** 2; if (d < b) b = d; } return Math.sqrt(b); }

function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - dx * t, z - az - dz * t); }
export const BOUNDS = { x0: -130, x1: 130, z0: 40, z1: -400 } as const;
export interface Placed { x: number; y: number; z: number; s: number; r: number; far: boolean }
/** Tür başına sayılar (yüksek kademe); düşükte alt bitki %50 */
export function budget(kind: Kind, tier: Tier): number {
  const hi: Record<Kind, number> = { fern: 4200, moss: 1600, rhodo: 700, spruce: 1500, alder: 120 };
  const k = tier === 'high' ? 1 : tier === 'medium' ? 0.7 : kind === 'spruce' || kind === 'alder' ? 0.55 : 0.5;
  return Math.round(hi[kind] * k);
}
/** Yerleşim: reddetme örneklemesi. Patika kenarı ağırlığı w(d) = e^(−d/6) (alt bitki), ağaçlar patikadan ≥ 3,5 m, dereden ≥ 6 m. */
export function scatter(kind: Kind, tier: Tier, seed = 11): Placed[] {
  const r = rng(seed + kind.length * 101), out: Placed[] = [], want = budget(kind, tier), under = kind === 'fern' || kind === 'moss' || kind === 'rhodo';
  const maxEdge = tier === 'low' && under ? 7 : under ? 26 : 120;
  for (let tries = 0; out.length < want && tries < want * 60; tries++) {
    // alt bitki: patikadan rastgele uzaklıkta, patika boyunca örnekle (reddetmeyi verimli yapar)
    let x: number, z: number;
    if (under) { const s = r() * ROUTE_LEN, p = routeAt(s), d = (r() < 0.5 ? -1 : 1) * (1.3 + Math.pow(r(), 1.8) * maxEdge); x = p.p[0] - p.dir[1] * d; z = p.p[2] + p.dir[0] * d; }
    else { x = BOUNDS.x0 + r() * (BOUNDS.x1 - BOUNDS.x0); z = BOUNDS.z1 + r() * (BOUNDS.z0 - BOUNDS.z1); }
    const dr = Math.abs(x - riverX(z)), dp = pathDist(x, z);
    if (kind === 'alder' ? dr < 7.5 || dr > 11 : dr < (kind === 'moss' ? 6.5 : 7.5)) continue;
    if (dp < (kind === 'rhodo' ? 3 : under ? 1.2 : kind === 'alder' ? 6 : 4) || (under && dp > maxEdge)) continue;
    if (kind === 'spruce' && Math.hypot(x - CASTLE.x, z - CASTLE.z) < 22) continue;    // kale burnunun tepesi açık (kayalık)
    if ((kind === 'spruce' || kind === 'alder') && segDist(x, z, SUMMIT_CAM.pos[0], SUMMIT_CAM.pos[2], CASTLE.x, CASTLE.z) < 9) continue;   // tepe kamerasının görüşü açık
    if (Math.hypot(x - riverX(-4) - 22, z + 4) < 9 || Math.hypot(x - riverX(-40) - 18, z + 40) < 6) continue;   // ev ve serender çevresi
    if (under && r() > Math.exp(-dp / (tier === 'low' ? 4 : 9))) continue;
    out.push({ x, y: heightAt(x, z), z, s: kind === 'spruce' ? 0.8 + r() * 0.7 : kind === 'alder' ? 0.8 + r() * 0.5 : kind === 'rhodo' ? 0.55 + r() * 0.5 : 0.45 + r() * 0.55, r: r() * Math.PI * 2, far: dp > (tier === 'high' ? 70 : 40) });
  }
  return out;
}

/* ---------- rüzgâr gölgelendiricisi ---------- */
export interface WindUniforms { uTime: { value: number }; uWind: { value: THREE.Vector3 }; uAmp: { value: number } }
export const makeWind = (): WindUniforms => ({ uTime: { value: 0 }, uWind: { value: new THREE.Vector3(1, 0, 0) }, uAmp: { value: 1 } });
/** height: geometrinin yerel yüksekliği (salınım h = y/height), stiff: tür sertliği (ladin < eğreltiotu) */
export function windMaterial<M extends THREE.Material>(m: M, u: WindUniforms, height: number, stiff: number): M {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec3 uWind; uniform float uAmp;').replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xyz;
        #endif
        float h = clamp(position.y / ${height.toFixed(2)}, 0.0, 1.0), ph = dot(ip.xz, vec2(0.21, 0.17)) + uWind.z * 0.0;
        float sw = (sin(uTime * 1.7 + ph) + 0.35 * sin(uTime * 4.6 + ph * 1.3)) * h * h * ${stiff.toFixed(3)} * uAmp;
        // örnek dönüşümünden ÖNCE yerel uzayda; rüzgâr yönünü örneğin dönüşü kadar geri döndür ki tüm orman aynı yöne eğilsin
        vec3 wl = vec3(uWind.x, 0.0, uWind.y);
        #ifdef USE_INSTANCING
          wl = normalize(transpose(mat3(instanceMatrix)) * wl);
        #endif
        transformed += wl * sw + vec3(0.0, -abs(sw) * 0.25, 0.0);
      }`);
  };
  m.customProgramCacheKey = () => `zk-wind-${height}-${stiff}`;
  return m;
}

/* ---------- geometriler ---------- */
/** Eğreltiotu: merkezden dışa kıvrılan 7 yaprak (her biri 6 parçalı, yaprakçık dişli şerit) — tek geometri */
export function fernGeometry(): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [], fronds = 7, seg = 6;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + f * 0.4, len = 0.75 + (f % 3) * 0.12, base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, w = Math.sin(t * Math.PI) * 0.17 * len + 0.01, rr = t * len, y = Math.sin(t * 1.9) * 0.55 * len - t * t * 0.25;
      const cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      pos.push(cx + px, y, cz + pz, cx - px, y, cz - pz); uv.push(0, t, 1, t);
      if (i < seg) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Eğreltiotu yaprak dokusu: orta damar + iki yanda dişli yaprakçıklar (alfa kesme) */
export function fernTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d')!; g.clearRect(0, 0, 64, 256);
  g.strokeStyle = '#3d6a2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 256); g.lineTo(32, 0); g.stroke();
  for (let y = 250; y > 6; y -= 9) { const w = 28 * Math.sin(((256 - y) / 256) * Math.PI) + 3; g.fillStyle = `hsl(${95 + (y % 3) * 6},${45 + (y % 5)}%,${26 + (y % 7)}%)`;
    for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(32, y); g.quadraticCurveTo(32 + sd * w * 0.6, y - 8, 32 + sd * w, y - 4); g.quadraticCurveTo(32 + sd * w * 0.5, y + 2, 32, y + 3); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Orman gülü: koyu yaprak kümesi (deforme küreler) + pembe-mor çiçek salkımları, tek geometri, köşe renkli */
export function rhodoGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [], r = rng(5), leaf = new THREE.Color('#2c4a26'), bloom = new THREE.Color('#b65aa8');
  for (let i = 0; i < 6; i++) { const g = new THREE.IcosahedronGeometry(0.45 + r() * 0.25, 1), a = r() * 6.28, d = r() * 0.5; g.scale(1.2, 0.75, 1.1); g.translate(Math.cos(a) * d, 0.45 + r() * 0.5, Math.sin(a) * d); paint(g, leaf, 0.08, r); parts.push(g); }
  for (let i = 0; i < 9; i++) { const g = new THREE.IcosahedronGeometry(0.13 + r() * 0.05, 0), a = r() * 6.28, d = 0.4 + r() * 0.35; g.translate(Math.cos(a) * d, 0.75 + r() * 0.55, Math.sin(a) * d); paint(g, bloom, 0.12, r); parts.push(g); }
  return merge(parts);
}
/** Yosun öbeği: yere yapışık, yassı ve tümsekli disk */
export function mossGeometry(): THREE.BufferGeometry { const g = new THREE.SphereGeometry(0.6, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(1, 0.22, 1); paint(g, new THREE.Color('#4f7a2c'), 0.12, rng(9)); return g; }
/** Doğu ladini (Picea orientalis): gövde + 5 kat sarkık dallı koni; yakın LOD */
export function spruceGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [], r = rng(13), trunk = new THREE.CylinderGeometry(0.12, 0.28, 3, 6); trunk.translate(0, 1.5, 0); paint(trunk, new THREE.Color('#3a2a1e'), 0.05, r); parts.push(trunk);
  for (let i = 0; i < 5; i++) { const h = 3.2 - i * 0.35, rad = 2.3 - i * 0.42, g = new THREE.ConeGeometry(rad, h, 9, 2, true); const p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y < -h / 2 + 0.01) p.setY(k, y - 0.25 * Math.sin(k * 2.3) - 0.2); }  // sarkık dal uçları
    g.translate(0, 2.2 + i * 1.75, 0); paint(g, new THREE.Color(i % 2 ? '#1e3a26' : '#24432b'), 0.1, r); parts.push(g); }
  const m = merge(parts); m.computeVertexNormals(); return m;
}
/** Uzak ladin "panosu": iki çapraz düzlem (4 üçgen), ağaç silüeti dokusu */
export function billboardGeometry(): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(4.6, 11); a.translate(0, 5.5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); return merge([a, b]);
}
export function spruceCardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 160; const g = c.getContext('2d')!;
  g.fillStyle = '#3a2a1e'; g.fillRect(29, 120, 6, 40);
  for (let i = 0; i < 7; i++) { const y = 140 - i * 20, w = 30 - i * 3.8; g.fillStyle = i % 2 ? '#1f3b27' : '#26452d'; g.beginPath(); g.moveTo(32 - w, y + 4); g.lineTo(32, y - 26); g.lineTo(32 + w, y + 4); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Kızılağaç (dere kıyısı yapraklı ağaç): ince gövde + 4 yuvarlak taç kümesi */
export function alderGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [], r = rng(21), trunk = new THREE.CylinderGeometry(0.1, 0.2, 5, 6); trunk.translate(0, 2.5, 0); paint(trunk, new THREE.Color('#6b665c'), 0.05, r); parts.push(trunk);
  for (let i = 0; i < 4; i++) { const g = new THREE.IcosahedronGeometry(1.4 + r() * 0.6, 1), a = r() * 6.28; g.translate(Math.cos(a) * 0.8, 5 + r() * 1.8, Math.sin(a) * 0.8); paint(g, new THREE.Color('#3f6a2e'), 0.1, r); parts.push(g); }
  return merge(parts);
}
function paint(g: THREE.BufferGeometry, c: THREE.Color, jitter: number, r: () => number) {
  const n = g.attributes.position.count, col = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const j = 1 + (r() - 0.5) * jitter * 2; col[i * 3] = c.r * j; col[i * 3 + 1] = c.g * j; col[i * 3 + 2] = c.b * j; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
/** Basit birleştirme (üç-örnek bağımlılığı olmadan): index'leri düzleştirir */
export function merge(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [], uv: number[] = [];
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; if (!g.attributes.normal) g.computeVertexNormals(); const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); if (C) col.push(C.getX(i), C.getY(i), C.getZ(i)); else col.push(1, 1, 1); if (U) uv.push(U.getX(i), U.getY(i)); else uv.push(0, 0); } }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return m;
}
/** Yerleşimleri bir InstancedMesh'e yaz (yamaçta hafif eğim: dünya eğimine yarı uyum) */
export function fillInstances(mesh: THREE.InstancedMesh, list: Placed[], tilt = 0.5) {
  const o = new THREE.Object3D();
  list.forEach((p, i) => { const e = 1.2, nx = heightAt(p.x - e, p.z) - heightAt(p.x + e, p.z), nz = heightAt(p.x, p.z - e) - heightAt(p.x, p.z + e);
    o.position.set(p.x, p.y - 0.05, p.z); o.rotation.set(Math.atan2(nz, 2 * e) * tilt, p.r, -Math.atan2(nx, 2 * e) * tilt, 'XYZ'); o.scale.setScalar(p.s); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
  mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
}
