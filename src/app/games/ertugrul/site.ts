/**
 * Ertuğrul Gazi Türbesi (Bilecik, Söğüt) — "Söğüt'te Bir Sessizlik": duvarlı türbe bahçesi, altıgen planlı kubbeli türbe, nöbet noktaları, iki yanda
 * büstler, batıdaki tepede cami, doğuda şenlik alanı ve 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (Söğüt meydanı ve bahçe kapısı), −z kuzey (türbe). Ölçüler, büst sayısı ve yerleşim TEMSİLÎDİR (docs/ERTUGRUL.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Türbe bahçesi: iç sınır, duvar kalınlığı, güney kapısı */
export const GARDEN: Rect = { x0: -22, x1: 22, z0: -26, z1: 14 };
export const WALL_T = 1;
export const GATE = { x0: -3, x1: 3 };
/** Türbe: merkez ve yarıçap (altıgen plan; çarpışma için daire) */
export const TOMB = { c: [0, -14] as V2, r: 5.4 };
/** Nöbet noktaları (türbenin iki yanında) ve büstler (bahçenin iki yan duvarı boyunca) */
export const POSTS: V2[] = [[-3.6, -7.6], [3.6, -7.6]];
export const BUSTS: V2[] = Array.from({ length: 16 }, (_, i) => [i < 8 ? -18.2 : 18.2, -22 + (i % 8) * 2.6] as V2);
/** Dış alan: meydan, tepe (cami) ve şenlik alanı */
export const AREA: Rect = { x0: -64, x1: 64, z0: -34, z1: 64 };
/** Cami tepesi: merkez ve yarıçap; cami kalıntı/yapı daire (yürünmez) */
export const HILL = { c: [-42, 34] as V2, s: 14, h: 5 };
export const MOSQUE = { c: [-42, 34] as V2, r: 3.6 };
/** Şenlik alanındaki yürünmez çadır (doğuda) */
export const TENT = { c: [34, 28] as V2, r: 3 };

export function groundY(x: number, z: number): number { return HILL.h * Math.exp(-((x - HILL.c[0]) ** 2 + (z - HILL.c[1]) ** 2) / (2 * HILL.s * HILL.s)); }
export function walkable(x: number, z: number): boolean {
  if (!inR(AREA, x, z, 0.4)) return false;
  if (inR({ x0: GARDEN.x0 - WALL_T, x1: GARDEN.x1 + WALL_T, z0: GARDEN.z0 - WALL_T, z1: GARDEN.z1 + WALL_T }, x, z)) {
    if (!inR(GARDEN, x, z, 0)) return z > GARDEN.z1 - 0.2 && x > GATE.x0 && x < GATE.x1;   // duvar: yalnızca kapı
    if (Math.hypot(x - TOMB.c[0], z - TOMB.c[1]) < TOMB.r + 0.4) return false;
    for (const p of [...POSTS, ...BUSTS]) if (Math.hypot(x - p[0], z - p[1]) < 0.9) return false;
    return true;
  }
  if (Math.hypot(x - MOSQUE.c[0], z - MOSQUE.c[1]) < MOSQUE.r + 0.5) return false;
  if (Math.hypot(x - TENT.c[0], z - TENT.c[1]) < TENT.r + 0.5) return false;
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
  tdv: { title: 'TDV İslâm Ansiklopedisi — Ertuğrul Gazi Camii ve Türbesi', url: 'https://islamansiklopedisi.org.tr/ertugrul-gazi-camii-ve-turbesi' },
  kure: { title: 'Küre Ansiklopedisi — Söğüt', url: 'https://kureansiklopedi.com/tr/detay/sogut-2' },
  kure2: { title: 'Küre Ansiklopedisi — Ertuğrul Gazi Camii ve Türbesi', url: 'https://kureansiklopedi.com/tr/detay/ertugrul-gazi-camii-ve-turbesi' },
  wiki: { title: 'Wikipedia — Ertuğrul', url: 'https://en.wikipedia.org/wiki/Ertu%C4%9Frul' },
  sabah: { title: 'Daily Sabah — Ertuğrul Ghazi commemorated at ceremony in Türkiye\'s Bilecik', url: 'https://www.dailysabah.com/turkiye/ertugrul-ghazi-commemorated-at-ceremony-in-turkiyes-bilecik/news' },
  hakimiyet: { title: 'Bursa Hakimiyet — Ertuğrul Gazi Türbesi\'ni yaklaşık 3 milyon kişi ziyaret etti', url: 'https://www.bursahakimiyet.com.tr/yasam/ertugrul-gazi-turbesi-ni-yaklasik-3-milyon-kisi-ziyaret-etti-1562197' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.8): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('sogut', 'Söğüt', 'Yer', [0, 26], gy(0, 26, 5),
    'Söğüt, Bilecik\'in ilçesidir ve Osmanlı Beyliği\'nin çıkış yeri olarak anılır. Ertuğrul Gazi\'nin oğlu Osman Bey\'in beyliği burada başlattığı anlatılır.', SRC.kure, 6),
  mk('turbe', 'Türbe', 'Mimari', [0, -2.4], gy(0, -2.4, 4.2),
    'Türbe, erken Osmanlı türbe mimarisinin özelliklerini taşır: altıgen planlı, kubbeli ve kırma çatılı bir yapıdır. Oyundaki ölçüler ve biçim temsilîdir.', SRC.tdv, 5),
  mk('tarih', 'Mezarın tarihi', 'Tarih', [-12, -10], gy(-12, -10, 3.4),
    'Ertuğrul Gazi\'nin yaklaşık 1281–82\'de öldüğü ve Söğüt\'e gömüldüğü aktarılır. Mezarın önce Osman Bey tarafından açık mezar olarak düzenlendiği; ilk türbe taşlarının Orhan Gazi döneminde konduğu söylenir. Başka bir anlatı, türbeye dönüştürülmesini I. Mehmed\'e bağlar. Yapının kökeni kaynaklarda kesin değildir.', SRC.kure2, 5),
  mk('cami', 'Ertuğrul Gazi Camii', 'Cami', [-42, 28], gy(-42, 28, 4.6),
    'Söğüt\'ün güneybatısındaki bir tepede, Ertuğrul Gazi adına anılan bir cami vardır. Caminin ölümünden sonra yapıldığı, 19. yüzyılın sonlarında yeniden inşa edildiği aktarılır. Oyundaki cami basit bir temsildir.', SRC.kure, 5),
  mk('nobet', 'Nöbet ve büstler', 'Tören', [4.4, -3.8], gy(4.4, -3.8, 3.4),
    'Türbenin önünde jandarma personelinin yaptığı bir nöbet töreni vardır. Önde, on altı büyük Türk devletinin ve Cumhuriyet\'in kurucularının büstleri yer alır. Oyunda büstlerin biçimi ve sırası temsilîdir.', SRC.hakimiyet, 4.6),
  mk('anma', 'Anma ve Şenlikler', 'Her yıl', [28, 22], gy(28, 22, 4.6),
    'Ertuğrul Gazi\'yi anma etkinlikleri her yıl Eylül sonunda yapılır ve zamanla daha resmî bir nitelik kazanmıştır. 2025\'te türbenin yaklaşık 3 milyon kişi tarafından ziyaret edildiği bildirildi.', SRC.sabah, 5),
];
export const START: { at: V2; yaw: number } = { at: [0, 54], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -68, x1: 68, z0: -38, z1: 68 };
