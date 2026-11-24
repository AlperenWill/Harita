/**
 * Amasya — Kral Kaya Mezarları ve Yalıboyu Evleri: "Kayadan Ayır" (detaylı). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Yeşilırmak x boyunca akar (z 0…30). Güney kıyıda gezinti yolu; kuzey kıyıda nehre dayanan Yalıboyu
 * evleri, arkalarında sokak, sokağın kuzeyinde Harşena Dağı'nın kayalığı. Kayaya oyulmuş zikzak merdivenle mezar terasına çıkılır;
 * terasın arkasındaki dik kaya yüzüne Pontus kral mezarları oyulmuştur. Batıda kaya tüneliyle iki mezara daha geçilir.
 * Mekanik: yarım bırakılmış bir nişte mezar bloğunu ters U galeriyle ana kayadan ayırmak (yukarıdan aşağıya oyma).
 * Ölçek, terasın yüksekliği ve yerleşim TEMSİLÎDİR (gerçekte mezarlar nehirden ~100 m yukarıdadır).
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -90, x1: 90, z0: -60, z1: 82 };
export const RIVER = { z0: 0, z1: 30, water: -1.3 };
export const BRIDGE = { w: 4.2, z0: -0.5, z1: 30.5 };
export const HOUSE_ROW = { z0: -12, z1: 0, lane: 2.2 };
export const STREET = { z0: -20, z1: -12 };
/** Kaya merdiveni: üç kol, her kol 16 m boyunca 6 m yükselir; kollar uçlarda birleşir */
export const STAIR = { x0: 42, x1: 58, rows: [[-22.5, -20], [-25, -22.5], [-27.5, -25]] as V2[], rise: 6 };
export const TERRACE = { y: 18, x0: -40, x1: 60, z0: -36, z1: -27.5 };
export const FACE_Z = -36;   // dik kaya yüzü
export const TUNNEL = { x0: -58, x1: -40, z0: -33.4, z1: -30.6, h: 3.2 };
export const WEST = { x0: -76, x1: -58 };
/** Mezar nişleri: blok (w×h×d) + çevresinde g genişliğinde galeri; ön yüz kaya yüzünden biraz içeride */
export interface Tomb { id: string; x: number; w: number; h: number; d: number; g: number }
export const TOMBS: Tomb[] = [
  { id: 'uclu1', x: -25, w: 6, h: 11, d: 5, g: 1.4 },
  { id: 'uclu2', x: -14.5, w: 6, h: 11, d: 5, g: 1.4 },
  { id: 'uclu3', x: -4, w: 6, h: 11, d: 5, g: 1.4 },
  { id: 'buyuk', x: 16, w: 8, h: 15, d: 6, g: 1.6 },
  { id: 'bati1', x: -70.5, w: 5, h: 9, d: 4, g: 1.3 },
  { id: 'bati2', x: -63, w: 5, h: 9, d: 4, g: 1.3 },
];
export const BLOCK_SET = 0.6;   // blok ön yüzünün kaya yüzünden geri çekilmesi
export const blockZ = (t: Tomb): V2 => [FACE_Z - BLOCK_SET - t.d, FACE_Z - BLOCK_SET];   // [arka, ön]
export const galleryBack = (t: Tomb) => FACE_Z - BLOCK_SET - t.d - t.g;

/* ===================== oyma atölyesi ===================== */
/** Yarım bırakılmış niş: ön görünüşte ızgara (1 m hücre). 'n' niş dışı kaya, 'g' oyulacak galeri, 'b' mezar bloğu */
export const WORK = { x: 34, cols: 9, rows: 12, cell: 1 };
export const WORK_GRID: string[] = (() => {
  const { cols, rows } = WORK, out: string[] = [], cx = (cols - 1) / 2, R = cols / 2, spring = rows - R;
  for (let r = 0; r < rows; r++) { let row = ''; for (let c = 0; c < cols; c++) { const y = r + 0.5, x = c - cx;
    const inNiche = y < spring || x * x + (y - spring) ** 2 < R * R;
    const bx = Math.abs(x) < 2.6, inBlock = bx && (y < spring - 1 || x * x + (y - spring + 1) ** 2 < (R - 1.6) ** 2);
    row += !inNiche ? 'n' : inBlock ? 'b' : 'g'; } out.push(row); }
  return out;   // out[0] en alt sıra
})();
export const cellAt = (c: number, r: number) => WORK_GRID[r]?.[c] ?? 'n';
/** Bir galeri hücresi oyulabilir mi: üstündeki hücre niş dışıysa (en üst) ya da zaten oyulmuşsa */
export function canCarve(c: number, r: number, carved: Set<string>): boolean {
  if (cellAt(c, r) !== 'g' || carved.has(`${c},${r}`)) return false;
  const up = cellAt(c, r + 1); return up === 'n' || carved.has(`${c},${r + 1}`);
}
export const GALLERY_CELLS = WORK_GRID.reduce((a, row) => a + [...row].filter((ch) => ch === 'g').length, 0);
export const MAX_CRACKS = 3;

/* ===================== yürünebilirlik ve yükseklik ===================== */
const inTombGallery = (x: number, z: number, p: number) => TOMBS.some((t) => {
  const half = t.w / 2 + t.g, [bz0, bz1] = blockZ(t);
  if (Math.abs(x - t.x) > half - p || z < galleryBack(t) + p || z > FACE_Z + 0.1) return false;
  return !(Math.abs(x - t.x) < t.w / 2 + p && z > bz0 - p && z < bz1 + p);
});
function stairRow(_x: number, z: number): number { for (let i = 0; i < 3; i++) { const [a, b] = STAIR.rows[i]; if (z >= a && z < b) return i; } return -1; }
export function stairY(x: number, i: number): number { const L = STAIR.x1 - STAIR.x0, t = i % 2 === 0 ? (STAIR.x1 - x) / L : (x - STAIR.x0) / L; return STAIR.rise * i + STAIR.rise * Math.max(0, Math.min(1, t)); }
export type Zone = 'south' | 'bridge' | 'lane' | 'street' | 'stair' | 'terrace' | 'tunnel' | 'west' | 'tomb' | null;
export function zone(x: number, z: number, p = 0.4): Zone {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return null;
  if (z > RIVER.z1 + 0.6) return 'south';
  if (z > BRIDGE.z0 && Math.abs(x) < BRIDGE.w / 2 - p) return 'bridge';
  if (z > RIVER.z0 - 0.5) return null;
  if (z > HOUSE_ROW.z0 - 0.1) return Math.abs(x) < HOUSE_ROW.lane - p ? 'lane' : null;
  if (z > STREET.z0 + p || (x > STAIR.x0 + p && x < STAIR.x1 - p && z >= STREET.z0)) return Math.abs(x) < 86 ? 'street' : null;
  if (x > STAIR.x0 + p && x < STAIR.x1 - p && stairRow(x, z) >= 0) return 'stair';
  if (z > TERRACE.z1 - 0.05) return null;
  if (z > FACE_Z + p) {
    if (x > TERRACE.x0 && x < TERRACE.x1 - p) return 'terrace';
    if (x > TUNNEL.x0 && x <= TERRACE.x0) return z > TUNNEL.z0 + p && z < TUNNEL.z1 - p ? 'tunnel' : null;
    if (x > WEST.x0 + p && x <= TUNNEL.x0) return 'west';
    return null;
  }
  return inTombGallery(x, z, p) ? 'tomb' : null;
}
export const walkable = (x: number, z: number) => zone(x, z) !== null;
export function groundY(x: number, z: number): number {
  const zn = zone(x, z, 0);
  if (zn === 'stair') return stairY(x, stairRow(x, z));
  if (zn === 'terrace' || zn === 'tunnel' || zn === 'west' || zn === 'tomb') return TERRACE.y;
  if (zn === null && z < TERRACE.z1 && z > FACE_Z - 12) return TERRACE.y;
  if (zn === null && x > STAIR.x0 && x < STAIR.x1) { const i = stairRow(x, z); if (i >= 0) return stairY(x, i); }
  return 0;
}
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; const y0 = groundY(x, z);
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - y0) < 0.6) x += dx;
  const y1 = groundY(x, z); if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - y1) < 0.6) z += dz;
  return [x, z]; }
/** Atölye nişinin önü (oyma kipine geçilen yer) */
export const WORK_AT: V2 = [WORK.x, FACE_Z + 4.5];
export const atWork = (x: number, z: number) => Math.hypot(x - WORK_AT[0], z - WORK_AT[1]) < 2.6;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  kultur: { title: 'Kültür Envanteri — Harşena Dağı ve Pontus Kralları Kaya Mezarları', url: 'https://kulturenvanteri.com/en/yer/amasya-pontus-kral-mezarlari/' },
  wiki: { title: 'Wikipedia — Tombs of the kings of Pontus', url: 'https://en.wikipedia.org/wiki/Tombs_of_the_kings_of_Pontus' },
  kure: { title: 'Küre Ansiklopedisi — Kral Kaya Mezarları', url: 'https://kureansiklopedi.com/tr/detay/kral-kaya-mezarlari-2' },
  ktb: { title: 'Amasya İl Kültür ve Turizm Müdürlüğü — The Kings\' Rock Tombs', url: 'https://amasya.ktb.gov.tr/EN-262598/the-kings39-rock-tombs.html' },
  lp: { title: 'Lonely Planet — Tombeaux des rois du Pont', url: 'https://www.lonelyplanet.fr/poi/tombeaux-des-rois-du-pont' },
  haz: { title: 'Amasya İl Kültür ve Turizm Müdürlüğü — Hazeranlar Konağı Etnografya Müzesi', url: 'https://amasya.ktb.gov.tr/EN-259003/hazeranlar-mansion-ethnography-museum.html' },
  gt: { title: 'GoTürkiye — Amasya', url: 'https://goturkiye.com/amasya/see' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('yaliboyu', 'Yalıboyu evleri', 'Kıyı', [-12, 32.4], [-12, 1.6, 31.2],
    'Yeşilırmak kıyısına dizilen evler geç Osmanlı dönemi sivil mimarisinin örnekleridir. İki ya da üç katlıdır; taş ve ahşapla yapılmıştır. Arkalarındaki sarp kayalıkla birlikte kentin bilinen görüntüsünü oluşturur. (Evlerin sayısı ve renkleri temsilîdir.)', SRC.gt, 3.6),
  mk('hazeranlar', 'Hazeranlar Konağı', 'Konak', [-30, -15], [-30, 3.2, -12.6],
    'Konağın 1865\'te yapıldığı yazılır (bir kaynak 20. yüzyıl başı der). Nehre bakan güney cephesinde tam bir simetri vardır. Bugün etnografya müzesidir. (Oyundaki görünüşü temsilîdir.)', SRC.haz),
  mk('pontus', 'Pontus kralları', 'Mezarlar', [-14.5, -31], [-14.5, 18 + 12.5, FACE_Z + 0.4],
    'Harşena Dağı\'nın güney yamacındaki mezarlar Pontus Krallığı\'nın krallarına aittir. Vadide irili ufaklı 21 mezar olduğu bilinir; bunlardan yalnızca birkaçı günümüze ulaşmıştır. Burada beş kralın mezarı olduğu yazılır.', SRC.kultur, 4),
  mk('buyuk', 'Büyük Kral Mezarı', 'En büyüğü', [16, -31], [16, 18 + 16.5, FACE_Z + 0.4],
    'Kaynaklarda en büyük mezarın 15 m yüksekliğinde, 8 m genişliğinde ve 6 m derinliğinde olduğu yazılır. (Kimin için yapıldığı kaynaklarda farklı verilir.)', SRC.ktb, 4),
  mk('galeri', 'Ters U galeri', 'Yapım', [-4 + 3.7, -40], [-4 + 3.7, 18 + 2.2, -38.5],
    'Mezar blokları, çevrelerine oyulan ters U biçimli bir galeriyle ana kayadan ayrılmıştır. Galeriye girip bloğun arkasından dolaşabilirsin.', SRC.kure, 2.4),
  mk('tunel', 'Kaya tüneli', 'Geçit', [-49, -32], [-49, 18 + 2.6, -32],
    'Kayaya oyulmuş bir tünel iki mezara daha ulaşır. (Tünelin uzunluğu ve biçimi temsilîdir.)', SRC.lp, 3),
  mk('harsena', 'Harşena Dağı', 'Dağ', [52, -24], [50, 8.6, -21.4],
    'Mezarlara kayaya oyulmuş yollar ve merdivenlerle çıkılır. Alan 2015\'te UNESCO Dünya Mirası Geçici Listesi\'ne alındı. (Merdivenin biçimi ve terasın yüksekliği temsilîdir; gerçekte mezarlar nehirden yaklaşık 100 m yukarıdadır.)', SRC.wiki, 3),
];
export const CARD_WORK = { id: 'oyma', name: 'Kayadan ayrılan blok', kicker: 'Oyma atölyesi',
  text: 'Galeriyi yukarıdan aşağıya oydun ve mezar bloğunu ana kayadan ayırdın. Kral mezarlarının blokları da ters U biçimli galerilerle kayadan ayrılmıştır. (Oyma sırası ve atölye temsilîdir; işçilerin yöntemi kaynaklarda ayrıntılı anlatılmaz.)', source: SRC.kure };
export const START: { at: V2; yaw: number } = { at: [-6, 36], yaw: 0.12 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
