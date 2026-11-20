/**
 * Zil Kale — Tarih Katmanı: yaklaşınca yapı "harabe" ↔ "sağlam" hâl arasında dönüşür.
 *
 * NASIL: Her yapı iki parça kümesinden oluşur: yalnız-harabe (moloz, yıkık duvar uçları, çökmüş çatı) ve yalnız-sağlam (mazgallar,
 * tam yükseklikte duvar, kiremit/ahşap çatı, sağlam tahtalar). Ortak parçalar (temel, kemer) her iki hâlde de durur.
 * Geçiş bir "çözülme" (dissolve) gölgelendiricisidir: dünya konumundan üretilen 3B değer gürültüsü n(p) ∈ [0,1] ile
 *     görünür ⇔ n(p) < m            (sağlam parça, m = geçiş 0→1)
 *     görünür ⇔ n(p) > m            (harabe parça)
 * Eşiğe yakın piksellerde (|n − m| < 0,04) ince, sıcak bir kenar ışıması çizilir: taşlar "zamanın içinden" belirir. Kesme `discard` ile
 * yapılır; saydamlık sıralaması gerekmez, gölge ve sis doğru kalır. Gürültü dünya konumundan geldiği için bitişik parçalar aynı desenle
 * çözülür (dikiş yok). Ahşap evlerde ayrıca renk karışımı: kararmış/çürük ahşap → taze kestane rengi (uMorph ile).
 * Tetik: oyuncunun rota parametresi s ile katman noktası arasındaki uzaklık; reach içinde hedef 1, dışında 0. Geçiş ~1,5 sn sürer.
 * Pil tasarrufunda geçiş anlık yapılır (kenar ışıması ve gürültü yok; eşik 0,5'te parça doğrudan değişir).
 */
import * as THREE from 'three';
import { LAYERS, type Layer } from './valley';

export type MorphUniforms = Record<string, { value: number }>;
export const makeMorphUniforms = (): MorphUniforms => Object.fromEntries(LAYERS.map((l) => [l.id, { value: 0 }]));

const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
/** Yakınlıktan hedef: tam reach içinde 1, 1,4·reach'te 0 (yumuşak) */
export function morphTarget(s: number, l: Pick<Layer, 's' | 'reach'>): number { const d = Math.abs(s - l.s); return 1 - smooth((d - l.reach) / (l.reach * 0.4)); }
/** Zamanla yaklaş: ~1,5 sn (oluşum) / ~2,5 sn (geri çözülme) */
export function stepMorph(m: number, target: number, dt: number) { const tau = target > m ? 0.5 : 0.8; return m + (target - m) * (1 - Math.exp(-dt / tau)); }
/** Etkinleşme olayı: m 0,5'i yukarı geçtiğinde (ses + kart) */
export const activated = (prev: number, next: number) => prev < 0.5 && next >= 0.5;

/**
 * Bir MeshStandardMaterial'e çözülme ekler. mode 'intact': m büyüdükçe belirir; 'ruin': m büyüdükçe kaybolur.
 * Yeni malzeme döner (özgün malzeme paylaşılmaya devam eder). customProgramCacheKey ile mode başına tek program.
 */
export type Patch = (sh: THREE.WebGLProgramParametersWithUniforms) => void;
export function morphMaterial<M extends THREE.MeshStandardMaterial>(base: M, u: { value: number }, mode: 'intact' | 'ruin', saver = false, extra?: Patch, key = ''): M {
  const m = base.clone() as M;
  m.onBeforeCompile = (sh) => {
    extra?.(sh);
    sh.uniforms.uMorph = u; sh.uniforms.uSaver = { value: saver ? 1 : 0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMW;').replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 mw4 = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mw4 = instanceMatrix * mw4;
      #endif
      vMW = (modelMatrix * mw4).xyz;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uMorph; uniform float uSaver; varying vec3 vMW;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x), f.y),
                   mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x), f.y), f.z); }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float nz = uSaver > 0.5 ? 0.5 : n3(vMW * 0.9) * 0.65 + n3(vMW * 3.1) * 0.35;
      float edge = ${mode === 'intact' ? 'uMorph - nz' : 'nz - uMorph'};
      if (edge < 0.0) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += vec3(1.0, 0.72, 0.38) * (1.0 - smoothstep(0.0, 0.04, edge)) * step(0.001, uMorph) * step(uMorph, 0.999) * (1.0 - uSaver) * 1.6;`);
  };
  m.customProgramCacheKey = () => `zk-morph-${mode}-${saver ? 1 : 0}-${key}`;
  return m;
}
/** Ahşap: çürük (koyu, grimsi) ↔ taze (kestane) renk karışımı + çözülmesiz */
export function agedWood<M extends THREE.MeshStandardMaterial>(base: M, u: { value: number }, mode?: 'intact' | 'ruin', saver = false): M {
  const m = (mode ? morphMaterial(base, u, mode, saver, undefined, 'wood') : base.clone()) as M, prev = m.onBeforeCompile.bind(m);
  m.onBeforeCompile = (sh, r) => {
    if (mode) prev(sh, r);
    sh.uniforms.uMorph = u;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', mode ? '#include <common>' : '#include <common>\nuniform float uMorph;').replace('#include <map_fragment>', `#include <map_fragment>
      vec3 rotten = diffuseColor.rgb * vec3(0.42, 0.42, 0.40) + vec3(0.03, 0.035, 0.03);
      diffuseColor.rgb = mix(rotten, diffuseColor.rgb * vec3(1.05, 0.92, 0.78), smoothstep(0.0, 1.0, uMorph));`);
  };
  m.customProgramCacheKey = () => `zk-aged-${mode ?? ''}-${saver ? 1 : 0}`;
  return m;
}
