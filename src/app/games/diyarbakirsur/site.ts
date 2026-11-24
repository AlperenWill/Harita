/**
 * Diyarbakır Surları ve Hevsel Bahçeleri — saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Sur, güney hattının bir kesimini temsil eder: batıda Ulu Beden, sonra Yedi Kardeş ve Nur Burcu, doğuda
 * Mardin Kapı; köşeden sonra sur kuzeye döner ve arazi doğuya, Hevsel Bahçeleri'ne ve Dicle'ye iner. Uzaklıklar çok kısaltılmıştır
 * (gerçekte Ulu Beden ile Yedi Kardeş arası yaklaşık 400 m, köprü kentin birkaç km güneyinde). Ölçüler TEMSİLÎDİR (docs/DIYARBAKIR-SUR.md).
 *
 * Oyuncu surun dışında (güneyde) ve içinde yürür, içeriden rampayla sur üstüne çıkar; sur yolu ve burç tepeleri yürünür.
 */
export type V2 = [number, number];

/** Sur gövdesi: güney hattı z = 0 çevresinde, doğu ucunda kuzeye dönen kol */
export const WALL = { x0: -120, x1: 74, zIn: -2.4, zOut: 2.4, h: 11, eastX: 74, eastZ0: -70 };
export const WALK_Y = WALL.h;
/** Yuvarlak büyük burçlar: Ulu Beden (biraz küçük), Yedi Kardeş (çap 27,8 m), Nur Burcu */
export interface Tower { id: string; name: string; x: number; z: number; r: number; h: number; round: boolean }
export const TOWERS: Tower[] = [
  { id: 'ulubeden', name: 'Ulu Beden', x: -92, z: 2.4 + 6.4, r: 12.6, h: 13.5, round: true },
  { id: 'yedikardes', name: 'Yedi Kardeş', x: -30, z: 2.4 + 7, r: 13.9, h: 14, round: true },
  { id: 'nur', name: 'Nur Burcu', x: 14, z: 2.4 + 3, r: 6, h: 12.5, round: true },
  // dört köşeli küçük burçlar (temsilî aralıklarla)
  ...[-114, -64, -4, 30, 58].map((x, i) => ({ id: `kare${i}`, name: 'Burç', x, z: 2.4 + 2.6, r: 3.6, h: 12.4, round: false })),
];
/** Mardin Kapı: surdaki açıklık ve iki yanındaki kare burçlar */
export const GATE = { x: 44, w: 4.4, h: 6.4, towerW: 7, towerD: 6 };
/** Sur içi: dar bir şerit (evler ve sokak), sur dibine 0,6 m yaklaşılır */
export const INSIDE = { x0: -116, x1: 70, z0: -44, z1: WALL.zIn - 0.6 };
/** İçeriden sur üstüne çıkan rampa (merdiven) */
export const RAMP = { x0: -50, x1: -46, zTop: WALL.zIn + 0.8, zBot: -32 };
/** Hevsel ve Dicle (doğuda, aşağıda) */
export const HEVSEL = { x0: 150, x1: 262, y: -24 };
export const RIVER = { x0: 268, x1: 380, y: -26.5 };
export const BRIDGE = { z: 125, len: 178, arches: 10, h: 9 };
export const BRIDGE_X0 = (RIVER.x0 + RIVER.x1) / 2 - BRIDGE.len / 2;
export const OUT = { x0: -150, x1: 262, z0: -130, z1: 150 };

/* ===================== evler (sur içi, yürünmez) ===================== */
export interface House { x0: number; x1: number; z0: number; z1: number; h: number }
export const HOUSES: House[] = (() => { const out: House[] = []; let x = INSIDE.x0 + 2;
  let i = 0; while (x < INSIDE.x1 - 6) { const w = 7 + ((i * 37) % 6), d = 8 + ((i * 53) % 5);
    if (!(x + w > RAMP.x0 - 3 && x < RAMP.x1 + 3) && !(x + w > GATE.x - 6 && x < GATE.x + 6)) out.push({ x0: x, x1: x + w, z0: -40, z1: -40 + d, h: 5 + ((i * 29) % 4) });
    x += w + 2.5 + ((i * 17) % 3); i++; }
  return out; })();

/* ===================== yükseklik ve yürünebilirlik ===================== */
const inTower = (x: number, z: number, m: number) => TOWERS.some((t) => t.round ? Math.hypot(x - t.x, z - t.z) < t.r + m : Math.abs(x - t.x) < t.r + m && Math.abs(z - t.z) < t.r + m);
const gateTowers = [GATE.x - GATE.w / 2 - GATE.towerW / 2, GATE.x + GATE.w / 2 + GATE.towerW / 2];
const inGateTower = (x: number, z: number, m: number) => gateTowers.some((gx) => Math.abs(x - gx) < GATE.towerW / 2 + m && Math.abs(z - (WALL.zOut + GATE.towerD / 2 - 1)) < GATE.towerD / 2 + 1 + m);
/** Arazi: surun güneyi hafif eğimli düzlük; doğuda köşeden sonra Hevsel'e iner */
export function terrainBase(x: number, z: number): number {
  const east = Math.max(0, x - 84), drop = Math.min(1, east / 62), s = drop * drop * (3 - 2 * drop);
  const south = z > 0 ? -Math.min(z, 150) * 0.012 : 0;
  let y = south * (1 - s) + HEVSEL.y * s;
  if (x > RIVER.x0 - 6) y = Math.min(y, HEVSEL.y - (x - (RIVER.x0 - 6)) * 0.4);
  return y;
}
const onRamp = (x: number, z: number, m = 0) => x > RAMP.x0 + m && x < RAMP.x1 - m && z >= RAMP.zBot && z <= RAMP.zTop;
const rampY = (z: number) => WALK_Y * Math.min(1, Math.max(0, (z - RAMP.zBot) / (RAMP.zTop - RAMP.zBot)));
/** Sur üstü yolu: mazgallar arasında 1 m pay; burç tepeleri de yürünür */
function onWallTop(x: number, z: number): boolean {
  const m = 0.55;
  if (x > WALL.x0 + 1 && x < WALL.x1 - m && z > WALL.zIn + m && z < WALL.zOut - m) return Math.abs(x - GATE.x) > GATE.w / 2 + 0.6;   // kapının üstü boş (sur yolu orada kesilir)
  for (const t of TOWERS) if (t.round && t.r > 10 && Math.hypot(x - t.x, z - t.z) < t.r - 1.1 && z > WALL.zIn + m) return true;
  return false;
}
export function walkable(x: number, z: number): boolean {
  if (x < OUT.x0 + 1 || x > OUT.x1 - 1 || z < OUT.z0 + 1 || z > OUT.z1 - 1) return false;
  if (onWallTop(x, z)) return true;
  if (onRamp(x, z, 0.3)) return true;
  // rampa duvarları
  if (x > RAMP.x0 - 1.2 && x < RAMP.x1 + 1.2 && z > RAMP.zBot && z < WALL.zIn) return false;
  // Mardin Kapı geçidi
  if (Math.abs(x - GATE.x) < GATE.w / 2 - 0.45 && z >= WALL.zIn - 0.8 && z <= WALL.zOut + 0.8) return true;
  // sur içi şerit
  if (z < WALL.zIn && x < WALL.eastX - 0.6) {
    if (x < INSIDE.x0 || z < INSIDE.z0 || z > INSIDE.z1) return false;
    return !HOUSES.some((h) => x > h.x0 - 0.5 && x < h.x1 + 0.5 && z > h.z0 - 0.5 && z < h.z1 + 0.5);
  }
  // sur gövdesi (güney kolu ve doğu kolu)
  if (x > WALL.x0 - 0.6 && x < WALL.x1 + 0.6 && z > WALL.zIn - 0.6 && z < WALL.zOut + 0.6) return false;
  if (Math.abs(x - WALL.eastX) < WALL.zOut + 0.6 && z > WALL.eastZ0 && z < WALL.zOut) return false;
  if (x < WALL.eastX && z < WALL.zIn) return false;
  if (inTower(x, z, 0.5) || inGateTower(x, z, 0.5)) return false;
  if (x > RIVER.x0 - 7) return false;   // Dicle
  if (x > BRIDGE_X0 - 1 && Math.abs(z - BRIDGE.z) < 5) return false;   // köprü ayağı
  if (x < WALL.x0 - 0.6 && z < WALL.zOut) return false;
  return true;
}
export function groundY(x: number, z: number): number {
  if (onWallTop(x, z)) return WALK_Y;
  if (onRamp(x, z, 0)) return rampY(z);
  if (z < WALL.zIn && x < WALL.eastX) return 0;
  if (Math.abs(x - GATE.x) < GATE.w / 2 && z >= WALL.zIn - 0.8 && z <= WALL.zOut + 0.8) return 0;
  return terrainBase(x, z);
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - groundY(x, z)) < 0.6) x += dx;
  if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - groundY(x, z)) < 0.6) z += dz;
  return [x, z];
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  unesco: { title: 'UNESCO — Diyarbakır Fortress and Hevsel Gardens Cultural Landscape', url: 'https://whc.unesco.org/en/list/1488' },
  kure: { title: 'Küre Ansiklopedisi — Diyarbakır Surları', url: 'https://kureansiklopedi.com/tr/detay/diyarbakir-surlari' },
  columbia: { title: 'Columbia MCID — Diyarbakır City Walls, Gates & Towers', url: 'https://mcid.mcah.columbia.edu/node/87371' },
  yk: { title: 'Wikipedia — Yedi Kardeş Tower', url: 'https://en.wikipedia.org/wiki/Yedi_Karde%C5%9F_Tower' },
  kopru: { title: 'Kültür Envanteri — On Gözlü Köprü, Diyarbakır', url: 'https://kulturenvanteri.com/en/yer/on-gozlu-kopru-diyarbakir/' },
  hevsel: { title: 'Wikipedia — Hevsel Gardens', url: 'https://en.wikipedia.org/wiki/Hevsel_Gardens' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const YK = TOWERS[1], UB = TOWERS[0];
export const SPOTS: Spot[] = [
  mk('sur', 'Bazalt surlar', 'Sur', [36, 22], [30, 3, WALL.zOut + 2.7],
    'Diyarbakır surları yaklaşık 5,8 km uzunluğundadır ve koyu volkanik bazalttan örülmüştür. Bugünkü biçimini büyük ölçüde Roma İmparatoru II. Constantius döneminde, 349 yılındaki genişletmeyle aldığı kabul edilir. Duvarlar 8–12 m yüksekliğinde, 3–5 m kalınlığındadır.', SRC.kure),
  mk('mardinkapi', 'Mardin Kapı', 'Kapı', [GATE.x, 10], [GATE.x, GATE.h + 1.4, WALL.zOut + 0.4],
    'Surların dört ana kapısından biridir; ötekiler Dağ Kapı, Urfa Kapı ve Yeni Kapı\'dır. Kapılar kenti dört yöne bağlayan yolların başında açılır. (Oyundaki kapı biçimi temsilîdir.)', SRC.kure),
  mk('yedikardes', 'Yedi Kardeş Burcu', 'Burç', [YK.x, YK.z + YK.r + 6], [YK.x, 8.2, YK.z + YK.r + 0.3],
    'Artuklu hükümdarı Melik Salih Mahmud\'un 1208–1209\'da yaptırdığı burç, çapı 27,8 m ile surların en büyüklerindendir. Kesme bazalt gövdesi yazı kuşaklarıyla ve kabartmalarla süslüdür; Selçuklu dönemi çift başlı kartal figürlerinin bilinen örneklerinden biri burada sayılır.', SRC.yk),
  mk('ulubeden', 'Ulu Beden (Evli Beden) Burcu', 'Burç', [UB.x, UB.z + UB.r + 6], [UB.x, 8, UB.z + UB.r + 0.3],
    'Yedi Kardeş ile aynı yıllarda, aynı hükümdar için yapıldı; planı neredeyse tam bir dairedir ve Yedi Kardeş\'ten biraz küçüktür. İki burç da yazılı taş süslemeleriyle surların en gösterişli kesimidir. Gerçekte aralarında yaklaşık 400 m vardır; oyunda bu uzaklık kısaltıldı.', SRC.columbia),
  mk('burclar', 'Yüze yakın burç', 'Sur', [-62, 0], [-64, WALK_Y + 2.6, 2.4 + 2.6],
    'Surlar boyunca dizilen burçların sayısı kaynaklarda farklı verilir: kimi 82, kimi 101 der. Burçlar duvarı dışa taşar; böylece savunanlar duvar dibini yandan da görebilirdi. Sur üstündeki yoldan burçtan burca geçilir.', SRC.kure),
  mk('kitabe', '63 kitabe', 'Yazıt', [-10, 0], [-10, WALK_Y + 1.6, 0],
    'Surlarda farklı devletlere ve dönemlere ait 63 kitabe sayılır. Her onarım ve ekleme, yaptıranın adını ve tarihini taşa yazdırdı; bu yüzden surlar kentin tarihini kendi üzerinde taşır. Dürbünle surdaki kitabeleri bulmayı dene.', SRC.unesco),
  mk('hevsel', 'Hevsel Bahçeleri', 'Bahçe', [176, 40], [180, HEVSEL.y + 3, 40],
    'Surlarla Dicle arasındaki Hevsel Bahçeleri yaklaşık 700 hektarlık verimli bir tarım alanıdır. Kentle nehir arasındaki bu yeşil kuşak yüzyıllardır kentin sebze ve meyvesini yetiştirdi. Surlar ve bahçeler 2015\'te birlikte UNESCO Dünya Mirası Listesi\'ne kültürel peyzaj olarak girdi.', SRC.hevsel, 6),
  mk('kopru', 'On Gözlü Köprü', 'Köprü', [246, 110], [RIVER.x0 - 2, HEVSEL.y + 4, BRIDGE.z],
    'Dicle üzerindeki köprü Mervani döneminde, 1065 yıllarında yapıldı; kitabesine göre mimarı Ubeyd oğlu Yusuf\'tur. On kemer gözü vardır, uzunluğu yaklaşık 178 m\'dir. Gerçekte kentin birkaç km güneyindedir; oyunda yakına alındı.', SRC.kopru, 6),
];
export const START: { at: V2; yaw: number } = { at: [46, 40], yaw: 0.25 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -150, x1: 262, z0: -60, z1: 150 };

/* ===================== dürbün: surdaki kitabe ve kabartmalar ===================== */
/** Her hedef sur ya da burç yüzünde bir nokta (dünya koordinatı), bakılan yüzün dışa normali ve dürbünle okunabilmesi için en uzak mesafe */
export interface Target { id: string; name: string; at: [number, number, number]; n: V2; max: number; note: string }
const ringPt = (t: Tower, a: number, y: number): [number, number, number] => [t.x + Math.sin(a) * (t.r + 0.05), y, t.z + Math.cos(a) * (t.r + 0.05)];
export const TARGETS: Target[] = [
  { id: 'yk-yazi', name: 'Yedi Kardeş yazı kuşağı', at: ringPt(YK, 0.35, 9.6), n: [Math.sin(0.35), Math.cos(0.35)], max: 70, note: 'Artuklu, 1208–1209: burcu yaptıran Melik Salih Mahmud' },
  { id: 'yk-kartal', name: 'Çift başlı kartal', at: ringPt(YK, -0.3, 7.4), n: [Math.sin(-0.3), Math.cos(-0.3)], max: 70, note: 'Yedi Kardeş\'in kabartmalarından; Selçuklu döneminin çift başlı kartal örneklerinden' },
  { id: 'ub-yazi', name: 'Ulu Beden yazı kuşağı', at: ringPt(UB, 0.2, 9.4), n: [Math.sin(0.2), Math.cos(0.2)], max: 70, note: 'Artuklu, 1208–1209: Yedi Kardeş ile aynı hükümdar' },
  { id: 'kapi-yazi', name: 'Mardin Kapı kitabesi', at: [GATE.x, GATE.h + 1.2, WALL.zOut + 0.06], n: [0, 1], max: 60, note: 'Kapı üstündeki kitabe (yeri ve içeriği temsilî)' },
  { id: 'nur-yazi', name: 'Nur Burcu kitabesi', at: ringPt(TOWERS[2], 0, 8.4), n: [0, 1], max: 60, note: 'Bir onarım kitabesi (içeriği temsilî)' },
  { id: 'duvar-yazi', name: 'Sur duvarında onarım kitabesi', at: [-50, 7.6, WALL.zOut + 0.06], n: [0, 1], max: 60, note: 'Bir onarım kitabesi (içeriği temsilî)' },
];
export const LENS = { fov: 14, aim: 0.05, hold: 0.7 };
/**
 * Dürbünle bakılan hedef: oyuncu hedefin önünde (yüzün dış yanında), menzil içinde ve bakış yönü hedefe `aim` radyandan yakınsa.
 * eye: göz konumu, dir: birim bakış vektörü.
 */
export function aimedTarget(eye: [number, number, number], dir: [number, number, number], skip: string[] = []): Target | null {
  let best: Target | null = null, ba = LENS.aim;
  for (const t of TARGETS) { if (skip.includes(t.id)) continue;
    const vx = t.at[0] - eye[0], vy = t.at[1] - eye[1], vz = t.at[2] - eye[2], d = Math.hypot(vx, vy, vz);
    if (d > t.max || d < 3) continue;
    if (vx * t.n[0] + vz * t.n[1] > -0.2 * Math.hypot(vx, vz)) continue;   // yüzün arkasından okunmaz
    const c = (vx * dir[0] + vy * dir[1] + vz * dir[2]) / d, a = Math.acos(Math.min(1, c));
    if (a < ba) { ba = a; best = t; } }
  return best;
}
