/**
 * Bayburt Kalesi — "Burç Burç Bayburt Kalesi": kale tepesi, surlar, burçlar, yollar ve 7 durak (saf veri; three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z şehir yönü. Kale, Çoruh'un üç yandan çevirdiği sarp, uzun bir kayalık tepenin düzlüğündedir; şehir
 * tepenin eteğindedir. Oyuncu şehirden kıvrılarak çıkan yoldan kale kapısına tırmanır, surların içinde serbestçe dolaşır.
 * Tepe biçimi, sur çizgisi, burç yerleri ve ölçüler TEMSİLÎDİR (docs/BAYBURT.md).
 */
export type V2 = [number, number];

/* ===================== tepe ===================== */
/** Düzlüğün (kale içinin) elipsi: yarı eksenler */
export const PLATEAU = { a: 96, b: 40, top: 36 };
/** Merkezden (x,z) yönünde elipsin kenarına uzaklık */
export function edgeR(x: number, z: number): number {
  const r = Math.hypot(x, z) || 1e-6, c = x / r, s = z / r;
  // kenar hafif girintili çıkıntılı (kayalık)
  const wob = 1 + 0.05 * Math.sin(Math.atan2(z, x) * 5 + 0.7) + 0.03 * Math.sin(Math.atan2(z, x) * 11);
  return wob / Math.sqrt((c / PLATEAU.a) ** 2 + (s / PLATEAU.b) ** 2);
}
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
/** Doğal tepe yüksekliği: düzlükte hafif kubbe, kenardan sonra yamaç (şehir tarafı daha yatık, nehir tarafları sarp) */
export function hillY(x: number, z: number): number {
  const r = Math.hypot(x, z), e = edgeR(x, z), d = r - e;
  const fall = 26 + 58 * smooth(-10, 60, z);   // nehir yanları ~26 m'de, şehir yanı ~84 m'de iner
  if (d <= 0) return PLATEAU.top + 2.2 * (1 - r / e) ** 1.5 + Math.sin(x * 0.07) * 0.35 + Math.cos(z * 0.09) * 0.25;
  const k = Math.pow(1 - Math.min(1, d / fall), 1.8);   // kenarda sarp başlar (kayalık), etekte yatıklaşır
  return PLATEAU.top * Math.pow(k, 1.15) + Math.sin(x * 0.07) * 0.35 * k + (1 - k) * (Math.sin(x * 0.013) * 1.2 + 1.2);
}

/* ===================== yol: şehirden kale kapısına ===================== */
/** Kıvrılarak çıkan yol (yükseklik başta şehir, sonda kapı; arası boy oranıyla) */
export const RAMP_PTS: V2[] = [[24, 132], [24, 104], [-40, 93], [-49, 86], [-42, 78], [22, 71], [30, 64], [22, 57], [-30, 57], [-38, 52], [-30, 46], [-6, 46], [-6, 34]];   // dönemeçler geniş: şeritler üst üste binmez
export const RAMP_W = 3.6;
const RAMP_LEN: number[] = [0];
for (let i = 1; i < RAMP_PTS.length; i++) RAMP_LEN.push(RAMP_LEN[i - 1] + Math.hypot(RAMP_PTS[i][0] - RAMP_PTS[i - 1][0], RAMP_PTS[i][1] - RAMP_PTS[i - 1][1]));
const RAMP_Y0 = hillY(...RAMP_PTS[0]), RAMP_Y1 = hillY(...RAMP_PTS[RAMP_PTS.length - 1]);
/** Yol üzerindeki en yakın nokta: uzaklık ve yol yüksekliği */
export function rampAt(x: number, z: number): { d: number; y: number } {
  const ds: number[] = [], ys: number[] = []; let dmin = Infinity;
  for (let i = 0; i < RAMP_PTS.length - 1; i++) {
    const a = RAMP_PTS[i], b = RAMP_PTS[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)), d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
    ds.push(d); ys.push(RAMP_Y0 + (RAMP_Y1 - RAMP_Y0) * ((RAMP_LEN[i] + Math.sqrt(L2) * t) / RAMP_LEN[RAMP_LEN.length - 1])); dmin = Math.min(dmin, d);
  }
  // dönemeçlerde iki şeridin yüksekliği yumuşakça karışır (sıçrama olmaz)
  let w = 0, y = 0; for (let i = 0; i < ds.length; i++) { const k = Math.exp(-((ds[i] - dmin) ** 2) / 4); w += k; y += k * ys[i]; }
  return { d: dmin, y: y / w };
}
/** Zemin yüksekliği: yol şeridinde yol, kenarında yola yumuşak geçiş (yarma/dolgu), başka yerde tepe */
export function groundY(x: number, z: number): number {
  const h = hillY(x, z), r = rampAt(x, z), w = 1 - smooth(RAMP_W / 2, RAMP_W / 2 + 7, r.d);
  return w > 0 ? h + (r.y - h) * w : h;
}

/* ===================== surlar ve burçlar ===================== */
/** Kapı: yolun sur çizgisini kestiği yer */
export const GATE: V2 = (() => { const L = Math.hypot(-6, 40), r = edgeR(-6, 40) - 2; return [(-6 / L) * r, (40 / L) * r]; })();   // sur, kenarın 2 m içinde
/** Sur çizgisi üzerindeki nokta (açıya göre), kenarın `inset` m içinde */
export function wallPoint(theta: number, inset = 2): V2 {
  const x = Math.cos(theta), z = Math.sin(theta), e = edgeR(x, z) - inset; return [x * e, z * e];
}
export type TowerKind = 'yuvarlak' | 'kare' | 'ucgen';
export interface Tower { id: string; theta: number; at: V2; kind: TowerKind; r: number }
/** Burçlar: yarım yuvarlak, dörtgen ve üçgen burçlar sur boyunca (sayı ve yer temsilî) */
export const TOWERS: Tower[] = (() => {
  const kinds: TowerKind[] = ['yuvarlak', 'kare', 'yuvarlak', 'ucgen'], out: Tower[] = [], n = 22, gateT = Math.atan2(GATE[1], GATE[0]);
  for (let i = 0; i < n; i++) { const th = (i / n) * Math.PI * 2 + 0.08; if (Math.abs(Math.atan2(Math.sin(th - gateT), Math.cos(th - gateT))) < 0.09) continue; out.push({ id: `burc-${i}`, theta: th, at: wallPoint(th), kind: kinds[i % 4], r: 3.2 }); }
  // kapıyı iki yanından tutan yuvarlak burçlar
  for (const s of [-1, 1]) { const th = gateT + s * 0.17; out.push({ id: `kapi-${s > 0 ? 'd' : 'b'}`, theta: th, at: wallPoint(th), kind: 'yuvarlak', r: 3.6 }); }
  return out;
})();
export const towerById = (id: string) => TOWERS.find((t) => t.id === id);

/* ===================== kale içi ===================== */
/** Kazı alanı (temsilî konum) */
export const DIG = { c: [22, -6] as V2, w: 18, d: 12 };
/** Yıkık yapı temelleri (kale içi; yürünmez) */
export const RUINS: { c: V2; w: number; d: number; yaw: number }[] = [
  { c: [-40, -8], w: 12, d: 9, yaw: 0.2 }, { c: [-62, 6], w: 8, d: 7, yaw: -0.3 }, { c: [52, 10], w: 10, d: 8, yaw: 0.5 },
  { c: [-18, -22], w: 7, d: 7, yaw: 0 }, { c: [68, -12], w: 9, d: 6, yaw: 0.1 }, { c: [-6, 14], w: 6, d: 5, yaw: -0.2 },
];
const inRect = (c: V2, w: number, d: number, yaw: number, x: number, z: number, m = 0) => { const cs = Math.cos(yaw), sn = Math.sin(yaw), dx = x - c[0], dz = z - c[1], u = dx * cs - dz * sn, v = dx * sn + dz * cs; return Math.abs(u) < w / 2 + m && Math.abs(v) < d / 2 + m; };
/** Kale içinde mi (surun iç yüzünden `m` m içeride) */
export function inside(x: number, z: number, m = 0): boolean { return Math.hypot(x, z) < edgeR(x, z) - 3.6 - m; }
/** Yürünebilir: kale içi (burç, kazı çukuru ve yıkıntılar hariç), kapı geçidi ve yol */
export function walkable(x: number, z: number): boolean {
  if (rampAt(x, z).d < RAMP_W / 2 - 0.3) return true;   // yol ve kapı geçidi
  if (!inside(x, z, 0.3)) return false;
  if (inRect(DIG.c, DIG.w, DIG.d, 0, x, z, 0.4)) return false;
  for (const r of RUINS) if (inRect(r.c, r.w, r.d, r.yaw, x, z, 0.4)) return false;
  for (const t of TOWERS) if (Math.hypot(x - t.at[0], z - t.at[1]) < t.r + 0.8) return false;
  return true;
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== şehir ve nehir ===================== */
/** Çoruh: tepeyi kuzey, batı ve doğudan dolanan yatak (merkez çizgi; temsilî) */
export const RIVER: V2[] = [[-280, 170], [-215, 95], [-178, 25], [-160, -40], [-118, -86], [-45, -104], [40, -104], [116, -86], [160, -40], [178, 25], [215, 95], [280, 170]];
export const RIVER_W = 22;
/** Şehir evleri: yolun ve nehrin dışında, tepenin eteğinde */
export interface Block { x: number; z: number; w: number; d: number; floors: number; yaw: number; color: string }
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
const riverDist = (x: number, z: number) => { let m = Infinity; for (let i = 0; i < RIVER.length - 1; i++) { const a = RIVER[i], b = RIVER[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return m; };
export { riverDist };
export const CITY: Block[] = (() => {
  const r = rng(69), out: Block[] = [], cols = ['#efe8da', '#e6d2b8', '#f2efe8', '#d9c9b0', '#e9dcc8', '#cfd6d9'];
  for (let i = 0; i < 900 && out.length < 150; i++) {
    const x = (r() - 0.5) * 340, z = 112 + r() * 170, w = 9 + r() * 8, d = 9 + r() * 6;
    if (rampAt(x, z).d < 10 + Math.max(w, d) / 2 || Math.hypot(x - 24, z - 132) < 30 || riverDist(x, z) < RIVER_W / 2 + 10 || hillY(x, z) > 6) continue;
    const b: Block = { x, z, w, d, floors: 2 + Math.floor(r() * 4), yaw: Math.round(r()) * 0.08 - 0.04, color: cols[Math.floor(r() * cols.length)] };
    if (out.some((o) => Math.abs(o.x - b.x) < (o.w + b.w) / 2 + 3 && Math.abs(o.z - b.z) < (o.d + b.d) / 2 + 3)) continue;
    out.push(b);
  }
  return out;
})();

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  tdv: { title: 'TDV İslâm Ansiklopedisi — Bayburt Kalesi', url: 'https://islamansiklopedisi.org.tr/bayburt-kalesi' },
  wiki: { title: 'Wikipedia — Bayburt Castle', url: 'https://en.wikipedia.org/wiki/Bayburt_Castle' },
  hdn: { title: 'Hürriyet Daily News — Bayburt Castle, a key point on historic Silk Road', url: 'https://www.hurriyetdailynews.com/bayburt-castle-a-key-point-on-historic-silk-road-224979' },
  kazi: { title: 'Halk TV — Bayburt Kalesi kazıları', url: 'https://halktv.com.tr/turkiye/turkiyenin-en-buyuk-3-kalesindeki-kazilar-ortaya-cikardi-tarihi-5-bin-yil-geriye-gidiyor-1045264h' },
  sabah: { title: 'Daily Sabah — Bayburt Castle to regain old glory after restoration', url: 'https://dailysabah.com/history/2019/01/04/bayburt-castle-to-regain-old-glory-after-restoration' },
};
const towerFront = (t: Tower, k = 6.5): V2 => { const r = Math.hypot(t.at[0], t.at[1]); return [t.at[0] * (1 - k / r), t.at[1] * (1 - k / r)]; };
/** Verilen açıya en yakın burç (θ: x = cos θ, z = sin θ; z < 0 nehir tarafı) */
const T = (theta: number) => TOWERS.filter((t) => t.id.startsWith('burc')).reduce((b, t) => (Math.abs(Math.atan2(Math.sin(t.theta - theta), Math.cos(t.theta - theta))) < Math.abs(Math.atan2(Math.sin(b.theta - theta), Math.cos(b.theta - theta))) ? t : b));
/** Surun yıkık, alçak kaldığı manzara yerleri (θ); duraklar bunların önünde */
export const VIEW_T = [-Math.PI / 2 + 0.1, 0.1, Math.PI + 0.1];
const viewAt = (th: number, k = 6): V2 => wallPoint(th, 2 + k);
const viewMark = (th: number, y: number): [number, number, number] => { const p = wallPoint(th, 1.2); return [p[0], hillY(p[0], p[1]) + y, p[1]]; };
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kapi', 'Kale kapısı', 'Giriş', [GATE[0], GATE[1] + 7], [GATE[0], hillY(GATE[0], GATE[1]) + 5.4, GATE[1] + 1.2],
    'Yol, Çoruh vadisinden kıvrılarak kale kapısına çıkar. Kapı üzerindeki bir yazıttan kalenin 1550\'de onarıldığı anlaşılır. Kalenin ilk kez ne zaman ve kim tarafından yapıldığı bilinmez; Bizans tarihçisi Prokopios, İmparator Iustinianus döneminde tahkim edildiğini yazar.', SRC.tdv),
  mk('burc', 'Burçlar', 'Sur', towerFront(T(-Math.PI / 4)), [T(-Math.PI / 4).at[0], hillY(...T(-Math.PI / 4).at) + 6, T(-Math.PI / 4).at[1]],
    'Surlar yarım yuvarlak, dörtgen ve üçgen burçlarla güçlendirilmiştir; kayalığın eğimine göre destek duvarlarıyla desteklenir. Basında surların yaklaşık 3 km uzunluğa ve yer yer 30 m yüksekliğe ulaştığı, kalenin 150 bin metrekarelik alanıyla Türkiye\'nin en büyük kalelerinden biri olduğu aktarılır.', SRC.wiki),
  mk('kitabe', 'Selçuklu tahkimatı', 'Kitabe', towerFront(T((3 * Math.PI) / 4)), [T((3 * Math.PI) / 4).at[0], hillY(...T((3 * Math.PI) / 4).at) + 3.2, T((3 * Math.PI) / 4).at[1]],
    'Bayburt bir süre Saltuklu Beyliği\'nin yönetiminde kaldı; Selçuklular 1202\'de Saltukluları ortadan kaldırınca kente hâkim oldular. Surlardaki yazıtlara göre kaleyi en kapsamlı biçimde Mugisüddin Tuğrul Şah 1200–1230 yılları arasında tahkim ettirdi. Kaynaklar onarımın tarih ve yaptıran ayrıntısında ayrılır.', SRC.tdv),
  mk('coruh', 'Çoruh\'a bakış', 'Manzara', viewAt(VIEW_T[0]), viewMark(VIEW_T[0], 2.2),
    'Kale, Çoruh\'un yukarı havzasında, nehrin üç yandan çevirdiği sarp ve kayalık bir tepenin üstüne kurulmuştur. Bu doğal savunma kaleyi kuşatmalara karşı güçlü kılıyordu.', SRC.hdn),
  mk('kazi', 'Kazı alanı', 'Kazı', [DIG.c[0], DIG.c[1] + DIG.d / 2 + 3], [DIG.c[0], hillY(...DIG.c) + 2.4, DIG.c[1]],
    'Kalede süren arkeolojik kazılarda MÖ 3000\'lere uzanan seramik parçaları ve 1828 Osmanlı-Rus Savaşı\'na ait yangın izleri bulundu. Ruslar 1828\'de kaleyi büyük ölçüde tahrip etmişti; bugün kazı ve restorasyon çalışmaları sürüyor.', SRC.kazi),
  mk('ipekyolu', 'İpek Yolu üzerinde', 'Ticaret', viewAt(VIEW_T[1]), viewMark(VIEW_T[1], 2.2),
    'Bayburt, Trabzon\'dan Erzurum ve İran\'a uzanan tarihî ticaret yolunun üzerindeydi; kale bu yolun önemli duraklarından biriydi. Seyyah Marco Polo\'nun da Bayburt\'tan geçtiği anlatılır.', SRC.hdn),
  mk('cini', '"Çinimaçin" kalesi', 'Ad', viewAt(VIEW_T[2]), viewMark(VIEW_T[2], 2.2),
    'Tarihî kaynaklarda kale, çinileri nedeniyle "Çinimaçin Kalesi" adıyla da anılır. Bugün çini süslemelerden görünür bir iz kalmamıştır; yıkıntılar arasındaki parçalar kazılarla ortaya çıkarılmaya çalışılıyor.', SRC.wiki),
];
export const START: { at: V2; yaw: number } = { at: [24, 128], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -110, x1: 110, z0: -60, z1: 140 };
