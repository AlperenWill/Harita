/**
 * Hattuşa — "Kralın Yolu": arazi, ~6 km'lik sur halkası, kapılar, elçinin rotası ve Yazılıkaya (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Kent kuzey–güney uzanımlı bir halka; Yukarı Şehir güneyde ve yüksekte.
 *
 * GERÇEKLE İLİŞKİ (STİLİZE):
 *  - Sur halkası ~6 km (gerçek çevre kaynaklara göre 6 km'yi aşar). Kapıların halka üstündeki sırası gerçeğe uygundur:
 *    Aslanlı Kapı batıda, Sfenksli Kapı güney ucunda Yerkapı setinin üstünde, Kral Kapısı doğuda.
 *  - Elçinin yolu (oyun kurgusu): Büyükkale'deki kabulden sonra Yukarı Şehir'den Aslanlı Kapı'dan ÇIKAR, Yerkapı setinin dış
 *    merdiveninden çıkıp Sfenksli Kapı'dan YENİDEN GİRER, Kral Kapısı'ndan çıkıp Yazılıkaya yoluna geçer. Kapalı bir halkada üç kapıdan
 *    geçip dışarıda bitmek için bu sıra gerekir.
 *  - Yazılıkaya gerçekte kentin kuzeydoğusunda ~1,5–2 km uzaktadır; burada doğuya, kısaltılmış bir yola yerleştirildi.
 */
export type V3 = [number, number, number];
export type V2 = [number, number];
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x: number, z: number) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; }

/* ---------- sur halkası ---------- */
export const RING = { cx: 0, cz: -540, rx: 765, rz: 1255 } as const;   // çevre ≈ 6 km
const ringRaw = (t: number): V2 => { const w = 1 + 0.035 * Math.sin(t * 5 + 1) + 0.02 * Math.sin(t * 11); return [RING.cx + RING.rx * Math.cos(t) * w, RING.cz + RING.rz * Math.sin(t) * w]; };
/** Halka, 4 m aralıklı örneklere yeniden parametrelenir (yay uzunluğu) */
export const WALL_STEP = 4;
export const WALL: V2[] = (() => {
  const dense: V2[] = []; for (let i = 0; i <= 8000; i++) dense.push(ringRaw((i / 8000) * Math.PI * 2));
  const out: V2[] = [dense[0]]; let acc = 0;
  for (let i = 1; i < dense.length; i++) { acc += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]); if (acc >= WALL_STEP) { out.push(dense[i]); acc = 0; } }
  return out;
})();
export const WALL_LEN = WALL.length * WALL_STEP;
/** Halka üzerindeki açıya en yakın örnek */
export const wallIndexAt = (t: number) => { const p = ringRaw(t); let b = 0, bd = Infinity; WALL.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; b = i; } }); return b; };
export function distToWall(x: number, z: number): number { let b = Infinity; for (let i = 0; i < WALL.length; i += 2) { const d = Math.hypot(WALL[i][0] - x, WALL[i][1] - z); if (d < b) b = d; } return b; }

/* ---------- kapılar ---------- */
export type GateId = 'aslanli' | 'sfenksli' | 'kral';
export interface Gate { id: GateId; name: string; t: number; idx: number; at: V2; inward: V2; s: number; dirOut: boolean }
const GATE_T: Record<GateId, number> = { aslanli: (130 * Math.PI) / 180, sfenksli: Math.PI / 2, kral: (50 * Math.PI) / 180 };
function gateAt(id: GateId): { idx: number; at: V2; inward: V2 } {
  const idx = wallIndexAt(GATE_T[id]), at = WALL[idx], dx = RING.cx - at[0], dz = RING.cz - at[1], l = Math.hypot(dx, dz);
  return { idx, at, inward: [dx / l, dz / l] };
}

/* ---------- arazi: Yukarı Şehir güneyde yüksek; Yerkapı seti güney ucunda ---------- */
export const YERKAPI_H = 18;
export function heightAt(x: number, z: number): number {
  let h = 40 + Math.max(-1500, Math.min(800, z)) * 0.035 + (noise(x * 0.004, z * 0.004) - 0.5) * 30 + (noise(x * 0.02, z * 0.02) - 0.5) * 4;
  const sph = gateAt('sfenksli').at, d = Math.hypot(x - sph[0], z - sph[1]);
  if (d < 260) { const dw = distToWall(x, z), out = z > sph[1] - 30 ? 1 : 0.5; h += YERKAPI_H * Math.exp(-((dw / 34) ** 2)) * Math.max(0, 1 - d / 260) * out; }   // Yerkapı yapay seti
  return h;
}

/* ---------- rota ---------- */
const lerp2 = (a: V2, b: V2, k: number): V2 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
export const YAZILIKAYA = { x: 870, z: 140 } as const;
function buildRoute(): V2[] {
  const A = gateAt('aslanli'), S = gateAt('sfenksli'), K = gateAt('kral');
  const off = (g: { at: V2; inward: V2 }, d: number): V2 => [g.at[0] + g.inward[0] * d, g.at[1] + g.inward[1] * d];
  return [
    [-170, 60], [-260, 170], off(A, 70), off(A, 18), A.at, off(A, -18), off(A, -60),             // Büyükkale yönünden → Aslanlı Kapı (dışarı)
    off(A, -80), lerp2(off(A, -95), off(S, -130), 0.35), lerp2(off(A, -95), off(S, -130), 0.7), off(S, -130),  // sur dışı, setin eteği
    off(S, -60), off(S, -18), S.at, off(S, 18), off(S, 70),                                       // Yerkapı merdiveni → Sfenksli Kapı (içeri)
    lerp2(off(S, 70), off(K, 70), 0.5), off(K, 70), off(K, 18), K.at, off(K, -18), off(K, -70),  // Yukarı Şehir → Kral Kapısı (dışarı)
    [K.at[0] + 230, K.at[1] - 40], [YAZILIKAYA.x - 40, YAZILIKAYA.z + 30], [YAZILIKAYA.x, YAZILIKAYA.z],
  ];
}
const WP = buildRoute();
const LENS = [0]; for (let i = 1; i < WP.length; i++) LENS.push(LENS[i - 1] + Math.hypot(WP[i][0] - WP[i - 1][0], WP[i][1] - WP[i - 1][1]));
export const ROUTE_LEN = LENS[LENS.length - 1];
export function routeAt(s: number): { p: V3; dir: V2 } {
  const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < LENS.length - 1 && LENS[i] < c) i++;
  const a = WP[i - 1], b = WP[i], k = (c - LENS[i - 1]) / Math.max(1e-6, LENS[i] - LENS[i - 1]);
  const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return { p: [x, heightAt(x, z), z], dir: [dx / l, dz / l] };
}
export function closestS(x: number, z: number): number { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 1) { const p = routeAt(s).p, d = Math.hypot(p[0] - x, p[2] - z); if (d < bd) { bd = d; best = s; } } return best; }

const NAMES: Record<GateId, string> = { aslanli: 'Aslanlı Kapı', sfenksli: 'Sfenksli Kapı', kral: 'Kral Kapısı' };
export const GATES: Gate[] = (['aslanli', 'sfenksli', 'kral'] as GateId[]).map((id) => { const g = gateAt(id); return { id, name: NAMES[id], t: GATE_T[id], ...g, s: closestS(g.at[0], g.at[1]), dirOut: id !== 'sfenksli' }; });
/** Yazılıkaya bölgesi: rotanın son 26 metresi → sabit geniş açı */
export const YAZ_S = ROUTE_LEN - 26;
