/**
 * Tokat — Yazmacılık: "Kalıp Bas" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Küçük bir yazma atölyesi: ortada baskı tezgâhı, duvarlarda ıhlamur kalıplar, iplerde kuruyan yazmalar. Tezgâhta örnek yazmaya
 * bakarak önce ahşap kalıplarla motiflerin çizgisini (kara) basar, sonra içlerini fırçayla boyarsın (kalıp-kalem tekniği).
 * Desen, renkler ve atölyenin düzeni TEMSİLÎDİR (docs/TOKAT.md).
 */
export type V2 = [number, number];
export const ROOM = { x0: -5, x1: 5, z0: -4, z1: 4, h: 3.2 };
export const BENCH = { x: 0, z: -1.2, w: 3, d: 1.7, h: 0.82 };
export const BENCH_AT: V2 = [0, BENCH.z + BENCH.d / 2 + 0.8];
export const SHELF_N = { z: ROOM.z0 + 0.45 }, SHELF_W = { x: ROOM.x0 + 0.45 };
export function walkable(x: number, z: number): boolean {
  const p = 0.35;
  if (x < ROOM.x0 + p || x > ROOM.x1 - p || z < ROOM.z0 + p || z > ROOM.z1 - p) return false;
  if (z < SHELF_N.z + 0.3 + p) return false;
  if (x < SHELF_W.x + 0.3 + p && z < 1.5) return false;
  if (Math.abs(x - BENCH.x) < BENCH.w / 2 + p && Math.abs(z - BENCH.z) < BENCH.d / 2 + p) return false;
  return true;
}
export const groundY = () => 0;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }
export const atBench = (x: number, z: number) => Math.hypot(x - BENCH_AT[0], z - BENCH_AT[1]) < 1.3;

/* ===================== baskı ===================== */
export const KALIPS = [
  { id: 'gul', name: 'Gül' },
  { id: 'yaprak', name: 'Yaprak' },
  { id: 'nar', name: 'Nar çiçeği' },
] as const;
export type KalipId = (typeof KALIPS)[number]['id'];
export const COLORS = [
  { id: 'kirmizi', name: 'Kırmızı', hex: '#b8322a' },
  { id: 'yesil', name: 'Yeşil', hex: '#3d7a3a' },
  { id: 'sari', name: 'Sarı', hex: '#d9a53a' },
  { id: 'lacivert', name: 'Lacivert', hex: '#2c3e6b' },
] as const;
export type ColorId = (typeof COLORS)[number]['id'];
/** Örnek yazma: 3×3 düzen; köşelerde gül, kenar ortalarında yaprak, ortada nar çiçeği */
export const TARGET: { k: KalipId; c: ColorId }[] = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
  const r = Math.floor(i / 3), c = i % 3, corner = r !== 1 && c !== 1, center = r === 1 && c === 1;
  return center ? { k: 'nar', c: 'kirmizi' } : corner ? { k: 'gul', c: 'kirmizi' } : { k: 'yaprak', c: 'yesil' };
});
export const MAX_MISTAKES = 3;
export type Cell = { k: KalipId | null; c: ColorId | null };
export const emptyCloth = (): Cell[] => TARGET.map(() => ({ k: null, c: null }));
export type Phase = 'kalip' | 'kalem' | 'bitti';
export function phaseOf(cloth: Cell[]): Phase {
  if (cloth.some((x) => !x.k)) return 'kalip';
  if (cloth.some((x) => !x.c)) return 'kalem';
  return 'bitti';
}
/** Bir hücreye işlem: kalıp basma ya da boyama. Sonuç: yeni kumaş ve hata olup olmadığı */
export function apply(cloth: Cell[], i: number, tool: { kalip?: KalipId; color?: ColorId }): { cloth: Cell[]; ok: boolean; reason?: 'dolu' | 'yanlis' | 'once-kalip' | 'once-hepsi' } {
  const cur = cloth[i], out = cloth.map((x) => ({ ...x }));
  if (tool.kalip) {
    if (cur.k) return { cloth, ok: false, reason: 'dolu' };
    if (tool.kalip !== TARGET[i].k) return { cloth, ok: false, reason: 'yanlis' };
    out[i].k = tool.kalip; return { cloth: out, ok: true };
  }
  if (tool.color) {
    if (!cur.k) return { cloth, ok: false, reason: 'once-kalip' };
    if (phaseOf(cloth) === 'kalip') return { cloth, ok: false, reason: 'once-hepsi' };
    if (cur.c) return { cloth, ok: false, reason: 'dolu' };
    if (tool.color !== TARGET[i].c) return { cloth, ok: false, reason: 'yanlis' };
    out[i].c = tool.color; return { cloth: out, ok: true };
  }
  return { cloth, ok: false };
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  hk: { title: 'Haber Kenti — Tokat yazması ıhlamur kalıplarla kuşaktan kuşağa aktarılıyor', url: 'https://www.haberkenti.com/tokat-yazmasi-ihlamur-kaliplarla-kusaktan-kusaga-aktariliyor' },
  dp1: { title: 'DergiPark — Tokat yazmacılığı üzerine makale', url: 'https://dergipark.org.tr/tr/download/article-file/2091817' },
  dp2: { title: 'DergiPark — Tokat yazmacılığı ve motifleri', url: 'https://dergipark.org.tr/en/download/article-file/4084582' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 1.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('ihlamur', 'Ihlamur kalıplar', 'Kalıp', [-2.6, -2.6], [-2.6, 1.8, ROOM.z0 + 0.5],
    'Kalıplar genellikle ıhlamur ağacından oyulur: yumuşaktır, kolay oyulur ve boyayı iyi tutar. Ağaç kesildikten sonra yaklaşık bir yıl kurutulur; bir kalıbın oyulması günler sürebilir.', SRC.hk, 1.9),
  mk('motif', 'Bitkisel motifler', 'Desen', [-3.4, 2.4], [-4.55, 1.9, 2.4],
    'Tokat yazmalarında doğadan esinlenen bitkisel motifler öne çıkar. Anlatılana göre her ilçenin kendine özgü desenleri vardır.', SRC.dp1),
  mk('tarih', 'Pamuklu ve boyahane', 'Tarih', [3.2, -2.2], [4.55, 1.8, -2.2],
    'Kaynaklara göre 15. yüzyılda Tokat\'ta pamuklu dokuma üretimi arttı; boyama ve baskı işleri de yaygınlaştı. Tokat, yazmacılıkta öncü kentlerden biri sayılır.', SRC.dp2),
];
export const CARD_YAZMA = { id: 'yazma', name: 'Kalıp-kalem', kicker: 'Yazma bitti',
  text: 'Önce ahşap kalıpla motifin çizgisini bastın, sonra içini fırçayla boyadın. Bu kalıp-kalem tekniğidir: desen kalıpla kumaşa geçirilir, içleri elle renklendirilir. (Oyundaki desen ve renkler temsilîdir.)', source: SRC.dp1 };
export const START: { at: V2; yaw: number } = { at: [0, 3.2], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
