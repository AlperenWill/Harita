/**
 * Troya — "Dokuz Kent": rota, ören noktaları ve katman bilmeceleri (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Hisarlık höyüğü merkezde. Plan STİLİZEDİR.
 *
 * Troya üst üste kurulmuş dokuz ana yerleşim katmanından (Troya I–IX) oluşur. Ziyaretçi yolunda her noktada oyuncuya
 * "Bu yapı hangi katmana ait?" diye sorulur; doğru katmanı seçince kart açılır. Tarihler yaklaşıktır (kaynaklara göre değişir).
 */
export type V3 = [number, number, number];
export const MOUND = { r: 70, h: 9 } as const;
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Höyük: yuvarlatılmış tepe; Schliemann yarması höyüğü kuzey-güney yönünde keser */
export const TRENCH = { x: 0, z0: -38, z1: -8, w: 9, d: 6 } as const;
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z * 1.15); let h = MOUND.h * Math.max(0, 1 - (r / MOUND.r) ** 2.2) + (hash(Math.floor(x / 6), Math.floor(z / 6)) - 0.5) * 0.3;
  if (Math.abs(x - TRENCH.x) < TRENCH.w / 2 && z > TRENCH.z0 && z < TRENCH.z1) h = Math.min(h, MOUND.h - TRENCH.d);
  return Math.max(0, h);
}

/** Katmanlar (yaklaşık tarihler) */
export const LAYERS = [
  { n: 'I', era: 'MÖ ~3000–2550', color: '#7a5a42' }, { n: 'II', era: 'MÖ ~2550–2300', color: '#8d6a4c' }, { n: 'III–V', era: 'MÖ ~2300–1750', color: '#9c7b5a' },
  { n: 'VI', era: 'MÖ ~1750–1300', color: '#a98e6a' }, { n: 'VII', era: 'MÖ ~1300–950', color: '#b39c78' }, { n: 'VIII', era: 'MÖ ~700–85', color: '#c1ad8b' }, { n: 'IX', era: 'MÖ 85 – MS ~500', color: '#cfbf9f' },
];

/* ---------- rota (ziyaretçi yolu, höyüğün çevresinden) ---------- */
const WP: [number, number][] = [[95, 70], [70, 52], [52, 30], [46, 6], [40, -18], [24, -36], [6, -42], [8, -30], [8, -10], [-14, 4], [-36, 6], [-50, -14], [-44, -38], [-20, -56], [8, -66], [36, -56]];
const LENS = [0]; for (let i = 1; i < WP.length; i++) LENS.push(LENS[i - 1] + Math.hypot(WP[i][0] - WP[i - 1][0], WP[i][1] - WP[i - 1][1]));
export const ROUTE_LEN = LENS[LENS.length - 1];
export function routeAt(s: number): { p: V3; dir: [number, number] } {
  const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < LENS.length - 1 && LENS[i] < c) i++;
  const a = WP[i - 1], b = WP[i], k = (c - LENS[i - 1]) / Math.max(1e-6, LENS[i] - LENS[i - 1]);
  const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return { p: [x, heightAt(x, z), z], dir: [dx / l, dz / l] };
}
export function closestS(x: number, z: number) { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 0.5) { const p = routeAt(s).p, d = Math.hypot(p[0] - x, p[2] - z); if (d < bd) { bd = d; best = s; } } return best; }

/* ---------- noktalar ---------- */
export interface Stop { id: string; name: string; at: [number, number]; answer: string | null; options: string[]; text: string; source: { title: string; url: string }; s: number }
const SRC = { title: 'Wikipedia — Truva', url: 'https://tr.wikipedia.org/wiki/Truva' }, SRC_EN = { title: 'Wikipedia — Troy', url: 'https://en.wikipedia.org/wiki/Troy' };
const RAW: Omit<Stop, 's'>[] = [
  { id: 'at', name: 'Tahta at (kopya)', at: [74, 54], answer: null, options: [], source: SRC,
    text: 'Girişteki tahta at 1970’lerde yapılmış modern bir kopyadır. Tahta at hikâyesi Homeros’tan sonraki anlatılardan bilinir; arkeolojik bir bulgu değildir. Şimdi yürü ve katmanları tanı.' },
  { id: 'surlar', name: 'Doğu surları ve kule', at: [46, 6], answer: 'VI', options: ['II', 'VI', 'IX'], source: SRC_EN,
    text: 'Eğimli, düzgün kesme taş surlar ve kule Troya VI’ya aittir (Geç Tunç Çağı). Kentin en güçlü dönemlerinden biridir; Homeros’un anlattığı Troya sıklıkla Troya VI ya da VIIa ile ilişkilendirilir, ama bu tartışmalıdır.' },
  { id: 'megaron', name: 'Megaronlar ve rampa', at: [6, -42], answer: 'II', options: ['I', 'II', 'VIII'], source: SRC_EN,
    text: 'Taş döşeli rampa ve büyük salonlu (megaron) yapılar Troya II’ye aittir (Erken Tunç Çağı). Schliemann burada bulduğu altın hazineyi “Priamos’un Hazinesi” sandı; oysa hazine Homeros’un Troyası’ndan yaklaşık bin yıl daha eskidir.' },
  { id: 'yarma', name: 'Schliemann yarması', at: [2, -14], answer: 'I', options: ['I', 'VII', 'IX'], source: SRC,
    text: 'Heinrich Schliemann 1870’lerde höyüğü kuzey–güney yönünde kazdı ve üstteki katmanların bir kısmını tahrip etti. Yarmanın dibinde en eski kent, Troya I’in duvarları görülür. Duvarlardaki renkli bantlar üst üste binen kentlerdir.' },
  { id: 'tapinak', name: 'Athena Tapınağı', at: [-36, 6], answer: 'VIII', options: ['III–V', 'VI', 'VIII'], source: SRC_EN,
    text: 'Hellenistik dönemde, Troya VIII’de (Ilion) yapılan Athena Tapınağı’nın mermer parçaları. Büyük İskender’in de Ilion’u ziyaret ettiği anlatılır.' },
  { id: 'odeon', name: 'Odeon ve Meclis Binası', at: [-44, -38], answer: 'IX', options: ['VII', 'VIII', 'IX'], source: SRC_EN,
    text: 'Küçük tiyatro (odeon) ve meclis binası (buleuterion) Roma dönemine, Troya IX’a aittir. Ilion Roma döneminde de saygın bir kentti. Troya 1998’de UNESCO Dünya Mirası listesine girdi.' },
];
export const STOPS: Stop[] = RAW.map((r) => ({ ...r, s: closestS(r.at[0], r.at[1]) }));
export const nearStop = (s: number) => STOPS.find((p) => Math.abs(s - p.s) < 7) ?? null;
export const isCorrect = (stop: Stop, pick: string) => stop.answer === null || stop.answer === pick;
