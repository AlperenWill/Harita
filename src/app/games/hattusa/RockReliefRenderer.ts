/**
 * Hattuşa — kabartma çizici: paralaks tıkanma eşlemesi (POM) + kendi gölgesi + aşınma + Yazılıkaya kurulumu.
 *
 * ARKEOLOJİK GEREKÇE:
 *  - Kral Kapısı'nın iç yanındaki figür (bugün yerindeki kopyadır, aslı Ankara'da) sivri, boynuzlu miğferli, baltalı, kısa etekli bir
 *    savaşçı tanrıdır; uzun süre "kral" sanıldığı için kapı bu adı almıştır. Burada alçak kabartma olarak çizilir.
 *  - Yazılıkaya'da (açık hava kaya tapınağı) tanrılar alay hâlinde yürür: sivri başlıklı, kıvrık kılıçlı erkek tanrılar ve karşıdan gelen
 *    tanrıçalar ana sahnede buluşur. Oyunda bir alay paneli (12 figür) ve bir ana sahne paneli çizilir. Figürler stilize siluettir.
 *  - "Altın yaldız izi" (emissive): İSTEK ÜZERİNE eklenmiş SANATSAL bir vurgudur. Yazılıkaya kabartmalarında altın kaplama kanıtı
 *    bilinmemektedir; parıltı çok hafiftir ve kartta bu açıkça yazılır.
 *
 * POM MATEMATİĞİ (teğet uzayı = panelin yerel ekseni: x sağ, y yukarı, z dışarı):
 *   V = bakış yönü (yerel), katman sayısı L (yüksek 24, orta 12), adım Δ = (V.xy / V.z) · derinlik / L
 *   uv'den başla, her adımda uv −= Δ, katman derinliği d += 1/L; yükseklik haritasından H = 1 − h(uv) okunur; d ≥ H olunca dur,
 *   son iki adım arasında doğrusal ara değer (relief refinement). Bu, düz bir yüzeyde girintili/çıkıntılı figür yanılsaması verir.
 *   Kendi gölgesi: bulunan noktadan ışık yönüne (yerel) 8 adım ilerle; yol üstünde yüzey ışık ışınından yüksekse gölge (yumuşak toplam).
 *   Normal: yükseklik farklarından (merkezi fark) → Lambert + ortam. Işık açısı değişince gölgeler gerçekten yer değiştirir.
 *   Aşınma: yükseklik haritasına gürültülü çukurlar ve kenar yumuşatması (bulanıklaştırma) işlenir; yağmur izi gibi aşağı akan lekeler.
 * Düşük kademe / pil tasarrufu: POM kapalı → normal haritalı düz MeshStandardMaterial (aynı yükseklikten üretilmiş).
 */
import * as THREE from 'three';
import { normalFrom } from '../topkapi/kit';

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export type ReliefKind = 'warrior' | 'procession' | 'main';

/** Figürlerin yükseklik haritası (beyaz = çıkıntı). Kenarlar bulanıklaştırılarak yuvarlatılır, sonra aşındırılır. */
export function reliefHeight(kind: ReliefKind, w = 512, h = 512): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!, r = rng(kind.length * 97);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff';
  const figure = (x: number, y: number, s: number, flip = 1, cap = true, sword = true) => {   // y = ayak hizası, s = boy
    g.save(); g.translate(x, y); g.scale(flip * s / 100, s / 100);
    g.beginPath(); g.moveTo(-8, 0); g.lineTo(-14, -6); g.lineTo(-10, -40); g.lineTo(12, -40); g.lineTo(16, -6); g.lineTo(22, 0); g.closePath(); g.fill();   // bacaklar + kalkık uçlu ayakkabı
    g.beginPath(); g.moveTo(-14, -40); g.lineTo(16, -40); g.lineTo(12, -52); g.lineTo(-12, -52); g.closePath(); g.fill();                                       // kısa etek
    g.beginPath(); g.ellipse(0, -66, 12, 16, 0, 0, 7); g.fill();                                                                                                  // gövde
    g.beginPath(); g.ellipse(4, -86, 7, 8, 0, 0, 7); g.fill();                                                                                                    // baş (profil)
    g.beginPath(); g.moveTo(10, -86); g.lineTo(15, -83); g.lineTo(10, -80); g.fill();                                                                             // burun
    if (cap) { g.beginPath(); g.moveTo(-3, -90); g.lineTo(11, -90); g.lineTo(3, -112); g.closePath(); g.fill(); g.fillRect(-1, -102, 9, 2); }                     // sivri başlık + boynuz şeridi
    g.beginPath(); g.moveTo(8, -70); g.lineTo(24, -62); g.lineTo(24, -58); g.lineTo(8, -63); g.fill();                                                            // öne uzanan kol
    if (sword) { g.beginPath(); g.moveTo(-10, -58); g.quadraticCurveTo(-22, -40, -18, -24); g.lineTo(-15, -25); g.quadraticCurveTo(-18, -40, -7, -57); g.fill(); } // kıvrık kılıç
    g.restore();
  };
  if (kind === 'warrior') {
    figure(w * 0.5, h * 0.95, h * 0.85, 1, true, true);
    g.save(); g.translate(w * 0.5, h * 0.95); g.scale(h * 0.0085, h * 0.0085); g.fillRect(24, -66, 26, 4); g.fillRect(44, -74, 8, 18); g.restore();   // balta
  } else if (kind === 'procession') {
    for (let i = 0; i < 12; i++) figure(w * (0.05 + i * 0.078), h * 0.94, h * (0.78 + (r() - 0.5) * 0.05), 1, true, true);
  } else {
    figure(w * 0.32, h * 0.7, h * 0.62, 1, true, false); figure(w * 0.68, h * 0.7, h * 0.58, -1, false, false);
    g.fillRect(w * 0.18, h * 0.7, w * 0.3, h * 0.05); g.fillRect(w * 0.55, h * 0.7, w * 0.25, h * 0.05);                                                          // dağ tanrıları / hayvan üstünde duruş (stilize kaide)
    g.beginPath(); g.moveTo(w * 0.62, h * 0.24); g.lineTo(w * 0.74, h * 0.24); g.lineTo(w * 0.7, h * 0.12); g.lineTo(w * 0.66, h * 0.12); g.fill();                // tanrıçanın silindirik başlığı
  }
  // yuvarlatma (kabartma kenarı) + aşınma: gürültülü çukurlar, aşağı akan izler
  const blur = document.createElement('canvas'); blur.width = w; blur.height = h; const bg = blur.getContext('2d')!; bg.filter = 'blur(5px)'; bg.drawImage(c, 0, 0); bg.filter = 'none';
  g.clearRect(0, 0, w, h); g.drawImage(blur, 0, 0); g.globalAlpha = 0.35; g.drawImage(c, 0, 0); g.globalAlpha = 1;
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.35})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, 7); g.fill(); }
  for (let i = 0; i < 40; i++) { const x = r() * w; g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`; g.fillRect(x, r() * h * 0.5, 2 + r() * 3, h * (0.2 + r() * 0.5)); }
  return c;
}
/** Kireçtaşı rengi (kabartmanın taşı) */
function stoneColor(w = 256): HTMLCanvasElement { const c = document.createElement('canvas'); c.width = c.height = w; const g = c.getContext('2d')!, r = rng(5); g.fillStyle = '#b7a88f'; g.fillRect(0, 0, w, w); for (let i = 0; i < 4000; i++) { const v = 150 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v - 8},${v - 24},.35)`; g.fillRect(r() * w, r() * w, 2, 2); } return c; }
/** Altın iz maskesi (SANATSAL vurgu): figür kenarlarının bir kısmı */
function goldMask(height: HTMLCanvasElement): HTMLCanvasElement { const c = document.createElement('canvas'); c.width = height.width; c.height = height.height; const g = c.getContext('2d')!; g.filter = 'blur(2px)'; g.drawImage(height, 0, 0); g.filter = 'none'; g.globalCompositeOperation = 'difference'; g.drawImage(height, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, c.width, c.height); return c; }

const VS = /* glsl */ `
  uniform vec3 uSun; varying vec2 vUv; varying vec3 vViewL; varying vec3 vLightL;
  #include <fog_pars_vertex>
  void main(){
    vUv = uv; mat4 inv = inverse(modelMatrix);
    vViewL = (inv * vec4(cameraPosition, 1.0)).xyz - position; vLightL = normalize(mat3(inv) * uSun);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const FS = /* glsl */ `
  uniform sampler2D uH; uniform sampler2D uCol; uniform sampler2D uGold; uniform float uDepth; uniform float uSteps; uniform float uGoldAmt; uniform float uTime; uniform vec2 uAspect;
  uniform vec3 uSunCol; uniform vec3 uAmb; varying vec2 vUv; varying vec3 vViewL; varying vec3 vLightL;
  #include <fog_pars_fragment>
  float H(vec2 uv){ return texture2D(uH, uv).r; }
  void main(){
    vec3 V = normalize(vViewL); vec2 uv = vUv;
    // POM: bakış ışını yükseklik alanını kesene kadar katman katman ilerle (yüzeyin altındaki "derinlik" = 1 − h)
    vec2 P = (V.xy / max(V.z, 0.15)) * uDepth / uAspect; float L = uSteps; vec2 dUv = P / L; float d = 0.0; float hh = 1.0 - H(uv); vec2 pUv = uv; float pd = 0.0, ph = hh;
    for (int i = 0; i < 32; i++) { if (float(i) >= L || d >= hh) break; pUv = uv; pd = d; ph = hh; uv -= dUv; d += 1.0 / L; hh = 1.0 - H(uv); }
    float after = hh - d, before = ph - pd, k = after / (after - before + 1e-5); uv = mix(uv, pUv, clamp(k, 0.0, 1.0));
    // normal: merkezi fark
    float e = 1.5 / 512.0; float hx = H(uv + vec2(e, 0.0)) - H(uv - vec2(e, 0.0)), hy = H(uv + vec2(0.0, e)) - H(uv - vec2(0.0, e));
    vec3 N = normalize(vec3(-hx * 6.0, -hy * 6.0, 1.0)); vec3 Lt = normalize(vLightL);
    // kendi gölgesi: ışığa doğru yükseklik alanında yürü
    float sh = 1.0, h0 = H(uv); vec2 sUv = uv; vec2 sd = (Lt.xy / max(Lt.z, 0.2)) * uDepth / uAspect / 8.0;
    for (int j = 1; j <= 8; j++) { sUv += sd; float rayH = h0 + float(j) * (Lt.z > 0.0 ? 1.0 / 8.0 : 0.0) * 0.6; sh -= clamp((H(sUv) - rayH) * 6.0, 0.0, 1.0) * 0.12; }
    sh = clamp(sh, 0.25, 1.0);
    vec3 base = texture2D(uCol, uv * 2.0).rgb * (0.72 + 0.28 * h0);
    vec3 col = base * (uAmb + uSunCol * max(dot(N, Lt), 0.0) * sh);
    col += vec3(1.0, 0.78, 0.35) * texture2D(uGold, uv).r * uGoldAmt * (0.75 + 0.25 * sin(uTime * 0.8));
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;
export interface ReliefOpts { kind: ReliefKind; aspect: [number, number]; pom: boolean; steps: number; gold: number; sun: THREE.Vector3 }
/** Kabartma malzemesi: POM (yüksek/orta) ya da normal haritalı düz malzeme (düşük/pil) */
export function reliefMaterial(o: ReliefOpts): THREE.Material & { uniforms?: Record<string, THREE.IUniform> } {
  const hc = reliefHeight(o.kind, o.kind === 'procession' ? 1024 : 512, 512), ht = new THREE.CanvasTexture(hc), col = new THREE.CanvasTexture(stoneColor()); col.colorSpace = THREE.SRGBColorSpace; col.wrapS = col.wrapT = THREE.RepeatWrapping;
  if (!o.pom) { const nm = normalFrom(hc, 5); return new THREE.MeshStandardMaterial({ map: col, normalMap: nm, normalScale: new THREE.Vector2(2, 2), roughness: 0.9 }); }
  return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uH: { value: ht }, uCol: { value: col }, uGold: { value: new THREE.CanvasTexture(goldMask(hc)) }, uDepth: { value: 0.06 }, uSteps: { value: o.steps }, uGoldAmt: { value: o.gold }, uTime: { value: 0 },
    uAspect: { value: new THREE.Vector2(o.aspect[0] / o.aspect[1] > 1 ? o.aspect[0] / o.aspect[1] : 1, 1) }, uSun: { value: o.sun.clone() }, uSunCol: { value: new THREE.Color('#fff0d6').multiplyScalar(1.1) }, uAmb: { value: new THREE.Color('#6e6a62') } }]) });
}
/** Yazılıkaya: açık hava kaya tapınağının kaya kütleleri (deforme edilmiş, tabakalı kireçtaşı) */
export function rockGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position as THREE.BufferAttribute, r = rng(seed); const ph = [r() * 6, r() * 6, r() * 6];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(x * 3 + ph[0]) * Math.sin(z * 2.6 + ph[1]) + 0.08 * Math.sin(y * 9 + ph[2]) + (Math.round(y * 6) / 6 - y) * 0.25; p.setXYZ(i, x * k, y * k * 0.8, z * k); }
  g.computeVertexNormals(); return g;
}
