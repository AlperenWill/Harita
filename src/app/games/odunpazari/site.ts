/**
 * Odunpazarı Evleri (Eskişehir) — "Cumbalı Sokak": yokuş aşağı uzanan dar sokak, iki yanda ahşap çıkmalı (cumbalı) konaklar, küçük meydan
 * ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (girişteki sokak başı), −z kuzey (yokuşun üstündeki meydan). Yükseklik kuzeye doğru yükselir.
 * Ölçüler, ev sayısı, renkler ve iç düzen TEMSİLÎDİR (docs/ODUNPAZARI.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Sokak: dar ve uzun; kuzey ucunda küçük meydan */
export const LANE = { x0: -4.2, x1: 4.2, z0: -62, z1: 40 };
export const SQUARE = { x0: -9, x1: 9, z0: -66, z1: -56 };
export const SLOPE = 0.03;
/** Konaklar: sokağın iki yanında; yürünmez. Yapı, kat ve renk bilgisi */
export interface House { x: number; z: number; w: number; d: number; floors: number; color: string; cumba: 'sag' | 'sol' }
const COLORS = ['#e7d7a8', '#c9dfe4', '#e6b8a2', '#d9cfe6', '#f0e6cc', '#b9d5b0'];
export const HOUSES: House[] = (() => { const out: House[] = [];
  let k = 0;
  for (const side of [-1, 1] as const) {
    let z = -60;
    while (z < 38) { const d = 6.2 + (k * 7) % 3, w = 7 + ((k * 3) % 2), floors = k % 3 === 0 ? 3 : 2;
      out.push({ x: side * (4.2 + 1 + w / 2 + ((k * 5) % 3) * 0.2), z: z + d / 2, w, d, floors, color: COLORS[k % COLORS.length], cumba: side > 0 ? 'sol' : 'sag' });
      z += d + 0.7; k++; }
  }
  return out; })();
export function groundY(_x: number, z: number): number { return Math.max(0, -z) * SLOPE; }
export function walkable(x: number, z: number): boolean {
  if (inR(SQUARE, x, z, 1)) return true;
  if (!inR(LANE, x, z, 0.1)) return false;
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
  kure: { title: 'Küre Ansiklopedisi — Odunpazarı Evleri', url: 'https://kureansiklopedi.com/tr/detay/odunpazari-evleri-88d0a' },
  unesco: { title: 'UNESCO Geçici Listesi — Odunpazarı Tarihi Kentsel Alan (5733)', url: 'https://whc.unesco.org/en/tentativelists/5733' },
  archnet: { title: 'Archnet — Odunpazarı Houses Restoration', url: 'https://archnet.org/sites/5151' },
  belediye: { title: 'Odunpazarı Belediyesi — Tarihi Odunpazarı Evleri', url: 'https://odunpazari.bel.tr/en-US/detay/historical-odunpazari-houses' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('sokak', 'Dar sokak', 'Sokak', [0, 18], [0, 4.2, 18],
    'Evliya Çelebi\'nin övdüğü sokakların birçoğu, Odunpazarı\'nda hâlâ özgün adlarını koruyor. Sokaklar dar ve kıvrımlıdır; evler birbirine yakın dizilmiştir.', SRC.kure),
  mk('cumba', 'Cumba', 'Mimari', [2.2, -6], [5.6, 6.2, -6],
    'Konakların en belirgin özelliği, sokağa doğru taşan üst kat çıkmalarıdır (cumba). Kaynaklar, 19. yüzyıl Osmanlı sivil mimarisinin bu öğesini tanıtır; büyüklüğünün sahibinin toplumsal durumuyla ilişkilendirildiği aktarılır.', SRC.kure, 3.8),
  mk('hatil', 'Ahşap ve kerpiç', 'Yapım', [-2.4, -20], [-5.4, 3.2, -20],
    'Evlerin ahşap çerçeveli ve kerpiç dolgulu yapım sistemi, yan yana dizilmiş konakların sağlamlığını korumaya yardımcı olmuştur. Yapım tekniği ayrıntıları kaynaklarda farklı anlatılır; oyundaki düzen temsilîdir.', SRC.belediye, 3.8),
  mk('restorasyon', 'Restorasyon', 'Koruma', [2.2, -34], [5.6, 4.3, -34],
    'Konakların önemli bir bölümü restore edildi; bazıları bugün ev müzesi, kafe ya da atölye olarak kullanılıyor. Kaynaklar 2002\'de tamamlanan bir restorasyon çalışmasını da anar.', SRC.archnet, 3.8),
  mk('unesco', 'Geçici liste', 'UNESCO', [0, -52], [0, 4.6, -60],
    'Odunpazarı Tarihi Kentsel Alan, 2012\'de UNESCO Dünya Mirası Geçici Listesi\'ne alındı. Geçici liste, bir yerin Dünya Mirası adaylığı için ilk adımdır; alanın listeye girdiği anlamına gelmez.', SRC.unesco, 4.6),
];
export const START: { at: V2; yaw: number } = { at: [0, 30], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -26, x1: 26, z0: -72, z1: 44 };
