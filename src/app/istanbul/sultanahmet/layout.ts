/**
 * Sultanahmet Camii — yaklaşık ölçekli yerleşim (1 birim = 1 m). Saf veri: three.js'e bağımlı değildir, test edilir.
 *
 * Yapı ekseni: +X kıble yönüdür (mihrap duvarı). İstanbul'da kıble yaklaşık 151° (güneydoğu) olduğundan
 * güneş yönü bu eksene göre döndürülür; böylece sabah, öğle ve ikindi ışığı farklı duvarlardan girer.
 * Ölçüler yaklaşıktır: ana kubbe çapı ve yüksekliği kaynaklarda doğrulanamadı (bkz. sites/sultanahmet-camii.json).
 */
export type V3 = [number, number, number];
export type Rect = [number, number, number, number];

export const HALL = { len: 53, wid: 51, wallH: 22, wall: 2 };           // harim (ibadet mekânı)
export const COURT = { len: 52, wid: 51, x: -(HALL.len / 2 + 26), arcadeD: 6, wallH: 9 };
export const DOME = { r: 11.75, drumY: 26, piers: 11.5, pierR: 2.5 };
export const MIHRAB_X = HALL.len / 2 - HALL.wall;
export const DOOR = { w: 4.5, h: 7 };
export const QIBLA_BEARING = 151;

/* ---------- Güneş: ekinoks günü, İstanbul (41° K, 29° D, UTC+3) ---------- */
const LAT = (41.0 * Math.PI) / 180;
const SOLAR_NOON = 13.07;                                                 // yerel saat (UTC+3), yaklaşık
/** Saat (06:30–19:30) → güneş yüksekliği (derece) ve pusula açısı (derece, kuzeyden saat yönünde) */
export function sunPosition(hour: number): { elevation: number; bearing: number } {
  const H = ((hour - SOLAR_NOON) * 15 * Math.PI) / 180;                    // saat açısı, deklinasyon 0
  const sinEl = Math.cos(LAT) * Math.cos(H);
  const el = Math.asin(sinEl);
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT));          // güneyden batıya
  return { elevation: (el * 180) / Math.PI, bearing: ((az * 180) / Math.PI + 180 + 360) % 360 };
}
/** Güneşe doğru birim vektör (yapı ekseninde): +X kıble, +Z kıblenin sağı, +Y yukarı */
export function sunVector(hour: number): V3 {
  const { elevation, bearing } = sunPosition(hour);
  const rel = ((bearing - QIBLA_BEARING) * Math.PI) / 180, e = (elevation * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(rel), Math.sin(e), Math.cos(e) * Math.sin(rel)];
}
export const PHASES: { id: 'sabah' | 'ogle' | 'ikindi'; label: string; from: number; to: number }[] = [
  { id: 'sabah', label: 'Sabah', from: 7, to: 10.5 },
  { id: 'ogle', label: 'Öğle', from: 12, to: 14 },
  { id: 'ikindi', label: 'İkindi', from: 15.5, to: 18.5 },
];
export const phaseOf = (h: number) => PHASES.find((p) => h >= p.from && h <= p.to)?.id ?? null;

/* ---------- Pencereler ve ışık huzmeleri ---------- */
export interface Wall { id: string; n: [number, number]; along: 'x' | 'z'; at: number }
const hx = HALL.len / 2, hz = HALL.wid / 2;
/** İç yüzeylerin konumu ve dışa bakan normali */
export const WALLS: Wall[] = [
  { id: 'kible', n: [1, 0], along: 'z', at: hx - HALL.wall },
  { id: 'giris', n: [-1, 0], along: 'z', at: -hx + HALL.wall },
  { id: 'sag', n: [0, 1], along: 'x', at: hz - HALL.wall },
  { id: 'sol', n: [0, -1], along: 'x', at: -hz + HALL.wall },
];
export const WINDOW_Y = 15.5;
/** Her duvarda 6 üst pencere (giriş duvarında kapının iki yanında 4) */
export function windows(): { wall: Wall; pos: V3 }[] {
  const out: { wall: Wall; pos: V3 }[] = [];
  for (const w of WALLS) {
    const span = (w.along === 'z' ? HALL.wid : HALL.len) - 12, n = w.id === 'giris' ? 4 : 6;
    for (let i = 0; i < n; i++) {
      let t = -span / 2 + (i * span) / (n - 1);
      if (w.id === 'giris' && Math.abs(t) < 6) t += Math.sign(t || 1) * 6;
      out.push({ wall: w, pos: w.along === 'z' ? [w.at, WINDOW_Y, t] : [t, WINDOW_Y, w.at] });
    }
  }
  return out;
}
/** Bir pencereden içeri giren ışının iç yüzeye çarptığı nokta (zemin ya da karşı duvar) */
export function castRay(from: V3, sun: V3): V3 | null {
  const d: V3 = [-sun[0], -sun[1], -sun[2]];
  let best = Infinity;
  if (d[1] < -1e-3) best = Math.min(best, (0 - from[1]) / d[1]);
  const lim = [hx - HALL.wall, hz - HALL.wall];
  for (const [axis, l] of [[0, lim[0]], [2, lim[1]]] as const) for (const s of [-1, 1]) {
    if (Math.abs(d[axis]) < 1e-6) continue;
    const t = (s * l - from[axis]) / d[axis];
    if (t > 0.5) best = Math.min(best, t);
  }
  if (!isFinite(best)) return null;
  return [from[0] + d[0] * best, Math.max(0, from[1] + d[1] * best), from[2] + d[2] * best];
}
/** O saatte ışık alan pencereler ve ışınların vardığı noktalar */
export function shafts(hour: number): { from: V3; to: V3 }[] {
  const sun = sunVector(hour);
  if (sun[1] < Math.sin((3 * Math.PI) / 180)) return [];
  return windows()
    .filter((w) => w.wall.n[0] * sun[0] + w.wall.n[1] * sun[2] > 0.12)    // güneşe bakan duvar
    .map((w) => ({ from: w.pos, to: castRay(w.pos, sun) }))
    .filter((s): s is { from: V3; to: V3 } => !!s.to);
}

/* ---------- Çini panoları: her biri günün belli bir saatinde ışık alır ---------- */
export const MOTIFS = ['lale', 'karanfil', 'sumbul', 'servi', 'hatayi', 'rumi'] as const;
export type MotifId = (typeof MOTIFS)[number];
export interface Panel { motif: MotifId; pos: V3; wall: Wall; hour: number }
const PANEL_Y = 3.2;
const PANEL_HOURS = [8, 9.5, 11, 13, 15.5, 17.5];
/**
 * Panolar, ilgili saatte en az bir ışık huzmesinin düştüğü noktanın en yakın duvarına yerleştirilir.
 * Böylece her motifin "ışığın düştüğü bir saati" vardır; oyuncu saat sürgüsüyle onu arar.
 */
export function panels(): Panel[] {
  const used: V3[] = [];
  return MOTIFS.map((motif, i) => {
    const hour = PANEL_HOURS[i];
    let bestP: Panel | null = null, bestD = Infinity;
    // yalnızca göz hizasına yakın düşen ışık (zemin ya da duvarın alt kısmı) panoyu aydınlatır
    for (const s of shafts(hour).filter((x) => x.to[1] < 6)) for (const w of WALLS) {
      if (w.id === 'giris') continue;
      const lim = (w.along === 'z' ? hz : hx) - HALL.wall - 4;
      const t = Math.max(-lim, Math.min(lim, w.along === 'z' ? s.to[2] : s.to[0]));
      const pos: V3 = w.along === 'z' ? [w.at - w.n[0] * 0.15, PANEL_Y, t] : [t, PANEL_Y, w.at - w.n[1] * 0.15];
      const d = Math.hypot(pos[0] - s.to[0], pos[2] - s.to[2]);
      if (d < bestD && used.every((u) => Math.hypot(u[0] - pos[0], u[2] - pos[2]) > 7)) { bestD = d; bestP = { motif, pos, wall: w, hour }; }
    }
    used.push(bestP!.pos);
    return bestP!;
  });
}
/** Pano o saatte ışık alıyor mu: bir huzmenin vardığı nokta panoya 5 m'den yakınsa */
export const LIT_RADIUS = 5;
export function isLit(p: Panel, hour: number): boolean {
  return shafts(hour).some((s) => Math.hypot(s.to[0] - p.pos[0], s.to[2] - p.pos[2]) < LIT_RADIUS && s.to[1] < 6);
}

/* ---------- Minareler: 4'ü harimin köşelerinde (3 şerefe), 2'si avlunun dış köşelerinde (2 şerefe) ---------- */
export function minarets(): { pos: V3; h: number; balconies: number }[] {
  const out: { pos: V3; h: number; balconies: number }[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push({ pos: [sx * (hx + 1.5), 0, sz * (hz + 1.5)], h: 64, balconies: 3 });
  for (const sz of [-1, 1]) out.push({ pos: [COURT.x - COURT.len / 2 - 1.5, 0, sz * (COURT.wid / 2 + 1.5)], h: 54, balconies: 2 });
  return out;
}

/* ---------- Yürüme ---------- */
export const WALK = { eye: 1.65, radius: 0.45, bound: [-150, -80, 70, 80] as Rect, spawn: { x: COURT.x - 14, z: 0, yaw: -Math.PI / 2 } };
export const MIHRAB_ZONE = { x: MIHRAB_X - 4, r: 5 };
export const insideHall = (x: number, z: number) => Math.abs(x) < hx - HALL.wall && Math.abs(z) < hz - HALL.wall;
export const underDome = (x: number, z: number) => Math.hypot(x, z) < DOME.r - 2;

export function walkColliders(): Rect[] {
  const out: Rect[] = [], t = HALL.wall, d2 = DOOR.w / 2;
  const box = (x0: number, z0: number, x1: number, z1: number) => out.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  // harim duvarları; giriş (avlu) duvarında kapı boşluğu
  box(-hx, -hz, hx, -hz + t); box(-hx, hz - t, hx, hz); box(hx - t, -hz, hx, hz);
  box(-hx, -hz, -hx + t, -d2); box(-hx, d2, -hx + t, hz);
  // fil ayakları
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * DOME.piers, z = sz * DOME.piers, r = DOME.pierR; box(x - r, z - r, x + r, z + r); }
  // minber ve mihrap önü
  box(MIHRAB_X - 3, 5, MIHRAB_X, 7.5);
  // avlu çevre duvarı; dış girişte (avlunun batısında) boşluk
  const cx0 = COURT.x - COURT.len / 2, cx1 = COURT.x + COURT.len / 2, cz = COURT.wid / 2;
  box(cx0, -cz, cx1, -cz + 1); box(cx0, cz - 1, cx1, cz);
  box(cx0, -cz, cx0 + 1, -d2); box(cx0, d2, cx0 + 1, cz);
  // revak sütunları (avlu kenarları boyunca)
  for (const c of arcadeColumns()) box(c[0] - 0.5, c[2] - 0.5, c[0] + 0.5, c[2] + 0.5);
  // şadırvan
  box(COURT.x - 3, -3, COURT.x + 3, 3);
  // minareler
  for (const m of minarets()) box(m.pos[0] - 1.6, m.pos[2] - 1.6, m.pos[0] + 1.6, m.pos[2] + 1.6);
  return out;
}
/** Avluyu çevreleyen revak sütunları (iç kenar) */
export function arcadeColumns(): V3[] {
  const out: V3[] = [], a = COURT.arcadeD, x0 = COURT.x - COURT.len / 2 + a, x1 = COURT.x + COURT.len / 2 - a, z = COURT.wid / 2 - a;
  for (let i = 0; i <= 6; i++) { const x = x0 + ((x1 - x0) * i) / 6; out.push([x, 0, -z], [x, 0, z]); }
  for (let i = 1; i < 6; i++) { const zz = -z + (2 * z * i) / 6; if (Math.abs(zz) > 3) out.push([x0, 0, zz]); }
  return out;
}
