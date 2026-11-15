/**
 * Ayasofya — PBR malzemeler (hepsi prosedürel; doku dosyası indirilmez).
 *
 * ALTIN MOZAİK: düz sarı değil. Gerçek mozaikte her tessera (altın varaklı cam küp) duvara hafif farklı açıyla gömülür;
 * ışık kaynağı ya da bakış açısı değişince farklı taşlar parlar. Shader bunu şöyle taklit eder:
 *   1) UV, tessera ızgarasına bölünür (uTess taş / UV birimi). Hücre kimliğinden iki rastgele sayı üretilir (hash).
 *   2) Normal, hücreye özgü küçük bir eğimle bozulur: n' = normalize(n + (h − 0,5)·uTilt). Her taş ayrı bir ayna gibi davranır.
 *   3) Pürüzlülük hücreye göre 0,18–0,5 arasında değişir (bazı taşlar mat, bazıları parlak); derz çizgilerinde metalik = 0, koyu harç.
 *   4) LOD: kameradan uzaklaştıkça (uLod0 → uLod1 m) taş ayrıntısı düz altına karışır: uzaktan kırpışma/aliasing olmaz,
 *      yakından taşlar tek tek seçilir. Kademe düşükse ayrıntı tamamen kapatılır.
 * Figürlü panolarda harita (map) rengi verir; metalnessMap altın zemini figürden ayırır (figür: boyalı cam, metalik değil).
 *
 * MERMER: tür başına tek 512² doku (yeşil Tesalya, mor porfir, beyaz Prokonnesos); damarlar 2π-periyodik bozulmuş sinüslerle
 * üretilir (dikişsiz tekrar). Yükseklikten normal haritası çıkarılır; cilalı yüzey için pürüzlülük düşük.
 */
import * as THREE from 'three';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const T = Math.PI * 2;

export interface GoldOpts { tess?: [number, number]; tilt?: number; lod?: [number, number]; detail?: boolean; map?: THREE.Texture | null; metalnessMap?: THREE.Texture | null; side?: THREE.Side; color?: string }
export function goldMosaic(o: GoldOpts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: o.color ?? '#d9a53a', metalness: 1, roughness: 0.32, map: o.map ?? null, metalnessMap: o.metalnessMap ?? null, emissive: '#2a1a05', emissiveIntensity: 0.6, side: o.side ?? THREE.FrontSide, envMapIntensity: 0.9 });
  const u = { uTess: { value: new THREE.Vector2(...(o.tess ?? [160, 160])) }, uTilt: { value: o.tilt ?? 0.38 }, uLod: { value: new THREE.Vector2(...(o.lod ?? [6, 30])) }, uDetail: { value: o.detail === false ? 0 : 1 } };
  m.userData.uniforms = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vTessUv;\nvarying float vCamDist;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvTessUv = uv;\nvCamDist = -mvPosition.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vTessUv; varying float vCamDist; uniform vec2 uTess; uniform float uTilt; uniform vec2 uLod; uniform float uDetail;
        vec2 tHash(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
        float gTess = 0.0; float gGrout = 0.0; vec2 gH = vec2(0.5);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        gTess = uDetail * (1.0 - smoothstep(uLod.x, uLod.y, vCamDist));
        vec2 tc = vTessUv * uTess; vec2 cell = floor(tc); vec2 f = fract(tc); gH = tHash(cell);
        float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
        gGrout = (1.0 - smoothstep(0.02, 0.08, edge)) * gTess * 0.6;
        diffuseColor.rgb *= mix(1.0, 0.82 + 0.36 * gH.x, gTess);       // taştan taşa ton farkı
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.12, 0.08), gGrout);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, mix(0.18, 0.5, gH.y), gTess); roughnessFactor = mix(roughnessFactor, 0.9, gGrout);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor *= (1.0 - gGrout);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { vec3 q0 = dFdx(vViewPosition), q1 = dFdy(vViewPosition); vec3 tx = normalize(q0 - normal * dot(q0, normal)); vec3 ty = normalize(cross(normal, tx));
          vec2 tl = (gH - 0.5) * uTilt * gTess; normal = normalize(normal + tx * tl.x + ty * tl.y); }`);
  };
  return m;
}

/* ---------- mermer ---------- */
function toNormal(h: Float32Array, n: number, k: number) {
  const out = new Uint8ClampedArray(n * n * 4), H = (x: number, y: number) => h[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    out[i] = (-dx / l * 0.5 + 0.5) * 255; out[i + 1] = (dy / l * 0.5 + 0.5) * 255; out[i + 2] = (1 / l * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}
const tex = (d: Uint8ClampedArray, n: number, srgb: boolean) => { const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.needsUpdate = true; return t; };
const PAL = {
  verd: { base: [34, 74, 58], vein: [176, 205, 186], dark: [12, 30, 24], seed: 3, f: 5 },
  porphyry: { base: [92, 34, 52], vein: [196, 160, 170], dark: [48, 14, 28], seed: 7, f: 9 },
  white: { base: [226, 222, 214], vein: [128, 134, 146], dark: [196, 192, 186], seed: 11, f: 4 },
  floor: { base: [198, 192, 180], vein: [120, 126, 140], dark: [170, 164, 152], seed: 13, f: 3 },
} as const;
const cache = new Map<string, { map: THREE.DataTexture; normal: THREE.DataTexture }>();
export function marbleTextures(kind: keyof typeof PAL, n = 512) {
  const key = `${kind}${n}`; if (cache.has(key)) return cache.get(key)!;
  const p = PAL[kind], r = rng(p.seed), col = new Uint8ClampedArray(n * n * 4), hei = new Float32Array(n * n);
  const ph = Array.from({ length: 6 }, () => r() * T);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x / n) * T, v = (y / n) * T;
    // türbülans: tam sayı frekanslı sinüslerle bozulmuş damar alanı (dikişsiz)
    const w = Math.sin(u * 2 + ph[0]) * 1.3 + Math.sin(v * 3 + ph[1]) * 1.1 + Math.sin((u + v) * 4 + ph[2]) * 0.6 + Math.sin(u * 7 - v * 5 + ph[3]) * 0.35;
    let vein = Math.abs(Math.sin(u * p.f + v * 2 + w * 1.6)); vein = Math.pow(1 - vein, kind === 'porphyry' ? 2 : 7);
    const blot = Math.sin(u * 3 + w) * Math.sin(v * 2 - w * 0.7) * 0.5 + 0.5;
    const speck = kind === 'porphyry' ? (r() < 0.06 ? 1 : 0) : 0, g = (r() - 0.5) * 10, i = (y * n + x) * 4;
    for (let c = 0; c < 3; c++) {
      let val = p.base[c] + (p.dark[c] - p.base[c]) * blot * 0.6; val += (p.vein[c] - val) * Math.min(1, vein * 0.9 + speck * 0.8); col[i + c] = val + g;
    }
    col[i + 3] = 255; hei[y * n + x] = vein * 0.35 + blot * 0.1;
  }
  const out = { map: tex(col, n, true), normal: tex(toNormal(hei, n, 1.2), n, false) }; cache.set(key, out); return out;
}
export function marble(kind: keyof typeof PAL, repeat: [number, number] = [1, 1], rough = 0.22) {
  const t = marbleTextures(kind), map = t.map.clone(), normal = t.normal.clone();
  map.repeat.set(...repeat); normal.repeat.set(...repeat); map.needsUpdate = normal.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, normalMap: normal, normalScale: new THREE.Vector2(0.35, 0.35), roughness: rough, metalness: 0, envMapIntensity: 0.9 });
}
/** Kurşun (kubbe dışı, kapak) ve ahşap */
export const lead = () => new THREE.MeshStandardMaterial({ color: '#7b868c', roughness: 0.55, metalness: 0.55 });
export const wood = () => new THREE.MeshStandardMaterial({ color: '#4a2f1c', roughness: 0.7, metalness: 0 });
export const plaster = (c = '#c9ab7c') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0 });

/* ---------- mozaik panoları: stilize figürler ----------
 * Panolar özgün mozaiklerin kopyası DEĞİLDİR: kompozisyonu (kaç figür, nerede durdukları, hâle, giysi rengi) anımsatan
 * stilize çizimlerdir. "Doku akışı": pano önce 256 px üretilir; kamera yaklaşınca 1024 px sürümü üretilip değiştirilir. */
export interface Figure { x: number; robe: string; cloak?: string; halo?: boolean; cross?: boolean; crown?: boolean; small?: boolean; seated?: boolean }
export const PANELS: Record<string, { w: number; h: number; figures: Figure[]; lossBelow?: number }> = {
  deisis: { w: 6, h: 4.1, lossBelow: 0.52, figures: [{ x: 0.2, robe: '#3b4f8f', cloak: '#6b2f4f', halo: true }, { x: 0.5, robe: '#34406e', cloak: '#1f2c58', halo: true, cross: true }, { x: 0.8, robe: '#6b5a3a', cloak: '#4a5a2f', halo: true }] },
  zoe: { w: 2.9, h: 2.5, figures: [{ x: 0.17, robe: '#7a2d3e', cloak: '#c9a13a', crown: true, halo: true }, { x: 0.5, robe: '#27356e', halo: true, cross: true, seated: true }, { x: 0.83, robe: '#7a2d3e', cloak: '#c9a13a', crown: true, halo: true }] },
  komnenos: { w: 2.9, h: 2.5, figures: [{ x: 0.17, robe: '#6e2a3a', cloak: '#c9a13a', crown: true, halo: true }, { x: 0.5, robe: '#27356e', cloak: '#1b2757', halo: true }, { x: 0.83, robe: '#7d3140', cloak: '#c9a13a', crown: true, halo: true }] },
  apsis: { w: 5, h: 5.2, figures: [{ x: 0.5, robe: '#1f2c5e', cloak: '#18234d', halo: true, seated: true }] },
  kapi: { w: 4.4, h: 2.3, figures: [{ x: 0.5, robe: '#e9e2d0', cloak: '#c9b78f', halo: true, cross: true, seated: true }] },
};
export function panelTextures(id: string, res: number) {
  const p = PANELS[id], W = res, Hh = Math.round((res * p.h) / p.w);
  const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d')!;
  const mt = document.createElement('canvas'); mt.width = W; mt.height = Hh; const m = mt.getContext('2d')!;
  g.fillStyle = '#d9a53a'; g.fillRect(0, 0, W, Hh); m.fillStyle = '#fff'; m.fillRect(0, 0, W, Hh);   // altın zemin: metalik
  const both = (fn: (ctx: CanvasRenderingContext2D, paint: boolean) => void) => { fn(g, true); fn(m, false); };
  for (const f of p.figures) {
    const cx = f.x * W, s = Hh * (f.small ? 0.5 : 1), top = Hh * (f.seated ? 0.2 : 0.1), headR = s * 0.075, hy = top + headR * 1.5;
    if (f.halo) { g.strokeStyle = '#8a2a2a'; g.lineWidth = Math.max(1, W / 256); g.beginPath(); g.arc(cx, hy, headR * 1.85, 0, T); g.stroke(); g.fillStyle = '#e7bd55'; g.fill(); }
    if (f.cross) { g.fillStyle = '#f3ead0'; g.fillRect(cx - headR * 1.8, hy - headR * 0.22, headR * 3.6, headR * 0.44); g.fillRect(cx - headR * 0.22, hy - headR * 1.8, headR * 0.44, headR * 3.6); }
    both((ctx, paint) => {   // gövde: metalik değil (metalness haritasında siyah)
      ctx.fillStyle = paint ? f.robe : '#000'; ctx.beginPath(); ctx.moveTo(cx - headR * 1.7, hy + headR * 1.2);
      ctx.quadraticCurveTo(cx - headR * (f.seated ? 4.2 : 2.6), Hh * 0.7, cx - headR * (f.seated ? 3.6 : 2.3), Hh * 0.98); ctx.lineTo(cx + headR * (f.seated ? 3.6 : 2.3), Hh * 0.98);
      ctx.quadraticCurveTo(cx + headR * (f.seated ? 4.2 : 2.6), Hh * 0.7, cx + headR * 1.7, hy + headR * 1.2); ctx.closePath(); ctx.fill();
      if (f.cloak) { ctx.fillStyle = paint ? f.cloak : (f.cloak === '#c9a13a' ? '#fff' : '#000'); ctx.beginPath(); ctx.moveTo(cx - headR * 1.7, hy + headR * 1.2); ctx.quadraticCurveTo(cx - headR * 0.2, Hh * 0.6, cx - headR * 2.2, Hh * 0.98); ctx.lineTo(cx - headR * 0.3, Hh * 0.98); ctx.quadraticCurveTo(cx + headR * 1.2, Hh * 0.55, cx + headR * 0.3, hy + headR * 1.3); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = paint ? '#e3c3a2' : '#000'; ctx.beginPath(); ctx.ellipse(cx, hy, headR * 0.9, headR * 1.12, 0, 0, T); ctx.fill();
    });
    g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(cx, hy - headR * 0.55, headR * 0.98, headR * 0.75, 0, Math.PI, T); g.fill();   // saç
    if (res >= 512) { g.fillStyle = '#2a1c18'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * headR * 0.36, hy - headR * 0.05, headR * 0.13, headR * 0.08, 0, 0, T); g.fill(); } g.fillRect(cx - headR * 0.05, hy, headR * 0.1, headR * 0.4); g.fillRect(cx - headR * 0.22, hy + headR * 0.6, headR * 0.44, headR * 0.07); }
    if (f.crown) { g.fillStyle = '#e9c85a'; g.fillRect(cx - headR * 1.05, hy - headR * 1.35, headR * 2.1, headR * 0.55); m.fillStyle = '#fff'; m.fillRect(cx - headR * 1.05, hy - headR * 1.35, headR * 2.1, headR * 0.55); g.fillStyle = '#9a2b3a'; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(cx + i * headR * 0.6, hy - headR * 1.08, headR * 0.12, 0, T); g.fill(); } }
  }
  if (p.lossBelow) {   // günümüze ulaşmayan bölüm: çıplak sıva
    both((ctx, paint) => { ctx.fillStyle = paint ? '#b9a686' : '#000'; ctx.beginPath(); ctx.moveTo(0, Hh * p.lossBelow!); for (let i = 0; i <= 12; i++) ctx.lineTo((i / 12) * W, Hh * (p.lossBelow! + Math.sin(i * 2.1) * 0.05 + (i % 3) * 0.02)); ctx.lineTo(W, Hh); ctx.lineTo(0, Hh); ctx.closePath(); ctx.fill(); });
  }
  g.strokeStyle = '#7a2424'; g.lineWidth = Math.max(2, W / 90); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, Hh - g.lineWidth);
  const map = new THREE.CanvasTexture(c), metal = new THREE.CanvasTexture(mt); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  return { map, metal };
}
