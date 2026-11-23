/**
 * Yalova Atatürk Köşkü / "Yürüyen Köşk" — "Ağaç İçin Kaydırılan Köşk": kentin ortasındaki iki katlı ahşap köşk, yanındaki yüzlerce yıllık çınar, köşkün
 * kaydırıldığı ray izleri, çitle çevrili bahçe ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Köşkün içine girilmez; oyun bahçede ve köşkün önünde geçer. Ölçüler, köşkün biçimi ve ray izleri TEMSİLÎDİR (docs/YALOVA-KOSK.md).
 * NOT: Termal'deki Atatürk Köşkü (S. Hakkı Eldem, 1929) ayrı bir yapıdır; bu oyun onu anlatmaz.
 * Eksenler: +z güney (sokak, bahçe kapısı), −z kuzey (köşk, kuzeyde Marmara).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Köşk: şu anki konumu ve (kaydırılmadan önceki) eski konumu; kaydırma mesafesi ~4,8 m (batıdan doğuya) */
export const KOSK: Rect = { x0: -8, x1: 8, z0: -16, z1: -5 };
export const SHIFT = 4.8;
export const OLD_KOSK: Rect = { x0: KOSK.x0 - SHIFT, x1: KOSK.x1 - SHIFT, z0: KOSK.z0, z1: KOSK.z1 };
/** Çınar: gövde merkezi ve yarıçapı (yürünmez); tepesi köşkün eski yerinin üzerindeydi */
export const TREE = { c: [-16.6, -8] as V2, r: 2.2, crown: 10 };
/** Ray izleri (görsel; yürünür): köşkün önünde iki paralel hat */
export const RAILS = { x0: OLD_KOSK.x0 + 1, x1: KOSK.x1 - 1, z: [-3.8, -2.6] as [number, number] };
/** Bahçe (çitli), kapı ve dış sokak alanı */
export const GARDEN: Rect = { x0: -26, x1: 26, z0: -20, z1: 30 };
export const GATE = { x0: -2.5, x1: 2.5 };
export const FENCE_T = 0.5;
export const AREA: Rect = { x0: -50, x1: 50, z0: -30, z1: 70 };
/** Bahçe içinde yürünmez süs havuzu ve çiçek tarhı */
export const POND = { c: [14, 12] as V2, r: 2.6 };
export const BEDS: Rect[] = [{ x0: -20, x1: -14, z0: 16, z1: 22 }, { x0: 12, x1: 18, z0: 20, z1: 26 }];

/* ===================== köşkü kaydırma ===================== */
/** Oyun köşk ESKİ yerindeyken başlar (shift.v = 0); oyuncu kriko kolunu çevirdikçe köşk raylar üzerinde doğuya kayar (shift.v → SHIFT).
 * Köşkün yürünmez alanı o anki yerine göre hesaplanır. Kriko düzeneğinin biçimi TEMSİLÎDİR (docs/YALOVA-KOSK.md). */
export const shift = { v: 0 };
export function koskNow(): Rect { const o = shift.v - SHIFT; return { x0: KOSK.x0 + o, x1: KOSK.x1 + o, z0: KOSK.z0, z1: KOSK.z1 }; }
/** Kriko: rayların doğu ucunda; her çevirişte köşk STEP kadar ilerler */
export const WINCH = { c: [11.2, -3.2] as V2, reach: 2.4, step: 0.4 };
/** Çınarın köşke doğru uzanan dalı: ucu eski çatının batı yamacının üstündedir */
export const BRANCH = { from: [TREE.c[0] + 0.6, 7.0, TREE.c[1] + 0.2] as [number, number, number], to: [-10.2, 9.3, -9.5] as [number, number, number] };

export function groundY(_x: number, _z: number): number { return 0; }
export function walkable(x: number, z: number): boolean {
  if (!inR(AREA, x, z, 0.4)) return false;
  const fo: Rect = { x0: GARDEN.x0 - FENCE_T, x1: GARDEN.x1 + FENCE_T, z0: GARDEN.z0 - FENCE_T, z1: GARDEN.z1 + FENCE_T };
  if (inR(fo, x, z)) {
    if (!inR(GARDEN, x, z)) return z > GARDEN.z1 - 0.4 && x > GATE.x0 && x < GATE.x1;   // çit: yalnızca kapı
    if (inR(koskNow(), x, z, -0.6)) return false;
    if (Math.abs(x - WINCH.c[0]) < 0.9 && Math.abs(z - WINCH.c[1]) < 0.9) return false;
    if (Math.hypot(x - TREE.c[0], z - TREE.c[1]) < TREE.r + 0.4) return false;
    if (Math.hypot(x - POND.c[0], z - POND.c[1]) < POND.r + 0.4) return false;
    if (BEDS.some((b) => inR(b, x, z, -0.3))) return false;
  }
  return true;
}
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
  cnn: { title: 'CNN Türk — Atatürk\'ün emriyle taşınmıştı: Dal kesilmeyecek köşk yürüyecek', url: 'https://cnnturk.com/yasam/ataturkun-emriyle-tasinmisti-dal-kesilmeyecek-kosk-yuruyecek-635043' },
  cumhuriyet: { title: 'Cumhuriyet — Atatürk\'ün, dalı kesilmesin diye köşkü taşıttığı çınar ağacı 400 yaşında', url: 'https://www.cumhuriyet.com.tr/haber/ataturkun-dali-kesilmesin-diye-kosku-tasittigi-cinar-agaci-400-yasinda-1136954' },
  timeturk: { title: 'Timeturk — Atatürk ağaç için köşkü kaydırmış', url: 'https://www.timeturk.com/kultur/ataturk-agac-icin-kosku-kaydirmis/haber-1677866' },
  hdn: { title: 'Hürriyet Daily News — \'Walking mansion\' now open to visitors', url: 'https://hurriyetdailynews.com/walking-mansion-now-open-to-visitors-52898' },
  ktb: { title: 'Kültür ve Turizm Bakanlığı — Yalova Atatürk Köşkleri', url: 'https://www.ktb.gov.tr/EN-103990/yalova---ataturk-pavilions.html' },
  wikiT: { title: 'Wikipedia — Yalova Atatürk Mansion (Termal)', url: 'https://en.wikipedia.org/wiki/Yalova_Atat%C3%BCrk_Mansion' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('kosk', 'Yürüyen Köşk', 'Köşk', [0, -1.6], gy(0, -1.6, 5.4),
    'Köşkün yapımına 21 Ağustos 1929\'da, Atatürk\'ün talimatıyla başlandı. Atatürk, bir çınarın dalı kesilmesin diye köşkün raylar üzerinde kaydırılmasını istediği için yapı "Yürüyen Köşk" adıyla anılır.', SRC.cnn, 5.4),
  mk('cinar', 'Çınar ağacı', 'Ağaç', [-19, -3], gy(-19, -3, 6),
    'Köşkün yanındaki doğu çınarı yaklaşık 390–400 yaşındadır. Dalı kesilmesin diye köşk kaydırıldı. Ağacın tam yaşı kaynaklarda 390 ile 400 arasında değişir.', SRC.cumhuriyet, 5.4),
  mk('raylar', 'Raylarla kaydırma', 'Teknik', [-6, -3.2], gy(-6, -3.2, 3.4),
    'Köşk, çınara yer açmak için yaklaşık 4,8 m kaydırıldı; işlemin 10 Ağustos 1930\'da tamamlandığı aktarılır. Bazı haberlerde mesafe "yaklaşık 5 m" yazılır. Oyundaki ray izleri temsilîdir.', SRC.timeturk, 4.6),
  mk('ziyaret', 'Restorasyon ve ziyaret', 'Bugün', [14, 6], gy(14, 6, 3.6),
    'Köşk restore edilerek 2006\'da ziyarete açıldı; haberlere göre yılda yaklaşık 50 bin kişi ziyaret ediyor. Köşkün içine bu oyunda girilmez.', SRC.hdn, 5),
  mk('termal', 'Termal\'deki köşk ayrı', 'Dikkat', [-14, 14], gy(-14, 14, 3.6),
    'Yalova\'da Atatürk\'ün adıyla anılan başka bir köşk daha vardır: Termal Atatürk Köşkü. 1929\'da Termal\'de yapılan, mimarı S. Hakkı Eldem olarak anılan ahşap bir yapıdır. İkisi kaynaklarda zaman zaman karıştırılır. Bu oyun Termal\'deki köşkü değil, kentteki Yürüyen Köşk\'ü anlatır.', SRC.wikiT, 5),
];
export const START: { at: V2; yaw: number } = { at: [0, 54], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -54, x1: 54, z0: -34, z1: 74 };
export { inR };
