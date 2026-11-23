/**
 * Kyzikos Antik Kenti (Balıkesir) — "Hadrian'ın Tapınağı": Kapıdağ kıstağındaki ovada tapınak podyumu (kırık sütunlar, devasa başlık, düşmüş kolon
 * kütükleri), batıda toprağa gömülü amfiteatr çanağı, kazı çukurları ve 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (yol ve giriş), −z kuzey (Kapıdağ yamaçları). Ölçüler, sütun sayısı ve yerleşim TEMSİLÎDİR (docs/KYZIKOS.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Yürünebilir alan */
export const AREA: Rect = { x0: -70, x1: 40, z0: -50, z1: 50 };
/** Tapınak podyumu (üstü yürünür; güneyden rampayla çıkılır) ve rampa */
export const PODIUM: Rect = { x0: -22, x1: 22, z0: -24, z1: 4 };
export const PODIUM_H = 1.2;
export const RAMP = { x0: -6, x1: 6, z0: 4, z1: 10 };
/** Amfiteatr çanağı (elips): merkez ve yarıçaplar; arena zemini çukurdadır */
export const AMPHI = { c: [-48, 10] as V2, a: 16, b: 12, depth: 2.5 };
/** Yürünmeyen yapılar: devasa başlık bloğu, kazı çukurları */
export const CAPITAL: Rect = { x0: -12, x1: -6, z0: -14, z1: -10 };
export const TRENCHES: Rect[] = [{ x0: -36, x1: -28, z0: -16, z1: -8 }, { x0: 28, x1: 36, z0: -18, z1: -10 }];
/** Ayakta kalan sütunlar ve düşmüş kolon kütükleri (yürünmez daireler) */
export const COLUMNS: V2[] = [[14, -20], [14, -15], [-16, -20], [-16, -17], [4, -22], [-2, -22]];
export const DRUMS: V2[] = [[8, -6], [10, -4], [-14, -4], [2, -8]];
export const OBST_R = 0.95;
/** Çıpa taşı (Argonot anlatısı), meydanın güneydoğusunda; yürünmez */
export const ANCHOR = { c: [30, 30] as V2, r: 1.4 };

const sm = (t: number) => Math.max(0, Math.min(1, t));
export function groundY(x: number, z: number): number {
  let y = 0;
  if (x > PODIUM.x0 && x < PODIUM.x1 && z > PODIUM.z0 && z < PODIUM.z1) y = PODIUM_H;
  else if (x >= RAMP.x0 && x <= RAMP.x1 && z >= RAMP.z0 && z <= RAMP.z1) y = PODIUM_H * (RAMP.z1 - z) / (RAMP.z1 - RAMP.z0);
  const d = Math.hypot((x - AMPHI.c[0]) / AMPHI.a, (z - AMPHI.c[1]) / AMPHI.b);
  if (d < 1) y -= AMPHI.depth * (1 - d * d);
  return y;
}
export function walkable(x: number, z: number): boolean {
  if (!inR(AREA, x, z, 0.4)) return false;
  if (inR(CAPITAL, x, z, -0.5)) return false;
  if (TRENCHES.some((t) => inR(t, x, z, -0.5))) return false;
  if (Math.hypot(x - ANCHOR.c[0], z - ANCHOR.c[1]) < ANCHOR.r + 0.4) return false;
  for (const c of [...COLUMNS, ...DRUMS]) if (Math.hypot(x - c[0], z - c[1]) < OBST_R + 0.35) return false;
  // rampanın yan kenarları dik: iki yanına yürünmez şerit
  if (z > RAMP.z0 - 0.2 && z < RAMP.z1 + 0.2 && ((x > RAMP.x0 - 0.8 && x < RAMP.x0 - 0.05) || (x > RAMP.x1 + 0.05 && x < RAMP.x1 + 0.8))) return false;
  // podyumun kenarı (dik): yalnızca güneydeki rampa ağzından geçilir
  const inPod = x > PODIUM.x0 && x < PODIUM.x1 && z > PODIUM.z0 && z < PODIUM.z1;
  if (inPod && !inR(PODIUM, x, z, 0.6)) return x > RAMP.x0 && x < RAMP.x1 && z > PODIUM.z1 - 0.6;
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
  wiki: { title: 'Wikipedia — Kyzikos', url: 'https://en.wikipedia.org/wiki/Kyzikos' },
  kure: { title: 'Küre Ansiklopedisi — Kyzikos', url: 'https://kureansiklopedi.com/tr/detay/kyzikos-3d75d' },
  dergi: { title: 'DergiPark — Kyzikos, Hellespontus\'da bir eyalet merkezi', url: 'https://dergipark.org.tr/en/pub/ataunigsed/issue/2584/33252' },
  sabah: { title: 'Daily Sabah — Cyzicus: World\'s largest temple column capital', url: 'https://www.dailysabah.com/turkiye/cyzicus-worlds-largest-temple-column-capital/news' },
  inside: { title: 'Turkey From the Inside — A lost metropolis', url: 'https://www.turkeyfromtheinside.com/?p=1753' },
  birlik: { title: 'Yeni Birlik — Kyzikos Antik Kentinde kazı dönemi başladı', url: 'https://www.gazetebirlik.com/kultur-sanat/kyzikos-antik-kentinde-kazi-donemi-basladi/182015' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.8): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('kent', 'Kıstaktaki liman kenti', 'Kent', [0, 40], gy(0, 40, 4.6),
    'Kyzikos, Kapıdağ Yarımadası\'nın anakarayla birleştiği kıstakta kuruldu. Kuruluşu Miletos kolonisi olarak M.Ö. 756 gibi bir tarihe bağlanır; kaynaklar kuruluş için 8. yüzyılı gösterir. Antik yazarlar, limanlarında 200\'den fazla geminin barındığını yazar.', SRC.dergi, 6),
  mk('hadrian', 'Hadrian Tapınağı', 'Tapınak', [-9, -7], gy(-9, -7, 4.2),
    'Hadrian Tapınağı Korinth düzeninde, çift sıra sütunlu (dipteros) bir yapı olarak tanımlanır; Anadolu\'nun en büyük Korinth düzenli tapınaklarından sayılır. Bir haberde boyutları yaklaşık 116 × 62 m diye tahmin edilir; oyundaki tapınak bundan küçük ve temsilîdir.', SRC.sabah, 5),
  mk('deprem', 'Deprem ve imparator', 'Tarih', [12, -2], gy(12, -2, 4.2),
    'Kentin imparator Hadrian\'la ilişkisi bir depremin ardından güçlenir. Depremin yılı kaynaklarda farklı verilir (MS 117 ya da 123). Hadrian\'ın ziyareti MS 124\'e bağlanır; kentin onarımına ve imparator tapınağına katkı sağladığı aktarılır.', SRC.dergi, 5),
  mk('amfi', 'Amfiteatr', 'Gösteri', [-48, 10], gy(-48, 10, 3.6),
    'Anadolu\'da bulunan üç amfiteatrdan en sağlamının Kyzikos\'ta olduğu söylenir. Kalıntılar bugün bataklığımsı bir arazide yer alır; oyundaki çanağın ölçüsü temsilîdir.', SRC.dergi, 6),
  mk('argonot', 'Argonotların çıpa taşı', 'Efsane', [30, 27], gy(30, 27, 3.2),
    'Apollonios Rhodios, Argonotların bu yarımadada durduğunu ve bir çıpa taşı bıraktığını anlatır. Bu anlatı edebidir; bugünkü Erdek ile ilişkilendirilir, arkeolojik bir kanıt değildir.', SRC.inside, 4.6),
  mk('kazi', 'Kazı çalışmaları', 'Arkeoloji', [-32, -5], gy(-32, -5, 3.2),
    'Hadrian Tapınağı\'nda ilk dönem kazılar 1989–1996 arasında yapıldı; ikinci dönem 2006\'da başladı. Alanın büyük bölümü özel mülkiyette olduğu için kazılar büyük ölçüde tapınakla sınırlı kaldı. Çalışmalar Bandırma Onyedi Eylül Üniversitesi ekibiyle sürüyor.', SRC.birlik, 5),
];
export const START: { at: V2; yaw: number } = { at: [0, 46], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -74, x1: 44, z0: -54, z1: 54 };
export { sm, inR };
