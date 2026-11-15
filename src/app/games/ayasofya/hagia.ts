/**
 * Ayasofya — yapı ölçüleri, güneş, pencereler, kamera rotası ve ilgi noktaları (saf; test edilir).
 * Koordinatlar (m, 1 birim = 1 m): +x apsis (doğu ucu), +z güney, y yukarı; kubbenin merkezi (0, ·, 0).
 * Ölçüler yayımlanmış yaklaşık değerlerdir (kubbe çapı ~31–32 m, tepe ~55 m, 40 pencere); lazer tarama verisi DEĞİLDİR.
 */
export type V3 = [number, number, number];
export const R = 15.5;                        // kubbe yarıçapı (çap ~31 m)
export const ARCH_Y = 26;                     // büyük kemerlerin üzengi seviyesi
export const RING_Y = ARCH_Y + R;             // kubbe kasnağı (41,5 m)
export const DOME_RISE = 14.1;                // kubbe basık: tepe ~55,6 m
export const APEX_Y = RING_Y + DOME_RISE;
export const PEND_R = R * Math.SQRT2;         // pandantif küresinin yarıçapı
export const GALLERY_Y = 13;                  // galeri döşemesi
export const AISLE_Z = 30;                    // dış duvar
export const NAVE_X = 2 * R;                  // yarım kubbelerle birlikte nef yarı uzunluğu (31 m)
export const NARTHEX = { x0: -42, x1: -33, h: 9.5 } as const;
export const DOME_WINDOWS = 40;
/** Yapının ekseni: apsis güneydoğuya bakar (pusula ~123°) */
export const AXIS_BEARING = 123;

const rad = Math.PI / 180;
/** İstanbul (41°K) için ekinoks gününde güneş: yükseklik ve pusula yönü (derece) */
export function sunPosition(hour: number): { elevation: number; bearing: number } {
  const lat = 41 * rad, H = (hour - 13.07) * 15 * rad;   // yerel güneş öğlesi ~13:04 (UTC+3)
  const sinEl = Math.cos(lat) * Math.cos(H), el = Math.asin(sinEl);
  const az = Math.atan2(-Math.sin(H), -Math.sin(lat) * Math.cos(H));   // kuzeyden saat yönünde
  return { elevation: el / rad, bearing: ((az / rad) + 360) % 360 };
}
/** Güneşe doğru birim vektör, yapı koordinatlarında */
export function sunVector(hour: number): V3 {
  const { elevation, bearing } = sunPosition(hour), el = elevation * rad, a = (bearing - AXIS_BEARING) * rad;
  // a = 0 → apsis yönü (+x); a = 90° → güney-batıya doğru (+z)
  return [Math.cos(el) * Math.cos(a), Math.sin(el), Math.cos(el) * Math.sin(a)];
}

/** Kubbe eteğindeki 40 pencere: konum ve dışa bakan normal */
export function domeWindows(): { pos: V3; n: V3; angle: number }[] {
  return Array.from({ length: DOME_WINDOWS }, (_, i) => {
    const a = ((i + 0.5) / DOME_WINDOWS) * Math.PI * 2, r = R * 0.985;
    return { pos: [Math.cos(a) * r, RING_Y + 1.7, Math.sin(a) * r] as V3, n: [Math.cos(a), 0.15, Math.sin(a)] as V3, angle: a };
  });
}
/** Kuzey ve güney timpanon duvarlarındaki pencereler (iki sıra: 7 + 5) */
export function tympanumWindows(): { pos: V3; n: V3 }[] {
  const out: { pos: V3; n: V3 }[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) out.push({ pos: [-10.5 + i * 3.5, 29, s * (R - 0.05)], n: [0, 0, s] });
    for (let i = 0; i < 5; i++) out.push({ pos: [-7 + i * 3.5, 34.5, s * (R - 0.05)], n: [0, 0, s] });
  }
  return out;
}
export interface Shaft { from: V3; to: V3; strength: number }
/**
 * Işık huzmeleri: güneşe bakan her pencereden güneşin tersine doğru bir ışın; zemine (y=0) ya da nefin karşı duvarına kadar.
 * strength = pencere normali · güneş (0..1) — pencere güneşe ne kadar dönükse huzme o kadar güçlü.
 */
export function shafts(hour: number): Shaft[] {
  const s = sunVector(hour); if (s[1] <= 0.03) return [];
  const out: Shaft[] = [];
  for (const w of [...domeWindows(), ...tympanumWindows()]) {
    const nl = Math.hypot(...w.n), d = (w.n[0] * s[0] + w.n[1] * s[1] + w.n[2] * s[2]) / nl;
    if (d < 0.2) continue;
    let t = w.pos[1] / s[1];                                           // zemine kadar
    // nefin yan sınırı (galeri/arkad hattı |z| = R) ve uçları (|x| = 2R): hangisi önce
    if (Math.abs(s[2]) > 1e-6) { const tz = (w.pos[2] + Math.sign(s[2]) * R) / s[2]; if (tz > 0.5) t = Math.min(t, tz); }
    if (Math.abs(s[0]) > 1e-6) { const tx = (w.pos[0] + Math.sign(s[0]) * NAVE_X) / s[0]; if (tx > 0.5) t = Math.min(t, tx); }
    out.push({ from: w.pos, to: [w.pos[0] - s[0] * t, w.pos[1] - s[1] * t, w.pos[2] - s[2] * t], strength: Math.min(1, (d - 0.2) / 0.6) });
  }
  return out;
}

/* ---------- sütunlar (stilize yerleşim; gerçek yapıda yaygın olarak 107 sütun sayılır) ---------- */
export type Marble = 'verd' | 'porphyry' | 'white';
export interface Column { pos: V3; h: number; r: number; kind: Marble }
export function columns(): Column[] {
  const out: Column[] = [];
  for (const s of [-1, 1]) {
    for (const x of [-9.3, -3.1, 3.1, 9.3]) out.push({ pos: [x, 0, s * R], h: 10.4, r: 0.62, kind: 'verd' });               // nef arkadları: yeşil Tesalya mermeri
    for (let i = 0; i < 6; i++) out.push({ pos: [-11.6 + i * 4.64, GALLERY_Y, s * R], h: 7.6, r: 0.42, kind: 'verd' });       // galeri arkadı
    for (const x of [-22, -10, 2, 14, 24]) out.push({ pos: [x, 0, s * 23], h: 9.6, r: 0.5, kind: 'white' });                  // yan nef
    for (const x of [-22, -10, 2, 14, 24]) out.push({ pos: [x, GALLERY_Y, s * 23.5], h: 7.2, r: 0.4, kind: 'white' });        // galeri içi
  }
  // eksedralar: dört köşede ikişer porfir sütun (yarım kubbelerin altındaki nişler)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const a of [0.62, 1.02]) {
    out.push({ pos: [sx * (R + Math.cos(a) * R * 0.98), 0, sz * Math.sin(a) * R * 0.98], h: 10.4, r: 0.6, kind: 'porphyry' });
    out.push({ pos: [sx * (R + Math.cos(a) * R * 0.98), GALLERY_Y, sz * Math.sin(a) * R * 0.98], h: 7.6, r: 0.42, kind: 'verd' });
  }
  return out;
}
export const PIERS: V3[] = [[-R, 0, -18.5], [R, 0, -18.5], [-R, 0, 18.5], [R, 0, 18.5]];

/* ---------- kamera rotası: serbest kamera yok, iki ray ---------- */
export type Zone = 'narteks' | 'nef' | 'apsis' | 'galeri';
export interface Rail { id: 'zemin' | 'galeri'; name: string; points: V3[] }
const EYE = 1.68;
export const RAILS: Rail[] = [
  { id: 'zemin', name: 'Narteks → Ana nef → Mihrap', points: [[-40.5, EYE, 0], [-36, EYE, 0], [-30, EYE, 0], [-18, EYE, 0], [-4, EYE, 0], [8, EYE, 1.2], [19, EYE, 2.6], [26.5, EYE, 3.2]] },
  { id: 'galeri', name: 'Güney galeri', points: [[-27, GALLERY_Y + EYE, 21], [-14, GALLERY_Y + EYE, 21.5], [0, GALLERY_Y + EYE, 19.2], [14, GALLERY_Y + EYE, 21.5], [26.5, GALLERY_Y + EYE, 22.5]] },
];
export function zoneAt(p: V3): Zone {
  if (p[1] > GALLERY_Y) return 'galeri';
  if (p[0] < NARTHEX.x1 + 1.5) return 'narteks';
  if (p[0] > 17) return 'apsis';
  return 'nef';
}
/** Gözün uyum sağlayacağı pozlama (ton eşleme çarpanı): karanlık narteks → yüksek, aydınlık nef → düşük */
export const EXPOSURE: Record<Zone, number> = { narteks: 2.6, nef: 0.95, apsis: 1.05, galeri: 1.25 };
export const ADAPT_SECONDS = 2.2;
/** Göz uyumu: pozlama hedefe üstel yaklaşır; karanlıktan aydınlığa geçişte ilk an göz kamaşır (pozlama hâlâ yüksek) */
export const adapt = (current: number, target: number, dt: number) => current + (target - current) * (1 - Math.exp(-dt / (ADAPT_SECONDS / 3)));

/* ---------- ilgi noktaları ---------- */
export type PoiKind = 'mozaik' | 'sutun' | 'mimari' | 'osmanli';
export interface Poi { id: string; kind: PoiKind; rail: Rail['id']; name: string; era: string; pos: V3; radius: number; zoomFrom?: V3; text: string; source: { title: string; url: string } }
const SRC = {
  whe: { title: 'World History Encyclopedia — Hagia Sophia', url: 'https://www.worldhistory.org/Hagia_Sophia/' },
  brit: { title: 'Britannica — Hagia Sophia: Architecture', url: 'https://www.britannica.com/topic/Hagia-Sophia/Architecture' },
  live: { title: 'Live Science — Hagia Sophia: Facts, History & Architecture', url: 'https://www.livescience.com/27574-hagia-sophia.html' },
  unesco: { title: 'UNESCO — Historic Areas of Istanbul', url: 'https://whc.unesco.org/en/list/356/' },
  deesis: { title: 'hagiasophia.com — Deesis Mosaic', url: 'https://www.hagiasophia.com/hagia-sophia-mosaics' },
  comn: { title: 'hagiasophia.com — Comnenus Mosaic', url: 'https://www.hagiasophia.com/comnenus' },
  utah: { title: 'University of Utah, Marriott Library — South gallery imperial portrait mosaics', url: 'https://collections.lib.utah.edu/ark:/87278/s62n8fht' },
};
export const MIHRAB: V3 = [34.6, 0, 1.6];
export const MINBAR: V3 = [26.5, 0, 8];
export const APSE = { half: 0.37, r: R * Math.sin(0.37), cx: R + R * Math.cos(0.37), springY: ARCH_Y - R * Math.sin(0.37) } as const;
export const POIS: Poi[] = [
  { id: 'imparator-kapisi', kind: 'mimari', rail: 'zemin', name: 'İmparator Kapısı', era: 'Bizans · 6. yüzyıl', pos: [-31.5, 4.2, 0], radius: 2.6,
    text: 'Narteksten ana mekâna açılan orta kapı yalnızca imparatora ayrılmıştı. Karanlık narteksten buradan geçen göz, kubbenin altındaki ışıkla bir an kamaşır.', source: SRC.whe },
  { id: 'kubbe', kind: 'mimari', rail: 'zemin', name: 'Ana kubbe', era: 'Bizans · 537 / 562', pos: [0, RING_Y + 6, 0], radius: 9, zoomFrom: [0, 1.7, 0.01],
    text: 'Kubbenin tepesi zeminden yaklaşık 55 metre yüksekte; çapı kaynaklara göre 31–32 metre. Eteğindeki 40 pencere, kubbeyi ışıkta yüzüyormuş gibi gösterir. 537’de tamamlanan ilk kubbe çökünce 562’de daha dik biçimde yeniden yapıldı.', source: SRC.brit },
  { id: 'pandantif', kind: 'mimari', rail: 'zemin', name: 'Pandantifler', era: 'Bizans · 6. yüzyıl', pos: [10.5, 33, -10.5], radius: 4.5,
    text: 'Yuvarlak kubbeyi kare mekâna oturtan dört küresel üçgen. Bu ölçekte ilk kez burada kullanıldı; kubbenin yükü dört büyük ayağa buradan aktarılır.', source: SRC.brit },
  { id: 'yesil-sutun', kind: 'sutun', rail: 'zemin', name: 'Yeşil Tesalya sütunları', era: 'Bizans · 6. yüzyıl', pos: [-3.1, 4.5, R], radius: 1.6,
    text: 'Nefin iki yanındaki arkadları yeşil damarlı Tesalya mermerinden (verd antique) sütunlar taşır. Sütunlar ve mermerler imparatorluğun dört bir yanından getirildi.', source: SRC.live },
  { id: 'porfir', kind: 'sutun', rail: 'zemin', name: 'Porfir sütunlar', era: 'Bizans · 6. yüzyıl', pos: [R + Math.cos(0.62) * R * 0.98, 4.5, -Math.sin(0.62) * R * 0.98], radius: 1.7,
    text: 'Köşelerdeki yarım daire nişlerde (eksedra) koyu mor porfir sütunlar durur. Porfir, Mısır’dan çıkarılan ve imparatorlukla özdeşleşen bir taştı.', source: SRC.whe },
  { id: 'omphalion', kind: 'mimari', rail: 'zemin', name: 'Omphalion', era: 'Bizans', pos: [9, 0.05, 8.5], radius: 2.6, zoomFrom: [7.5, 1.7, 3.5],
    text: 'Zemindeki renkli mermer dairelerden oluşan bu kare, Bizans imparatorlarının taç giyme törenlerinde durduğu yer olarak kabul edilir.', source: SRC.whe },
  { id: 'hat-levha', kind: 'osmanli', rail: 'zemin', name: 'Hat levhaları', era: 'Osmanlı · 19. yüzyıl', pos: [R - 0.9, 21.5, -(R - 0.9)], radius: 4,
    text: 'Galeri hizasına asılı sekiz dev yuvarlak levha 19. yüzyılda eklendi. Levhalar bu modelde yalnızca yerleri ve boyutlarıyla gösterilir; üzerlerindeki hat yazısı yeniden üretilmemiştir.', source: SRC.unesco },
  { id: 'apsis-mozaigi', kind: 'mozaik', rail: 'zemin', name: 'Apsis mozaiği: Meryem ve Çocuk İsa', era: 'Bizans · 9. yüzyıl', pos: [34.4, 23, 0], radius: 3.6,
    text: 'Apsis yarım kubbesindeki mozaik, zeminden yaklaşık 30 metre yüksektedir ve figür yaklaşık 4 metre boyundadır. Altın zemin, pencerelerden gelen ışıkla gün boyunca farklı parlar.', source: SRC.live },
  { id: 'mihrap', kind: 'osmanli', rail: 'zemin', name: 'Mihrap', era: 'Osmanlı', pos: [MIHRAB[0] - 0.6, 3, MIHRAB[2]], radius: 2.6,
    text: 'Mihrap apsisin tam ortasında değil, biraz güneye kaydırılmıştır: Bizans yapısının ekseni güneydoğuya, kıble ise Mekke’ye bakar. Aradaki bu küçük açı, iki dönemin aynı mekânda nasıl buluştuğunu gösterir.', source: SRC.unesco },
  { id: 'minber', kind: 'osmanli', rail: 'zemin', name: 'Minber', era: 'Osmanlı', pos: [26.5, 5, 8], radius: 2.6,
    text: 'Mihrabın sağındaki mermer minber Osmanlı döneminde eklendi. Yüksek ve dar gövdesi, Bizans apsisine yaslanmadan kıbleye doğru çevrilidir.', source: SRC.unesco },
  { id: 'deisis', kind: 'mozaik', rail: 'galeri', name: 'Deisis mozaiği', era: 'Bizans · büyük olasılıkla 1261 sonrası', pos: [-14, GALLERY_Y + 2.7, 29.8], radius: 3,
    text: 'Ortada İsa, iki yanında Meryem ve Vaftizci Yahya. Güney galerideki bu pano 1933’te ortaya çıkarıldı. Çoğu uzmana göre 1261’den sonra yapıldı; tarihlemesi tartışmalıdır. Panonun alt bölümü günümüze ulaşmamıştır.', source: SRC.deesis },
  { id: 'zoe', kind: 'mozaik', rail: 'galeri', name: 'İmparatoriçe Zoe mozaiği', era: 'Bizans · 11. yüzyıl', pos: [30.8, GALLERY_Y + 2.7, 19.5], radius: 2.6,
    text: 'İsa, IX. Konstantinos Monomakhos ile İmparatoriçe Zoe arasında. Pano ilk yapıldığında büyük olasılıkla Zoe’nin ilk eşini gösteriyordu; imparatorun yüzü sonradan değiştirildi.', source: SRC.utah },
  { id: 'komnenos', kind: 'mozaik', rail: 'galeri', name: 'Komnenos mozaiği', era: 'Bizans · yaklaşık 1118–1134', pos: [30.8, GALLERY_Y + 2.7, 25.5], radius: 2.6,
    text: 'Meryem ve Çocuk İsa, II. İoannes Komnenos ile İmparatoriçe Eirene arasında; yan duvarda oğulları Aleksios. Zoe panosunun hemen yanındadır.', source: SRC.comn },
];

/** Nişangâh: ışın–küre testi (kameradan ileri) */
export function lookingAt(eye: V3, dir: V3, rail: Rail['id'], maxDist = 60): Poi | null {
  let best: Poi | null = null, bd = Infinity;
  for (const p of POIS) {
    if (p.rail !== rail) continue;
    const o: V3 = [p.pos[0] - eye[0], p.pos[1] - eye[1], p.pos[2] - eye[2]], t = o[0] * dir[0] + o[1] * dir[1] + o[2] * dir[2];
    if (t < 0 || t > maxDist) continue;
    const d2 = o[0] * o[0] + o[1] * o[1] + o[2] * o[2] - t * t;
    if (d2 < p.radius * p.radius && t < bd) { bd = t; best = p; }
  }
  return best;
}
/** İnceleme bakış noktası: verilmişse o; yoksa hedefe doğru, mesafenin %55'i kadar yaklaşmış göz */
export function inspectEye(p: Poi, eye: V3): V3 {
  if (p.zoomFrom) return p.zoomFrom;
  const k = p.pos[1] > 18 ? 0 : 0.55;   // yüksekteki hedeflere yürünmez: yerinden, yalnızca görüş açısı daralır
  return [eye[0] + (p.pos[0] - eye[0]) * k, eye[1], eye[2] + (p.pos[2] - eye[2]) * k];
}
/** Hedef ne kadar uzaksa görüş açısı o kadar daralır (dürbün etkisi) */
export const inspectFov = (dist: number, radius: number) => Math.max(9, Math.min(42, (2 * Math.atan((radius * 1.25) / Math.max(1, dist)) * 180) / Math.PI));
