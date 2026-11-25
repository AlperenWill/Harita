/**
 * Ordu — Yason Burnu Kilisesi (Hagios Nikolaos): "Açık Taş, Koyu Taş" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Denize uzanan yeşil burun; burnun ortasında doğu-batı doğrultulu küçük kubbeli bazilika (batıda ve güneyde
 * giriş, doğuda üç apsis, içeride iki sıra sütunla üç nef). Mekanik: batı cephesindeki eksik taşları açık-koyu düzene göre yerine koymak
 * (sıralar dönüşümlü; kapı kemerinin taşları dönüşümlü). Kilisenin ölçüleri ve cephe deseni TEMSİLÎDİR.
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -50, x1: 50, z0: -55, z1: 45 };
export const LAND = { cx: 0, cz: -8, rx: 30, rz: 38, mainZ: 22 };
export const CH = { x0: -8, x1: 8, hw: 4.5, t: 0.7, h: 7, door: { hw: 1, spring: 2.2, r: 1 }, side: { x: -3, hw: 0.7, h: 2.6 } };
export const COLS: V2[] = [-4.5, -1.8, 0.9, 3.6].flatMap((x) => [[x, -1.6], [x, 1.6]] as V2[]);
export const COL_R = 0.32;
export const inLand = (x: number, z: number) => z > LAND.mainZ || Math.hypot((x - LAND.cx) / LAND.rx, (z - LAND.cz) / LAND.rz) < 1;
export function walkable(x: number, z: number): boolean {
  const p = 0.35;
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (!(z > LAND.mainZ + 1 || Math.hypot((x - LAND.cx) / (LAND.rx - 1.5), (z - LAND.cz) / (LAND.rz - 1.5)) < 1)) return false;   // denize girilmez
  const inBox = x > CH.x0 - CH.t / 2 - p && x < CH.x1 + CH.t / 2 + p && Math.abs(z) < CH.hw + CH.t / 2 + p;
  if (!inBox) return !(x > CH.x1 && x < CH.x1 + 2.6 + p && Math.abs(z) < 2.6 + p);   // doğudaki apsis çıkıntısı
  const inside = x > CH.x0 + CH.t / 2 + p && x < CH.x1 - CH.t / 2 - p && Math.abs(z) < CH.hw - CH.t / 2 - p;
  if (inside) return !COLS.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < COL_R + p);
  if (Math.abs(z) < CH.door.hw - p && x < CH.x0 + 1) return true;   // batı kapısı
  if (Math.abs(x - CH.side.x) < CH.side.hw - p && z > 0) return true;   // güney kapısı
  return false;
}
export const groundY = (_x?: number, _z?: number) => 0;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }

/* ===================== cephe bulmacası ===================== */
/** Batı cephesi ızgarası: sütun c (z boyunca, güneyden kuzeye değil; -hw'den +hw'ye), sıra r (aşağıdan yukarı) */
export const FACADE = { cols: 12, rows: 10, w: (CH.hw * 2) / 12, h: CH.h / 10 };
export const cellZ = (c: number) => -CH.hw + (c + 0.5) * FACADE.w;
export const cellY = (r: number) => (r + 0.5) * FACADE.h;
export type Tone = 'acik' | 'koyu';
/** Hücre türü: kapı boşluğu, kemer taşı (dönüşümlü), ya da sıra taşı (sıralar dönüşümlü) */
export function cellKind(c: number, r: number): 'door' | 'arch' | 'course' {
  const z = cellZ(c), y = cellY(r), { hw, spring, r: R } = CH.door, d = Math.hypot(z, y - spring);
  if (Math.abs(z) < hw && (y < spring || d < R)) return 'door';
  if (y >= spring - 0.1 && d < R + 0.95) return 'arch';
  return 'course';
}
export function toneOf(c: number, r: number): Tone | null {
  const k = cellKind(c, r); if (k === 'door') return null;
  if (k === 'arch') { const a = Math.atan2(cellY(r) - CH.door.spring, cellZ(c)), i = Math.round((a / Math.PI) * 6); return i % 2 === 0 ? 'koyu' : 'acik'; }
  return r % 2 === 0 ? 'acik' : 'koyu';
}
/** Restorasyonda eksik kalan taşlar (sıra taşları ve kemer taşları karışık) */
export const MISSING: V2[] = [[1, 1], [10, 2], [2, 5], [9, 6], [3, 8], [8, 8], [4, 4], [7, 4], [5, 5], [6, 5]].filter(([c, r]) => toneOf(c, r) !== null) as V2[];
export const key = (c: number, r: number) => `${c},${r}`;
export const MAX_WRONG = 3;
export const PUZZLE_AT: V2 = [CH.x0 - 6, 0];
export const atPuzzle = (x: number, z: number) => Math.hypot(x - PUZZLE_AT[0], z - PUZZLE_AT[1]) < 2.4;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
export const SRC = {
  kure: { title: 'Küre Ansiklopedisi — Yason Kilisesi (Hagios Nikolaos)', url: 'https://kureansiklopedi.com/tr/detay/yason-kilisesi-hagios-nikolaos-kilisesi-f7262' },
  burun: { title: 'Küre Ansiklopedisi — Yason Burnu', url: 'https://kureansiklopedi.com/tr/detay/yason-burnu-749050' },
  ht: { title: 'Habertürk — Yason Burnu\'nda restorasyonu biten kilise ziyarete açıldı', url: 'https://www.haberturk.com/ordu-haberleri/99362581-yason-burnu-yarimadasinda-restorasyonu-biten-kilise-ziyarete-acildi' },
  wiki: { title: 'Wikipedia — Cape Jason', url: 'https://en.wikipedia.org/wiki/Cape_Jason' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('yason', 'Argonotların burnu', 'Mit', [0, -38], [0, 1.8, -40],
    'Burnun adı mitolojiden gelir: Kaptan Yason önderliğindeki Argonotların altın postu aramaya giderken buraya uğradığına inanılır. (Bu bir mittir.)', SRC.burun, 3.6),
  mk('nikolaos', 'Hagios Nikolaos', 'Kilise', [CH.x0 - 3.2, 2.6], [CH.x0 - 0.5, 4.6, 2.6],
    'Kilise, denizcilerin koruyucu azizi Aziz Nikolaos\'a adanmıştır. Bölgedeki Rum Ortodoks cemaati tarafından 1868 ya da 1869\'da yaptırıldığı yazılır (yıl kaynaklarda farklıdır).', SRC.kure, 3),
  mk('nef', 'Üç nef, üç apsis', 'İç', [2.2, 0], [5.4, 3.2, 0],
    'Kubbeli bazilika planlıdır: içeride iki sıra sütun mekânı üç nefe ayırır, doğuda üç apsis vardır, üstünde küçük bir kubbe bulunur. İki girişi vardır. (Sütun sayısı ve ölçüler temsilîdir.)', SRC.kure, 2.6),
  mk('sit', 'Harabeden onarıma', 'Bugün', [-3, 8.5], [-3, 2.4, CH.hw + 0.6],
    'Nüfus mübadelesinden sonra cemaat göç etti ve kilise zamanla harap oldu; 2004\'te restore edildi. Yarımada 1. derece arkeolojik ve 2. derece doğal sit alanıdır.', SRC.ht, 3),
];
export const CARD_FACADE = { id: 'cephe', name: 'Açık ve koyu taşlar', kicker: 'Batı cephesi',
  text: 'Kilisenin cephesinde açık ve koyu renkli taşlar birlikte kullanılmıştır; batı girişi kabartmalı süslemeleriyle dikkat çeker. Eksik taşları düzene göre yerine koydun. (Cephedeki dönüşümlü desen temsilîdir.)', source: SRC.kure };
export const START: { at: V2; yaw: number } = { at: [4, 30], yaw: 0.1 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
