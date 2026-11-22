/**
 * Sümela Manastırı (Maçka, Trabzon) — "Kayadaki Manastır": Altındere Vadisi, Karadağ'ın sarp kaya yüzü, kaya oyuğundaki manastır,
 * ormanlı patika, su kemeri ve 7 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z vadi yönü (kaya yüzü z = 0'da vadiye bakar), −z kayanın içi. Oyuncu ormandan kıvrılan patikayla kaya yüzünün dibine tırmanır,
 * su kemerinin altından geçip giriş kapısından oyuğa girer; avluda, kaya kilisesinin önünde ve freskli şapelin çevresinde dolaşır.
 * Vadi derinliği (gerçekte ~300 m), oyuğun ve yapıların ölçüleri, patikanın yeri TEMSİLÎDİR (docs/SUMELA.md).
 */
export type V2 = [number, number];
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ===================== kaya yüzü ve vadi ===================== */
export const LEDGE = 150;   // oyuğun tabanı
export const CLIFF_TOP = 232;
/** Kaya oyuğu (manastırın oturduğu yer): x aralığı ve derinliği */
export const NICHE = { x0: -38, x1: 38, z0: -22, z1: 0 };
/** Kaya yüzünün dibi: oyuğun önünde yamaç bu yüksekliğe kadar çıkar */
const BASE = 128;
const faceZ = (x: number) => 2.2 * Math.sin(x * 0.07) + 1.4 * Math.sin(x * 0.19 + 1);
export function inNiche(x: number, z: number, m = 0) { return x > NICHE.x0 + m && x < NICHE.x1 - m && z > NICHE.z0 + m && z < faceZ(x) - m; }   // oyuk kaya yüzüne kadar açık
/** Doğal arazi */
export function terrainBase(x: number, z: number): number {
  const fz = faceZ(x);
  if (inNiche(x, z)) return LEDGE;
  if (z < fz) return CLIFF_TOP + 8 * Math.sin(x * 0.03) + 5 * Math.sin(x * 0.11 + z * 0.07);   // kayanın üstü (yüz dik)
  const d = z - fz;   // kaya dibinden vadiye uzaklık
  const fall = BASE * Math.pow(1 - smooth(2, 230, d), 0.85);
  const ripple = Math.sin(x * 0.05 + z * 0.03) * 2.5 * smooth(5, 40, d);
  const side = Math.max(0, Math.abs(x) - 140) * 0.35;   // vadinin yan sırtları
  return fall + ripple + side;
}

/* ===================== patika ===================== */
/** Ormandan çıkan patika: kaya dibi boyunca yükselir, su kemerinin altından geçer, giriş kapısından oyuğa girer */
export const PATH_PTS: V2[] = [[214, 82], [160, 62], [196, 40], [130, 26], [86, 14], [56, 8], [44, 5.5], [37.5, 4], [33, -4]];
export const PATH_W = 2.8;
const PATH_LEN: number[] = [0];
for (let i = 1; i < PATH_PTS.length; i++) PATH_LEN.push(PATH_LEN[i - 1] + Math.hypot(PATH_PTS[i][0] - PATH_PTS[i - 1][0], PATH_PTS[i][1] - PATH_PTS[i - 1][1]));
const Y0 = terrainBase(...PATH_PTS[0]);
/** Patikada yükseklik: başta yamaç, sonda oyuk tabanı; arada boy oranıyla (son 12 m merdiven, düz çıkar) */
export function pathAt(x: number, z: number): { d: number; y: number } {
  const ds: number[] = [], ys: number[] = []; let dmin = Infinity; const L = PATH_LEN[PATH_LEN.length - 1];
  for (let i = 0; i < PATH_PTS.length - 1; i++) {
    const a = PATH_PTS[i], b = PATH_PTS[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)), d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)), s = (PATH_LEN[i] + Math.sqrt(L2) * t) / L;
    ds.push(d); ys.push(Y0 + (LEDGE - Y0) * Math.min(1, s / 0.97)); dmin = Math.min(dmin, d);
  }
  let w = 0, y = 0; for (let i = 0; i < ds.length; i++) { const k = Math.exp(-((ds[i] - dmin) ** 2) / 4); w += k; y += k * ys[i]; }
  return { d: dmin, y: y / w };
}
/** Görsel ve yürüme zemini: patika şeridi araziye yarma/dolgu olarak işlenir */
export function groundY(x: number, z: number): number {
  if (inNiche(x, z)) return LEDGE;
  const h = terrainBase(x, z), p = pathAt(x, z), w = 1 - smooth(PATH_W / 2, PATH_W / 2 + 6, p.d);
  return w > 0 && z >= faceZ(x) - 0.5 ? h + (p.y - h) * w : h;
}

/* ===================== manastır yapıları (oyukta) ===================== */
export interface Block { id: string; x0: number; x1: number; z0: number; z1: number; floors: number; kind: 'cephe' | 'kanat' | 'sapel' | 'kule' }
/** Ön cephe (vadiye bakan çok katlı yapı), doğu kanadı ve giriş, freskli şapel (kaya kilisesinin önünde) — yerleşim temsilî */
export const BLOCKS: Block[] = [
  { id: 'cephe', x0: -34, x1: 10, z0: -6.5, z1: -0.5, floors: 4, kind: 'cephe' },
  { id: 'kanat', x0: 16, x1: 29, z0: -6, z1: -0.5, floors: 3, kind: 'kanat' },   // doğusunda giriş geçidi
  { id: 'sapel', x0: 5, x1: 16, z0: -18, z1: -12.5, floors: 1, kind: 'sapel' },   // kaya kilisesinin yanında
  { id: 'kule', x0: 24, x1: 32, z0: -20, z1: -13, floors: 2, kind: 'kule' },
];
/** Kaya kilisesi: oyuğun arkasında kayaya oyulmuş mağara (içi yürünür) */
export const CAVE = { x0: -12, x1: 2, z0: -21.5, z1: -16.5 };
export const inBlock = (b: Block, x: number, z: number, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
/** Yürünebilir: patika şeridi (kaya yüzüne kadar) ya da oyuk içi (yapılar hariç; kilise mağarası dahil) */
export function walkable(x: number, z: number): boolean {
  if (inNiche(x, z, 0.4)) { for (const b of BLOCKS) if (inBlock(b, x, z, 0.35)) return false; return true; }
  if (x > CAVE.x0 + 0.4 && x < CAVE.x1 - 0.4 && z > CAVE.z0 - 0.1 && z < CAVE.z1 + 0.6) return true;
  const p = pathAt(x, z); return p.d < PATH_W / 2 - 0.2 && (z > faceZ(x) - 0.5 || inNiche(x, z, -0.6));
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}
/** Su kemeri: kaya yüzü boyunca, patikanın üstünden oyuğa su taşıyan kemerler (temsilî yer) */
export const AQUEDUCT = { x0: 40, x1: 112, y: LEDGE + 6, z: 1.2 };
export { faceZ };

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Sumela Monastery', url: 'https://en.wikipedia.org/wiki/Sumela_Monastery' },
  belleten: { title: 'Belleten — Sümela Manastırı üzerine (TTK)', url: 'https://www.belleten.gov.tr/tam-metin/3260/tur' },
  trt: { title: 'TRT World — Sumela Monastery', url: 'https://www.trtworld.com/article/12757391' },
  aa: { title: 'Anadolu Ajansı — Turkey reopens Sumela Monastery after 5-year restoration', url: 'https://aa.com.tr/en/culture/turkey-reopens-sumela-monastery-after-5-year-massive-restoration/2291792' },
  ntv: { title: 'NTV — Sümela Manastırı\'nın freskleri restorasyonla gün yüzüne çıkarılıyor', url: 'https://www.ntv.com.tr/n-life/gezi/galeri-sumela-manastirinin-freskleri-restorasyonla-gun-yuzune-cikariliyor,u9BwjydWNEObzCgb3F0CbA' },
  sabah: { title: 'Daily Sabah — Sümela Monastery reopened after 5-year restoration', url: 'https://www.dailysabah.com/turkey/sumela-monastery-in-turkeys-trabzon-reopened-after-5-year-restoration/news' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('vadi', 'Altındere Vadisi', 'Manzara', [160, 62], [168, terrainBase(168, 70) + 3, 70],
    'Manastır, Altındere Vadisi\'ni kaplayan ormanların yaklaşık 300 metre yukarısında, Karadağ\'ın sarp kaya yüzündeki bir oyuğa kurulmuştur. Vadiden bakınca kayaya asılı gibi görünür.', SRC.trt),
  mk('kemer', 'Su kemeri', 'Su', [76, 11.5], [76, AQUEDUCT.y + 2, AQUEDUCT.z],
    'Manastırın suyu, kaya yüzü boyunca uzanan kemerlerle taşınırdı. Restorasyonda tarihî su kemerleri, giriş ve merdivenler de onarıldı.', SRC.aa),
  mk('kurulus', 'Kuruluş rivayeti', 'Tarih', [33, -9], [23, LEDGE + 9, -3],
    'Rivayete göre manastırı MS 386\'da Atinalı iki keşiş, Barnabas ve Sophronios kurdu ve Meryem Ana\'ya adadı. Tarihçi Semavi Eyice, bu kuruluş efsanesinin sağlam bir dayanağı olmadığını belirtir; birçok Anadolu manastırının kuruluşu efsanelerde olduğundan daha geçtir.', SRC.belleten),
  mk('kilise', 'Kaya kilisesi', 'Kilise', [-5, -14], [-5, LEDGE + 5.5, -18],
    'Manastırın kalbi, kayaya oyulmuş mağara kilisesidir. Öteki yapılar, oyuğun içinde bu kilisenin çevresine zamanla eklenmiştir.', SRC.wiki),
  mk('fresk', 'Freskler', 'Sanat', [10.5, -9], [10.5, LEDGE + 3.6, -12.2],
    'Şapeldeki fresklerin büyük bölümü 18. yüzyılın başlarına tarihlenir ve farklı dönemlerden üç katman hâlinde yapılmıştır; en alttaki katman en nitelikli olanıdır. Restorasyon sırasında "Son Akşam Yemeği" sahnesi de gün yüzüne çıkarıldı. (Oyundaki fresk görüntüleri temsilîdir.)', SRC.ntv),
  mk('terk', 'Sessiz yıllar', 'Tarih', [-24, -10], [-24, LEDGE + 6, -6.5],
    'Manastır 1923\'te terk edildi. Uzun yıllar boş kalan yapılar bu dönemde büyük zarar gördü; fresklerin bir kısmı tahrip edildi.', SRC.wiki),
  mk('restorasyon', 'Kayalar ve restorasyon', 'Bugün', [22, -10.5], [14, LEDGE + 14, -9],
    'Artan kaya düşmeleri nedeniyle manastır 2015\'te ziyarete kapatıldı. Restorasyonda 4 bin ton kaya temizlendi, kaya kütleleri sağlamlaştırıldı ve 300 metrelik yürüyüş yolu yenilendi. Manastır 2020\'de kısmen, 2021\'de avlusuyla birlikte yeniden açıldı.', SRC.sabah),
];
export const START: { at: V2; yaw: number } = { at: [210, 80], yaw: Math.PI / 2 + 0.3 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -45, x1: 225, z0: -26, z1: 95 };
