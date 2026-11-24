/**
 * Sinop Tarihi Cezaevi — "Anadolu'nun Alkatrazı": liman rıhtımı, Sinop Kalesi'nin iç kale surları ve kuleleri, kapıdan girilen cezaevi avlusu,
 * gardiyan binası, iki katlı koğuş binası (içinde koridor, dört koğuş, on iki hücre) ve 7 durak (saf veri; three.js'siz, test edilir).
 * Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (liman, deniz), −z kuzey (koğuş binası). Oyuncu rıhtımdan sur kapısına yürür, avluya girer, koğuş binasına yan kapıdan
 * girip koridorda dolaşır, koğuşlara ve hücrelere bakar. Ölçüler, bina düzeni ve oda sayıları TEMSİLÎDİR (docs/SINOP-CEZAEVI.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

export const FLOOR = 0.22;
/** İç kale: surların iç sınırı (avlu), sur kalınlığı ve yüksekliği, güneyde kapı */
export const CASTLE = { x0: -28, x1: 28, z0: -28, z1: 24 };
export const WALL = { t: 2.4, h: 10 };
export const GATE = { w: 3.2, h: 5.2 };
/** Sur kuleleri (merkez, yarıçap); içine girilmez */
export const TOWERS: { c: V2; r: number }[] = [
  { c: [-29.2, -29.2], r: 3.4 }, { c: [29.2, -29.2], r: 3.4 }, { c: [-29.2, 25.2], r: 3.4 }, { c: [29.2, 25.2], r: 3.4 },
  { c: [0, -29.2], r: 3.2 }, { c: [-29.2, -2], r: 3.2 }, { c: [29.2, -2], r: 3.2 }, { c: [-13, 25.2], r: 3 }, { c: [13, 25.2], r: 3 },
];
/** Koğuş binası: dış sınır, iç bölümler (koğuşlar kuzeyde, ortada koridor, güneyde hücreler), iki uçta kapı */
export const WARD = { x0: -20, x1: 20, z0: -23, z1: -11 };
export const WARD_T = 0.4, STOREY = 3.4;
export const ROOMS = { wards: { z0: -22.6, z1: -17.4 }, corridor: { z0: -17, z1: -14.6 }, cells: { z0: -14.2, z1: -11.4 } };
/** Koğuşlar (dört oda; bölme duvarları x = −10, 0, 10) ve kapı merkezleri */
export const WARDS: { x0: number; x1: number; door: number }[] = [
  { x0: -19.6, x1: -10.2, door: -15 }, { x0: -9.8, x1: -0.2, door: -5 }, { x0: 0.2, x1: 9.8, door: 5 }, { x0: 10.2, x1: 19.6, door: 15 },
];
/** Hücreler: koridorun güneyinde on iki tek kişilik oda */
export const CELL_N = 12, CELL_W = (WARD.x1 - WARD.x0 - 2 * WARD_T) / CELL_N;
export const CELLS: { x0: number; x1: number; door: number }[] = Array.from({ length: CELL_N }, (_, i) => {
  const x0 = WARD.x0 + WARD_T + i * CELL_W; return { x0: x0 + 0.1, x1: x0 + CELL_W - 0.1, door: x0 + CELL_W / 2 };
});
/** Koridorun iki ucundaki kapılar (z merkezi) */
export const END_DOOR_Z = (ROOMS.corridor.z0 + ROOMS.corridor.z1) / 2;
/** Gardiyan binası (avluda, kapının yanında; içine girilmez) */
export const GUARD = { x0: 8, x1: 18, z0: 10, z1: 18 };
/** Dış alan: rıhtım ve kent; z > SHORE deniz */
export const SHORE = 52;
export const OUT = { x0: -56, x1: 56, z0: -44, z1: SHORE };

function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Kent evleri (surların dışında; yürünmez) */
export interface House { x: number; z: number; w: number; d: number; yaw: number; floors: number }
export const HOUSES: House[] = (() => { const r = rng(57), out: House[] = [];
  for (let i = 0; i < 500 && out.length < 18; i++) { const x = -54 + r() * 108, z = -42 + r() * 78, w = 6 + r() * 4, d = 6 + r() * 3;
    if (x > CASTLE.x0 - WALL.t - 9 && x < CASTLE.x1 + WALL.t + 9 && z < CASTLE.z1 + WALL.t + 9) continue;   // surların çevresi
    if (z > 30) continue;   // rıhtım
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (Math.max(o.w, o.d) + Math.max(w, d)) / 2 + 3)) continue;
    out.push({ x, z, w, d, yaw: (r() - 0.5) * 0.4, floors: r() < 0.65 ? 2 : 1 }); }
  return out; })();

function insideWard(x: number, z: number): boolean {
  const m = 0.3, R = ROOMS;
  for (const w of WARDS) {
    if (x > w.x0 + m && x < w.x1 - m && z > R.wards.z0 + m && z < R.wards.z1 - m) return true;
    if (Math.abs(x - w.door) < 0.5 && z >= R.wards.z1 - m && z <= R.corridor.z0 + m) return true;   // koğuş kapısı
  }
  if (x > WARD.x0 + WARD_T + m && x < WARD.x1 - WARD_T - m && z > R.corridor.z0 + m && z < R.corridor.z1 - m) return true;
  if (Math.abs(z - END_DOOR_Z) < 0.6 && (x <= WARD.x0 + WARD_T + m || x >= WARD.x1 - WARD_T - m)) return true;   // uç kapılar
  for (const c of CELLS) {
    if (x > c.x0 + m && x < c.x1 - m && z > R.cells.z0 + m && z < R.cells.z1 - m) return true;
    if (Math.abs(x - c.door) < 0.4 && z >= R.corridor.z1 - m && z <= R.cells.z0 + m) return true;   // hücre kapısı
  }
  return false;
}
export const inWard = (x: number, z: number, m = 0) => inR(WARD, x, z, -m);
const outerCastle: Rect = { x0: CASTLE.x0 - WALL.t, x1: CASTLE.x1 + WALL.t, z0: CASTLE.z0 - WALL.t, z1: CASTLE.z1 + WALL.t };
export const inCastleBlock = (x: number, z: number, m = 0) => inR(outerCastle, x, z, -m);
function inCourtyard(x: number, z: number): boolean {
  if (inWard(x, z, 0.35)) return insideWard(x, z);
  if (inR(GUARD, x, z, -0.4)) return false;
  return true;
}
export function walkable(x: number, z: number): boolean {
  if (TOWERS.some((t) => Math.hypot(x - t.c[0], z - t.c[1]) < t.r + 0.4)) return false;
  if (inCastleBlock(x, z, 0.35)) {
    if (inR(CASTLE, x, z, 0.35)) return inCourtyard(x, z);
    return Math.abs(x) < GATE.w / 2 - 0.3 && z >= CASTLE.z1 - 0.4 && z <= CASTLE.z1 + WALL.t + 0.4;   // sur kapısı
  }
  for (const h of HOUSES) { const c = Math.cos(h.yaw), s = Math.sin(h.yaw), dx = x - h.x, dz = z - h.z, u = dx * c - dz * s, v = dx * s + dz * c; if (Math.abs(u) < h.w / 2 + 0.5 && Math.abs(v) < h.d / 2 + 0.5) return false; }
  return inR(OUT, x, z, 1);
}
/** Arazi: kale ve rıhtım düz; uzakta hafif tepeler */
export function terrainBase(x: number, z: number): number { const far = Math.max(0, Math.hypot(x, z + 10) - 90); return z > SHORE - 2 ? 0 : far * 0.1 * (0.6 + 0.4 * Math.sin(x * 0.03 + z * 0.02)); }
export function groundY(x: number, z: number): number { if (inWard(x, z, 0.35) && insideWard(x, z)) return FLOOR; return inCastleBlock(x, z, 0.35) ? 0 : terrainBase(x, z); }
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
  wiki: { title: 'Wikipedia — Sinop Fortress Prison', url: 'https://en.wikipedia.org/wiki/Sinop_Fortress_Prison' },
  kure: { title: 'Küre Ansiklopedisi — Sinop Tarihi Cezaevi', url: 'https://kureansiklopedi.com/tr/detay/sinop-tarihi-cezaevi-4a0b8' },
  bianet: { title: 'bianet — Sinop Tarihi Cezaevi ve Müzesi\'nin restorasyonuna başlanıyor', url: 'https://bianet.org/haber/sinop-tarihi-cezaevi-ve-muzesi-nin-restorasyonuna-baslaniyor-224870' },
  lp: { title: 'Lonely Planet — Tarihi Sinop Cezaevi', url: 'https://www.lonelyplanet.com/points-of-interest/tarihi-sinop-cezaevi/1060210' },
  dergipark: { title: 'DergiPark — Sinop Cezaevi üzerine makale', url: 'https://dergipark.org.tr/en/download/article-file/26910' },
  vatan: { title: 'Gazete Vatan — Sinop Tarihi Cezaevi Müzesi kapılarını açıyor', url: 'https://www.gazetevatan.com/galeri/sinop-tarihi-cezaevi-muzesi-kapilarini-aciyor-burada-yatan-unlu-isimlerin-hatiralari-yasatilacak-2282527' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.8): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kale', 'Sinop Kalesi', 'Sur', [-11, 33], [-13, 11, 25.2],
    'Cezaevi, Sinop Kalesi\'nin iç kalesine kuruldu. Kalenin kökeni antik çağa uzanır; surlar Roma, Bizans, Selçuklu ve Osmanlı dönemlerinde onarılıp genişletildi.', SRC.wiki, 4.4),
  mk('alkatraz', '"Anadolu\'nun Alkatrazı"', 'Lakap', [0, 29], [0, GATE.h + 0.8, CASTLE.z1 + WALL.t + 0.2],
    'Cezaevine, kalın surları ve denizle çevrili yarımadadaki konumu yüzünden kaçmanın çok zor sayılması nedeniyle "Anadolu\'nun Alkatrazı" denir. Bu bir lakaptır; ABD\'deki Alcatraz ada cezaevine benzetmedir.', SRC.lp),
  mk('cezaevi', '1887: Kaleden cezaevine', 'Tarih', [-8, 16], [-8, 2.2, 17.6],
    'İç kale 1887\'de cezaevi olarak kullanılmaya başlandı. Yüz yılı aşkın süre boyunca ağır cezalı mahkûmlar ve siyasi tutuklular burada kaldı.', SRC.wiki),
  mk('kogus', 'Koğuşlar', 'Yaşam', [-5, -20], [-5, FLOOR + 2.4, -22.4],
    'Mahkûmlar kalabalık koğuşlarda birlikte kalırdı. Bugün müzede koğuşlar, eski yaşam koşullarını gösterecek biçimde düzenlenmiştir. (Oyundaki oda sayısı ve eşyalar temsilîdir.)', SRC.kure),
  mk('hucre', 'Hücreler', 'Ceza', [6.8, -15.8], [CELLS[7].door, FLOOR + 2.3, ROOMS.corridor.z1 + 0.1],
    'Koğuşların yanında tek kişilik dar hücreler de vardı. Hücreler, cezaevinin en sert bölümü olarak anlatılır. (Hücre sayısı ve ölçüsü temsilîdir.)', SRC.kure),
  mk('sabahattin', 'Sabahattin Ali', 'Mahkûm', [15, -20], [15, FLOOR + 2.4, -22.4],
    'Yazar Sabahattin Ali bu cezaevinde yattı. "Aldırma Gönül" şiirini Sinop Cezaevi\'nde yazdığı anlatılır; şiir sonradan şarkı olarak da bilinir oldu.', SRC.vatan),
  mk('muze', 'Ünlü mahkûmlar ve müze', 'Bugün', [-12, -6], [-14.5, 2.4, -6],
    'Kaynaklarda burada yatanlar arasında Nazım Hikmet, Mustafa Suphi ve Kırım Hanı II. Devlet Giray anılır. Cezaevi 1997\'de kapatıldı (bazı Türkçe kaynaklar 1999 der); Kültür ve Turizm Bakanlığı\'nın onarımından sonra müze olarak açıldı.', SRC.bianet, 4.2),
];
export const START: { at: V2; yaw: number } = { at: [4, 44], yaw: 0.05 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -58, x1: 58, z0: -46, z1: 54 };

/* ===================== gece sayımı (temsilî mekanik) ===================== */
/** Gardiyan binasının kapısı: sayım buradan başlar (kapı x = GUARD.x0, z = 14) */
export const ROUND = { at: [GUARD.x0 - 1.4, 14] as V2, reach: 1.8 };
/** Hücre kapılarının önü (koridorda): gardiyan burada durup kapıyı kilitler */
export const CELL_DOORS: V2[] = CELLS.map((c) => [c.door, ROOMS.corridor.z1 - 0.7]);
export const DOOR_REACH = 1.1;
/** Kilitlenmemiş en yakın hücre kapısı (yoksa −1) */
export function nearestDoor(x: number, z: number, closed: boolean[]): number {
  let best = -1, bd = DOOR_REACH;
  CELL_DOORS.forEach((p, i) => { if (closed[i]) return; const d = Math.hypot(p[0] - x, p[1] - z); if (d < bd) { bd = d; best = i; } });
  return best;
}
export const ROUND_CARD = {
  id: 'sayim', name: 'Gece sayımı', kicker: 'Temsilî sahne',
  text: 'Gece çökünce gardiyan koridoru dolaşıp on iki hücrenin kapısını tek tek kilitledi. Kaçmanın çok zor sayıldığı bu kalede hücreler, cezaevinin en sert bölümü olarak anlatılır. Sayımın Sinop\'ta nasıl yapıldığına dair ayrıntılı bir kaynak bulamadık; bu sahne temsilîdir.',
  source: SRC.kure,
};
