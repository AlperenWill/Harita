/**
 * Gaziantep Kalesi — "Antep'in Tepesi": kentin ortasındaki höyüğün üstünde dairesel surlar, 12 burç, güneyde tek kapı, içeride hamam ve cami
 * kalıntıları, Panorama Müzesi ve 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (kentin meydanı ve kale kapısı), −z kuzey (müze). Arazi merkezde yükselen yumuşak bir kubbedir. Ölçüler, burç yerleşimi
 * ve iç düzen TEMSİLÎDİR (docs/GAZIANTEP-KALE.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Sur halkası: iç/dış yarıçap ve yükseklik; burç sayısı ve yarıçapı; kapı yarı genişliği */
export const RING = { r0: 30, r1: 32.4, h: 5.2 };
export const TOWER_N = 12, TOWER_R = 3.2;
export const GATE_HALF = 2.6;
/** Burç merkezleri: kapıdan 15° kayık, eşit aralıklı (kapının iki yanında burç yok) */
export const TOWERS: V2[] = Array.from({ length: TOWER_N }, (_, k) => { const a = Math.PI / 2 + (k + 0.5) * (2 * Math.PI) / TOWER_N, r = (RING.r0 + RING.r1) / 2; return [Math.cos(a) * r, Math.sin(a) * r] as V2; });
/** İçerideki yapılar (yürünmez): Osmanlı hamamı kalıntısı, cami kalıntısı, Panorama Müzesi, kuyu */
export const BATH: Rect = { x0: -14, x1: -6, z0: -9, z1: -3 };
export const MOSQUE: Rect = { x0: 6, x1: 15, z0: -12, z1: -5 };
export const MUSEUM: Rect = { x0: -9, x1: 9, z0: -24, z1: -16 };
export const WELL = { c: [-12, 11] as V2, r: 1.6 };
/** Dış meydan: kalenin çevresinde yürünebilir alan (etrafı kent evleri çevreler) */
export const PLAZA_R = 52;

/** Arazi: merkezde yükselen yumuşak höyük; dışarıda düz */
export function groundY(x: number, z: number): number { return 14 * Math.exp(-(x * x + z * z) / (2 * 34 * 34)); }
function inGate(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  return r > RING.r0 - 0.6 && r < RING.r1 + 0.6 && z > 0 && Math.abs(x) < GATE_HALF;
}
export function walkable(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  if (r > PLAZA_R) return false;
  for (const t of TOWERS) if (Math.hypot(x - t[0], z - t[1]) < TOWER_R + 0.4) return false;
  if (r >= RING.r0 - 0.6 && r <= RING.r1 + 0.6) return inGate(x, z);   // sur: yalnızca kapıdan geçilir
  if (r < RING.r0) {
    if (inR(BATH, x, z, -0.4) || inR(MOSQUE, x, z, -0.4) || inR(MUSEUM, x, z, -0.4)) return false;
    if (Math.hypot(x - WELL.c[0], z - WELL.c[1]) < WELL.r + 0.5) return false;
  }
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
  wiki: { title: 'Wikipedia — Gaziantep Castle', url: 'https://en.wikipedia.org/wiki/Gaziantep_Castle' },
  kure: { title: 'Küre Ansiklopedisi — Gaziantep Castle', url: 'https://kureansiklopedi.com/detay/gaziantep-castle' },
  lonely: { title: 'Lonely Planet — Gaziantep Castle', url: 'https://www.lonelyplanet.com/points-of-interest/gaziantep-castle/476422' },
  pdf: { title: 'Türk Müzeleri — Gaziantep Kalesi kazı ve tarihçe belgesi', url: 'https://www.turkishmuseums.com/Uploads/Müze/Dosya/421c7885-abd6-44c7-89f0-0c4f24fd1612.pdf' },
  panorama: { title: 'Gaziantep Kültür ve Turizm Müdürlüğü — Savunma ve Kahramanlık Panorama Müzesi', url: 'https://gaziantep.ktb.gov.tr/EN-200810/museum-of-gaziantep-defense-and-heroism-panoroma.html' },
  vatan: { title: 'Gazete Vatan — Gaziantep Kalesi\'nin yeniden açılışı', url: 'https://www.gazetevatan.com/galeri/gazianteplilere-duyuruldu-tarih-belli-oldu-ekimde-aciliyor-2289058' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.8): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('tepe', 'Antep\'in tepesi', 'Kale', [0, 44], gy(0, 44, 5),
    'Kale, kentin ortasındaki höyüğün üstünde yükselir. Kaynaklara göre bu tepe daha eski bir gözetleme noktasıydı; burada 2.–3. yüzyılda Roma döneminde bir müstahkem yer kuruldu.', SRC.wiki, 6),
  mk('burclar', 'On iki burç', 'Sur', [-22.5, 13], gy(-22.5, 13, 6.4),
    'Kalenin surlarında 12 burç sayılır. Evliya Çelebi\'nin 36 burçtan söz ettiği aktarılır; bu burçların bazılarının, günümüze ulaşmayan dış surlara ait olabileceği düşünülür. Oyundaki burç yerleşimi temsilîdir.', SRC.pdf, 5),
  mk('donemler', 'Katman katman kale', 'Tarih', [0, 27], gy(0, 27, 6.6),
    'Kaynaklar 6. yüzyılda Iustinianus\'un kaleyi genişlettiğini aktarır. 1181\'de Eyyubiler kaleyi alıp onarmış ve güçlendirmiştir; bazı burçlarda Eyyubi ve Memlük süslemeleri görülür. Memlük, Dulkadirli ve Osmanlı dönemleri de izlerini bırakmıştır.', SRC.wiki, 5),
  mk('hamam', 'Hamam ve cami kalıntıları', 'Kazı', [-10, 0.6], gy(-10, 0.6, 3.4),
    'Kazılarda kale içinde Osmanlı dönemine ait bir hamam ve bir cami kalıntısı bulundu. Oyundaki kalıntıların biçimi ve yeri temsilîdir.', SRC.pdf, 5.4),
  mk('panorama', 'Panorama Müzesi', 'Müze', [0, -12.4], gy(0, -12.4, 3.6),
    'Kalenin içindeki Savunma ve Kahramanlık Panorama Müzesi, 1920\'de kentin Fransız işgaline karşı savunmasını anlatır. Kalenin kendi tarihini değil, bu savunmayı ele alır.', SRC.panorama, 5),
  mk('deprem', 'Depremden sonra', 'Koruma', [17, 17], gy(17, 17, 6.4),
    'Şubat 2023 depremleri kalenin bazı burç ve surlarında hasara yol açtı. Onarım Eylül 2023\'te başladı. Kalenin yeniden açılışı haberlere göre planlanmıştı; bu oyundaki hasar gösterimi yoktur.', SRC.vatan, 5),
];
export const START: { at: V2; yaw: number } = { at: [0, 50], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -56, x1: 56, z0: -56, z1: 56 };
export { inR };
