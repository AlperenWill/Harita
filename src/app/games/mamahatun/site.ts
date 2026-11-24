/**
 * Erzincan Tercan — Mama Hatun Kümbeti: "Halka Duvar" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Merkezde sekiz dilimli kümbet; çevresinde iç çapı yaklaşık 13,5 m olan yuvarlak duvar, iç yüzünde 13 sivri
 * kemerli niş (altısında sanduka), kapı batıda. Dışarıda külliyenin kervansarayı ve kervan yolu. Mekanik: (1) halka koridorda dolaşıp
 * 13 nişi bul; (2) kümbet gövdesindeki aşınmış üç dilimi doğru taş biçimiyle onar (gövde dış bükey dilimlerden oluşur).
 * Duvar yüksekliği, kümbet ölçüleri ve hangi nişte sanduka olduğu TEMSİLÎDİR (docs/MAMA-HATUN.md).
 */
export type V2 = [number, number];
export const RING = { r: 6.75, t: 1.3, h: 5.2 };
export const KUMBET = { r: 2.7, lobes: 8, h: 6.5 };
export const GATE_A = Math.PI;   // batı (açı: atan2(z, x))
export const GATE_W = 1.8;
/** Nişler: kapı dışındaki çevreye eşit aralıkla 13 niş; açı (radyan) */
export const NICHES: number[] = Array.from({ length: 13 }, (_, i) => GATE_A + ((i + 1) / 14) * Math.PI * 2);
export const SAND_NICHES = [1, 3, 5, 7, 9, 11];
export const nichePos = (i: number, inset = 0.9): V2 => [Math.cos(NICHES[i]) * (RING.r - inset), Math.sin(NICHES[i]) * (RING.r - inset)];
export const NICHE_REACH = 1.6;
export function nearNiche(x: number, z: number): number { for (let i = 0; i < NICHES.length; i++) { const [nx, nz] = nichePos(i); if (Math.hypot(x - nx, z - nz) < NICHE_REACH) return i; } return -1; }
/** Aşınmış dilimler (kümbet gövdesinde) ve doğru taş biçimi */
export const ERODED = [1, 4, 6];
export const PROFILES = ['dış bükey', 'düz', 'iç bükey'] as const;
export const CORRECT_PROFILE = 'dış bükey';
export const lobeAngle = (k: number) => ((k + 0.5) / KUMBET.lobes) * Math.PI * 2;
export const lobeFront = (k: number): V2 => [Math.cos(lobeAngle(k)) * (KUMBET.r + 1.2), Math.sin(lobeAngle(k)) * (KUMBET.r + 1.2)];
export function nearLobe(x: number, z: number, fixed: number[]): number { for (const k of ERODED) { if (fixed.includes(k)) continue; const [fx, fz] = lobeFront(k); if (Math.hypot(x - fx, z - fz) < 1.3) return k; } return -1; }

/* ===================== yürüyüş ===================== */
export const KERVAN = { x0: 26, x1: 58, z0: -34, z1: -10 };
export const BOUNDS = { x0: -60, x1: 70, z0: -55, z1: 50 };
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  const d = Math.hypot(x, z), a = Math.atan2(z, x);
  if (d < KUMBET.r + 0.45) return false;
  if (d > RING.r - 0.5 && d < RING.r + RING.t + 0.4) { const da = Math.abs(((a - GATE_A + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return da * RING.r < GATE_W / 2 - 0.35; }   // duvar, kapıdan geçilir
  if (x > KERVAN.x0 - 0.4 && x < KERVAN.x1 + 0.4 && z > KERVAN.z0 - 0.4 && z < KERVAN.z1 + 0.4) return false;
  return true;
}
export const groundY = (_x?: number, _z?: number) => 0;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  tdv: { title: 'TDV İslâm Ansiklopedisi — Mama Hatun Külliyesi', url: 'https://islamansiklopedisi.org.tr/mama-hatun-kulliyesi' },
  kure: { title: 'Küre Ansiklopedisi — Mama Hatun Külliyesi', url: 'https://kureansiklopedi.com/tr/detay/mama-hatun-kulliyesi' },
  wiki: { title: 'Wikipedia — Mama Hatun', url: 'https://en.wikipedia.org/wiki/Mama_Hatun' },
  ntv: { title: 'NTV — Erzincan\'daki Mama Hatun Külliyesi restore edildi', url: 'https://www.ntv.com.tr/seyahat/galeri-erzincandaki-mama-hatun-kulliyesi-restore-edildi,5w2yNWNNI06CaTlGwF99OA' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kulliye', 'Mama Hatun Külliyesi', 'Külliye', [-16, 0], [-RING.r - RING.t - 0.4, RING.h + 1.2, 0],
    'Saltuklu hükümdarı II. İzzeddin Saltuk\'un kızı Mama Hatun, Erzurum–Erzincan kervan yolu üzerindeki Tercan\'da kümbet, kervansaray, hamam ve camiden oluşan bir külliye yaptırdı. Kümbetin Mama Hatun\'a ait olduğu güçlü bir sözlü geleneğe dayanır.', SRC.tdv, 3.5),
  mk('kapi', 'Batıdaki kapı', 'Kapı', [-10.4, 2.2], [-RING.r - RING.t - 0.05, 3.6, 0],
    'Süsleme batıya bakan kapıda toplanır: düz atkılı açıklığın üstünde palmet frizi vardır. Kapının kitabe panosu ise boş bırakılmıştır. (Kapının biçimi temsilîdir.)', SRC.kure),
  mk('usta', 'Ahlatlı usta', 'Kitabe', [0, -RING.r + 1.6], [0, 3.2, -KUMBET.r - 0.1],
    'Kitabesine göre yapının mimarı Ahlatlı Ebü\'n-Nemâ b. Mufaddal\'dır. Ahlat ustaları, Selçuklu döneminde Doğu Anadolu\'nun pek çok yapısında çalıştı.', SRC.tdv),
  mk('onarim', 'Eriyen taşlar', 'Onarım', [14, 6], [12, 2.2, 4],
    'Vakıflar Genel Müdürlüğü, taşlarındaki erime nedeniyle külliyede onarım yaptı; çalışmaların büyük bölümü 2021\'de tamamlandı.', SRC.ntv),
  mk('kervan', 'Kervan yolu ve kervansaray', 'Külliye', [42, -6], [42, 5, KERVAN.z1],
    'Külliye, Erzurum ile Erzincan arasındaki kervan yolu üzerinde kuruldu; kervansarayı yolculara konaklama yeri sağlıyordu. (Oyundaki kervansaray temsilîdir.)', SRC.tdv),
];
export const CARD_NICHE = { id: 'nis', name: 'On üç niş', kicker: 'Halka duvar',
  text: 'Kümbeti kuşatan yuvarlak duvarın iç yüzünde 13 sivri kemerli niş vardır; bunların altısında, Mama Hatun\'un yakınlarına ait olduğu düşünülen sandukalar bulunur. Kümbet ile onu saran yuvarlak duvar, Anadolu\'da başka örneğine rastlanmayan bir plandır.', source: SRC.kure };
export const CARD_LOBE = { id: 'dilim', name: 'Sekiz dilimli gövde', kicker: 'Onarım',
  text: 'Kümbetin silindirik gövdesi, ince dikey silmelerle ayrılan sekiz dış bükey dilimden oluşur; içi de aynı dilimli düzendedir. Aşınan taşların yerine aynı biçimde yeni taş konarak gövde onarıldı. (Aşınmış dilimlerin yeri temsilîdir.)', source: SRC.tdv };
export const START: { at: V2; yaw: number } = { at: [-22, 2], yaw: -Math.PI / 2 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
