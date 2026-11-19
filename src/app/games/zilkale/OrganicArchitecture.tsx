/**
 * Zil Kale & Çamlıhemşin — organik mimari: moloz taş kale, tek kemerli taş köprü, Hemşin ahşap evi, serender, arazi, Fırtına Deresi
 * ve şelale. Dokular canvas'ta üretilir (dosya yok); normal haritası yükseklikten Sobel ile çıkarılır (topkapi/kit normalFrom).
 *
 * TAŞ: Zil Kale düzgün kesme taş değil, farklı boy ve renkte moloz taştan örülüdür. Doku satır yüksekliği değişen, kenarları kırık
 *   taşlardan oluşur; roughness 0,9 (mat, ıslak değil) + normal haritası. Yosun/liken: gölgelendiricide dünya normali yukarı bakan
 *   yüzeylerde ve duvar dibinde yeşil yosun, gürültü lekelerinde soluk sarı-yeşil liken. Yağmurlu ve sisli iklimde kuzey yüzü daha
 *   yosunludur; bu yüzden yosun ağırlığına dünya normalinin +z (kuzeye, vadiye bakan) bileşeni de eklenir.
 * AHŞAP: tahta dokusu (damar + budak + çatlak) yükseklik haritası hem normalMap hem displacementMap olur (yüzey bölümlenmiş kutular),
 *   böylece tahta aralıkları ve çatlaklar kenardan bakınca da girintili görünür. Çürük/taze hâl Tarih Katmanı ile karışır.
 * SU: Fırtına Deresi kendi gölgelendiricisiyle: akış yönünde kayan iki oktav gürültüden normal, Fresnel (Schlick, F0 = 0,02) ile
 *   gökyüzü/sis yansıması, kıyıda ve taşlarda köpük, şelale dibinde halka dalgalı "sıçrama normal haritası" + köpük. Sis three'nin
 *   fog parçalarıyla eklenir (suyun uzak kısmı sisle aynı hızda kaybolur).
 * LOD: kale yakında tam (mazgallar, taş halka, moloz), uzakta tek renk silüet; evler uzakta tek blok (drei Detailed = THREE.LOD).
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Detailed } from '@react-three/drei';
import { normalFrom } from '../topkapi/kit';
import { BRIDGE, CASTLE, FALLS, ROUTE_LEN, bridgeDeck, castleBase, fallsFoot, fallsTop, heightAt, riverX, routeAt, waterY, type V3 } from './valley';
import { agedWood, morphMaterial, type MorphUniforms, type Patch } from './HistoryLayerMorphing';
import type { Tier } from './ProceduralVegetation';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function cv(n: number, m = n) { const c = document.createElement('canvas'); c.width = n; c.height = m; return [c, c.getContext('2d')!] as const; }
function tex(c: HTMLCanvasElement, srgb = true, rx = 1, ry = 1) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(rx, ry); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; }

/* ---------- dokular ---------- */
let STONE: { map: THREE.Texture; normal: THREE.Texture } | null = null;
/** Moloz taş: değişken satır yüksekliği, farklı boyutta düzensiz taşlar, gri-kahve-yeşilimsi tonlar, koyu harç */
export function rubbleStone() {
  if (STONE) return STONE; const n = 512, [c, g] = cv(n), [h, hg] = cv(n), r = rng(7);
  g.fillStyle = '#3d3a33'; g.fillRect(0, 0, n, n); hg.fillStyle = '#1a1a1a'; hg.fillRect(0, 0, n, n);
  let y = 0; while (y < n) { const rh = 26 + r() * 46; let x = -r() * 40; while (x < n) { const w = rh * (0.9 + r() * 1.6), j = () => (r() - 0.5) * rh * 0.22;
    const tone = r(), base = tone < 0.5 ? [118, 112, 100] : tone < 0.8 ? [96, 92, 86] : [128, 116, 92], k = 0.75 + r() * 0.45, col = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
    const pts: [number, number][] = [[x + 3 + j(), y + 3 + j() * 0.5], [x + w * 0.5, y + 2 + j() * 0.4], [x + w - 3 + j(), y + 3 + j() * 0.5], [x + w - 2 + j() * 0.5, y + rh * 0.5], [x + w - 3 + j(), y + rh - 3], [x + w * 0.5 + j(), y + rh - 2], [x + 3 + j(), y + rh - 3], [x + 2 + j() * 0.5, y + rh * 0.5]];
    for (const ox of [0, -n, n]) { g.fillStyle = col; g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px + ox, py) : g.moveTo(px + ox, py))); g.closePath(); g.fill();
      const gr = hg.createRadialGradient(x + w / 2 + ox, y + rh / 2, 2, x + w / 2 + ox, y + rh / 2, Math.max(w, rh) * 0.6); gr.addColorStop(0, '#e0e0e0'); gr.addColorStop(1, '#808080'); hg.fillStyle = gr; hg.beginPath(); pts.forEach(([px, py], i) => (i ? hg.lineTo(px + ox, py) : hg.moveTo(px + ox, py))); hg.closePath(); hg.fill(); }
    x += w; } y += rh; }
  for (let i = 0; i < 9000; i++) { const x = r() * n, yy = r() * n, a = r() * 0.16; g.fillStyle = r() < 0.5 ? `rgba(30,28,22,${a})` : `rgba(220,215,200,${a})`; g.fillRect(x, yy, 1 + r() * 2, 1 + r() * 2); hg.fillStyle = `rgba(0,0,0,${a})`; hg.fillRect(x, yy, 2, 2); }
  STONE = { map: tex(c), normal: normalFrom(h, 3.2) }; return STONE;
}
let WOOD: { map: THREE.Texture; normal: THREE.Texture; disp: THREE.Texture } | null = null;
/** Tahta: dikey tahtalar, damar çizgileri, budaklar, çatlaklar; yükseklik = displacement + normal */
export function planks() {
  if (WOOD) return WOOD; const n = 512, [c, g] = cv(n), [h, hg] = cv(n), r = rng(17), cols = 7, pw = n / cols;
  hg.fillStyle = '#000'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < cols; i++) { const x0 = i * pw, hue = 24 + r() * 8, l = 30 + r() * 10; g.fillStyle = `hsl(${hue},38%,${l}%)`; g.fillRect(x0 + 2, 0, pw - 4, n); hg.fillStyle = '#b4b4b4'; hg.fillRect(x0 + 2, 0, pw - 4, n);
    for (let k = 0; k < 26; k++) { const xx = x0 + 4 + r() * (pw - 8), a = 0.08 + r() * 0.15; g.strokeStyle = `rgba(35,20,10,${a})`; g.lineWidth = 1 + r(); g.beginPath(); for (let yy = 0; yy <= n; yy += 16) g.lineTo(xx + Math.sin(yy * 0.02 + k) * 3, yy); g.stroke(); }
    for (let k = 0; k < 2; k++) { const kx = x0 + pw * (0.3 + r() * 0.4), ky = r() * n; g.fillStyle = 'rgba(40,22,12,.75)'; g.beginPath(); g.ellipse(kx, ky, 4 + r() * 3, 7 + r() * 4, 0, 0, 6.3); g.fill(); hg.fillStyle = '#8a8a8a'; hg.beginPath(); hg.ellipse(kx, ky, 5, 8, 0, 0, 6.3); hg.fill(); }
    for (let k = 0; k < 3; k++) { const cx = x0 + pw * (0.2 + r() * 0.6), cy = r() * n, len = 30 + r() * 90; g.strokeStyle = 'rgba(15,8,4,.8)'; hg.strokeStyle = '#303030'; g.lineWidth = hg.lineWidth = 1.5;
      for (const ctx of [g, hg]) { ctx.beginPath(); ctx.moveTo(cx, cy); for (let s = 0; s < len; s += 8) ctx.lineTo(cx + Math.sin(s * 0.3) * 2, cy + s); ctx.stroke(); } } }
  WOOD = { map: tex(c), normal: normalFrom(h, 2.5), disp: tex(h, false) }; return WOOD;
}
let GROUND: THREE.Texture | null = null;
/** Zemin ayrıntı dokusu (köşe renkleriyle çarpılır): yosunlu toprak + yaprak kırıntısı */
function groundDetail() {
  if (GROUND) return GROUND; const n = 256, [c, g] = cv(n), r = rng(29); g.fillStyle = '#f0f0f0'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 5000; i++) { const v = 185 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v},.6)`; g.fillRect(r() * n, r() * n, 1 + r() * 3, 1 + r() * 3); }
  GROUND = tex(c, false, 1, 1); return GROUND;   // doğrusal (sRGB değil): köşe rengini yalnızca ±%25 oynatır, karartmaz
}
let PATHT: THREE.Texture | null = null;
function pathTex() {
  if (PATHT) return PATHT; const n = 256, [c, g] = cv(n), r = rng(31); g.fillStyle = '#6a5a45'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 260; i++) { const v = 90 + r() * 70 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 14})`; g.beginPath(); g.ellipse(r() * n, r() * n, 2 + r() * 7, 2 + r() * 5, r() * 3, 0, 6.3); g.fill(); }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(30,24,16,${r() * 0.3})`; g.fillRect(r() * n, r() * n, 2, 2); }
  PATHT = tex(c); return PATHT;
}

/* ---------- yosun/liken gölgelendiricisi ---------- */
/** uBase: yapının zemin yüksekliği (duvar dibi daha yosunlu) */
export function mossPatch(base: number, amount = 1): Patch {
  return (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vZW; varying vec3 vZN;').replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      { vec4 zp = vec4(transformed, 1.0); vec3 zn = objectNormal;
        #ifdef USE_INSTANCING
          zp = instanceMatrix * zp; zn = mat3(instanceMatrix) * zn;
        #endif
        vZW = (modelMatrix * zp).xyz; vZN = normalize(mat3(modelMatrix) * zn); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vZW; varying vec3 vZN;
      float zh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float zn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(zh(i),zh(i+vec3(1,0,0)),f.x), mix(zh(i+vec3(0,1,0)),zh(i+vec3(1,1,0)),f.x), f.y), mix(mix(zh(i+vec3(0,0,1)),zh(i+vec3(1,0,1)),f.x), mix(zh(i+vec3(0,1,1)),zh(i+vec3(1,1,1)),f.x), f.y), f.z); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      { float up = smoothstep(0.25, 0.85, vZN.y) * 0.6, north = smoothstep(0.2, 1.0, vZN.z) * 0.35, foot = 1.0 - smoothstep(0.0, 2.6, vZW.y - ${base.toFixed(2)});
        float nn = zn3(vZW * 0.7) * 0.6 + zn3(vZW * 2.3) * 0.4;
        float moss = smoothstep(0.42, 0.72, nn + (up * 0.55 + north + foot * 0.4) * ${amount.toFixed(2)} - 0.35);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.25, 0.08) * (0.8 + nn * 0.5), moss * 0.85);
        float lich = smoothstep(0.8, 0.86, zn3(vZW * 4.1 + 7.0)) * (1.0 - moss) * (1.0 - up * 0.8);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.5, 0.52, 0.36), lich * 0.45); }`);
  };
}
function stoneBase(rep: number) { const t = rubbleStone(), map = t.map.clone(), nm = t.normal.clone(); map.repeat.set(rep, rep); nm.repeat.set(rep, rep); map.needsUpdate = nm.needsUpdate = true; return new THREE.MeshStandardMaterial({ map, normalMap: nm, normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.9, metalness: 0 }); }
/** Kutu: dünya ölçekli UV (taş her 3 m'de bir tekrar), isteğe bağlı bölümleme (yer değiştirme için) */
function wbox(w: number, h: number, d: number, s = 3, seg = 1) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), uv = g.attributes.uv as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), su = ax > 0.5 ? d : w, sv = ay > 0.5 ? d : h; uv.setXY(i, uv.getX(i) * su / s, uv.getY(i) * sv / s); }
  return g;
}

/* ---------- arazi + patika ---------- */
export const TERRAIN = { x0: -130, x1: 130, z0: 120, z1: -420 } as const;
export function Terrain({ tier }: { tier: Tier }) {
  const geo = useMemo(() => {
    const W = TERRAIN.x1 - TERRAIN.x0, D = TERRAIN.z0 - TERRAIN.z1, k = tier === 'high' ? 2 : tier === 'medium' ? 2.6 : 4, g = new THREE.PlaneGeometry(W, D, Math.round(W / k), Math.round(D / k));
    g.rotateX(-Math.PI / 2); g.translate((TERRAIN.x0 + TERRAIN.x1) / 2, 0, (TERRAIN.z0 + TERRAIN.z1) / 2);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), uv = g.attributes.uv as THREE.BufferAttribute, r = rng(41);
    const moss = new THREE.Color('#4d7232'), moss2 = new THREE.Color('#6b843a'), soil = new THREE.Color('#5e4c36'), rock = new THREE.Color('#7d7c75'), wet = new THREE.Color('#4a4e48'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = heightAt(x, z); p.setY(i, y); uv.setXY(i, x / 5, z / 5);
      const sl = Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2, dr = Math.abs(x - riverX(z));
      c.copy(moss).lerp(moss2, Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.5 + 0.5); if (r() < 0.18) c.lerp(soil, 0.5);
      c.lerp(rock, THREE.MathUtils.smoothstep(sl, 0.9, 1.6)); c.lerp(wet, 1 - THREE.MathUtils.smoothstep(dr, 5.5, 8.5));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, [tier]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, map: groundDetail(), roughness: 0.96 }), []);
  return <mesh geometry={geo} material={mat} />;
}
/** Patika şeridi (köprü üstü hariç); tahta kesimde döşeme tahtaları + direkler */
export function PathRibbon() {
  const { geo, boards } = useMemo(() => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [], bd: { p: V3; yaw: number }[] = []; let row = 0;
    for (let s = 0; s <= ROUTE_LEN; s += 0.8) {
      const R = routeAt(s); if (R.onBridge) { row = -1; continue; }
      if (R.surface === 'tahta' && Math.round(s / 0.8) % 1 === 0) bd.push({ p: R.p, yaw: Math.atan2(R.dir[0], R.dir[1]) });
      const w = R.surface === 'tas' ? 0.95 : 0.75, nx = -R.dir[1], nz = R.dir[0];
      for (const sd of [-1, 1]) { const x = R.p[0] + nx * w * sd, z = R.p[2] + nz * w * sd; pos.push(x, Math.max(heightAt(x, z), R.p[1] - 0.15) + 0.06, z); uv.push(sd * 0.5 + 0.5, s / 2); }
      const k = pos.length / 3 - 2; if (row >= 0 && k >= 2) idx.push(k - 2, k - 1, k, k - 1, k + 1, k); row = 0;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return { geo: g, boards: bd };
  }, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: pathTex(), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 }), []);
  const bref = useRef<THREE.InstancedMesh>(null), wood = useMemo(() => { const t = planks(); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, roughness: 0.85, color: '#9a8a78' }); }, []);
  useMemo(() => setTimeout(() => { const m = bref.current; if (!m) return; const o = new THREE.Object3D(); boards.forEach((b, i) => { o.position.set(b.p[0], b.p[1] + 0.12, b.p[2]); o.rotation.set(0, b.yaw, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }), [boards]);
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <instancedMesh ref={bref} args={[undefined, undefined, boards.length]} material={wood}><boxGeometry args={[1.7, 0.08, 0.7]} /></instancedMesh>
    </group>
  );
}

/* ---------- Fırtına Deresi + şelale ---------- */
const WATER_VS = /* glsl */ `
  varying vec3 vW; varying vec2 vUv;
  #include <fog_pars_vertex>
  void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const NOISE = /* glsl */ `
  float wh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float wn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(wh(i), wh(i+vec2(1,0)), f.x), mix(wh(i+vec2(0,1)), wh(i+vec2(1,1)), f.x), f.y); }`;
const WATER_FS = /* glsl */ `
  uniform float uTime; uniform vec3 uSky; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSunDir; uniform vec3 uSplash; uniform float uDetail;
  varying vec3 vW; varying vec2 vUv;
  #include <fog_pars_fragment>
  ${NOISE}
  // yükseklik alanı: akış +z yönünde (dere vadiden aşağı akar); hızlı ince oktav + yavaş geniş oktav; şelale dibinde halka dalga
  float hf(vec2 p){
    float t = uTime;
    float h = wn(p * vec2(0.8, 0.3) + vec2(0.0, -t * 1.6)) * 0.9 + wn(p * vec2(1.6, 0.9) + vec2(t * 0.15, -t * 2.6)) * 0.3 * uDetail;
    float d = distance(p, uSplash.xz); h += sin(d * 6.5 - t * 9.0) * exp(-d * 0.45) * 0.35;
    return h;
  }
  void main(){
    vec2 p = vW.xz; float e = 0.15;
    vec3 N = normalize(vec3(hf(p - vec2(e, 0.0)) - hf(p + vec2(e, 0.0)), 2.0 * e * 2.2, hf(p - vec2(0.0, e)) - hf(p + vec2(0.0, e))));
    vec3 V = normalize(cameraPosition - vW);
    float F = clamp(0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0), 0.15, 0.42);   // sisli gökte yansıma hep var; üst sınır: suyun kendi rengi kaybolmasın        // Schlick, F0 = 0,02 (su)
    float edge = 1.0 - smoothstep(0.0, 0.22, min(vUv.x, 1.0 - vUv.x));   // kıyı
    vec3 base = mix(uDeep, uShallow, edge * 0.7 + wn(p * 0.2) * 0.3);
    vec3 col = mix(base, uSky, F);
    vec3 H = normalize(uSunDir + V); col += vec3(1.0, 0.95, 0.85) * pow(max(dot(N, H), 0.0), 120.0) * 0.8;
    float sd = distance(p, uSplash.xz);
    float streak = wn(p * vec2(2.4, 0.3) + vec2(0.0, -uTime * 2.2)) * 0.6 + wn(p * vec2(0.9, 0.22) + vec2(3.0, -uTime * 1.3)) * 0.4;   // akış yönünde uzamış köpük çizgileri (çağlayan dere)
    float foam = smoothstep(0.68, 0.92, streak + edge * 0.3) + exp(-sd * 0.55) * (0.6 + 0.4 * sin(uTime * 5.0 + sd * 3.0));
    col = mix(col, vec3(0.88, 0.92, 0.91), clamp(foam, 0.0, 1.0) * 0.7);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;
const FALL_FS = /* glsl */ `
  uniform float uTime; varying vec3 vW; varying vec2 vUv;
  #include <fog_pars_fragment>
  ${NOISE}
  void main(){
    // akış yukarıdan aşağı (vUv.y 1→0): dikey uzatılmış gürültü çizgileri hızla kayar; kenarlar incelir
    float s = wn(vec2(vUv.x * 18.0, vUv.y * 2.0 + uTime * 2.8)) * 0.6 + wn(vec2(vUv.x * 41.0, vUv.y * 5.0 + uTime * 4.5)) * 0.4;
    float side = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
    float a = clamp((s * 1.25 - 0.18) * side, 0.0, 1.0) * 0.88;
    vec3 col = mix(vec3(0.55, 0.66, 0.66), vec3(0.95, 0.97, 0.97), smoothstep(0.4, 0.85, s));
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;
export const SUN_DIR = new THREE.Vector3(0.55, 0.42, -0.72).normalize();
export function River({ tier, sky }: { tier: Tier; sky: THREE.Color }) {
  const { geo, mat, fall, fallMat } = useMemo(() => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [], step = tier === 'low' ? 3 : 1.5;
    for (let z = TERRAIN.z0, i = 0; z >= TERRAIN.z1; z -= step, i++) { const c = riverX(z), y = waterY(z), w = 6.4; pos.push(c - w, y, z, c + w, y, z); uv.push(0, z / 10, 1, z / 10); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const foot = fallsFoot();
    const m = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: WATER_FS, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uSky: { value: new THREE.Color() }, uDeep: { value: new THREE.Color('#3b6a62') }, uShallow: { value: new THREE.Color('#7fa596') }, uSunDir: { value: SUN_DIR.clone() }, uSplash: { value: new THREE.Vector3(...foot) }, uDetail: { value: tier === 'low' ? 0 : 1 } }]) });
    // şelale: dudaktan dibe, yamacın 0,35 m önünde eğri şerit
    const top = fallsTop(), fp: number[] = [], fu: number[] = [], fi: number[] = [], N = 14;
    for (let i = 0; i <= N; i++) { const t = i / N, x = top[0] + (foot[0] - top[0]) * t, yl = i === N ? foot[1] : Math.max(heightAt(x, FALLS.z) + 0.4, top[1] + (foot[1] - top[1]) * Math.pow(t, 1.6)); const w = 1.4 + t * 1.2;
      fp.push(x, yl, FALLS.z - w, x, yl, FALLS.z + w); fu.push(0, 1 - t, 1, 1 - t); if (i) { const k = i * 2; fi.push(k - 2, k, k - 1, k - 1, k, k + 1); } }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(fu, 2)); fg.setIndex(fi);
    const fm = new THREE.ShaderMaterial({ vertexShader: WATER_VS, fragmentShader: FALL_FS, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]) });
    return { geo: g, mat: m, fall: fg, fallMat: fm };
  }, [tier]);
  useFrame(({ clock }) => { mat.uniforms.uTime.value = clock.elapsedTime; fallMat.uniforms.uTime.value = clock.elapsedTime; (mat.uniforms.uSky.value as THREE.Color).copy(sky); });
  return (
    <group>
      <mesh geometry={geo} material={mat} />
      <mesh geometry={fall} material={fallMat} renderOrder={2} />
      <Splash count={tier === 'high' ? 220 : tier === 'medium' ? 120 : 50} />
      <RiverRocks />
    </group>
  );
}
/** Sıçrama parçacıkları: şelale dibinden balistik damlacıklar + yükselen buhar; CPU'da (≤220 nokta, ihmal edilebilir) */
function Splash({ count }: { count: number }) {
  const foot = useMemo(() => fallsFoot(), []);
  const { geo, vel, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry(), p = new Float32Array(count * 3), v = new Float32Array(count * 4); for (let i = 0; i < count; i++) { v[i * 4 + 3] = Math.random() * 1.2; p[i * 3 + 1] = -999; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(...fallsFoot()), 12);
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d')!, gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
    return { geo: g, vel: v, mat: new THREE.PointsMaterial({ size: 0.35, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0.7, color: '#e8f0ee' }) };
  }, [count]);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05), p = geo.attributes.position as THREE.BufferAttribute, a = p.array as Float32Array;
    for (let i = 0; i < count; i++) { const k = i * 3, q = i * 4; vel[q + 3] -= dt;
      if (vel[q + 3] <= 0) { a[k] = foot[0] + (Math.random() - 0.5) * 1.5; a[k + 1] = foot[1] + 0.1; a[k + 2] = foot[2] + (Math.random() - 0.5) * 3.5; vel[q] = -(0.5 + Math.random() * 2.5); vel[q + 1] = 1.5 + Math.random() * 3.5; vel[q + 2] = (Math.random() - 0.5) * 2; vel[q + 3] = 0.6 + Math.random() * 0.9; }
      vel[q + 1] -= 9.8 * dt * 0.6; a[k] += vel[q] * dt; a[k + 1] = Math.max(foot[1], a[k + 1] + vel[q + 1] * dt); a[k + 2] += vel[q + 2] * dt; }
    p.needsUpdate = true;
  });
  return <points geometry={geo} material={mat} />;
}
/** Dere taşları: köpüğün çıktığı yuvarlak kayalar (instanced) */
function RiverRocks() {
  const ref = useRef<THREE.InstancedMesh>(null), N = 70;
  const mat = useMemo(() => { const m = stoneBase(0.5); m.color.set('#8a8a84'); m.onBeforeCompile = mossPatch(-99, 0.8) as unknown as typeof m.onBeforeCompile; m.customProgramCacheKey = () => 'zk-rock'; return m; }, []);
  const geo = useMemo(() => { const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position as THREE.BufferAttribute, r = rng(3); for (let i = 0; i < p.count; i++) { const k = 0.85 + r() * 0.3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); } g.computeVertexNormals(); return g; }, []);
  useMemo(() => setTimeout(() => { const m = ref.current; if (!m) return; const o = new THREE.Object3D(), r = rng(77);
    for (let i = 0; i < N; i++) { const z = TERRAIN.z0 - r() * (TERRAIN.z0 - TERRAIN.z1), side = r() < 0.5 ? -1 : 1, d = r() * 6.5, x = riverX(z) + side * d, s = 0.4 + r() * 1.1; o.position.set(x, waterY(z) - 0.25 + s * 0.2, z); o.rotation.set(r(), r() * 6, r()); o.scale.setScalar(s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }), []);
  return <instancedMesh ref={ref} args={[geo, mat, N]} />;
}

/* ---------- tek kemerli taş köprü (Şenyuva tipi) ---------- */
export function Bridge({ u, saver }: { u: MorphUniforms; saver: boolean }) {
  const { body, mat, ring, ringMat, stele, steleRuin, intactMat, ruinMat } = useMemo(() => {
    const c = riverX(BRIDGE.z), half = BRIDGE.span / 2, wy = waterY(BRIDGE.z), spring = wy + 0.4, crown = bridgeDeck(c) - 0.9;
    const archY = (x: number) => Math.min(spring + (crown - spring) * Math.pow(Math.max(0, 1 - Math.abs(x / half) ** 1.9), 0.55), bridgeDeck(c + x) - 0.9);   // hafif sivri kemer; güvertenin en az 0,9 m altında
    const sh = new THREE.Shape(), ext = half + 2.4; sh.moveTo(-ext, wy - 1.5);
    for (let x = -ext; x <= ext + 1e-6; x += 0.5) sh.lineTo(x, bridgeDeck(c + Math.max(-half, Math.min(half, x))) - (Math.abs(x) > half ? (Math.abs(x) - half) * 0.6 : 0));
    sh.lineTo(ext, wy - 1.5); sh.lineTo(half, wy - 1.5); for (let x = half; x >= -half - 1e-6; x -= 0.5) sh.lineTo(x, archY(x)); sh.lineTo(-half, wy - 1.5); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: BRIDGE.width, bevelEnabled: false, steps: 1 }); g.translate(c, 0, BRIDGE.z - BRIDGE.width / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2.5, uv.getY(i) / 2.5);
    const m = morphMaterial(stoneBase(1), { value: 1 }, 'intact', true, mossPatch(wy, 0.55), 'bridge');
    // kemer taşları: kemer içi boyunca, iki yüzde dışa hafif taşan radyal bloklar
    const blocks: THREE.Matrix4[] = [], o = new THREE.Object3D(), K = 26;
    for (let i = 0; i <= K; i++) { const x = -half + (2 * half * i) / K, y = archY(x), dx = 0.05, sl = (archY(x + dx) - archY(x - dx)) / (2 * dx);
      for (const fz of [-1, 1]) { o.position.set(c + x, y + 0.32, BRIDGE.z + fz * (BRIDGE.width / 2 + 0.03)); o.rotation.set(0, 0, Math.atan(sl)); o.scale.set(1, 1, 1); o.updateMatrix(); blocks.push(o.matrix.clone()); } }
    const rm = new THREE.MeshStandardMaterial({ map: rubbleStone().map, color: '#b8b2a4', roughness: 0.88 });
    rm.onBeforeCompile = mossPatch(wy, 0.9) as unknown as typeof rm.onBeforeCompile; rm.customProgramCacheKey = () => 'zk-vous';
    const st = stoneBase(0.6); st.color.set('#c8c0ae');
    return { body: g, mat: m, ring: blocks, ringMat: rm, stele: new THREE.BoxGeometry(0.6, 1.3, 0.22), steleRuin: new THREE.BoxGeometry(0.62, 0.35, 0.3), intactMat: morphMaterial(st, u.kitabe, 'intact', saver, undefined, 'stele'), ruinMat: morphMaterial(st, u.kitabe, 'ruin', saver, undefined, 'stele') };
  }, [u, saver]);
  const rref = useRef<THREE.InstancedMesh>(null);
  useMemo(() => setTimeout(() => { const m = rref.current; if (!m) return; ring.forEach((x, i) => m.setMatrixAt(i, x)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }), [ring]);
  const c = riverX(BRIDGE.z), endX = c - BRIDGE.span / 2 - 1.6, endY = heightAt(endX, BRIDGE.z + 2);
  const ins = useMemo(() => { const k = document.createElement('canvas'); k.width = 64; k.height = 128; const g = k.getContext('2d')!; g.fillStyle = '#c8c0ae'; g.fillRect(0, 0, 64, 128); g.strokeStyle = '#4a4438'; g.lineWidth = 2; for (let y = 14; y < 118; y += 14) { g.beginPath(); for (let x = 8; x < 58; x += 4) g.lineTo(x, y + Math.sin(x * 0.7 + y) * 3); g.stroke(); } const t = new THREE.CanvasTexture(k); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  return (
    <group>
      <mesh geometry={body} material={mat} />
      <instancedMesh ref={rref} args={[undefined, ringMat, ring.length]}><boxGeometry args={[0.55, 0.7, 0.1]} /></instancedMesh>
      {/* kitabe: sağlam hâlde yazılı taş, harabe hâlde kırık kaide (gerçekte kitabe 1946 selinde kayboldu) */}
      <mesh geometry={stele} position={[endX, endY + 0.65, BRIDGE.z + 2]} rotation-y={0.3} material={intactMat} />
      <mesh position={[endX, endY + 0.65, BRIDGE.z + 2.12]} rotation-y={0.3}><planeGeometry args={[0.5, 1.1]} /><primitive object={morphMaterial(new THREE.MeshStandardMaterial({ map: ins, roughness: 0.9 }), u.kitabe, 'intact', saver, undefined, 'ins')} attach="material" /></mesh>
      <mesh geometry={steleRuin} position={[endX, endY + 0.17, BRIDGE.z + 2]} rotation-y={0.3} material={ruinMat} />
    </group>
  );
}

/* ---------- Zil Kale ---------- */
/** Düzensiz sur çizgisi (kayalık burnun kenarını izler), merkeze göre; kapı boşluğu rota sonuna bakar */
const OUTLINE: [number, number][] = [[10.5, 2], [8, 8.5], [2, 10.5], [-5, 10], [-10, 5], [-11, -2], [-8, -8.5], [-1.5, -11], [5, -9.5], [9.5, -5]];
const GATE = Math.atan2(CASTLE.z + 12 - CASTLE.z, -44 - CASTLE.x);   // merkezden rota sonuna yön (xz)
interface Seg { x: number; z: number; len: number; yaw: number; gate: boolean }
export function castleSegments(): Seg[] {
  return OUTLINE.map((a, i) => { const b = OUTLINE[(i + 1) % OUTLINE.length], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, ang = Math.atan2(mz, mx);
    return { x: mx, z: mz, len: Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.9, yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]), gate: Math.abs(Math.atan2(Math.sin(ang - GATE), Math.cos(ang - GATE))) < 0.45 }; });
}
export function Castle({ u, saver, tier }: { u: MorphUniforms; saver: boolean; tier: Tier }) {
  const y0 = castleBase();
  const P = useMemo(() => {
    const base = stoneBase(1), moss = mossPatch(y0, 1.1);
    return { common: morphMaterial(base, { value: 1 }, 'intact', true, moss, 'common'), intact: morphMaterial(base, u.burc, 'intact', saver, moss, 'burc'), ruin: morphMaterial(base, u.burc, 'ruin', saver, moss, 'burc'),
      outerI: morphMaterial(base, u.surlar, 'intact', saver, mossPatch(0, 1.1), 'surlar'), outerR: morphMaterial(base, u.surlar, 'ruin', saver, mossPatch(0, 1.1), 'surlar'),
      far: new THREE.MeshLambertMaterial({ color: '#5d5c55' }), roof: morphMaterial(new THREE.MeshStandardMaterial({ map: planks().map, color: '#7a6a5a', roughness: 0.9 }), u.burc, 'intact', saver, undefined, 'roof') };
  }, [u, saver, y0]);
  const segs = useMemo(castleSegments, []), r = useMemo(() => rng(55), []);
  const ruinTops = useMemo(() => segs.flatMap((s) => s.gate ? [] : Array.from({ length: 2 }, (_, k) => ({ s, off: (k - 0.5) * s.len * 0.45 + (r() - 0.5), h: 0.6 + r() * 1.8, w: 0.8 + r() * 1.6 }))), [segs, r]);
  const rubble = useMemo(() => Array.from({ length: 26 }, () => { const a = r() * 6.28, d = 11.5 + r() * 3; return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.25 + r() * 0.5, ry: r() * 6 }; }), [r]);
  const near = (
    <group>
      {segs.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation-y={s.yaw}>
          {s.gate ? (<>
            {[-1, 1].map((k) => <mesh key={k} position={[k * (s.len / 2 - 0.9), 2.2, 0]} geometry={wbox(1.8, 8.4, 1.6)} material={P.common} />)}
            <mesh position={[0, 4.9, 0]} geometry={wbox(s.len - 3.4, 1.2, 1.5)} material={P.intact} />
          </>) : (<>
            <mesh position={[0, 0.6, 0]} geometry={wbox(s.len, 6.2, 1.4)} material={P.common} />
            <mesh position={[0, 5.5, 0]} geometry={wbox(s.len, 3.6, 1.3)} material={P.intact} />
            {tier !== 'low' && ((n: number) => Array.from({ length: n }, (_, k) => <mesh key={k} position={[(k - (n - 1) / 2) * 1.4, 7.8, 0]} geometry={wbox(0.75, 1, 1.3)} material={P.intact} />))(Math.max(1, Math.floor(s.len / 1.4)))}
          </>)}
        </group>
      ))}
      {ruinTops.map((t, i) => <mesh key={i} position={[t.s.x + Math.cos(-t.s.yaw) * t.off, 3.7 + t.h / 2, t.s.z + Math.sin(-t.s.yaw) * t.off]} rotation-y={t.s.yaw} geometry={wbox(t.w, t.h, 1.35)} material={P.ruin} />)}
      {rubble.map((b, i) => <mesh key={i} position={[b.x, b.s * 0.3, b.z]} rotation={[b.ry, b.ry * 2, 0]} scale={[b.s * 1.4, b.s, b.s]} material={P.ruin}><dodecahedronGeometry args={[1, 0]} /></mesh>)}
      {/* baş kule: alt yarısı bugün de ayakta, üst kat + mazgallar + ahşap çatı “sağlam hâl” canlandırması */}
      <group position={[-3, 0, -3]}>
        <mesh position={[0, 3.5, 0]} geometry={wbox(6, 11, 5.4)} material={P.common} />
        <mesh position={[0, 12.5, 0]} geometry={wbox(5.9, 7, 5.3)} material={P.intact} />
        {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * 2.4, 16.4, sz * 2.1]} geometry={wbox(1, 0.9, 1)} material={P.intact} />))}
        <mesh position={[0, 17.6, 0]} rotation-y={Math.PI / 4} material={P.roof}><coneGeometry args={[4.6, 2.6, 4]} /></mesh>
        <mesh position={[1.2, 9.6, 0.2]} rotation={[0.3, 0.4, 0.5]} geometry={wbox(3, 1.2, 2.2)} material={P.ruin} />
        {/* pencere boşlukları (koyu) */}
        {[4.5, 8.5].map((y) => <mesh key={y} position={[0, y, 2.72]}><planeGeometry args={[0.6, 1.1]} /><meshBasicMaterial color="#141210" /></mesh>)}
      </group>
      {/* iç sur */}
      <mesh position={[3.5, 1.4, 1.5]} rotation-y={0.5} geometry={wbox(8, 3.8, 1.1)} material={P.common} />
    </group>
  );
  const far = (
    <group>
      {segs.map((s, i) => <mesh key={i} position={[s.x, 2.5, s.z]} rotation-y={s.yaw} material={P.far}><boxGeometry args={[s.len, s.gate ? 3 : 7, 1.4]} /></mesh>)}
      <mesh position={[-3, 7, -3]} material={P.far}><boxGeometry args={[6, 18, 5.4]} /></mesh>
    </group>
  );
  return (
    <group>
      <group position={[CASTLE.x, y0, CASTLE.z]}>
        <Detailed distances={[0, 110]}>{near}{far}</Detailed>
        <Crag />
      </group>
      <OuterWall P={P} />
    </group>
  );
}
/** Kalenin oturduğu kayalık: burun kenarında dev, yosunlu kaya blokları */
function Crag() {
  const mat = useMemo(() => { const m = stoneBase(0.25); m.color.set('#7c7a72'); m.onBeforeCompile = mossPatch(-99, 1.3) as unknown as typeof m.onBeforeCompile; m.customProgramCacheKey = () => 'zk-crag'; return m; }, []);
  const rocks = useMemo(() => { const r = rng(91); return Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * 6.28 + r() * 0.3, d = 12 + r() * 3; return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 2.5 + r() * 2.5, ry: r() * 6 }; }); }, []);
  return <>{rocks.map((k, i) => <mesh key={i} position={[k.x, -k.s * 0.6, k.z]} rotation={[k.ry, k.ry, 0]} scale={[k.s, k.s * 1.3, k.s]} material={mat}><dodecahedronGeometry args={[1, 1]} /></mesh>)}</>;
}
/** Yokuştaki dış sur parçası (Tarih Katmanı: “surlar”) */
function OuterWall({ P }: { P: { common: THREE.Material; outerI: THREE.Material; outerR: THREE.Material } }) {
  const parts = useMemo(() => { const out: { x: number; z: number; y: number; yaw: number }[] = []; for (let i = 0; i < 4; i++) { const x = -31 - i * 2.4, z = -297 - i * 2.2; out.push({ x, z, y: heightAt(x, z), yaw: -0.75 }); } return out; }, []);
  return (
    <group>
      {parts.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation-y={p.yaw}>
          <mesh position={[0, 0.2, 0]} geometry={wbox(3.4, 2.4, 1.1)} material={P.common} />
          <mesh position={[0, 2.6, 0]} geometry={wbox(3.4, 2.4, 1.05)} material={P.outerI} />
          <mesh position={[(i % 2 ? 0.8 : -0.6), 1.7, 0]} geometry={wbox(1.4, 0.6 + (i % 3) * 0.4, 1.05)} material={P.outerR} />
        </group>
      ))}
    </group>
  );
}

/* ---------- Hemşin ahşap evi + serender ---------- */
function woodMats(u: { value: number }, saver: boolean) {
  const t = planks(), base = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, displacementMap: t.disp, displacementScale: 0.035, displacementBias: -0.02, roughness: 0.82 });
  return { common: agedWood(base, u), intact: agedWood(base, u, 'intact', saver), ruin: agedWood(base, u, 'ruin', saver) };
}
export function HemsinHouse({ at, u, saver }: { at: V3; u: { value: number }; saver: boolean }) {
  const W = useMemo(() => woodMats(u, saver), [u, saver]);
  const S = useMemo(() => morphMaterial(stoneBase(1), { value: 1 }, 'intact', true, mossPatch(at[1], 1), 'house'), [at]);
  const roof = useMemo(() => morphMaterial(new THREE.MeshStandardMaterial({ color: '#5b4a3c', map: planks().map, roughness: 0.9 }), u, 'intact', saver, undefined, 'hroof'), [u, saver]);
  const roofRuin = useMemo(() => agedWood(new THREE.MeshStandardMaterial({ color: '#5b4a3c', map: planks().map, roughness: 0.95 }), u, 'ruin', saver), [u, saver]);
  const near = (
    <group>
      <mesh position={[0, 0.6, 0]} geometry={wbox(8, 3.4, 6)} material={S} />
      <mesh position={[0, 3.7, 0]} geometry={wbox(8.2, 2.8, 6.2, 3, 8)} material={W.common} />
      {/* sağlam hâl: kırma çatı + geniş saçak + balkon; harabe hâl: çökmüş, eğik çatı tahtaları */}
      <mesh position={[0, 6.2, 0]} rotation-y={Math.PI / 4} scale={[1, 1, 0.78]} material={roof}><coneGeometry args={[6.6, 2.4, 4, 1]} /></mesh>
      <mesh position={[0, 3.1, 3.6]} geometry={wbox(6, 0.15, 1.3)} material={W.intact} />
      {[-2.6, -0.9, 0.9, 2.6].map((x) => <mesh key={x} position={[x, 3.6, 4.2]} geometry={wbox(0.1, 1, 0.1)} material={W.intact} />)}
      <mesh position={[0, 4.1, 4.2]} geometry={wbox(6, 0.1, 0.12)} material={W.intact} />
      <mesh position={[1.4, 5.0, 0.4]} rotation={[0.55, 0, 0.12]} geometry={wbox(5.6, 0.12, 4.4)} material={roofRuin} />
      <mesh position={[-2.2, 4.6, -0.6]} rotation={[-0.35, 0, -0.5]} geometry={wbox(3.4, 0.12, 3.6)} material={roofRuin} />
      {[[-2.5, 3.9], [0.4, 3.6], [2.6, 4]].map(([x, y]) => <mesh key={x} position={[x, y, 3.13]}><planeGeometry args={[0.8, 0.9]} /><meshBasicMaterial color="#14110d" /></mesh>)}
    </group>
  );
  const far = <mesh position={[0, 2.8, 0]}><boxGeometry args={[8, 7, 6]} /><meshLambertMaterial color="#4e4034" /></mesh>;
  return <group position={at} rotation-y={-1.9}><Detailed distances={[0, 70]}>{near}{far}</Detailed></group>;
}
export function Serender({ at, u, saver }: { at: V3; u: { value: number }; saver: boolean }) {
  const W = useMemo(() => woodMats(u, saver), [u, saver]);
  const flat = useMemo(() => { const m = stoneBase(0.4); m.color.set('#9a958a'); return m; }, []);
  const roof = useMemo(() => morphMaterial(new THREE.MeshStandardMaterial({ color: '#56463a', map: planks().map, roughness: 0.9 }), u, 'intact', saver, undefined, 'sroof'), [u, saver]);
  const near = (
    <group>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * 1.4, 0, sz * 1.1]}>
          <mesh position={[0, 0.9, 0]} geometry={wbox(0.25, 1.8, 0.25)} material={W.common} />
          {/* fare taşı: ayağın tepesindeki yassı taş, farelerin tırmanmasını engeller */}
          <mesh position={[0, 1.85, 0]} material={flat}><cylinderGeometry args={[0.42, 0.45, 0.1, 10]} /></mesh>
        </group>
      )))}
      <mesh position={[0, 2.9, 0]} geometry={wbox(3.4, 1.9, 2.8, 3, 6)} material={W.common} />
      <mesh position={[0.6, 3.1, 1.42]} geometry={wbox(1.2, 1.2, 0.04)} material={W.ruin} />
      <mesh position={[0, 4.4, 0]} rotation-y={Math.PI / 4} scale={[1, 1, 0.8]} material={roof}><coneGeometry args={[3.2, 1.4, 4, 1]} /></mesh>
    </group>
  );
  const far = <mesh position={[0, 2.6, 0]}><boxGeometry args={[3.4, 4, 2.8]} /><meshLambertMaterial color="#4e4034" /></mesh>;
  return <group position={at} rotation-y={-2.1}><Detailed distances={[0, 55]}>{near}{far}</Detailed></group>;
}

/* ---------- uzak dağlar (Kaçkarlar; kale tepesinden görülen sırtlar) ---------- */
/** Sise girmez (fog: false) ama saydamlığı tepe açıklığıyla yönetilir: vadide görünmez, kale tepesinde belirir */
export const mountainMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, fog: false, opacity: 0, depthWrite: false });
export function Mountains() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1600, 500, 96, 30); g.rotateX(-Math.PI / 2); g.translate(0, 0, -720);
    const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 3), rock = new THREE.Color('#8a9496'), forest = new THREE.Color('#5d7364'), snow = new THREE.Color('#f4f7f8'), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), ridge = Math.exp(-(((z + 760) / 140) ** 2)), y = 60 + ridge * (260 + 140 * Math.sin(x * 0.006) + 90 * Math.sin(x * 0.017 + 1) + 40 * Math.sin(x * 0.05)) + Math.max(0, -z - 470) * 0.2;
      p.setY(i, y); c.copy(forest).lerp(rock, THREE.MathUtils.smoothstep(y, 160, 260)).lerp(snow, THREE.MathUtils.smoothstep(y, 330, 380)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }, []);
  return <mesh geometry={geo} material={mountainMat} renderOrder={-1} />;
}
