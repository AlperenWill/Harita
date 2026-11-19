/**
 * Zil Kale & Çamlıhemşin — vadi, dere, rota, açılma anları ve tarih katmanı noktaları (saf; test edilir).
 * Koordinat: metre; x doğu, −z vadinin yukarısı (güney-güneydoğu yönü stilize), y yukarı. Arazi stilizedir (sayısal yükseklik modeli yok).
 *
 * Yolculuk: köy (ahşap Hemşin evleri, serender) → dere kıyısı patikası → tek kemerli taş köprü (açılma 1) → şelale (açılma 2)
 * → orman yokuşu (zikzak) → Zil Kale girişi (açılma 3) → kale tepesi (sabit geniş açı; kamera duvarların içine girmez).
 * Gerçek ölçüler: Zil Kale dereden ~380 m yüksekte, ~1.100 m rakımda; burada yokuş ~60 m'ye kısaltıldı.
 */
export type V2 = [number, number];
export type V3 = [number, number, number];

/** Derenin orta çizgisi (yumuşak kıvrımlar) ve su seviyesi (vadi yukarı doğru yükselir) */
export const riverX = (z: number) => 16 * Math.sin(z * 0.011) + 6 * Math.sin(z * 0.031 + 1.2);
export const baseY = (z: number) => Math.max(0, -z) * 0.05;
export const waterY = (z: number) => baseY(z) - 0.6;
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x: number, z: number) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; }

export const CASTLE = { x: -52, z: -330, top: 0, r: 13 } as const;
export const BRIDGE = { z: -118, span: 22, rise: 6.5, width: 2.6 } as const;
/** Şelale: karşı (doğu) yamaçtan dereye dökülen yan kol; oyuncu batı kıyısındaki tahta patikadan, derenin öbür yanından görür */
export const FALLS = { z: -214, lip: 13.5, foot: 6.2, cliff: 11 } as const;

/** Arazi yüksekliği: V biçimli vadi + kale burnu + gürültü */
export function heightAt(x: number, z: number): number {
  const d = Math.abs(x - riverX(z)), floor = baseY(z);
  let h = floor + Math.pow(Math.max(0, d - 5), 1.26) * 0.36 + (noise(x * 0.05, z * 0.05) - 0.5) * 3 * Math.min(1, d / 20);
  const cd = Math.hypot(x - CASTLE.x, z - CASTLE.z); h = Math.max(h, floor + 60 * Math.min(1, Math.exp(-(cd * cd) / (2 * 30 * 30)) / 0.8) + (noise(x * 0.2, z * 0.2) - 0.5) * 1.2);   // kale burnu: tepesi düzlük (kale oturur)
  const fd = x - riverX(z); if (fd > 6) h += Math.exp(-(((z - FALLS.z) / 9) ** 2)) * FALLS.cliff * Math.min(1, Math.max(0, (fd - 7.5) / 4.5)) ** 0.7;   // şelale yarı
  if (d < 7.2) h = Math.min(h, floor - 2.6 + d * 0.38);   // dere yatağı: su ~10 m genişlikte, ortası ~2 m derin; kıyı 7 m'de araziye bağlanır
  return h;
}
export const castleBase = () => heightAt(CASTLE.x, CASTLE.z);
/** Şelalenin dudağı (üst) ve dibi (dere kenarı) */
export const fallsTop = (): V3 => { const x = riverX(FALLS.z) + FALLS.lip; return [x, heightAt(x, FALLS.z) + 0.3, FALLS.z]; };
export const fallsFoot = (): V3 => [riverX(FALLS.z) + FALLS.foot, waterY(FALLS.z) + 0.05, FALLS.z];

/* ---------- rota (patika) ---------- */
export type Surface = 'toprak' | 'tas' | 'tahta';
interface WP { x: number; z: number; surface: Surface; bridge?: boolean }
const rx = riverX;
const B0 = rx(BRIDGE.z) + BRIDGE.span / 2, B1 = rx(BRIDGE.z) - BRIDGE.span / 2;
export const WAYPOINTS: WP[] = [
  { x: rx(12) + 13, z: 12, surface: 'tas' }, { x: rx(0) + 12, z: 0, surface: 'tas' }, { x: rx(-25) + 10, z: -25, surface: 'toprak' }, { x: rx(-55) + 9, z: -55, surface: 'toprak' },
  { x: rx(-85) + 9, z: -85, surface: 'toprak' }, { x: rx(-108) + 11.5, z: -108, surface: 'toprak' }, { x: B0, z: BRIDGE.z, surface: 'tas', bridge: true },
  ...Array.from({ length: 9 }, (_, i) => ({ x: B0 + ((B1 - B0) * (i + 1)) / 10, z: BRIDGE.z, surface: 'tas' as Surface, bridge: true })),
  { x: B1, z: BRIDGE.z, surface: 'tas', bridge: true }, { x: rx(-130) - 10, z: -130, surface: 'toprak' }, { x: rx(-165) - 8.5, z: -165, surface: 'toprak' }, { x: rx(-198) - 8, z: -198, surface: 'tahta' },
  { x: rx(-214) - 8.5, z: -214, surface: 'tahta' }, { x: rx(-232) - 9, z: -232, surface: 'toprak' }, { x: rx(-258) - 10, z: -258, surface: 'toprak' },
  // orman yokuşu: kale burnuna zikzak
  { x: -30, z: -268, surface: 'toprak' }, { x: -44, z: -280, surface: 'toprak' }, { x: -30, z: -292, surface: 'toprak' }, { x: -44, z: -302, surface: 'toprak' }, { x: -36, z: -312, surface: 'tas' }, { x: -44, z: -318, surface: 'tas' },
];
/** Köprü güvertesi: sivri kemerin sırtı (tek kemerli Osmanlı köprüleri belirgin şekilde kamburdur) */
let END_Y = NaN;
/** Köprü uçları kıyı kayalığına oturur: uç yüksekliği = iki kıyıdaki arazinin yükseği (dereden ~4–5 m yukarıda) */
const bridgeEnd = () => { if (Number.isNaN(END_Y)) { const c = rx(BRIDGE.z), h = BRIDGE.span / 2; END_Y = Math.max(heightAt(c - h, BRIDGE.z - 1), heightAt(c - h, BRIDGE.z + 1), heightAt(c + h, BRIDGE.z - 1), heightAt(c + h, BRIDGE.z + 1), waterY(BRIDGE.z) + 2.2) + 0.15; } return END_Y; };
export function bridgeDeck(x: number): number { const c = rx(BRIDGE.z), u = (x - c) / (BRIDGE.span / 2); return bridgeEnd() + BRIDGE.rise * (1 - Math.min(1, Math.abs(u)) ** 1.6); }
const pts: V3[] = WAYPOINTS.map((w) => [w.x, w.bridge ? bridgeDeck(w.x) : heightAt(w.x, w.z), w.z]);
const lens = [0]; for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
export const ROUTE_LEN = lens[lens.length - 1];
export function routeAt(s: number): { p: V3; dir: V2; surface: Surface; onBridge: boolean } {
  const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < lens.length - 1 && lens[i] < c) i++;
  const a = pts[i - 1], b = pts[i], k = (c - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]), w = WAYPOINTS[k < 0.5 ? i - 1 : i];
  const x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k, onBridge = !!(WAYPOINTS[i - 1].bridge && WAYPOINTS[i].bridge);
  const y = onBridge ? bridgeDeck(x) : Math.max(heightAt(x, z), a[1] + (b[1] - a[1]) * k - 0.4);
  const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1;
  return { p: [x, y, z], dir: [dx / l, dz / l], surface: w.surface, onBridge };
}
export function closestS(q: V3): number { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 0.5) { const p = routeAt(s).p, d = Math.hypot(p[0] - q[0], p[2] - q[2]); if (d < bd) { bd = d; best = s; } } return best; }
/** Kale tepesi bölgesi: rotanın son ~14 metresi → sabit üçüncü şahıs kamerası */
export const SUMMIT_S = ROUTE_LEN - 14;
/** Kale tepesi kamerası: kalenin dışında, karşı yamaçtan; kale + arkasındaki dağlar kadrajda */
export const SUMMIT_CAM = { pos: [CASTLE.x + 30, 0, CASTLE.z + 26] as V3, look: [CASTLE.x - 6, 0, CASTLE.z - 10] as V3, up: 9 };

/* ---------- açılma anları (sis birden dağılır) ---------- */
export interface Reveal { id: string; name: string; s: number; width: number }
const RAW_REVEALS: { id: string; name: string; at: V3; width: number }[] = [
  { id: 'kopru', name: 'Taş kemer köprü', at: [rx(BRIDGE.z), 0, BRIDGE.z], width: 16 },
  { id: 'selale', name: 'Şelale', at: [rx(-214) - 8.5, 0, -214], width: 14 },
  { id: 'kale', name: 'Zil Kale', at: [-44, 0, -318], width: 18 },
];
export const REVEALS: Reveal[] = RAW_REVEALS.map((r) => ({ id: r.id, name: r.name, s: closestS(r.at), width: r.width }));

/* ---------- tarih katmanı noktaları ---------- */
export interface Layer { id: string; name: string; era: string; pos: V3; reach: number; ruinText: string; pastText: string; source: { title: string; url: string }; s: number }
const SRC = {
  zil: { title: 'Wikipedia — Zilkale', url: 'https://en.wikipedia.org/wiki/Zilkale' },
  bridges: { title: 'Wikipedia — Fırtına River bridges', url: 'https://en.wikipedia.org/wiki/F%C4%B1rt%C4%B1na_River_bridges' },
  kultur: { title: 'Kültür Envanteri — Zilkale', url: 'https://kulturenvanteri.com/en/yer/zilkale/' },
};
const RAW_LAYERS: Omit<Layer, 's'>[] = [
  { id: 'ev', name: 'Ahşap köy evi', era: 'Hemşin köy mimarisi', pos: [rx(-4) + 22, 0, -4], reach: 11, source: SRC.bridges,
    ruinText: 'Taş bir zemin katın üstüne oturan ahşap ev, nemli iklimde yıllar içinde kararıp çürür; çatısı çöker.', pastText: 'Taş zemin kat ahır ve depo, üstteki ahşap kat ev olarak kullanılırdı. Geniş saçaklar duvarları yağmurdan korur.' },
  { id: 'serender', name: 'Serender', era: 'Karadeniz ahşap ambarı', pos: [rx(-40) + 18, 0, -40], reach: 10, source: SRC.bridges,
    ruinText: 'Yerden yüksek ayaklar üzerinde duran ahşap ambar; tahtaları gevşemiş.', pastText: 'Serenderler mısır ve tahılı nemden ve fareden korumak için ayaklar üstüne yapılır; ayakların tepesindeki yassı taşlar farelerin tırmanmasını engeller.' },
  { id: 'kitabe', name: 'Köprünün kayıp kitabesi', era: '1696 ya da 1699', pos: [rx(BRIDGE.z), 0, BRIDGE.z], reach: 12, source: SRC.bridges,
    ruinText: 'Tek kemerli taş köprü bugün ayakta; ama yapım tarihini yazan kitabe yok.', pastText: 'Benzer tek kemerli köprülerden biri olan Şenyuva Köprüsü’nün kitabesi 1696 ya da 1699 tarihini veriyordu; kitabe 1946 selinde kayboldu. Fırtına Deresi ve kollarında 20’den fazla tarihî köprü vardır.' },
  { id: 'surlar', name: 'Zil Kale dış surları', era: '14.–15. yüzyıl (kesin değil)', pos: [-36, 0, -300], reach: 10, source: SRC.zil,
    ruinText: 'Moloz taştan surlar yer yer yıkılmış; taşların arası yosun ve likenle dolu.', pastText: 'Kalenin yapım tarihi kesin bilinmiyor; genellikle 14.–15. yüzyıla tarihlenir ve Trabzon İmparatorluğu dönemiyle ilişkilendirilir. Gösterilen “sağlam hâl” bir canlandırmadır.' },
  { id: 'burc', name: 'Zil Kale ana burcu', era: 'Ortaçağ', pos: [CASTLE.x, 0, CASTLE.z], reach: 16, source: SRC.kultur,
    ruinText: 'Dik bir kayalığın üstündeki kale, Fırtına Deresi’ne bakan vadiyi gözetler.', pastText: 'Kale dereden yaklaşık 380 m yükseklikte, ormanla kaplı bir kayalık burnun üzerindedir. Bölgede birinci derece arkeolojik sit alanı içinde yer aldığı yazılır.' },
];
export const LAYERS: Layer[] = RAW_LAYERS.map((l) => ({ ...l, pos: [l.pos[0], l.id === 'burc' ? castleBase() : heightAt(l.pos[0], l.pos[2]), l.pos[2]] as V3, s: closestS(l.pos) }));
export function nearLayer(s: number): Layer | null { let b: Layer | null = null, bd = Infinity; for (const l of LAYERS) { const d = Math.abs(s - l.s); if (d < l.reach && d < bd) { bd = d; b = l; } } return b; }
export function nextLayer(s: number, seen: string[]): Layer | null { let b: Layer | null = null, bd = Infinity; for (const l of LAYERS) { if (seen.includes(l.id)) continue; const d = Math.abs(s - l.s); if (d < bd) { bd = d; b = l; } } return b; }
