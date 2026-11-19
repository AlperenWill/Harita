/**
 * Zil Kale — nemli Karadeniz sisi: yoğunluk modeli, rüzgâr, açılma anları ve sis içinde ışık (saf matematik + çizim yardımcıları).
 *
 * NEDEN ÜÇ KATMAN?
 *   1) Mesafe sisi (FogExp2; σ her karede bu modülden): uzaklıkla görünürlük kaybı. three'nin FogExp2'si T(d) = e^(−(σd)²) kullanır:
 *      Beer–Lambert'in e^(−σd)'sine göre yakında daha berrak, uzakta daha keskin kapanır — Karadeniz sisinin "duvar" etkisi bu.
 *      (Işık huzmesi hesabında fiziksel Beer–Lambert T = e^(−σd) kullanılır; ikisi aynı σ'yi paylaşır.)
 *   2) Sis perdeleri: rüzgârla sürüklenen, kameraya dönük, yumuşak gürültü dokulu yarı saydam katmanlar (InstancedMesh).
 *      Düz sis "boş" görünür; perdeler derinlikte kıvrılan, yoğunluğu değişen hacim hissi verir.
 *   3) Işık huzmeleri (god rays): güneş, ağaçların ve sisin arasından eğik konik huzmelerle süzülür. Huzme parlaklığı fiziksel
 *      saçılmanın sadeleştirilmiş hâlidir:
 *        L_huzme ≈ σs · p_HG(cosθ, g) · T(d)       p_HG(cosθ, g) = (1 − g²) / (4π · (1 + g² − 2g·cosθ)^{3/2})
 *      θ: bakış yönü ile güneşe yön arasındaki açı, g = 0,6 (sis damlacıkları ışığı ileri saçar). Güneşe doğru bakınca huzmeler
 *      güçlenir, sırtını dönünce solar. σs sis yoğunluğuyla artar; ama çok yoğun sis (T küçük) huzmeyi boğar. Bu yüzden huzmeler en
 *      çok "orta yoğunlukta, açılmaya başlayan" siste parlar — sabah sisinin tanıdık görüntüsü.
 * AÇILMA ANI: köprü, şelale ve kale girişinde yoğunluk ~2 sn içinde tabanın %12'sine iner (yumuşak adım), oyuncu bölgede kaldıkça açık
 *   kalır, uzaklaşınca yavaşça geri gelir. Vadide yoğunluk yükseklikle ve rotada ilerledikçe değişir (dere kıyısı en yoğun).
 * RÜZGÂR: yön yavaşça döner (iki sinüs), hız ani esintilerle salınır; sis perdeleri bu vektörle sürüklenir, yoğunluk esintide %15 seyrelir.
 * PİL TASARRUFU: üstel sis yerine doğrusal sis (near/far), perdeler ve huzmeler kapalı, rüzgâr animasyonu durur.
 */
import { REVEALS, ROUTE_LEN } from './valley';

export const BASE_DENSITY = 0.032;          // σ (1/m): FogExp2 ile ~55 m'de görünürlük %5'e düşer (e^(−(σd)²) = 0,05 → σd ≈ 1,73)
export const CLEAR_FACTOR = 0.12;           // açılma anında yoğunluk oranı
export const G_HG = 0.6;

/** Henyey–Greenstein faz fonksiyonu (ileri saçılma) */
export function phaseHG(cosTheta: number, g = G_HG): number { return (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * cosTheta, 1.5)); }
export const transmittance = (sigma: number, d: number) => Math.exp(-sigma * d);
/** Huzme parlaklığı (0..1'e normalize): saçılma · faz · geçirgenlik */
export function shaftIntensity(sigma: number, cosTheta: number, d = 30): number {
  const v = sigma * 40 * phaseHG(cosTheta) * transmittance(sigma, d) * 4 * Math.PI / ((1 + G_HG) / Math.pow(1 - G_HG, 2));
  return Math.max(0, Math.min(1, v * 2.2));
}
/** Rüzgâr: yön (birim vektör) ve hız (0..1) — yavaş dönen yön + esintiler */
export function wind(t: number): { dir: [number, number]; speed: number } {
  const a = 0.9 + 0.5 * Math.sin(t * 0.021) + 0.25 * Math.sin(t * 0.057 + 1.3), gust = Math.max(0, Math.sin(t * 0.31) * Math.sin(t * 0.13 + 0.7));
  return { dir: [Math.cos(a), Math.sin(a)], speed: Math.min(1, 0.35 + 0.15 * Math.sin(t * 0.09) + 0.5 * gust) };
}
/** Rota boyunca taban yoğunluk: dere kıyısında yoğun, yokuşta seyrelir, kale tepesinde ince bir perde */
export function routeDensity(s: number): number {
  const u = s / ROUTE_LEN;
  return BASE_DENSITY * (0.85 + 0.35 * Math.sin(u * Math.PI * 2.2 + 0.6) * 0.5) * (u > 0.82 ? 1 - (u - 0.82) * 2.2 : 1);
}
function smooth(x: number) { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); }
/** Açılma bölgesindeki ağırlık (0..1): Gauss benzeri yumuşak tepe */
export function revealWeight(s: number): { w: number; id: string | null } {
  let best = 0, id: string | null = null;
  for (const r of REVEALS) { const w = Math.exp(-(((s - r.s) / (r.width * 0.6)) ** 2)); if (w > best) { best = w; id = r.id; } }
  return { w: best, id: best > 0.5 ? id : null };
}
/** Durum makinesi: açılma ilerlemesi `open` (0..1) hedefe zamanla yaklaşır (açılış ~2 sn, kapanış ~5 sn) */
export function stepOpen(open: number, target: number, dt: number) { const tau = target > open ? 0.7 : 1.8; return open + (target - open) * (1 - Math.exp(-dt / tau)); }
/** O anki toplam yoğunluk */
export function density(s: number, t: number, open: number): number {
  const w = wind(t), base = routeDensity(s) * (1 - 0.15 * w.speed);
  return base * (1 - (1 - CLEAR_FACTOR) * smooth(open)) * (1 - 0.5 * summitClear(s));
}
/** Pil tasarrufu: FogExp2'nin yaklaşık eşdeğeri doğrusal sis aralığı (%5 görünürlük σd ≈ 1,73; doğrusal sis "far"da tam kapanır → 1,9/σ) */
export const linearFogRange = (sigma: number): [number, number] => [2, Math.min(700, 1.9 / Math.max(1e-4, sigma))];
/** Kale tepesinde ek açılma: son 40 m'de sis tabanın yarısına iner ve uzak dağlar belirir (0..1) */
export const summitClear = (s: number) => smooth((s - (ROUTE_LEN - 40)) / 30);

export type Tier = 'low' | 'medium' | 'high';
/** Kademe planı (sis + ışık + son işlem). Pil tasarrufu: doğrusal sis, perde/huzme yok, rüzgâr animasyonu yok. */
export function fogPlan(tier: Tier, saver: boolean) {
  return {
    tier, saver, linear: saver,
    sheets: saver ? 0 : tier === 'high' ? 36 : tier === 'medium' ? 22 : 12,
    shafts: saver ? 0 : tier === 'low' ? 6 : 16,
    windAnim: !saver, bloom: !saver && tier !== 'low',
    dpr: (tier === 'high' ? [1, 2] : tier === 'medium' ? [1, 1.5] : [0.75, 1]) as [number, number],
  };
}
export type FogPlan = ReturnType<typeof fogPlan>;

/** Sis perdesi dokusu: yumuşak kenarlı, içi gürültülü bulut (canvas) */
export function fogSheetTexture(): HTMLCanvasElement {
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d')!; let sd = 3; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 40; i++) { const x = 20 + r() * 88, y = 30 + r() * 68, rad = 14 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(255,255,255,${0.12 + r() * 0.12})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }
  return c;
}
