/**
 * Bitlis — Ahlat Selçuklu Meydan Mezarlığı: "Taştaki İmza" (detaylı). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney (Van Gölü güneydoğuda). Mezarlık bir ızgara üstünde: her hücrede bir mezar olabilir (baş ve ayak şahidesi,
 * aralarında sanduka). Ortada ve aralıklarla yürüme yolları. Doğuda Ulu Kümbet, batıda Bayındır Kümbeti.
 *
 * Mekanik: "Motif defteri" — dört süslü şahidenin motifini (ejder, palmet, kandil, geometrik geçme) kâğıda çıkar. Her şahidede ustasının
 * imzası (kitabe) da vardır; sonunda defterdeki imzaları karşılaştır, aynı ustanın iki taşını bul. Ölçüler, motif çizimleri ve
 * imzalar TEMSİLÎDİR (docs/AHLAT.md).
 */
export type V2 = [number, number];
export const CELL = { w: 4, d: 3.2 };
export const FIELD = { x0: -84, x1: 84, z0: -60, z1: 60 };
export const GRAVE = { len: 2.6, wid: 0.9 };
function hash(i: number, j: number) { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
const ci = (x: number) => Math.floor((x - FIELD.x0) / CELL.w), cj = (z: number) => Math.floor((z - FIELD.z0) / CELL.d);
export const NI = Math.floor((FIELD.x1 - FIELD.x0) / CELL.w), NJ = Math.floor((FIELD.z1 - FIELD.z0) / CELL.d);
/** Yol hücreleri: her 6. sütun, her 7. sıra, ortadaki ana yollar */
const isPath = (i: number, j: number) => i % 6 === 3 || j % 7 === 3 || i === Math.floor(NI / 2) || j === Math.floor(NJ / 2);
/** Hücrede mezar var mı (deterministik), özel şahideler her zaman */
export function hasGrave(i: number, j: number): boolean { if (i < 0 || j < 0 || i >= NI || j >= NJ) return false; if (SPECIAL_CELLS.some(([a, b]) => a === i && b === j)) return true; if (SPECIAL_CELLS.some(([a, b]) => a === i + 1 && b === j)) return false; if (isPath(i, j)) return false; return hash(i, j) < 0.62; }
/** Hücredeki mezarın merkezi ve hafif dönüşü/boyu */
export function graveAt(i: number, j: number) { const cx = FIELD.x0 + (i + 0.5) * CELL.w, cz = FIELD.z0 + (j + 0.5) * CELL.d, r = hash(i + 101, j + 37); return { x: cx + (r - 0.5) * 0.5, z: cz + (hash(i, j + 9) - 0.5) * 0.4, tilt: (hash(i + 7, j) - 0.5) * 0.08, h: 1.4 + hash(i + 3, j + 5) ** 2 * 2.6 }; }

/* ===================== süslü şahideler ===================== */
export type Motif = 'ejder' | 'palmet' | 'kandil' | 'geometrik';
export interface Stele { id: Motif; cell: [number, number]; usta: number; name: string; text: string }
/** Usta imzası işaretleri (temsilî): 0 ve 3 aynı ustanın */
export const USTA = ['ustaA', 'ustaB', 'ustaC'];
export const STELES: Stele[] = [
  { id: 'ejder', cell: [9, 8], usta: 0, name: 'Ejder', text: 'Ahlat şahidelerinde ejder figürleri de görülür; bunlar Anadolu\'daki ejderli mezar taşlarının erken örnekleri arasında sayılır. (Çizim temsilîdir.)' },
  { id: 'palmet', cell: [30, 26], usta: 1, name: 'Palmet', text: 'Yaprak biçimli palmet, Ahlat mezar taşlarında ejder, kandil ve geometrik desenlerle birlikte görülen motiflerdendir. (Çizim ve yeri temsilîdir.)' },
  { id: 'kandil', cell: [20, 31], usta: 2, name: 'Kandil', text: 'Bazı şahidelerde kemerli bir niş içinde asılı kandil işlenir. Kandil, Ahlat taşlarında sayılan motiflerdendir. (Çizim ve yeri temsilîdir.)' },
  { id: 'geometrik', cell: [34, 10], usta: 0, name: 'Geometrik geçme', text: 'Birbirine geçen çizgilerle kurulan geometrik desenler de Ahlat şahidelerini süsler. (Çizim ve yeri temsilîdir.)' },
];
export const SPECIAL_CELLS: [number, number][] = STELES.map((s) => s.cell);
export const steleFront = (s: Stele): V2 => { const g = graveAt(...s.cell); return [g.x - GRAVE.len / 2 - 0.9, g.z]; };
export const RUB_REACH = 1.5;
export function nearestStele(x: number, z: number, done: string[]): Stele | null { for (const s of STELES) { if (done.includes(s.id)) continue; const [fx, fz] = steleFront(s); if (Math.hypot(x - fx, z - fz) < RUB_REACH) return s; } return null; }
/** Aynı ustanın iki taşı */
export const USTA_PAIR = STELES.filter((s) => s.usta === 0).map((s) => s.id).sort();
export const pairOk = (a: string, b: string) => [a, b].sort().join() === USTA_PAIR.join();

/* ===================== kümbetler, göl ===================== */
export const ULU: V2 = [104, -24];
export const BAYINDIR: V2 = [-104, 20];
export const LAKE = { z: 150 };
export const BOUNDS = { x0: -130, x1: 130, z0: -80, z1: 110 };

/* ===================== yürüyüş ===================== */
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (Math.hypot(x - ULU[0], z - ULU[1]) < 5.6) return false;
  if (Math.abs(x - BAYINDIR[0]) < 5.4 && Math.abs(z - BAYINDIR[1]) < 5.4) return false;
  if (x > FIELD.x0 && x < FIELD.x1 && z > FIELD.z0 && z < FIELD.z1) {
    const i = ci(x), j = cj(z);
    for (const [a, b] of [[i, j], [i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) { if (!hasGrave(a, b)) continue; const g = graveAt(a, b); if (Math.abs(x - g.x) < GRAVE.len / 2 + 0.35 && Math.abs(z - g.z) < GRAVE.wid / 2 + 0.35) return false; }
  }
  return true;
}
export const groundY = (x: number, z: number) => Math.sin(x * 0.02) * 0.6 + Math.sin(z * 0.03 + 1) * 0.5 + (z > 80 ? -(z - 80) * 0.05 : 0);
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  ntv: { title: 'NTV — "Anadolu\'nun Orhun Abideleri": 8 binden fazla mezar taşı', url: 'https://www.ntv.com.tr/yerel-haberler/galeri-anadolunun-orhun-abideleri-olarak-biliniyor-8-binden-fazla-mezar-tasi-var-1708282' },
  wh: { title: 'World Heritage Site — The Tombstones of Ahlat (Geçici Liste)', url: 'https://www.worldheritagesite.org/tentative/id/1401' },
  dp: { title: 'DergiPark — Ahlat Selçuklu Meydan Mezarlığı üzerine makale', url: 'https://dergipark.org.tr/tr/download/article-file/2694652' },
  dpUsta: { title: 'DergiPark — Ahlat mezar taşlarında sanatkâr kitabeleri', url: 'https://dergipark.org.tr/en/download/article-file/2694687' },
  goturkiye: { title: 'GoTürkiye — Ahlat', url: 'https://goturkiye.com/sustainable-destinations/ahlat' },
  wayfaring: { title: 'Art of Wayfaring — The Seljuk graves and tombs of Ahlat', url: 'https://artofwayfaring.com/destinations/the-seljuk-graves-and-tombs-of-ahlat/' },
  kazi: { title: 'Cumhuriyet — Selçuklu Meydan Mezarlığı\'ndaki kazılarda 41 yeni mezar', url: 'https://www.cumhuriyet.com.tr/turkiye/selcuklu-meydan-mezarligindaki-kazilarda-41-yeni-mezar-gun-yuzune-cikarildi-1970419' },
  yyu: { title: 'Van Yüzüncü Yıl Üniversitesi — Ahlat Meydan Mezarlığı\'nda ejder figürlü mezar taşları', url: 'https://gcris.yyu.edu.tr/items/45a2dd15-2ef6-4d54-b3bc-018d327c733b' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const midX = FIELD.x0 + (Math.floor(NI / 2) + 0.5) * CELL.w, midZ = FIELD.z0 + (Math.floor(NJ / 2) + 0.5) * CELL.d;
export const SPOTS: Spot[] = [
  mk('mezarlik', 'Meydan Mezarlığı', 'Mezarlık', [midX, FIELD.z1 + 6], [midX, 3, FIELD.z1 + 1],
    'Yaklaşık 210 dönümlük alanda 8.000\'i aşkın mezar taşı bulunur; bu yüzden "Anadolu\'nun Orhun Abideleri" diye de anılır. Mezarlık UNESCO Dünya Mirası Geçici Listesi\'ndedir.', SRC.ntv, 4.5),
  mk('sahide', 'Şahide ve sanduka', 'Mezar taşı', [midX + 1, 6], [midX - 2.5, 4.2, 6.6],
    'Mezarların başında ve ayağında dikilen yüksek taşlara şahide denir; boyları 4 metreye ulaşabilir. Aradaki uzun taş, sandukadır. Taşlar 12. yüzyıldan 16. yüzyılın ortalarına kadar uzanır.', SRC.dp),
  mk('donemler', 'Beş yüz yıl, birçok devlet', 'Tarih', [midX, -30], [midX - 2.5, 3.6, -30],
    'Mezarlıkta Ahlatşahlar\'ın yanı sıra Eyyubi, İlhanlı, Karakoyunlu, Akkoyunlu ve Osmanlı dönemlerine ait mezarlar vardır. Kitabeler, Ahlat\'ın yüzyıllar boyunca kimlerin elinde olduğunu taşa yazar.', SRC.dpUsta),
  mk('kazi', 'Kazı sürüyor', 'Bugün', [-50, midZ], [-50, 2.4, midZ - 2],
    'Mezarlıkta kazı ve onarım sürüyor: 2022\'deki bir kazıda 41 yeni mezar gün yüzüne çıktı; bir başka sezonda onarılan 310 taşın 108\'inin yeni bulunan mezarlara ait olduğu bildirildi.', SRC.kazi),
  mk('ulu', 'Ulu Kümbet', 'Kümbet', [ULU[0] - 9, ULU[1]], [ULU[0], 22, ULU[1]],
    'Ahlat\'ın en büyük Selçuklu kümbeti olarak anılır. Silindirik gövdesi ve konik külahıyla mezarlığın doğusunda yükselir. (Ölçüler temsilîdir.)', SRC.goturkiye, 4.5),
  mk('bayindir', 'Bayındır Kümbeti', 'Kümbet', [BAYINDIR[0] + 9, BAYINDIR[1]], [BAYINDIR[0], 9, BAYINDIR[1]],
    'Akkoyunlu beyi Emir Bayındır için yapılan kümbet 1477 ya da 1481 tarihiyle anılır; kaynaklar farklı yıl verir. Güney yanında düz duvar yerine mukarnas başlıklı sütunlarla açılan bir namaz bölümü ve mihrap bulunur.', SRC.wayfaring, 4.5),
];
export const MOTIF_CARD = (s: Stele) => ({ id: `motif-${s.id}`, name: `Motif: ${s.name}`, kicker: 'Motif defteri', text: s.text, source: s.id === 'ejder' ? SRC.yyu : SRC.dp });
export const CARD_USTA = { id: 'usta', name: 'Ustanın imzası', kicker: 'Sanatkâr kitabesi',
  text: 'Ahlat mezar taşlarının yaklaşık 500\'ünde taşı işleyen ustanın adı yazılıdır; araştırmacılar aynı ustanın birden çok eserini de tespit etmiştir. Defterindeki iki imzayı eşleştirerek aynı ustanın iki taşını buldun. (Oyundaki imzalar temsilîdir.)', source: SRC.dpUsta };
export const START: { at: V2; yaw: number } = { at: [midX, FIELD.z1 + 14], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export { ci, cj };
