/**
 * Gümüşhane — Santa Harabeleri: "Sisteki Yedi Kilise" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Ladin ormanlı, sisli bir vadi; yamaçlara dağılmış yedi mahalle, her birinde tek katlı yıkık taş evler ve
 * bir kilise kalıntısı. Mekanik: sisin içinde yedi kiliseyi bulmak; her bulunan kilisede sis biraz açılır (temsilî), pusula en yakın
 * bulunmamış kiliseyi kısa süre gösterir. Mahallelerin yeri, evlerin sayısı ve kiliselerin biçimi TEMSİLÎDİR.
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -130, x1: 130, z0: -130, z1: 130 };
/** Vadi: kuzey-güney uzanan dere yatağı, iki yanda yükselen yamaçlar */
export function terrain(x: number, z: number): number {
  const valley = Math.abs(x + Math.sin(z * 0.02) * 18);
  return valley * 0.32 + Math.sin(x * 0.05) * 2.2 + Math.sin(z * 0.045 + x * 0.02) * 3 + Math.max(0, -z - 60) * 0.15;
}
/** Mahalleler: merkez, düzlük yarıçapı, kilisenin mahalle içindeki konumu (ofset) ve yönü */
export interface Hamlet { id: string; c: V2; r: number; church: V2; seed: number }
export const HAMLETS: Hamlet[] = [
  { id: 'm1', c: [-38, 40], r: 14, church: [4, -5], seed: 3 },
  { id: 'm2', c: [42, 52], r: 13, church: [-5, -3], seed: 7 },
  { id: 'm3', c: [-58, -6], r: 13, church: [5, 4], seed: 11 },
  { id: 'm4', c: [54, -10], r: 14, church: [-4, 5], seed: 13 },
  { id: 'm5', c: [-30, -62], r: 12, church: [4, 4], seed: 17 },
  { id: 'm6', c: [30, -72], r: 12, church: [-4, 4], seed: 19 },
  { id: 'm7', c: [2, -104], r: 13, church: [0, 6], seed: 23 },
];
/** Mahalle düzlüğü: merkeze yakın yerde zemin düzleşir (evler ve kilise oturur) */
export function groundY(x: number, z: number): number {
  let y = terrain(x, z);
  for (const h of HAMLETS) { const d = Math.hypot(x - h.c[0], z - h.c[1]); if (d < h.r + 8) { const t = Math.max(0, Math.min(1, (d - h.r) / 8)), k = 1 - t * t * (3 - 2 * t); y = y * (1 - k) + terrain(h.c[0], h.c[1]) * k; } }
  return y;
}
export const churchAt = (h: Hamlet): V2 => [h.c[0] + h.church[0], h.c[1] + h.church[1]];
export const CHURCH = { w: 5, l: 8 };
/** Ev ve kilise duvarları: çarpışma dikdörtgenleri (merkez, yarı genişlik/derinlik) */
export function houses(h: Hamlet): { x: number; z: number; w: number; d: number; rot: number }[] {
  let s = h.seed * 9301; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); const out: { x: number; z: number; w: number; d: number; rot: number }[] = []; const ch = churchAt(h);
  for (let i = 0; i < 40 && out.length < 8; i++) { const a = r() * Math.PI * 2, d = 4 + r() * (h.r - 3), x = h.c[0] + Math.cos(a) * d, z = h.c[1] + Math.sin(a) * d, w = 4 + r() * 2, dd = 4 + r() * 2;
    if (Math.hypot(x - ch[0], z - ch[1]) < 9) continue; if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 7.5)) continue; out.push({ x, z, w, d: dd, rot: 0 }); }
  return out;
}
const HOUSE_CACHE = HAMLETS.map((h) => houses(h));
export function walkable(x: number, z: number): boolean {
  const p = 0.4;
  if (x < BOUNDS.x0 + 2 || x > BOUNDS.x1 - 2 || z < BOUNDS.z0 + 2 || z > BOUNDS.z1 - 2) return false;
  for (let i = 0; i < HAMLETS.length; i++) {
    const h = HAMLETS[i]; if (Math.hypot(x - h.c[0], z - h.c[1]) > h.r + 6) continue;
    const [cx, cz] = churchAt(h); if (Math.abs(x - cx) < CHURCH.w / 2 + p && Math.abs(z - cz) < CHURCH.l / 2 + p) return false;
    if (HOUSE_CACHE[i].some((o) => Math.abs(x - o.x) < o.w / 2 + p && Math.abs(z - o.z) < o.d / 2 + p)) return false;
  }
  return true;
}
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; const y0 = groundY(x, z);
  if (walkable(x + dx, z) && groundY(x + dx, z) - y0 < 0.5) x += dx; const y1 = groundY(x, z); if (walkable(x, z + dz) && groundY(x, z + dz) - y1 < 0.5) z += dz; return [x, z]; }
/** Kilise bulundu sayılır: önüne (batı kapısının önüne) yaklaşınca */
export const churchFront = (h: Hamlet): V2 => { const [x, z] = churchAt(h); return [x, z + CHURCH.l / 2 + 1.8]; };
export const nearChurch = (x: number, z: number, found: string[]) => HAMLETS.findIndex((h) => !found.includes(h.id) && Math.hypot(x - churchFront(h)[0], z - churchFront(h)[1]) < 4);
/** Sis yoğunluğu: bulunan kilise sayısıyla azalır (görüş mesafesi metre) */
export const fogFar = (found: number) => 34 + found * 22;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source }
export const SRC = {
  vatan: { title: 'Gazete Vatan — Sisler arasındaki masal kent: Santa Harabeleri', url: 'https://www.gazetevatan.com/galeri/sisler-arasindaki-masal-kent-santa-harabeleri-ziyaretcilerini-buyuluyor-2391462' },
  cnn: { title: 'CNN Türk — Santa Harabeleri kesin korunacak hassas alan olarak tescillendi', url: 'https://cnnturk.com/seyahat/santa-harabeleri-kesin-korunacak-hassas-alan-olarak-tescillendi-1577928' },
  osm: { title: 'Haberler.com — Santa, Osmanlı belgelerinde ortaya çıktı', url: 'https://www.haberler.com/rumlar-tarafindan-kuruldugu-dusunulen-santa-osmanl-16402809-haberi/' },
  ens: { title: 'En Son Haber — Santa Harabeleri doğası ve tarihiyle görenleri büyülüyor', url: 'https://www.ensonhaber.com/gumushanedeki-santa-harabeleri-dogasi-ve-tarihiyle-gorenleri-buyuluyor-h1552571' },
};
export const SPOTS: Spot[] = [
  { id: 'kurulus', name: 'Maden köyü', kicker: 'Kuruluş', at: [0, 96], reach: 4, source: SRC.osm,
    text: 'Santa\'nın 17. yüzyılda Rumlar tarafından bir maden köyü olarak kurulduğu düşünülür; yerleşim Osmanlı belgelerinde de geçer. Bugün Gümüşhane\'de Dumanlı köyü sınırlarındadır.' },
  { id: 'yedi', name: 'Yedi mahalle', kicker: 'Düzen', at: [-30, 30], reach: 5, source: SRC.ens,
    text: 'Santa yedi mahalleden oluşur. Evler taştan, tek katlıdır ve her mahallede birer kilise bulunur. (Mahallelerin yeri ve evlerin sayısı temsilîdir.)' },
  { id: 'koruma', name: 'Kesin korunacak alan', kicker: 'Bugün', at: [54, 8], reach: 5, source: SRC.cnn,
    text: 'Santa Harabeleri arkeolojik ve doğal sit alanıdır ve "kesin korunacak hassas alan" olarak tescillenmiştir. Kaçak kazılar yapılara zarar vermiştir.' },
  { id: 'sis', name: 'Sisler arasında', kicker: 'Vadi', at: [6, 10], reach: 5, source: SRC.vatan,
    text: 'Vadi sık sık bulut ve sisle örtülür; ziyaretçiler çoğunlukla ilkbahar ve yazın gelir. (Oyunda sisin kiliseler bulundukça açılması temsilîdir.)' },
];
export const CARD_ALL = { id: 'yedi-kilise', name: 'Yedi kilise', kicker: 'Sis dağıldı',
  text: 'Yedi mahallenin kiliselerini sisin içinde buldun. Her mahallede bir kilise bulunması, Santa\'nın birbirinden ayrı ama yakın mahallelerden oluşan düzenini gösterir. (Kiliselerin biçimi temsilîdir.)', source: SRC.ens };
export const START: { at: V2; yaw: number } = { at: [0, 108], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
