/**
 * Selimiye Camii (Edirne) — "Sekiz Ayağın Altında": külliye meydanı, avlu, sekiz ayağa oturan merkezî kubbeli ibadet mekânı ve dört minare;
 * 6 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (meydan ve avlu kapısı), −z kuzey (mihrap/kıble duvarı). İbadet mekânı 45 × 36 m (UNESCO); kubbe sekiz ayağa oturur.
 * Ölçülerin çoğu, avlu düzeni ve iç eşyalar TEMSİLÎDİR (docs/SELIMIYE.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** İbadet mekânı (iç) ve avlu (iç); duvar kalınlığı; mekân içi ve avlu arasında kapı */
export const HALL: Rect = { x0: -22.5, x1: 22.5, z0: -18, z1: 18 };
export const COURT: Rect = { x0: -22.5, x1: 22.5, z0: 19.5, z1: 48 };
export const WALL_T = 1.5;
export const DOOR = { x0: -3, x1: 3 };
export const GATE = { x0: -3.5, x1: 3.5 };
/** Sekiz ayak: sekizgenin köşelerinde (yürünmez daireler) */
export const PILLAR_R = 1.9, OCT_R = 13;
export const PILLARS: V2[] = Array.from({ length: 8 }, (_, k) => { const a = (k + 0.5) * Math.PI / 4; return [Math.cos(a) * OCT_R, Math.sin(a) * OCT_R] as V2; });
/** Dört minare (gövde yarıçapı; kuzeyde ve güneyde birer çift) */
export const MINARETS: V2[] = [[-26.8, -20], [26.8, -20], [-26.8, 20], [26.8, 20]];
export const MINARET_R = 2.6;
/** Avlu sütunları (iki yan duvar boyunca revak) ve ortadaki şadırvan benzeri havuz (yürünmez) */
/** Avlunun güney revakının sütun sırası (kapının iki yanında) */
export const SOUTH_ROW_Z = 44.4;
export const COLUMNS: V2[] = (() => { const o: V2[] = []; for (let z = 23; z <= 46; z += 4.6) { o.push([-19.5, z]); o.push([19.5, z]); }
  for (const x of [5.75, 10.35, 14.95]) { o.push([-x, SOUTH_ROW_Z]); o.push([x, SOUTH_ROW_Z]); } return o; })();
/** Avlu taç kapısı: duvardan 1,2 m öne taşan, 11 m yüksek, 14 m geniş blok (temsilî); kapı açıklığı GATE */
export const PORTAL = { hw: 7, h: 11, z1: COURT.z1 + WALL_T + 1.2 };
export const POOL = { c: [0, 34] as V2, r: 3.4 };
/** Dış meydan */
export const AREA: Rect = { x0: -70, x1: 70, z0: -36, z1: 90 };
/** Zemin: ibadet mekânı ve avlu taş döşeme (hafif yüksek) */
export const FLOOR_H = 0.25;

const outer: Rect = { x0: HALL.x0 - WALL_T, x1: HALL.x1 + WALL_T, z0: HALL.z0 - WALL_T, z1: COURT.z1 + WALL_T };
export const inHall = (x: number, z: number) => inR(HALL, x, z);
export const inCourt = (x: number, z: number) => inR(COURT, x, z);
export function groundY(x: number, z: number): number { return inR(outer, x, z) ? FLOOR_H : 0; }
export function walkable(x: number, z: number): boolean {
  if (!inR(AREA, x, z, 0.4)) return false;
  for (const m of MINARETS) if (Math.hypot(x - m[0], z - m[1]) < MINARET_R + 0.4) return false;
  if (inR(outer, x, z)) {
    if (inR(HALL, x, z, 0.3)) return !PILLARS.some((p) => Math.hypot(x - p[0], z - p[1]) < PILLAR_R + 0.4);
    if (inR(COURT, x, z, 0.3)) { if (Math.hypot(x - POOL.c[0], z - POOL.c[1]) < POOL.r + 0.4) return false; return !COLUMNS.some((c) => Math.hypot(x - c[0], z - c[1]) < 0.9); }
    // duvar bantları: mekân–avlu kapısı ve avlu güney kapısı
    if (z > HALL.z1 - 0.4 && z < COURT.z0 + 0.4 && x > DOOR.x0 && x < DOOR.x1) return true;
    if (z > COURT.z1 - 0.4 && x > GATE.x0 && x < GATE.x1) return true;
    return false;
  }
  // taç kapının öne taşan payeleri (kapı açıklığı yürünür)
  if (z > COURT.z1 && z < PORTAL.z1 + 0.3 && Math.abs(x) < PORTAL.hw + 1 && (x <= GATE.x0 + 0.3 || x >= GATE.x1 - 0.3)) return false;
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
  unesco: { title: 'UNESCO — Selimiye Mosque and its Social Complex', url: 'https://whc.unesco.org/en/list/1366' },
  wiki: { title: 'Wikipedia — Selimiye Mosque, Edirne', url: 'https://en.wikipedia.org/wiki/Selimiye_Mosque,_Edirne' },
  hab: { title: 'Habertürk — Türkiye\'nin Dünya Mirası VIII', url: 'https://www.haberturk.com/turkiye-nin-dunya-mirasi-viii-2887897' },
  enson: { title: 'En Son Haber — İkinci Selim\'in yapılmasını istediği cami: Selimiye', url: 'https://www.ensonhaber.com/ikinci-selimin-yapilmasini-istedigi-ve-acilisini-goremedigi-camii-selimiye-h11004286' },
  sabah: { title: 'Daily Sabah — Selimiye Mosque makes grandeur of the Ottomans eternal', url: 'https://www.dailysabah.com/life/history/world-heritage-in-turkey-selimiye-mosque-makes-grandeur-of-the-ottomans-eternal' },
  kultur: { title: 'Kültür ve Turizm Bakanlığı — Selimiye (TEDA)', url: 'https://teda.ktb.gov.tr/Eklenti/6590%2Cselimiyepdf.pdf' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('sinan', 'Sinan\'ın ustalık eseri', 'Mimar', [0, 62], gy(0, 62, 8),
    'Selimiye, II. Selim\'in emriyle Edirne\'nin en yüksek noktasında 1569–1575 arasında yapıldı. UNESCO, yapıyı dönemin en ünlü mimarı Sinan\'ın yaratıcı dehasının bir başyapıtı sayar.', SRC.unesco, 6.5),
  mk('minare', 'Dört minare', 'Minare', [-28, 32], gy(-28, 32, 9),
    'Camiyi dört minare çevreler; her birinin üç şerefesi vardır. Yükseklikleri kaynaklarda farklıdır: UNESCO belgesi kurşun kaplı külah uçlarına kadar yaklaşık 71 m verir, Türkçe haberlerde 85 m dolayında değerler geçer.', SRC.hab, 5),
  mk('avlu', 'Avlu', 'Külliye', [10, 40], gy(10, 40, 4.4),
    'Camiyi, yan duvarlar boyunca revaklı bir avlu karşılar. UNESCO\'nun yazımı cami ile onun külliyesini birlikte kapsar; oyundaki avlunun düzeni ve havuzu temsilîdir.', SRC.unesco, 5),
  mk('mekan', 'Tek bir büyük mekân', 'İç mekân', [0, 12], gy(0, 12, 5),
    'İbadet mekânı yaklaşık 45 × 36 m ölçülerindedir. Kubbenin altı tek bir geniş salon gibi algılanır; kubbe sekiz ayağa oturur. Oyundaki ayaklar sekizgenin köşelerindedir.', SRC.unesco, 5.4),
  mk('kubbe', 'Sekiz ayaklı kubbe', 'Kubbe', [0, -6], gy(0, -6, 18),
    'Kubbenin çapı kaynaklarda 31,25 ile 32 m arasında verilir; yüksekliği de 42–43 m civarında aktarılır. Sekiz ayağın taşıdığı merkezî plan, Sinan\'ın bu yapıdaki en büyük başarısı sayılır.', SRC.hab, 5.4),
  mk('cini', 'İznik çinileri', 'Bezeme', [-8, -15], gy(-8, -15, 4),
    'UNESCO özetine göre iç mekânda İznik çinicilik geleneğinin en parlak döneminden çiniler kullanılmıştır. Oyundaki çini desenleri temsilîdir.', SRC.unesco, 4.6),
];
export const START: { at: V2; yaw: number } = { at: [0, 76], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -74, x1: 74, z0: -40, z1: 94 };
export { inR };
