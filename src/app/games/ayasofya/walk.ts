/**
 * Ayasofya — serbest yürüyüş modeli (saf; test edilir): iki kat (zemin, güney galeri), yürünebilir alan, engeller, rampa kapısı,
 * rehber turu (kurgusal sanat tarihçisi Elif Hoca), incelenebilir noktalar ve arka plan figürleri.
 *
 * Zemin katı tek parça bir alandır: avlu (batı) → batı cephesindeki kapı → narteks → İmparator Kapısı → kubbe altı (orta mekân:
 * dikdörtgen + doğu/batı yarım daireleri) → apsis. Yan nefler orta mekâna sütun aralarından açılır. Galeri ayrı bir kattır;
 * narteksin güney ucundaki rampa kapısından ekran kararıp geçilir (rampa çizilmez, ölçüleri kısaltılmış bir kurgudur).
 * Koordinatlar hagia.ts ile aynıdır: +x doğu (apsis), +z güney, metre.
 */
import { APSE, AISLE_Z, GALLERY_Y, MINBAR, MIHRAB, NARTHEX, NAVE_X, PIERS, POIS, R, columns, type Poi, type V3 } from './hagia';
import { makeNav, type Nav, type V2 } from '../shared/nav';
export type { V2 };

export type Level = 'zemin' | 'galeri';
export const LEVEL_Y: Record<Level, number> = { zemin: 0, galeri: GALLERY_Y };
const BODY = 0.35;

/* ---------- dış mekân ---------- */
export const YARD = { x0: -108, x1: -43, z: 56 } as const;              // avlu sınırı
export const FACADE_X = NARTHEX.x0 - 0.5;                             // batı cephesi duvar ekseni (kalınlık 1)
export const DOOR_HALF = 1.9;                                        // cephe ve İmparator Kapısı açıklığı yarı genişliği
export const PORTICO_X = -46.3;                                      // dış narteks revakı sütun hattı
export const PORTICO_COLS: number[] = Array.from({ length: 14 }, (_, i) => -26 + i * 4);
export const SADIRVAN = { x: -62, z: -18, r: 4.4 } as const;
export interface Tree { x: number; z: number; kind: 'servi' | 'cinar'; s: number }
let TREES_CACHE: Tree[] | null = null;
export function yardTrees(): Tree[] {
  if (TREES_CACHE) return TREES_CACHE;
  let sd = 31; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647); const out: Tree[] = [];
  for (let x = -100; x <= -54; x += 7.5) for (const z of [-9, 9]) out.push({ x, z, kind: 'servi', s: 0.9 + r() * 0.25 });   // yolun iki yanında servi sırası
  let g = 0;
  while (out.length < 40 && g++ < 3000) {
    const x = -104 + r() * 54, z = (r() < 0.5 ? -1 : 1) * (14 + r() * 40), kind = r() < 0.5 ? 'servi' : 'cinar';
    if (Math.hypot(x - SADIRVAN.x, z - SADIRVAN.z) < 9 || x > -52 || out.some((t) => Math.hypot(t.x - x, t.z - z) < (kind === 'cinar' ? 7 : 3.5))) continue;
    out.push({ x, z, kind, s: kind === 'cinar' ? 0.85 + r() * 0.4 : 0.85 + r() * 0.35 });
  }
  return (TREES_CACHE = out);
}

/* ---------- iç mekân engelleri ---------- */
const GROUND_COLS = columns().filter((c) => c.pos[1] === 0), GALLERY_COLS = columns().filter((c) => c.pos[1] === GALLERY_Y);
/** Minber: basamakları kıbleye dönük uzun bir kapsül olarak engel */
const MINBAR_DIR: V2 = [Math.sin(-Math.PI / 2 - 0.22), Math.cos(-Math.PI / 2 - 0.22)];
function segDist(x: number, z: number, a: V2, b: V2) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
const MINBAR_SEG: [V2, V2] = [[MINBAR[0] - MINBAR_DIR[0] * 3.3, MINBAR[2] - MINBAR_DIR[1] * 3.3], [MINBAR[0] + MINBAR_DIR[0] * 4.0, MINBAR[2] + MINBAR_DIR[1] * 4.0]];

/** Yapısal sınırlar (duvarlar); `pad` kadar içeride kalır. Sütun gibi küçük engeller burada yoktur (kamera için de kullanılır). */
export function structural(level: Level, x: number, z: number, pad: number): boolean {
  if (level === 'galeri') return z > R + 0.55 + pad && z < AISLE_Z - 0.5 - pad && Math.abs(x) < NAVE_X - 0.5 - pad;   // yalnızca güney galeri
  // kapılı iki duvar: batı cephesi (x −43…−42) ve narteks–nef duvarı (x −33,05…−30,95); kalınlık + pad içinde yalnızca kapı açıklığı
  if (Math.abs(x - FACADE_X) < 0.5 + pad || Math.abs(x - (NARTHEX.x1 + 1)) < 1.05 + pad) return Math.abs(z) < DOOR_HALF - pad;
  if (x < FACADE_X) return x > YARD.x0 + pad && Math.abs(z) < YARD.z - pad;                                         // avlu
  if (x < NARTHEX.x1 + 1) return Math.abs(z) < 27.6 - pad;                                                         // narteks
  // ana mekân: dış dikdörtgen + apsis
  if (x > NAVE_X - 0.5 - pad) {   // apsis (doğu ucu)
    if (Math.abs(z) > APSE.r - 0.5 - pad) return false;
    return Math.hypot(x - APSE.cx, z) < APSE.r - 0.5 - pad && !(x > MIHRAB[0] - 1 - pad && Math.abs(z - MIHRAB[2]) < 1.9 + pad);
  }
  if (Math.abs(z) > AISLE_Z - 0.5 - pad) return false;
  // doğu ve batı yarım daire duvarları (kapı ve apsis açıklıkları boş)
  if (Math.abs(z) < R) for (const sx of [-1, 1]) {
    const dx = x - sx * R; if (sx * dx <= 0) continue;
    const d = Math.hypot(dx, z), gap = sx < 0 ? DOOR_HALF : APSE.r;
    if (Math.abs(d - R) < 0.5 + pad && Math.abs(z) > gap - pad) return false;
  }
  // dört büyük ayak (7 × 6 m)
  if (PIERS.some((p) => Math.abs(x - p[0]) < 3.5 + pad && Math.abs(z - p[2]) < 3 + pad)) return false;
  return true;
}
export function walkable(level: Level, x: number, z: number): boolean {
  if (!structural(level, x, z, BODY)) return false;
  if (level === 'galeri') return !GALLERY_COLS.some((c) => Math.hypot(x - c.pos[0], z - c.pos[2]) < c.r + BODY);
  if (x < FACADE_X - 0.5) {
    if (Math.hypot(x - SADIRVAN.x, z - SADIRVAN.z) < SADIRVAN.r + BODY) return false;
    if (Math.abs(x - PORTICO_X) < 0.4 + BODY && PORTICO_COLS.some((c) => Math.abs(z - c) < 0.4 + BODY)) return false;
    return !yardTrees().some((t) => Math.hypot(x - t.x, z - t.z) < (t.kind === 'cinar' ? 0.7 : 0.45) + BODY);
  }
  if (GROUND_COLS.some((c) => Math.hypot(x - c.pos[0], z - c.pos[2]) < c.r + BODY)) return false;
  return segDist(x, z, ...MINBAR_SEG) > 0.85 + BODY;
}
export const camClear = (level: Level, x: number, z: number) => structural(level, x, z, 0.15) || (level === 'zemin' && x < FACADE_X - 0.5 && x > YARD.x0 - 20 && Math.abs(z) < YARD.z + 20);
/** Kamera tavanı: yan nefler galeri döşemesinin altında, narteks alçak, orta mekân çok yüksek */
export function ceiling(level: Level, x: number, z: number): number {
  if (level === 'galeri') return 23.6;
  if (x < FACADE_X - 0.5) return 80;
  if (x < NARTHEX.x1) return NARTHEX.h - 0.4;
  return Math.abs(z) > R + 0.6 ? GALLERY_Y - 0.7 : 40;
}
const navs = new Map<Level, Nav>();
const nav = (l: Level) => { let n = navs.get(l); if (!n) { n = makeNav({ walkable: (x, z) => walkable(l, x, z), bounds: l === 'galeri' ? { x0: -31, x1: 31, z0: 15, z1: 30, cell: 0.5 } : { x0: -108, x1: 36, z0: -56, z1: 56, cell: 0.75 } }); navs.set(l, n); } return n; };
export const slide = (l: Level, p: V2, dx: number, dz: number) => nav(l).slide(p, dx, dz);
export const guideStep = (l: Level, p: V2, goal: V2, dt: number, speed: number) => nav(l).step(p, goal, dt, speed);
export const clearLine = (l: Level, a: V2, b: V2) => nav(l).clearLine(a, b);

/* ---------- rampa (kat geçişi) ---------- */
export interface Door { id: string; level: Level; at: V2; r: number; to: Level; spawn: V2; yaw: number; label: string; wait: V2 }
// yaw: 0 = −z (kuzey), π/2 = −x (batı), π = +z (güney), −π/2 = +x (doğu)
export const DOORS: Door[] = [
  { id: 'rampa-cik', level: 'zemin', at: [-40.4, 25.6], r: 1.7, to: 'galeri', spawn: [-27, 22], yaw: -Math.PI / 2, label: 'Rampadan üst galeriye çık', wait: [-38.6, 23.4] },
  { id: 'rampa-in', level: 'galeri', at: [-30, 22.5], r: 1.3, to: 'zemin', spawn: [-38.4, 22.4], yaw: 0, label: 'Rampadan zemine in', wait: [-27.6, 20.6] },
];
export const nearestDoor = (l: Level, x: number, z: number) => DOORS.find((d) => d.level === l && Math.hypot(d.at[0] - x, d.at[1] - z) < d.r) ?? null;
export const START: { level: Level; at: V2; yaw: number } = { level: 'zemin', at: [-97, 1.4], yaw: -Math.PI / 2 };

/* ---------- incelenebilir noktalar (hagia.ts POIS) ---------- */
export const poiLevel = (p: Poi): Level => (p.rail === 'galeri' ? 'galeri' : 'zemin');
/** Yatay erişim yarıçapı: yüksekteki hedefler (kubbe, apsis mozaiği, levhalar) uzaktan, alçaktakiler yakından incelenir */
export const poiReach = (p: Poi) => (p.id === 'kubbe' ? 13 : p.pos[1] - LEVEL_Y[poiLevel(p)] > 10 ? 10 : 4.5 + p.radius);
export function nearestPoi(l: Level, x: number, z: number): Poi | null {
  let best: Poi | null = null, bs = Infinity;
  for (const p of POIS) { if (poiLevel(p) !== l) continue; const d = Math.hypot(p.pos[0] - x, p.pos[2] - z) / poiReach(p); if (d < 1 && d < bs) { bs = d; best = p; } }
  return best;
}

/* ---------- rehber turu: Elif Hoca (kurgusal sanat tarihçisi) ---------- */
export const GUIDE = { name: 'Elif Hoca', role: 'sanat tarihçisi (kurgusal rehber)' } as const;
/** skipOn: oyuncu zaten bu kattaysa durak atlanır (geçiş durakları için) */
export interface Stop { id: string; level: Level; at: V2; look: V3; lines: string[]; skipOn?: Level }
export const TOUR: Stop[] = [
  { id: 'avlu', level: 'zemin', at: [-93, 3], look: [-42, 30, 0], lines: ['Hoş geldin! Ben Elif, sanat tarihçisiyim. Bugün Ayasofya’yı birlikte gezeceğiz.', 'Yapı 537’de, Bizans imparatoru I. Justinianus döneminde tamamlandı. Önce cepheye yürüyelim; giriş batıdan.'] },
  { id: 'narteks', level: 'zemin', at: [-38, 3], look: [-31.5, 4.2, 0], lines: ['Burası narteks: alçak tavanlı, loş bir giriş holü. Karşıdaki orta kapı İmparator Kapısı; yalnızca imparatora ayrılmıştı.', 'İçeri girince gözlerin bir an kamaşabilir, ışık birden artar. Gel.'] },
  { id: 'kubbe', level: 'zemin', at: [-3, 3.5], look: [0, 48, 0], lines: ['Yukarı bak! Kubbenin tepesi yerden yaklaşık 55 metre yüksekte; çapı 31 metreyi aşıyor.', 'Eteğindeki 40 pencere kubbeyi havada asılıymış gibi gösterir. İlk kubbe 558’deki depremden sonra çöktü; yenisi 562’de daha dik yapıldı.'] },
  { id: 'ayak', level: 'zemin', at: [6, -10.5], look: [10.5, 33, -10.5], lines: ['Kubbe dört büyük ayağa oturur. Köşelerdeki küresel üçgenlere pandantif denir.', 'Pandantifler yuvarlak kubbeyi kare plana bağlar; bu ölçekte ilk kez burada kullanıldı.'] },
  { id: 'omphalion', level: 'zemin', at: [6.2, 5.2], look: [9, 0, 8.5], lines: ['Yerdeki renkli mermer dairelere omphalion denir.', 'Bizans imparatorlarının taç giyme töreninde burada durduğu kabul edilir.'] },
  { id: 'sutunlar', level: 'zemin', at: [-6.2, 12.2], look: [-3.1, 5, R], lines: ['Yandaki yeşil sütunlar Tesalya mermerinden. Köşe nişlerindeki mor sütunlar ise porfir.', 'Porfir Mısır’dan getirilirdi ve imparatorlukla özdeşleşmiş bir taştı.'] },
  { id: 'mihrap', level: 'zemin', at: [25.6, 1.4], look: [34.4, 23, 0], lines: ['Apsis yarım kubbesinde Meryem ve Çocuk İsa mozaiği var; 9. yüzyıldan.', 'Altındaki mihrap Osmanlı döneminde eklendi ve biraz güneye kayık: yapı güneydoğuya, kıble Mekke’ye bakar. Sağdaki mermer minber de Osmanlı eklemesi.'] },
  { id: 'rampa', level: 'zemin', at: [-38.4, 20.5], look: [-40.4, 3, 25.6], skipOn: 'galeri', lines: ['Üst galeriye buradan çıkılır. Galeri geleneksel olarak imparatoriçe ve maiyetine ayrılmıştı.', 'Mozaiklerin en ünlüleri yukarıda. Rampa kapısından geç, ben arkandayım.'] },
  { id: 'deisis', level: 'galeri', at: [-14, 25.6], look: [-14, GALLERY_Y + 2.7, 29.8], lines: ['Deisis mozaiği: ortada İsa, yanlarında Meryem ve Vaftizci Yahya.', 'Çoğu uzmana göre 1261’den sonra yapıldı. Panonun alt bölümü günümüze ulaşmamış.'] },
  { id: 'panolar', level: 'galeri', at: [26, 22], look: [30.8, GALLERY_Y + 2.7, 22.5], lines: ['Doğu duvarında iki imparatorluk panosu var: Zoe ve Komnenos mozaikleri. Zoe panosunda imparatorun yüzü sonradan değiştirilmiş.', 'Turumuz burada bitiyor. Dilediğin gibi dolaş; parlayan düğmelerle her şeyi inceleyebilirsin.'] },
];
export const STOP_RADIUS = 4.5;
export function guideGoal(l: Level, i: number): { at: V2; door: Door | null } {
  const st = TOUR[Math.min(i, TOUR.length - 1)];
  if (st.level === l) return { at: st.at, door: null };
  const d = DOORS.find((x) => x.level === l)!;
  return { at: d.wait, door: d };
}

/* ---------- arka plan figürleri ---------- */
export type Role = 'ziyaretci' | 'gorevli' | 'imam';
export interface Extra { id: string; level: Level; role: Role; at: V2; yaw: number; path?: V2[]; talk?: boolean; minTier?: 'medium' }
export const EXTRAS: Extra[] = [
  { id: 'a1', level: 'zemin', role: 'ziyaretci', at: [-80, -2], yaw: -Math.PI / 2, path: [[-104, -2.2], [-50, -2.2], [-50, 2.2], [-104, 2.2]] },
  { id: 'a2', level: 'zemin', role: 'ziyaretci', at: [-70, -24], yaw: 0.5, talk: true },
  { id: 'a3', level: 'zemin', role: 'ziyaretci', at: [-71.2, -22.8], yaw: -2.4, minTier: 'medium' },
  { id: 'a4', level: 'zemin', role: 'ziyaretci', at: [-56, 14], yaw: -2.6, talk: true, minTier: 'medium' },
  { id: 'a5', level: 'zemin', role: 'gorevli', at: [-45, -3.2], yaw: Math.PI / 2 },
  { id: 'n1', level: 'zemin', role: 'ziyaretci', at: [-37, -12], yaw: Math.PI, path: [[-37, -20], [-37, -6], [-35.5, -6], [-35.5, -20]], minTier: 'medium' },
  { id: 'i1', level: 'zemin', role: 'ziyaretci', at: [-12, -5], yaw: 0, path: [[-20, -5], [12, -5], [12, -1], [-20, -1]] },
  { id: 'i2', level: 'zemin', role: 'ziyaretci', at: [3, 8], yaw: 2.8, talk: true },
  { id: 'i3', level: 'zemin', role: 'ziyaretci', at: [4.2, 9.2], yaw: -0.6 },
  { id: 'i4', level: 'zemin', role: 'ziyaretci', at: [-14, 7], yaw: 0.2, minTier: 'medium' },
  { id: 'i5', level: 'zemin', role: 'ziyaretci', at: [10, 22], yaw: -Math.PI / 2, path: [[-24, 24], [8, 24], [8, 26], [-24, 26]], minTier: 'medium' },
  { id: 'i6', level: 'zemin', role: 'imam', at: [30.5, -2.6], yaw: Math.PI / 2 },
  { id: 'i7', level: 'zemin', role: 'gorevli', at: [-27.5, 4], yaw: -Math.PI / 2 },
  { id: 'i8', level: 'zemin', role: 'ziyaretci', at: [16, -4], yaw: 1.2, talk: true, minTier: 'medium' },
  { id: 'g1', level: 'galeri', role: 'ziyaretci', at: [-10, 27.5], yaw: Math.PI, talk: true },
  { id: 'g2', level: 'galeri', role: 'ziyaretci', at: [6, 21], yaw: 0, path: [[-20, 21], [20, 21]], minTier: 'medium' },
  { id: 'g3', level: 'galeri', role: 'ziyaretci', at: [28.4, 24.6], yaw: -Math.PI / 2 },
];
/** Ses ve pozlama bölgesi için 3B göz konumu */
export const eye3 = (l: Level, x: number, z: number): V3 => [x, LEVEL_Y[l] + 1.68, z];
