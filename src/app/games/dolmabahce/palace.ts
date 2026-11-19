/**
 * Dolmabahçe Sarayı — plan, rota ve kamera bölgeleri (saf; test edilir). Koordinat: metre; x doğu (Boğaz tarafı), −z kuzey, y yukarı.
 *
 * Plan stilizedir ve ölçüler kısaltılmıştır (rölöve değil). Ziyaretçi rotası tek yönlüdür:
 *   Medhal Salonu (giriş) → Muayede Salonu (kubbe, dev avize, Hereke halısı) → doğu koridoru → Kristal Merdiven (çift at nalı;
 *   rota sol kolu tırmanır) → Süfera Salonu (üst kat) → Atatürk'ün odası.
 * NEDEN RAY (yalnızca ileri/geri)? Konsept "lüks ve detay": oyuncu yürür, kamera her bölümde önceden seçilmiş en iyi açıyı
 * kendiliğinden bulur (serbest kamera yok). Ray, kameranın hiçbir zaman duvarın içine girmemesini de garanti eder.
 */
export type V3 = [number, number, number];
export type Surface = 'mermer' | 'hali' | 'parke';
export type Zone = 'medhal' | 'muayede' | 'avize' | 'koridor' | 'merdiven' | 'sufera' | 'ataturk';
export const ZONE_LABEL: Record<Zone, string> = { medhal: 'Medhal Salonu', muayede: 'Muayede Salonu', avize: 'Muayede Salonu · avizenin altı', koridor: 'Koridor', merdiven: 'Kristal Merdiven', sufera: 'Süfera Salonu', ataturk: 'Atatürk’ün odası' };

/* ---------- odalar (iç yüzleri görünen kutular) ---------- */
export interface Room { id: Zone; x0: number; x1: number; z0: number; z1: number; y: number; h: number }
export const UPPER = 6;
export const ROOMS: Room[] = [
  { id: 'medhal', x0: -9, x1: 9, z0: 0, z1: 14, y: 0, h: 9 },
  { id: 'muayede', x0: -20, x1: 20, z0: -40, z1: 0, y: 0, h: 14 },
  { id: 'koridor', x0: 20, x1: 26, z0: -23, z1: -17, y: 0, h: 6 },
  { id: 'merdiven', x0: 26, x1: 44, z0: -32, z1: -12, y: 0, h: 15 },
  { id: 'sufera', x0: 26, x1: 44, z0: -50, z1: -32, y: UPPER, h: 8 },
  { id: 'ataturk', x0: 44, x1: 52, z0: -48, z1: -40, y: UPPER, h: 5 },
];
export const DOME = { cx: 0, cz: -20, r: 16, springY: 14 } as const;           // Muayede kubbesi (gerçekte tepe ~36 m; burada ~30 m)
export const CHANDELIER = { x: 0, y: 17, z: -20 } as const;                     // dev avizenin merkezi
export const SUFERA_CHANDELIER = { x: 35, y: UPPER + 5.6, z: -41 } as const;
/** Kristal Merdiven: merkez (35, −22), yarıçap 6; iki kol öndeki (z −16) tabandan arkadaki (z −28) sahanlığa yarım daire çizerek çıkar */
export const STAIR = { cx: 35, cz: -22, r: 6, width: 2.2, steps: 30 } as const;
export const stairPoint = (side: -1 | 1, u: number): V3 => { const th = u * Math.PI; return [STAIR.cx + side * STAIR.r * Math.sin(th), UPPER * u, STAIR.cz + STAIR.r * Math.cos(th)]; };

/* ---------- rota (yay uzunluğuyla parametrelenmiş çoklu çizgi) ---------- */
interface WP { p: V3; surface: Surface }
const W = (x: number, y: number, z: number, surface: Surface): WP => ({ p: [x, y, z], surface });
const STAIR_WPS: WP[] = Array.from({ length: 13 }, (_, i) => ({ p: stairPoint(-1, i / 12), surface: 'hali' as Surface }));
export const WAYPOINTS: WP[] = [
  W(0, 0, 13, 'mermer'), W(0, 0, 7, 'mermer'), W(0, 0, 1, 'mermer'),
  W(0, 0, -6, 'mermer'), W(0, 0, -12, 'hali'), W(0, 0, -20, 'hali'), W(6, 0, -24, 'hali'), W(13, 0, -22, 'mermer'), W(19, 0, -20, 'mermer'),
  W(23, 0, -20, 'parke'), W(28, 0, -17, 'mermer'), W(33, 0, -15.6, 'mermer'),
  ...STAIR_WPS,
  W(35, UPPER, -30.5, 'mermer'), W(35, UPPER, -34, 'parke'), W(35, UPPER, -38, 'hali'), W(39, UPPER, -44, 'hali'), W(43, UPPER, -44, 'parke'), W(47.5, UPPER, -44, 'hali'),
];
const lens: number[] = [0];
for (let i = 1; i < WAYPOINTS.length; i++) { const a = WAYPOINTS[i - 1].p, b = WAYPOINTS[i].p; lens.push(lens[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
export const ROUTE_LEN = lens[lens.length - 1];
/** s (metre) → konum, ileri yön (yatay birim vektör), zemin türü */
export function routeAt(s: number): { p: V3; dir: [number, number]; surface: Surface; i: number } {
  const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < lens.length - 1 && lens[i] < c) i++;
  const a = WAYPOINTS[i - 1], b = WAYPOINTS[i], k = (c - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
  const p: V3 = [a.p[0] + (b.p[0] - a.p[0]) * k, a.p[1] + (b.p[1] - a.p[1]) * k, a.p[2] + (b.p[2] - a.p[2]) * k];
  const dx = b.p[0] - a.p[0], dz = b.p[2] - a.p[2], l = Math.hypot(dx, dz) || 1;
  return { p, dir: [dx / l, dz / l], surface: k < 0.5 ? a.surface : b.surface, i };
}
/** Bir noktaya en yakın rota konumu (s) */
export function closestS(q: V3): number {
  let best = 0, bd = Infinity;
  for (let s = 0; s <= ROUTE_LEN; s += 0.25) { const p = routeAt(s).p, d = Math.hypot(p[0] - q[0], (p[1] - q[1]) * 2, p[2] - q[2]); if (d < bd) { bd = d; best = s; } }
  return best;
}
/** Bulunulan bölge (kamera kipi ve ses için); avize bölgesi: avizenin altında 5,5 m içinde */
export function zoneAt(p: V3): Zone {
  if (p[1] < 1 && Math.hypot(p[0] - CHANDELIER.x, p[2] - CHANDELIER.z) < 5.5) return 'avize';
  for (const r of ROOMS) if (p[0] >= r.x0 && p[0] <= r.x1 && p[2] >= r.z0 && p[2] <= r.z1 && p[1] >= r.y - 0.5 && p[1] <= r.y + r.h) { if (r.id === 'merdiven' && p[1] > UPPER - 0.2 && p[2] < -30) continue; return r.id; }
  return p[1] > UPPER - 0.5 ? 'sufera' : 'muayede';
}
export const roomOf = (z: Zone) => ROOMS.find((r) => r.id === (z === 'avize' ? 'muayede' : z))!;
/** Kamera bir odanın içinde kalsın (duvarlardan 0,4 m içeride, tavanın altında) */
export function clampToRoom(z: Zone, c: V3): V3 {
  const r = roomOf(z), m = 0.4;
  return [Math.max(r.x0 + m, Math.min(r.x1 - m, c[0])), Math.max(r.y + 0.6, Math.min(r.y + r.h - 0.5, c[1])), Math.max(r.z0 + m, Math.min(r.z1 - m, c[2]))];
}
