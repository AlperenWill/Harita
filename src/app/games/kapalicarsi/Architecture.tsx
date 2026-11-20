/**
 * Kapalıçarşı — mimari: zemin, duvarlar, tonozlar ve kubbeler (GPU'da üretilen desen), modüler dükkân cepheleri, tabelalar,
 * vitrin malları (uzaklığa göre LOD), ampuller / kepenkler, tavan gözlerinden süzülen ışık huzmeleri, gece güvenlik lambaları.
 *
 * NEDEN BİRLEŞTİRİLMİŞ AĞ + INSTANCING?
 *   Çarşı her girişte yeniden üretilir; yüzlerce dükkân × birkaç parça = binlerce nesne. Statik duvarlar TEK birleştirilmiş ağdır,
 *   tekrarlanan modüller (ayak, kemer, tabela, mal, ampul, kepenk, huzme) birer InstancedMesh'tir. Toplam ~20 draw call.
 * NEDEN TAVAN DESENİ GÖLGELENDİRİCİDE?
 *   Doku dosyası yok ve her tonoz farklı uzunlukta. Tonoz ağına iki öznitelik yazılır: aL (tonoz boyunca metre), aA (kesit açısı 0..1).
 *   Parça gölgelendiricisi bu iki sayıdan kemer kuşaklarını (kırmızı–krem taş dizisi), üzengi bantlarını ve her bölmenin ortasındaki
 *   kalem işi madalyonu çizer; kubbelerde (aKind = 1) radyal kaburgalar ve tepedeki göz. Desen çözünürlükten bağımsızdır, bellek harcamaz.
 *   Işıklandırma MeshStandardMaterial'dan gelir (onBeforeCompile ile yalnızca renk ve ışıma değiştirilir).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BEDESTEN, GRID, WIDTH, SHOP_D, SHOP_W, edgeRect, nodeSquares, type Layout, type Node, type Trade, type V2 } from './ProceduralStreetGenerator';

export const FACADE_H = 4.4, OPEN_H = 3.05, RISE = 0.9;
const Y = new THREE.Vector3(0, 1, 0);

/* ---------- dokular (canvas, bir kez) ---------- */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
const flagstone = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#5d564c'; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) { let x = (y / 64) % 2 ? -40 : 0; while (x < 512) { const w = 70 + rnd() * 70, t = 120 + rnd() * 40; g.fillStyle = `rgb(${t},${t - 6},${t - 14})`; g.fillRect(x + 2, y + 2, w - 4, 60); for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,250,240'},${rnd() * 0.06})`; g.fillRect(x + rnd() * w, y + rnd() * 60, 3, 3); } x += w; } }
});
const plasterTex = () => canvasTex(256, 256, (g) => { g.fillStyle = '#eadfc8'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '120,100,70' : '255,250,240'},${rnd() * 0.07})`; g.beginPath(); g.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 7, 0, Math.PI * 2); g.fill(); } g.fillStyle = 'rgba(90,70,50,.25)'; g.fillRect(0, 250, 256, 6); });
/** Tabela atlası: her dükkânın tabelası bir hücre (koyu zemin, altın yazı); örnek başına UV kaydırma özniteliğiyle seçilir */
export function signAtlas(L: Layout) {
  const cols = 4, rows = Math.ceil(L.shops.length / cols), cw = 256, ch = 48;
  const tex = canvasTex(cols * cw, rows * ch, (g) => {
    L.shops.forEach((s, i) => { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch; g.fillStyle = ['#2a1d14', '#1c2a24', '#2a1720', '#1d2233'][s.trade.length % 4]; g.fillRect(x, y, cw, ch); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
      g.fillStyle = '#f2d27a'; g.font = 'bold 19px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s.sign.length > 22 ? s.sign.slice(0, 22) : s.sign, x + cw / 2, y + ch / 2 + 1, cw - 16); });
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; return { tex, cols, rows };
}

/* ---------- tonoz + kubbe ağı ---------- */
function vaultGeometry(L: Layout) {
  const pos: number[] = [], aL: number[] = [], aA: number[] = [], aK: number[] = [], aW: number[] = [], aS: number[] = [], idx: number[] = [];
  const sq = new Map(nodeSquares(L).map((q) => [`${q.c[0]},${q.c[1]}`, q.h]));
  const hOf = (n: Node) => sq.get(`${n.x},${n.z}`) ?? 1.8;
  const push = (x: number, y: number, z: number, l: number, a: number, k: number, w: number, s: number) => { pos.push(x, y, z); aL.push(l); aA.push(a); aK.push(k); aW.push(w); aS.push(s); return pos.length / 3 - 1; };
  for (const e of L.edges) {
    const R = edgeRect(L, e), A = L.nodes[e.a]!, w = R.w, n: V2 = [-R.d[1], R.d[0]];
    const startOff = hOf(A), len = e.b < 0 ? R.half * 2 - startOff : R.half * 2 - startOff - hOf(L.nodes[e.b]!);
    if (len <= 0.2) continue;
    const ox = A.x + R.d[0] * startOff, oz = A.z + R.d[1] * startOff, rows = Math.max(2, Math.ceil(len / 0.75)), segs = 14, base = pos.length / 3, sky = e.main ? 1 : 0;
    for (let i = 0; i <= rows; i++) { const l = (len * i) / rows; for (let j = 0; j <= segs; j++) { const th = (Math.PI * j) / segs, c = Math.cos(th) * w, y = FACADE_H + Math.sin(th) * w * RISE; push(ox + R.d[0] * l + n[0] * c, y, oz + R.d[1] * l + n[1] * c, l, j / segs, 0, w * 2, sky); } }
    for (let i = 0; i < rows; i++) for (let j = 0; j < segs; j++) { const a = base + i * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  }
  // kavşak: yelken tonoz (köşelerde duvara, kenar ortalarında tonoz tepesine oturan küresel yüzey)
  for (const q of nodeSquares(L)) {
    const h = q.h, R0 = h * Math.SQRT2, N = 12, base = pos.length / 3;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const x = -h + (2 * h * i) / N, z = -h + (2 * h * j) / N, rr = Math.hypot(x, z), y = FACADE_H + Math.sqrt(Math.max(0, R0 * R0 - x * x - z * z)) * (RISE * 1.0);
      push(q.c[0] + x, y, q.c[1] + z, (Math.atan2(z, x) / (Math.PI * 2) + 0.5), 1 - rr / R0, 1, h * 2, 1);
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const a = base + i * (N + 1) + j, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aL', new THREE.Float32BufferAttribute(aL, 1)); g.setAttribute('aA', new THREE.Float32BufferAttribute(aA, 1));
  g.setAttribute('aKind', new THREE.Float32BufferAttribute(aK, 1)); g.setAttribute('aW', new THREE.Float32BufferAttribute(aW, 1)); g.setAttribute('aSky', new THREE.Float32BufferAttribute(aS, 1));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Kalem işi desen gölgelendiricisi (GPU'da üretilir) */
export function vaultMaterial(day: { value: number }) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uDay = day;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aL; attribute float aA; attribute float aKind; attribute float aW; attribute float aSky; varying float vL; varying float vA; varying float vK; varying float vW; varying float vS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = aL; vA = aA; vK = aKind; vW = aW; vS = aSky;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vL; varying float vA; varying float vK; varying float vW; varying float vS; uniform float uDay;
      const vec3 CREAM = vec3(0.93, 0.86, 0.72), RED = vec3(0.6, 0.19, 0.13), BLUE = vec3(0.12, 0.26, 0.52), GOLD = vec3(0.86, 0.66, 0.3);
      float glowMask = 0.0;
      vec3 vaultPattern() {
        if (vK < 0.5) {
          float bay = 4.5, u = mod(vL, bay);
          if (u < 0.45) return mod(floor(vA * 18.0), 2.0) < 1.0 ? RED : CREAM;              // kemer kuşağı: kırmızı–krem taş dizisi
          float edge = min(vA, 1.0 - vA);
          if (edge < 0.035) return RED; if (edge < 0.055) return GOLD; if (edge < 0.085) return BLUE;   // üzengi bantları
          vec2 p = vec2(u - bay * 0.5 - 0.22, (vA - 0.5) * vW * 1.4);                          // bölme ortasında madalyon
          float r = length(p), a = atan(p.y, p.x);
          if (vS > 0.5 && r < 0.42) { glowMask = 1.0; return vec3(1.0); }                   // tavan gözü (gün ışığı)
          float petal = 0.5 + 0.13 * cos(a * 8.0);
          if (r < 0.2) return BLUE; if (r < petal) return mix(RED, GOLD, step(0.38, r));
          if (abs(r - 0.78) < 0.04) return BLUE;
          float vine = sin(p.x * 5.0) * 0.35 - p.y; if (abs(vine) < 0.03 && abs(p.y) > 0.9) return RED;   // kenar sarmaşığı
          return CREAM;
        }
        float rib = abs(fract(vL * 8.0) - 0.5);
        if (vA > 0.88) { glowMask = 1.0; return vec3(1.0); }                                  // kubbe gözü
        if (vA > 0.82) return GOLD;
        if (rib < 0.035) return RED;
        if (vA < 0.06) return RED; if (vA < 0.09) return GOLD;
        float star = cos(vL * 6.2831 * 16.0) * 0.5 + 0.5; if (vA > 0.55 && vA < 0.7 && star > 0.85) return BLUE;
        return CREAM;
      }`)
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = vaultPattern();')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += glowMask * mix(vec3(0.05, 0.08, 0.16), vec3(2.4, 2.25, 2.0), uDay);');
  };
  return m;
}

/* ---------- statik duvarlar (tek ağ) ---------- */
function wallGeometry(L: Layout) {
  const parts: THREE.BufferGeometry[] = [], sq = nodeSquares(L);
  const box = (cx: number, cy: number, cz: number, len: number, h: number, yaw: number, t = 0.4) => { const g = new THREE.BoxGeometry(len, h, t); const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 4, uv.getY(i) * h / 4); g.rotateY(yaw).translate(cx, cy, cz); parts.push(g); };
  const hAt = (nd: Node) => sq.find((q) => q.c[0] === nd.x && q.c[1] === nd.z)?.h ?? 1.8;
  for (const e of L.edges) {
    const R = edgeRect(L, e), A = L.nodes[e.a]!, s0 = hAt(A), s1 = e.b < 0 ? 0 : hAt(L.nodes[e.b]!), yaw = Math.atan2(-R.d[1], R.d[0]), n: V2 = [-R.d[1], R.d[0]];
    const len = R.half * 2 - s0 - s1 - (e.b < 0 ? 2 : 0); if (len <= 0) continue;
    for (const side of [1, -1]) {
      const shops = L.shops.filter((s) => s.edge === e.id && s.side === side), base = [A.x + R.d[0] * s0 + n[0] * side * (R.w + 0.2), A.z + R.d[1] * s0 + n[1] * side * (R.w + 0.2)];
      const at = (t: number, y: number, l: number, h: number) => box(base[0] + R.d[0] * t, y, base[1] + R.d[1] * t, l, h, yaw);
      if (!shops.length) { at(len / 2, FACADE_H / 2, len, FACADE_H); continue; }   // dükkânsız yan (bedesten duvarı)
      at(len / 2, (OPEN_H + FACADE_H) / 2, len, FACADE_H - OPEN_H);                  // açıklıkların üstü (lento kuşağı)
      const ts = shops.map((s) => (s.center[0] - base[0]) * R.d[0] + (s.center[1] - base[1]) * R.d[1]).sort((p, q) => p - q);
      const first = ts[0] - SHOP_W / 2, last = ts[ts.length - 1] + SHOP_W / 2;
      if (first > 0.05) at(first / 2, OPEN_H / 2, first, OPEN_H);
      if (len - last > 0.05) at((last + len) / 2, OPEN_H / 2, len - last, OPEN_H);
    }
  }
  // kavşakların sokak açılmayan kenarları
  for (const q of sq) {
    const nd = L.nodes.find((n) => n && n.x === q.c[0] && n.z === q.c[1])!, dirs = L.edges.filter((e) => e.a === nd.id || e.b === nd.id).map((e) => { const R = edgeRect(L, e); const away = e.a === nd.id ? 1 : -1; return [Math.round(R.d[0] * away), Math.round(R.d[1] * away)]; });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!dirs.some(([a, b]) => a === dx && b === dz)) box(q.c[0] + dx * (q.h + 0.2), FACADE_H / 2, q.c[1] + dz * (q.h + 0.2), q.h * 2 + 0.8, FACADE_H, Math.atan2(-dz, dx) + Math.PI / 2);
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
}

/* ---------- vitrin malları: zanaata göre geometri ---------- */
const GOODS: Record<Trade, { geo: () => THREE.BufferGeometry; colors: string[]; per: number; emissive?: boolean }> = {
  kuyumcu: { geo: () => new THREE.BoxGeometry(0.16, 0.05, 0.12), colors: ['#e8c25a', '#f4d47a', '#d9d9de'], per: 10, emissive: true },
  halici: { geo: () => new THREE.PlaneGeometry(0.9, 1.5), colors: ['#8e2a2a', '#7a3b1f', '#2c3f6b', '#a0522d', '#5a2a4a'], per: 3 },
  bakirci: { geo: () => new THREE.LatheGeometry([[0, 0], [0.16, 0.02], [0.2, 0.14], [0.15, 0.3], [0.08, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 10), colors: ['#c06a3a', '#b5582a', '#d98a52'], per: 7 },
  baharatci: { geo: () => new THREE.ConeGeometry(0.17, 0.32, 10), colors: ['#c8361f', '#e0a020', '#7a3e16', '#3a6a2a', '#d8682a'], per: 8 },
  lambaci: { geo: () => new THREE.SphereGeometry(0.15, 10, 8), colors: ['#3a7bd5', '#e0453a', '#2bb56a', '#f2c230', '#a64ad8'], per: 9, emissive: true },
  cinici: { geo: () => new THREE.CylinderGeometry(0.2, 0.17, 0.03, 18).rotateX(Math.PI / 2), colors: ['#1f5fa8', '#2a8a8a', '#c8442a', '#f2efe6'], per: 8 },
  antikaci: { geo: () => new THREE.BoxGeometry(0.22, 0.2, 0.16), colors: ['#5a3a22', '#7a6a4a', '#3a3a30', '#8a7a5a'], per: 6 },
  kumasci: { geo: () => new THREE.CylinderGeometry(0.08, 0.08, 0.7, 10).rotateZ(Math.PI / 2), colors: ['#c23b6b', '#2f8a8a', '#e8c86a', '#5a3a8a', '#e6e0d2', '#b5452f'], per: 9 },
};
/** Mal yerleşimi: dükkânın içinde, vitrine yakın raflarda; her zanaatın kendi düzeni */
function goodsLayout(trade: Trade, k: number, i: number): [number, number, number, number] {   // x (genişlik), y, derinlik, dönüş
  const w = SHOP_W - 0.8;
  switch (trade) {
    case 'halici': return [-w / 2 + 0.45 + i * 0.9, 1.55, 1.6, 0];
    case 'lambaci': return [-w / 2 + 0.3 + (i % 5) * (w - 0.6) / 4, 2.65 - Math.floor(i / 5) * 0.35 - (i % 2) * 0.18, 0.6 + Math.floor(i / 5) * 0.8, 0];
    case 'cinici': return [-w / 2 + 0.3 + (i % 4) * (w - 0.6) / 3, 1.3 + Math.floor(i / 4) * 0.55, 2.2, 0];
    case 'kumasci': return [(i % 3 - 1) * 0.15, 0.8 + Math.floor(i / 3) * 0.2, 1.4 + (i % 3) * 0.1, 0];
    default: return [-w / 2 + 0.25 + (i % 5) * (w - 0.5) / 4, 0.95 + Math.floor(i / 5) * 0.45 + (k % 3) * 0.02, 0.9 + Math.floor(i / 5) * 0.5, i * 0.7];
  }
}

export function Architecture({ L, night, hi, lodRadius }: { L: Layout; night: boolean; hi: boolean; lodRadius: number }) {
  const day = useMemo(() => ({ value: night ? 0 : 1 }), [night]);
  const G = useMemo(() => {
    const atlas = signAtlas(L);
    const floor = flagstone(); floor.repeat.set((L.bounds.x1 - L.bounds.x0) / 5, (L.bounds.z1 - L.bounds.z0) / 5);
    const pl = plasterTex();
    return { vault: vaultGeometry(L), walls: wallGeometry(L), atlas, floorM: new THREE.MeshStandardMaterial({ map: floor, roughness: 0.75, metalness: 0.05 }), wallM: new THREE.MeshStandardMaterial({ map: pl, roughness: 0.9 }) };
  }, [L]);
  const vm = useMemo(() => vaultMaterial(day), [day]);
  // dükkân modülleri (instanced)
  const M = useMemo(() => {
    const n = L.shops.length, M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const inner = new THREE.InstancedMesh(new THREE.BoxGeometry(SHOP_W - 0.3, OPEN_H + 0.2, SHOP_D), new THREE.MeshStandardMaterial({ color: '#b98a5a', roughness: 0.9, side: THREE.BackSide, emissive: '#3a2410', emissiveIntensity: night ? 0.05 : 0.6 }), n);
    const pil = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, OPEN_H, 0.5), new THREE.MeshStandardMaterial({ color: '#d8c9a8', roughness: 0.8 }), n + L.edges.length * 2);
    const archG = (() => { const s = new THREE.Shape(), o = (SHOP_W - 0.4) / 2; s.moveTo(-o - 0.2, 0); s.lineTo(o + 0.2, 0); s.lineTo(o + 0.2, 0.95); s.lineTo(-o - 0.2, 0.95); s.lineTo(-o - 0.2, 0); const h = new THREE.Path(); h.moveTo(-o, 0); h.lineTo(o, 0); h.quadraticCurveTo(o, 0.62, 0, 0.72); h.quadraticCurveTo(-o, 0.62, -o, 0); s.holes.push(h); return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false, curveSegments: 8 }); })();
    const arch = new THREE.InstancedMesh(archG, new THREE.MeshStandardMaterial({ color: '#a8442e', roughness: 0.7 }), n);
    const signG = new THREE.PlaneGeometry(SHOP_W - 0.7, 0.42); signG.setAttribute('aUV', new THREE.InstancedBufferAttribute(new Float32Array(n * 2), 2));
    const signM = new THREE.MeshStandardMaterial({ map: G.atlas.tex, roughness: 0.5, emissive: '#ffffff', emissiveMap: G.atlas.tex, emissiveIntensity: night ? 0.15 : 0.45 });
    signM.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aUV;').replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = (uv + aUV) * vec2(${(1 / G.atlas.cols).toFixed(6)}, ${(1 / G.atlas.rows).toFixed(6)});\n#endif\n#ifdef USE_EMISSIVEMAP\n vEmissiveMapUv = (uv + aUV) * vec2(${(1 / G.atlas.cols).toFixed(6)}, ${(1 / G.atlas.rows).toFixed(6)});\n#endif`); };
    const sign = new THREE.InstancedMesh(signG, signM, n);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(3), toneMapped: false }), n * 2);
    const shut = new THREE.InstancedMesh(new THREE.PlaneGeometry(SHOP_W - 0.36, OPEN_H), new THREE.MeshStandardMaterial({ color: '#7d8186', roughness: 0.5, metalness: 0.6 }), n);
    const sAttr = signG.getAttribute('aUV') as THREE.InstancedBufferAttribute;
    L.shops.forEach((s, i) => {
      const yaw = Math.atan2(s.normal[0], s.normal[1]) + Math.PI, fx = s.center[0] - s.normal[0] * (SHOP_D / 2), fz = s.center[1] - s.normal[1] * (SHOP_D / 2);   // cephe çizgisi
      q.setFromAxisAngle(Y, yaw);
      inner.setMatrixAt(i, M4.compose(new THREE.Vector3(s.center[0], (OPEN_H + 0.2) / 2, s.center[1]), q, one));
      pil.setMatrixAt(i, M4.compose(new THREE.Vector3(fx + s.along[0] * (SHOP_W / 2), OPEN_H / 2, fz + s.along[1] * (SHOP_W / 2)), q, one));
      arch.setMatrixAt(i, M4.compose(new THREE.Vector3(fx - s.normal[0] * 0.02, OPEN_H - 0.02, fz - s.normal[1] * 0.02), q, one));
      sign.setMatrixAt(i, M4.compose(new THREE.Vector3(fx - s.normal[0] * 0.16, OPEN_H + 0.62, fz - s.normal[1] * 0.16), q, one)); sAttr.setXY(i, i % G.atlas.cols, G.atlas.rows - 1 - Math.floor(i / G.atlas.cols));
      for (const k of [-1, 1]) bulbs.setMatrixAt(i * 2 + (k > 0 ? 1 : 0), M4.makeTranslation(fx + s.normal[0] * 0.5 + s.along[0] * k * 0.6, OPEN_H - 0.25, fz + s.normal[1] * 0.5 + s.along[1] * k * 0.6));
      shut.setMatrixAt(i, M4.compose(new THREE.Vector3(fx + s.normal[0] * 0.05, OPEN_H / 2, fz + s.normal[1] * 0.05), q, one));
    });
    // ilk dükkânların karşı uç ayakları (her yan sırasının sonunda)
    let k = n; for (const e of L.edges) for (const side of [1, -1]) { const list = L.shops.filter((s) => s.edge === e.id && s.side === side); if (!list.length) continue; const s = list.reduce((a, b) => ((b.center[0] - a.center[0]) * b.along[0] + (b.center[1] - a.center[1]) * b.along[1] < 0 ? b : a)); const fx = s.center[0] - s.normal[0] * (SHOP_D / 2) - s.along[0] * (SHOP_W / 2), fz = s.center[1] - s.normal[1] * (SHOP_D / 2) - s.along[1] * (SHOP_W / 2); pil.setMatrixAt(k++, M4.compose(new THREE.Vector3(fx, OPEN_H / 2, fz), q.setFromAxisAngle(Y, Math.atan2(s.normal[0], s.normal[1])), one)); }
    pil.count = k;
    for (const im of [pil, arch]) { im.castShadow = false; im.receiveShadow = false; }
    return { inner, pil, arch, sign, bulbs, shut };
  }, [L, G, night]);
  // vitrin malları: zanaat başına bir InstancedMesh; LOD: oyuncuya lodRadius'tan uzak dükkânların malları gizlenir (yalnızca kapı + tabela kalır)
  const goods = useMemo(() => {
    const out: { trade: Trade; mesh: THREE.InstancedMesh; owners: number[]; mats: THREE.Matrix4[] }[] = [];
    for (const trade of Object.keys(GOODS) as Trade[]) {
      const spec = GOODS[trade], list = L.shops.filter((s) => s.trade === trade); if (!list.length) continue;
      const mat = new THREE.MeshStandardMaterial({ roughness: trade === 'kuyumcu' ? 0.25 : 0.7, metalness: trade === 'kuyumcu' || trade === 'bakirci' ? 0.85 : 0, side: trade === 'halici' ? THREE.DoubleSide : THREE.FrontSide, emissive: spec.emissive ? '#ffffff' : '#000000', emissiveIntensity: spec.emissive ? (trade === 'lambaci' ? 0.9 : 0.12) : 0 });
      const mesh = new THREE.InstancedMesh(spec.geo(), mat, list.length * spec.per), owners: number[] = [], mats: THREE.Matrix4[] = [], c = new THREE.Color(), q = new THREE.Quaternion(), M4 = new THREE.Matrix4();
      let k = 0;
      for (const s of list) {
        const yaw = Math.atan2(s.normal[0], s.normal[1]) + Math.PI, fx = s.center[0] - s.normal[0] * (SHOP_D / 2), fz = s.center[1] - s.normal[1] * (SHOP_D / 2);
        for (let i = 0; i < spec.per; i++) {
          const [lx, ly, ld, rot] = goodsLayout(trade, s.id, i), p = new THREE.Vector3(fx + s.along[0] * lx + s.normal[0] * ld, ly, fz + s.along[1] * lx + s.normal[1] * ld);
          q.setFromAxisAngle(Y, yaw + rot); const m = M4.compose(p, q, new THREE.Vector3(1, 1, 1)).clone(); mats.push(m); owners.push(s.id); mesh.setMatrixAt(k, m);
          mesh.setColorAt(k, c.set(spec.colors[(s.id * 7 + i * 3) % spec.colors.length])); k++;
        }
      }
      mesh.count = k; out.push({ trade, mesh, owners, mats });
    }
    return out;
  }, [L]);
  const { camera } = useThree(), last = useRef(-1), zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), []);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - last.current < 0.4) return; last.current = clock.elapsedTime;   // LOD 2,5 Hz yeter
    const cx = camera.position.x, cz = camera.position.z;
    for (const g of goods) { for (let k = 0; k < g.owners.length; k++) { const s = L.shops[g.owners[k]]; g.mesh.setMatrixAt(k, Math.hypot(s.center[0] - cx, s.center[1] - cz) < lodRadius ? g.mats[k] : zero); } g.mesh.instanceMatrix.needsUpdate = true; }
  });
  const W = L.bounds.x1 - L.bounds.x0, D = L.bounds.z1 - L.bounds.z0;
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[(L.bounds.x0 + L.bounds.x1) / 2, 0, (L.bounds.z0 + L.bounds.z1) / 2]} material={G.floorM} receiveShadow><planeGeometry args={[W, D]} /></mesh>
      <mesh geometry={G.walls} material={G.wallM} />
      <mesh geometry={G.vault} material={vm} />
      <primitive object={M.inner} /><primitive object={M.pil} /><primitive object={M.arch} /><primitive object={M.sign} />
      {!night && <primitive object={M.bulbs} />}
      {night && <primitive object={M.shut} />}
      {goods.map((g) => <primitive key={g.trade} object={g.mesh} visible={!night || g.trade === 'lambaci'} />)}
      <Gates L={L} night={night} />
      <Bedesten L={L} />
      {hi && <Shafts L={L} night={night} />}
      {night && <NightLamps L={L} />}
    </group>
  );
}

/** Kapılar: dışarıya açılan taş portal + parlak dış ışık + kapı adı */
/** Kapının dışı: boş beyaz yerine gün ışığında (ya da gece) bir dış sokak görüntüsü — gökyüzü, kubbe/minare siluetleri, kaldırım */
function outsideTex(night: boolean) {
  return canvasTex(512, 512, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 300); sky.addColorStop(0, night ? '#0b1430' : '#9cc7e6'); sky.addColorStop(1, night ? '#1e2b4e' : '#f4e6c8'); c.fillStyle = sky; c.fillRect(0, 0, 512, 512);
    c.fillStyle = night ? '#141a2a' : '#c9b48e';   // karşıdaki han ve dükkânlar
    for (let x = 0, i = 0; x < 512; i++) { const w = 60 + ((i * 53) % 70), h = 120 + ((i * 37) % 90); c.fillRect(x, 300 - h, w - 4, h); x += w; }
    c.fillStyle = night ? '#0e1322' : '#b29c76'; c.beginPath(); c.arc(330, 190, 46, Math.PI, 0); c.fill(); c.fillRect(284, 190, 92, 40); c.fillRect(396, 90, 10, 140); c.beginPath(); c.moveTo(392, 90); c.lineTo(401, 52); c.lineTo(410, 90); c.fill();   // cami kubbesi + minare
    if (night) { c.fillStyle = '#ffd98a'; for (let i = 0; i < 26; i++) c.fillRect((i * 97) % 500, 200 + ((i * 41) % 80), 6, 9); }   // yanan pencereler
    const g = c.createLinearGradient(0, 300, 0, 512); g.addColorStop(0, night ? '#2a2a30' : '#a89b88'); g.addColorStop(1, night ? '#1a1a1e' : '#7c705f'); c.fillStyle = g; c.fillRect(0, 300, 512, 212);
    c.strokeStyle = night ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; for (let y = 312; y < 512; y += 18) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  });
}
function Gates({ L, night }: { L: Layout; night: boolean }) {
  const mats = useMemo(() => ({ stone: new THREE.MeshStandardMaterial({ color: '#cbb994', roughness: 0.85 }), out: new THREE.MeshBasicMaterial({ map: outsideTex(night), color: new THREE.Color(night ? '#ffffff' : '#fff8ec').multiplyScalar(night ? 0.9 : 1.15), toneMapped: false, fog: false }) }), [night]);
  const labels = useMemo(() => L.gates.map((g) => canvasTex(512, 96, (c) => { c.fillStyle = '#1c2a3a'; c.fillRect(0, 0, 512, 96); c.strokeStyle = '#d9b456'; c.lineWidth = 5; c.strokeRect(6, 6, 500, 84); c.fillStyle = '#f2d27a'; c.font = 'bold 40px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(g.name.toLocaleUpperCase('tr'), 256, 50); })), [L]);
  return (
    <>
      {L.gates.map((g, i) => {
        const e = L.edges.find((x) => x.gate === g.name)!, w = e.w, yaw = Math.atan2(g.out[0], g.out[1]), px = g.at[0] + g.out[0] * 1.2, pz = g.at[1] + g.out[1] * 1.2;
        return (
          <group key={g.name} position={[px, 0, pz]} rotation-y={yaw}>
            <mesh material={mats.out} position={[0, (FACADE_H + 0.6) / 2, 1.6]} rotation-y={Math.PI}><planeGeometry args={[w + 1.6, FACADE_H + 0.6]} /></mesh>
            {[-1, 1].map((s) => <mesh key={s} material={mats.stone} position={[s * (w / 2 + 0.6), FACADE_H / 2 + 0.6, 0]}><boxGeometry args={[1.2, FACADE_H + 1.2, 1.4]} /></mesh>)}
            <mesh material={mats.stone} position={[0, FACADE_H + 0.35, 0]}><boxGeometry args={[w + 2.4, 1.3, 1.4]} /></mesh>
            <mesh position={[0, FACADE_H - 0.3, -0.72]} rotation-y={Math.PI}><planeGeometry args={[Math.min(w + 1.2, 4.8), 0.85]} /><meshBasicMaterial map={labels[i]} /></mesh>
          </group>
        );
      })}
    </>
  );
}
/** Cevahir Bedesteni: ana caddeye bakan taş portal (kapalı demir kapı) + yazı */
function Bedesten({ L }: { L: Layout }) {
  const label = useMemo(() => canvasTex(512, 96, (c) => { c.fillStyle = '#2a1d14'; c.fillRect(0, 0, 512, 96); c.strokeStyle = '#d9b456'; c.lineWidth = 5; c.strokeRect(6, 6, 500, 84); c.fillStyle = '#f2d27a'; c.font = 'bold 38px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CEVAHİR BEDESTENİ', 256, 50); }), []);
  // bedesten bloğunun ana caddeye bakan yüzü (blok, ana caddenin hemen kuzeyinde)
  const ox = -((GRID.cols - 1) * GRID.cell) / 2, oz = -((GRID.rows - 1) * GRID.cell) / 2, x = ox + ((BEDESTEN.i0 + BEDESTEN.i1) / 2) * GRID.cell, z = oz + GRID.main * GRID.cell - WIDTH.main / 2 - 0.62;
  void L;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2.4, 0]}><boxGeometry args={[4.2, 4.8, 0.6]} /><meshStandardMaterial color="#b9a882" roughness={0.85} /></mesh>
      <mesh position={[0, 1.6, 0.31]}><planeGeometry args={[2.4, 3.2]} /><meshStandardMaterial color="#2a2622" roughness={0.5} metalness={0.7} /></mesh>
      <mesh position={[0, 3.75, 0.32]}><planeGeometry args={[3.6, 0.65]} /><meshBasicMaterial map={label} /></mesh>
    </group>
  );
}
/** Tavan gözlerinden süzülen ışık huzmeleri: eklemeli (additive), alttan yukarı solan konik sütunlar; gece soluk mavi ay ışığı */
function Shafts({ L, night }: { L: Layout; night: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uCol: { value: new THREE.Color(night ? '#5a78b8' : '#ffe2a8') }, uK: { value: night ? 0.18 : 0.42 } },
    vertexShader: 'varying vec2 vUv; varying float vSeed; void main(){ vUv = uv; vec4 p = vec4(position,1.0);\n#ifdef USE_INSTANCING\n p = instanceMatrix * p; vSeed = instanceMatrix[3][0] * 0.13 + instanceMatrix[3][2] * 0.07;\n#endif\n gl_Position = projectionMatrix * viewMatrix * modelMatrix * p; }',
    fragmentShader: 'uniform float uTime; uniform vec3 uCol; uniform float uK; varying vec2 vUv; varying float vSeed; void main(){ float edge = sin(vUv.x * 3.14159); float fade = smoothstep(0.0, 0.9, vUv.y); float dust = 0.75 + 0.25 * sin(vUv.y * 22.0 + uTime * 0.7 + vSeed * 9.0) * sin(vUv.x * 17.0 - uTime * 0.4); gl_FragColor = vec4(uCol * edge * fade * dust * uK, 1.0); }',
  }), [night]);
  const mesh = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.45, 1.05, 1, 16, 1, true).translate(0, 0.5, 0), im = new THREE.InstancedMesh(g, mat, L.skylights.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16, 0, -0.1));
    L.skylights.forEach((p, i) => im.setMatrixAt(i, M4.compose(new THREE.Vector3(p[0], 0, p[1]), q, new THREE.Vector3(1, FACADE_H + 2.2, 1)))); return im;
  }, [L, mat]);
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; });
  return <primitive ref={ref} object={mesh} />;
}
/** Gece: kavşaklarda güvenlik lambaları (ışıyan küre + yakındakilere gerçek ışık BazaarGame'de atanır) */
function NightLamps({ L }: { L: Layout }) {
  const mesh = useMemo(() => { const sq = nodeSquares(L), im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#cfe6ff').multiplyScalar(2.6), toneMapped: false }), sq.length), M4 = new THREE.Matrix4(); sq.forEach((q, i) => im.setMatrixAt(i, M4.makeTranslation(q.c[0], FACADE_H - 0.3, q.c[1]))); return im; }, [L]);
  return <primitive object={mesh} />;
}
