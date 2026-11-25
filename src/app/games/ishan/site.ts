/**
 * Artvin — İşhan Manastırı: "Pencereden Bak" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Köyün ortasında haç planlı kilise (dıştan ~35 × 20,75 m; kaynaktan), ortada dört payeye oturan kubbe;
 * güney, batı ve kuzeyde sonradan eklenen giriş yapıları; güneybatıda küçük şapel. Kilise kazı buluntuları yüzünden kapalıdır:
 * pencere altlarındaki taşlara çıkıp içeri bakılır (üç pencere). Plan ölçüleri dışındaki her şey TEMSİLÎDİR.
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -45, x1: 45, z0: -34, z1: 34 };
/** Haç plan: batı-doğu gövde ve kuzey-güney kollar; geçiş (kubbe) merkezi */
export const CROSS = { x0: -17.5, x1: 17.5, hw: 5, tx0: -2, tx1: 8, thw: 10.375, cx: 3 };
export const DOME = { r: 4.4, drum0: 13, drum1: 19, top: 23 };
export const PORCHES: [number, number, number, number][] = [[-15, 5, -7, 8.6], [-15, -8.6, -7, -5], [-21.5, -3.5, -17.5, 3.5]];   // [x0, z0, x1, z1]
export const CHAPEL: [number, number, number, number] = [-31, 12, -24, 18];
export const HOUSES: [number, number, number, number][] = [[24, -24, 32, -17], [-38, -26, -30, -19], [27, 18, 35, 26], [-40, 20, -34, 28]];
const inRect = (x: number, z: number, r: [number, number, number, number], p: number) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p;
export const inChurch = (x: number, z: number, p = 0) => (x > CROSS.x0 - p && x < CROSS.x1 + p && Math.abs(z) < CROSS.hw + p) || (x > CROSS.tx0 - p && x < CROSS.tx1 + p && Math.abs(z) < CROSS.thw + p);
export function walkable(x: number, z: number): boolean {
  const p = 0.4;
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (inChurch(x, z, p)) return false;
  if (PORCHES.some((r) => inRect(x, z, r, p)) || inRect(x, z, CHAPEL, p) || HOUSES.some((r) => inRect(x, z, r, p))) return false;
  return true;
}
/** Kilise çevresi düz; dışarıda vadi yamacı hafifçe yükselir (yürüme alanında en çok ~1 m) */
export const groundY = (x: number, z: number) => Math.max(0, Math.hypot(x / 1.3, z) - 24) * 0.08;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }

/* ===================== pencereler ===================== */
export interface Peek { id: string; name: string; kicker: string; stand: V2; win: [number, number, number]; cam: [number, number, number]; yaw: number; pitch: number; text: string }
export const PEEKS: Peek[] = [
  { id: 'payeler', name: 'Dört paye ve kazı', kicker: 'Güney penceresi', stand: [CROSS.cx, CROSS.thw + 1.3], win: [CROSS.cx, 3.4, CROSS.thw], cam: [CROSS.cx, 3.3, CROSS.thw - 0.8], yaw: 0, pitch: -0.18,
    text: 'Kubbe, ortada serbest duran dört payeye oturur. Restorasyondan sonra zeminde arkeolojik buluntular çıktığı için kilise ziyarete kapalı tutulmuştur; ziyaretçiler içeriyi pencereden görür. (Kazı alanının görünüşü temsilîdir.)' },
  { id: 'apsis', name: 'Apsis', kicker: 'Doğu kolunun penceresi', stand: [10, CROSS.hw + 1.3], win: [10, 3.4, CROSS.hw], cam: [10, 3.3, CROSS.hw - 0.8], yaw: -1.06, pitch: 0.1,
    text: 'Apsis yapının en eski bölümü sayılır; bir görüşe göre Bana kilisesi örnek alınarak yapılmıştır. Yarım daire boyunca sütunlar dizilir. (Sütun sayısı ve düzeni temsilîdir.)' },
  { id: 'kubbe', name: 'Kubbe freski', kicker: 'Kuzey penceresi · yakınlaştırılmış görünüm', stand: [-3, -CROSS.hw - 1.3], win: [-3, 3.4, -CROSS.hw], cam: [CROSS.cx - 2.5, 1.7, -2.5], yaw: -2.356, pitch: 1.3,
    text: 'Kubbenin içinde, haçın göğe yükselişini anlatan bir fresk vardır: melekler mücevherli bir haçı taşır. Duvarlarda ve resimlerde çok sayıda yazıt bulunur. (Freskin çizimi temsilîdir.)' },
];
export const nearPeek = (x: number, z: number, seen: string[]) => PEEKS.findIndex((p) => !seen.includes(p.id) && Math.hypot(x - p.stand[0], z - p.stand[1]) < 1.4);

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
export const SRC = {
  wiki: { title: 'Wikipedia — Ishkhani', url: 'https://en.wikipedia.org/wiki/Ishkhani' },
  tsu: { title: 'TSU Art History — Ishkhani Cathedral of Apostles', url: 'https://arthistory.tsu.ge/murals/architecture/ishkhani-cathedral-of-apostles' },
  kure: { title: 'Küre Ansiklopedisi — İşhan Kilisesi', url: 'https://kureansiklopedi.com/tr/detay/ishan-kilisesi-33e38' },
  ht: { title: 'Habertürk — Kapalı kiliseye taş üzerinden ziyaret', url: 'https://www.haberturk.com/kapali-kiliseye-tas-uzerinden-ziyaret-3702056' },
  hdn: { title: 'Hürriyet Daily News — Artvin awaits tourism surge after restoration of church', url: 'https://hurriyetdailynews.com/artvin-awaits-tourism-surge-after-restoration-of-church-57273' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('plan', 'Haç planlı kilise', 'Plan', [-12, 12.5], [-12, 3.4, 9.4],
    'Kilise haç planlıdır; dıştan yaklaşık 35 × 20,75 m\'dir. Güney, batı ve kuzey cephelerine 12. ile 14. yüzyıllar arasında giriş yapıları eklenmiştir.', SRC.wiki, 3.6),
  mk('tarih', 'Tarihler çelişiyor', 'Tarih', [-24, 0], [-22.4, 3, 0],
    'Kuruluşu kaynaklarda 7. yüzyıla, hatta 6. yüzyıla dayandırılır; bir kaynak yapımın 955\'te başlayıp 1027\'de bittiğini yazar. Bugünkü biçimini genellikle 1032\'de Başpiskopos Anton\'un yaptırdığı yenilemeyle aldığı kabul edilir.', SRC.kure, 3.6),
  mk('sapel', 'Şapel yazıtı', 'Şapel', [-27.5, 10.5], [-27.5, 3, 11.6],
    'Kilisenin güneybatısındaki şapelin girişindeki Gürcüce yazıta göre, Kral I. Gurgen (öl. 1008) şapeli Meryem Ana\'ya adamıştır. (Şapelin görünüşü temsilîdir.)', SRC.wiki, 3),
  mk('koruma', 'Restorasyon', 'Bugün', [20, 7], [17.8, 2.6, 6],
    'Kilise 1987\'den beri koruma altındadır. Türkiye ile Gürcistan arasındaki protokolle 2012\'de restorasyon başladı. Bir kaynağa göre kilise 17. yüzyıla kadar katedral olarak kullanıldı.', SRC.hdn, 3.4),
];
export const START: { at: V2; yaw: number } = { at: [6, 26], yaw: 0.15 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
