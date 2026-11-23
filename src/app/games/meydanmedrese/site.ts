/**
 * Meydan Medresesi (Hakkâri) — "Biçer'in Avlusu": kitabeli taç kapı, avlulu medrese (orta avlu, çevredeki hücreler, kuzeyde eyvan),
 * avluda havuz, dışarıda meydan ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (taç kapı ve meydan), −z kuzey (eyvan). Yükseklik düz; kısa oyun. Ölçüler, hücre sayısı ve iç düzen TEMSİLÎDİR
 * (docs/MEYDAN-MEDRESE.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Medresenin dış sınırı, duvar kalınlığı ve yüksekliği */
export const BUILD: Rect = { x0: -14, x1: 14, z0: -16, z1: 16 };
export const WALL_T = 1.6;
/** Taç kapı (güney) ve eyvan (kuzey) açıklıkları */
export const PORTAL = { x0: -2.5, x1: 2.5 };
export const EYVAN = { x0: -4, x1: 4 };
/** Avludaki havuz (yürünmez) */
export const POOL = { x: 0, z: 4, r: 1.7 };
/** Yan hücre blokları (yürünmez) */
export const CELLS: Rect[] = [{ x0: -13.6, x1: -9.6, z0: -12, z1: 12 }, { x0: 9.6, x1: 13.6, z0: -12, z1: 12 }];
/** Avlu (yürünebilir iç mekân) */
export const COURT: Rect = { x0: -9.6, x1: 9.6, z0: -14.4, z1: 14.4 };
/** Dış meydan (yürünebilir) */
export const SQUARE: Rect = { x0: -44, x1: 44, z0: -40, z1: 40 };

/** Meydandaki yapılar (yürünmez): taş evler */
export const HOUSES: Rect[] = [{ x0: 22.5, x1: 29.5, z0: -23, z1: -17 }, { x0: 26.5, x1: 33.5, z0: 12, z1: 20 }, { x0: -32, x1: -24, z0: -21.5, z1: -14.5 }, { x0: -31, x1: -21, z0: 11, z1: 17 }];

export function walkable(x: number, z: number): boolean {
  if (HOUSES.some((h) => inR(h, x, z, 0.4))) return false;
  if (inR(BUILD, x, z, -0.2)) {
    // dış duvarlar ve hücreler: yalnızca kapılar ve avlu açık
    if (CELLS.some((c) => inR(c, x, z, 0))) return false;
    if (inR(COURT, x, z, 0)) {
      if (Math.hypot(x - POOL.x, z - POOL.z) < POOL.r + 0.4) return false;
      return true;
    }
    if (z > BUILD.z1 - WALL_T - 0.2 && x > PORTAL.x0 && x < PORTAL.x1) return true;   // taç kapı geçidi
    if (z < BUILD.z0 + WALL_T + 0.2 && x > EYVAN.x0 && x < EYVAN.x1) return true;    // eyvan geçidi
    return false;
  }
  return inR(SQUARE, x, z, 0.3);
}
export function groundY(_x: number, _z: number): number { return 0; }
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
  hjuoz: { title: 'Hakkâri Üniversitesi hakemli dergi makalesi — Meydan Medresesi (hjuoz.uoz.edu.krd)', url: 'https://hjuoz.uoz.edu.krd/index.php/hum/article/download/1836/1306/7289' },
  haber: { title: 'Habertürk — Hakkâri’de 464 yıllık tarihi medrese yeniden ayağa kaldırılıyor', url: 'https://www.haberturk.com/hakkari-haberleri/35154819-hakkaride-464-yillik-tarihi-medrese-yeniden-ayaga-kaldiriliyor' },
  trt: { title: 'TRT Haber — Üç asırlık medrese yeni yüzüyle ziyaretçilerini ağırlıyor', url: 'https://www.trthaber.com/haber/kultur-sanat/uc-asirlik-medrese-yeni-yuzuyle-ziyaretcilerini-agirliyor-425990.html' },
  sabah: { title: 'Daily Sabah — Archive museum to be opened in Hakkari’s Meydan Madrasah', url: 'https://www.dailysabah.com/arts/events/history-for-posterity-archive-museum-to-be-opened-in-hakkaris-meydan-madrasah' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.4): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kapi', 'Taç kapı ve kitabe', 'Giriş', [0, 20], [0, 9.4, 16.8],
    'Giriş kapısının üzerindeki iki satırlık nesih kitabe, medresenin H. 1112 (M. 1700–1701) yılında yapıldığını bildirir. Kitabede ağırlıklı olarak Kur\'an ayetleri yer alır.', SRC.hjuoz, 5),
  mk('avli', 'Avlulu plan', 'Mimari', [0, -1], [0, 4.2, 0],
    'Medrese, Anadolu\'da Selçuklu döneminde başlayan, Beylikler ve Osmanlı döneminde gelişen avlulu medrese planının 18. yüzyıl başındaki bir örneğidir. Bu tür medreselerde avlunun çevresinde öğrenci hücreleri yer alır; oyundaki hücre ve eyvan düzeni temsilîdir.', SRC.hjuoz, 5),
  mk('yapan', 'Yaptıran tartışması', 'Tarih', [-5.4, -4.2], [-5.4, 3.2, -4.2],
    'Yapıyı kimin yaptırdığı kaynaklarda tutarsızdır. Bir habere göre Hakkâri bölge yöneticisi İzzeddin oğlu İbrahim Bey; başka bir rivayete göre ise Hakkâri Emiri İbrahim Han. Bu konu netleşmemiştir.', SRC.haber, 4.2),
  mk('restorasyon', 'Restorasyon', 'Koruma', [4.2, -9.4], [4.2, 3.2, -9.4],
    'Medrese 1984\'te Vakıflar Genel Müdürlüğü tarafından restore edildi. 2014–2015\'te üniversiteye tahsis edildi; çevre düzenlemesiyle ziyarete açıldı.', SRC.trt, 4),
  mk('muze', 'Kent arşivi ve müze', 'Bugün', [30, 6], [30, 3.8, 6],
    'Yetkililerin açıklamalarına göre medresenin bir kent arşivi ve etnografya müzesine dönüştürülmesi planlanıyor. Açıklamalar proje aşamasındadır; yerleşim ve içerik bu oyunda temsilîdir.', SRC.sabah, 4.6),
];
export const START: { at: V2; yaw: number } = { at: [0, 30], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -44, x1: 44, z0: -40, z1: 40 };
