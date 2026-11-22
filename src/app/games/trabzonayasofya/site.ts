/**
 * Trabzon Ayasofya — "Kubbenin Altında": Karadeniz'e bakan bahçe, kilise (batı sundurması → narteks → kubbeli naos), kuzey ve güney
 * sundurmaları, çan kulesi ve 7 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: kilisenin uzun ekseni x (−x batı girişi, +x doğu apsisi), −z kuzey (deniz). Oyuncu bahçede serbestçe dolaşır, batı
 * sundurmasından içeri girer; kuzey ve güney sundurmalarına bahçeden girilir (içeri açılmaz).
 * Ölçüler ve bahçe düzeni TEMSİLÎDİR (docs/TRABZON-AYASOFYA.md).
 */
export type V2 = [number, number];
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ===================== arazi ===================== */
export const TERRACE_Y = 10;
/** Bahçe (teras): kuzey kenarı denize bakan duvarla biter */
export const GARDEN = { x0: -58, x1: 46, z0: -34, z1: 36 };
export function terrainBase(x: number, z: number): number {
  const inG = x > GARDEN.x0 - 4 && x < GARDEN.x1 + 4 && z > GARDEN.z0 - 1 && z < GARDEN.z1 + 6;
  if (inG) return TERRACE_Y + (z > GARDEN.z1 ? (z - GARDEN.z1) * 0.3 : 0);
  if (z < GARDEN.z0) return TERRACE_Y * (1 - smooth(GARDEN.z0 - 1, GARDEN.z0 - 22, z)) + (z < GARDEN.z0 - 22 ? -1 - (GARDEN.z0 - 22 - z) * 0.05 : 0);   // kıyıya inen yamaç
  const dz = Math.max(0, z - GARDEN.z1), dx = Math.max(0, Math.abs(x - (GARDEN.x0 + GARDEN.x1) / 2) - (GARDEN.x1 - GARDEN.x0) / 2);
  return TERRACE_Y + dz * 0.32 + dx * 0.12 + Math.sin(x * 0.04) * 1.5 * smooth(0, 30, dz + dx);   // içerideki tepeler
}
export const SEA_Y = 0;

/* ===================== kilise ===================== */
export const FLOOR = TERRACE_Y + 0.22;   // eşik: bir basamak
/** Bölümler (yürünebilir iç alanlar ve sundurmalar); aralarında 0,8 m duvar, kapı açıklığı |z| < 1,6 */
export const ZONES = {
  batiSundurma: { x0: -16.6, x1: -13.4, z0: -4.6, z1: 4.6 },
  narteks: { x0: -12.6, x1: -9.8, z0: -6.4, z1: 6.4 },
  naos: { x0: -9, x1: 10.4, z0: -6.4, z1: 6.4 },
  kuzeySundurma: { x0: -4, x1: 4, z0: -10.4, z1: -7.4 },
  guneySundurma: { x0: -4, x1: 4, z0: 7.4, z1: 10.4 },
};
export const CHURCH = { x0: -16.6, x1: 13.6, z0: -10.4, z1: 10.4 };
/** Kubbeyi taşıyan dört sütun */
export const COLUMNS: V2[] = [[-2.6, -2.6], [2.6, -2.6], [-2.6, 2.6], [2.6, 2.6]];
export const DOME = { r: 3.6, drumH: 5.5, base: FLOOR + 11 };
/** Çan kulesi (kilisenin batısında, ayrı) */
export const TOWER = { c: [-34, 8] as V2, w: 5.4 };
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
const DOOR = 1.6;
/** Kilisenin içinde/sundurmalarında yürünebilir mi */
function churchWalk(x: number, z: number): boolean {
  const Z = ZONES, m = 0.3;
  if (inR(Z.batiSundurma, x, z, m) || inR(Z.narteks, x, z, m) || inR(Z.kuzeySundurma, x, z, m) || inR(Z.guneySundurma, x, z, m)) return true;
  if (inR(Z.naos, x, z, m)) return !COLUMNS.some((c) => Math.hypot(x - c[0], z - c[1]) < 0.9);
  if (Math.abs(z) < DOOR - 0.2 && x >= Z.batiSundurma.x1 - m && x <= Z.narteks.x0 + m) return true;   // sundurma → narteks kapısı
  if (Math.abs(z) < DOOR - 0.2 && x >= Z.narteks.x1 - m && x <= Z.naos.x0 + m) return true;   // narteks → naos kapısı
  if (Math.abs(z) < 3.6 && x <= Z.batiSundurma.x0 + m + 0.4 && x > Z.batiSundurma.x0 - 1) return true;   // sundurmanın açık batı kemeri
  for (const p of [Z.kuzeySundurma, Z.guneySundurma]) { const outer = p.z0 < 0 ? p.z0 : p.z1; if (x > p.x0 + 0.8 && x < p.x1 - 0.8 && Math.abs(z - outer) < 1) return true; }   // sundurmaların açık ön kemeri
  return false;
}
export function inChurch(x: number, z: number, m = 0) { return inR(CHURCH, x, z, -m); }
export function walkable(x: number, z: number): boolean {
  if (inChurch(x, z, 0.4)) return churchWalk(x, z);
  if (Math.abs(x - TOWER.c[0]) < TOWER.w / 2 + 0.6 && Math.abs(z - TOWER.c[1]) < TOWER.w / 2 + 0.6) return false;
  return inR(GARDEN, x, z, 1.2);
}
export function groundY(x: number, z: number): number { return inChurch(x, z, 0.4) && churchWalk(x, z) ? FLOOR : terrainBase(x, z); }
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
  tdv: { title: 'TDV İslâm Ansiklopedisi — Ayasofya Camii (Trabzon)', url: 'https://islamansiklopedisi.org.tr/ayasofya-camii--trabzon' },
  wiki: { title: 'Wikipedia — Hagia Sophia, Trabzon', url: 'https://en.wikipedia.org/wiki/Hagia_Sophia,_Trabzon' },
  hh: { title: 'History Hit — Hagia Sophia, Trabzon', url: 'https://www.historyhit.com/locations/hagia-sophia-trabzon/' },
  w4: { title: 'World4 — Hagia Sophia Trebizond', url: 'https://world4.eu/hagia-sophia-trebizond/' },
  ahs: { title: 'Ancient History Sites — Hagia Sophia, Trabzon', url: 'https://www.ancient-history-sites.com/sites/hagia-sophia-2/' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('komnenos', 'Komnenosların kilisesi', 'Tarih', [-24, 0], [-16.8, FLOOR + 7.5, 0],
    'Trabzon İmparatorluğu\'nu yöneten Komnenos hanedanı döneminde yapıldı. Yaptıranın I. Manuel Komnenos (1238–1263) olduğu kabul edilir; yapım tarihi 1245–1255 yılları arasına tahmin edilir.', SRC.tdv),
  mk('friz', 'Âdem ile Havva frizi', 'Kabartma', [0, 12.4], [0, FLOOR + 4.6, 10.5],
    'Kabartma süslemenin en zengini güney sundurmasındadır. Giriş kemerinin alnında yatay bir friz, Âdem ile Havva\'nın öyküsünden yedi sahneyi sağdan sola anlatır. (Oyundaki kabartma temsilîdir.)', SRC.w4),
  mk('kartal', 'Apsisteki kartal', 'Kabartma', [16.5, 0], [13.9, FLOOR + 6.5, 0],
    'Üç sundurmanın dışındaki az sayıdaki kabartmadan biri, ana apsisin dış yüzündeki kartaldır.', SRC.ahs),
  mk('kule', 'Çan kulesi', 'Kule', [-34, 2.4], [-34, FLOOR + 12, TOWER.c[1] - TOWER.w / 2],
    'Kilisenin batısındaki çan kulesi, süslemelerindeki bir yazıya göre 1443 tarihlidir. İç duvarları resimlidir; Osmanlı döneminde minare olarak kullanılmıştır.', SRC.tdv),
  mk('fresk', 'Kubbenin altında', 'Freskler', [-4.5, 0], [0, FLOOR + 6, 0],
    'İç mekânın fresklerinin üstü Osmanlı döneminde örtülmüş, ancak 20. yüzyıldaki çalışmalarla yeniden ortaya çıkarılmıştır. Bugün kalanların özgün süslemenin yalnızca altıda biri kadar olduğu düşünülür. (Oyundaki fresk görüntüleri temsilîdir.)', SRC.hh),
  mk('donusum', 'Kilise, cami, müze', 'Dönüşüm', [-11.2, 4.6], [-11.2, FLOOR + 3.2, 6.6],
    'Yapı 1957\'de yeniden ibadete açıldı; 1958\'de fresklerin ortaya çıkarılması için kapatıldı ve 1964\'te müze oldu. 2013\'te yeniden camiye dönüştürüldü; bu karara karşı yerel mimarlar dava açtı.', SRC.wiki),
  mk('deniz', 'Karadeniz\'e bakan tepe', 'Manzara', [-10, -31], [-10, TERRACE_Y + 1.6, -34.8],
    'Kilise, Trabzon şehir merkezinin yaklaşık 3 km batısında, Karadeniz kıyısındaki alçak bir tepenin üzerindedir.', SRC.hh),
];
export const START: { at: V2; yaw: number } = { at: [-50, 26], yaw: -2.3 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -60, x1: 48, z0: -36, z1: 38 };
