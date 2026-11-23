/**
 * Zeugma Mozaik Müzesi (Gaziantep) — "Mozaiklerin Evi": müze binası (giriş holü, büyük mozaik salonu, karanlık salon), dışarıda meydan
 * ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (meydan, giriş), −z kuzey (mozaik salonu, karanlık salon). Oyuncu meydandan girişe yürür, holden salona geçer,
 * vitrinlerin arasında dolaşır, karanlık salona kapıdan girer. Ölçüler, salon düzeni ve vitrinler TEMSİLÎDİR (docs/ZEUGMA.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

export const FLOOR = 0.2;
/** Müze binasının dış sınırı ve duvar kalınlığı */
export const BUILD = { x0: -22, x1: 22, z0: -14, z1: 14 };
export const WALL_T = 0.7;
/** İç bölümler: giriş holü, büyük mozaik salonu, karanlık salon (kuzeydoğu) */
export const ROOMS = {
  hol: { x0: -20, x1: 20, z0: 6.7, z1: 12.8 },
  salon: { x0: -20, x1: 20, z0: -6.7, z1: 6.3 },
  karanlik: { x0: 7.5, x1: 20, z0: -12.8, z1: -6.7 },
};
/** Hol-salon arası kapı (orta) ve karanlık salon kapısı (salonun kuzeydoğusu) */
export const HOL_DOOR = { x0: -2.5, x1: 2.5 };
export const DARK_DOOR = { x0: 11.5, x1: 15.5 };
/** Vitrinler (yürünmez): sabit taş kaideler */
export const CASES: { x0: number; x1: number; z0: number; z1: number }[] = [
  { x0: -14, x1: -10, z0: -2.6, z1: 0.6 },
  { x0: -6, x1: -2, z0: 1.6, z1: 4.6 },
  { x0: 2, x1: 6, z0: -4.6, z1: -1.6 },
];
/** Dış meydan (yürünebilir) */
export const SQUARE = { x0: -40, x1: 40, z0: -30, z1: 40 };
/** Karanlık salondaki ışıklı sahne (yürünmez) */
export const SPOTLIGHT = { x: 13.5, z: -9.6 };   // ortadaki sergi kaidesi (yürünmez)

const inBuildOpen = (x: number, z: number) => inR(BUILD, x, z, -WALL_T);
export function inside(x: number, z: number): boolean {
  const m = 0.3;
  if (inR(ROOMS.hol, x, z, m)) return true;
  if (z > ROOMS.hol.z1 - 0.6 && z < BUILD.z1 + WALL_T + 0.3 && x > HOL_DOOR.x0 && x < HOL_DOOR.x1) return true;   // giriş kapısı
  if (z > ROOMS.hol.z0 - 0.8 && z < ROOMS.hol.z0 + 0.6 && x > HOL_DOOR.x0 && x < HOL_DOOR.x1) return true;   // hol-salon kapısı
  if (inR(ROOMS.salon, x, z, m)) return !CASES.some((c) => inR(c, x, z, -0.2));
  if (z > ROOMS.salon.z0 - 0.6 && z < ROOMS.salon.z0 + 0.5 && x > DARK_DOOR.x0 && x < DARK_DOOR.x1) return true;   // karanlık salon kapısı
  if (inR(ROOMS.karanlik, x, z, m)) return Math.hypot(x - SPOTLIGHT.x, z - SPOTLIGHT.z) > 1.1;
  return false;
}
export function walkable(x: number, z: number): boolean {
  if (inBuildOpen(x, z)) return inside(x, z);
  return inR(SQUARE, x, z, 1);
}
export function groundY(x: number, z: number): number { return inBuildOpen(x, z) && inside(x, z) ? FLOOR : 0; }
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Zeugma Mosaic Museum', url: 'https://en.wikipedia.org/wiki/Zeugma_Mosaic_Museum' },
  ktb: { title: 'Gaziantep Kültür ve Turizm Müdürlüğü — Zeugma Mozaik Müzesi', url: 'https://gaziantep.ktb.gov.tr/EN-200730/zeugma-mosaic-museum.html' },
  daily: { title: 'Daily Sabah — Iconic Gypsy Girl welcomes visitors with missing pieces retrieved decades later', url: 'https://www.dailysabah.com/turkey/2018/12/08/iconic-gypsy-girl-welcomes-visitors-with-missing-pieces-retrieved-decades-later' },
  hurriyet: { title: 'Hürriyet Daily News — Zeugma Mosaic Museum breaks visitor record', url: 'https://www.hurriyetdailynews.com/zeugma-mosaic-museum-breaks-visitor-record-213468' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.8): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('bina', 'Müze binası', 'Mimari', [0, 9.4], [0, 4.6, 10.6],
    '2011\'de açılan müze, Fırat kıyısındaki Zeugma\'dan kurtarılan mozaikleri sergilemek için yapıldı. Mozaikler, kentin baraj planları nedeniyle sular altında kalma tehlikesiyle karşı karşıyaydı.', SRC.wiki),
  mk('kent', 'Zeugma kenti', 'Tarih', [-14, 2.8], [-12, 2.2, 2.6],
    'Zeugma, Fırat üzerinde kurulmuş antik bir kenttir. Kaynaklarda kurucusu olarak Seleukos I Nikator anılır ve Fırat üzerine ilk köprünün onun döneminde kurulduğu aktarılır. Kuruluş tarihi kaynaklarda farklı verilir.', SRC.wiki),
  mk('mozaik', 'Mozaik zemin', 'Yapım', [-2, -0.6], [0, 1.6, -0.6],
    'Mozaikler, küçük renkli taş parçalarının (tesserae) yan yana dizilmesiyle yapılır. Roma dönemi kent evlerinde zeminler sıkça mozaikle döşenirdi. Oyundaki desenler temsilîdir.', SRC.ktb),
  mk('cingene', '"Çingene Kız" mozaiği', 'Başyapıt', [13.5, -7.6], [13.5, 2.0, -9.6],
    'Yaklaşık MS 2. yüzyıla tarihlenen bu mozaik, Menad Evi\'nde bulundu. Adını, dağınık saçları ve iri gözleriyle dikkat çeken yüzünden alır. Kimin tasvir edildiği hâlâ tartışmalıdır.', SRC.ktb, 4.2),
  mk('iade', 'Kaçırılan parçalar', 'Geri dönüş', [16.5, -2.4], [17, 2.2, -3.4],
    'Mozaiğin parçaları 1960\'larda yurt dışına kaçırılmış ve satılmıştı. Bazı parçalar Amerika Birleşik Devletleri\'nden yıllar sonra geri getirildi; Daily Sabah 2018\'de bu iadeyi haber yaptı.', SRC.daily, 3.8),
];
export const START: { at: V2; yaw: number } = { at: [0, 26], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -44, x1: 44, z0: -34, z1: 44 };
