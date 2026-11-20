/**
 * Hattuşa — sur sistemi: aşınmış taş malzemesi, kerpiç üst duvar, parça (chunk) geometrileri, kuleler, mazgallar.
 *
 * ARKEOLOJİK GEREKÇE:
 *  - Hattuşa surları iki katmanlıdır: altta iri, çokgen (poligonal) kesilmiş taşlardan kaide; üstte kerpiç (güneşte kurutulmuş tuğla)
 *    duvar ve belirli aralıklarla dışa taşan kuleler. Bu yüzden kaide "kiklopik" çokgen taş dokusuyla, üst kısım tuğla + sıva ile çizilir.
 *  - MÖ 1300'de surlar ayaktaydı (bugünkü harabe değil). Taşların aşınması yine de gösterilir: kaide yüzyıllardır rüzgâra, yağmura ve
 *    zemindeki neme maruz kalmıştır. Mazgallar Hitit kil kap/kule modellerindeki yuvarlak tepeli biçimden esinlidir (temsilî).
 *
 * AŞINMA GÖLGELENDİRİCİSİ MATEMATİĞİ (onBeforeCompile, MeshStandardMaterial üstüne):
 *   h  = taş yükseklik haritası (0 = derz/harç, 1 = taşın tepesi)
 *   kenar aşınması  e = smoothstep(0.30, 0.55, h) · (1 − smoothstep(0.55, 0.80, h))     → taşın yuvarlanmış kenar bandı
 *   derz gölgesi    a = mix(0.55, 1.0, smoothstep(0.08, 0.40, h))                        → derzde gölge birikimi (AO)
 *   toprak/nem lekesi m = (1 − smoothstep(0, 1.6, y − y_zemin)) · (0.6 + 0.4·n(xz))     → duvar dibi koyulaşır, yeşil-kahve
 *   yağmur izleri   r = n(x·2.3, y·0.12)^3 · (1 − |N_y|)                                → dikey yüzeylerde aşağı akan koyu çizgiler
 *   rüzgâr yüzü     w = max(0, N_xz · R̂) · 0.08                                          → hâkim rüzgâra bakan yüz daha açık, daha pürüzlü
 *   renk = taban · a · (1 − 0.35m) · (1 − 0.18r) + e·0.06 + w ;  pürüz = clamp(0.82 + 0.12e + 0.06m + w, 0.8, 1.0)
 * Pil tasarrufu: gölgelendirici eki kapanır; yalnızca önceden pişmiş AO'lu statik doku kalır.
 * Şanlıurfa/öteki oyunlarla tutarlılık: dokular canvas'ta üretilir (dosya yok), normal haritası Sobel (topkapi/kit.normalFrom).
 */
import * as THREE from 'three';
import { normalFrom } from '../topkapi/kit';
import { WALL, heightAt, type V2 } from './site';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function tex(c: HTMLCanvasElement, srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }

/* ---------- dokular ---------- */
let POLY: { map: THREE.Texture; normal: THREE.Texture; height: THREE.Texture; ao: THREE.Texture } | null = null;
/** Çokgen (kiklopik) taş: Voronoi hücreleri; yükseklik = F2 − F1 (hücre kenarına uzaklık) → kubbeli taş, derin derz */
export function polygonalStone() {
  if (POLY) return POLY;
  const n = 256, r = rng(7), pts = Array.from({ length: 34 }, () => [r() * n, r() * n, r()] as const);
  const [c, h, a] = [0, 1, 2].map(() => { const k = document.createElement('canvas'); k.width = k.height = n; return k; }), g = c.getContext('2d')!, hg = h.getContext('2d')!, ag = a.getContext('2d')!;
  const im = g.createImageData(n, n), hm = hg.createImageData(n, n), am = ag.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let f1 = 1e9, f2 = 1e9, id = 0;
    for (let i = 0; i < pts.length; i++) for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { const d = Math.hypot(x - pts[i][0] - ox, y - pts[i][1] - oy); if (d < f1) { f2 = f1; f1 = d; id = i; } else if (d < f2) f2 = d; }
    const edge = Math.min(1, (f2 - f1) / 10), hh = Math.pow(edge, 0.6) * (0.85 + 0.15 * Math.sin(x * 0.3 + y * 0.2) * 0.5), tone = pts[id][2], j = (y * n + x) * 4, grain = (Math.random() - 0.5) * 18;
    const base = tone < 0.5 ? [176, 164, 140] : tone < 0.8 ? [158, 150, 134] : [186, 170, 138], k = edge < 0.12 ? 0.55 : 1;
    im.data.set([base[0] * k + grain, base[1] * k + grain, base[2] * k + grain, 255], j);
    const hv = hh * 255; hm.data.set([hv, hv, hv, 255], j);
    const ao = (0.55 + 0.45 * Math.min(1, edge * 2.5)) * 255; am.data.set([ao, ao, ao, 255], j);
  }
  g.putImageData(im, 0, 0); hg.putImageData(hm, 0, 0); ag.putImageData(am, 0, 0);
  POLY = { map: tex(c), normal: normalFrom(h, 4), height: tex(h, false), ao: tex(a, false) }; return POLY;
}
let MUD: { map: THREE.Texture; normal: THREE.Texture } | null = null;
/** Kerpiç: sıra sıra güneşte kurutulmuş tuğla + ince çamur sıva, yer yer dökülmüş */
export function mudbrick() {
  if (MUD) return MUD;
  const n = 256, r = rng(13), c = document.createElement('canvas'), h = document.createElement('canvas'); c.width = c.height = h.width = h.height = n; const g = c.getContext('2d')!, hg = h.getContext('2d')!;
  g.fillStyle = '#b39470'; g.fillRect(0, 0, n, n); hg.fillStyle = '#909090'; hg.fillRect(0, 0, n, n);
  for (let y = 0, row = 0; y < n; y += 22, row++) for (let x = -(row % 2) * 24; x < n; x += 48) { const v = 165 + r() * 30 | 0; g.fillStyle = `rgb(${v},${v * 0.8 | 0},${v * 0.6 | 0})`; g.fillRect(x + 2, y + 2, 44, 18); hg.fillStyle = '#b8b8b8'; hg.fillRect(x + 2, y + 2, 44, 18); }
  for (let i = 0; i < 30; i++) { const x = r() * n, y = r() * n, w = 30 + r() * 80, hh = 20 + r() * 60; g.fillStyle = `rgba(200,178,145,${0.5 + r() * 0.4})`; g.fillRect(x, y, w, hh); hg.fillStyle = 'rgba(200,200,200,.6)'; hg.fillRect(x, y, w, hh); }   // sıva lekeleri
  MUD = { map: tex(c), normal: normalFrom(h, 2) }; return MUD;
}

/* ---------- aşınma malzemesi ---------- */
export const WIND_DIR = new THREE.Vector2(-0.7, -0.7).normalize();   // kuzeybatıdan esen kuru rüzgâr (temsilî)
export function erodedStone(saver: boolean, repeat = 1): THREE.MeshStandardMaterial {
  const t = polygonalStone(), map = t.map.clone(), nm = t.normal.clone(), ao = t.ao.clone(), hm = t.height.clone();
  for (const x of [map, nm, ao, hm]) { x.repeat.set(repeat, repeat); x.needsUpdate = true; }
  const m = new THREE.MeshStandardMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(1.6, 1.6), aoMap: ao, aoMapIntensity: 1, roughness: 0.9, metalness: 0 });
  if (saver) return m;   // pil tasarrufu: statik doku (AO pişmiş), gölgelendirici eki yok
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uHeight = { value: hm }; sh.uniforms.uWind = { value: WIND_DIR };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGround; varying float vGround; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vGround = aGround; vec4 wp4 = vec4(transformed, 1.0);\n #ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n #endif\n vWP = (modelMatrix * wp4).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform sampler2D uHeight; uniform vec2 uWind; varying float vGround; varying vec3 vWP; varying vec3 vWN;
      float eh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float en(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(eh(i), eh(i+vec2(1,0)), f.x), mix(eh(i+vec2(0,1)), eh(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      float hh = texture2D(uHeight, vMapUv).r;
      float e = smoothstep(0.30, 0.55, hh) * (1.0 - smoothstep(0.55, 0.80, hh));
      float a = mix(0.55, 1.0, smoothstep(0.08, 0.40, hh));
      float m = (1.0 - smoothstep(0.0, 1.6, vWP.y - vGround)) * (0.6 + 0.4 * en(vWP.xz * 0.7));
      float r = pow(en(vec2(vWP.x * 2.3 + vWP.z * 2.3, vWP.y * 0.12)), 3.0) * (1.0 - abs(vWN.y));
      float w = max(0.0, dot(normalize(vWN.xz + 1e-4), uWind)) * 0.08;
      diffuseColor.rgb = diffuseColor.rgb * a * (1.0 - 0.35 * m) * (1.0 - 0.18 * r) + vec3(e * 0.06 + w);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.30, 0.22), m * 0.25);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(0.82 + 0.12 * e + 0.06 * m + w, 0.8, 1.0);');
  };
  m.customProgramCacheKey = () => 'hat-erosion';
  return m;
}
export function mudMaterial(): THREE.MeshStandardMaterial { const t = mudbrick(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughness: 0.95 }); }

/* ---------- geometri ---------- */
export const WALL_DIM = { socle: 4.6, brick: 5.2, thick: 5.2, sink: 1.2 } as const;
export const TOWER_EVERY = 8;   // örnek (≈ 32 m)
/** Bir dizi sur örneğinden (i0..i1) duvar şeridi: dış yüz, iç yüz, üst; dünya ölçekli UV (3 m), aGround özniteliği */
export function wallStrip(i0: number, i1: number, y0: number, y1: number, thick: number, batter = 0, skip?: (i: number) => boolean): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], gr: number[] = [], idx: number[] = [], N = WALL.length;
  const at = (i: number) => WALL[((i % N) + N) % N];
  const nrm = (i: number): V2 => { const a = at(i - 1), b = at(i + 1), dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };   // dışa bakan normal (halka saat yönünün tersine)
  let arc = 0, prev: number | null = null;
  for (let i = i0; i < i1; i++) {
    if (skip?.(i)) { prev = null; continue; }
    const p = at(i), n = nrm(i), g = heightAt(p[0], p[1]), half = thick / 2, k = pos.length / 3;
    if (prev !== null) arc += Math.hypot(p[0] - at(prev)[0], p[1] - at(prev)[1]);
    const lo = g + y0, hi = g + y1;
    // 4 köşe: dış-alt, dış-üst, iç-üst, iç-alt (batter: üstte içe çekilme)
    const v = [[p[0] + n[0] * half, lo, p[1] + n[1] * half], [p[0] + n[0] * (half - batter), hi, p[1] + n[1] * (half - batter)], [p[0] - n[0] * (half - batter), hi, p[1] - n[1] * (half - batter)], [p[0] - n[0] * half, lo, p[1] - n[1] * half]];
    v.forEach((q, j) => { pos.push(q[0], q[1], q[2]); uv.push(arc / 3, (j === 1 || j === 2 ? y1 : y0) / 3 + (j === 2 ? thick / 3 : 0)); gr.push(g); });
    if (prev !== null) { const o = k - 4; idx.push(o, k, o + 1, o + 1, k, k + 1, o + 1, k + 1, o + 2, o + 2, k + 1, k + 2, o + 2, k + 2, o + 3, o + 3, k + 2, k + 3); }
    prev = i;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('aGround', new THREE.Float32BufferAttribute(gr, 1)); geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
/** Kule ve mazgal yerleşimi (dünya matrisleri): kuleler dışa taşar */
export function towerMatrices(i0: number, i1: number, skip?: (i: number) => boolean): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [], o = new THREE.Object3D(), N = WALL.length;
  for (let i = Math.ceil(i0 / TOWER_EVERY) * TOWER_EVERY; i < i1; i += TOWER_EVERY) { if (skip?.(i)) continue; const p = WALL[i % N], a = WALL[(i + N - 1) % N], b = WALL[(i + 1) % N];
    const yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]), dz = b[1] - a[1], dx = b[0] - a[0], l = Math.hypot(dx, dz) || 1, g = heightAt(p[0], p[1]);
    o.position.set(p[0] + (dz / l) * 2.6, g, p[1] - (dx / l) * 2.6); o.rotation.set(0, yaw, 0); o.updateMatrix(); out.push(o.matrix.clone()); }
  return out;
}
export function merlonMatrices(i0: number, i1: number, skip?: (i: number) => boolean): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [], o = new THREE.Object3D(), N = WALL.length, top = WALL_DIM.socle + WALL_DIM.brick;
  for (let i = i0; i < i1; i++) { if (skip?.(i)) continue; const p = WALL[i % N], b = WALL[(i + 1) % N], dx = b[0] - p[0], dz = b[1] - p[1], l = Math.hypot(dx, dz) || 1, g = heightAt(p[0], p[1]);
    for (const sd of [1, -1]) { o.position.set(p[0] + (dz / l) * sd * 2.2, g + top, p[1] - (dx / l) * sd * 2.2); o.rotation.set(0, Math.atan2(-dz, dx), 0); o.updateMatrix(); out.push(o.matrix.clone()); } }
  return out;
}
/** Yuvarlak tepeli mazgal (Hitit kule modellerinden esinli): kutu + yarım silindir */
export function merlonGeometry(): THREE.BufferGeometry {
  const a = new THREE.BoxGeometry(1.4, 0.9, 0.6); a.translate(0, 0.45, 0); const b = new THREE.CylinderGeometry(0.7, 0.7, 0.6, 10, 1, false, 0, Math.PI); b.rotateZ(Math.PI / 2); b.rotateY(Math.PI / 2); b.translate(0, 0.9, 0);
  const g = mergeSimple([a, b]); return g;
}
export function mergeSimple(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); } }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return m;
}
