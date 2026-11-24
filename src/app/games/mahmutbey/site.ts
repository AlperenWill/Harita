/**
 * Kasaba Köyü Mahmut Bey Camii (Kastamonu) — "Çivisiz Cami": köy meydanı, ahşap son cemaat yeri, ahşap direkli harim (kalem işi tavan,
 * mahfil, mihrap, minber), köy evleri ve 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: −z kıble (mihrap duvarı), +z giriş (son cemaat yeri, köy meydanı). Oyuncu köy yolunda yürür, son cemaat yerinden harime girer,
 * direklerin arasında dolaşır. Ölçüler, direk sayısı ve iç düzen TEMSİLÎDİR (docs/MAHMUTBEY.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

export const FLOOR = 0.22;
/** Harim (ibadet mekânı) iç sınırı ve dış duvar */
export const HALL = { x0: -7, x1: 7, z0: -8, z1: 6 };
export const WALL_T = 0.9;
/** Son cemaat yeri (ahşap revak) */
export const PORCH = { x0: -7.9, x1: 7.9, z0: 6.9, z1: 10 };
/** Ahşap direkler (iki sıra; sayı temsilî) */
export const POSTS: V2[] = [[-2.6, -3.6], [2.6, -3.6], [-2.6, 1.6], [2.6, 1.6]];
/** Mahfil: giriş duvarı boyunca ahşap üst kat (altından geçilir) */
export const MAHFIL = { z0: 3.2, z1: 6, y: 2.8 };
/** Mihrap ve minber (mihrap güney duvarında; minber sağında) */
export const MIHRAB: V2 = [0, -8];
export const MINBAR = { x0: 2.2, x1: 3.2, z0: -7.6, z1: -4.2 };
/* ===================== kalem işini tamamla ===================== */
/** Tavanda solmuş üç bezeme gözü (temsilî). Gözlerin motif rengi bir düzene uyar: renk = (i + 2j) mod 3 → lacivert, yeşil, altın.
 * Oyuncu solmuş gözün altında durup komşulara bakarak eksik rengi seçer. */
export const MOTIF_NAMES = ['Lacivert', 'Yeşil', 'Altın'];
export const motifAt = (i: number, j: number) => (((i + 2 * j) % 3) + 3) % 3;
/** Tavan ızgarası: x yönünde 0,95 m'lik kiriş aralıkları, z yönünde 1,4 m'lik gözler */
export const GRID = { x0: HALL.x0 + 0.5, dx: 0.95, z0: HALL.z0 + 0.7, dz: 1.4 };
export const cellCenter = (i: number, j: number): V2 => [GRID.x0 + (i + 0.5) * GRID.dx, GRID.z0 + (j + 0.5) * GRID.dz];
export const FADED: { id: string; i: number; j: number }[] = [{ id: 'g1', i: 3, j: 3 }, { id: 'g2', i: 10, j: 5 }, { id: 'g3', i: 1, j: 4 }];
export const FADED_REACH = 1.2;
export function nearestFaded(x: number, z: number, done: string[]) { let b: (typeof FADED)[number] | null = null, d0 = Infinity;
  for (const f of FADED) { if (done.includes(f.id)) continue; const [cx, cz] = cellCenter(f.i, f.j), d = Math.hypot(x - cx, z - cz); if (d < FADED_REACH && d < d0) { d0 = d; b = f; } } return b; }
/** Köy alanı (yürünebilir dış alan) */
export const VILLAGE = { x0: -60, x1: 60, z0: -40, z1: 70 };
/** Köy evleri (yürünmez) */
export interface House { x: number; z: number; w: number; d: number; yaw: number; floors: number }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const HOUSES: House[] = (() => { const r = rng(37), out: House[] = [];
  for (let i = 0; i < 400 && out.length < 22; i++) { const x = -55 + r() * 110, z = -35 + r() * 100, w = 7 + r() * 4, d = 6 + r() * 3;
    if (Math.abs(x) < 16 && z > -16 && z < 22) continue;   // caminin çevresi ve meydan
    if (Math.abs(x - 4) < 4.5) continue;   // köy yolu
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (Math.max(o.w, o.d) + Math.max(w, d)) / 2 + 3)) continue;
    out.push({ x, z, w, d, yaw: (r() - 0.5) * 0.5, floors: r() < 0.6 ? 2 : 1 }); }
  return out; })();
/** Mezarlık (caminin doğusunda, alçak çitle çevrili; içine girilmez) */
export const CEMETERY = { x0: 9.5, x1: 15.5, z0: -14, z1: 0 };
const DOOR = 1.1;
function inside(x: number, z: number): boolean {
  if (inR(HALL, x, z, 0.3)) { if (POSTS.some((p) => Math.hypot(x - p[0], z - p[1]) < 0.6)) return false; if (inR(MINBAR, x, z, -0.3)) return false; return true; }
  if (Math.abs(x) < DOOR - 0.2 && z >= HALL.z1 - 0.3 && z <= HALL.z1 + WALL_T + 0.3) return true;   // giriş kapısı
  return false;
}
const inBuilding = (x: number, z: number, m = 0) => inR({ x0: HALL.x0 - WALL_T, x1: HALL.x1 + WALL_T, z0: HALL.z0 - WALL_T, z1: HALL.z1 + WALL_T }, x, z, -m);
export function walkable(x: number, z: number): boolean {
  if (inBuilding(x, z, 0.35)) return inside(x, z);
  if (inR(CEMETERY, x, z, -0.6)) return false;
  for (const h of HOUSES) { const c = Math.cos(h.yaw), s = Math.sin(h.yaw), dx = x - h.x, dz = z - h.z, u = dx * c - dz * s, v = dx * s + dz * c; if (Math.abs(u) < h.w / 2 + 0.5 && Math.abs(v) < h.d / 2 + 0.5) return false; }
  if (inR(PORCH, x, z) && [-7.4, -2.6, 2.6, 7.4].some((px) => Math.hypot(x - px, z - (PORCH.z1 - 0.4)) < 0.45)) return false;   // revak direkleri
  return inR(VILLAGE, x, z, 1);
}
/** Arazi: köy hafif eğimli; cami ve meydan düz */
export function terrainBase(x: number, z: number): number { const flat = Math.max(0, Math.hypot(x, z - 4) - 20); return flat * 0.06 * (0.6 + 0.4 * Math.sin(x * 0.05 + z * 0.03)); }
export function groundY(x: number, z: number): number { if (inBuilding(x, z, 0.35) && inside(x, z)) return FLOOR; if (inR(PORCH, x, z)) return FLOOR; return terrainBase(x, z); }
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
  ktb: { title: 'Kastamonu İl Kültür ve Turizm Müdürlüğü — Kasaba Camii broşürü', url: 'https://kastamonu.ktb.gov.tr/Eklenti/49682,kasaba-camii-brosurpdf.pdf' },
  kure: { title: 'Küre Ansiklopedisi — Mahmutbey Camii (Çivisiz Camii)', url: 'https://kureansiklopedi.com/tr/detay/mahmutbey-camii-civisiz-camii-9bfbc' },
  tez: { title: 'YÖK Açık Bilim — Kastamonu Kasaba Köy Mahmud Bey Camii', url: 'https://acikbilim.yok.gov.tr/handle/20.500.12812/466539' },
  unesco: { title: 'UNESCO — Karar 45 COM 8B.46 (Wooden Hypostyle Mosques of Medieval Anatolia)', url: 'https://whc.unesco.org/en/decisions/8427' },
  timeturk: { title: 'Timeturk — Çivisiz cami 650 yıldır ayakta', url: 'https://www.timeturk.com/tr/2011/11/04/civisiz-cami-650-yildir-ayakta.html' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.8): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('banisi', 'Candaroğlu Mahmut Bey', 'Tarih', [3.2, 13], [0, 5.4, 10.2],
    'Cami 1366\'da Candaroğulları Beyliği döneminde Mahmut Bey tarafından yaptırıldı. Kaynaklar Mahmut Bey\'i Kötürüm Bayezid\'in kardeşi ya da Âdil Bey\'in oğlu olarak tanıtır.', SRC.ktb),
  mk('civisiz', '"Çivisiz Cami"', 'Yapım', [-5.2, 8.4], [-7.4, 2.6, 9.6],
    'Caminin ahşap öğeleri çivi kullanılmadan, birbirine geçme tekniğiyle birleştirilmiştir. Halk arasında bu yüzden "Çivisiz Cami" diye anılır.', SRC.kure),
  mk('direk', 'Ahşap direkler', 'Taşıyıcı', [0, -1], [2.6, 3.4, 1.6],
    'Düz ahşap tavanı, harimin içindeki ahşap direkler ve kirişler taşır. Bu "çok direkli" (hipostil) ahşap sistem, 13–14. yüzyıl Anadolu ahşap yapıları arasında sıra dışı bir örnek sayılır.', SRC.tez),
  mk('kalem', 'Kalem işi tavan', 'Bezeme', [-4, -2], [-4, 5.4, -2],
    'Tavanı, kirişleri ve ahşap yüzeyleri kalem işi boyalı bezemelerle süslüdür. Bu bezemeler, dönemin ahşap camileri içinde iyi korunmuş örneklerdendir. (Oyundaki desenler temsilîdir.)', SRC.tez),
  mk('unesco', 'Dünya Mirası', 'UNESCO', [0, -5.4], [0, 2.6, -7.9],
    'Mahmut Bey Camii, 2023\'te "Ortaçağ Anadolusu\'nun Ahşap Hipostil Camileri" adıyla UNESCO Dünya Mirası Listesi\'ne giren beş camiden biridir. Beş bileşen içinde kentsel sit alanı dışında, bir köyde bulunan tek camidir.', SRC.unesco),
  mk('onarim', 'Onarım', 'Koruma', [-9, 13], [-7.9, 4.8, 6.9],
    'Cami 2007\'de Vakıflar Genel Müdürlüğü tarafından onarıldı. Ahşap yapının korunması için düzenli bakım gerekir.', SRC.timeturk),
];
export const START: { at: V2; yaw: number } = { at: [4, 50], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -62, x1: 62, z0: -42, z1: 72 };
export { inBuilding };
