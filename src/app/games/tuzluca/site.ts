/**
 * Iğdır — Tuzluca Tuz Mağaraları: "Serin Nefes" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Oyuncu sıcak ovadan Tuz Dağı'nın yamacındaki girişe yürür; tünelden ayaklı tuz galerilerine iner,
 * en dipteki terapi salonunda oturup nefes ritmini tutturur. Termometre içeri girdikçe düşer. Galerilerin düzeni, ölçüleri ve
 * dış sıcaklık TEMSİLÎDİR; içerinin yaklaşık 12 °C olduğu haberlerde yazılır (docs/TUZLUCA.md).
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -40, x1: 40, z0: -102, z1: 46 };
/** Giriş tüneli (yamacın içine) */
export const TUNNEL = { w: 4, z0: -21.5, z1: 0, h: 3.6 };
/**
 * Kemerli salonlar: düzenli ayaklar (P×P) arasında W genişliğinde koridorlar; koridorların üstü beşik tonoz (Hs yükseklikte başlar,
 * yarıçap W/2), kesişimlerin üstü tepe yüksekliğinde. Bir koridordan yandakine bakınca açıklık kemer biçiminde görünür.
 */
export const VAULT = { W: 9, P: 7, Hs: 4.6 };
export const CROWN = VAULT.Hs + VAULT.W / 2;
export const COR_X = [-32, -16, 0, 16, 32], COR_Z = [-26, -42, -58, -74];
export const PILLAR_X = [-24, -8, 8, 24], PILLAR_Z = [-34, -50, -66], PILLAR_HALF = VAULT.P / 2;
export const GALLERY = { x0: -36.5, x1: 36.5, z0: -78.5, z1: -21.5 };
/** Salona geçit (küçük kemer) ve terapi salonu (büyük beşik tonoz) */
export const PASS = { w: 6, z0: -82, z1: -78.5, Hs: 2.6 };
export const HALL = { x0: -14, x1: 14, z0: -100, z1: -82, Hs: 3.2 };
export const BENCHES: { x: number; z: number; w: number }[] = [-7, 7].flatMap((x) => [-90, -95].map((z) => ({ x, z, w: 6 })));
export const SEAT_AT: V2 = [0, -92];
/** Galerideki piknik masaları (fotoğraftaki gibi duvar diplerinde) */
export const TABLES: V2[] = [[-34.2, -42], [34.2, -58], [-16, -76.4], [16, -23.6]];

export const inPillar = (x: number, z: number, pad = 0) => PILLAR_X.some((px) => PILLAR_Z.some((pz) => Math.abs(x - px) < PILLAR_HALF + pad && Math.abs(z - pz) < PILLAR_HALF + pad));
const inTable = (x: number, z: number, p: number) => TABLES.some(([tx, tz]) => Math.abs(x - tx) < 1.1 + p && Math.abs(z - tz) < 1.1 + p);
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  const p = 0.4;
  if (z > 0.6) return true;   // dışarıdaki ova
  if (z > TUNNEL.z0 - 0.3) return Math.abs(x) < TUNNEL.w / 2 - p;   // tünel
  if (z > GALLERY.z0 + p) return x > GALLERY.x0 + p && x < GALLERY.x1 - p && (z < GALLERY.z1 - p || Math.abs(x) < TUNNEL.w / 2 - p) && !inPillar(x, z, p) && !inTable(x, z, p);
  if (z > PASS.z0 - 0.3) return Math.abs(x) < PASS.w / 2 - p;   // salona geçit
  if (z > HALL.z0 + p && x > HALL.x0 + p && x < HALL.x1 - p) return !BENCHES.some((b) => Math.abs(x - b.x) < b.w / 2 + p && Math.abs(z - b.z) < 0.4 + p);
  return false;
}
export const groundY = (x: number, z: number) => { void x; void z; return 0; };
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }
export const isInside = (z: number) => z < -1.5;

/** Termometre: dışarısı sıcak bir yaz günü (temsilî), tünelde düşer, galerinin derinlerinde ~12 °C */
export const TEMP = { out: 34, tunnelEnd: 20, deep: 12, deepZ: -62 };
export function temperature(z: number): number {
  if (z > 0) return TEMP.out;
  if (z > TUNNEL.z0) return TEMP.out + (TEMP.tunnelEnd - TEMP.out) * (z / TUNNEL.z0);
  if (z > TEMP.deepZ) return TEMP.tunnelEnd + (TEMP.deep - TEMP.tunnelEnd) * ((z - TUNNEL.z0) / (TEMP.deepZ - TUNNEL.z0));
  return TEMP.deep;
}

/* ===================== nefes ritmi ===================== */
/** Nefes al (basılı tut) – nefes ver (bırak). Her döngüde iki evrede doğru davranılan sürenin oranı ≥ ok ise döngü iyi sayılır. */
export const BREATH = { inhale: 3, exhale: 3, cycles: 4, need: 3, ok: 0.7 };
export function breathPhase(t: number): { cycle: number; phase: 'in' | 'out'; k: number } {
  const T = BREATH.inhale + BREATH.exhale, cycle = Math.floor(t / T), u = t - cycle * T;
  return u < BREATH.inhale ? { cycle, phase: 'in', k: u / BREATH.inhale } : { cycle, phase: 'out', k: (u - BREATH.inhale) / BREATH.exhale };
}
/** Bir döngünün puanı: in = basılıyken geçen sürenin oranı, out = bırakılmışken geçen sürenin oranı */
export const cycleGood = (inFrac: number, outFrac: number) => inFrac >= BREATH.ok && outFrac >= BREATH.ok;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Tuzluca', url: 'https://en.wikipedia.org/wiki/Tuzluca' },
  jeo: { title: 'DergiPark — Sürkit tuz işletmesi mağaralarının sağlık ve turizm açısından incelenmesi', url: 'https://dergipark.org.tr/en/download/article-file/715688' },
  kure: { title: 'Küre Ansiklopedisi — Tuzluca Tuz Mağaraları', url: 'https://kureansiklopedi.com/tr/detay/tuzluca-tuz-magaralari-9c75e' },
  ht: { title: 'Habertürk — Yerin altındaki Iğdır tuz mağaraları sıcaktan bunalanları serinletiyor', url: 'https://www.haberturk.com/igdir-haberleri/38702462-yerin-altindaki-igdir-tuz-magaralari-sicaktan-bunalanlari-serinletiyor' },
  trt: { title: 'TRT Haber — Iğdır\'daki Tuz Terapi Merkezi', url: 'https://www.trthaber.com/haber/guncel/igdirdaki-tuz-terapi-merkezi-astima-sifa-sicaktan-bunalana-dogal-klima-oluyor-865962.html' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('giris', 'Tuzluca\'nın adı', 'Giriş', [0, 4], [0, 4.6, 0.6],
    'İlçe adını buradaki tuz yataklarından alır. Tuz madenlerinin en az Orta Çağ\'dan beri bilindiği yazılır.', SRC.wiki, 3.4),
  mk('katman', 'Tuz katmanları', 'Jeoloji', [-34, -50], [-36, 2.2, -50],
    'Kaya tuzu, kapalı ve sığ deniz ortamlarında suyun buharlaşmasıyla çökelen katmanlardan oluşur. Tuzluca tuzunun yaşı kaynaklarda farklı verilir (Geç Miyosen ya da Erken Pliyosen). (Duvardaki bantlar temsilîdir.)', SRC.jeo),
  mk('galeri', 'Tuzdan açılan galeriler', 'Maden', [16, -42], [16, 6.5, -42],
    'Bugün gezilen galeriler, tuz çıkarıldıkça açıldı. Bölgede eski ve yeni tuz işletmeleri için açılmış çok sayıda galeri ve mağara vardır. (Ayakların, kemerlerin düzeni ve ölçüleri temsilîdir.)', SRC.jeo),
  mk('serin', 'Doğal klima', 'Sıcaklık', [-32, -72], [-32, 2.4, -76],
    'Haberlerde mağaranın içinin, dışarısı çok ısındığında bile en fazla 12 °C olduğu yazılır. Yazın serinlemek isteyenler de buraya gelir. (Oyundaki dış sıcaklık temsilîdir.)', SRC.ht),
];
export const CARD_NEFES = { id: 'nefes', name: 'Tuz Terapi Merkezi', kicker: 'Terapi salonu',
  text: 'Merkez, Iğdır Valiliği, Iğdır Üniversitesi ve Tuzluca Kaymakamlığı\'nın projesiyle eski bir tuz üretim alanında 2021\'de açıldı. Astım, bronşit ve KOAH hastalarının geldiği anlatılır. Bu bir haber anlatımıdır, tıbbi tavsiye değildir.', source: SRC.trt };
export const START: { at: V2; yaw: number } = { at: [0, 30], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const atSeat = (x: number, z: number) => Math.hypot(x - SEAT_AT[0], z - SEAT_AT[1]) < 2.2;
