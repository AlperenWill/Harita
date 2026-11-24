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
  if (Math.abs(x - TABLE.at[0]) < TABLE.w / 2 + 0.4 && Math.abs(z - TABLE.at[1]) < TABLE.d / 2 + 0.4) return false;
  if (x > ARCH.line[0] + 0.5 && x < ARCH.line[0] + 46 && Math.abs(z - ARCH.line[1]) < 7) return false;   // atış alanı (çizginin önü)
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

/* ===================== okçuluk alanı ===================== */
/** Atış çizgisi yolun doğusunda; hedefler doğuya doğru 18, 30 ve 42 m'de (merkez yüksekliği 1,3 m, yarıçap 0,6 m) */
export const ARCH = { line: [24, 30] as V2, eye: 1.55, g: 9.81, minV: 26, maxV: 52 };
export const TARGETS: { x: number; z: number; y: number; r: number }[] = [18, 30, 42].map((d, i) => ({ x: ARCH.line[0] + d, z: ARCH.line[1] + [0, -3.2, 3.2][i], y: 1.3, r: 0.6 }));
export const ARCH_AT: V2 = [ARCH.line[0] - 1, ARCH.line[1]];
export const HITS_NEEDED = 3, ARROWS = 6;
/** Ok uçuşu: başlangıç, birim yön ve hız; hangi hedefe değdiğini döndürür (yoksa −1). Yerçekimi dışında kuvvet yok. */
export function shoot(o: [number, number, number], dir: [number, number, number], v: number): number {
  let [x, y, z] = o; let vx = dir[0] * v, vy = dir[1] * v, vz = dir[2] * v; const dt = 0.004;
  for (let i = 0; i < 4000; i++) { const nx = x + vx * dt, ny = y + vy * dt, nz = z + vz * dt;
    for (let k = 0; k < TARGETS.length; k++) { const t = TARGETS[k]; if ((x - t.x) * (nx - t.x) <= 0 && vx !== 0) { const f = (t.x - x) / (nx - x), cy = y + (ny - y) * f, cz = z + (nz - z) * f; if (Math.hypot(cy - t.y, cz - t.z) < t.r) return k; } }
    x = nx; y = ny; z = nz; vy -= ARCH.g * dt; if (y < groundY(x, z)) return -1; }
  return -1;
}
export const ARCH_SRC: Source = { title: 'TRT Haber — Okçular Vakfı Malazgirt Millî Parkı\'na okçuluk alanı kurdu', url: 'https://www.trthaber.com/videolar/okcular-vakfi-malazgirt-milli-parkina-okculuk-alani-kurdu-40413.html' };
export const CARD_ARCH = { id: 'okculuk', name: 'Okçuluk alanı', kicker: 'Park · Gelenek',
  text: 'Okçular Vakfı, Malazgirt Meydan Muharebesi Tarihi Millî Parkı\'na bir okçuluk alanı kurdu. Kaynaklar, Selçuklu ordusunun bozkır geleneğinde savaştığını ve geri çekiliyormuş gibi yapıp karşı orduyu engebeli araziye çekme taktiğini kullandığını anlatır.', source: ARCH_SRC };

/* ===================== kum masası (savaşın seyri, şematik) ===================== */
export const TABLE = { at: [-18, -112] as V2, w: 7, d: 5, h: 0.95 };
export const TABLE_FRONT: V2 = [TABLE.at[0], TABLE.at[1] + TABLE.d / 2 + 1.4];
const SRC2 = {
  whe: { title: 'World History Encyclopedia — Battle of Manzikert', url: 'https://www.worldhistory.org/article/1189/battle-of-manzikert/' },
  andr: { title: 'Wikipedia — Andronikos Doukas', url: 'https://en.wikipedia.org/wiki/Andronikos_Doukas_(cousin_of_Michael_VII)' },
  med: { title: 'Medievalists — Betrayal or mistake? Rethinking the defeat at Manzikert', url: 'https://www.medievalists.net/2026/03/betrayal-or-mistake-rethinking-the-defeat-at-manzikert/' },
};
/** Masa üstü konumlar (−1…1; +x doğu, +z güney). b: Bizans birlikleri, s: Selçuklu birlikleri, r: Bizans arka koruma */
export interface MapStep { date: string; text: string; b: V2[]; r: V2; s: V2[] }
export const MAP_STEPS: MapStep[] = [
  { date: '24–25 Ağustos', text: 'İki ordu karşı karşıyadır; asıl savaştan önce ilk çatışmalar başlar. (Kampların yeri şematiktir.)', b: [[-0.3, -0.5], [0, -0.55], [0.3, -0.5]], r: [0, -0.75], s: [[0.35, 0.45], [0.6, 0.25]] },
  { date: '26 Ağustos, gündüz', text: 'Bizans ordusu geniş bir hat hâlinde ilerler. Selçuklular bozkır usulü geri çekiliyormuş gibi yapar ve karşı orduyu engebeli araziye çeker.', b: [[-0.45, 0.05], [0, 0.1], [0.45, 0.05]], r: [0, -0.3], s: [[-0.5, 0.65], [0, 0.8], [0.5, 0.65]] },
  { date: 'Akşamüstü', text: 'Romanos geri dönmeye karar verir. Andronikos Doukas komutasındaki arka koruma kampa yürür; imparatorun birliği ve kanatlar açıkta kalır. Andronikos\'un, imparatorun öldüğü söylentisini yaydığı anlatılır.', b: [[-0.55, 0.15], [0, 0.2], [0.55, 0.15]], r: [0, -0.6], s: [[-0.75, 0.25], [0, 0.6], [0.75, 0.25]] },
  { date: 'Savaşın sonu', text: 'Bizans hatları dağılır; Romanos\'un çevresindeki birlik kuşatılır ve imparator esir düşer. Andronikos\'un çekilmesinin bilinçli bir ihanet mi yoksa bir hata mı olduğu bugün de tartışılır.', b: [[0, 0.2]], r: [0, -0.62], s: [[-0.25, 0.25], [0.25, 0.25], [0, 0.45], [0, -0.05]] },
];
export const MAP_Q = { q: 'Bizans hatlarının dağılmasında kaynakların öne çıkardığı etken hangisi?', options: ['Arka korumanın kampa çekilmesi ve imparatorun öldüğü söylentisi', 'Bizans ordusunun kampını hiç terk etmemesi', 'Savaşın kış ortasında yapılması'], correct: 0 };
export const CARD_MAP = { id: 'masa', name: 'Kum masası', kicker: 'Savaşın seyri · şematik',
  text: 'Sahte geri çekilme, akşamüstü geri dönüş kararı, arka korumanın kampa yürümesi ve yayılan söylenti: kaynaklar yenilgiyi bu olayların art arda gelmesine bağlar. Andronikos Doukas\'ın tutumu ihanet mi hata mı, tarihçiler arasında tartışmalıdır. (Masadaki konumlar şematiktir.)', source: SRC2.whe };
export const MAP_SOURCES = SRC2;
