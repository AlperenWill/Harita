/**
 * Bolu — Mudurnu Tarihî Çarşısı: "Cuma Duası" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Ortada Orta Çarşı meydanı (çınar); doğuya uzanan arasta (iki yanda dükkânlar); kuzeyde Yıldırım Bayezid
 * Camii, batıda hamam; çevrede ahşap konaklar. Mekanik: çarşıya ve sokaklara dağılmış beş ustayı dükkânlarında bulup cuma duasına davet
 * etmek; davet edilen usta meydana yürür. Yerleşim, dükkânlar ve ustaların zanaatleri TEMSİLÎDİR.
 */
export type V2 = [number, number];
export type Rect = [number, number, number, number];   // x0, z0, x1, z1
export const BOUNDS = { x0: -55, x1: 75, z0: -50, z1: 42 };
export const SQUARE = { r: 11 };
export const TREE: V2 = [2.5, 2.5];
export const ARASTA = { x0: 13, x1: 61, hw: 3.2, depth: 5 };
/** Arasta dükkânları: her iki yanda 8'er dükkân */
export const SHOPS: { x: number; side: 1 | -1 }[] = Array.from({ length: 16 }, (_, i) => ({ x: ARASTA.x0 + 3 + (i % 8) * 6, side: i < 8 ? -1 : 1 }));
export const shopRect = (s: { x: number; side: 1 | -1 }): Rect => { const z0 = s.side * ARASTA.hw, z1 = s.side * (ARASTA.hw + ARASTA.depth); return [s.x - 2.9, Math.min(z0, z1), s.x + 2.9, Math.max(z0, z1)]; };
export const MOSQUE: Rect = [-8, -36, 8, -20];
export const MINARET: V2 = [9.6, -21.5];
export const HAMAM: Rect = [-34, -14, -20, -2];
/** Konaklar: meydanın batısında, güneyinde ve kuzeydoğusunda */
export const KONAKS: Rect[] = [[-30, 6, -20, 15], [-17, 16, -7, 26], [-4, 18, 6, 27], [10, 14, 20, 24], [24, 14, 34, 23], [22, -22, 32, -13], [36, -22, 46, -13], [-44, -30, -34, -20], [-46, 14, -36, 24], [50, 14, 60, 23]];
export const ALL_RECTS: Rect[] = [...SHOPS.map(shopRect), MOSQUE, HAMAM, ...KONAKS];
const inRect = (x: number, z: number, r: Rect, p: number) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p;
export function walkable(x: number, z: number): boolean {
  const p = 0.4;
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (Math.hypot(x - TREE[0], z - TREE[1]) < 1.4 + p) return false;
  if (Math.hypot(x - MINARET[0], z - MINARET[1]) < 1.3 + p) return false;
  return !ALL_RECTS.some((r) => inRect(x, z, r, p));
}
export const groundY = (_x?: number, _z?: number) => 0;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }

/* ===================== ustalar ===================== */
export interface Master { id: string; craft: string; at: V2; shirt: string; apron: string; line: string }
const front = (i: number): V2 => { const s = SHOPS[i]; return [s.x, s.side * (ARASTA.hw - 1)]; };
export const MASTERS: Master[] = [
  { id: 'igneci', craft: 'İğneci usta', at: front(2), shirt: '#5a6b7d', apron: '#8a7a64', line: 'İğnelerimi bıraktım, geliyorum.' },
  { id: 'demirci', craft: 'Demirci usta', at: front(13), shirt: '#4a4a4a', apron: '#5a3d28', line: 'Ocağı söndürdüm, geliyorum.' },
  { id: 'bakirci', craft: 'Bakırcı usta', at: front(6), shirt: '#8a5a3a', apron: '#6b4a30', line: 'Kalayı sonra yaparım, geliyorum.' },
  { id: 'sarac', craft: 'Saraç usta', at: [-14, 9], shirt: '#6f7d5a', apron: '#7a5a3a', line: 'Eyer bekler, dua beklemez.' },
  { id: 'kunduraci', craft: 'Kunduracı usta', at: [-12, -14], shirt: '#7a6a8a', apron: '#5a4030', line: 'Kalıbı kaldırdım, geliyorum.' },
];
/** Meydandaki yerler: çınarın çevresinde yarım halka */
export const GATHER: V2[] = MASTERS.map((_, i) => { const a = Math.PI * (0.15 + (i / (MASTERS.length - 1)) * 0.7); return [TREE[0] + Math.cos(a) * 4.2, TREE[1] - Math.sin(a) * 4.2]; });
export const nearMaster = (x: number, z: number, invited: string[]) => MASTERS.findIndex((m) => !invited.includes(m.id) && Math.hypot(x - m.at[0], z - m.at[1]) < 2.4);

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
export const SRC = {
  unesco: { title: 'UNESCO Geçici Liste — Historic Guild Town of Mudurnu', url: 'https://whc.unesco.org/fr/listesindicatives/6038/' },
  trt: { title: 'TRT Haber — Mudurnu\'da hedef UNESCO Dünya Mirası Listesi', url: 'https://www.trthaber.com/haber/yasam/mudurnuda-hedef-unesco-dunya-mirasi-listesi-377611.html' },
  y360: { title: 'Yolcu360 — Mudurnu, tarihi Ahi kenti', url: 'https://yolcu360.com/blog/mudurnu-tarihi-ahi-kenti/' },
  dp: { title: 'DergiPark — Mudurnu üzerine makale', url: 'https://dergipark.org.tr/tr/download/article-file/3366737' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('cami', 'Yıldırım Bayezid Camii', '1382', [0, -17], [0, 4, -19.6],
    'Yıldırım Bayezid, şehzadeliği sırasında Mudurnu\'da 1382\'de bu camiyi yaptırdı. Erken Osmanlı mimarisinin örneklerinden sayılır. (Ölçüler temsilîdir.)', SRC.y360),
  mk('hamam', 'Yıldırım Bayezid Hamamı', '1382', [-27, 1], [-27, 3.4, -1.6],
    'Hamam da 1382\'de Yıldırım Bayezid tarafından yaptırılmıştır. (Kubbelerin sayısı ve düzeni temsilîdir.)', SRC.y360),
  mk('ahi', 'Tarihi Ahi kenti', 'UNESCO', [9, -6], [9.5, 2.6, -8],
    'Mudurnu 2015\'te "Tarihi Ahi Kenti Mudurnu" adıyla UNESCO Dünya Mirası Geçici Listesi\'ne alındı. Esnafı bir arada tutan Ahilik geleneği bu adayın temelidir.', SRC.trt),
  mk('igne', 'İğneci dükkânları', 'Evliya Çelebi', [ARASTA.x0 + 20, 0], [ARASTA.x0 + 20, 3.6, 0],
    'Evliya Çelebi 1650\'de Mudurnu\'da çok sayıda iğneci dükkânı, üç han ve üç hamam olduğunu yazar; halkın çoğunun iğnecilikle geçindiği anlatılır.', SRC.unesco),
  mk('konak', 'Ahşap konaklar', 'Kent dokusu', [-2, 15], [1, 5.6, 17.6],
    'Çarşının çevresinde Batı Karadeniz\'e özgü ahşap konaklar yer alır; bir kısmı bugün yeni işlevlerle kullanılır. (Konakların biçimi temsilîdir.)', SRC.unesco),
];
export const CARD_DUA = { id: 'dua', name: 'Esnaf duası', kicker: 'Orta Çarşı · cuma',
  text: 'Ustalar çınarın altında toplandı. Anlatılana göre Mudurnu\'da cuma günleri Orta Çarşı\'da esnaf duası yapılır; Ahilik geleneğinde esnaf dayanışması ve dürüst ticaret esastır. (Ustaların zanaatleri ve toplanma temsilîdir.)', source: SRC.y360 };
export const START: { at: V2; yaw: number } = { at: [0, 34], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
