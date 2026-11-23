/**
 * SEKA Kâğıt Müzesi (Kocaeli) — "Hamurdan Rulolara": eski kâğıt fabrikası salonu (uzun kâğıt makinesi, vitrinler, matbaa makineleri), dışarıda
 * baca ve avlu, 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (avlu ve giriş kapısı), −z kuzey (vitrinler). Salon ~64 × 32 m. Ölçüler, makine ve vitrin yerleşimi TEMSİLÎDİR (docs/SEKA.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Salonun dış sınırı, duvar kalınlığı ve giriş kapısı (güney duvarı) */
export const HALL: Rect = { x0: -32, x1: 32, z0: -16, z1: 16 };
export const WALL_T = 0.8;
export const DOOR = { x0: -24, x1: -20 };
/** Kâğıt makinesi gövdesi ve vitrin sırası (yürünmez) */
export const MACHINE: Rect = { x0: -26, x1: 14, z0: -2.4, z1: 2.4 };
export const VITRINS: Rect[] = Array.from({ length: 8 }, (_, i) => ({ x0: -29 + i * 7, x1: -26 + i * 7, z0: -14.6, z1: -12.6 }));
/** Matbaa makineleri: doğu ucunda beş makine */
export const PRESSES: Rect[] = Array.from({ length: 5 }, (_, i) => ({ x0: 21, x1: 25.5, z0: -11 + i * 5.6, z1: -8.6 + i * 5.6 }));
/** Avlu (güney), baca ve havuz */
export const YARD: Rect = { x0: -52, x1: 52, z0: 16, z1: 52 };
export const CHIMNEY = { c: [38, 28] as V2, r: 2.6 };
export const POND = { c: [-4, 34] as V2, r: 4.5 };

export function walkable(x: number, z: number): boolean {
  if (inR(HALL, x, z, -WALL_T)) {                                       // duvar bandı dâhil bina bölgesi
    if (inR(HALL, x, z, 0.3)) {                                          // salonun içi
      if (inR(MACHINE, x, z, -0.4)) return false;
      if (VITRINS.some((v) => inR(v, x, z, -0.4))) return false;
      if (PRESSES.some((p) => inR(p, x, z, -0.4))) return false;
      return true;
    }
    return z > HALL.z1 - 0.4 && x > DOOR.x0 && x < DOOR.x1;             // giriş kapısı
  }
  if (!inR(YARD, x, z, 0.4)) return false;
  if (Math.hypot(x - CHIMNEY.c[0], z - CHIMNEY.c[1]) < CHIMNEY.r + 0.4) return false;
  if (Math.hypot(x - POND.c[0], z - POND.c[1]) < POND.r + 0.4) return false;
  return true;
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
  wiki: { title: 'Wikipedia — SEKA Paper Museum', url: 'https://en.wikipedia.org/wiki/SEKA_Paper_Museum' },
  kure: { title: 'Küre Ansiklopedisi — SEKA Kağıt Müzesi', url: 'https://kureansiklopedi.com/tr/detay/seka-kagit-muzesi-bc9a2' },
  tez: { title: 'DergiPark — Sümerbank İzmit Kâğıt ve Karton Fabrikası üzerine makale', url: 'https://dergipark.org.tr/tr/download/article-file/1473662' },
  sabah: { title: 'Daily Sabah — Turkey\'s first paper museum ready to open', url: 'https://www.dailysabah.com/history/2016/11/04/turkeys-first-paper-museum-ready-to-open' },
  erih: { title: 'ERIH — Seka Paper Mill', url: 'https://www.erih.net/i-want-to-go-there/site/seka-paper-mill' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('fabrika', 'Sümerbank fabrikası', 'Fabrika', [-22, 24], [-22, 6.4, 17],
    'Sümerbank İzmit Kâğıt ve Karton Fabrikası\'nın temeli 1934\'te atıldı (kaynaklar 14 ya da 18 Ağustos der). İlk deneme üretimi Nisan 1936\'da, resmî açılış 6 Kasım 1936\'da yapıldı. Cumhuriyet\'in ilk sanayi kuruluşları arasında sayılır.', SRC.tez, 6),
  mk('makine', 'Kâğıt makinesi', 'Makine', [-8, -6], [-8, 3.6, 0],
    'Salonun ortasındaki uzun makine, hamurun levhaya ve ruloya dönüştüğü hattı gösterir. Fabrikanın makineleri müze için özgün hâline yakın biçimde restore edilmiştir. Oyundaki hat sadeleştirilmiştir.', SRC.wiki, 5.4),
  mk('kagitci', 'Mehmet Ali Kağıtçı', 'Kişi', [-22, -8], [-22, 3, -8],
    'Kaynaklar, Türkiye\'nin ilk kâğıt mühendisi Mehmet Ali Kağıtçı\'yı fabrikanın kurucusu olarak anar; müze de onun adını taşır.', SRC.wiki, 4.6),
  mk('vitrin', 'Vitrinler', 'Koleksiyon', [4, -11], [4, 3, -13.6],
    'Müzede kâğıt yapım aşamalarını, Kocaeli\'nin tarihini ve fabrikanın sosyal hayatını anlatan yüzün üzerinde vitrin sayılır. Koleksiyonda Roma dönemi sikkeleri, belgeler ve kâğıttan heykeller de anılır. Oyundaki vitrinlerin içeriği temsilîdir.', SRC.kure, 5),
  mk('baski', 'Matbaa makineleri', 'Matbaa', [17, -4], [23, 3, -4],
    'Müze, restore edilmiş beş matbaa makinesini sergiler. Oyunda makinelerin biçimi temsilîdir.', SRC.wiki, 5),
  mk('kapanis', 'Kapanış ve müze', 'Bugün', [30, 31], [38, 5, 28],
    'Özelleştirme Yüksek Kurulu 1998\'de SEKA İzmit\'in kapatılmasına karar verdi. Alan sonradan müzeye dönüştürüldü ve 6 Kasım 2016\'da, fabrikanın 80. yılında açıldı. "Dünyanın en büyüğü" gibi sıfatlar müzenin kendi tanıtım dilidir; bağımsız olarak doğrulanmadı.', SRC.tez, 5.4),
];
export const START: { at: V2; yaw: number } = { at: [-22, 44], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -56, x1: 56, z0: -20, z1: 56 };
