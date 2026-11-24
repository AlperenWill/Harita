/**
 * Muş — Malazgirt Meydan Muharebesi Tarihi Millî Parkı: "Zaman Çizelgesi" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Ova üstünde kuzeye uzanan yürüyüş yolu (Fetih Yolu'nu temsil eder), yol boyunca bilgi panoları, yolun
 * kuzey ucunda merasim alanı ve namazgah. Savaş sahnesi yoktur. Mekanik: panolar yol boyunca KARIŞIK sırayla durur; her panodaki olayı
 * topla, yolun sonundaki çizelgede olayları tarih sırasına diz. Yolun uzunluğu, panolar ve yapıların biçimi TEMSİLÎDİR (docs/MALAZGIRT.md).
 */
export type V2 = [number, number];
export const PATH = { w: 5, z0: -110, z1: 120 };
export const PLAZA = { z: -128, r: 18 };
export interface Source { title: string; url: string }
const SRC = {
  kure: { title: 'Küre Ansiklopedisi — Malazgirt Muharebesi', url: 'https://kureansiklopedi.com/tr/detay/malazgirt-muharebesi-d8b1c' },
  brit: { title: 'Britannica — Battle of Manzikert', url: 'https://www.britannica.com/event/Battle-of-Manzikert' },
  whe: { title: 'World History Encyclopedia — Malazgirt Muharebesi', url: 'https://www.worldhistory.org/trans/tr/2-1189/malazgirt-muharebesi/' },
  park: { title: 'T.C. Tarım ve Orman Bakanlığı (DKMP) — Malazgirt', url: 'https://www.tarimorman.gov.tr/DKMP/Haber/416/Malazgirt-Turk-Milletinin-Anadoludaki-Varligini-Tescilleyen-Tarihi-Bir-Donum-Noktasi' },
};
export interface Ev { id: string; order: number; date: string; name: string; text: string; source: Source }
/** Olaylar (order: doğru sıra) */
export const EVENTS: Ev[] = [
  { id: 'ilk', order: 0, date: '24–25 Ağustos 1071', name: 'İlk çatışmalar', text: 'Asıl savaştan önce iki ordu arasında ilk çatışmalar 24–25 Ağustos\'ta başladı. Ordu büyüklükleri kaynaklarda yalnızca tahmin olarak verilir: Selçuklu için 12.000–30.000, Bizans için 30.000–40.000 gibi aralıklar anılır.', source: SRC.kure },
  { id: 'savas', order: 1, date: '26 Ağustos 1071', name: 'Meydan muharebesi', text: 'Selçuklu Sultanı Alp Arslan ile Bizans İmparatoru IV. Romanos Diogenes\'in orduları Malazgirt yakınlarında karşılaştı; savaşı Selçuklular kazandı.', source: SRC.brit },
  { id: 'esir', order: 2, date: '26 Ağustos 1071', name: 'İmparator esir', text: 'Savaşın sonunda Bizans İmparatoru IV. Romanos Diogenes esir düştü ve Alp Arslan\'ın huzuruna getirildi.', source: SRC.brit },
  { id: 'serbest', order: 3, date: 'Savaştan sonra', name: 'Anlaşma ve serbest bırakılma', text: 'Bizans tarihçisi Psellos\'a göre Alp Arslan esir imparatora iyi davrandı. Romanos bir anlaşmayla serbest bırakıldı; anlaşmanın şartları (fidye, toprak) kaynaklarda farklı anlatılır.', source: SRC.whe },
  { id: 'park', order: 4, date: '2018', name: 'Tarihi Millî Park', text: 'Savaşın yapıldığı alan 2018\'de Tarihi Millî Park ilan edildi. Malazgirt\'in Danişmentgazi Mahallesi\'ndeki yaklaşık 238 hektarlık parkta 1071 adımlık Fetih Yolu, merasim alanı ve namazgah bulunur.', source: SRC.park },
];
/** Panoların yol üstündeki sırası: karışık (yürüyüş sırası tarih sırası değil) */
export const BOARD_ORDER = ['serbest', 'ilk', 'park', 'esir', 'savas'];
export const boardPos = (k: number): V2 => { const z = PATH.z1 - 30 - k * 42, side = k % 2 ? 1 : -1; return [side * (PATH.w / 2 + 1.4), z]; };
export const boardFront = (k: number): V2 => { const [x, z] = boardPos(k); return [x - Math.sign(x) * 2.2, z]; };
export const BOARD_REACH = 2.4;
export function nearBoard(x: number, z: number, got: string[]): number { for (let k = 0; k < BOARD_ORDER.length; k++) { if (got.includes(BOARD_ORDER[k])) continue; const [fx, fz] = boardFront(k); if (Math.hypot(x - fx, z - fz) < BOARD_REACH) return k; } return -1; }
export const orderOk = (seq: string[]) => seq.length === EVENTS.length && seq.every((id, i) => EVENTS.find((e) => e.id === id)!.order === i);
/** Aynı gün olan iki olayın (savaş, esir) sırası da anlatıya göre: önce savaş, sonra esir */

/* ===================== yürüyüş ===================== */
export const BOUNDS = { x0: -80, x1: 80, z0: -160, z1: 150 };
export const STAGE = { x0: -8, x1: 8, z0: -146, z1: -138 };
export const NAMAZGAH = { x: 22, z: -126 };
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  for (let k = 0; k < BOARD_ORDER.length; k++) { const [bx, bz] = boardPos(k); if (Math.abs(x - bx) < 1.4 && Math.abs(z - bz) < 0.6) return false; }
  if (x > STAGE.x0 - 0.4 && x < STAGE.x1 + 0.4 && z > STAGE.z0 - 0.4 && z < STAGE.z1 + 0.4) return false;
  if (Math.abs(x - NAMAZGAH.x) < 6 && Math.abs(z - (NAMAZGAH.z - 4)) < 0.7) return false;
  return true;
}
export const groundY = (x: number, z: number) => Math.sin(x * 0.02) * 0.4 + Math.sin(z * 0.015) * 0.6;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }
export const TIMELINE_AT: V2 = [0, PLAZA.z + 4];

/* ===================== duraklar ===================== */
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
export const SPOTS: Spot[] = [
  { id: 'ova', name: 'Malazgirt ovası', kicker: 'Yer', at: [0, PATH.z1 + 10], reach: 4, mark: [0, 3, PATH.z1 + 4],
    text: 'Savaş, bugün Muş\'un Malazgirt ilçesindeki ovada yapıldı. Alan bugün yürüyüş yolları ve anma alanlarıyla ziyaret edilebilen bir tarihi millî parktır. (Oyundaki yerleşim temsilîdir.)', source: SRC.park },
  { id: 'namazgah', name: 'Namazgah', kicker: 'Park', at: [NAMAZGAH.x, NAMAZGAH.z + 3], reach: 3.5, mark: [NAMAZGAH.x, 3.5, NAMAZGAH.z - 4],
    text: 'Namazgah, açık havada namaz kılınan, kıbleyi gösteren mihraplı alçak bir duvardan oluşan yerdir. Millî parkta merasim ve hitabet alanının yanında bir namazgah da vardır. (Biçimi temsilîdir.)', source: SRC.park },
];
export const CARD_DONE = { id: 'cizelge', name: 'Zaman çizelgesi', kicker: 'Sıra doğru',
  text: 'Olayları tarih sırasına dizdin: ilk çatışmalar, meydan muharebesi, imparatorun esir düşmesi, anlaşmayla serbest bırakılması ve dokuz yüzyıl sonra alanın millî park olması. Panolar yol boyunca karışık duruyordu; tarih, olayları doğru sıraya koyarak anlaşılır.', source: SRC.kure };
export const START: { at: V2; yaw: number } = { at: [0, PATH.z1 + 14], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
