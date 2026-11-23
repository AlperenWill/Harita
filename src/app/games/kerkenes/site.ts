/**
 * Kerkenes Dağı (Yozgat) — "Taş Surlu Kent": tepe üzerindeki Demir Çağı kentinin dairesel surları, yedi kapısı, ışınsal sokakları,
 * saray kompleksi, kazı alanı ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Ölçek: gerçek kent (~7 km sur) bu oyunda kısaltılmıştır; sur çapı ~250 m. Ölçüler, evler ve saray düzeni TEMSİLÎDİR (docs/KERKENES.md).
 * Eksenler: +z güney (oyuncunun başladığı güney kapısı), −z kuzey. Yükseklik: merkezde tepe, dışa doğru alçalır.
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Kent sınırı: iç yarıçap ve sur kalınlığı */
export const RING = { r0: 124, r1: 132, h: 3.6 };
export const GATE_HALF = 3.2;
/** Yedi kapı ve ışınsal sokaklar: açılar (radyan). Güney kapısı (oyuncunun başladığı) θ = π/2 (z+ yönü) */
export const GATE_ANGLES: number[] = Array.from({ length: 7 }, (_, k) => Math.PI / 2 + (k * 2 * Math.PI) / 7);
export const STREET_W = 4.2;
/** Saray kompleksi (kuzey yarıda; yürünmez) */
export const PALACE: Rect = { x0: -24, x1: 24, z0: -66, z1: -40 };
/** Kazı çukuru (yürünmez) */
export const TRENCH: Rect = { x0: -52, x1: -34, z0: 14, z1: 26 };
/** Evler: tepenin içinde, sokakların arasındaki kesimlerde; yürünmez */
export interface House { x: number; z: number; w: number; d: number; yaw: number }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
export const HOUSES: House[] = (() => { const r = rng(44), out: House[] = [];
  for (let i = 0; i < 3000 && out.length < 60; i++) {
    const a = r() * Math.PI * 2, d = 14 + r() * 100, x = Math.cos(a) * d, z = Math.sin(a) * d, w = 5 + r() * 3, dd = 4 + r() * 2.5, yaw = (r() - 0.5) * 0.2;
    if (d + Math.max(w, dd) > RING.r0 - 4) continue;
    if (inR(PALACE, x, z, -6) || inR(TRENCH, x, z, -4) || inR({ x0: -6, x1: 6, z0: -6, z1: 6 }, x, z)) continue;
    if (GATE_ANGLES.some((g) => distToRay(x, z, g) < STREET_W / 2 + Math.max(w, dd) / 2 + 0.8)) continue;   // sokakların üstü boş
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (Math.max(o.w, o.d) + Math.max(w, dd)) / 2 + 2.4)) continue;
    out.push({ x, z, w, d: dd, yaw }); }
  return out; })();
/** Bir noktanın merkezden çıkan ışına (açı θ) uzaklığı; yalnızca ışının dış tarafındaki noktalar için anlamlı */
export function distToRay(x: number, z: number, th: number): number {
  const ux = Math.cos(th), uz = Math.sin(th), t = x * ux + z * uz;
  if (t < 0) return Math.hypot(x, z);
  return Math.abs(x * uz - z * ux);
}
/** Yükseklik: merkezde tepe, dışa doğru alçalan yumuşak bir kubbe */
export function heightAt(x: number, z: number): number { const r2 = x * x + z * z; return 14 * Math.exp(-r2 / (2 * 92 * 92)) + 1.2; }
export function groundY(x: number, z: number): number { return heightAt(x, z); }

function inGate(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  if (r < RING.r0 - 0.5 || r > RING.r1 + 0.5) return false;
  return GATE_ANGLES.some((g) => distToRay(x, z, g) < GATE_HALF && Math.cos(Math.atan2(z, x) - g) > 0);
}
export function walkable(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  if (r > RING.r1 + 0.5) return false;
  if (r >= RING.r0 - 0.5 && r <= RING.r1 + 0.5) return inGate(x, z);   // sur: yalnızca kapılarda geçit
  if (inR(PALACE, x, z, -0.4)) return false;
  if (inR(TRENCH, x, z, -0.4)) return false;
  for (const h of HOUSES) { const c = Math.cos(h.yaw), s = Math.sin(h.yaw), dx = x - h.x, dz = z - h.z, u = dx * c - dz * s, v = dx * s + dz * c; if (Math.abs(u) < h.w / 2 + 0.4 && Math.abs(v) < h.d / 2 + 0.4) return false; }
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
  kure: { title: 'Küre Ansiklopedisi — Kerkenes Harabeleri', url: 'https://kureansiklopedi.com/tr/detay/kerkenes-harabeleri-8ba67' },
  ucf: { title: 'UCF — The Kerkenes Project (overview)', url: 'https://sciences.ucf.edu/anthropology/kerkenes/overview/' },
  sydney: { title: 'University of Sydney — The Kerkenes Project', url: 'https://neaf.sydney.edu.au/?p=1216' },
  wiki: { title: 'Wikipedia — Kerkenes', url: 'https://en.wikipedia.org/wiki/Kerkenes' },
  news: { title: 'KerkNews 2016–2017 (Kerkenes Project bülteni)', url: 'https://sciences.ucf.edu/anthropology/kerkenes/wp-content/uploads/sites/3/2018/11/KerkNews2016-2017.pdf' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.4): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kent', 'Taş surlu kent', 'Kent', [0, 6], [0, 9.5, 6],
    'Kerkenes Dağı, Anadolu platosundaki en büyük Demir Çağı yerleşimlerinden biridir. Kaynaklara göre kent, yaklaşık 7 km uzunluğundaki taş surlarla çevrili ve yaklaşık 2,5 km² alanı kaplar.', SRC.kure, 6),
  mk('kapilar', 'Yedi kapı', 'Sur', [-87.6, 69.8], [-90.7, 4.5, 72.3],
    'Surda yedi kapı bulunur. Kapılardan ışınsal biçimde sokaklar merkeze doğru uzanır. Kent planının dairesel ve ışınsal olduğu yaygın bir anlatıdır; bu oyundaki düzen temsilîdir.', SRC.wiki, 5),
  mk('saray', 'Saray kompleksi', 'Yapı', [0, -36], [0, 3.4, -38],
    'Kentin kuzey yarısında, kazılarda ortaya çıkan büyük bir saray kompleksi yer alır. Kazı çalışmaları bu alanın bir bölümünü açmıştır. Oyundaki yapı biçimi temsilîdir.', SRC.ucf, 5.6),
  mk('kazi', 'Kazı alanı', 'Arkeoloji', [-40, 9.5], [-43, 2.5, 20],
    'Kerkenes Projesi, 1993–2012 yılları arasında Geoffrey ve Françoise Summers yönetiminde bu alanda çalıştı. Proje, geniş ölçekli kazının yerine yüzey ve hava araştırmalarıyla kenti haritalandırdı. (Oyundaki çukur temsilîdir.)', SRC.ucf, 4),
  mk('yikim', 'Yıkım ve son', 'Tarih', [40, 30], [40, 2.6, 30],
    'Kentin MÖ 540 civarında yanarak terk edildiği düşünülür. Bu dönem, Pers Kralı Büyük Kiros ile Lidya Kralı Kroisos arasındaki çatışmayla ilişkilendirilir; bu bağlantı bir hipotezdir ve tartışmalıdır.', SRC.sydney, 4.6),
];
export const START: { at: V2; yaw: number } = { at: [0, 104], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -140, x1: 140, z0: -140, z1: 140 };
