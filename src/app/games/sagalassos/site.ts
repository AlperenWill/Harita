/**
 * Sagalassos (Ağlasun, Burdur) — "Dağdaki Kent": Akdağ eteğinde teraslı Roma kenti; Üst Agora (Antoninler Çeşmesi, Heroon), batı terasında
 * Bouleuterion, merdivenle inilen Aşağı Agora (Hadrian Çeşmesi), uzakta tiyatro ve 7 durak (saf veri; three.js'siz, test edilir).
 *
 * Eksenler: −z kuzey (Akdağ, yokuş yukarı), +z güney (vadi). Oyuncu Aşağı Agora'dan başlar, merdivenden Üst Agora'ya çıkar, batı terasına
 * yürür. Teras boyutları, yapıların yeri ve ölçüleri TEMSİLÎDİR (docs/SAGALASSOS.md).
 */
export type V2 = [number, number];
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/* ===================== teraslar ===================== */
export const UA = { x0: -30, x1: 30, z0: -29, z1: 20, y: 60 };   // Üst Agora (kuzey kenarında Antoninler Çeşmesi)
export const LA = { x0: -26, x1: 26, z0: 46, z1: 78, y: 48 };    // Aşağı Agora
export const BT = { x0: -64, x1: -37, z0: -14, z1: 14, y: 61.6 };   // Bouleuterion terası
/** Üst ve Aşağı Agora arasındaki merdiven (yürünür rampa) ve batı terasına çıkış */
export const STAIR = { x0: -4, x1: 4, z0: 19, z1: 47 };
export const STEP_W = { x0: -38.5, x1: -29, z0: -2.2, z1: 2.2 };
/** Doğal yamaç: kuzeye (Akdağ) doğru yükselir */
export function hill(x: number, z: number): number {
  // teraslar arasında hafif (~%25) yokuş; Akdağ'a doğru dikleşir, Aşağı Agora'nın güneyinde vadiye iner
  return 59.5 - z * 0.25 + Math.sin(x * 0.04) * 1.5 + Math.sin(z * 0.05 + x * 0.02) * 1.2 + Math.max(0, -z - 30) * 0.55 + Math.max(0, -z - 90) * 0.6 - Math.max(0, z - 82) * 0.32 - Math.max(0, Math.abs(x) - 70) * 0.08;
}
export function terrainBase(x: number, z: number): number {
  if (inR(UA, x, z)) return UA.y;
  if (inR(LA, x, z)) return LA.y;
  if (inR(BT, x, z)) return BT.y;
  if (inR(STAIR, x, z)) return UA.y + (LA.y - UA.y) * Math.max(0, Math.min(1, (z - UA.z1) / (LA.z0 - UA.z1)));   // düz eğimli merdiven
  if (inR(STEP_W, x, z)) return UA.y + (BT.y - UA.y) * smooth(STEP_W.x1, STEP_W.x0, x);
  const h = hill(x, z);
  // teras kenarlarında yamaç teraslara doğru biraz yumuşar (duvarlar ayrı modellenir)
  return h;
}

/* ===================== anıtlar (yürünmez) ===================== */
/** Antoninler Çeşmesi: Üst Agora'nın kuzey kenarı, havuzu agoraya bakar */
export const NYMPH = { x0: -14, x1: 14, z0: -27, z1: -21.5, basin: { x0: -13, x1: 13, z0: -21.5, z1: -17.5 } };
/** Kuzeybatı Heroonu: kare podyum, üstünde naiskos ve heykel */
export const HEROON = { c: [-22, -12] as V2, w: 6.4 };
/** Bouleuterion: yarım daire oturma basamakları (batı terasında, açık yüzü doğuya) */
export const BOULE = { c: [-48, 0] as V2, r: 12 };
/** Hadrian Çeşmesi: Aşağı Agora'nın batı kenarı */
export const HADRIAN = { x0: -31.5, x1: -26, z0: 52, z1: 72, basin: { x0: -26, x1: -22.5, z0: 53, z1: 71 } };
/** Onur sütunları (temsilî) */
export const COLS: V2[] = [[-8, 6], [8, 6], [-14, 14], [14, 14], [20, -6], [-6, 64], [10, 64]];
export const THEATRE = { c: [80, -70] as V2, r: 38 };
export function blocked(x: number, z: number): boolean {
  const m = 0.4;
  if (inR({ x0: NYMPH.x0, x1: NYMPH.x1, z0: NYMPH.z0, z1: NYMPH.basin.z1 }, x, z, -m)) return true;
  if (Math.abs(x - HEROON.c[0]) < HEROON.w / 2 + m && Math.abs(z - HEROON.c[1]) < HEROON.w / 2 + m) return true;
  if (inR({ x0: HADRIAN.x0, x1: HADRIAN.basin.x1, z0: HADRIAN.z0, z1: HADRIAN.z1 }, x, z, -m)) return true;
  const db = Math.hypot(x - BOULE.c[0], z - BOULE.c[1]); if (x < BOULE.c[0] + 0.5 && db > 5.5 && db < BOULE.r + 2.5) return true;   // oturma basamakları (orkestra ve önü açık)
  for (const c of COLS) if (Math.hypot(x - c[0], z - c[1]) < 1.2) return true;
  return false;
}
export function walkable(x: number, z: number): boolean {
  const on = inR(UA, x, z, 0.5) || inR(LA, x, z, 0.5) || inR(BT, x, z, 0.5) || inR(STAIR, x, z, 0.4) || inR(STEP_W, x, z, 0.3);
  return on && !blocked(x, z);
}
export const groundY = terrainBase;
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
  wiki: { title: 'Wikipedia — Sagalassos', url: 'https://en.wikipedia.org/wiki/Sagalassos' },
  sabah: { title: 'Daily Sabah — After 2 decades, Sagalassos shines as Anatolia\'s Roman treasure', url: 'https://www.dailysabah.com/arts/after-2-decades-sagalassos-shines-as-anatolias-roman-treasure/news' },
  hdn: { title: 'Hürriyet Daily News — Monumental fountain restored in Sagalassos', url: 'https://www.hurriyetdailynews.com/monumental-fountain-restored-in-sagalassos-202755' },
  arch: { title: 'Archaeology — Sagalassos (interactive dig)', url: 'https://interactive.archaeology.org/sagalassos/field/urbanconcl.html' },
  cirkwi: { title: 'Cirkwi — The Bouleuterion (Sagalassos)', url: 'https://www.cirkwi.com/en/point-interet/180766-the-bouleuterion' },
  google: { title: 'Google Arts & Culture — The Antonine Nymphaeum, Sagalassos', url: 'https://artsandculture.google.com/asset/the-antonine-nymphaeum-sagalassos/RAHc-n_pd_Cfpw' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('dag', 'Dağdaki kent', 'Konum', [0, 74], [0, LA.y + 3, 80],
    'Sagalassos, Ağlasun\'a 7 km uzaklıkta, Batı Toroslar\'daki Akdağ\'ın yamacında, 1450–1700 metre yükseklikte kurulmuş bir kenttir. Yapılar yamaca oyulmuş teraslara oturur.', SRC.wiki),
  mk('hadrian', 'Hadrian Çeşmesi', 'Çeşme', [-19, 62], [-28.5, LA.y + 9, 62],
    'Aşağı Agora\'daki anıtsal çeşme, yazıtlarına göre 129–132 yılları arasında İmparator Hadrian anısına yapılmıştır. Kazı ekibine göre iki katlı yapı Antoninler Çeşmesi\'nden de yüksektir ve onarımı sürdürülmektedir.', SRC.hdn),
  mk('antonin', 'Antoninler Çeşmesi', 'Çeşme', [0, -14], [0, UA.y + 10, -22],
    'Üst Agora\'nın kuzeyindeki anıtsal çeşme 160–180 yılları arasında yapıldı. Yıkılmış parçaları yeniden ayağa kaldırıldı ve çeşme 2010\'da yeniden suyla buluştu.', SRC.sabah),
  mk('heroon', 'Kuzeybatı Heroonu', 'Anıt', [-15.5, -12], [-22, UA.y + 9.5, -12],
    'Augustus döneminde yapılan anıtın üstündeki naiskosta yaklaşık 4 metrelik, kim olduğu bilinmeyen yerel bir kahramanın mermer heykeli dururdu. 400 yılı civarında kent merkezi yeniden surlarla çevrilirken heroon bir kuleye dönüştürüldü; ön yüzü söküldüğü için kime adandığı bilinmiyor.', SRC.arch),
  mk('dansci', 'Dans eden kızlar', 'Kabartma', [-22, -6.5], [-22, UA.y + 2.4, -8.7],
    'Heroonun podyumunu 14 dans eden kızın kabartmasıyla süslü bir friz çevirir. Yerindeki friz aslının birebir kopyasıdır; özgün parçalar Burdur Müzesi\'ndedir.', SRC.arch),
  mk('boule', 'Bouleuterion', 'Meclis', [-41, 0], [-50, BT.y + 6, 0],
    'Kent meclisinin toplandığı yapı, Üst Agora\'nın batısındaki doğal bir terasa kurulmuştur. Dış yüzündeki friz silahları ve Ares ile Athena büstlerini gösterir. Yapım tarihi kaynaklarda farklı verilir; 200 yılından sonra meclisin muhtemelen odeonda toplandığı düşünülür.', SRC.cirkwi),
  mk('kazi', 'Kazı ve koruma', 'Bugün', [20, 12], [20, UA.y + 9, -6],
    'Sagalassos\'ta kazılar 1989\'da Belçikalı arkeolog Marc Waelkens yönetiminde başladı; bugün Prof. Peter Talloen yönetiyor ve çalışmaların 2029\'a kadar sürmesi planlanıyor. Kent UNESCO Dünya Mirası Geçici Listesi\'ndedir.', SRC.wiki),
];
export const START: { at: V2; yaw: number } = { at: [6, 72], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -66, x1: 34, z0: -30, z1: 82 };
export { inR };
