/**
 * Erzurum — Çifte Minareli Medrese ve Hatuniye Türbesi: "Kitabesiz Kapı" (detaylı). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Medrese 35 × 48 m: kuzeyde taç kapı ve iki yanında payandalar üstünde oluklu minareler; içeride açık avlu,
 * iki katlı revaklar, dört eyvan; güney eyvanın ardında Hatuniye Türbesi. Doğuda Ulu Camii, batıda kale. Ölçüler dışındaki düzen TEMSİLÎDİR.
 *
 * Mekanik: "Kitabesiz kapı" — medreseyi kimin, ne zaman yaptırdığı kaynaklarda farklı anlatılır. Üç ipucunu bul (kapının boş kitabe
 * yuvası, yarım kalmış taş işleri, türbe), sonra "Hangi bilgi neye dayanıyor?" panosunda her iddiayı dayanağıyla eşleştir.
 */
export type V2 = [number, number];
export const MED = { x0: -17.5, x1: 17.5, z0: -24, z1: 24, h: 9, t: 2.2 };
export const COURT = { x0: -9, x1: 9, z0: -14, z1: 13 };
/** Revak: avlunun uzun kenarlarında, iki katlı (alt kat yürünür) */
export const ARCADE = 3.2;
export const PORTAL = { w: 3.4, h: 6.2, frameW: 11, frameH: 14, depth: 1.6 };
export const MINARETS: V2[] = [[-8.2, -25.2], [8.2, -25.2]];
export const TURBE = { x: 0, z: 30, r: 5.2 };
export const ULU = { x0: 22, x1: 60, z0: -26, z1: 18 };
export const BOUNDS = { x0: -45, x1: 70, z0: -60, z1: 50 };
const inMed = (x: number, z: number, m: number) => x > MED.x0 - m && x < MED.x1 + m && z > MED.z0 - m && z < MED.z1 + m;

/* ===================== yürüyüş ===================== */
/** İçeride yürünen yerler: giriş koridoru (kuzey eyvan), avlu, revaklar, doğu-batı eyvanları, güney eyvan ve türbe kapısı */
function insideWalk(x: number, z: number): boolean {
  const m = 0.4;
  if (Math.abs(x) < PORTAL.w / 2 - m && z > MED.z0 - PORTAL.depth - 0.6 && z < COURT.z0 + 0.5) return true;   // giriş
  if (x > COURT.x0 - ARCADE + m && x < COURT.x1 + ARCADE - m && z > COURT.z0 + m && z < COURT.z1 - m) return true;   // avlu + revak
  if (Math.abs(z) < 2.6 - m && x > MED.x0 + 3.2 && x < MED.x1 - 3.2) return true;   // yan eyvanlar
  if (Math.abs(x) < 3.6 - m && z > COURT.z1 - 1 && z < MED.z1 + 0.6) return true;   // güney eyvan → türbe
  return false;
}
export function walkable(x: number, z: number): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (Math.hypot(x - TURBE.x, z - TURBE.z) < TURBE.r + 0.4) return Math.hypot(x - TURBE.x, z - TURBE.z) < TURBE.r - 0.7 || (Math.abs(x) < 1.0 && z < TURBE.z);   // türbe içi, kapıdan
  if (inMed(x, z, 0.4)) return insideWalk(x, z);
  if (MINARETS.some(([mx, mz]) => Math.abs(x - mx) < 3.2 && Math.abs(z - mz) < 3.2)) return false;
  if (z < MED.z0 && z > MED.z0 - PORTAL.depth - 0.4 && Math.abs(x) < PORTAL.frameW / 2 && Math.abs(x) > PORTAL.w / 2 - 0.4) return false;   // taç kapı çıkıntısı
  if (x > ULU.x0 - 0.4 && x < ULU.x1 + 0.4 && z > ULU.z0 - 0.4 && z < ULU.z1 + 0.4) return false;
  if (x < -32) return false;   // kale eteği
  return true;
}
export const groundY = (x: number, _z?: number) => (x < -24 ? (-24 - x) * 0.35 : 0);
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; }

/* ===================== ipuçları ve iddialar ===================== */
export interface Source { title: string; url: string }
const SRC = {
  tdv: { title: 'TDV İslâm Ansiklopedisi — Çifte Minareli Medrese (Erzurum)', url: 'https://islamansiklopedisi.org.tr/cifte-minareli-medrese--erzurum' },
  wiki: { title: 'Wikipedia — Çifte Minareli Medrese, Erzurum', url: 'https://en.wikipedia.org/wiki/%C3%87ifte_Minareli_Medrese,_Erzurum' },
  ktb: { title: 'Kültür ve Turizm Bakanlığı — Çifte Minareli Medrese', url: 'https://www.ktb.gov.tr/EN-113797/cifte-minareli-medresse.html' },
  courtauld: { title: 'Courtauld — Crossing Frontiers: Çifte Minare Medrese', url: 'https://sites.courtauld.ac.uk/crossingfrontiers/crossing-frontiers/turkey/erzurum/cifte-minare-medrese/' },
  dp: { title: 'DergiPark — Çifte Minareli Medrese üzerine makale', url: 'https://dergipark.org.tr/en/download/article-file/32389' },
  ntv: { title: 'NTV — Çifte Minareli Medrese, UNESCO Dünya Mirası Geçici Listesi', url: 'https://www.ntv.com.tr/sanat/tarihi-cifte-minareli-medreseye-ilgi-artiyor-unesco-dunya-miras-gecici-listesi,VoPthSuL1kGV17JLm7LcDA' },
  tez: { title: 'YÖK Açık Bilim — Erzurum Çifte Minareli Medrese taş süsleme örnekleri', url: 'https://acikbilim.yok.gov.tr/handle/20.500.12812/367748' },
};
export interface Clue { id: string; name: string; at: V2; mark: [number, number, number]; text: string; source: Source }
export const CLUES: Clue[] = [
  { id: 'kitabe', name: 'Boş kitabe yuvası', at: [0, MED.z0 - 4.5], mark: [0, PORTAL.h + 2.2, MED.z0 - PORTAL.depth - 0.05],
    text: 'Kültür ve Turizm Bakanlığı\'na göre medresenin yapım kitabesi yoktur; bu yüzden gerçek adı ve yapım tarihi bilinmez. Oyunda bu, taç kapının üstündeki boş bir yuvayla gösterildi. (Yuva temsilîdir.)', source: SRC.ktb },
  { id: 'yarim', name: 'Yarım kalmış taş işi', at: [COURT.x1 + 1.2, -7], mark: [COURT.x1 + ARCADE - 0.1, 4.2, -7],
    text: 'Bir akademik çalışmaya göre medrese hiç tamamlanmadı; bu yüzden ne kitabesi ne de vakfiyesi bulunur. Oyunda bu görüş, bezemesi yarım bırakılmış bir taş panoyla gösterildi. (Pano temsilîdir.)', source: SRC.dp },
  { id: 'turbe', name: 'Hatuniye Türbesi', at: [0, TURBE.z - 2.5], mark: [0, 4, TURBE.z],
    text: 'Güney eyvandan geçilen türbe Hatuniye ya da Padişah Hatun Türbesi diye bilinir. Bir kaynağa göre burada medresenin banisi Huand (Hüdavend) Hatun yatar; Wikipedia ise kapı kitabesine dayanarak yapıyı 1271\'de Selçuklu Sultanı I. Alaeddin Keykubad\'ın kızı Hüdavend Hatun\'un yaptırdığını yazar.', source: SRC.courtauld },
];
export const CLUE_REACH = 2.6;
export function nearestClue(x: number, z: number, found: string[]): Clue | null { for (const c of CLUES) { if (found.includes(c.id)) continue; if (Math.hypot(x - c.at[0], z - c.at[1]) < CLUE_REACH) return c; } return null; }
/** Pano: üç iddia ve dayanakları (doğru eşleşme) */
export const CLAIMS = [
  { id: 'a', text: '1271\'de Hüdavend Hatun yaptırdı.', ev: 'turbe' },
  { id: 'b', text: 'Kitabesi yok; adı ve tarihi bilinmiyor.', ev: 'kitabe' },
  { id: 'c', text: 'Hiç tamamlanmadı; kitabesi ve vakfiyesi bu yüzden yok.', ev: 'yarim' },
];
export const matchOk = (m: Record<string, string>) => CLAIMS.every((c) => m[c.id] === c.ev);

/* ===================== duraklar ===================== */
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('medrese', 'Çifte Minareli Medrese', 'Medrese', [0, -40], [0, 16, MED.z0 - 2],
    'Erzurum\'un İçkale semtindeki medrese, Hatuniye Medresesi adıyla da bilinir. 35 × 48 m boyutlarıyla Anadolu\'nun en büyük Selçuklu medresesidir. UNESCO Dünya Mirası Geçici Listesi\'ndedir.', SRC.tdv, 4.5),
  mk('minare', 'Oluklu minareler', 'Cephe', [-13, -31], [-8.2, 22, -25.2],
    'Medrese adını, taç kapının iki yanındaki payandalar üstünde yükselen iki oluklu minareden alır. Minarelerin tuğla gövdeleri mavi sırlı tuğlalarla süslüdür. (Minarelerin yüksekliği temsilîdir.)', SRC.tdv),
  mk('kartal', 'Çift başlı kartal', 'Kabartma', [4.5, MED.z0 - 4.2], [6.6, 3.2, MED.z0 - PORTAL.depth - 0.05],
    'Taç kapının iki yanında dört kabartma pano vardır; sağdakilerden birinde çift başlı kartal işlenmiştir. Taş süslemelerde ağırlıkla palmet, rumi, lotus ve akantus yaprakları gibi bitkisel ve geometrik motifler görülür.', SRC.tez),
  mk('avlu', 'İki katlı, dört eyvanlı', 'Plan', [0, 0], [0, 6.5, -14],
    'Medrese açık avlulu, iki katlı ve dört eyvanlı bir plana sahiptir. Avlunun çevresindeki revakların ardında öğrenci odaları sıralanır. (Oda ve revak sayısı temsilîdir.)', SRC.tdv),
  mk('ulu', 'Ulu Camii', 'Komşu', [19.6, 4], [ULU.x0 - 0.2, 4, 0],
    'Medresenin hemen yanında 12. yüzyıldan kalma Erzurum Ulu Camii bulunur; iki yapı İçkale\'nin tarihi merkezini oluşturur.', SRC.courtauld),
];
export const CARD_PANO = { id: 'pano', name: 'Kitabesiz kapının sırrı', kicker: 'Kaynaklar çelişiyor',
  text: 'Her iddiayı dayanağıyla eşleştirdin. Kimi kaynak yapıyı 1271\'de Hüdavend Hatun\'a bağlar, kimi 1253 der, kimi de kitabesi olmadığı için tarihin bilinmediğini söyler; bir çalışma ise yapının hiç bitirilmediğini öne sürer. Tarihçiler bu tür boşlukları, kanıtları tartarak doldurmaya çalışır.', source: SRC.wiki };
export const START: { at: V2; yaw: number } = { at: [0, -48], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
