/**
 * Munzur Vadisi ve Gözeleri (Ovacık, Tunceli) — "Kırk Göze": vadi tabanı, dik kireçtaşı yamaçlar, dağ eteğinden fışkıran gözeler,
 * Munzur Çayı, ahşap köprülü yürüyüş yolu ve 7 durak (saf veri; three.js'siz, test edilir). Bayburt / Şeytan Kalesi ile aynı düzen.
 *
 * Eksenler: +x vadi aşağısı (çayın aktığı yön), −x gözeler (vadinin başı). Yürüyüş yolu kuzey kıyıdan gözelere çıkar, köprüyle güney
 * kıyıya geçer ve ikinci köprüden döner. Vadi biçimi, göze sayısı/yeri ve yol düzeni TEMSİLÎDİR (docs/MUNZUR.md).
 */
export type V2 = [number, number];
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ===================== vadi ===================== */
/** Vadi tabanı: gözelere doğru hafifçe yükselir */
export const floorY = (x: number) => -x * 0.015;
/** Çayın orta çizgisi */
export const riverZ = (x: number) => 7 * Math.sin(x * 0.02 + 0.4) + 2 * Math.sin(x * 0.07);
export const RIVER_X0 = -66;   // çayın başladığı yer (gözelerin birleştiği yatak)
export const riverW = (x: number) => 5 + 3 * smooth(RIVER_X0, 120, x);
/** Gözeler: dağ eteğinden çıkan kaynaklar (sayı ve yer temsilî) ve çaya inen kısa kolları */
export const HEAD_X = -86;
export const SPRINGS: V2[] = [-24, -18, -12, -7, -2, 3, 8, 13, 19, 24].map((z, i) => [HEAD_X + 2 + Math.abs(Math.sin(i * 1.7)) * 3, z]);
const segD = (x: number, z: number, a: V2, b: V2) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return { d: Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t), t }; };
/** Gözeden çaya inen kolun uzaklığı */
export function springDist(x: number, z: number): number { let m = Infinity; for (const s of SPRINGS) m = Math.min(m, segD(x, z, s, [RIVER_X0, riverZ(RIVER_X0)]).d); return m; }
/** Çayın uzaklığı (orta çizgiden) */
export const riverDist = (x: number, z: number) => (x < RIVER_X0 ? Infinity : Math.abs(z - riverZ(x)));
const valleyHalf = (x: number) => 46 + 10 * Math.sin(x * 0.011 + 1);
/** Doğal arazi (köprüsüz) */
export function terrainBase(x: number, z: number): number {
  const f = floorY(x), d = Math.abs(z) - valleyHalf(x), south = z < 0 ? 1.25 : 1;
  const ridge = Math.sin(x * 0.031 + z * 0.02) * 6 + Math.sin(x * 0.09 - z * 0.05) * 2.5;
  let y = f + Math.sin(x * 0.05) * 0.4 + Math.cos(z * 0.07) * 0.3;
  if (d > -8) { const u = Math.max(0, d + 8); y += (260 * south) * (1 - Math.exp(-u / 105)) ** 1.15 + 6 * Math.sin(u * 0.09) * smooth(10, 40, u) + Math.max(0, d) * 0.12 + ridge * 1.6 * smooth(0, 40, d); }   // basamaklı kireçtaşı yamaçlar
  if (x < HEAD_X + 6) y += (HEAD_X + 6 - x) ** 1.35 * 2.1 + ridge * smooth(HEAD_X + 6, HEAD_X - 20, x);   // vadinin başındaki dağ (gözeler eteğinden çıkar)
  const rd = riverDist(x, z), w = riverW(x); if (rd < w + 2) y = Math.min(y, f - 1.3 * (1 - smooth(w * 0.4, w + 2, rd)) + 0.0);
  const sd = springDist(x, z); if (x > HEAD_X && sd < 2.6) y = Math.min(y, f - 0.7 * (1 - smooth(0.8, 2.6, sd)));
  return y;
}

/* ===================== yollar ve köprüler ===================== */
export interface Trail { id: string; pts: V2[]; w: number; bridge?: boolean }
export const TRAILS: Trail[] = [
  { id: 'kuzey', pts: [[168, 30], [120, 29], [70, 27], [20, 25], [-30, 24], [-58, 22], [-72, 14]], w: 3 },
  { id: 'kopru1', pts: [[-40, 23.5], [-40, -17]], w: 2.4, bridge: true },
  { id: 'guney', pts: [[-70, -21], [-60, -21], [-40, -17], [0, -20], [40, -22]], w: 2.6 },
  { id: 'kopru2', pts: [[40, -22], [40, 27]], w: 2.4, bridge: true },
  { id: 'cayir', pts: [[-20, 25], [-14, 34], [2, 36], [14, 27]], w: 2.4 },
];
export function trailAt(x: number, z: number): { d: number; tr: Trail | null; t: number } {
  let best = { d: Infinity, tr: null as Trail | null, t: 0 };
  for (const tr of TRAILS) for (let i = 0; i < tr.pts.length - 1; i++) { const s = segD(x, z, tr.pts[i], tr.pts[i + 1]); if (s.d < best.d) best = { d: s.d, tr, t: s.t }; }
  return best;
}
/** Köprü tabliyesinin yüksekliği: iki kıyının yüksekliği arasında, ortası hafif kemerli */
function deckY(tr: Trail, t: number) { const a = tr.pts[0], b = tr.pts[1], ya = terrainBase(...a), yb = terrainBase(...b); return ya + (yb - ya) * t + (0.35 + Math.sin(t * Math.PI) * 0.5) * smooth(0, 0.15, t) * smooth(0, 0.15, 1 - t); }   // uçlarda kıyıya yumuşak iner
/** Yürüme yüksekliği: köprüde tabliye, başka yerde arazi */
export function groundY(x: number, z: number): number {
  const h = terrainBase(x, z);
  for (const tr of TRAILS) if (tr.bridge) { const s = segD(x, z, tr.pts[0], tr.pts[1]); if (s.d < tr.w / 2 + 0.6 && s.t > 0.02 && s.t < 0.98) return Math.max(h, deckY(tr, s.t)); }
  return h;
}
export function walkable(x: number, z: number): boolean { const t = trailAt(x, z); return !!t.tr && t.d < t.tr.w / 2 - 0.2; }
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== yaban keçileri ===================== */
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Kuzey yamaçta keçi sürüsü (yer temsilî) */
export const GOATS: { x: number; z: number; yaw: number; s: number }[] = (() => { const r = rng(62), out: { x: number; z: number; yaw: number; s: number }[] = [];
  for (let i = 0; i < 12; i++) { const x = 46 + r() * 40, z = valleyHalf(x) - 2 + r() * 16; out.push({ x, z, yaw: r() * 6.28, s: 0.85 + r() * 0.3 }); }
  return out; })();

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Munzur Valley National Park', url: 'https://en.wikipedia.org/wiki/Munzur_Valley_National_Park' },
  kure: { title: 'Küre Ansiklopedisi — Munzur Vadisi Millî Parkı', url: 'https://kureansiklopedi.com/tr/detay/munzur-vadisi-milli-parki-6de28' },
  dha: { title: 'DHA — Munzur Vadisi Milli Parkı\'na inen dağ keçileri', url: 'https://www.dha.com.tr/foto-galeri/munzur-vadisi-milli-parkina-inen-dag-kecileri-dron-kamerasinda-2589179' },
  duvar: { title: 'Duvar English — Protest over the protection status of the Munzur springs', url: 'https://www.duvarenglish.com/locals-protest-government-decision-to-downgrade-protection-status-of-springs-sacred-for-alevi-faith-in-eastern-turkey-news-65193' },
  ara: { title: 'Ara — The sacred valley of Dersim', url: 'https://en.ara.cat/sunday/the-sacred-valley-of-dersim-where-cultural-resistance-and-ecological-reverence-coexist_130_5747100.html' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('gozeler', 'Munzur Gözeleri', 'Kaynak', [-70, 15.5], [HEAD_X + 3, floorY(HEAD_X) + 3.2, 8],
    'Munzur Çayı, Ovacık yakınlarında dağın eteğinden fışkıran gözelerden doğar. Kaynakların sayısı genellikle 40 civarında verilir; bazı kaynaklar 300\'den fazla soğuk su gözesinden söz eder. Buz gibi su kayaların arasından çağlayarak birkaç yüz metrede çaya dönüşür.', SRC.ara),
  mk('inanc', 'Kutsal su', 'İnanç', [-69, -21], [HEAD_X + 3, floorY(HEAD_X) + 3, -12],
    'Gözeler Alevi inancında kutsaldır ve kuşaklardır inananlar tarafından korunur. İnanca göre gözelerin doğal hâli değiştirilmemelidir. Bu yüzden kaynakların çevresindeki yapılaşma girişimleri tepkiyle karşılanmıştır.', SRC.duvar),
  mk('park', 'Munzur Vadisi Millî Parkı', 'Millî park', [118, 29], [118, floorY(118) + 2.6, 32.5],
    'Munzur Vadisi 1971\'de millî park ilan edildi; yaklaşık 42 bin hektarlık alanıyla Türkiye\'nin en büyük ve biyolojik çeşitliliği en zengin millî parklarından biri sayılır. Parkta avlanmak yasaktır.', SRC.kure),
  mk('endemik', 'Çiçekli çayır', 'Bitkiler', [2, 36], [2, floorY(2) + 1.4, 39],
    'Parkta yaklaşık 1.500 bitki türü yaşar. Bunların 43\'ü yalnızca Munzur Vadisi\'nde, 227\'si yalnızca Türkiye\'de yetişir. Munzur kardeleni ve Munzur geveni bu türlerden bazılarıdır. (Kaynaklarda sayılar biraz farklı verilir.)', SRC.wiki),
  mk('keci', 'Yaban keçileri', 'Yaban hayatı', [64, 26.7], [GOATS[0].x, terrainBase(GOATS[0].x, GOATS[0].z) + 2.4, GOATS[0].z],
    'Munzur Vadisi Türkiye\'de en çok yaban keçisinin yaşadığı bölge olarak bilinir. Keçiler dik kayalıklarda otlar; kışın yiyecek bulmak için vadi tabanına kadar iner. Ayı, kurt ve vaşak da parkta yaşayan türler arasındadır.', SRC.dha),
  mk('cay', 'Munzur Çayı', 'Nehir', [-40, 3], [-40, floorY(-40) + 2.2, riverZ(-40) + 3],
    'Gözelerden doğan çay vadi boyunca akarak Tunceli\'ye ulaşır ve oradan Keban Baraj Gölü\'ne karışır. Soğuk ve berrak suyunda alabalık yaşar; çevredeki kayalıklarda yırtıcı kuşlar yuva yapar.', SRC.wiki),
  mk('koruma', 'Koruma', 'Bugün', [40, 3], [40, floorY(40) + 2.2, riverZ(40) + 3],
    'Baraj projeleri, madencilik, kaçak avcılık ve gözelerin çevresindeki yapılaşma vadi için tehdit olarak gösterilir. Gözelerin koruma statüsünün düşürülmesi kararı yöre halkının protestolarına yol açtı.', SRC.duvar),
];
export const START: { at: V2; yaw: number } = { at: [164, 30], yaw: Math.PI / 2 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -95, x1: 175, z0: -40, z1: 50 };
