/**
 * Rákóczi Müzesi (Tekirdağ) — "Rodosto'daki Sürgün": 18. yüzyıl ahşap konağın zemin katı (büstlü salon, Mikes'in çalışma odası, merdiven), avlu bahçesi ve
 * 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Oyun yalnızca ZEMİN KATI ve bahçeyi gezdirir; bodrum ve üst kat (portreler, porselen) durak metinleriyle anlatılır. Ölçüler, oda düzeni ve vitrinler
 * TEMSİLÎDİR (docs/RAKOCZI.md). Eksenler: +z güney (bahçe ve giriş), −z kuzey.
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Konağın dış sınırı ve duvar kalınlığı; iç mekân */
export const HOUSE: Rect = { x0: -11, x1: 11, z0: -8, z1: 8 };
export const WALL_T = 0.8;
export const ENTRY = { x0: 0.2, x1: 3.2 };
/** Mikes'in çalışma odasını ayıran bölme duvarı (x = −4) ve kapısı */
export const PARTITION_X = -4;
export const PARTITION_DOOR = { z0: -1.2, z1: 1.2 };
/** Salondaki büst kaidesi, vitrinler ve merdiven bloğu (yürünmez) */
export const PEDESTAL = { c: [4, -2.6] as V2, r: 1 };
export const CASES: Rect[] = [{ x0: 0, x1: 3, z0: -7.2, z1: -6 }, { x0: 5, x1: 8, z0: -7.2, z1: -6 }, { x0: 9.4, x1: 10.2, z0: -4, z1: -0.5 }];
export const STAIRS: Rect = { x0: 8.4, x1: 10.4, z0: 3, z1: 7.4 };
export const DESK: Rect = { x0: -9.6, x1: -7.2, z0: -6.6, z1: -4.6 };
/** Avlu bahçesi: çit, kapı ve çeşme (yürünmez) */
export const YARD: Rect = { x0: -30, x1: 30, z0: 8.8, z1: 42 };
export const FOUNTAIN = { c: [-10, 24] as V2, r: 1.8 };
export const TREES: V2[] = [[14, 20], [20, 30], [-20, 34], [-24, 16]];
export const FLOOR_H = 0.2;

const outer: Rect = { x0: HOUSE.x0 - WALL_T, x1: HOUSE.x1 + WALL_T, z0: HOUSE.z0 - WALL_T, z1: HOUSE.z1 + WALL_T };
export function groundY(x: number, z: number): number { return inR(outer, x, z) ? FLOOR_H : 0; }
export function walkable(x: number, z: number): boolean {
  if (inR(outer, x, z)) {
    if (inR(HOUSE, x, z, 0.3)) {
      if (Math.abs(x - PARTITION_X) < 0.4 && !(z > PARTITION_DOOR.z0 && z < PARTITION_DOOR.z1)) return false;
      if (Math.hypot(x - PEDESTAL.c[0], z - PEDESTAL.c[1]) < PEDESTAL.r + 0.4) return false;
      if (CASES.some((c) => inR(c, x, z, -0.3)) || inR(STAIRS, x, z, -0.3) || inR(DESK, x, z, -0.3)) return false;
      return true;
    }
    return z > HOUSE.z1 - 0.4 && z < outer.z1 + 0.3 && x > ENTRY.x0 && x < ENTRY.x1;   // giriş kapısı
  }
  if (!inR({ x0: -34, x1: 34, z0: -30, z1: 46 }, x, z, 0.4)) return false;
  if (Math.hypot(x - FOUNTAIN.c[0], z - FOUNTAIN.c[1]) < FOUNTAIN.r + 0.5) return false;
  if (TREES.some((t) => Math.hypot(x - t[0], z - t[1]) < 1.1)) return false;
  return true;
}
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
  wiki: { title: 'Wikipedia — Rákóczi Museum, Tekirdağ', url: 'https://en.wikipedia.org/wiki/R%C3%A1k%C3%B3czi_Museum,_Tekirda%C4%9F' },
  rodosto: { title: 'rodosto.hu — Rodosto (Macar Ulusal Müzesi)', url: 'https://rodosto.hu/en/rodosto.html' },
  mnm: { title: 'Macar Ulusal Müzesi — Rákóczi Evi', url: 'https://mnm.hu/en/node/1809' },
  sabah: { title: 'Daily Sabah — Rakoczi Museum, symbol of Turkish-Hungarian friendship', url: 'https://www.dailysabah.com/arts-culture/2018/05/19/rakoczi-museum-symbol-of-turkish-hungarian-friendship' },
  kosice: { title: 'Visit Košice — Rodosto', url: 'https://visitkosice.org/en/vidiet-a-zazit/rodosto' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('ferenc', 'II. Ferenc Rákóczi', 'Kişi', [0, 24], gy(0, 24, 7),
    'Macar prensi II. Ferenc Rákóczi, 1720\'den 1735\'e kadar sürgün olarak Tekirdağ\'da (o zamanki adıyla Rodosto) yaşadı. Kaynaklardan biri, Sultan III. Ahmed\'in ona bir ev verdiğini aktarır.', SRC.wiki, 6),
  mk('ev', 'Ahşap konak', 'Mimari', [-4, 13], gy(-4, 13, 6),
    'Müze, 18. yüzyıldan kalma ahşap bir evde yer alır; Osmanlı konut mimarisinin tipik bir örneğidir. Oyundaki ölçüler ve oda düzeni temsilîdir.', SRC.wiki, 5),
  mk('buste', 'Bronz büst', 'Zemin kat', [4, -0.2], gy(4, -0.2, 3.4),
    'Zemin katta Rákóczi\'nin bir bronz büstü sergilenir. Oyundaki büstün biçimi temsilîdir.', SRC.wiki, 4.4),
  mk('mikes', 'Kelemen Mikes', 'Çalışma odası', [-7.6, -2.4], gy(-7.6, -2.4, 3.4),
    'Rákóczi\'nin yaveri (şambelanı) Kelemen Mikes\'in bir büstü bodrumda, çalışma odası ise gezilebilir bölümdedir. Oyun yalnızca zemin katı gösterdiği için oda ve büst burada temsilî olarak gösterilir.', SRC.wiki, 3.6),
  mk('ust', 'Üst katın koleksiyonu', 'Birinci kat', [6.4, 3], gy(6.4, 3, 3.6),
    'Birinci katta Rákóczi\'nin annesinin yağlıboya portreleri ve Macaristan\'dan gelen porselen ve seramik eşyalar sergilenir. Oyunda üst kata çıkılamaz; merdiven yalnızca temsilîdir.', SRC.wiki, 4),
  mk('muze', 'Macar–Türk dostluğu', 'Müze', [-14, 20], gy(-14, 20, 6),
    'Ev Macar devletine devredilerek müzeye dönüştürüldü. Açılış yılı kaynaklarda farklıdır: Wikipedia 25 Eylül 1982, Macar müzesinin kendi sitesi ise 1986 der. Slovakya\'daki Košice\'de bu yapının bir replikası bulunur.', SRC.rodosto, 5),
];
export const START: { at: V2; yaw: number } = { at: [0, 40], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -38, x1: 38, z0: -34, z1: 50 };
export { inR };
