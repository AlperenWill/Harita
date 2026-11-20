/**
 * Pamukkale — "Beyaz Basamaklar": traverten yamacı, havuzlar, rota ve Hierapolis noktaları (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Aşağıda köy (z ≈ 120), yukarıda Hierapolis platosu (z < 0). STİLİZE.
 *
 * Gerçek dayanak: travertenler, sıcak kaynak suyundaki kalsiyum karbonatın çökelmesiyle oluşur. Su bugün havuzlara SIRAYLA verilir;
 * susuz kalan havuzlar zamanla kararır, su verilince yeniden beyazlar. Oyuncu kurumuş beş havuza suyu yönlendirir.
 */
export type V3 = [number, number, number];
export const PLATEAU = 34, SLOPE_Z0 = 0, SLOPE_Z1 = 120;   // ~16° eğim: yukarı bakınca havuzların su yüzeyleri de görünür
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Traverten yamacı: düzgün eğim (basamakları yamaca oturan havuzlar oluşturur, bkz. poolAt); yamacın dışı yeşil tepe */
export function heightAt(x: number, z: number): number {
  if (z <= SLOPE_Z0) return PLATEAU + (hash(Math.floor(x / 9), Math.floor(z / 9)) - 0.5) * 0.6;
  if (z >= SLOPE_Z1) return 0;
  const u = (z - SLOPE_Z0) / (SLOPE_Z1 - SLOPE_Z0);
  return PLATEAU * (1 - u) + (hash(Math.floor(x / 7), Math.floor(z / 7)) - 0.5) * 0.4 * (Math.abs(x) > 64 ? 0 : 1);
}
/** Havuz: yamaca gömülü yatay silindir; üstü su, yokuş aşağı yanı beyaz traverten duvar. y = suyun yüzeyi */
export const poolY = (x: number, z: number) => heightAt(x, z) + 0.35;
export const isTravertine = (x: number, z: number) => z > SLOPE_Z0 - 2 && z < SLOPE_Z1 && Math.abs(x) < 66;

/* ---------- rota: köyden yukarı (traverten yolu, çıplak ayak), sonra plato ---------- */
const WP: [number, number][] = [[6, 136], [4, 118], [-2, 100], [6, 82], [-4, 64], [4, 46], [-6, 28], [2, 10], [0, -6], [-22, -26], [-30, -44], [0, -70], [30, -100], [36, -112], [10, -134], [-40, -150], [-70, -168]];
const PTS: V3[] = WP.map(([x, z]) => [x, 0, z]);
const LENS = [0]; for (let i = 1; i < PTS.length; i++) LENS.push(LENS[i - 1] + Math.hypot(PTS[i][0] - PTS[i - 1][0], PTS[i][2] - PTS[i - 1][2]));
export const ROUTE_LEN = LENS[LENS.length - 1];
export function routeAt(s: number): { p: V3; dir: [number, number]; barefoot: boolean } {
  const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < LENS.length - 1 && LENS[i] < c) i++;
  const a = PTS[i - 1], b = PTS[i], k = (c - LENS[i - 1]) / Math.max(1e-6, LENS[i] - LENS[i - 1]);
  const x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k, dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
  // yürüme yüzeyi: basamak duvarlarında rampa gibi yumuşatılır (heightAt'in düzleştirilmiş hâli)
  const y = (heightAt(x, z - 1.2) + heightAt(x, z) + heightAt(x, z + 1.2)) / 3;
  return { p: [x, y, z], dir: [dx / l, dz / l], barefoot: isTravertine(x, z) };
}
export function closestS(x: number, z: number): number { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 0.5) { const p = routeAt(s).p, d = Math.hypot(p[0] - x, p[2] - z); if (d < bd) { bd = d; best = s; } } return best; }

/* ---------- kurumuş havuzlar (oyuncu suyu buraya yönlendirir) ---------- */
export interface Pool { id: string; at: [number, number]; r: number; s: number }
export const DRY: Pool[] = ([[-12, 104], [15, 78], [-15, 52], [14, 32], [-12, 14]] as [number, number][]).map(([x, z], i) => ({ id: `havuz-${i + 1}`, at: [x, z], r: 4.2, s: closestS(x, z) }));
export function nearDry(s: number, filled: string[]): Pool | null { for (const p of DRY) if (!filled.includes(p.id) && Math.abs(s - p.s) < 9) return p; return null; }
/** Havuz sırası: suyun kapandığı yerden açıldığı yere — kuru havuz kararır (lekeli), dolu havuz beyaz */
export const whiteness = (fill: number) => 0.55 + 0.45 * Math.min(1, fill);

/* ---------- Hierapolis noktaları ---------- */
export interface Spot { id: string; name: string; at: [number, number]; reach: number; text: string; source: { title: string; url: string }; s: number }
const W = (t: string, u: string) => ({ title: `Wikipedia — ${t}`, url: u });
const RAW: Omit<Spot, 's'>[] = [
  { id: 'traverten', name: 'Travertenler', at: [0, 120], reach: 10, source: W('Pamukkale', 'https://tr.wikipedia.org/wiki/Pamukkale'),
    text: 'Bembeyaz basamaklar, sıcak kaynak suyunun içindeki kalsiyum karbonatın çökelmesiyle oluşur. Travertenlerin üstünde ayakkabıyla yürünmez; ziyaretçiler çıplak ayakla çıkar. Burada kurumuş beş havuz var: suyu onlara yönlendir.' },
  { id: 'antik-havuz', name: 'Antik Havuz', at: [-30, -44], reach: 10, source: W('Hierapolis', 'https://tr.wikipedia.org/wiki/Hierapolis'),
    text: 'Sıcak su kaynağının üstündeki havuz. Dibinde, eski depremlerde yıkılan bir revakın sütun parçaları yatar; bugün ziyaretçiler bu sütunların arasında yüzer.' },
  { id: 'tiyatro', name: 'Hierapolis Tiyatrosu', at: [36, -112], reach: 12, source: W('Hierapolis', 'https://tr.wikipedia.org/wiki/Hierapolis'),
    text: 'Yamaca yaslanan Roma tiyatrosu. Sahne binasının kabartmaları ve oturma basamakları büyük ölçüde korunmuştur.' },
  { id: 'nekropol', name: 'Nekropol', at: [-70, -168], reach: 14, source: W('Hierapolis', 'https://tr.wikipedia.org/wiki/Hierapolis'),
    text: 'Kentin kuzeyindeki mezarlık, Anadolu’nun en büyük antik nekropollerinden biridir: lahitler, ev biçimli mezarlar ve tümülüsler. Hierapolis-Pamukkale 1988’de UNESCO Dünya Mirası listesine girdi.' },
];
export const SPOTS: Spot[] = RAW.map((s) => ({ ...s, s: closestS(s.at[0], s.at[1]) }));
export function nearSpot(s: number): Spot | null { let b: Spot | null = null, bd = Infinity; for (const p of SPOTS) { const d = Math.abs(s - p.s); if (d < p.reach && d < bd) { bd = d; b = p; } } return b; }
