/**
 * Yüzen Adalar (Solhan, Bingöl) — "Sal Gibi Ada": krater gölü, kıyı yolu, iki iskele, rüzgârla yer değiştiren üç yüzen ada ve 7 durak
 * (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z otopark ve köy yönü. Büyük ada iki iskele arasında rüzgârla gidip gelir (iskelede bir süre bekler); oyuncu iskeleden adaya
 * binip onunla gölde dolaşabilir. Göl ve krater ölçüleri, adaların boyu ve hareket düzeni TEMSİLÎDİR (docs/YUZEN-ADALAR.md).
 */
export type V2 = [number, number];
const smooth = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/* ===================== göl ve krater ===================== */
export const LAKE_R = 58;
export const WATER_Y = 0;
const shoreR = (x: number, z: number) => LAKE_R + 2.5 * Math.sin(Math.atan2(z, x) * 3 + 0.5) + 1.5 * Math.sin(Math.atan2(z, x) * 7);
/** Krater çanağı: kıyıdan sonra yükselen yamaç, kenar, dışarıda yayla */
export function terrainBase(x: number, z: number): number {
  const r = Math.hypot(x, z), s = shoreR(x, z), d = r - s;
  if (d < 0) return -1.5 - 2.5 * smooth(0, 14, -d);   // göl tabanı (sığ kıyı)
  const rim = 26 + 6 * Math.sin(Math.atan2(z, x) * 2 + 1) + 3 * Math.sin(x * 0.05 + z * 0.04);
  const inner = 0.5 + (rim - 0.5) * smooth(10, 95, d) ** 1.2;
  const outer = rim - Math.max(0, d - 100) * 0.12;
  return d < 100 ? inner + Math.sin(x * 0.08) * Math.cos(z * 0.07) * 0.4 * smooth(0, 6, d) : outer;
}

/* ===================== yollar ve iskeleler ===================== */
export const RING_R = 66;
export interface Pier { id: string; theta: number; a: V2; b: V2 }
const polar = (t: number, r: number): V2 => [Math.cos(t) * r, Math.sin(t) * r];
/** İki iskele: kıyı yolundan göle uzanır (b: göldeki uç) */
export const PIERS: Pier[] = [{ id: 'kuzey', theta: Math.PI / 2 }, { id: 'guney', theta: -Math.PI / 2 }].map((p) => ({ ...p, a: polar(p.theta, RING_R - 1), b: polar(p.theta, 49) }));
export const SPUR: V2[] = [[6, 128], [4, 100], [0, 80], [0, RING_R]];   // otoparktan kıyı yoluna inen patika
export const PIER_W = 2.4, RING_W = 3, SPUR_W = 3;
const segD = (x: number, z: number, a: V2, b: V2) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return { d: Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t), t }; };
export function onPier(x: number, z: number, pad = 0): Pier | null { for (const p of PIERS) if (segD(x, z, p.a, p.b).d < PIER_W / 2 - pad) return p; return null; }
export function onRing(x: number, z: number, pad = 0) { return Math.abs(Math.hypot(x, z) - RING_R) < RING_W / 2 - pad; }
export function onSpur(x: number, z: number, pad = 0) { for (let i = 0; i < SPUR.length - 1; i++) if (segD(x, z, SPUR[i], SPUR[i + 1]).d < SPUR_W / 2 - pad) return true; return false; }
export const DECK_Y = 0.55;
/** Kıyıda yürüme yüksekliği */
export function groundY(x: number, z: number): number {
  if (onPier(x, z, -0.6)) { const p = onPier(x, z, -0.6)!, t = segD(x, z, p.a, p.b).t; return Math.max(DECK_Y, terrainBase(...p.a) * (1 - smooth(0, 0.15, t)) + DECK_Y * smooth(0, 0.15, t)); }
  return Math.max(terrainBase(x, z), DECK_Y - 0.1);
}
export function walkableShore(x: number, z: number): boolean { return onRing(x, z, 0.2) || onSpur(x, z, 0.2) || !!onPier(x, z, 0.2); }

/* ===================== yüzen adalar ===================== */
export interface Island { id: string; r: number; trees: number }
export const ISLANDS: Island[] = [{ id: 'buyuk', r: 9, trees: 4 }, { id: 'orta', r: 6, trees: 2 }, { id: 'kucuk', r: 4.5, trees: 1 }];
/** Büyük adanın bir tur süresi (s): kuzey iskelede bekle → güneye sürüklen → güney iskelede bekle → kuzeye dön */
export const CYCLE = 84, DOCK = 14, TRAVEL = (CYCLE - 2 * DOCK) / 2;
const ease = (u: number) => u * u * (3 - 2 * u);
const dockC = (p: Pier, r: number): V2 => polar(p.theta, 49 - r - 0.5);
/** Adanın merkezi ve yönü t anında */
export function islandAt(i: number, t: number): { c: V2; yaw: number } {
  if (i === 0) {
    const r = ISLANDS[0].r, A = dockC(PIERS[0], r), B = dockC(PIERS[1], r), k = ((t % CYCLE) + CYCLE) % CYCLE;
    let u: number, from = A, to = B;
    if (k < DOCK) return { c: A, yaw: 0 };
    if (k < DOCK + TRAVEL) u = ease((k - DOCK) / TRAVEL);
    else if (k < 2 * DOCK + TRAVEL) return { c: B, yaw: 0 };
    else { u = ease((k - 2 * DOCK - TRAVEL) / TRAVEL); from = B; to = A; }
    const side = Math.sin(u * Math.PI) * 8 * (from === A ? 1 : -1);   // gidişte doğudan, dönüşte batıdan sürüklenir
    return { c: [from[0] + (to[0] - from[0]) * u + side, from[1] + (to[1] - from[1]) * u], yaw: 0 };
  }
  if (i === 1) return { c: [-34 + 6 * Math.sin(t * 0.021), 10 + 9 * Math.sin(t * 0.017 + 1)], yaw: t * 0.004 };
  return { c: [36 + 6 * Math.sin(t * 0.026 + 2), -6 + 10 * Math.sin(t * 0.019)], yaw: -t * 0.005 };
}
/** Büyük ada şu an bir iskelede mi bekliyor? */
export function dockedAt(t: number): Pier | null {
  const k = ((t % CYCLE) + CYCLE) % CYCLE;
  if (k < DOCK - 1) return PIERS[0];
  if (k >= DOCK + TRAVEL && k < 2 * DOCK + TRAVEL - 1) return PIERS[1];
  return null;
}
export const ISLAND_Y = 0.42;
/** Adanın üstünde mi (yerel koordinat; kenardan pay ile) */
export const onIsland = (lx: number, lz: number, r: number, pad = 1.2) => Math.hypot(lx, lz) < r - pad;

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Floating islands (Bingöl)', url: 'https://en.wikipedia.org/wiki/Floating_islands_(Bing%C3%B6l)' },
  sabah: { title: 'Daily Sabah — Bingöl\'s floating islands mesmerize nature lovers', url: 'https://www.dailysabah.com/turkiye/bingols-floating-islands-mesmerize-nature-lovers-in-eastern-turkiye/news' },
  tgrt: { title: 'TGRT Haber — Bingöl\'deki bu adalar yüzüyor', url: 'https://www.tgrthaber.com/yasam/bingoldeki-bu-adalar-yuzuyor-turkiyenin-her-yerinden-gormeye-geliyorlar-2952244' },
  posta: { title: 'Posta — Vali dalgıç ekibiyle daldı, yüzen adaların sırrı çözüldü', url: 'https://www.posta.com.tr/galeri/-3020127' },
  hdn: { title: 'Hürriyet Daily News — Swimming islands to lure tourists', url: 'https://www.hurriyetdailynews.com/swimming-islands-to-lure-tourists-39538' },
  dha: { title: 'DHA — Profesörden yüzen adalar için uyarı', url: 'https://www.dha.com.tr/foto-galeri/profesorden-yuzen-adalar-icin-kurallara-uyulmazsa-kaybederiz-uyarisi-2108544' },
};
const ring = (t: number): V2 => polar(t, RING_R);
const lakeMark = (t: number, y = 1.6): [number, number, number] => { const p = polar(t, LAKE_R - 4); return [p[0], y, p[1]]; };
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('krater', 'Krater gölü', 'Göl', ring(Math.PI / 2 + 0.25), lakeMark(Math.PI / 2 + 0.25),
    'Adaların bulunduğu göl, Solhan\'a bağlı Hazarşah köyünde bir krater gölüdür. Çevresindeki çanak biçimli yamaçlar gölü rüzgârdan kısmen korur.', SRC.wiki),
  mk('yapi', 'Ada neden batmıyor?', 'Ada', ring(Math.PI + 0.35), [-34, 2.2, 10],
    'Adalar, iç içe geçmiş su bitkilerinden oluşan yüzen kütlelerdir: çayır otu, ayrık otu ve çeşitli su bitkileri. Dünyadaki benzerlerinden farklı olarak bu adaların üzerinde ağaçlar da yetişir.', SRC.wiki),
  mk('ruzgar', 'Rüzgârla yer değiştiren adalar', 'Hareket', ring(-0.35), [36, 2.2, -6],
    'Gölün ortasındaki üç ada rüzgârın yönüne göre yer değiştirir. Bu yüzden göle her gelişte adaları farklı bir yerde görmek mümkündür.', SRC.sabah),
  mk('sal', 'Sal gibi ada', 'Deneyim', polar(Math.PI / 2, 51.2), [0, 1.8, 47],
    'Adaların üzerine çıkıldığında ada bir sal gibi ağır ağır hareket eder. Büyük ada iskeleye yanaştığında E ile binebilir, onunla birlikte gölün öbür yakasına geçebilirsin.', SRC.tgrt, 3.6),
  mk('derinlik', 'Gölün derinliği', 'Ölçüm', ring(-Math.PI / 2 - 0.3), lakeMark(-Math.PI / 2 - 0.3),
    'Göl için verilen derinlikler birbirini tutmuyor. Bazı haberlerde 50 metreden fazla derinlikten söz edilir; gölde dalış yapan bir ekip ise en derin noktayı 5,4–5,9 metre ölçmüştür.', SRC.posta),
  mk('anit', 'Tabiat anıtı', 'Koruma', ring(Math.PI - 0.6), lakeMark(Math.PI - 0.6),
    'Adalar "Yüzen Adalar Tabiat Anıtı" olarak Doğa Koruma ve Millî Parklar Genel Müdürlüğü\'nün koruması altındadır. Tescil yılı kaynaklarda 2003 ya da 2005 olarak geçer.', SRC.hdn),
  mk('ziyaret', 'Kırılgan bir denge', 'Bugün', ring(0.55), lakeMark(0.55),
    'Adaları her yıl binlerce kişi ziyaret ediyor; 2024\'te yaklaşık 22 bin ziyaretçi geldiği bildirildi. Uzmanlar, kurallara uyulmazsa bitki örtüsünün zarar görüp adaların kaybedilebileceği uyarısında bulunuyor.', SRC.dha),
];
export const START: { at: V2; yaw: number } = { at: [6, 124], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -80, x1: 80, z0: -80, z1: 135 };
