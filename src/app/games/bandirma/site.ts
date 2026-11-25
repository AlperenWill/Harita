/**
 * Samsun — Bandırma Vapuru Müzesi: "Seyir Defteri" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x pruva (doğu), +z güney. Gemi müzesi parkta, beton kızaklar üstünde karada durur; güneydeki iskele merdiveninden güverteye
 * çıkılır. Güvertede ortada salon (içinde harita masası), üstünde kaptan köşkü, baca ve iki direk. Mekanik: harita masasında 1919
 * yolculuğunun limanlarını sırayla işaretlemek (İstanbul → Sinop → Samsun). Gemi boyu ve eni kaynaktan; güverte düzeni TEMSİLÎDİR.
 */
export type V2 = [number, number];
export const SHIP = { L: 47.7, B: 6.9, deckY: 4.6 };
const HALF = SHIP.L / 2;
/** Gövdenin güvertedeki yarı genişliği (pruvada sivri, kıçta yuvarlak) */
export function halfBeam(x: number): number {
  const b = SHIP.B / 2;
  if (x > HALF || x < -HALF) return 0;
  if (x > 12) { const t = (x - 12) / (HALF - 12); return b * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - 0.15 * t); }
  if (x < -16) { const t = (-16 - x) / (HALF - 16); return b * Math.sqrt(Math.max(0, 1 - t * t * t)); }
  return b;
}
export const BULWARK = 0.3;
export const SALON = { x0: -9, x1: 5, hw: 1.75, door: 0.75, h: 2.5 };
export const TABLE = { x: -1, z: 0, w: 1.6, d: 1.1 };
export const TABLE_AT: V2 = [TABLE.x - TABLE.w / 2 - 0.7, 0];
/** İskele merdiveni: güneyde, güvertenin ortasının biraz kıç tarafında */
export const GANG = { x: -5, w: 1.6, z0: SHIP.B / 2, z1: SHIP.B / 2 + 10 };
export const PARK = { x0: -45, x1: 45, z0: -20, z1: 40 };
export const BOUNDS = { x0: -50, x1: 50, z0: -25, z1: 45 };

const inShipFoot = (x: number, z: number, pad = 0.6) => Math.abs(z) < halfBeam(Math.max(-HALF + 0.01, Math.min(HALF - 0.01, x))) + pad && x > -HALF - pad && x < HALF + pad;
export type Zone = 'park' | 'gang' | 'deck' | 'salon' | null;
export function zone(x: number, z: number): Zone {
  const p = 0.35;
  if (x < PARK.x0 || x > PARK.x1 || z < PARK.z0 || z > PARK.z1) return null;
  if (Math.abs(x - GANG.x) < GANG.w / 2 - p * 0.6 && z > GANG.z0 - 1.0 && z < GANG.z1) return 'gang';
  const hb = halfBeam(x);
  if (hb > 0 && Math.abs(z) < hb - BULWARK - p) {
    if (x > SALON.x0 && x < SALON.x1 && Math.abs(z) < SALON.hw + 0.15) {   // salon duvarları ve içi
      const inside = x > SALON.x0 + 0.15 + p && x < SALON.x1 - 0.15 - p && Math.abs(z) < SALON.hw - 0.15 - p;
      const door = x < SALON.x0 + 0.5 && Math.abs(z) < SALON.door - p * 0.5;
      if (inside) return Math.abs(x - TABLE.x) < TABLE.w / 2 + p && Math.abs(z - TABLE.z) < TABLE.d / 2 + p ? null : 'salon';
      return door ? 'salon' : null;
    }
    return 'deck';
  }
  if (inShipFoot(x, z)) return null;
  return 'park';
}
export const walkable = (x: number, z: number) => zone(x, z) !== null;
export function groundY(x: number, z: number): number {
  const zn = zone(x, z);
  if (zn === 'deck' || zn === 'salon') return SHIP.deckY;
  if (zn === 'gang') { const t = Math.max(0, Math.min(1, (GANG.z1 - z) / (GANG.z1 - GANG.z0))); return SHIP.deckY * t; }
  return 0;
}
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; const y0 = groundY(x, z);
  if (walkable(x + dx, z) && Math.abs(groundY(x + dx, z) - y0) < 0.6) x += dx;
  const y1 = groundY(x, z); if (walkable(x, z + dz) && Math.abs(groundY(x, z + dz) - y1) < 0.6) z += dz; return [x, z]; }
export const atTable = (x: number, z: number) => Math.hypot(x - TABLE_AT[0], z - TABLE_AT[1]) < 1.4;

/* ===================== harita masası ===================== */
/** Karadeniz kıyısı (şematik, 0–1 kutusunda; x doğu, y kuzey) ve limanlar */
export const PORTS = [
  { id: 'istanbul', name: 'İstanbul', p: [0.1, 0.22] as V2 },
  { id: 'eregli', name: 'Ereğli', p: [0.2, 0.3] as V2 },
  { id: 'inebolu', name: 'İnebolu', p: [0.42, 0.38] as V2 },
  { id: 'sinop', name: 'Sinop', p: [0.55, 0.45] as V2 },
  { id: 'samsun', name: 'Samsun', p: [0.66, 0.3] as V2 },
  { id: 'trabzon', name: 'Trabzon', p: [0.9, 0.18] as V2 },
] as const;
export type PortId = (typeof PORTS)[number]['id'];
export const ROUTE: { id: PortId; when: string }[] = [
  { id: 'istanbul', when: '16 Mayıs 1919 · kalkış' },
  { id: 'sinop', when: '18 Mayıs · öğlen Sinop Limanı' },
  { id: 'samsun', when: '19 Mayıs · 08.15 demir' },
];
/** Sıradaki liman doğru mu */
export const nextOk = (picked: PortId[], id: PortId) => ROUTE[picked.length]?.id === id;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
export const SRC = {
  kure: { title: 'Küre Ansiklopedisi — Bandırma Vapuru', url: 'https://kureansiklopedi.com/tr/detay/bandirma-vapuru-ca5e3' },
  muze: { title: 'Küre Ansiklopedisi — Bandırma Gemi Müzesi', url: 'https://kureansiklopedi.com/tr/detay/bandirma-gemi-muzesi-77a8c' },
  ata: { title: 'Atatürk Ansiklopedisi — Bandırma Vapuru', url: 'https://ataturkansiklopedisi.gov.tr/bilgi/bandirma-vapuru/?pdf=3762' },
  vatan: { title: 'Gazete Vatan — Bandırma Vapuru\'nda kimler vardı', url: 'https://www.gazetevatan.com/gundem/bandirma-vapurunda-kimler-vardi-bandirma-vapurunun-kaptani-kimdir-bandirma-vapurunda-kac-kisi-vardi-2146747' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 2.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('muze', 'Gemi müzesi', 'Replika', [GANG.x, GANG.z1 + 2.5], [GANG.x, 2.4, GANG.z1 + 0.6],
    'Parktaki gemi, Bandırma Vapuru\'nun aslına göre yapılmış bir kopyasıdır. Kopya 2001\'de tamamlandı ve 2000\'li yılların başında müze olarak açıldı (açılış tarihi kaynaklarda farklı verilir).', SRC.muze, 3.2),
  mk('gemi', 'Glasgow yapımı', 'Gemi', [16, 0], [18, SHIP.deckY + 1.8, 0],
    'Gemi 1878\'de İskoçya\'da, Glasgow yakınında yapıldı. Kaynaklara göre boyu 47,7 m, eni 6,9 m\'dir. İlk adı Trocadero idi; sonra başka adlar aldı. 1919\'da yaklaşık 41 yaşındaydı.', SRC.kure),
  mk('kaptan', 'Kaptan İsmail Hakkı', 'Kaptan köşkü', [7.2, 0], [5.6, SHIP.deckY + 3.6, 0],
    'Geminin kaptanlığına 1 Mayıs 1919\'da İsmail Hakkı (Durusu) atandı. Anlatılana göre yolculukta kıyıya yakın bir rota izlendi. (Rota ayrıntıları kaynaklarda farklı anlatılır.)', SRC.ata),
  mk('yolcular', 'Yolcular', 'Güverte', [-14, 0], [-14, SHIP.deckY + 1.6, 0],
    'Gemide Mustafa Kemal Paşa ve karargâhı bulunuyordu. Bir kaynak yolcuları Mustafa Kemal ile 22 subay ve 25 astsubay olarak sayar; sayılar kaynaklarda farklıdır.', SRC.vatan),
];
export const CARD_ROTA = { id: 'rota', name: 'Seyir defteri', kicker: '16–19 Mayıs 1919',
  text: 'Bandırma Vapuru 16 Mayıs 1919\'da İstanbul\'dan ayrıldı, 18 Mayıs öğlen Sinop Limanı\'na girdi ve 19 Mayıs sabahı saat 08.15\'te Samsun\'a demir attı. Bu yolculuk Millî Mücadele\'nin başlangıcı sayılır. (Haritadaki kıyı çizgisi ve rota şematiktir.)', source: SRC.ata };
export const START: { at: V2; yaw: number } = { at: [GANG.x + 3, GANG.z1 + 8], yaw: 0.25 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
