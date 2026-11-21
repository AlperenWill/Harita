/**
 * Anıtkabir iç mekânları — Şeref Holü (v2) ve Atatürk ve Kurtuluş Savaşı Müzesi. Saf veri (three.js'siz, test edilir).
 *
 * Kaynaklardan alınanlar (ayrıntı ve bağlantılar: docs/ANITKABIR-IC.md):
 *  - Şeref Holü'nün iki yanında dikdörtgen planlı, mermer zeminli, DOKUZAR ÇAPRAZ TONOZLA örtülü galeriler vardır.
 *  - Girişte eşiklerin ardından siyah mermerle çevrili enine kırmızı mermer dikdörtgenler ÜÇ GİRİŞİ işaretler.
 *  - Zemin kırmızı ağırlıklı, Türk halı/kilim motifli (koç boynuzu, "yaba") mermer döşemedir.
 *  - Yan duvarlar kaplan postu (beyaz) ve yeşil mermerle kaplıdır; tavan 27 kirişli, 16. yüzyıl motifli mozaiktir.
 *  - Yan duvarlarda altışar, toplam 12 bronz meşale vardır.
 *  - Girişin tam karşısında, büyük pencerenin bulunduğu nişte tek parça (40 t) kırmızı mermer sembolik lahit durur; niş beyaz Afyon
 *    mermeriyle kaplıdır, pencere Ankara Kalesi'ne bakar.
 *  - Müze Şeref Holü'nün altındadır, girişi Misak-ı Millî Kulesi'ndendir. 1. bölüm Atatürk'ün kişisel eşyaları; 2. bölüm üç panorama
 *    (Çanakkale 6×40 m, Sakarya 7×30 m, Büyük Taarruz 7×30 m); 3. bölüm panoramaları çevreleyen koridordaki 18 tonozda Millî Mücadele
 *    ve inkılaplar; 4. bölüm Atatürk'ün kitapları.
 * YAKLAŞIK olanlar: hol içi ölçüler yayımlanmamıştır; galeri/hol genişlikleri, niş ölçüsü ve müze plan düzeni dış ölçülerden (57,35 × 41,65 m,
 * 44 sütun) türetilmiş temsilî değerlerdir. Panoramaların resimleri ve maketleri canlandırmadır; sergi nesneleri temsilîdir.
 */
import { MAUSOLEUM, PODIUM_H, buildings, towers, walkColliders, type Rect, type V3 } from './layout';

const LEN = MAUSOLEUM.len, WID = MAUSOLEUM.wid;
const FRONT_X = MAUSOLEUM.x - LEN / 2, BACK_X = MAUSOLEUM.x + LEN / 2;
/** Sütun merkezlerinin yan hattı */
export const COL_Z = WID / 2 - 1;

/* ===================== Şeref Holü ===================== */
export const HALL = {
  /** ön duvarın dış yüzü (önünde 5 m derin revak) */
  front: FRONT_X + 5,
  x0: FRONT_X + 5 + 1.2,
  /** arka duvar arka sütun hattında; iç yüz */
  x1: BACK_X - 1 - 0.6,
  /** yan duvar (sütun araları pencereli) iç yüzü */
  halfW: COL_Z - 0.3,
  /** orta hol yarı genişliği ve paye sırası */
  nave: 8, pierZ: 8.6, pier: 1.2, bays: 9,
  floorY: PODIUM_H, ceilY: PODIUM_H + 14.2, galleryY: PODIUM_H + 7, vaultRise: 2.4,
  wall: 1.2,
  door: { w: 5, h: 8 }, sideDoor: { w: 3, h: 6, z: 14.4 },
  niche: { depth: 6.5, halfW: 5.5, h: 12 },
  window: { halfW: 4, y0: 0.8, y1: 11.8 },
  beams: 27,
} as const;
export const SARCOPHAGUS: V3 = [HALL.x1 - 3.4, PODIUM_H, 0];
/** 40 t ≈ 14,8 m³ kırmızı mermer (yoğunluk ~2,7 t/m³): 1,6 × 1,45 × 6,4 m (x, y, z) — ölçü yaklaşıktır */
export const SARC_SIZE: V3 = [1.6, 1.45, 6.4];
/** Paye sıraları: her yanda 10 paye, aralarında 9 galeri bölmesi (çapraz tonoz) */
export const pierXs = () => Array.from({ length: HALL.bays + 1 }, (_, i) => HALL.x0 + (i * (HALL.x1 - HALL.x0)) / HALL.bays);
/** 12 meşale: payelerin ortaya bakan yüzünde, her yanda 6 */
export const torchPositions = (): V3[] => { const xs = pierXs().slice(2, 8), out: V3[] = []; for (const x of xs) for (const s of [-1, 1]) out.push([x, HALL.floorY + 3.4, s * (HALL.pierZ - HALL.pier / 2 - 0.15)]); return out; };

/** Hol duvar çarpışmaları (dikdörtgenler) */
export function hallColliders(): Rect[] {
  const out: Rect[] = [], { front, x0, x1, halfW, pierZ, pier, door, sideDoor, niche } = HALL, hz = COL_Z;
  // ön duvar: ortada büyük kapı, iki yanda galerilere açılan kapılar
  const dz = [[-hz, -sideDoor.z - sideDoor.w / 2], [-sideDoor.z + sideDoor.w / 2, -door.w / 2], [door.w / 2, sideDoor.z - sideDoor.w / 2], [sideDoor.z + sideDoor.w / 2, hz]];
  for (const [a, b] of dz) out.push([front, a, x0, b]);
  for (const s of [-1, 1]) out.push([front, s > 0 ? halfW : -hz - 0.3, x1 + 1.2, s > 0 ? hz + 0.3 : -halfW]);   // yan pencere duvarları
  out.push([x1, -hz, x1 + 1.2, hz]);                                                                       // arka duvar
  for (const x of pierXs().slice(1, -1)) for (const s of [-1, 1]) out.push([x - pier / 2, s * pierZ - pier / 2, x + pier / 2, s * pierZ + pier / 2]);
  for (const s of [-1, 1]) out.push([x1 - niche.depth, s * niche.halfW - 0.3, x1, s * niche.halfW + 0.3]);  // niş yan duvarları
  out.push([SARCOPHAGUS[0] - 1.9, -4.4, SARCOPHAGUS[0] + 1.9, 4.4]);                                        // lahit ve basamakları
  return out;
}

/** Dış alanın bütün çarpışmaları: meydan, kuleler, sütunlar + hol */
export const allColliders = (): Rect[] => [...walkColliders(), ...hallColliders()];

/* ===================== Müze ===================== */
export type Level = 'out' | 'muze1' | 'muze2';
/** 1. bölüm: Misak-ı Millî Kulesi'nin yanındaki galerili yapının içi */
const B1 = buildings().find((b) => b.name === 'yakin-sag')!;
export const MUSE1 = { x0: B1.pos[0] - B1.size[0] / 2 + 0.6, x1: B1.pos[0] + B1.size[0] / 2 - 0.6, z0: B1.pos[2] - B1.size[2] / 2 + 0.6, z1: B1.pos[2] + B1.size[2] / 2 - 0.6, y: 0, h: 7.2 };
/** 2.–4. bölüm: Şeref Holü'nün altında, kaide (72 × 52 m) içinde; zemin meydanın 0,9 m altında */
const P = MAUSOLEUM.podium;
export const MUSE2 = { x0: P.x0 + 1, x1: P.x1 - 1, z0: -P.halfW + 1, z1: P.halfW - 1, y: -0.9, h: 7.2, ring: 5 };
/** İç bölüm (panoramalar ve kitaplık): halka koridorun içi */
export const INNER = { x0: MUSE2.x0 + MUSE2.ring, x1: MUSE2.x1 - MUSE2.ring, z0: MUSE2.z0 + MUSE2.ring, z1: MUSE2.z1 - MUSE2.ring };

export interface Panorama { id: string; title: string; w: number; h: number; c: [number, number]; r: number; theta: number; text: string }
/** Üç panorama: resim yay biçiminde (yay uzunluğu = resmin genişliği), ziyaretçi merkezdeki seyir alanından bakar; önde maket */
export const PANORAMAS: Panorama[] = (() => {
  const mk = (id: string, title: string, w: number, h: number, c: [number, number], r: number, facing: number, text: string): Panorama => ({ id, title, w, h, c, r, theta: facing, text });
  return [
    mk('canakkale', 'Çanakkale Kara ve Deniz Muharebeleri', 40, 6, [INNER.x0 + 14, 0], 13, -Math.PI / 2,
      'Panoramanın ölçüsü 6 × 40 m’dir. 1915 Çanakkale Muharebeleri’nin kara ve deniz cephelerini anlatır. Önündeki maket alanı resmi üç boyutlu gösterir. (Bu sahnedeki resim bir canlandırmadır.)'),
    mk('sakarya', 'Sakarya Meydan Muharebesi', 30, 7, [INNER.x0 + 33, -9], 11, Math.PI,
      'Panoramanın ölçüsü 7 × 30 m’dir. 1921 Sakarya Meydan Muharebesi’ni anlatır. (Bu sahnedeki resim bir canlandırmadır.)'),
    mk('taarruz', 'Büyük Taarruz ve Başkomutan Meydan Muharebesi', 30, 7, [INNER.x0 + 33, 9], 11, 0,
      'Panoramanın ölçüsü 7 × 30 m’dir. 1922 Büyük Taarruz ve Başkomutan Meydan Muharebesi’ni anlatır. (Bu sahnedeki resim bir canlandırmadır.)'),
  ];
})();
/** Panoramanın yay açısı (rad): yay uzunluğu / yarıçap */
export const arcOf = (p: Panorama) => p.w / p.r;
/** 4. bölüm: kitaplık odası (iç bölümün arka ucunda) */
export const LIBRARY = { x0: INNER.x1 - 11, x1: INNER.x1, z0: -12, z1: 12 };

/** 18 tonoz: halka koridorun bölmeleri (ön 4, arka 4, yanlar 5'er) */
export interface Vault { i: number; c: [number, number]; w: number; d: number; wallSide: '-x' | '+x' | '-z' | '+z'; title: string }
const VAULT_TITLES = [
  'Mondros ve işgaller', 'Samsun’a çıkış (19 Mayıs 1919)', 'Amasya Genelgesi', 'Erzurum ve Sivas kongreleri',
  'TBMM’nin açılışı (23 Nisan 1920)', 'Doğu ve Güney cepheleri', 'İnönü muharebeleri', 'Sakarya’dan Büyük Taarruz’a',
  'Mudanya ve Lozan', 'Cumhuriyet’in ilanı (29 Ekim 1923)', 'Halifeliğin kaldırılması', 'Hukuk ve medenî kanun',
  'Harf inkılabı', 'Eğitim ve kültür', 'Kadın hakları', 'Ekonomi ve sanayi', 'Soyadı kanunu', 'Dış politika: “Yurtta sulh, cihanda sulh”',
];
export const VAULTS: Vault[] = (() => {
  const out: Vault[] = [], R = MUSE2.ring, { x0, x1, z0, z1 } = MUSE2;
  const push = (c: [number, number], w: number, d: number, wallSide: Vault['wallSide']) => out.push({ i: out.length, c, w, d, wallSide, title: VAULT_TITLES[out.length] });
  // yürüyüş sırası: ön koridor (girişten sağa) → sağ yan → arka → sol yan
  for (let k = 0; k < 4; k++) { const w = (z1 - z0) / 4; push([x0 + R / 2, z0 + w * (k + 0.5)], R, w, '-x'); }
  for (let k = 0; k < 5; k++) { const w = (INNER.x1 - INNER.x0) / 5; push([INNER.x0 + w * (k + 0.5), z1 - R / 2], w, R, '+z'); }
  for (let k = 3; k >= 0; k--) { const w = (z1 - z0) / 4; push([x1 - R / 2, z0 + w * (k + 0.5)], R, w, '+x'); }
  for (let k = 4; k >= 0; k--) { const w = (INNER.x1 - INNER.x0) / 5; push([INNER.x0 + w * (k + 0.5), z0 + R / 2], w, R, '-z'); }
  return out;
})();

/** 1. bölüm vitrinleri (nesneler temsilîdir) */
export interface Showcase { id: string; title: string; text: string; at: [number, number]; size: V3; kind: 'kiyafet' | 'esya' | 'fox' | 'hediye' | 'baston' | 'sofra' }
export const SHOWCASES: Showcase[] = (() => {
  const { x0, x1, z0, z1 } = MUSE1, n = 6, step = (x1 - x0 - 8) / (n - 1), out: Showcase[] = [];
  const items: Omit<Showcase, 'at' | 'size'>[] = [
    { id: 'kiyafet', kind: 'kiyafet', title: 'Kıyafetleri', text: 'Atatürk’ün sivil ve resmî kıyafetleri bu bölümde sergilenir. (Vitrindeki nesneler temsilîdir.)' },
    { id: 'esya', kind: 'esya', title: 'Kişisel eşyaları', text: 'Günlük kullandığı kişisel eşyaları: kalem, saat, dürbün gibi nesneler. (Temsilî)' },
    { id: 'baston', kind: 'baston', title: 'Bastonları', text: 'Atatürk’ün kullandığı bastonlardan bazıları. (Temsilî)' },
    { id: 'fox', kind: 'fox', title: 'Köpeği Fox', text: 'Atatürk’ün köpeği Fox, tahnit edilmiş olarak müzede sergilenir. (Model temsilîdir.)' },
    { id: 'hediye', kind: 'hediye', title: 'Kendisine verilen hediyeler', text: 'Yurt içinden ve dışından Atatürk’e sunulan hediyelerden örnekler. (Temsilî)' },
    { id: 'sofra', kind: 'sofra', title: 'Sofra ve yazı takımları', text: 'Kullandığı sofra ve yazı takımlarından örnekler. (Temsilî)' },
  ];
  items.forEach((it, i) => out.push({ ...it, at: [x0 + 4 + i * step, i % 2 ? z1 - 1.6 : z0 + 1.6], size: [3.2, 2.2, 1.4] }));
  return out;
})();

/* ---------- kapılar (E ile geçilir) ---------- */
export interface Door { id: string; label: string; level: Level; at: [number, number]; to: { level: Level; x: number; z: number; yaw: number } }
const MM = towers().find((t) => t.name === 'Misak-ı Millî')!;
export const DOORS: Door[] = [
  { id: 'muze-giris', label: 'Müzeye gir (Misak-ı Millî Kulesi)', level: 'out', at: [MM.pos[0], MM.pos[2] - 6.6], to: { level: 'muze1', x: MUSE1.x0 + 2, z: (MUSE1.z0 + MUSE1.z1) / 2, yaw: -Math.PI / 2 } },
  { id: 'muze1-cik', label: 'Müzeden çık', level: 'muze1', at: [MUSE1.x0 + 0.8, (MUSE1.z0 + MUSE1.z1) / 2], to: { level: 'out', x: MM.pos[0], z: MM.pos[2] - 9, yaw: Math.PI } },
  { id: 'muze1-ileri', label: 'Panorama bölümüne geç', level: 'muze1', at: [MUSE1.x1 - 0.8, (MUSE1.z0 + MUSE1.z1) / 2], to: { level: 'muze2', x: MUSE2.x0 + MUSE2.ring / 2, z: -2, yaw: -Math.PI / 2 } },
  { id: 'muze2-geri', label: '1. bölüme dön', level: 'muze2', at: [MUSE2.x0 + 0.8, -5], to: { level: 'muze1', x: MUSE1.x1 - 2, z: (MUSE1.z0 + MUSE1.z1) / 2, yaw: Math.PI / 2 } },
  { id: 'muze2-cik', label: 'Müzeden çık', level: 'muze2', at: [MUSE2.x0 + 0.8, 5], to: { level: 'out', x: MM.pos[0] + 8, z: MM.pos[2] - 10, yaw: Math.PI } },
];
export const DOOR_REACH = 2.2;

/* ---------- seviye: zemin ve çarpışma ---------- */
export const levelFloor = (lv: Level) => (lv === 'muze1' ? MUSE1.y : lv === 'muze2' ? MUSE2.y : null);
/** Müze içinde geçilemeyen yerler: dış duvarlar, iç bölüm duvarları (kapı boşlukları hariç), panorama maketleri, vitrinler */
export function museumBlocked(lv: Level, x: number, z: number, r: number): boolean {
  if (lv === 'muze1') {
    if (x < MUSE1.x0 + r || x > MUSE1.x1 - r || z < MUSE1.z0 + r || z > MUSE1.z1 - r) return true;
    return SHOWCASES.some((s) => Math.abs(x - s.at[0]) < s.size[0] / 2 + r && Math.abs(z - s.at[1]) < s.size[2] / 2 + r);
  }
  if (x < MUSE2.x0 + r || x > MUSE2.x1 - r || z < MUSE2.z0 + r || z > MUSE2.z1 - r) return true;
  // iç bölüm duvarı (kalınlık 0,6): ön, arka ve yanlarda geniş açıklıklar
  const W = 0.3 + r, inX = x > INNER.x0 - W && x < INNER.x1 + W, inZ = z > INNER.z0 - W && z < INNER.z1 + W;
  if (inX && inZ) {
    const nearFront = Math.abs(x - INNER.x0) < W, nearBack = Math.abs(x - INNER.x1) < W, nearSide = Math.abs(Math.abs(z) - INNER.z1) < W;
    if (nearFront && Math.abs(z) > 4) return true;
    if (nearBack && Math.abs(z) > 3) return true;
    if (nearSide) { const mid = (INNER.x0 + INNER.x1) / 2; if (Math.abs(x - mid) > 4) return true; }
  }
  // panorama maketleri: yayın önündeki 4,5 m'lik şerit
  for (const p of PANORAMAS) { const dx = x - p.c[0], dz = z - p.c[1], d = Math.hypot(dx, dz), a = Math.atan2(dx, dz); let da = a - p.theta; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < arcOf(p) / 2 + 0.05 && d > p.r - 4.5 - r && d < p.r + 0.6) return true; }
  // kitaplık duvarları (ön tarafta kapı)
  const L = LIBRARY, wall = 0.3 + r;
  if (x > L.x0 - wall && x < L.x1 && z > L.z0 - wall && z < L.z1 + wall) {
    if (Math.abs(z - L.z0) < wall || Math.abs(z - L.z1) < wall) return true;
    if (Math.abs(x - L.x0) < wall && Math.abs(z) > 2) return true;
    if (x > L.x1 - 2.2 - r || (Math.abs(z) > L.z1 - 1.4 - r && x > L.x0 + 0.5)) return true;   // raflar
  }
  return false;
}

/* ---------- incelenebilir noktalar ---------- */
export interface Exhibit { id: string; level: Level; at: V3; reach: number; title: string; kicker: string; text: string; source?: { title: string; url: string } }
const SRC_HALL = { title: 'Kültür ve Turizm Bakanlığı — Anıtkabir', url: 'https://www.ktb.gov.tr/TR-96392/anitkabir.html' };
const SRC_MUSE = { title: 'Kültür Portalı — Atatürk ve Kurtuluş Savaşı Müzesi', url: 'https://www.kulturportali.gov.tr/turkiye/ankara/gezilecekyer/anitkabr-ataturk-ve-kurtulus-savasi-muzes' };
export const EXHIBITS: Exhibit[] = [
  { id: 'lahit', level: 'out', at: [SARCOPHAGUS[0], PODIUM_H + 1.5, 0], reach: 7, kicker: 'Şeref Holü', title: 'Sembolik lahit', source: SRC_HALL,
    text: 'Tek parça kırmızı mermerden yapılmış, yaklaşık 40 ton ağırlığındaki sembolik lahit, büyük pencerenin bulunduğu nişte durur. Taş Osmaniye’den getirilmiştir. Atatürk’ün naaşı lahdin tam altındaki, sekizgen planlı mezar odasındadır.' },
  { id: 'pencere', level: 'out', at: [HALL.x1 - 1, PODIUM_H + 6, 0], reach: 5, kicker: 'Şeref Holü', title: 'Ankara Kalesi’ne bakan pencere', source: SRC_HALL,
    text: 'Lahdin arkasındaki büyük pencere Ankara Kalesi’ne bakar. Niş beyaz Afyon mermeriyle kaplıdır; pencerenin önünde bronz parmaklık vardır.' },
  { id: 'zemin', level: 'out', at: [HALL.x0 + 4, PODIUM_H + 0.2, 0], reach: 4, kicker: 'Şeref Holü', title: 'Kilim desenli mermer zemin', source: SRC_HALL,
    text: 'Kırmızı ağırlıklı zemin, Türk halı ve kilimlerinden alınan koç boynuzu ve “yaba” motifleriyle halı izlenimi verir. Girişte siyah mermerle çevrili kırmızı mermer dikdörtgenler üç girişi işaretler.' },
  { id: 'tavan', level: 'out', at: [(HALL.x0 + HALL.x1) / 2, PODIUM_H + 2, 0], reach: 5, kicker: 'Şeref Holü', title: 'Mozaik tavan ve meşaleler', source: SRC_HALL,
    text: '27 kirişli tavan ve galeri tavanları 16. yüzyıl halı ve kilim desenli mozaiklerle bezelidir. Yan duvarlarda altışar, toplam 12 bronz meşale vardır.' },
  { id: 'galeri', level: 'out', at: [(HALL.x0 + HALL.x1) / 2, PODIUM_H + 1, 14], reach: 6, kicker: 'Şeref Holü', title: 'Yan galeriler', source: SRC_HALL,
    text: 'Holün iki yanında dikdörtgen planlı, mermer zeminli ve dokuzar çapraz tonozla örtülü galeriler vardır; bölmeler siyah mermer şeritlerle ayrılır.' },
  ...PANORAMAS.map((p): Exhibit => ({ id: 'pano-' + p.id, level: 'muze2', at: [p.c[0] + Math.sin(p.theta) * 2, 1, p.c[1] + Math.cos(p.theta) * 2], reach: 4.5, kicker: `Müze · 2. bölüm · ${p.h} × ${p.w} m`, title: p.title, text: p.text, source: SRC_MUSE })),
  ...VAULTS.map((v): Exhibit => ({ id: 'tonoz-' + v.i, level: 'muze2', at: [v.c[0], 1, v.c[1]], reach: 2.6, kicker: `Müze · 3. bölüm · ${v.i + 1}. tonoz`, title: v.title,
    text: 'Panorama bölümünü çevreleyen koridorun 18 tonozunda Millî Mücadele ve inkılaplar konu konu anlatılır. (Bu sahnedeki pano başlıkları ve sırası temsilîdir.)', source: SRC_MUSE })),
  { id: 'kitaplik', level: 'muze2', at: [(LIBRARY.x0 + LIBRARY.x1) / 2, 1, 0], reach: 4, kicker: 'Müze · 4. bölüm', title: 'Atatürk’ün kitapları', source: SRC_MUSE,
    text: 'Müzenin dördüncü bölümünde Atatürk’ün okuduğu kitaplardan bir bölümü sergilenir. (Raflar temsilîdir.)' },
  ...SHOWCASES.map((s): Exhibit => ({ id: 'vitrin-' + s.id, level: 'muze1', at: [s.at[0], 1, s.at[1]], reach: 3, kicker: 'Müze · 1. bölüm', title: s.title, text: s.text, source: SRC_MUSE })),
];
/** En yakın kapı ya da incelenebilir nokta */
export function nearestInteract(lv: Level, x: number, z: number): { kind: 'door'; door: Door } | { kind: 'exhibit'; ex: Exhibit } | null {
  for (const d of DOORS) if (d.level === lv && Math.hypot(d.at[0] - x, d.at[1] - z) < DOOR_REACH) return { kind: 'door', door: d };
  let best: Exhibit | null = null, bd = Infinity;
  for (const e of EXHIBITS) { if (e.level !== lv) continue; const d = Math.hypot(e.at[0] - x, e.at[2] - z); if (d < e.reach && d < bd) { bd = d; best = e; } }
  return best ? { kind: 'exhibit', ex: best } : null;
}
