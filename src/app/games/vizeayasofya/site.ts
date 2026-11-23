/**
 * Vize Ayasofyası (Kırklareli; Küçük Ayasofya, Gazi Süleyman Paşa Camii) — "Bizye'nin Katedrali": akropol yamacındaki bazilika planlı, yüksek
 * çokgen kasnaklı kubbeli kilise (sonradan cami); narteks, üç çokgen apsis, nefi ayıran sütun sıraları ve 6 durak (saf veri; three.js'siz, test edilir).
 * Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (avlu, narteks ve ana kapı), −z kuzey (apsisler). Ölçüler, sütun sayısı ve galeri düzeni TEMSİLÎDİR (docs/VIZE-AYASOFYA.md).
 * NOT: Bu yapı İstanbul'daki Küçük Ayasofya (Sergios ve Bakkhos) ile aynı değildir; ikisi aynı adla anılır.
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Kilisenin dış sınırı, duvar kalınlığı; nef + yan nefler iç alanı; narteks */
export const CHURCH: Rect = { x0: -9, x1: 9, z0: -18, z1: 16 };
export const WALL_T = 1;
export const NAVE: Rect = { x0: -8, x1: 8, z0: -17, z1: 11 };
export const NARTHEX: Rect = { x0: -8, x1: 8, z0: 11.8, z1: 15 };
export const DOOR = 1.6;
/** Nefi yan neflerden ayıran sütun/payeler (yürünmez daireler) */
export const PIERS: V2[] = (() => { const o: V2[] = []; for (const x of [-4, 4]) for (const z of [-10, -6, -2, 2, 6]) o.push([x, z]); return o; })();
export const PIER_R = 0.7;
/** Dış alan ve zemin */
export const AREA: Rect = { x0: -50, x1: 50, z0: -40, z1: 60 };
export const FLOOR_H = 0.2;
/** Kuzeydeki apsis üçlüsü: merkez apsis (yürünmez çıkıntı dış duvarda) — iç düzende yer almaz */
const outer = CHURCH;
const near = (x: number, z: number) => Math.max(0, Math.max(outer.x0 - x, x - outer.x1, outer.z0 - z, z - outer.z1));
export function groundY(x: number, z: number): number {
  if (inR(outer, x, z)) return FLOOR_H;
  const w = Math.max(0, Math.min(1, (near(x, z) - 3) / 12));
  return w * (0.05 * -z + 0.015 * x);
}
export function walkable(x: number, z: number): boolean {
  if (!inR(AREA, x, z, 0.4)) return false;
  if (inR(outer, x, z)) {
    if (inR(NAVE, x, z, 0.3)) return !(mosqueBlock.on && inR(MINBER, x, z, -0.3)) && !PIERS.some((p) => Math.hypot(x - p[0], z - p[1]) < PIER_R + 0.4);
    if (inR(NARTHEX, x, z, 0.3)) return true;
    if (z > NAVE.z1 - 0.3 && z < NARTHEX.z0 + 0.3 && Math.abs(x) < DOOR) return true;            // narteks–nef kapısı
    if (z > NARTHEX.z1 - 0.3 && Math.abs(x) < DOOR) return true;                                 // ana kapı
    return false;
  }
  return true;
}
/* ===================== kıble ===================== */
/** Oyun ekseni: apsisler doğuda (−z), narteks batıda (+z); buna göre kuzey −x, güney +x. Pusula yönü (kuzeyden saat yönünde derece):
 * ileri vektör (−sin yaw, −cos yaw) olduğundan yön = 90° − yaw. Vize (≈41,57° K, 27,76° D) → Mekke (21,42° K, 39,83° D) büyük daire başlangıç yönü ≈ 150°. */
export const QIBLA_DEG = 150;
export const QIBLA_TOL = 15;
/** Kıble pusulasının kullanıldığı yer: kubbe bölümünün doğu (apsis) kenarı; kubbe durağıyla (0, −2) çakışmasın diye 3,6 m ötede */
export const COMPASS = { c: [0, -5.6] as V2, reach: 2.0 };
const DOME_C: V2 = [0, -2];
export function headingDeg(yaw: number): number { const d = 90 - (yaw * 180) / Math.PI; return ((d % 360) + 360) % 360; }
/** İşaretli açı farkı (−180..180): pozitifse oyuncu kıblenin solunda kalıyor, sağa dönmeli */
export function qiblaDiff(yaw: number): number { return ((QIBLA_DEG - headingDeg(yaw) + 540) % 360) - 180; }
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180, f1 = lat1 * r, f2 = lat2 * r, dl = (lon2 - lon1) * r;
  const b = Math.atan2(Math.sin(dl) * Math.cos(f2), Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl)) / r; return (b + 360) % 360;
}
/** Mihrabın yeri: kubbe merkezinden kıble yönündeki ışının iç duvara değdiği nokta (oyunda temsilî) */
export const MIHRAB: { at: V2; ry: number } = (() => { const b = (QIBLA_DEG * Math.PI) / 180, dx = -Math.cos(b), dz = -Math.sin(b);
  const tx = dx > 0 ? (NAVE.x1 - 0.05 - DOME_C[0]) / dx : (NAVE.x0 + 0.05 - DOME_C[0]) / dx, tz = dz > 0 ? (NAVE.z1 - DOME_C[1]) / dz : (NAVE.z0 + 0.05 - DOME_C[1]) / dz, t = Math.min(tx, tz);
  return { at: [DOME_C[0] + dx * t, DOME_C[1] + dz * t], ry: tx < tz ? (dx > 0 ? -Math.PI / 2 : Math.PI / 2) : (dz > 0 ? Math.PI : 0) }; })();

/** Cami katmanı açıkken minber yürünmez (kıble bulununca oyun yöneticisi açar) */
export const mosqueBlock = { on: false };
export const MINBER = (() => { const [mx, mz] = MIHRAB.at, sx = Math.cos(MIHRAB.ry), sz = -Math.sin(MIHRAB.ry), nx = Math.sin(MIHRAB.ry), nz = Math.cos(MIHRAB.ry);
  const ax = mx + sx * 2.2 + nx * 0.3, az = mz + sz * 2.2 + nz * 0.3, bx2 = mx + sx * 2.2 + nx * 3.9, bz = mz + sz * 2.2 + nz * 3.9;
  return { x0: Math.min(ax, bx2) - 0.5, x1: Math.max(ax, bx2) + 0.5, z0: Math.min(az, bz) - 0.5, z1: Math.max(az, bz) + 0.5 }; })();

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
  columbia: { title: 'Columbia / DAI — Vize projesi', url: 'https://projects.mcah.columbia.edu/vize/html/intro.htm' },
  klein: { title: 'Holger Klein — The Church of Hagia Sophia (Bizye)', url: 'https://arthistory.columbia.edu/sites/default/files/content/faculty/pdfs/klein/The-Church-of-Hagia-Sophia.pdf' },
  tdv: { title: 'TDV İslâm Ansiklopedisi — Ayasofya Camii (Vize)', url: 'https://islamansiklopedisi.org.tr/ayasofya-camii--vize' },
  kure: { title: 'Küre Ansiklopedisi — Vize Küçük Ayasofya Camii (Gazi Süleyman Paşa Camii)', url: 'https://kureansiklopedi.com/tr/detay/vize-kucuk-ayasofya-camii-gazi-suleyman-pasa-camii' },
  belleten: { title: 'Belleten — Semavi Eyice, Vize Ayasofyası', url: 'https://belleten.gov.tr/tam-metin/3333/tur' },
  byzlegacy: { title: 'The Byzantine Legacy — Hagia Sophia (Bizye)', url: 'https://www.thebyzantinelegacy.com/hagia-sophia-bizye' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('bizye', 'Bizye\'nin yamacı', 'Yer', [0, 30], gy(0, 30, 6),
    'Kilise, antik Bizye\'nin akropolünün güneybatı yamacında yer alır ve sıklıkla kentin Bizans dönemindeki piskoposluk kilisesi, yani katedrali olarak tanımlanır. Bu tanımlama tartışmalıdır.', SRC.columbia, 6),
  mk('plan', 'Bazilika planı', 'Mimari', [0, 8], gy(0, 8, 4),
    'Yapı yer planında bazilika düzenindedir; batıda bir narteks, doğuda (oyunda kuzeyde) üç çokgen apsis ve galeriler bulunur. Oyundaki sütun sayısı, yerleri ve galeri düzeni temsilîdir.', SRC.columbia, 4.8),
  mk('kubbe', 'Çokgen kasnaklı kubbe', 'Kubbe', [0, -2], gy(0, -2, 9),
    'Yapının üzerinde, yüksek çokgen bir kasnağa oturan büyük bir kubbe yükselir. Eyice, kubbenin dört beşik tonozla örtüldüğünü ve üst yapının haç planlı bir düzen gösterdiğini belirtir; payelerin, sonradan ince sütunların yerine eklendiğini düşünür.', SRC.belleten, 5.4),
  mk('tarih', 'Ne zaman yapıldı?', 'Tarih', [0, 13.4], gy(0, 13.4, 3.4),
    'Tarihlendirme tartışmalıdır. Bir veri tabanı 6. yüzyılı verir; Mango ve Eyice ise mimariyi 13.–14. yüzyıla yerleştirir. Bazı turizm sitelerinin Iustinianus\'a bağlaması bilimsel çalışmalarla çelişir. Oyunda tek bir tarih verilmiyor.', SRC.klein, 4.4),
  mk('cami', 'Cami olarak', 'Dönüşüm', [0, -12.5], gy(0, -12.5, 3.8),
    'Kilise 15. yüzyılda camiye çevrildi; adı Gazi Süleyman Paşa Camii olarak geçer. Bu adı veren kişi kaynaklarda kesin değildir. Oyundaki iç düzen, bu dönüşümü göstermez; yalnızca temsilî bir iç mekândır.', SRC.kure, 5),
  mk('arastirma', 'Yakın tarihli araştırma', 'Koruma', [14, 6], gy(14, 6, 4),
    'Yapı 1950\'lerde çok harap ve bakımsızdı; Vakıflar 1952–53\'te onarım hazırlığı yaptı ama çalışma başlamadı. Franz Alto Bauer ve Holger Klein, 2003–2004 saha çalışmalarıyla yapıyı ayrıntılı biçimde belgeledi.', SRC.columbia, 5),
];
export const START: { at: V2; yaw: number } = { at: [0, 44], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -54, x1: 54, z0: -44, z1: 64 };
export { inR };
