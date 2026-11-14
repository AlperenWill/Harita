/**
 * Yerebatan Sarnıcı — yerleşim (saf; test edilir).
 * Kaynaklardaki ölçüler: ~138 × 64,6 m; 12 sıra × 28 = 336 sütun; sütunlar ~9 m; sütun aralığı ~4,8–4,9 m.
 * Koordinatlar (m): x uzun kenar (−x batı), z kısa kenar (−z kuzey); su yüzeyi y = 0.
 * Ziyaretçi yolu: sudan ~0,5 m yüksek ahşap platformlar; sütunların arasından geçer (bugünkü sarnıçtaki gibi
 * platform üzerinde yürünür — oyuncunun suya girmesi ya da sütuna çarpması mümkün değildir).
 */
export const SIZE = { len: 138, wid: 64.6 } as const;
export const GRID = { cols: 28, rows: 12, dx: 4.9, dz: 5 } as const;
export const COLUMN = { r: 0.42, bottom: -1.2, top: 8.0 } as const;   // gövde; başlık ve kaide ayrıca
export const CEILING_Y = 9.4;
export const DECK_Y = 0.5;
export const EYE = 1.62;

export const colX = (i: number) => -((GRID.cols - 1) * GRID.dx) / 2 + i * GRID.dx;
export const rowZ = (j: number) => -((GRID.rows - 1) * GRID.dz) / 2 + j * GRID.dz;
export const COLUMNS: [number, number][] = [];
for (let j = 0; j < GRID.rows; j++) for (let i = 0; i < GRID.cols; i++) COLUMNS.push([colX(i), rowZ(j)]);

export type Rect = { x0: number; x1: number; z0: number; z1: number };
const between = (a: number, b: number) => (a + b) / 2;
const W = 1.15;   // platform yarı genişliği
/** Platformlar: giriş (doğu) → orta koridor → batı uçta kuzeye dönen kol → Medusa köşesi; ortada bir kesişme */
export const WALKWAYS: Rect[] = (() => {
  const xEast = between(colX(26), colX(27)), xWest = between(colX(0), colX(1)), xMid = between(colX(13), colX(14));
  const zMain = between(rowZ(5), rowZ(6)), zNorth = between(rowZ(0), rowZ(1)), zSouth = between(rowZ(9), rowZ(10));
  return [
    { x0: xWest - W, x1: xEast + W, z0: zMain - W, z1: zMain + W },          // ana koridor
    { x0: xEast - W, x1: xEast + W, z0: zMain - W, z1: zSouth + W },          // girişten inen kol
    { x0: xWest - W, x1: xWest + W, z0: zNorth - W, z1: zMain + W },          // batı kolu (Medusa köşesine)
    { x0: xWest - W, x1: between(colX(5), colX(6)) + W, z0: zNorth - W, z1: zNorth + W },   // kuzey kolu
    { x0: xMid - W, x1: xMid + W, z0: zNorth - W, z1: zSouth + W },          // orta kesişme
  ];
})();
export const START = { x: between(colX(26), colX(27)), z: between(rowZ(9), rowZ(10)) - 0.5, yaw: 0 };   // giriş, kuzeye bakar

const inRect = (x: number, z: number, r: Rect, pad = 0) => x >= r.x0 + pad && x <= r.x1 - pad && z >= r.z0 + pad && z <= r.z1 - pad;
export const onWalkway = (x: number, z: number, pad = 0.25) => WALKWAYS.some((r) => inRect(x, z, r, pad));
/** Sütunlarla çarpışma (platformlar sütun aralığında olduğu için normalde gerekmez, yine de güvence) */
export function hitsColumn(x: number, z: number, r = 0.3): boolean {
  const i = Math.round((x - colX(0)) / GRID.dx), j = Math.round((z - rowZ(0)) / GRID.dz);
  if (i < 0 || i >= GRID.cols || j < 0 || j >= GRID.rows) return false;
  return Math.hypot(x - colX(i), z - rowZ(j)) < COLUMN.r + r;
}
export const walkable = (x: number, z: number) => onWalkway(x, z) && !hitsColumn(x, z);

/* ---------- ilgi noktaları ---------- */
export type PoiKind = 'medusa' | 'column' | 'info';
export interface Poi { id: string; kind: PoiKind; name: string; pos: [number, number, number]; radius: number; text: string; source: { title: string; url: string } }
const SRC = {
  unesco: { title: 'UNESCO — Historic Areas of Istanbul', url: 'https://whc.unesco.org/en/list/356/' },
  amusing: { title: 'Amusing Planet — The Incredible Basilica Cistern', url: 'https://www.amusingplanet.com/2016/03/the-incredible-basilica-cistern-of.html' },
  ibb: { title: 'İBB Atatürk Kitaplığı — Yerebatan Sarnıcı Müzesi', url: 'https://ataturkkitapligi.ibb.gov.tr/en/Kitaplik/Muzelerimiz/Yerebatan-Cistern-Museum/11' },
  archnet: { title: 'Archnet — Yerebatan Sarnıcı', url: 'https://archnet.org/sites/8249' },
  istanbul: { title: 'istanbul.com — Legend of Basilica Cistern', url: 'https://istanbul.com/en/city-life/legend-of-basilica-cistern' },
  national: { title: 'The National — Basilica Cistern reopens after restoration (2022)', url: 'https://www.thenationalnews.com/mena/2022/07/25/basilica-cistern-reopens-after-restoration-in-pictures-2' },
};
/** Medusa başları kuzeybatı köşede iki sütunun kaidesindedir: biri ters, biri yan yatık */
export const MEDUSA = [
  { id: 'medusa-ters', col: [0, 0] as [number, number], roll: Math.PI, name: 'Ters Medusa başı' },
  { id: 'medusa-yan', col: [0, 2] as [number, number], roll: Math.PI / 2, name: 'Yan yatık Medusa başı' },
];
export const MEDUSA_Y = -0.15;   // kaidenin su seviyesine yakın kısmı
export const POIS: Poi[] = [
  { id: 'giris', kind: 'info', name: 'Sarnıç: 532', pos: [START.x, DECK_Y + 1.6, START.z + 1.5], radius: 1.2,
    text: 'Yerebatan Sarnıcı, I. Justinianus döneminde 532’de kente su sağlamak için yapıldı. Yaklaşık 138 × 65 metrelik bu yer altı haznesinin yaklaşık 80.000 m³ su aldığı belirtilir.', source: SRC.amusing },
  { id: 'devsirme', kind: 'column', name: 'Devşirme sütunlar', pos: [colX(20), 3, rowZ(5)], radius: 0.9,
    text: '336 sütun 28’erli 12 sıra halinde dizilmiştir. Başlıkların farklı üsluplarda olması, birçoğunun başka yapılardan getirilip yeniden kullanıldığını (devşirme) düşündürür.', source: SRC.amusing },
  { id: 'tavus-gozu', kind: 'column', name: 'Tavus Gözü sütunu', pos: [colX(14), 2.2, rowZ(3)], radius: 0.9,
    text: 'Gövdesi göz ya da gözyaşı damlasını andıran kabartmalarla kaplı sütun. “Ağlayan sütun” diye de anılır; yüzeyinin hep ıslak görünmesi bu adı pekiştirir.', source: SRC.istanbul },
  { id: 'restorasyon', kind: 'info', name: 'Onarımlar', pos: [between(colX(13), colX(14)), 2, rowZ(9)], radius: 1,
    text: 'İBB 1985–87’de sarnıcı temizleyip onardı; Medusa başları bu çalışmalarda ortaya çıktı. Son restorasyondan sonra sarnıç Temmuz 2022’de yeniden ziyarete açıldı.', source: SRC.ibb },
  ...MEDUSA.map((m) => ({
    id: m.id, kind: 'medusa' as const, name: m.name, pos: [colX(m.col[0]), MEDUSA_Y + 0.4, rowZ(m.col[1])] as [number, number, number], radius: 1.1,
    text: m.roll === Math.PI
      ? 'Bu baş ters yerleştirilmiş. Efsaneye göre Medusa’nın bakışı taşa çevirdiği için ters konmuştur; daha olası açıklama, kaidenin sütuna uyması için böyle yerleştirildiğidir. Başların nereden getirildiği bilinmiyor.'
      : 'Bu baş yan yatık. İki baş da 1985–87 temizliğinde ortaya çıktı. Neden böyle konduklarına dair kesin bir kayıt yok; büyük olasılıkla başka bir yapıdan getirilip kaide olarak kullanıldılar.',
    source: SRC.istanbul,
  })),
];
export const MEDUSA_IDS = MEDUSA.map((m) => m.id);

/** Bakılan ilgi noktası: kameradan ileri ışın kürelere çarpıyor mu (nişangâh bunun için parlar) */
export function lookingAt(eye: [number, number, number], dir: [number, number, number], maxDist = 4.2): Poi | null {
  let best: Poi | null = null, bd = Infinity;
  for (const p of POIS) {
    const ox = p.pos[0] - eye[0], oy = p.pos[1] - eye[1], oz = p.pos[2] - eye[2];
    const t = ox * dir[0] + oy * dir[1] + oz * dir[2]; if (t < 0 || t > maxDist + p.radius) continue;
    const d2 = ox * ox + oy * oy + oz * oz - t * t;
    if (d2 < p.radius * p.radius && t < bd) { bd = t; best = p; }
  }
  return best;
}
