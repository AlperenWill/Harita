/**
 * Mardin — Zinciriye (Sultan İsa) Medresesi ve taş evler: "Damdan Dama". Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney (aşağı, ova), −z kuzey (yukarı, kale). Kent güney yamacında kademe kademe yükselir: her kademe (LEVEL k,
 * y = k·STEP) bir alttaki evlerin damıdır ve bir üstteki evin avlusu/terası gibi kullanılır. Kademeleri taş merdivenler bağlar; biri
 * evlerin altından geçen tonozlu bir geçitten (abbara) geçer. Zinciriye 3. ve 4. kademeleri kaplar: avlusu 3. kademede, damı 5. kademe
 * hizasındadır ve en üst sokağa bağlanır. Ölçüler ve düzen TEMSİLÎDİR (docs/MARDIN.md).
 */
export type V2 = [number, number];
export const STEP = 3.6, LEVELS = 6;
export const X0 = -60, X1 = 60, Z_TOP = -20, Z_BOT = 40;
/** Kademe sınırı j (j. ile j+1. kademe arası): temel z ve sınırın güneye taştığı kesimler (üst evin damı alttakinin önüne uzanır) */
export const BOUNDS_Z = [30, 20, 10, 0, -10];
export const BUMPS: [number, number][][] = [
  [[-52, -44], [-12, 2], [34, 46]],
  [[-58, -48], [-30, -22], [8, 22], [44, 54]],
  [[-48, -36], [24, 34]],
  [[-56, -44], [32, 40]],
  [[-40, -28], [26, 36]],
];
export const BUMP = 4;
export function boundaryZ(j: number, x: number): number { return BOUNDS_Z[j] + (BUMPS[j].some(([a, b]) => x > a && x < b) ? BUMP : 0); }
/** Kademeleri bağlayan merdivenler: j. sınırı geçer (j → j+1); alt ucu sınırdan LEN m güneyde */
export interface Stair { j: number; x: number; abbara?: boolean }
export const STAIRS: Stair[] = [
  { j: 0, x: -30 }, { j: 0, x: 26 },
  { j: 1, x: 30, abbara: true }, { j: 1, x: -40 },
  { j: 2, x: -26 }, { j: 2, x: 44 },
  { j: 3, x: 28 }, { j: 3, x: -36 },
  { j: 4, x: 46 }, { j: 4, x: -20 },
];
export const STAIR_W = 2.4, STAIR_LEN = 7;
/** Zinciriye: dış sınır, avlu (revaklarla), doğu taç kapı geçidi, damdaki iki dilimli kubbe */
export const ZIN = { x0: -17, x1: 16, z0: -10, z1: 10 };
export const COURT = { x0: -7, x1: 11, z0: -4.5, z1: 4.5 };
export const PORTAL = { z: 4, w: 2.4, x1: 16.6 };
export const DOMES: { x: number; z: number; r: number }[] = [{ x: -14.5, z: 0, r: 2.0 }, { x: 14, z: -2.2, r: 1.5 }];

export const levelY = (k: number) => k * STEP;
/** (x, z) noktasının kademesi: kuzeyde kalan sınır sayısı */
export function levelAt(x: number, z: number): number { let k = 0; for (let j = 0; j < BOUNDS_Z.length; j++) if (z < boundaryZ(j, x)) k = j + 1; return k; }
const inStair = (s: Stair, x: number, z: number, wide = 0) => { const b = boundaryZ(s.j, s.x); return Math.abs(x - s.x) < STAIR_W / 2 + wide && z >= b - 0.6 && z <= b + STAIR_LEN; };
function stairY(s: Stair, z: number) { const b = boundaryZ(s.j, s.x), t = Math.min(1, Math.max(0, (b + STAIR_LEN - z) / STAIR_LEN)); return levelY(s.j) + STEP * t; }

/* Zinciriye içi: avlu ve geçit 3. kademe, dam 5. kademe */
const inZin = (x: number, z: number, m = 0) => x > ZIN.x0 - m && x < ZIN.x1 + m && z > ZIN.z0 - m && z < ZIN.z1 + m;
const inCourt = (x: number, z: number, m = 0) => x > COURT.x0 - 3 + m && x < COURT.x1 + 1 - m && z > COURT.z0 - 1.6 + m && z < COURT.z1 + 1.6 - m;
const inPortal = (x: number, z: number, m = 0) => x > COURT.x1 + 0.5 && x < PORTAL.x1 + 0.4 && Math.abs(z - PORTAL.z) < PORTAL.w / 2 - m;
function zinRegion(x: number, z: number): 'court' | 'roof' | 'wall' {
  if (inCourt(x, z, 0.3) || inPortal(x, z, 0.35)) return 'court';
  if (inCourt(x, z, -0.6) || (x > COURT.x1 - 0.5 && Math.abs(z - PORTAL.z) < PORTAL.w / 2 + 0.9)) return 'wall';
  if (DOMES.some((d) => Math.hypot(x - d.x, z - d.z) < d.r + 0.4)) return 'wall';
  if (x > ZIN.x0 + 0.6 && x < ZIN.x1 - 0.6 && z > ZIN.z0 - 0.6 && z < ZIN.z1 - 0.6) return 'roof';   // kuzeyde en üst sokağa açık
  return 'wall';
}
export function walkable(x: number, z: number): boolean {
  if (x < X0 + 0.6 || x > X1 - 0.6 || z < Z_TOP + 0.6 || z > Z_BOT - 0.6) return false;
  for (const s of STAIRS) if (inStair(s, x, z, -0.25)) return true;
  for (const s of STAIRS) if (inStair(s, x, z, 0.7) && z > boundaryZ(s.j, s.x) + 0.3) return false;   // merdiven yan duvarları
  if (inPortal(x, z, 0.35)) return true;
  if (inZin(x, z, 0.4)) { if (!inZin(x, z)) { if (z <= ZIN.z0 && z > ZIN.z0 - 0.4) return x > ZIN.x0 + 0.6 && x < ZIN.x1 - 0.6; return false; } return zinRegion(x, z) !== 'wall'; }
  for (let j = 0; j < BOUNDS_Z.length; j++) if (Math.abs(z - boundaryZ(j, x)) < 0.45 && !(j === 4 && x > ZIN.x0 + 0.6 && x < ZIN.x1 - 0.6)) return false;   // cephe ve korkuluk (medrese damı en üst sokağa açık)
  for (let j = 0; j < BOUNDS_Z.length; j++) for (const [a, b] of BUMPS[j]) if (Math.abs(x - a) < 0.45 || Math.abs(x - b) < 0.45) { const zb = BOUNDS_Z[j]; if (z > zb - 0.45 && z < zb + BUMP + 0.45) return false; }   // taşan dam kenarı
  return true;
}
export function groundY(x: number, z: number): number {
  for (const s of STAIRS) if (inStair(s, x, z, 0.05)) return stairY(s, z);
  if (inPortal(x, z)) return levelY(3);
  if (inZin(x, z)) return zinRegion(x, z) === 'court' ? levelY(3) : levelY(5);
  if (inZin(x, z, 0.4) && z <= ZIN.z0) return levelY(5);
  return levelY(levelAt(x, z));
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p; const y = groundY(x, z);
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - y) < 0.6) x += dx;
  if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - groundY(x, z)) < 0.6) z += dz;
  return [x, z];
}
/** Ova: kentin altında geniş düzlük (yalnızca görünür) */
export const PLAIN_Y = -70;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  kureEv: { title: 'Küre Ansiklopedisi — Mardin Taş Evleri', url: 'https://kureansiklopedi.com/tr/detay/mardin-tas-evleri-55be6' },
  kureZin: { title: 'Küre Ansiklopedisi — Zinciriye Medresesi', url: 'https://kureansiklopedi.com/tr/detay/zinciriye-medresesi-296e3' },
  wiki: { title: 'Wikipedia — Sultan Isa Medrese', url: 'https://en.wikipedia.org/wiki/Sultan_Isa_Medrese' },
  abbara: { title: 'CNN Türk — Antik kent Mardin\'in gizemli yapıları: abbaralar', url: 'https://www.cnnturk.com/seyahat/antik-kent-mardinin-gizemli-yapilari-abbaralar' },
  hurriyet: { title: 'Hürriyet — Mimari harikası Mardin evleri', url: 'https://www.hurriyet.com.tr/seyahat/mimari-harikasi-mardin-evleri-41689947' },
  view: { title: 'Mardin Life — The perfect view of Mesopotamia starts at Zinciriye Madrasa', url: 'https://www.mardinlife.com/mardin/the-perfect-view-of-mesopotamia-starts-at-zinciriye-madrasa' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const ab = STAIRS.find((s) => s.abbara)!;
export const SPOTS: Spot[] = [
  mk('taseve', 'Kademe kademe taş evler', 'Kent', [-14, 26], [-14, levelY(1) + 2.4, 20.6],
    'Mardin evleri kalenin eteğinden ovaya doğru, yamaca teras teras yerleşir. Evler kademeli dizildiği için her evin damı, bir üstteki evin terası gibi kullanılır. Şimdi bu damların üstünden yukarı tırman.', SRC.kureEv),
  mk('abbara', 'Abbara', 'Geçit', [ab.x + 3.2, boundaryZ(ab.j, ab.x) + STAIR_LEN + 1.2], [ab.x, levelY(ab.j + 1) + 2.2, boundaryZ(ab.j, ab.x) + 0.6],
    'Mardin\'de sokağın üstünü örten, iki yakadaki yapıları birbirine bağlayan tonozlu geçitlere abbara denir. Merdivenli dar sokaklar çoğu yerde bu geçitlerin altından geçer. (Oyundaki abbaranın yeri temsilîdir.)', SRC.abbara),
  mk('eyvan', 'Eyvan ve teras', 'Ev', [-8, 13.5], [-6, levelY(2) + 2.6, 10.3],
    'Yamaçtaki her evde eyvan ve teras bulunur: üç yanı kapalı, bir yanı avluya açık eyvan yazın serin bir oturma yeridir. Eyvan, teras ve en üstteki dam, evi yamaca kademe kademe oturtur.', SRC.hurriyet),
  mk('tackapi', 'Taç kapı', 'Medrese', [21.5, PORTAL.z + 1.5], [ZIN.x1 + 0.3, levelY(3) + 8.6, PORTAL.z],
    'Zinciriye Medresesi\'ni Artuklu hükümdarı Melik Necmeddin İsa 1385\'te yaptırdı; bu yüzden Sultan İsa Medresesi diye de anılır. Doğu cephesindeki yüksek, derin nişli taç kapı yapının en süslü bölümüdür.', SRC.wiki),
  mk('yildiz', 'Yıldız tonozlu hol', 'Medrese', [10.5, 0.5], [13.5, levelY(3) + 4, PORTAL.z],
    'Taç kapıdan girince yıldız tonozla örtülü bir hole, oradan da avluya geçilir. Avlunun çevresinde revaklar ve odalar dizilir. (Oyundaki revak ve oda düzeni temsilîdir.)', SRC.kureZin),
  mk('mescit', 'Mescit ve Sultan İsa\'nın türbesi', 'Medrese', [-5.5, -3], [COURT.x0 - 2.2, levelY(3) + 3.4, 0],
    'Avlunun batısındaki küçük mescidin süslü bir kubbesi, kakma işli bir mihrabı ve taş minberi vardır; Sultan İsa\'nın türbesi de buradadır. Timur\'un ordusuna karşı savaşan Melik İsa\'nın bir süre burada tutsak kaldığı anlatılır.', SRC.wiki),
  mk('kubbe', 'Dilimli kubbeler', 'Dam', [-11.2, -4.2], [DOMES[0].x, levelY(5) + 3.6, DOMES[0].z],
    'Yapının doğu ve batı uçlarında dilimli kubbeler yükselir. Dilimli kubbe Mardin\'in tarihi yapılarında sık görülen bir örtü biçimidir. Damda yürürken iki kubbe de yanından görünür.', SRC.kureZin),
  mk('ova', 'Mezopotamya ovası', 'Manzara', [0, 8.4], [0, levelY(5) + 1.6, 9.6],
    'Medresenin damından güneyde uzanan Mezopotamya ovası görülür. Zinciriye bu manzarasıyla ünlüdür; yükseldikçe ovanın pusu açılır ve ufuk uzar.', SRC.view, 3.2),
];
export const START: { at: V2; yaw: number } = { at: [20, 38.6], yaw: -0.35 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: X0, x1: X1, z0: Z_TOP, z1: Z_BOT };
/** Oyuncunun bulunduğu kademe (merdivende ve Zinciriye'de yüksekliğe göre) */
export const levelOf = (y: number) => Math.round(y / STEP);
/** Ova pusunun uzaklığı: yükseldikçe ufuk açılır */
export const hazeFar = (y: number) => 420 + Math.max(0, y) * 300;
