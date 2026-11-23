/**
 * Giresun Adası — "Ares'in Adası": kayalık ada, ortasındaki Bizans katolikonu (kilise kalıntısı) ve altındaki Helenistik tapınak temelleri,
 * kuzeybatıdaki efsane kayalığı, doğu kıyısı ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (iskele ve giriş), −z kuzey. Ada kabaca elips biçimindedir; kıyıdan merkeze doğru yükselir. Ölçüler, kilise planı
 * ve kaya biçimleri TEMSİLÎDİR (docs/GIRESUN.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Ada: yatay ve dikey yarıçaplar (m). Kıyı, d = 1 */
export const ISLE = { a: 70, b: 40 };
export const SHORE_D = 0.97;
/** Kilise kalıntısı (katolikon): dış sınır, iç boşluk ve güney kapısı */
export const CHURCH: Rect = { x0: -11, x1: 11, z0: -7, z1: 7 };
export const CHURCH_T = 1.2;
export const DOOR_HALF = 2;
/** Doğu apsisi: kilisenin doğu duvarına açılan yarım daire (merkez, yarıçap, duvar kalınlığı) */
export const APSE = { c: [10, 0] as V2, r: 4.6, t: 1.2 };
/** Kuzeydoğudaki sarnıç çukuru (yürünmez) */
export const CISTERN = { x: 24, z: -12, r: 2.2 };

/** İskele (güneyde): kıyıdan denize uzanan yürünebilir ahşap platform; ucunda kayığa binilir */
export const JETTY = { x0: -2, x1: 2, z0: 36, z1: 47 };
export const BOARD_AT: V2 = [0, 46];
export const BOAT_START: V2 = [0, 52];
/** Hamza Taşı: adanın doğu kıyısında büyük siyah kaya; kayık turu önünde başlar ve biter */
export const HAMZA = { c: [ISLE.a * 0.99, 3] as V2, r: 4 };
/** Kayık turu: sırayla geçilecek şamandıralar (Hamza Taşı önünden başlayıp kuzey, batı, güney ve yeniden Hamza Taşı) */
export const LAP: { id: string; name: string; at: V2 }[] = [
  { id: 'hamza', name: 'Hamza Taşı önü', at: [ISLE.a * 1.32, 3] },
  { id: 'kuzey', name: 'Kuzey kıyısı', at: [0, -ISLE.b * 1.5] },
  { id: 'bati', name: 'Batı ucu', at: [-ISLE.a * 1.3, 0] },
  { id: 'guney', name: 'İskele açığı', at: [-14, ISLE.b * 1.55] },
  { id: 'bitis', name: 'Hamza Taşı önü (tur tamam)', at: [ISLE.a * 1.32, 3] },
];
export const LAP_REACH = 10;
/** Kayığın gidebildiği su kuşağı: kıyıdan biraz açıkta, adadan çok uzaklaşmadan */
export function boatWater(x: number, z: number): boolean { const d = isleD(x, z); if (Math.abs(x) < 3.5 && z > JETTY.z0 && z < JETTY.z1 + 1.5) return false; return d > 1.12 && d < 2.1; }
export function boatSlide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (boatWater(x + dx, z)) x += dx; if (boatWater(x, z + dz)) z += dz; return [x, z]; }

export function isleD(x: number, z: number): number { return Math.hypot(x / ISLE.a, z / ISLE.b); }
export function heightAt(x: number, z: number): number { const d = Math.min(isleD(x, z), 1.2); return d >= 1 ? -1.5 : 0.6 + 10 * (1 - d * d); }
export function groundY(x: number, z: number): number { if (x > JETTY.x0 && x < JETTY.x1 && z > JETTY.z0 - 2 && isleD(x, z) > 0.9) return Math.max(heightAt(x, z), 0.6); return heightAt(x, z); }
function inChurchInterior(x: number, z: number): boolean { return inR({ x0: CHURCH.x0 + CHURCH_T, x1: CHURCH.x1 - CHURCH_T, z0: CHURCH.z0 + CHURCH_T, z1: CHURCH.z1 - CHURCH_T }, x, z); }
function inChurchDoor(x: number, z: number): boolean { return Math.abs(x) < DOOR_HALF && z > CHURCH.z1 - CHURCH_T - 0.4 && z < CHURCH.z1 + 0.4; }
export function walkable(x: number, z: number): boolean {
  if (x > JETTY.x0 + 0.3 && x < JETTY.x1 - 0.3 && z > JETTY.z0 - 2 && z < JETTY.z1 - 0.3) return true;   // iskele (önceden yürünemiyordu)
  if (isleD(x, z) > SHORE_D) return false;
  if (Math.hypot(x - HAMZA.c[0], z - HAMZA.c[1]) < HAMZA.r + 0.5) return false;
  if (Math.hypot(x - CISTERN.x, z - CISTERN.z) < CISTERN.r + 0.6) return false;
  const ad = Math.hypot(x - APSE.c[0], z - APSE.c[1]);
  if (x > APSE.c[0] - 0.5 && ad < APSE.r + 0.4) return ad < APSE.r - APSE.t - 0.4;   // apsis: içi yürünür, duvarı geçilmez
  if (inR(CHURCH, x, z, -0.2)) return inChurchInterior(x, z) || inChurchDoor(x, z);
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
  wiki: { title: 'Wikipedia — Giresun Island', url: 'https://en.wikipedia.org/wiki/Giresun_Island' },
  kure: { title: 'Küre Ansiklopedisi — Giresun Adası', url: 'https://kureansiklopedi.com/tr/detay/giresun-adasi-aa417' },
  hurriyet: { title: 'Hürriyet Daily News — Excavations reveal religious history of Giresun Island', url: 'https://hurriyetdailynews.com/excavations-reveal-religious-history-of-giresun-island-104830' },
  dergi: { title: 'DergiPark — Doğu Karadeniz’de antik bir yerleşim: Aretias/Khalkeritis Adası (Giresun Adası)', url: 'https://dergipark.org.tr/tr/download/article-file/460302' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.4): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('ada', 'Ares\'in adası', 'Ad', [0, 31], [0, 4.4, 30],
    'Ada antik kaynaklarda Aretias olarak geçer; "Ares\'in adası" anlamına gelen Areos Nesos adı da kullanılmıştır. Roma döneminde Khalkeritis adıyla da anıldığı aktarılır.', SRC.wiki, 5),
  mk('amazon', 'Amazon efsanesi', 'Efsane', [-28, -16], [-28, 6.2, -16],
    'Efsaneye göre Amazonlar, savaş tanrısı Ares için adada bir tapınak yaptırmıştır. Bu anlatı edebiyata dayanır; tapınağın yeri ve tarihi arkeolojik olarak tartışmalıdır.', SRC.kure, 5),
  mk('kilise', 'Katolikon', 'Bizans', [0, -1.5], [0, 5.2, 0],
    'Adanın merkezindeki ana kilise (katolikon) 9.–11. yüzyıla tarihlendirilir. 2011\'den itibaren yapılan kazılar, kalıntıların ortaya çıkarılmasını sağladı.', SRC.hurriyet, 4.4),
  mk('temel', 'Tapınak temelleri', 'Helenistik', [-6.4, 3.6], [-6.4, 1.6, 3.6],
    'Kilisenin altında Helenistik dönemden kalma bir tapınağın temel taşları bulunmuştur; kilisenin bazı duvarları bu temelin üzerine oturtulmuştur. Tapınağın tarihi kaynaklarda farklı verilir.', SRC.dergi, 4),
  mk('argonot', 'Argonotlar', 'Edebiyat', [46, 8], [46, 4.6, 8],
    'Apollonios Rhodios\'un Argonautika\'sında Argonotların bu adaya uğradığı anlatılır. Bu bir edebi anlatıdır; arkeolojik bir kanıt değildir.', SRC.wiki, 4.6),
];
export const START: { at: V2; yaw: number } = { at: [0, 30], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -76, x1: 76, z0: -44, z1: 50 };
