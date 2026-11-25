/**
 * Düzce — Prusias ad Hypium (Konuralp): "Kazı Sezonu" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Orkestranın merkezi (0,0). Oturma alanı (cavea) kuzeyde yamaca yaslanan yarım daire: iki ara geçitle
 * (diazoma) üç bölüm; yan uçlarda yamaçtan yükselen dış duvar ve altında tonozlu galeriler. Güneyde sahne (pulpitum) ve sahne binası.
 * Mekanik: beş kazı açmasında toprağı katman katman kaldırıp (E) buluntuyu ortaya çıkarmak. Ölçüler, açmaların yeri ve buluntuların
 * konumu TEMSİLÎDİR.
 */
export type V2 = [number, number];
export type Rect = [number, number, number, number];
export const BOUNDS = { x0: -75, x1: 75, z0: -75, z1: 50 };
export const TH = { r0: 11.5, r1: 46, k: 0.6, dia: [[24, 25.6], [35, 36.6]] as [number, number][] };
/** Oturma alanında yükseklik: sıralar boyunca eğim, ara geçitlerde düz */
export function seatY(r: number): number {
  let y = 0, p = TH.r0; const R = Math.min(r, TH.r1);
  for (const [a, b] of TH.dia) { if (R <= a) break; y += (Math.min(R, a) - p) * TH.k; p = Math.min(R, b); }
  if (R > p) y += (R - p) * TH.k;
  return Math.max(0, y);
}
export const SEAT_TOP = seatY(TH.r1);
export const inCavea = (x: number, z: number) => { const r = Math.hypot(x, z); return z < 0.3 && r >= TH.r0 && r <= TH.r1; };
/** Yamaç: kuzeye doğru yükselir, caveanın tepesinde düzleşir (üst teras) */
export const hill = (_x: number, z: number) => SEAT_TOP * Math.max(0, Math.min(1, -z / 30));
export function groundY(x: number, z: number): number {
  if (inCavea(x, z)) return seatY(Math.hypot(x, z));
  if (z < 0.3 && Math.hypot(x, z) < TH.r0) return 0;
  return hill(x, z);
}
export const PULPITUM: Rect = [-20, 3, 20, 5];
export const SKENE: Rect = [-26, 5, 26, 12];
export const CHAPEL: Rect = [-22, -62, -15, -57];
const RECTS = [PULPITUM, SKENE, CHAPEL];
export function walkable(x: number, z: number): boolean {
  const p = 0.4;
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (z > -0.3 - p && z < 0.6 + p && Math.abs(x) > TH.r0 - p && Math.abs(x) < TH.r1 + 2.2 + p) return false;   // istinat duvarları
  return !RECTS.some((r) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p);
}
/** Basamak sınırı: duvar ve uçurum kenarından inilmez/çıkılmaz */
export const STEP = 0.6;
const ok = (x0: number, z0: number, x1: number, z1: number) => walkable(x1, z1) && Math.abs(groundY(x1, z1) - groundY(x0, z0)) < STEP;
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (ok(x, z, x + dx, z)) x += dx; if (ok(x, z, x, z + dz)) z += dz; return [x, z]; }

/* ===================== kaynaklar ===================== */
export interface Source { title: string; url: string }
export const SRC = {
  hdn: { title: 'Hürriyet Daily News — Excavations in Prusias ad Hypium reveal 10,000-seat theater', url: 'https://hurriyetdailynews.com/excavations-in-prusias-ad-hypium-reveal-10-000-seat-theater-201828' },
  bilet: { title: 'Cumhuriyet — Düzce\'de 2 bin yıllık "tiyatro bileti" bulundu', url: 'https://www.cumhuriyet.com.tr/yasam/duzcede-kazi-ekibini-sasirtan-olay-2-bin-yillik-tiyatro-bileti-2274650' },
  apollon: { title: 'Arkeofili — Düzce\'deki antik tiyatroda Apollon heykeli bulundu', url: 'https://arkeofili.substack.com/p/duzcedeki-antik-tiyatroda-apollon' },
  aydin: { title: 'Aydınlık — Batı Karadeniz\'in görkemli geçmişe sahip antik kenti', url: 'https://www.aydinlik.com.tr/fotogaleri/bati-karadenizin-gorkemli-gecmise-sahip-antik-kenti-prusias-ad-hypium-antik-kent-arkeoloji-haberleri-prusias-ad-hypium-antik-kenti-nerede-kazi-calismasi-339181' },
  milliyet: { title: 'Milliyet — Kazmayı vurdukça tarih fışkırdı', url: 'https://www.milliyet.com.tr/gundem/kazmayi-vurdukca-tarih-fiskirdi-gizemli-yapilar-tek-tek-ortaya-cikti-ne-oldugunu-zamanla-cozecegiz-7410762' },
  galeri: { title: 'DergiPark — Prusias ad Hypium Tiyatrosu: tonoz örtülü galerilere bakış', url: 'https://dergipark.org.tr/tr/download/article-file/2137036' },
  ekonomim: { title: 'Ekonomim — Batı Karadeniz\'in Efes\'i: Konuralp', url: 'https://www.ekonomim.com/sektorler/turizm/bati-karadenizin-efesi-konuralp-haberi-882597' },
  wiki: { title: 'Wikipedia — Prusias ad Hypium', url: 'https://en.wikipedia.org/wiki/Prusias_ad_Hypium' },
};

/* ===================== kazı açmaları ===================== */
export type FindKind = 'bilet' | 'thyrsus' | 'apollon' | 'maske' | 'mozaik';
export interface Dig { id: FindKind; name: string; kicker: string; at: V2; size: number; text: string; source: Source }
export const LAYERS = 4;
export const DIGS: Dig[] = [
  { id: 'bilet', name: 'Pişmiş toprak tiyatro bileti', kicker: 'Alt cavea', at: [-8, -14], size: 1.6, source: SRC.bilet,
    text: 'Kazılarda pişmiş topraktan yapılmış küçük bir tiyatro bileti bulundu. Müze müdürüne göre yaklaşık 2 bin yıllık ve Erken Roma dönemine ait olabilir. (Bulunduğu yer temsilîdir.)' },
  { id: 'thyrsus', name: 'Thyrsus başı', kicker: 'Orkestra', at: [6, -5], size: 1.6, source: SRC.bilet,
    text: 'Bilet ile birlikte bir Dionysos heykeline ait asa başı (thyrsus) da ortaya çıktı. Thyrsus, şarap ve tiyatro tanrısı Dionysos\'un simgesidir. (Bulunduğu yer temsilîdir.)' },
  { id: 'apollon', name: 'Apollon heykeli', kicker: 'Sahne önü', at: [-12, 1.8], size: 1.8, source: SRC.apollon,
    text: 'Tiyatroda yapılan kazılarda bir Apollon heykeli bulundu. (Heykelin bulunduğu yer ve oyundaki biçimi temsilîdir.)' },
  { id: 'maske', name: 'Maskeli blok', kicker: 'Sahne binası', at: [10, 15], size: 2, source: SRC.aydin,
    text: 'Sahne binasının üst yapısına ait bloklarda tragedya, komedya ve drama maskeleri bulunduğu aktarılır. (Bloğun yeri temsilîdir.)' },
  { id: 'mozaik', name: 'Aslanlı mozaik', kicker: 'Üst portiko', at: [12, -52], size: 3, source: SRC.aydin,
    text: 'Tiyatronun üst kısmındaki, portikoya bağlı bir yapıda aslan figürlü bir mozaik bulundu. Yetkililer benzerinin Türkiye\'de olmadığını söylüyor. (Mozaiğin deseni temsilîdir.)' },
];
export const nearDig = (x: number, z: number, done: Record<string, number>) => DIGS.findIndex((d) => (done[d.id] ?? 0) < LAYERS && Math.hypot(x - d.at[0], z - d.at[1]) < d.size + 1.6);

/* ===================== duraklar ===================== */
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source }
export const SPOTS: Spot[] = [
  { id: 'ad', name: 'Prusias ad Hypium', kicker: 'Kentin adı', at: [0, 24], reach: 4, source: SRC.ekonomim,
    text: 'Bithynia Kralı I. Prusias\'ın ele geçirdiği kent, "Hypios (Melen) Çayı üzerindeki Prusias" anlamına gelen adı aldı. Bugün Düzce\'nin Konuralp beldesindedir; bazı yazılarda "Batı Karadeniz\'in Efes\'i" diye anılır. (Ele geçirilme tarihi kaynaklarda farklı verilir.)' },
  { id: 'tiyatro', name: 'Roma tiyatrosu', kicker: '10 bin kişilik', at: [0, -3], reach: 3, source: SRC.hdn,
    text: 'Kazı ekibine göre yaklaşık 10 bin kişilik tiyatro; orkestra, sahne binası ve üç bölümlü oturma alanından (cavea) oluşur. (Sıra sayısı ve ölçüler temsilîdir.)' },
  { id: 'galeri', name: 'Tonozlu galeriler', kicker: 'Dış duvar', at: [51, -3], reach: 4, source: SRC.galeri,
    text: 'Oturma alanının yamaca yaslanmayan bölümleri, altlarındaki tonoz örtülü galerilerle taşınır. Bu galeriler tiyatronun yapım evrelerini anlamaya yardım eder. (Galerilerin sayısı ve düzeni temsilîdir.)' },
  { id: 'sapel', name: 'Şapel', kicker: 'Kuzey yamaç', at: [-12, -58], reach: 4, source: SRC.milliyet,
    text: 'Tiyatronun kuzey yamacında Hristiyanların ibadet için kullandığı küçük bir yapı bulundu; kazı ekibi doğuya bakan bir apsisi olan bir şapel olduğunu düşünüyor. (Yapının biçimi temsilîdir.)' },
];
export const CARD_ALL = { id: 'sezon', name: 'Kazı sezonu bitti', kicker: 'Beş buluntu',
  text: 'Beş açmadaki buluntuları ortaya çıkardın. Kazı ekibi tiyatro kazısının büyük bölümünü bitirdiğini, şimdi çevre alanlarda çalıştığını söylüyor. Tiyatronun bir kısmı hâlâ köy evlerinin altında. (Açmalar ve kazı yöntemi temsilîdir.)', source: SRC.milliyet };
export const START: { at: V2; yaw: number } = { at: [0, 34], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
