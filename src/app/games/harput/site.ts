/**
 * Elazığ — Harput Kalesi: "Süt Kalesi" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Kale bir kaya sırtının üstünde (tepe düzlüğü), surlarında bir gedik; aşağıda eski Harput ve Ulu Camii'nin
 * eğik minaresi; yamaçlarda üç sürü. Mekanik (efsaneye dayanır): kuraklıkta çeşme kurumuş — sürülerden süt topla, harç teknesinde
 * karıştır, gediği üç sıra taşla ör. Ölçüler ve düzen TEMSİLÎDİR; süt anlatısı bir efsanedir (docs/HARPUT.md).
 */
export type V2 = [number, number];
export const HILL = { r: 70, top: 14, platR: 30 };
export function terrain(x: number, z: number): number { const d = Math.hypot(x, z); if (d < HILL.platR) return HILL.top; const t = Math.min(1, (d - HILL.platR) / (HILL.r - HILL.platR)), s = t * t * (3 - 2 * t); return HILL.top * (1 - s); }
/** Sur: tepe düzlüğünün kenarında halka; güneyde kapı, doğuda gedik */
export const WALL = { r: 26, t: 2, h: 8 };
export const GATE_A = Math.PI / 2;   // güney (atan2(z,x))
export const BREACH_A = 0;   // doğu
export const GATE_HALF = 0.09, BREACH_HALF = 0.12;
export const COURSES = 3;
export const BREACH_AT: V2 = [Math.cos(BREACH_A) * (WALL.r - 2.2), Math.sin(BREACH_A) * (WALL.r - 2.2)];
export const TROUGH: V2 = [WALL.r - 6, 4];
export const HERDS: V2[] = [[-34, 42], [44, 36], [-48, -6]];
export const HERD_REACH = 3.2;
export const MOSQUE = { x0: -24, x1: -4, z0: 52, z1: 68, minaret: [-2, 66] as V2 };
export const BOUNDS = { x0: -80, x1: 80, z0: -60, z1: 90 };
const angDiff = (a: number, b: number) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
export function walkable(x: number, z: number, courses = 0): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  const d = Math.hypot(x, z), a = Math.atan2(z, x);
  if (d > WALL.r - 0.5 && d < WALL.r + WALL.t + 0.5) return angDiff(a, GATE_A) * WALL.r < GATE_HALF * WALL.r - 0.2;   // surdan yalnız kapıdan geçilir (gedik iskeleyle kapalı)
  void courses;
  if (x > MOSQUE.x0 - 0.4 && x < MOSQUE.x1 + 0.4 && z > MOSQUE.z0 - 0.4 && z < MOSQUE.z1 + 0.4) return false;
  if (Math.hypot(x - MOSQUE.minaret[0], z - MOSQUE.minaret[1]) < 2.4) return false;
  if (Math.hypot(x - TROUGH[0], z - TROUGH[1]) < 1.2) return false;
  return true;
}
export const groundY = (x: number, z: number) => terrain(x, z);
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; const y = groundY(x, z);
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - y) < 0.6) x += dx; if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - groundY(x, z)) < 0.6) z += dz; return [x, z]; }
export const nearHerd = (x: number, z: number) => HERDS.findIndex(([hx, hz]) => Math.hypot(x - hx, z - hz) < HERD_REACH);
export const atTrough = (x: number, z: number) => Math.hypot(x - TROUGH[0], z - TROUGH[1]) < 2.6;
export const atBreach = (x: number, z: number) => Math.hypot(x - BREACH_AT[0], z - BREACH_AT[1]) < 2.6;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  kultur: { title: 'Kültür Envanteri — Harput Kalesi', url: 'https://kulturenvanteri.com/en/yer/harput-kalesi/' },
  wiki: { title: 'Wikipedia — Harput Castle', url: 'https://en.wikipedia.org/wiki/Harput_Castle' },
  ntv: { title: 'NTV — Elazığ\'daki Ulu Cami\'nin minaresi depremlere meydan okuyor', url: 'https://www.ntv.com.tr/turkiye/elazigdaki-ulu-caminin-minaresi-864-yildir-depremlere-meydan-okuyor,g_-wI1-XrEWSTWsdeEjP8w' },
  kure: { title: 'Küre Ansiklopedisi — Harput Ulu Camii', url: 'https://kureansiklopedi.com/tr/detay/harput-ulu-cami-bbd8e' },
  belek: { title: 'Milli Gazete — Belek ile özdeşleşen Harput', url: 'https://www.milligazete.com.tr/belek-ile-ozdeslesen-harput' },
  efsane: { title: 'Fırat Kalkınma Ajansı — Elazığ efsaneleri', url: 'https://fka.gov.tr/sharepoint/userfiles/Icerik_Dosya_Ekleri/Efsane_Kitaplari/elaz%C4%B1%C4%9F%20efsaneleri.pdf' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kale', 'Harput Kalesi', 'Kale', [0, 31], [0, HILL.top + 9.5, WALL.r + 1],
    'Kalenin Urartular döneminde kurulduğu anlatılır; tarihlemesi kaynaklarda farklı verilir. Sarp bir kayalığın üstünde, ovaya hâkim bir yerde yükselir. (Surların biçimi temsilîdir.)', SRC.kultur, 3.8),
  mk('zindan', 'Belek Gazi\'nin esirleri', 'Zindan', [-10, -8], [-10, HILL.top + 1.5, -12],
    'Artuklu beyi Belek Gazi, 1122\'de Franklarla yaptığı savaşta Urfa kontunu ve Birecik senyörünü şövalyeleriyle birlikte esir aldı; esirler Harput Kalesi\'nin zindanına konuldu. (Zindanın yeri temsilîdir.)', SRC.belek),
  mk('ulucami', 'Ulu Camii', 'Artuklu', [-14, 48], [-14, terrainAt(-14, 52) + 7, 52],
    'Harput Ulu Camii\'ni Artuklu Fahreddin Karaaslan 1156–1157\'de yaptırdı. Anadolu\'nun en eski camilerinden biri sayılır.', SRC.kure),
  mk('egri', 'Eğri minare', 'Minare', [3, 72], [-2, terrainAt(-2, 66) + 20, 66],
    'Ulu Camii\'nin tuğla minaresi eğiktir; eğimi kaynaklarda 3 ile 7 derece arasında farklı verilir. Yüzyıllardır depremlere karşın ayakta durur. (Oyundaki eğim temsilîdir.)', SRC.ntv),
];
function terrainAt(x: number, z: number) { return terrain(x, z); }
export const CARD_SUT = { id: 'sut', name: 'Süt Kalesi', kicker: 'Efsane',
  text: 'Anlatıya göre kale yapılırken bölgede kuraklık vardı; su yetmeyince harca su yerine çevredeki hayvanların sütü katıldı. Kaleye bu yüzden "Süt Kalesi" denir. Bu bir efsanedir; gediği sen de sütle karılmış harçla ördün.', source: SRC.kultur };
export const START: { at: V2; yaw: number } = { at: [0, 80], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
