/**
 * Galata Kulesi — merdiven: sarmal merdiveni yürüyerek çıkma ve nefes (saf; test edilir).
 *
 * Yeni mekanik: Ritimle dokunmak yerine oyuncu dar sarmal merdiveni kendisi yürür (birinci şahıs, bakış serbest).
 * Merdivenin neresinde olduğu, kulenin ekseni etrafında dönülen açıdan (açının "açılmış" toplamı, θ) bulunur;
 * yükseklik θ ile artar. Çıkmak nefes tüketir: nefes azaldıkça adımlar yavaşlar, soluma sesi ağırlaşır.
 * Durunca nefes yavaşça, bir pencerenin önünde dururken hızla dolar. Her sahanlıkta dışarıya bakan bir pencere
 * vardır; pencereden bakınca kulenin tarihinden bir an anlatılır. Kaybetme ve süre baskısı yok.
 */
export const RISE = 0.2;                  // basamak yüksekliği (m)
export const STEPS_PER_TURN = 16;         // bir tam dönüşte basamak (oyun ölçeği; gerçek sayı değildir)
export const TURNS = 4;
export const TOTAL_STEPS = STEPS_PER_TURN * TURNS;
export const STEP_ANGLE = (Math.PI * 2) / STEPS_PER_TURN;
export const TOP_THETA = TOTAL_STEPS * STEP_ANGLE;
export const CORE_R = 0.95, WALL_R = 4.45;                 // orta direk ve iç duvar
export const WALK_MIN = CORE_R + 0.45, WALK_MAX = WALL_R - 0.4;
export const TOP_Y = TOTAL_STEPS * RISE;

/** θ → basamağın üst yüzeyi (m). Basamaklı ama hafifçe yumuşatılmış (rampa + basamak hissi) */
export function floorAt(theta: number): number {
  const t = Math.max(0, Math.min(TOP_THETA, theta)) / STEP_ANGLE, i = Math.floor(t), f = t - i;
  return (i + Math.min(1, f * 3.2)) * RISE;   // basamağın ilk üçte birinde yükselir, sonra düz
}
/** Yeni konumun açısından açılmış açıyı günceller (bir adımda en fazla yarım dönüş değişebilir) */
export function unwrap(prevTheta: number, x: number, z: number): number {
  const a = Math.atan2(z, x), prev = ((prevTheta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let d = a - prev; d = Math.atan2(Math.sin(d), Math.cos(d));
  return prevTheta + d;
}
/** Merdivende kalınabilecek açı aralığı: başlangıçtaki zeminden en tepedeki kapıya */
export const clampTheta = (t: number) => Math.max(-0.2, Math.min(TOP_THETA + 0.15, t));

/* ---------- pencereler (her dönüşün sonunda bir sahanlık) ---------- */
export interface Window { id: string; theta: number; title: string; era: string; text: string; source: { title: string; url: string } }
const W = { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' };
export const WINDOWS: Window[] = [
  { id: 'deprem', theta: STEP_ANGLE * STEPS_PER_TURN * 1 - 0.35, era: '1509', title: 'Büyük deprem', source: W,
    text: '1509’daki büyük İstanbul depremi kuleye zarar verdi. Kule, Osmanlı döneminde Mimar Hayreddin tarafından onarıldı.' },
  { id: 'yangin', theta: STEP_ANGLE * STEPS_PER_TURN * 2 - 0.35, era: '1794 · 1831', title: 'Yangınlar', source: W,
    text: 'Kule 1794’te ve 1831’de yangın geçirdi. 1831’den sonra II. Mahmud döneminde onarılırken üstüne yeni katlar eklendi.' },
  { id: 'firtina', theta: STEP_ANGLE * STEPS_PER_TURN * 3 - 0.35, era: '1875 · 1965–1967', title: 'Fırtına ve külah', source: W,
    text: '1875’teki bir fırtına kulenin külahını yıktı; kule uzun yıllar düz damlı kaldı. 1965–1967 onarımında bugünkü konik külah yeniden yapıldı.' },
];
/** Pencerenin duvardaki yeri ve yüksekliği */
export const windowAngle = (w: Window) => w.theta;
export const windowY = (w: Window) => floorAt(w.theta) + 1.5;
/** Oyuncu bu pencerenin sahanlığında mı? (aynı tur, yakın açı) */
export const atWindow = (theta: number, w: Window) => Math.abs(theta - w.theta) < 0.55;

/* ---------- nefes ---------- */
export const DRAIN_PER_M = 0.11;          // her yükselen metre için harcanan nefes (dolu nefesle ~9 m)
export const REST_RATE = 0.12;            // dururken saniyede dolan
export const WINDOW_REST_RATE = 0.45;     // pencerenin önünde dururken saniyede dolan
/** Nefesi günceller: yükselince azalır, dururken (pencerede daha hızlı) dolar */
export function breathStep(breath: number, climbed: number, moving: boolean, atWin: boolean, dt: number): number {
  let b = breath - Math.max(0, climbed) * DRAIN_PER_M;
  if (!moving) b += (atWin ? WINDOW_REST_RATE : REST_RATE) * dt;
  return Math.max(0, Math.min(1, b));
}
/** Nefese göre yürüme hızı çarpanı: nefes tükenince adımlar ağırlaşır ama oyuncu hiç durmaz */
export const speedFactor = (breath: number) => 0.3 + 0.7 * Math.min(1, breath / 0.35);
