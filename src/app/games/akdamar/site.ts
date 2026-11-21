/**
 * Akdamar — "Taştaki Hikâyeler": göl, ada, tekne fiziği ve cephe kabartmaları (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Ada merkezde, Gevaş kıyısı güneyde. Mesafeler KISALTILMIŞTIR
 * (gerçekte ada kıyıdan yaklaşık 3 km açıktadır).
 *
 * BÖLÜM 1 — Tekne: tekne kendiliğinden ilerler; oyuncu dümeni çevirir. Batıdan esen rüzgâr tekneyi doğuya iter.
 * BÖLÜM 2 — Kabartma avı: kamera kilisenin çevresinde döner; ipucundaki sahneyi cephede bulup dokunursun.
 */
export const ISLAND = { r: 70, h: 18 } as const;
export const PIER: [number, number] = [6, 78];
export const START: [number, number] = [-40, 520];
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Ada: kayalık, ortası tepe (kilise tepede, düz bir düzlükte) */
export function islandHeight(x: number, z: number): number {
  const r = Math.hypot(x, z * 1.2), k = Math.max(0, 1 - r / ISLAND.r);
  if (k <= 0) return -3;
  const top = Math.hypot(x, z) < 22 ? ISLAND.h : ISLAND.h * Math.min(1, k * 1.7) ** 1.3;
  return top - 1.2 + (hash(Math.floor(x / 5), Math.floor(z / 5)) - 0.5) * (Math.hypot(x, z) < 22 ? 0 : 1.6);
}

/* ---------- tekne ---------- */
export interface Boat { x: number; z: number; heading: number; t: number }
export const BOAT_SPEED = 9, TURN = 0.7, WIND = 1.1, ARRIVE = 16;
/** heading: 0 = kuzey (−z). rudder ∈ [−1, 1], artı = sağa (doğu). Rüzgâr doğuya iter, yoğunluğu dalgalanır. */
export function stepBoat(b: Boat, rudder: number, dt: number): Boat {
  const heading = b.heading + Math.max(-1, Math.min(1, rudder)) * TURN * dt, gust = WIND * (0.6 + 0.4 * Math.sin(b.t * 0.5));
  return { heading, t: b.t + dt, x: b.x + (Math.sin(heading) * BOAT_SPEED + gust) * dt, z: b.z - Math.cos(heading) * BOAT_SPEED * dt };
}
export const arrived = (b: Boat) => Math.hypot(b.x - PIER[0], b.z - PIER[1]) < ARRIVE;
/** İskeleye doğru gereken dümen (otomatik pilot / test için) */
export function autoRudder(b: Boat) { const want = Math.atan2(PIER[0] - b.x, -(PIER[1] - b.z)), d = Math.atan2(Math.sin(want - b.heading), Math.cos(want - b.heading)); return Math.max(-1, Math.min(1, d * 3)); }
/** Göl sınırı: tekne çok uzaklaşırsa geri itilir */
export const LAKE_LIMIT = 700;

/* ---------- kilise ve kabartmalar ---------- */
export type Scene = 'gagik' | 'yunus' | 'davut' | 'adem' | 'daniel' | 'asma' | 'ibrahim' | 'hayvan';
/** facade: 0 kuzey, 1 doğu, 2 güney, 3 batı · offset: cephe boyunca (m) */
export interface Relief { id: Scene; name: string; facade: 0 | 1 | 2 | 3; offset: number; y: number; w: number; h: number; clue: string; text: string; target: boolean }
/** Haç planlı gövdenin kolları: cephe kilisenin merkezinden CHURCH_R uzakta, kol genişliği ARM_W */
export const CHURCH_R = 7.6, ARM_W = 9;
export const RELIEFS: Relief[] = [
  { id: 'gagik', name: 'Kral Gagik kilisenin maketini sunuyor', facade: 3, offset: 0, y: 6.2, w: 2.4, h: 2.4, target: true, clue: 'Elinde küçük bir kilise tutan bir kral ara.',
    text: 'Batı cephesinde kiliseyi yaptıran Vaspurakan kralı I. Gagik, elinde kilisenin küçük bir maketiyle gösterilir. Kilise 915–921 yıllarında Mimar Manuel tarafından yapıldı.' },
  { id: 'yunus', name: 'Yunus ve büyük balık', facade: 2, offset: -2.2, y: 6.2, w: 2.4, h: 2.4, target: true, clue: 'Dev bir balığın ağzındaki adamı bul.',
    text: 'Yunus’un büyük balık tarafından yutulup sonra kıyıya bırakılması, cephedeki en tanınan sahnelerden biridir. Hikâye Kur’an’da da geçer.' },
  { id: 'davut', name: 'Davut ile Golyat', facade: 2, offset: 2.2, y: 6.2, w: 2.4, h: 2.4, target: true, clue: 'Sapanlı küçük bir genç ile dev bir savaşçıyı bul.',
    text: 'Genç Davut’un sapanla dev Golyat’ı yenmesi. Figürler iri ve sade hatlıdır; taşın kırmızımsı rengi uzaktan bile seçilir.' },
  { id: 'adem', name: 'Adem ile Havva', facade: 0, offset: 2, y: 6.2, w: 2.4, h: 2.4, target: true, clue: 'Bir ağacın iki yanında duran iki insanı bul.',
    text: 'Adem ile Havva ve yasak ağaç. Kutsal Kitap’tan sahneler bir hikâye kuşağı gibi kilisenin çevresini sarar.' },
  { id: 'asma', name: 'Üzüm asması kuşağı', facade: 1, offset: 0, y: 8.05, w: 8, h: 0.95, target: true, clue: 'Yukarıda dolanan bir üzüm asması ve salkımlar ara.',
    text: 'Kilisenin üst kısmını saran asma kuşağında üzüm toplayan insanlar, hayvanlar ve kuşlar vardır. Bu kuşak, dönemin gündelik yaşamına da bir pencere açar.' },
  { id: 'daniel', name: 'Aslanlar arasında Daniel', facade: 1, offset: 3.3, y: 6.2, w: 2, h: 2, target: false, clue: '', text: '' },
  { id: 'ibrahim', name: 'İbrahim ve koç', facade: 0, offset: -2, y: 6.2, w: 2.4, h: 2.4, target: false, clue: '', text: '' },
  { id: 'hayvan', name: 'Hayvan figürleri', facade: 3, offset: 2.9, y: 6.2, w: 2, h: 2, target: false, clue: '', text: '' },
];
export const TARGETS = RELIEFS.filter((r) => r.target);
const N = (f: number): [number, number] => [Math.sin((f * Math.PI) / 2), -Math.cos((f * Math.PI) / 2)];
/** Kabartmanın dünya konumu (kilise tabanına göre) ve dışa bakan yön açısı */
export function reliefPos(r: Relief): { p: [number, number, number]; rotY: number; orbit: number } {
  const [nx, nz] = N(r.facade), tx = -nz, tz = nx;
  return { p: [nx * (CHURCH_R + 0.03) + tx * r.offset, r.y, nz * (CHURCH_R + 0.03) + tz * r.offset], rotY: Math.atan2(nx, nz), orbit: (r.facade * Math.PI) / 2 + Math.atan2(r.offset, CHURCH_R * 2.6) };
}
