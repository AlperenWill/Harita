/**
 * Bartın — Amasra Kalesi: "Taştaki Armalar" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Güneyde kara (kent), ortada iki limanın (batıda Küçük Liman, doğuda Büyük Liman) arasındaki boyun,
 * kuzeyinde surlarla çevrili yarımada (Zindan Kalesi, Kaleiçi). Yarımadanın kuzeyinden Kemere Köprüsü Boztepe'ye (Sormagir Kalesi) geçer.
 * Mekanik: surlardaki dört kabartmayı (Cenova arması, aile arması, kartal, öküzbaşı) bulup incelemek; sonunda Boztepe'nin ucundaki
 * seyir yerinden iki limana bakmak. Ölçek, sur çizgisi ve kabartmaların yeri TEMSİLÎDİR.
 */
export type V2 = [number, number];
export const BOUNDS = { x0: -70, x1: 70, z0: -100, z1: 80 };
export const LAND = { z: 42, y: 3 };
export const NECK = { hw: 11, z0: 24, z1: LAND.z };
export const PEN = { cx: 0, cz: 0, rx: 34, rz: 30, y: 7 };
/** Sur halkası: yarımada elipsinin bu oranları arası (iç yüz, dış yüz) */
export const WALL = { in: 0.86, out: 0.93, h: 7 };
export const GATE_S = { hw: 2.2 }, GATE_N = { hw: 1.6 };
export const BRIDGE = { hw: 1.5, z0: -43, z1: -PEN.rz * WALL.in + 0.5 };
export const BOZ = { cx: 0, cz: -64, rx: 26, rz: 24, y: 9.5 };
export const VIEW_AT: V2 = [0, BOZ.cz - BOZ.rz * 0.82];

const ell = (x: number, z: number, e: { cx: number; cz: number; rx: number; rz: number }) => Math.hypot((x - e.cx) / e.rx, (z - e.cz) / e.rz);
export const penR = (x: number, z: number) => ell(x, z, PEN);
export const bozR = (x: number, z: number) => ell(x, z, BOZ);
/** Kabartmalar: sur iç yüzünde (açı = atan2(z, x) yarımada merkezine göre) */
export const RELIEFS = [
  { id: 'cenova', a: Math.PI * 0.62, name: 'Cenova arması', kicker: 'Ceneviz',
    text: 'Kalede belirli yerlere Cenova armaları yerleştirilmiştir. Kale Cenevizliler döneminde genişletilmiş, 14. ve 15. yüzyıllarda büyük onarımlar görmüştür. (Armanın biçimi temsilîdir.)' },
  { id: 'aile', a: Math.PI * 0.12, name: 'Aile arması', kicker: 'Ceneviz',
    text: 'Bazı taş bloklara dönemin önde gelen ailelerinin armaları işlenmiştir; bir kaynak özellikle Adorno ailesinin armasını anar. Armaların bir kısmı yerinde durur, bir kısmı kent içindeki yapılara taşınmıştır. (Armanın biçimi temsilîdir.)' },
  { id: 'kartal', a: -Math.PI * 0.3, name: 'Kartal kabartması', kicker: 'Figür',
    text: 'Surlarda armaların yanında kartal, öküzbaşı, Eros ve Medusa gibi figürlü taşlar da vardır. (Kabartmanın biçimi ve yeri temsilîdir.)' },
  { id: 'okuz', a: -Math.PI * 0.78, name: 'Öküzbaşı', kicker: 'Figür',
    text: 'Öküzbaşı biçimli kabartma, surlardaki figürlü taşlardan biridir. Taşların bir bölümü eski yapılardan alınıp surlarda yeniden kullanılmış olabilir. (Bu son bilgi doğrulanmadı.)' },
] as const;
export const reliefPos = (a: number, inset = 0): [number, number] => { const k = WALL.in - inset; return [PEN.cx + Math.cos(a) * PEN.rx * k, PEN.cz + Math.sin(a) * PEN.rz * k]; };
export const reliefFront = (a: number): V2 => reliefPos(a, 0.09);

/** Kaleiçi evleri (dikdörtgen: merkez x, z, genişlik, derinlik) — çarpışma */
export const IN_HOUSES: [number, number, number, number][] = [[-15, -6, 7, 6], [-13, 9, 6, 6], [13, -9, 7, 6], [15, 7, 6, 7], [-6, -18, 6, 5], [7, 17, 6, 5]];
const inHouse = (x: number, z: number, p = 0.4) => IN_HOUSES.some(([hx, hz, w, d]) => Math.abs(x - hx) < w / 2 + p && Math.abs(z - hz) < d / 2 + p);
export type Zone = 'land' | 'neck' | 'gateS' | 'in' | 'gateN' | 'bridge' | 'boz' | null;
export function zone(x: number, z: number): Zone {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return null;
  if (z >= LAND.z) return Math.abs(x) < 60 ? 'land' : null;
  if (z >= NECK.z0 + 0.01 && penR(x, z) > WALL.out) return Math.abs(x) < NECK.hw - 0.4 ? 'neck' : null;
  const r = penR(x, z);
  if (r < WALL.in - 0.015) return inHouse(x, z) ? null : 'in';
  if (r < WALL.out + 0.03) { if (z > 0 && Math.abs(x) < GATE_S.hw - 0.35) return 'gateS'; if (z < 0 && Math.abs(x) < GATE_N.hw - 0.35) return 'gateN'; return null; }
  if (Math.abs(x) < BRIDGE.hw - 0.35 && z < -PEN.rz * WALL.out && z > BRIDGE.z0) return 'bridge';
  if (bozR(x, z) < 0.9) return 'boz';
  return null;
}
export const walkable = (x: number, z: number) => zone(x, z) !== null;
export function groundY(x: number, z: number): number {
  const zn = zone(x, z);
  if (zn === 'land') return LAND.y;
  if (zn === 'neck') { const t = Math.max(0, Math.min(1, (LAND.z - z) / (LAND.z - NECK.z0 - 4))); return LAND.y + (PEN.y - LAND.y) * t; }
  if (zn === 'bridge') { const t = (-PEN.rz * WALL.out - z) / (-PEN.rz * WALL.out - BRIDGE.z0); return PEN.y + (BOZ.y - PEN.y) * Math.max(0, Math.min(1, t)) + Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * 0.6; }
  if (zn === 'boz') return BOZ.y;
  if (zn === 'in' || zn === 'gateS' || zn === 'gateN') return PEN.y;
  return 0;
}
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; const y0 = groundY(x, z);
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - y0) < 0.6) x += dx;
  const y1 = groundY(x, z); if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - y1) < 0.6) z += dz; return [x, z]; }
export const nearRelief = (x: number, z: number, got: string[]) => RELIEFS.findIndex((r) => !got.includes(r.id) && Math.hypot(x - reliefFront(r.a)[0], z - reliefFront(r.a)[1]) < 2.6);
export const atView = (x: number, z: number) => Math.hypot(x - VIEW_AT[0], z - VIEW_AT[1]) < 3;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
export const SRC = {
  kure: { title: 'Küre Ansiklopedisi — Amasra Kalesi', url: 'https://kureansiklopedi.com/tr/detay/amasra-kalesi-84c1d' },
  kemere: { title: 'Küre Ansiklopedisi — Kemere Köprüsü', url: 'https://kureansiklopedi.com/tr/detay/kemere-koprusu-8d24b' },
  wiki: { title: 'Wikipedia — Amasra Fortress', url: 'https://en.wikipedia.org/wiki/Amasra_Fortress' },
  jolly: { title: 'Jolly Tur — Amasra rehberi', url: 'https://www.jollytur.com/blog/?p=28932' },
  dp: { title: 'DergiPark — Amasra üzerine makale', url: 'https://dergipark.org.tr/en/download/article-file/861021' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('iki-liman', 'İki liman', 'Kıyı', [0, 46], [0, LAND.y + 2.4, 44],
    'Amasra iki limanın arasında kurulmuştur: batıda Küçük Liman, doğuda Büyük Liman. Kalenin kara tarafındaki girişlerinden biri Zindan Kapısı\'dır. (Kapı adları kaynaklarda farklı verilir.)', SRC.jolly, 3.6),
  mk('iki-kale', 'Zindan ve Sormagir', 'Kale', [0, 22], [0, PEN.y + 5.8, PEN.rz * WALL.out - 0.6],
    'Kale iki bölümden oluşur: yarımadadaki Zindan Kalesi ve Boztepe\'deki Sormagir Kalesi. Kalede Roma, Bizans, Ceneviz ve Osmanlı dönemlerinin izleri vardır. 2013\'te UNESCO Dünya Mirası Geçici Listesi\'ne alındı.', SRC.kure, 3.4),
  mk('kemere', 'Kemere Köprüsü', 'Köprü', [0, -24], [0, PEN.y + 2.6, -27],
    'İki kaleyi Roma döneminden kalma tek gözlü, yuvarlak kemerli taş köprü bağlar. Bizanslılar köprüyü 9. yüzyılda güçlendirdi.', SRC.kemere, 3.4),
];
export const CARD_VIEW = { id: 'cesm', name: 'Çeşm-i Cihan', kicker: '1460',
  text: 'Fatih Sultan Mehmed 1460\'ta Amasra\'yı Osmanlı topraklarına kattı. Anlatılana göre kente bakıp "Lala, burası Çeşm-i Cihan mı?" dedi; Amasra o gün bugün "dünyanın gözü" diye anılır. (Söz bir rivayettir.)', source: SRC.dp };
export const START: { at: V2; yaw: number } = { at: [0, 58], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
