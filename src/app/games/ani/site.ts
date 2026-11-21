/**
 * Ani — "Bin Bir Kilise Kenti": plato, kanyonlar, rota ve fotoğraf noktaları (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Plan STİLİZEDİR: yapıların yerleri gerçek düzene yalnızca kabaca benzer.
 *
 * Ani, doğusundaki Arpaçay ve batısındaki Alaca Çay kanyonlarının arasında kalan üçgen bir platodadır; kuzeyi surlarla kapanır.
 * Oyuncu bir belgeleme ekibinin fotoğrafçısıdır: her yapının yanında onu vizöre alıp çeker, belge albümünü doldurur.
 */
import { makeRoute } from '../shared/route';

export const GORGE_DEPTH = 42;
export const WALL_Z = -150;
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Platonun kenarına uzaklık (içeride artı): doğu = Arpaçay, batı = Alaca Çay, güney ucu */
export function edgeDist(x: number, z: number) {
  const zz = Math.max(0, z), east = 150 - 0.3 * zz - x, west = x - (-150 + 0.4 * zz), south = 300 - z;
  return Math.min(east, west, south);
}
export function heightAt(x: number, z: number): number {
  const e = edgeDist(x, z), n = (hash(Math.floor(x / 8), Math.floor(z / 8)) - 0.5) * 0.35 + Math.sin(x * 0.02) * Math.cos(z * 0.017) * 0.8;
  if (e >= 0) return n;
  return n * 0.3 - GORGE_DEPTH * smooth(0, 9, -e) + Math.min(14, Math.max(0, -e - 50) * 0.06);   // dik kanyon duvarı, karşı yamaçta hafif yükseliş
}

/* ---------- rota: kuzeydeki Aslanlı Kapı'dan güney ucundaki Kız Kalesi'ne ---------- */
const WP: [number, number][] = [[0, -205], [0, -168], [0, -150], [0, -120], [-5, -60], [0, -24], [30, 20], [70, 40], [74, 90], [60, 130], [70, 165], [91, 186], [60, 220], [30, 262], [18, 292]];
export const { ROUTE_LEN, routeAt, closestS } = makeRoute(WP, heightAt);

/* ---------- fotoğraf noktaları ---------- */
export interface Shot { id: string; name: string; stand: [number, number]; target: [number, number, number]; text: string; source: { title: string; url: string }; s: number }
const W = { title: 'Wikipedia — Ani', url: 'https://tr.wikipedia.org/wiki/Ani' }, UN = { title: 'UNESCO — Archaeological Site of Ani', url: 'https://whc.unesco.org/en/list/1518' };
const RAW: Omit<Shot, 's'>[] = [
  { id: 'surlar', name: 'Surlar ve Aslanlı Kapı', stand: [0, -178], target: [0, 5, WALL_Z], source: W,
    text: 'Kente kuzeydeki çifte surlardan, Aslanlı Kapı’dan girilir. Kapının adı yanındaki aslan kabartmasından gelir. Surların öteki iki yanını kanyonlar korur: doğuda Arpaçay, batıda Alaca Çay.' },
  { id: 'katedral', name: 'Ani Katedrali', stand: [0, -24], target: [20, 8, 6], source: W,
    text: 'Katedral 10. yüzyılın sonunda başlanıp 1001 civarında bitirildi; mimarı Trdat olarak bilinir. Kubbesi 14. yüzyıldaki bir depremde çöktü, bir köşesi de 1988 depreminde yıkıldı. Cephelerdeki sivri kemerli kör nişler dikkat çeker.' },
  { id: 'menucehr', name: 'Ebul Menuçehr Camii', stand: [72, 50], target: [112, 6, 62], source: W,
    text: 'Arpaçay kanyonunun kenarındaki cami, 11. yüzyılda Şeddadi beyi Ebul Menuçehr döneminde yapıldı. Anadolu’da Türklerin inşa ettiği ilk camilerden biri sayılır. Sekizgen minaresi kentin silüetinde hemen fark edilir. Kemer ve tavanlarda iki renkli taş işçiliği vardır.' },
  { id: 'tigran', name: 'Tigran Honents Kilisesi', stand: [60, 128], target: [92, 6, 142], source: UN,
    text: '1215’te tüccar Tigran Honents tarafından yaptırılan kilise, iç duvarlarındaki fresklerle tanınır. Ani o yıllarda Gürcü krallığının yönetimindeydi. Konik kubbesi bugün de yerindedir.' },
  { id: 'kopru', name: 'Arpaçay Köprüsü kalıntısı', stand: [91, 186], target: [116, -32, 236], source: W,
    text: 'Kanyonun dibinde, kenti İpek Yolu’na bağlayan Ortaçağ köprüsünün ayakları durur. Kemer yıkılmıştır. Arpaçay bugün Türkiye ile Ermenistan arasındaki sınırdır, karşı yaka sınırın öbür tarafıdır.' },
  { id: 'kizkalesi', name: 'Kız Kalesi', stand: [18, 292], target: [24, -14, 336], source: UN,
    text: 'Platonun güney ucunda, iki kanyonun birleştiği yerde, kayalık bir çıkıntının üstünde küçük bir kilise ve kale kalıntısı vardır. Ani 2016’da UNESCO Dünya Mirası listesine girdi.' },
];
export const SHOTS: Shot[] = RAW.map((r) => ({ ...r, s: closestS(r.stand[0], r.stand[1]) }));
export const nearShot = (s: number) => SHOTS.find((p) => Math.abs(s - p.s) < 9) ?? null;
/** Vizör: yatay açı farkı (radyan). Dokunmatikte eğim kontrolü yok, bu yüzden yalnızca yön sayılır. */
export const AIM_TOL = 0.24;
export function aimError(cam: [number, number], forward: [number, number], target: [number, number]) {
  const dx = target[0] - cam[0], dz = target[1] - cam[1], a = Math.atan2(dx, dz) - Math.atan2(forward[0], forward[1]);
  return Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
}
