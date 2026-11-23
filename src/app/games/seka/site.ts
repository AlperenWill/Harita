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

/* ===================== kâğıt hattı: beş bölüm ve kumanda panoları ===================== */
/** Hat batıdan doğuya akar: hamur kasası → elek → pres → kurutma → kalender ve sarıcı. Bölüm sınırları (x) makine gövdesi üzerinde, panolar
 * makinenin güneyinde (z ≈ 3,6). Bölümlerin sırası, kâğıt makinelerinin genel çalışma düzenidir; SEKA'daki makinenin kendi ayrıntıları TEMSİLÎDİR. */
export interface Station { id: string; name: string; x0: number; x1: number; panel: V2; text: string; source: { title: string; url: string } }
const PM = { title: 'Wikipedia — Paper machine', url: 'https://en.wikipedia.org/wiki/Paper_machine' };
export const STATIONS: Station[] = [
  { id: 'hamur', name: 'Hamur kasası', x0: -26, x1: -21, panel: [-23.5, 3.7], source: PM,
    text: 'Hat burada başlar. Büyük bölümü sudan oluşan çok seyreltik lif hamuru, hamur kasasından eleğin üstüne ince ve düzgün bir perde olarak akıtılır.' },
  { id: 'elek', name: 'Elek bölümü', x0: -21, x1: -9, panel: [-15, 3.7], source: PM,
    text: 'Sonsuz bir elek bandı hamuru taşırken su aşağı süzülür; lifler birbirine tutunarak ıslak bir tabaka oluşturur. Kâğıdın asıl doğduğu yer burasıdır.' },
  { id: 'pres', name: 'Pres bölümü', x0: -9, x1: -3, panel: [-6, 3.7], source: PM,
    text: 'Islak tabaka keçelerin arasında merdanelerle sıkıştırılır; böylece suyun bir kısmı ısıtmaya gerek kalmadan sıkılarak çıkarılır.' },
  { id: 'kurutma', name: 'Kurutma silindirleri', x0: -3, x1: 10, panel: [3.5, 3.7], source: PM,
    text: 'Kâğıt, içi buharla ısıtılan büyük silindirlerin üstünden sırayla geçer; kalan su buharlaşır. Hattın en uzun bölümü genellikle burasıdır.' },
  { id: 'rulo', name: 'Kalender ve sarıcı', x0: 10, x1: 14, panel: [12, 3.7], source: PM,
    text: 'Üst üste dizili merdaneler kâğıdın yüzeyini düzleştirir; ardından kâğıt büyük bir rulo hâlinde sarılır. Hat tamamlandı!' },
];
/** Panoların gövdesi (yürünmez) */
export const PANEL_HALF: V2 = [0.6, 0.35];
export const STATION_REACH = 2.6;
export function nearestStation(x: number, z: number): Station | null {
  let best: Station | null = null, bd = Infinity;
  for (const s of STATIONS) { const d = Math.hypot(x - s.panel[0], z - s.panel[1]); if (d < STATION_REACH && d < bd) { bd = d; best = s; } }
  return best;
}
/** Sırayla çalıştırma kuralı: `running` çalışan bölüm sayısı. Dönüş: 'start' (sıradaki), 'again' (zaten çalışıyor), 'blocked' (önce önceki çalışmalı) */
export function stationAction(i: number, running: number): 'start' | 'again' | 'blocked' { return i < running ? 'again' : i === running ? 'start' : 'blocked'; }

export function walkable(x: number, z: number): boolean {
  if (STATIONS.some((s) => Math.abs(x - s.panel[0]) < PANEL_HALF[0] + 0.3 && Math.abs(z - s.panel[1]) < PANEL_HALF[1] + 0.3)) return false;
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
