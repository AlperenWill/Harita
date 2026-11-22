/**
 * Şeytan Kalesi (Çıldır, Ardahan) — "Uçurumdaki Kale": kanyonla çevrili kayalık, boyun, surlar, kilise, taş basamaklar ve 7 durak
 * (saf veri; three.js'siz, test edilir). Bayburt Kalesi oyunuyla aynı düzen.
 *
 * Eksenler: +x doğu, +z köy yönü. Kayalık üç yandan Karaçay Kanyonu'yla çevrilidir; dördüncü yanda (+z) dar bir boyunla yaylaya bağlanır.
 * Oyuncu yayladan patikayla boyuna yürür, kapıdan girer, kayalığın üstünde serbestçe dolaşır.
 * Kanyon derinliği, kayalığın biçimi, sur ve yapıların yerleri TEMSİLÎDİR (docs/SEYTAN-KALESI.md).
 */
export type V2 = [number, number];
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ===================== arazi ===================== */
/** Kayalığın elipsi (kaynakta alan ~161 × 93 m geçer; yarı eksenler buna yakın) */
export const ROCK = { a: 80, b: 46 };
export const RIM = 60;   // yayla (kanyon kenarı) yüksekliği
/** Boyun: kayalığın yaylaya bağlandığı +z yönündeki açı aralığı */
const NECK_T = Math.PI / 2, NECK_W = 0.32;
/** Elips koordinatı: 1 = kayalık kenarı */
export const ell = (x: number, z: number) => Math.sqrt((x / ROCK.a) ** 2 + (z / ROCK.b) ** 2);
const wob = (x: number, z: number) => { const t = Math.atan2(z, x); return 0.04 * Math.sin(t * 6 + 0.4) + 0.025 * Math.sin(t * 13 + 1.3); };
/** Karaçay: kayalığı dolanan dere (elips koordinatı 1,36 hattı; boyunda kanyon kapalıdır) */
export const STREAM: V2[] = (() => { const out: V2[] = []; for (let i = 0; i <= 64; i++) { const t = NECK_T + NECK_W + (i / 64) * (Math.PI * 2 - 2 * NECK_W), c = Math.cos(t), s = Math.sin(t), r = 1.36 / Math.sqrt((c / ROCK.a) ** 2 + (s / ROCK.b) ** 2); out.push([c * r, s * r]); }
  // uçlar boyunun iki yanından kanyon boyunca uzaklaşır
  const a = out[0], b = out[out.length - 1]; return [[a[0] - 260, a[1] + 150], [a[0] - 110, a[1] + 60], ...out, [b[0] + 110, b[1] + 60], [b[0] + 260, b[1] + 150]]; })();   // boyunun iki yanından uzaklaşan kanyon kolları
export function streamDist(x: number, z: number): number { let m = Infinity; for (let i = 0; i < STREAM.length - 1; i++) { const a = STREAM[i], b = STREAM[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); m = Math.min(m, Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t)); } return m; }
/** Kayalığın üstü: kuzey uca (−z) doğru alçalır (kilise alt kısımdadır) */
const topY = (x: number, z: number) => 57 + 6 * smooth(-ROCK.b, ROCK.b * 0.6, z) + Math.sin(x * 0.09) * 0.4 + Math.cos(z * 0.11) * 0.3;
/** Kanyon kesiti (e: elips koordinatı): kayalık → uçurum → dere yatağı → uçurum → yayla */
function canyonY(x: number, z: number): number {
  const e = ell(x, z) - wob(x, z);
  if (e < 1) return topY(x, z);
  const rim = RIM + Math.sin(x * 0.02) * 1.5 + Math.cos(z * 0.017) * 1.2;
  if (e < 1.14) return topY(x, z) * (1 - smooth(1, 1.14, e) ** 0.7) + 2 * smooth(1, 1.14, e);   // kayalığın uçurumu
  if (e < 1.62) return 1.5 + 1.2 * Math.sin(e * 20) * smooth(1.14, 1.2, e) * (1 - smooth(1.55, 1.62, e));   // dere yatağı
  return 2 + (rim - 2) * smooth(1.62, 1.8, e) ** 0.8 + Math.max(0, e - 1.8) * 6;   // karşı uçurum ve yayla
}
/** Boyun ağırlığı (1: boyunda) */
export function neckW(x: number, z: number): number {
  if (z <= 0) return 0;
  const t = Math.atan2(z, x), d = Math.abs(Math.atan2(Math.sin(t - NECK_T), Math.cos(t - NECK_T)));
  return 1 - smooth(NECK_W * 0.55, NECK_W, d);
}
/** Dere boyunca uzanan kanyon (kayalığın dışında): dar yatak, iki yanda sarp duvar */
function streamCanyon(x: number, z: number): number {
  const d = streamDist(x, z), rim = RIM + Math.sin(x * 0.02) * 1.5 + Math.cos(z * 0.017) * 1.2;
  if (d < 13) return 1.5;
  return 1.5 + (rim - 1.5) * smooth(13, 34, d) ** 0.8;
}
export function terrainBase(x: number, z: number): number {
  const c = ell(x, z) - wob(x, z) < 1 ? canyonY(x, z) : Math.min(canyonY(x, z), streamCanyon(x, z)), n = neckW(x, z), e = ell(x, z);
  if (n <= 0) return c;
  const neck = e < 1 ? topY(x, z) : topY(x, ROCK.b) + (RIM - topY(x, ROCK.b)) * smooth(1, 1.8, e) - 2.5 * Math.sin(Math.min(1, (e - 1) / 0.8) * Math.PI);   // hafif çukur bir boyun
  return c + (neck - c) * n;
}

/* ===================== patika ===================== */
export const PATH_PTS: V2[] = [[46, 196], [30, 150], [8, 112], [0, 84], [0, 58], [0, 34]];
export const PATH_W = 3;
const PATH_LEN: number[] = [0];
for (let i = 1; i < PATH_PTS.length; i++) PATH_LEN.push(PATH_LEN[i - 1] + Math.hypot(PATH_PTS[i][0] - PATH_PTS[i - 1][0], PATH_PTS[i][1] - PATH_PTS[i - 1][1]));
const PY = PATH_PTS.map(([x, z]) => terrainBase(x, z));
/** Patikadaki en yakın nokta ve patika yüksekliği (köşeler arasında doğrusal) */
export function pathAt(x: number, z: number): { d: number; y: number } {
  const ds: number[] = [], ys: number[] = []; let dmin = Infinity;
  for (let i = 0; i < PATH_PTS.length - 1; i++) {
    const a = PATH_PTS[i], b = PATH_PTS[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)), d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
    ds.push(d); ys.push(PY[i] + (PY[i + 1] - PY[i]) * t); dmin = Math.min(dmin, d);
  }
  let w = 0, y = 0; for (let i = 0; i < ds.length; i++) { const k = Math.exp(-((ds[i] - dmin) ** 2) / 4); w += k; y += k * ys[i]; }
  return { d: dmin, y: y / w };
}
void PATH_LEN;
export function groundY(x: number, z: number): number {
  const h = terrainBase(x, z), p = pathAt(x, z), w = 1 - smooth(PATH_W / 2, PATH_W / 2 + 5, p.d);
  return w > 0 ? h + (p.y - h) * w : h;
}

/* ===================== surlar, kapı, burçlar ===================== */
/** Sur çizgisi üzerindeki nokta: kayalık kenarının `inset` m içinde */
export function wallPoint(theta: number, inset = 1.5): V2 {
  const c = Math.cos(theta), s = Math.sin(theta), r = 1 / Math.sqrt((c / ROCK.a) ** 2 + (s / ROCK.b) ** 2), k = 1 + 0.04 * Math.sin(theta * 6 + 0.4) + 0.025 * Math.sin(theta * 13 + 1.3);
  const e = r * k - inset; return [c * e, s * e];
}
/** Kapı: boyunu kesen surun ortasında */
export const GATE_T = Math.PI / 2;
export const GATE: V2 = wallPoint(GATE_T);
export type TowerKind = 'yuvarlak' | 'kare';
export interface Tower { id: string; theta: number; at: V2; kind: TowerKind; r: number }
/** Burçlar boyun tarafında sık (asıl savunma hattı), uçurum yanlarında seyrek (temsilî) */
export const TOWERS: Tower[] = [
  ...[-0.42, -0.22, 0.22, 0.42].map((d, i) => ({ id: `boyun-${i}`, theta: GATE_T + d, kind: (i % 2 ? 'kare' : 'yuvarlak') as TowerKind, r: 3 })),
  ...[0.3, 1.0, 2.3, 2.9, -1.1, -2.0].map((t, i) => ({ id: `burc-${i}`, theta: t, kind: (i % 2 ? 'yuvarlak' : 'kare') as TowerKind, r: 2.6 })),
].map((t) => ({ ...t, at: wallPoint(t.theta) }));
/** Surun manzara için yıkık ve alçak kaldığı yerler */
export const VIEW_T = [-Math.PI / 2 - 0.15, Math.PI - 0.05, -0.35];

/* ===================== kale içi ===================== */
/** Kilise: kayalığın alt kısmında, tek nefli; doğuda apsis (temsilî ölçü) */
export const CHURCH = { c: [-14, -26] as V2, w: 7, d: 13, yaw: Math.PI / 2 };
/** Dereye inen taş basamakların başı (batı uçurumu) */
export const STEPS_T = Math.PI + 0.5;
export const STEPS_TOP: V2 = wallPoint(STEPS_T, 3);
/** Yıkık yapı temelleri (yürünmez) */
export const RUINS: { c: V2; w: number; d: number; yaw: number }[] = [
  { c: [24, 12], w: 9, d: 7, yaw: 0.25 }, { c: [42, -6], w: 7, d: 6, yaw: -0.2 }, { c: [-36, 8], w: 8, d: 6, yaw: 0.4 }, { c: [6, -8], w: 6, d: 5, yaw: 0 },
];
const inRect = (c: V2, w: number, d: number, yaw: number, x: number, z: number, m = 0) => { const cs = Math.cos(yaw), sn = Math.sin(yaw), dx = x - c[0], dz = z - c[1], u = dx * cs - dz * sn, v = dx * sn + dz * cs; return Math.abs(u) < w / 2 + m && Math.abs(v) < d / 2 + m; };
export function inside(x: number, z: number, m = 0): boolean { const r = Math.hypot(x, z), w = wallPoint(Math.atan2(z, x), 0); return r < Math.hypot(w[0], w[1]) - 3 - m; }
export function walkable(x: number, z: number): boolean {
  if (pathAt(x, z).d < PATH_W / 2 - 0.2) return true;
  if (!inside(x, z, 0.3)) return false;
  if (inRect(CHURCH.c, CHURCH.w, CHURCH.d, CHURCH.yaw, x, z, 0.5)) return false;
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

/* ===================== dere ve köy ===================== */
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
/** Yıldırımtepe köyü (yaylada; uzaklık kısaltıldı) */
export const VILLAGE: { x: number; z: number; w: number; d: number; yaw: number }[] = (() => { const r = rng(75), out: { x: number; z: number; w: number; d: number; yaw: number }[] = [];
  for (let i = 0; i < 200 && out.length < 26; i++) { const x = -60 + r() * 150, z = 240 + r() * 90, w = 7 + r() * 6, d = 6 + r() * 5; if (pathAt(x, z).d < 12 || out.some((o) => Math.abs(o.x - x) < (o.w + w) / 2 + 4 && Math.abs(o.z - z) < (o.d + d) / 2 + 4)) continue; out.push({ x, z, w, d, yaw: (r() - 0.5) * 0.4 }); }
  return out; })();

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Şeytan Castle', url: 'https://en.wikipedia.org/wiki/%C5%9Eeytan_Castle' },
  sabah: { title: 'Daily Sabah — Iconic Devil\'s Castle atop Türkiye\'s Ardahan set for restoration', url: 'https://www.dailysabah.com/arts/iconic-devils-castle-atop-turkiyes-ardahan-set-for-restoration/news' },
  lp: { title: 'Lonely Planet — Şeytan Kalesi', url: 'https://www.lonelyplanet.com/points-of-interest/seytan-kalesi/1541632' },
  ntv: { title: 'NTV — Şeytan Kalesi Kültür ve Turizm Bakanlığı\'na devredilecek', url: 'https://www.ntv.com.tr/n-life/kultur-ve-sanat/ardahandaki-seytan-kalesi-kultur-ve-turizm-bakanligina-devredilecek,dZC61JQZo0WIUosfcWbB7A' },
};
const inward = (th: number, k: number): V2 => wallPoint(th, 1.5 + k);
const markAt = (th: number, y: number, inset = 0.8): [number, number, number] => { const p = wallPoint(th, inset); return [p[0], groundY(...inward(th, 3)) + y, p[1]]; };
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('kapi', 'Boyundaki kapı', 'Giriş', [GATE[0], GATE[1] + 7], [GATE[0], groundY(...GATE) + 5.2, GATE[1] + 1.2],
    'Kayalık üç yandan sarp uçurumlarla çevrilidir; kaleye yalnızca dördüncü yandaki dar boyundan ulaşılır. Bu yüzden surlar en güçlü hâliyle boyunu keser. Savunma için gizli bir giriş kapısı da olduğu aktarılır.', SRC.wiki),
  mk('kanyon', 'Karaçay Kanyonu', 'Manzara', inward(VIEW_T[0], 3.4), markAt(VIEW_T[0], 2),
    'Kale, Karaçay Kanyonu\'nun ortasında yükselen kayalığın tepesindedir. Kanyonun dibinden akan dere kayalığı dolanır; uçurumlar kaleyi doğal bir kalkan gibi korur.', SRC.lp),
  mk('ad', 'Neden "Şeytan" Kalesi?', 'Ad', inward(VIEW_T[1], 3.4), markAt(VIEW_T[1], 2),
    'Adının, ulaşılması bu kadar zor bir yere kurulmasını kötü ruhlara bağlayan yerel efsanelerden geldiği anlatılır. Gürcü kaynaklarında da "Kacis Tsikhe" diye geçer; bu da "Şeytan Kalesi" demektir.', SRC.wiki),
  mk('kilise', 'Aziz Stefanos Kilisesi', 'Kilise', [CHURCH.c[0] + 0.5, CHURCH.c[1] + CHURCH.d / 2 + 3.2], [CHURCH.c[0], groundY(...CHURCH.c) + 5.5, CHURCH.c[1]],
    'Kalenin alt kısmında 14. yüzyıla tarihlenen, tek nefli bir kilise bulunur. Aziz Stefanos\'a adandığı belirtilen yapının bugün yalnızca dört duvarı ayaktadır.', SRC.wiki),
  mk('merdiven', 'Dereye inen basamaklar', 'Su yolu', inward(STEPS_T, 4), [STEPS_TOP[0], groundY(...STEPS_TOP) + 1.6, STEPS_TOP[1]],
    'Kayaya oyulmuş taş basamaklar kaleden aşağıdaki dereye iner. Kuşatma sırasında su ihtiyacının bu yoldan karşılandığı düşünülür.', SRC.wiki),
  mk('tarih', 'Kim yaptı?', 'Tarih', [-6, 18], [-6, groundY(-6, 12) + 2.6, 12],
    'Kalenin ne zaman ve kim tarafından yapıldığı bilinmez. Urartulara atfedilir ama bunu doğrulayan bir tarihî kaynak yoktur. Gürcü bir kronik kaleyi 1560–1580\'li yıllarla ilişkili olarak anar; çevredeki Yıldırımtepe köyünün eski adı Rabat\'tır.', SRC.wiki),
  mk('koruma', 'Korunan miras', 'Bugün', inward(VIEW_T[2], 3.4), markAt(VIEW_T[2], 2),
    'Kale 2022\'de Kültür ve Turizm Bakanlığı\'na devredilmek üzere işlemlere başlandı; Kasım 2024\'te restorasyon planı duyuruldu. Amaç, kanyonla birlikte alanı doğa ve kültür turizmine kazandırmak.', SRC.sabah),
];
export const START: { at: V2; yaw: number } = { at: [44, 190], yaw: 0.35 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -100, x1: 100, z0: -70, z1: 205 };
export { SRC };
