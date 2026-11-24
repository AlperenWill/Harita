/**
 * Kilis — Oylum Höyük: "Katman Katman" (kısa oyun). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Höyük ortada, elips biçimli (460 × 320 m, en yüksek yeri 37 m). Güney yamacında basamaklı bir kazı
 * açması: üç düzlük (S1 en üstte, S3 en altta) ve aralarındaki kesitler. Mekanik: kazı yukarıdan aşağı ilerler — üstteki kesit
 * kazılmadan alttakine geçilmez (üst üste binme ilkesi: alttaki katman daha eskidir). Üç kesitten üç buluntu; sonunda kesit panosunda
 * katmanlara dönemleri yerleştir. Buluntuların biçimi TEMSİLÎDİR (docs/OYLUM.md).
 */
export type V2 = [number, number];
export const MOUND = { rx: 230, rz: 160, h: 37 };
export function natural(x: number, z: number): number { const r2 = (x / MOUND.rx) ** 2 + (z / MOUND.rz) ** 2; return r2 >= 1 ? 0 : MOUND.h * (1 - r2) ** 1.5; }
/** Açma: x aralığı ve üç düzlük (kuzeyden güneye: S1, S2, S3) */
export const TRENCH = { x0: -5, x1: 5, z0: 116, z1: 134 };
export const STEPS = [{ z0: 116, z1: 122, y: 9.0 }, { z0: 122, z1: 128, y: 7.4 }, { z0: 128, z1: 134, y: 5.8 }];
/** Düzlükleri bağlayan merdiven-rampalar (doğu kenarda) */
export const RAMP_X: [number, number] = [2.4, 4.6];
const RAMPS = [{ z: 122, lo: STEPS[1].y, hi: STEPS[0].y }, { z: 128, lo: STEPS[2].y, hi: STEPS[1].y }];
const RAMP_HALF = 1.6;
const inTrench = (x: number, z: number, m = 0) => x > TRENCH.x0 + m && x < TRENCH.x1 - m && z > TRENCH.z0 + m && z < TRENCH.z1 + 0.6;
export function groundY(x: number, z: number): number {
  if (inTrench(x, z)) { if (x > RAMP_X[0] && x < RAMP_X[1]) for (const r of RAMPS) if (Math.abs(z - r.z) < RAMP_HALF) return r.lo + ((r.z + RAMP_HALF - z) / (2 * RAMP_HALF)) * (r.hi - r.lo);
    for (const s of STEPS) if (z >= s.z0 && z < s.z1) return s.y; return STEPS[2].y; }
  return natural(x, z);
}
export const BOUNDS = { x0: -120, x1: 120, z0: 40, z1: 200 };
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (inTrench(x, z, -0.45) && !inTrench(x, z, 0.35)) return false;   // açma kenarı (yan duvar, korkuluk)
  if (inTrench(x, z, 0.35)) { // kesit yüzlerinin dibi: rampalar dışında geçilmez
    for (const s of STEPS.slice(1)) if (Math.abs(z - s.z0) < 0.3 && !(x > RAMP_X[0] && x < RAMP_X[1])) return false; return z > TRENCH.z0 + 0.35; }
  return true;
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p; const y = groundY(x, z);
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - y) < 0.6) x += dx;
  if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - groundY(x, z)) < 0.6) z += dz;
  return [x, z];
}

/* ===================== kesitler ve buluntular ===================== */
export interface Source { title: string; url: string }
const SRC = {
  sabah: { title: 'Daily Sabah — Excavation resumes in Oylum Höyük on Syrian border', url: 'https://www.dailysabah.com/arts/excavation-resumes-in-oylum-hoyuk-on-syrian-border/news' },
  aa: { title: 'Anatolian Archaeology — Excavations started at Oylum Höyük, one of the largest mounds in the Middle East', url: 'https://anatolianarchaeology.net/excavations-started-at-oylum-hoyuk-one-of-the-largest-mounds-in-the-middle-east' },
  kure: { title: 'Küre Ansiklopedisi — Oylum Höyük', url: 'https://test.kureansiklopedi.com/en/detay/oylum-hoyuk-48662' },
};
export type Period = 'mo3' | 'mo2a' | 'mo2b';
export const PERIODS: { id: Period; label: string }[] = [
  { id: 'mo2b', label: 'MÖ 2. binyılın ikinci yarısı (Hitit İmparatorluk dönemi)' },
  { id: 'mo2a', label: 'MÖ 2. binyılın başı (Orta Tunç Çağı)' },
  { id: 'mo3', label: 'MÖ 3. binyıl (İlk Tunç Çağı)' },
];
/** Kesit k (0: en üst): kazı noktası, buluntu ve doğru dönemi */
export interface Cut { k: number; at: V2; face: [number, number, number]; find: string; period: Period; text: string; source: Source }
export const CUTS: Cut[] = [
  { k: 0, at: [-1.5, 117.6], face: [-1.5, STEPS[0].y + 1.2, TRENCH.z0], find: 'Yazılı tablet parçası', period: 'mo2b',
    text: 'En üstteki kesitten pişmiş toprak bir tablet parçası çıktı. Oylum Höyük\'te MÖ 2. binyılın ikinci yarısına ait birkaç yazılı buluntu bulunmuştur; kazı ekibinin 2025 hedefi Hitit İmparatorluk dönemi katmanını araştırmaktır. (Buluntunun biçimi temsilîdir.)', source: SRC.sabah },
  { k: 1, at: [-1.5, 123.6], face: [-1.5, STEPS[1].y + 0.8, STEPS[1].z0], find: 'Boyalı çömlek', period: 'mo2a',
    text: 'Ortadaki kesitten bir çömlek çıktı. Kazı başkanı Atilla Engin, höyüğün MÖ 2000\'lerde Hitit ve Mısır belgelerinde Kuilzila ya da Ukulzat diye geçen kent olabileceğini öne sürer; bu bir öneridir, kesinleşmiş değildir. (Buluntunun biçimi temsilîdir.)', source: SRC.aa },
  { k: 2, at: [-1.5, 129.6], face: [-1.5, STEPS[2].y + 0.8, STEPS[2].z0], find: 'Kulplu kap', period: 'mo3',
    text: 'En alttaki kesitten bir kap çıktı. Aynı öneriye göre höyük MÖ 3000\'lerde Ulisim adıyla bilinen merkez olabilir. Alttaki katmanlar üsttekilerden daha eskidir: höyük, aynı yerde yüzyıllar boyunca üst üste kurulan yerleşimlerin birikmesiyle yükselir. (Buluntunun biçimi temsilîdir.)', source: SRC.aa },
];
export const CUT_REACH = 1.8;
export function nearestCut(x: number, z: number): Cut | null { let b: Cut | null = null, bd = CUT_REACH; for (const c of CUTS) { const d = Math.hypot(c.at[0] - x, c.at[1] - z); if (d < bd) { bd = d; b = c; } } return b; }
/** Kazı sırası: k. kesit ancak üstündekiler kazıldıysa kazılır */
export const canDig = (k: number, dug: number[]) => CUTS.filter((c) => c.k < k).every((c) => dug.includes(c.k));
export const orderOk = (assign: Record<number, Period>) => CUTS.every((c) => assign[c.k] === c.period);

/* ===================== duraklar ===================== */
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('hoyuk', 'Oylum Höyük', 'Höyük', [0, 150], [0, 4, 145],
    'Kilis\'in yaklaşık 7 km kuzeydoğusundaki Oylum Höyük, 460 × 320 m boyutları ve 37 m\'ye varan yüksekliğiyle bölgenin büyük höyüklerindendir. Höyük, aynı yerde binlerce yıl boyunca üst üste kurulan yerleşimlerin kalıntılarından oluşan yapay bir tepedir.', SRC.sabah, 4.5),
  mk('kazi', 'Uzun soluklu kazı', 'Kazı', [9, 136], [6.5, 7.6, 134],
    'Höyükteki kazılar 1980\'lerin sonunda başladı; Güneydoğu Anadolu\'nun en uzun süren kazı projelerinden biridir. Bugün Atilla Engin başkanlığında, Kültür ve Turizm Bakanlığı izniyle Gaziantep Üniversitesi ve Kilis Valiliği iş birliğiyle sürüyor.', SRC.aa),
  mk('tepe', 'Höyüğün tepesi', 'Manzara', [0, 30 + 40], [0, 34, 60],
    'Höyüğün tepesinden çevredeki düzlük ve Suriye sınırına uzanan ova görülür. Kazı alanları yamaçlarda ve tepede açılan açmalarda sürer. (Oyundaki açmanın yeri temsilîdir.)', SRC.kure, 5),
];
export const CARD_ORDER = { id: 'kesit', name: 'Kesit okundu', kicker: 'Üst üste binme',
  text: 'Katmanlara dönemleri doğru yerleştirdin: en altta en eski (MÖ 3. binyıl), en üstte en yeni (MÖ 2. binyılın ikinci yarısı). Arkeologlar höyükte bu ilkeyle, katmanların sırasından yerleşimlerin sırasını okur.', source: SRC.aa };
export const START: { at: V2; yaw: number } = { at: [0, 165], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
