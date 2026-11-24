/**
 * Siirt Tillo — İsmail Fakirullah Türbesi ve "Işık Hadisesi" (kısa oyun). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Türbe başlangıçtadır: kare oda, batıda kapı, doğu duvarında pencere; içeride iki sanduka.
 * Doğuda tepe ve tepenin sırtında bir gedik (doğu yönünde). Gün doğumunda güneşin doğduğu yön (azimut) tarihe göre değişir; yalnızca
 * gece ile gündüzün eşit olduğu günlerde (21 Mart, 23 Eylül) güneş gedikten görünür ve ışık doğu penceresinden geçip sandukalara düşer.
 * Mekanik: (1) 1960'lardaki onarımda yeri değişen pencere yüzünden ışık sandukaya ulaşmaz → doğru pencereyi aç (2011'deki gibi);
 * (2) tarihi ayarla, gün doğumunu izle. Ölçüler ve gedik/pencere geometrisi TEMSİLÎDİR (docs/TILLO.md).
 */
export type V2 = [number, number];
export const LAT = 37.95;   // Tillo'nun enlemi (yaklaşık)
export const ROOM = { h: 0.6, half: 3.5, t: 0.6, H: 6 };
export const DOOR = { z: 0, w: 1.4 };
/** Sandukalar: uzun kenarları kuzey-güney; ayak uçları güneyde (z = SAND.z1) */
export const SAND = { z0: -1.0, z1: 1.0, w: 0.9, xs: [1.3, -1.3] };
/** Doğu duvarında aday pencere yerleri (z); TRUE doğru olan (sandukaların ayak ucu hizası), OLD 1960'lardaki yeri */
export const WINDOWS = [-0.6, 0.7, 1.9];
export const TRUE_WIN = 1, OLD_WIN = 2;
export const WIN_Y = 1.5;
/** Güneşin doğduğu azimut (kuzeyden saat yönünde, derece) — gün (1..365) için */
/** Güneşin dik açısı (derece), Spencer (1971) yaklaşımı */
export function declination(day: number) { const g = (2 * Math.PI * (day - 1)) / 365;
  return ((0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)) * 180) / Math.PI; }
export function sunriseAzimuth(day: number) { const d = (declination(day) * Math.PI) / 180, p = (LAT * Math.PI) / 180; return (Math.acos(Math.max(-1, Math.min(1, Math.sin(d) / Math.cos(p)))) * 180) / Math.PI; }
/** Gedik: doğu yönünde dar bir yarık; güneş gedikten görünürse ışık içeri girer */
export const NOTCH_HALF = 0.55;   // derece
export const throughNotch = (day: number) => Math.abs(sunriseAzimuth(day) - 90) < NOTCH_HALF;
/** Işığın sandukalara düşüp düşmediği: pencere z'si + azimut sapmasının duvardan sandukaya kadarki kayması */
export function beamZAt(win: number, day: number, x: number) { const dev = ((sunriseAzimuth(day) - 90) * Math.PI) / 180, wx = ROOM.half; return WINDOWS[win] + (wx - x) * Math.tan(dev); }
export function lightHits(win: number, day: number): boolean {
  if (!throughNotch(day)) return false;
  return SAND.xs.every((x) => { const z = beamZAt(win, day, x); return z > SAND.z1 - 0.45 && z < SAND.z1 + 0.15; });
}
/** Gün ↔ tarih (artık yıl yok) */
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'], ML = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function dateLabel(day: number) { let d = ((day - 1) % 365 + 365) % 365; for (let m = 0; m < 12; m++) { if (d < ML[m]) return `${d + 1} ${MONTHS[m]}`; d -= ML[m]; } return ''; }
export const dayOf = (month: number, date: number) => ML.slice(0, month - 1).reduce((a, b) => a + b, 0) + date;

/* ===================== yürüyüş ===================== */
export const BOUNDS = { x0: -40, x1: 30, z0: -30, z1: 30 };
const H = ROOM.half;
const inRoom = (x: number, z: number, m: number) => Math.abs(x) < H - m && Math.abs(z) < H - m;
const inShell = (x: number, z: number, m: number) => Math.abs(x) < H + ROOM.t + m && Math.abs(z) < H + ROOM.t + m;
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (x < -(H - 0.3) && x > -(H + ROOM.t + 0.6) && Math.abs(z - DOOR.z) < DOOR.w / 2 - 0.3) return true;   // kapı
  if (inShell(x, z, 0.35)) { if (!inRoom(x, z, 0.35)) return false; return !SAND.xs.some((sx) => Math.abs(x - sx) < SAND.w / 2 + 0.35 && z > SAND.z0 - 0.35 && z < SAND.z1 + 0.35); }
  return !HOUSES.some((h) => Math.abs(x - h.x) < h.w / 2 + 0.5 && Math.abs(z - h.z) < h.d / 2 + 0.5);
}
export const groundY = (x: number, z: number) => (inShell(x, z, 0) ? 0.15 : Math.max(0, (x - 8) * 0.06) * (x > 8 ? 1 : 0));
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }
/** Köy evleri (yürünmez) */
export const HOUSES: { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -20, z: -14, w: 7, d: 6, h: 4.5 }, { x: -28, z: 6, w: 6, d: 7, h: 5 }, { x: -16, z: 16, w: 8, d: 6, h: 4 }, { x: 4, z: -20, w: 6, d: 6, h: 4.2 }, { x: 10, z: 18, w: 7, d: 6, h: 4.6 },
];
/** Tepe: doğuda sırt; gediğin yönü tam doğu */
export const RIDGE = { x: 160, top: 34 };

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Tomb of İsmail Fakirullah', url: 'https://en.wikipedia.org/wiki/Tomb_of_%C4%B0smail_Fakirullah' },
  kure: { title: 'Küre Ansiklopedisi — İsmail Fakirullah Türbesi Işık Hadisesi', url: 'https://kureansiklopedi.com/tr/detay/ismail-fakirullah-turbesi-isik-hadisesi' },
  tubitak: { title: 'TÜBİTAK — Üç asırlık Tillo ışık hadisesi izleyenleri büyüledi', url: 'https://tubitak.gov.tr/tr/haber/uc-asirlik-tillo-isik-hadisesi-izleyenleri-buyuledi' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 2.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('turbe', 'İsmail Fakirullah Türbesi', 'Türbe', [-8, 0], [-H - ROOM.t - 0.1, 3.4, 0],
    'Tillo\'daki bu türbede İsmail Fakirullah ile öğrencisi İbrahim Hakkı Erzurumi yatar. Türbe, öğrencinin hocası için düzenlediği ışık olayıyla tanınır; 2015\'te UNESCO Dünya Mirası Geçici Listesi\'ne alındı.', SRC.wiki),
  mk('ibrahimhakki', 'İbrahim Hakkı Erzurumi', 'Bilgin', [-2.4, -2.4], [-1.3, 1.6, -1.2],
    'İbrahim Hakkı Erzurumi, gökbilimle de uğraşan bir Osmanlı bilginidir. Işık düzeneğini hocası İsmail Fakirullah\'ın türbesi için kurduğu anlatılır: gece ile gündüzün eşit olduğu günlerde doğan güneşin ilk ışığı sandukalara ulaşır.', SRC.kure),
  mk('gedik', 'Tepedeki gedik', 'Doğa', [16, 0], [22, 3.2, 0],
    'Türbenin doğusundaki tepenin sırtında bir gedik vardır. Güneşin ilk ışınları bu gedikten geçip türbenin doğu penceresinden içeri girer. Güneşin doğduğu yer yıl boyunca kuzeye ve güneye kayar; tam doğuda yalnızca iki gün doğar.', SRC.tubitak),
];
export const CARD_WIN = { id: 'pencere', name: 'Kayıp pencere', kicker: '1960\'lar → 2011',
  text: '1960\'lardaki onarımda doğu penceresinin yeri değişti ve ışık artık sandukalara ulaşmadı. 2011\'de farklı üniversitelerden bilim insanları yeni bir pencere açtı; ışık olayı yeniden görülmeye başladı. (Oyundaki pencere yerleri temsilîdir.)', source: SRC.wiki };
export const CARD_LIGHT = { id: 'isik', name: 'Işık Hadisesi', kicker: '21 Mart · 23 Eylül',
  text: 'Gece ile gündüzün eşit olduğu günlerde doğan güneşin ilk ışığı tepedeki gedikten ve doğu penceresinden geçer, birkaç dakika boyunca sandukaların ayak ucuna düşer. Bugün bu olayı izlemek için Tillo\'ya her yıl binlerce kişi gelir; bulutlu havada ise görülemez.', source: SRC.tubitak };
export const START: { at: V2; yaw: number } = { at: [-14, 2], yaw: -Math.PI / 2 };
export const WATCH: { at: V2; yaw: number; pitch: number } = { at: [-2.6, 2.4], yaw: -1.32, pitch: 0.05 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
/** Doğu duvarının içinde, pencere seçimi için durulan nokta */
export const WIN_AT: V2 = [2.6, 2.6];
