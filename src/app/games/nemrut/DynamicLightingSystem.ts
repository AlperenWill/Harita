/**
 * Nemrut — dinamik aydınlatma ve atmosfer sistemi (saf; three.js ve React'e bağımlı değil, test edilir).
 *
 * Neden bu teknik: Nemrut'un etkisi ışığın gün içindeki değişimidir (doğu terası gün doğumunda, batı terası gün batımında aydınlanır).
 * Bu yüzden hazır ışık haritası (lightmap) yerine tek bir gerçek zamanlı güneş kullanılır; gökyüzü, sis, ortam ışığı ve yıldızlar
 * güneşin yüksekliğinden türetilir. Tek yönlü ışık + tek gölge haritası mobilde ucuzdur; pahalı olan hacimsel efektler ayrı ayrı kapatılabilir.
 *  - Güneş: enlem 38° K, sapma +10° (ağustos sonu) için saat açısından yükseklik ve pusula yönü.
 *  - Tanrı ışınları (god rays): güneş ufka yakınken ve sis varken güçlüdür: strength = sisYoğunluğu · alçaklık(elev) · gündüz.
 *  - Sis: sabah yoğun ve gri, öğle seyrek, akşam orta ve pembe, gece ince ve koyu. Rüzgâr yönünde sürüklenir.
 *  - Restore: heykeller kendi "altın saatlerinde" (doğu terası gün doğumunda, batı terası gün batımında) kendiliğinden canlanır.
 */
export type V3 = [number, number, number];
export const LAT = 38, DECL = 10;
const rad = Math.PI / 180;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: V3, b: V3, t: number): V3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Güneşin yüksekliği ve pusula yönü (derece; kuzey = 0, doğu = 90). hour: yerel güneş saati (12 = öğle) */
export function sunPosition(hour: number): { elevation: number; bearing: number } {
  const H = (hour - 12) * 15 * rad, lat = LAT * rad, d = DECL * rad;
  const sinEl = Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(H);
  const el = Math.asin(sinEl);
  const az = Math.atan2(-Math.cos(d) * Math.sin(H), Math.sin(d) * Math.cos(lat) - Math.cos(d) * Math.sin(lat) * Math.cos(H));
  return { elevation: el / rad, bearing: ((az / rad) + 360) % 360 };
}
/** Güneşe doğru birim vektör; sahne: +x doğu, +y yukarı, −z kuzey */
export function sunVector(hour: number): V3 {
  const { elevation, bearing } = sunPosition(hour), e = elevation * rad, b = bearing * rad;
  return [Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e)];
}
/** Gün doğumu / batımı saatleri (yükseklik = 0) */
export const DAY_HALF = Math.acos(-Math.tan(LAT * rad) * Math.tan(DECL * rad)) / rad / 15;
export const SUNRISE = 12 - DAY_HALF, SUNSET = 12 + DAY_HALF;

export type Phase = 'gece' | 'safak' | 'sabah' | 'ogle' | 'altin' | 'alacakaranlik';
export const PHASE_LABEL: Record<Phase, string> = { gece: 'Gece', safak: 'Şafak', sabah: 'Sisli sabah', ogle: 'Öğle', altin: 'Altın saat', alacakaranlik: 'Alacakaranlık' };
export function phaseOf(hour: number): Phase {
  const el = sunPosition(hour).elevation, am = hour < 12;
  if (el < -6) return 'gece';
  if (el < 2) return am ? 'safak' : 'alacakaranlik';
  if (el < 14) return am ? 'sabah' : 'altin';
  if (am && el < 30) return 'sabah';
  return 'ogle';
}

export interface Atmosphere {
  sun: V3; elevation: number; day: number;          // day: 0 gece … 1 gündüz
  sunColor: V3; sunIntensity: number;               // doğrusal RGB (0..1) ve şiddet
  ambientSky: V3; ambientGround: V3; ambient: number;
  fogColor: V3; fogDensity: number;                 // FogExp2 yoğunluğu
  stars: number;                                    // 0..1
  godRays: number;                                  // 0..1
  wind: number;                                     // 0..1 (ses ve sis hızı)
  exposure: number;
}
const C = {
  night: [0.02, 0.03, 0.07] as V3, dawnGrey: [0.55, 0.58, 0.62] as V3, noon: [0.62, 0.74, 0.9] as V3, gold: [0.98, 0.72, 0.5] as V3, pink: [0.82, 0.5, 0.56] as V3,
  sunLow: [1, 0.55, 0.28] as V3, sunHigh: [1, 0.96, 0.9] as V3, moon: [0.45, 0.55, 0.8] as V3,
};
export function atmosphere(hour: number): Atmosphere {
  const { elevation: el } = sunPosition(hour), am = hour < 12;
  const day = smooth(-6, 6, el), low = 1 - smooth(4, 28, el);                 // low: güneş ufka yakın
  const sunColor = mix3(C.sunLow, C.sunHigh, smooth(0, 30, el));
  // sis: sabah yoğun/gri, akşam pembe/orta, öğle seyrek, gece ince
  const morning = am ? smooth(-8, 2, el) * (1 - smooth(10, 32, el)) : 0, evening = !am ? smooth(-8, 2, el) * (1 - smooth(8, 26, el)) : 0;
  const fogDensity = 0.0012 + morning * 0.0052 + evening * 0.0022 + (1 - day) * 0.0006;
  let fogColor = mix3(C.night, C.noon, day);
  fogColor = mix3(fogColor, C.dawnGrey, morning * 0.9); fogColor = mix3(fogColor, mix3(C.gold, C.pink, 1 - smooth(-2, 8, el)), evening * 0.9);
  const sky = mix3(C.night, mix3(am ? C.dawnGrey : C.gold, C.noon, smooth(4, 30, el)), day);
  return {
    sun: sunVector(hour), elevation: el, day, sunColor, sunIntensity: smooth(-1, 12, el) * (1.4 + smooth(10, 50, el) * 1.6),
    ambientSky: sky, ambientGround: mix3([0.03, 0.03, 0.05], [0.42, 0.36, 0.28], day), ambient: 0.1 + day * 0.75,
    fogColor, fogDensity, stars: 1 - smooth(-10, -2, el),
    godRays: clamp((morning * 1.0 + evening * 0.8) * low * smooth(-1, 5, el)),
    wind: 0.25 + 0.2 * day + 0.45 * low * day,   // gece sakin, öğle hafif, gün doğumu/batımında sert
    exposure: mix(1.5, 0.95, day),
  };
}

/* ---------- restore ---------- */
export type Terrace = 'dogu' | 'bati';
/** Terasın altın saati: doğu = gün doğumundan sonraki ~1,4 saat; batı = gün batımından önceki ~1,4 saat */
export const GOLDEN: Record<Terrace, [number, number]> = { dogu: [SUNRISE + 0.1, SUNRISE + 1.5], bati: [SUNSET - 1.5, SUNSET - 0.1] };
export const BEST_HOUR: Record<Terrace | 'tumulus', number> = { dogu: SUNRISE + 0.7, bati: SUNSET - 0.7, tumulus: SUNSET - 0.5 };
export const inGolden = (t: Terrace, hour: number) => hour >= GOLDEN[t][0] && hour <= GOLDEN[t][1];
/** Restore hedefi (0..1): altın saatte ya da oyuncu yakınlaşmışsa 1 */
export const restoreTarget = (t: Terrace, hour: number, near: boolean) => (near || inGolden(t, hour) ? 1 : 0);
/** Yumuşak geçiş: a ← a + (hedef − a)·(1 − e^(−dt/τ)) */
export const approach = (a: number, target: number, dt: number, tau = 0.9) => a + (target - a) * (1 - Math.exp(-dt / tau));

/* ---------- güncelleme hızı (pil): sürgü hareket ederken güneş/atmosfer 30 Hz, dururken her kare ---------- */
export const DRAG_HZ = 30;
export function shouldUpdate(now: number, last: number, dragging: boolean): boolean { return !dragging || now - last >= 1 / DRAG_HZ - 1e-6; }
/** Rüzgâr yönü (birim, xz): batıdan doğuya, hafif kuzeyden */
export const WIND_DIR: [number, number] = [0.94, 0.34];
