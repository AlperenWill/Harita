/**
 * Dolmabahçe — lüks malzemeler (PBR). Doku dosyası yok: desenler canvas'ta, kabartmalar yükseklikten Sobel ile normal haritası.
 *
 * KRİSTAL (yüksek kademe): transmission 1, ior 1,5, roughness 0, thickness 0,5
 *   - transmission 1: ışığın neredeyse tamamı cismin içinden geçer; renk arka plandan kırılarak gelir (opaklık hilesi yok).
 *   - ior 1,5: Bohem ve soda-kireç camının kırılma indisi ~1,50–1,52; kurşunlu kristalde ~1,55–1,6'ya çıkar. 1,5 hem
 *     doğru hem de Fresnel yansımasını (dik bakışta ~%4) gerçekçi tutar.
 *   - roughness 0: cilalı kesme yüzeyler; mikro pürüz olursa kırılan görüntü bulanıklaşır ve "kristal" yerine "buzlu cam" okunur.
 *   - thickness 0,5: kırılma ofsetinin hacim kalınlığı; ince damla prizmalar için yarım birim, arkadaki ışığı belirgin büker
 *     ama damlanın içini "boş" göstermez.
 *   Orta ve düşük kademede transmission kapalıdır (ek bir sahne geçişi ister): yerine ortam haritasından güçlü yansıyan,
 *   yarı saydam, clearcoat'lu cam kullanılır. Bloom, iki durumda da speküler parıltıyı taşır.
 * ALTIN VARAK: metalness 1, roughness 0,2, clearcoat 0,8
 *   - metalness 1: altın bir iletkendir; rengi difüzden değil speküler yansımadan gelir (temel renk = F0 ≈ altının yansıtma rengi).
 *   - roughness 0,2: varak cilalı ama alçı kabartma üzerine yapıştırıldığı için kusursuz ayna değil: yumuşak, geniş parıltı.
 *   - clearcoat 0,8: yaldızın üstündeki koruyucu vernik/lak tabakası; altın rengini bozmadan beyaz, keskin ikinci bir parıltı ekler.
 * HEREKE HALISI: displacementMap (tüy kabarıklığı, yüksek kademede) + sheen 1 (kadife benzeri lif saçılması: ışık açısı yataylaştıkça
 *   renk açılır ve sıcaklaşır — istenen "fresnel" renk değişimi). roughness 0,95: yün/ipek lifi mat.
 * MERMER: roughness 0,08 + clearcoat: cilalı zemin; yansımanın kendisi ReflectionOptimizer'dan (düzlemsel yansıma ya da ortam küpü).
 */
import * as THREE from 'three';
import { normalFrom } from '../topkapi/kit';
import { marbleTextures } from '../ayasofya/materials';

const T = Math.PI * 2;
function canvas(w: number, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; }
function tex(c: HTMLCanvasElement, srgb = true, rx = 1, ry = 1) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 16; return t; }

/** Rokoko kabartma yüksekliği: C-kıvrımlar, rozetler, çerçeve pervazı (normal ve yer değiştirme için) */
export function ornamentHeight(n = 512) {
  const [c, g] = canvas(n); g.fillStyle = '#303030'; g.fillRect(0, 0, n, n);
  const k = n / 512; g.strokeStyle = '#d8d8d8'; g.lineCap = 'round';
  g.lineWidth = 18 * k; g.strokeRect(20 * k, 20 * k, n - 40 * k, n - 40 * k); g.lineWidth = 6 * k; g.strokeRect(46 * k, 46 * k, n - 92 * k, n - 92 * k);
  const cscroll = (x: number, y: number, r: number, a: number) => { g.beginPath(); g.arc(x, y, r, a, a + Math.PI * 1.3); g.stroke(); g.beginPath(); g.arc(x + Math.cos(a + Math.PI * 1.3) * r * 0.55, y + Math.sin(a + Math.PI * 1.3) * r * 0.55, r * 0.42, a + Math.PI, a + Math.PI * 2.2); g.stroke(); };
  g.lineWidth = 10 * k;
  for (const [x, y, a] of [[130, 130, 0], [382, 130, Math.PI / 2], [382, 382, Math.PI], [130, 382, -Math.PI / 2]] as const) cscroll(x * k, y * k, 56 * k, a);
  g.fillStyle = '#ffffff'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T, r = (i % 2 ? 28 : 62) * k; g.lineTo(n / 2 + Math.cos(a) * r, n / 2 + Math.sin(a) * r); } g.fill();
  g.fillStyle = '#909090'; g.beginPath(); g.arc(n / 2, n / 2, 20 * k, 0, T); g.fill();
  return c;
}
/** Yükseklik canvas'ından normal haritası (Sobel, kit'ten) + tekrar */
const nrm = (c: HTMLCanvasElement, k: number, rx = 1, ry = 1) => { const t = normalFrom(c, k); t.repeat.set(rx, ry); return t; };
const cache: Record<string, THREE.Material | THREE.Texture> = {};
const memo = <T extends THREE.Material | THREE.Texture>(key: string, make: () => T): T => (cache[key] ??= make()) as T;

/** Altın varak (kabartmalı) */
export const gold = (hi = true) => memo(`gold${hi}`, () => new THREE.MeshPhysicalMaterial({
  color: '#e8b754', metalness: 1, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.12,
  normalMap: hi ? nrm(ornamentHeight(512), 3.5) : null, normalScale: new THREE.Vector2(0.8, 0.8),
}));
/** Düz altın (ince pervaz, avize gövdesi) */
export const goldPlain = () => memo('goldPlain', () => new THREE.MeshPhysicalMaterial({ color: '#e3b04b', metalness: 1, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
/** Kristal: yüksek kademede gerçek kırılma (transmission), öbürlerinde yansıyan yarı saydam cam */
export const crystal = (transmission: boolean) => memo(`crystal${transmission}`, () => transmission
  ? new THREE.MeshPhysicalMaterial({ transmission: 1, ior: 1.5, roughness: 0, thickness: 0.5, metalness: 0, specularIntensity: 1, envMapIntensity: 1.6, color: '#ffffff', attenuationColor: new THREE.Color('#f4fbff'), attenuationDistance: 2, flatShading: true })
  : new THREE.MeshPhysicalMaterial({ color: '#eef7ff', metalness: 0, roughness: 0.02, transparent: true, opacity: 0.45, envMapIntensity: 2.6, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, ior: 1.5, flatShading: true, depthWrite: false }));
/** Mermer (cilalı, beyaz damarlı); zemin, sütun, merdiven */
export function marble(kind: 'white' | 'floor' = 'white', rx = 4, ry = 4, rough = 0.08) {
  const t = marbleTextures(kind), map = t.map.clone(), nrm = t.normal.clone(); map.repeat.set(rx, ry); nrm.repeat.set(rx, ry); map.needsUpdate = nrm.needsUpdate = true;
  return new THREE.MeshPhysicalMaterial({ map, normalMap: nrm, normalScale: new THREE.Vector2(0.2, 0.2), roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.05 });
}
/** Hereke halısı: madalyonlu desen + tüy yer değiştirmesi + sheen (açıya göre renk) */
export function hereke(hi: boolean, rx = 1, ry = 1) {
  const n = 1024, [c, g] = canvas(n), [h, hg] = canvas(512);
  g.fillStyle = '#7d1a22'; g.fillRect(0, 0, n, n); hg.fillStyle = '#505050'; hg.fillRect(0, 0, 512, 512);
  const both = (fn: (x: CanvasRenderingContext2D, col: boolean) => void) => { g.save(); g.scale(2, 2); fn(g, true); g.restore(); fn(hg, false); };
  both((x, col) => {
    const C = (a: string, b: string) => (col ? a : b);
    x.fillStyle = C('#1d2c55', '#6a6a6a'); x.fillRect(10, 10, 492, 492); x.fillStyle = C('#7d1a22', '#505050'); x.fillRect(48, 48, 416, 416);
    x.strokeStyle = C('#e6c873', '#b0b0b0'); x.lineWidth = 4; x.strokeRect(16, 16, 480, 480); x.strokeRect(44, 44, 424, 424);
    for (let i = 0; i < 24; i++) { const t = 30 + i * 19.5; for (const [px, py] of [[t, 29], [t, 483], [29, t], [483, t]]) { x.fillStyle = C(i % 2 ? '#e6c873' : '#f1e7cf', '#c0c0c0'); x.beginPath(); x.arc(px, py, 5, 0, T); x.fill(); } }
    // madalyon: iç içe sekiz köşeli yıldız + lale çelengi
    x.fillStyle = C('#1d2c55', '#7a7a7a'); x.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T, r = i % 2 ? 92 : 140; x.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); } x.fill();
    x.fillStyle = C('#e6c873', '#c8c8c8'); x.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * T + 0.2, r = i % 2 ? 50 : 82; x.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); } x.fill();
    x.fillStyle = C('#7d1a22', '#505050'); x.beginPath(); x.arc(256, 256, 30, 0, T); x.fill();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * T, px = 256 + Math.cos(a) * 172, py = 256 + Math.sin(a) * 172; x.fillStyle = C(i % 2 ? '#2f6a4a' : '#e6c873', '#a0a0a0'); x.beginPath(); x.ellipse(px, py, 14, 24, a, 0, T); x.fill(); }
    for (const [px, py] of [[90, 90], [422, 90], [90, 422], [422, 422]]) { x.fillStyle = C('#1d2c55', '#7a7a7a'); x.beginPath(); x.arc(px, py, 34, 0, T); x.fill(); x.fillStyle = C('#e6c873', '#c0c0c0'); x.beginPath(); x.arc(px, py, 14, 0, T); x.fill(); }
  });
  let sd = 9; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,240,220'},${r() * 0.05})`; g.fillRect(r() * n, r() * n, 2, 2); }
  for (let i = 0; i < 9000; i++) { hg.fillStyle = `rgba(255,255,255,${r() * 0.22})`; hg.fillRect(r() * 512, r() * 512, 1, 1); }   // düğüm başına tüy
  return new THREE.MeshPhysicalMaterial({
    map: tex(c, true, rx, ry), normalMap: nrm(h, 2.5, rx, ry), roughness: 0.95,
    sheen: 1, sheenColor: new THREE.Color('#ff9a7a'), sheenRoughness: 0.45,
    ...(hi ? { displacementMap: tex(h, false, rx, ry), displacementScale: 0.012 } : {}),
  });
}
/** Boyalı duvar paneli (açık krem, altın pervazlı kabartma) */
export const wallPanel = (rx = 1, ry = 1) => {
  const [c, g] = canvas(512); g.fillStyle = '#efe2c8'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#d2a64a'; g.lineWidth = 10; g.strokeRect(20, 20, 472, 472); g.lineWidth = 4; g.strokeRect(46, 46, 420, 420);
  g.fillStyle = 'rgba(200,170,110,.25)'; g.beginPath(); g.arc(256, 256, 70, 0, T); g.fill();
  return new THREE.MeshStandardMaterial({ map: tex(c, true, rx, ry), normalMap: nrm(ornamentHeight(512), 2.5, rx, ry), roughness: 0.7 });
};
/** Boyalı tavan/kubbe deseni (kalem işi: pembe-krem zemin, altın kaburgalar) */
export function domePaint() {
  const [c, g] = canvas(1024, 512); g.fillStyle = '#e8d2c0'; g.fillRect(0, 0, 1024, 512);
  const rg = g.createLinearGradient(0, 0, 0, 512); rg.addColorStop(0, '#f6e7d6'); rg.addColorStop(1, '#caa58a'); g.fillStyle = rg; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = '#d9a84a'; g.lineWidth = 7; for (let i = 0; i < 24; i++) { const x = (i / 24) * 1024; g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 250); g.stroke(); }
  for (let i = 0; i < 24; i++) { const x = ((i + 0.5) / 24) * 1024; g.fillStyle = '#7a4a6a'; g.beginPath(); g.ellipse(x, 150, 12, 40, 0, 0, T); g.fill(); g.strokeStyle = '#e6c873'; g.lineWidth = 3; g.stroke(); }
  g.fillStyle = '#d9a84a'; g.fillRect(0, 0, 1024, 24); g.fillRect(0, 240, 1024, 16);
  return tex(c);
}
export const mahogany = () => memo('mahogany', () => new THREE.MeshPhysicalMaterial({ color: '#4a1e12', roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.1 }));
export const brass = () => memo('brass', () => new THREE.MeshStandardMaterial({ color: '#c99a3a', metalness: 1, roughness: 0.25 }));
export const velvet = (color = '#7a1420') => new THREE.MeshPhysicalMaterial({ color, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color('#ff8a8a'), sheenRoughness: 0.5 });
