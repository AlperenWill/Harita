/**
 * Karabük — Safranbolu: "Dönme Dolap" (detaylı). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Çarşı meydanı (0,0); kuzeyde Cinci Hanı (kapıdan avluya ve revaklara girilir); meydandan güneye
 * kıvrılarak yükselen dar sokak, iki yanında çıkmalı evler; sokağın ucunda Kaymakamlar Evi. Ev iki katlıdır: taşlıktan merdivenle üst
 * kattaki sofaya çıkılır; sofanın güneyinde harem (batı) ve selamlık (doğu) odaları, aralarındaki duvarda dönme dolap.
 * Yürüme iki katlıdır: her konum (x, z, kat) ile çözülür. Ölçüler ve düzen TEMSİLÎDİR.
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -40, x1: 40, z0: -60, z1: 110 };
export const SQUARE = { x0: -22, x1: 22, z0: -13, z1: 12 };
/** Cinci Hanı: dış ölçüler, kapı geçidi, revaklı halka, açık avlu */
export const HAN = { x0: -19, x1: 19, z0: -54, z1: -13, gate: 2.2, ring: { x0: -12.5, x1: 12.5, z0: -46.5, z1: -20.5 }, court: { x0: -9, x1: 9, z0: -43, z1: -24 }, h1: 4.6, h2: 9 };
/** Yokuş sokak: kıvrılan orta çizgi, genişlik, eğim */
export const STREET = { z0: 12, z1: 72, w: 5.2, rise: 0.1 };
export const streetX = (z: number) => 4.5 * Math.sin((z - STREET.z0) / 13);
export const streetY = (z: number) => Math.max(0, Math.min(STREET.z1, z) - STREET.z0) * STREET.rise;
export const PLAZA = { x0: -9, x1: 9, z0: 72, z1: 81 };
export const HOUSE_Y = streetY(STREET.z1);
/** Kaymakamlar Evi: zemin (taşlık) ve üst kat; merdiven doğu duvarı boyunca güneyden kuzeye yükselir */
export const KH = { x0: -7, x1: 7, z0: 81, z1: 95, door: 1.2, up: HOUSE_Y + 3.3, stair: { x0: 4.9, x1: 6.9, z0: 85.6, z1: 93.6 } };
export const SOFA = { z0: 81, z1: 85 };
export const ROOMS = { harem: { x0: -7, x1: 0, z0: 85, z1: 95 }, selamlik: { x0: 0, x1: 4.9, z0: 85, z1: 95 } };
export const DOOR_HAREM: V2 = [-3.5, 85], DOOR_SELAMLIK: V2 = [2.4, 85];
export const DOLAP: V2 = [0, 90];
export const DOLAP_AT: V2 = [-1.2, 90];
export const atDolap = (x: number, z: number, up: boolean) => up && Math.hypot(x - DOLAP_AT[0], z - DOLAP_AT[1]) < 1.6;

const inR = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }, p: number) => x > r.x0 + p && x < r.x1 - p && z > r.z0 + p && z < r.z1 - p;
/** Merdivenin yüksekliği (güneyde taşlık seviyesi, kuzeyde üst kat) */
export const stairY = (z: number) => HOUSE_Y + (KH.up - HOUSE_Y) * Math.max(0, Math.min(1, (KH.stair.z1 - z) / (KH.stair.z1 - KH.stair.z0)));
export const onStair = (x: number, z: number, p = 0.3) => x > KH.stair.x0 + p && x < KH.stair.x1 - p && z > KH.stair.z0 - 1.2 && z < KH.stair.z1 + 0.6;   // üst uçta sofaya biner
/** Kat: false zemin, true üst kat */
export function walkable(x: number, z: number, up: boolean): boolean {
  const p = 0.35;
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (up) {
    if (onStair(x, z)) return true;
    if (inR(x, z, { x0: KH.x0, x1: KH.x1, z0: SOFA.z0 - 0.6, z1: SOFA.z1 }, p)) return true;   // sofa (cumba ile öne taşar)
    const wallZ = SOFA.z1, nearWall = Math.abs(z - wallZ) < p + 0.1;
    if (nearWall) return Math.abs(x - DOOR_HAREM[0]) < 0.6 || Math.abs(x - DOOR_SELAMLIK[0]) < 0.6;
    if (inR(x, z, ROOMS.harem, p)) return true;
    if (inR(x, z, ROOMS.selamlik, p)) return true;
    return false;
  }
  if (onStair(x, z) && z > KH.stair.z0 - 0.2) return true;
  // ev: kapı ve taşlık
  if (z > KH.z0 - 0.4 && z < KH.z1 && x > KH.x0 && x < KH.x1) {
    if (z < KH.z0 + 0.5) return Math.abs(x) < KH.door - p;
    return inR(x, z, { x0: KH.x0, x1: KH.stair.x0, z0: KH.z0, z1: KH.z1 }, p) || inR(x, z, { x0: KH.stair.x0 - 1, x1: KH.x1, z0: KH.stair.z1 - 0.2, z1: KH.z1 }, p);
  }
  if (inR(x, z, PLAZA, -0.01) && z < KH.z0 - 0.3) return true;
  if (z >= STREET.z0 && z <= STREET.z1 + 0.5) return Math.abs(x - streetX(z)) < STREET.w / 2 - p;
  if (inR(x, z, SQUARE, p) || (z >= SQUARE.z1 - 0.5 && z < STREET.z0 + 0.5 && Math.abs(x - streetX(z)) < STREET.w / 2 - p)) return true;
  // han: kapı geçidi, revak halkası ve avlu
  if (z < HAN.z1 + 0.5 && z > HAN.ring.z1 - 0.5) return Math.abs(x) < HAN.gate - p;
  if (inR(x, z, HAN.ring, p)) return true;
  return false;
}
export function groundY(x: number, z: number, up: boolean): number {
  if (onStair(x, z, 0) && (up || z > KH.stair.z0)) return stairY(z);
  if (up) return KH.up;
  if (z > KH.z0 - 0.4 || inR(x, z, PLAZA, -0.01)) return HOUSE_Y;
  if (z >= STREET.z0) return streetY(z);
  return 0;
}
/** Kat değişimi: merdivenin üst ucunda üst kata, alt ucunda zemine geçilir */
export function levelAfter(x: number, z: number, up: boolean): boolean { if (!onStair(x, z, 0)) return up; const y = stairY(z); return y > (HOUSE_Y + KH.up) / 2; }
export function slide(p: V2, dx: number, dz: number, up: boolean): { at: V2; up: boolean } {
  let [x, z] = p; const y0 = groundY(x, z, up);
  if (walkable(x + dx, z, up) && Math.abs(groundY(x + dx, z, up) - y0) < 0.6) x += dx;
  const y1 = groundY(x, z, up); if (walkable(x, z + dz, up) && Math.abs(groundY(x, z + dz, up) - y1) < 0.6) z += dz;
  return { at: [x, z], up: levelAfter(x, z, up) };
}

/* ===================== dönme dolap ===================== */
export const ITEMS = [
  { id: 'kahve', name: 'Türk kahvesi', icon: '☕' },
  { id: 'su', name: 'Su', icon: '💧' },
  { id: 'lokum', name: 'Lokum', icon: '🍬' },
  { id: 'serbet', name: 'Şerbet', icon: '🍹' },
] as const;
export type ItemId = (typeof ITEMS)[number]['id'];
export const SHELVES = 3;
export const ROUNDS: { text: string; want: ItemId[] }[] = [
  { text: 'Selamlığa iki misafir geldi: iki kahve istiyorlar.', want: ['kahve', 'kahve'] },
  { text: 'Kahvenin yanına su ve lokum istendi.', want: ['su', 'lokum'] },
  { text: 'Misafirler kalkarken birer şerbet ve bir lokum daha.', want: ['serbet', 'serbet', 'lokum'] },
];
/** Raflardaki ikram istenenle aynı mı (sıra önemsiz, boş raf sayılmaz) */
export function trayOk(shelves: (ItemId | null)[], want: ItemId[]): boolean {
  const a = shelves.filter((s): s is ItemId => !!s).sort(), b = [...want].sort();
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; up?: boolean; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  unesco: { title: 'UNESCO — City of Safranbolu', url: 'https://whc.unesco.org/en/list/614' },
  cinci: { title: 'TDV İslâm Ansiklopedisi — Cinci Hanı', url: 'https://islamansiklopedisi.org.tr/cinci-hani' },
  kure: { title: 'Küre Ansiklopedisi — Safranbolu Evleri', url: 'https://kureansiklopedi.com/tr/detay/safranbolu-evleri-a30ba' },
  ktb: { title: 'T.C. Kültür ve Turizm Bakanlığı — Safranbolu Houses', url: 'https://ktb.gov.tr/EN-113772/safranbolu-houses.html' },
  dp: { title: 'DergiPark — Safranbolu evleri üzerine makale', url: 'https://dergipark.org.tr/en/download/article-file/175466' },
  lp: { title: 'Lonely Planet — Kaymakamlar Museum', url: 'https://www.lonelyplanet.com/turkey/safranbolu/attractions/kaymakamlar-muze-evi/a/poi-sig/1263253/360884' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, up = false, reach = 3): Spot => ({ id, name, kicker, at, up, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('unesco', 'Kervan yolu kenti', 'UNESCO', [6, -4], [8, 2.2, -6],
    'Safranbolu 1994\'te UNESCO Dünya Mirası Listesi\'ne alındı. Kent yüzyıllar boyunca kervan ticaretindeki önemli yeri sayesinde zenginleşti; kervan ticaretinin sona ermesi kenti derinden etkiledi.', SRC.unesco, false, 3.4),
  mk('cinci', 'Cinci Hanı', 'Han', [0, -33.5], [0, 2.6, -33.5],
    'Hanın kitabesi yoktur; bu yüzden tarihi ve yaptıranı kesin bilinmez. Sultan İbrahim döneminin Anadolu kazaskeri Cinci Hoca\'nın 1645 dolaylarında yaptırdığı kabul edilir. Bugün otel olarak kullanılır. (Oyundaki ölçüler temsilîdir.)', SRC.cinci, false, 4),
  mk('evler', 'Çıkmalı evler', 'Sokak', [streetX(30), 30], [streetX(30) + 2.6, streetY(30) + 4.2, 30],
    'Safranbolu evleri genellikle iki ya da üç katlı ve çok odalıdır; geniş aileler için yapılmıştır. Planın merkezinde odaların açıldığı sofa (hayat) bulunur. Evler 18. ve 19. yüzyıl yaşamını yansıtır.', SRC.kure),
  mk('yazkis', 'Yaz evi, kış evi', 'Bağlar', [streetX(55), 55], [streetX(55) - 2.6, streetY(55) + 3.6, 55],
    'Safranboluluların çoğunun hem kışlık hem yazlık evi vardı: kışı çarşıdaki evlerde geçirip yazın Bağlar\'daki yazlık evlere taşınırlardı. Çarşıdaki üretim ve ticaret yaz boyunca da sürerdi.', SRC.dp),
  mk('kaymakamlar', 'Kaymakamlar Evi', 'Müze ev', [0, 79], [0, HOUSE_Y + 3.2, 80.6],
    'Ev 19. yüzyılın başından kalmadır ve uzun süredir müze ev olarak gezilir. Harem (kadınlar) ve selamlık (erkekler) bölümlerine ayrılır; iki bölüm arasında yiyeceklerin görünmeden geçirildiği dönme dolap vardır. (Oda düzeni temsilîdir.)', SRC.lp),
  mk('gusul', 'Yüklük ve gusülhane', 'Oda', [-5.2, 93], [-6.4, KH.up + 1.6, 93.4],
    'Odalardaki ahşap dolapların (yüklük) içinde, bugünün duş kabinlerine benzeyen gusülhaneler bulunur. Yatak takımları da gündüz yüklükte saklanırdı.', SRC.dp, true, 2.2),
  mk('tavan', 'Sedir ve tavan göbeği', 'Başoda', [2.6, 88], [2.45, KH.up + 3, 89.5],
    'Sedirler pencerelerin önüne, pencere düzenine göre yerleştirilir. Düz ahşap tavanların ortasına süslü bir göbek yapılır; başodaların tavanları daha süslüdür.', SRC.dp, true, 2.4),
];
export const CARD_DOLAP = { id: 'dolap', name: 'Dönme dolap', kicker: 'Harem · Selamlık',
  text: 'Dönme dolap, harem ile selamlık arasındaki duvara yerleştirilmiş, kendi ekseninde dönen raflı bir dolaptır. Haremde hazırlanan ikram, iki taraf birbirini görmeden selamlığa geçirilirdi. (İkram çeşitleri temsilîdir.)', source: SRC.lp };
export const START: { at: V2; yaw: number } = { at: [4, 8], yaw: 0.5 };
export function nearestSpot(x: number, z: number, up: boolean): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { if (!!s.up !== up) continue; const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
