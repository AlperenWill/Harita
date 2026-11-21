/**
 * İshak Paşa Sarayı — "Taşın Nakışı": saray planı, rota, duraklar ve motif bulmacası (saf; test edilir).
 * Koordinat: metre; x doğu, z güney, y yukarı. Plan STİLİZEDİR: avluların ve yapıların yeri gerçeğe yalnızca kabaca benzer.
 *
 * Saray Doğubayazıt’ın üstünde, kayalık bir yamacın önündeki terasa kuruludur. Girişteki taç kapıdan birinci avluya,
 * oradan ikinci kapıdan iç avluya geçilir; çevresinde selamlık, cami, türbe ve harem vardır. Kuzeyde Ağrı Dağı görünür.
 * MEKANİK: her durakta aşınmış bir taş süsleme panosu vardır. Pano 3×3 parçaya bölünmüştür; parçalara dokunup çevirerek
 * motifi tamamlarsın. Ortadaki parça sabittir (yön ipucu). Tamamlanan motif 3B sahnede panonun yerine oturur.
 */
import { makeRoute } from '../shared/route';

export const TERRACE_Y = 0;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Teras düz; kuzeybatıda kayalık yamaç yükselir, güneyde ova (Doğubayazıt) aşağıda kalır */
export function heightAt(x: number, z: number): number {
  const cliff = 46 * smooth(-60, -120, z + x * 0.25), valley = -28 * smooth(60, 130, z);
  return TERRACE_Y + cliff + valley + Math.sin(x * 0.05) * Math.cos(z * 0.04) * (z > 60 || z < -60 ? 2 : 0);
}

/* ---------- rota: doğudaki taç kapıdan iç avluya, oradan güney terasa ---------- */
const WP: [number, number][] = [[86, 2], [62, 0], [48, 0], [36, 0], [24, -6], [20, -9], [8, -2], [-4, 0], [-8, 4], [-14, 0], [-22, -6], [-28, 0], [-34, 6], [-26, 14], [-20, 24], [-12, 38], [8, 46]];
export const { ROUTE_LEN, routeAt, closestS } = makeRoute(WP, heightAt);

/* ---------- motifler ve duraklar ---------- */
export type Motif = 'yildiz' | 'rumi' | 'rozet' | 'lale' | 'mukarnas' | 'zincir';
export interface Stop { id: string; name: string; stand: [number, number]; panel: { at: [number, number, number]; yaw: number; size: number }; motif: Motif; motifName: string; text: string; source: { title: string; url: string }; s: number }
const W = { title: 'Wikipedia — İshak Paşa Sarayı', url: 'https://tr.wikipedia.org/wiki/%C4%B0shak_Pa%C5%9Fa_Saray%C4%B1' }, KTB = { title: 'Kültür Portalı — İshak Paşa Sarayı', url: 'https://www.kulturportali.gov.tr/turkiye/agri/gezilecekyer/ishak-pasa-sarayi' };
const RAW: Omit<Stop, 's'>[] = [
  { id: 'tackapi', name: 'Taç Kapı', stand: [56, 0], panel: { at: [43.7, 6.5, -5.3], yaw: Math.PI / 2, size: 2.1 }, motif: 'rumi', motifName: 'Kıvrık dal (rumi) bordürü', source: W,
    text: 'Saray 1685’te Çolak Abdi Paşa tarafından başlatıldı, torunu İshak Paşa döneminde 1784’te tamamlandı. Girişteki yüksek taç kapı yoğun taş işçiliğiyle süslüdür. Kapının altın kaplamalı kanatlarının 19. yüzyıldaki Rus işgalinde götürüldüğü anlatılır.' },
  { id: 'selamlik', name: 'Selamlık', stand: [20, -9], panel: { at: [20, 4.5, -23.88], yaw: 0, size: 3.4 }, motif: 'yildiz', motifName: 'Sekiz kollu yıldız geçmesi', source: KTB,
    text: 'Selamlık, sarayın erkeklere ayrılan ve konukların ağırlandığı bölümüdür. Birinci avludan ikinci avluya geçilir; avlular sarayı halka açık ve özel bölümlere ayırır.' },
  { id: 'turbe', name: 'Türbe', stand: [-8, 4], panel: { at: [-14.6, 3.2, -6.2], yaw: 0.45, size: 2.2 }, motif: 'lale', motifName: 'Lale ve hayat ağacı', source: W,
    text: 'İç avludaki türbe, Selçuklu kümbet geleneğini sürdüren sekizgen gövdeli, külahlı bir yapıdır. İshak Paşa ve ailesinden kişilerin burada gömülü olduğu kabul edilir. Cephesinde bitkisel ve geometrik kabartmalar vardır.' },
  { id: 'cami', name: 'Cami ve minare', stand: [-22, -6], panel: { at: [-26.5, 4.3, -22.9], yaw: 0, size: 2.6 }, motif: 'zincir', motifName: 'Zincir geçme (örgü)', source: KTB,
    text: 'Sarayın kubbeli camisi ve iki renkli taşlarla örülmüş minaresi iç avlunun kuzeyindedir. Sarayda Osmanlı, Selçuklu ve İran mimari üslupları bir arada görülür.' },
  { id: 'harem', name: 'Harem ve Tören Salonu', stand: [-34, 6], panel: { at: [-41.85, 5, 3.1], yaw: Math.PI / 2, size: 3 }, motif: 'mukarnas', motifName: 'Mukarnas (stalaktit) dizisi', source: W,
    text: 'Harem, ailenin yaşadığı bölümdür; tören salonu sarayın en görkemli mekânlarındandır. Duvarların içinden geçen kanallarla odaların ısıtıldığı bir sistem bulunduğu bilinir. Sarayda 366 oda olduğu söylenir; bu sayı kaynaklarda kesin değildir.' },
  { id: 'teras', name: 'Teras: Ağrı Dağı’na bakış', stand: [8, 46], panel: { at: [13, 1.9, 40], yaw: -0.6, size: 1.8 }, motif: 'rozet', motifName: 'Güneş kursu (rozet)', source: KTB,
    text: 'Saray İpek Yolu’nun geçtiği ovaya bakar. Arkasındaki kayalıkta Eski Bayazıt kalesinin kalıntıları, kuzeyde ise Türkiye’nin en yüksek dağı Ağrı Dağı (5.137 m) görülür.' },
];
export const STOPS: Stop[] = RAW.map((r) => ({ ...r, s: closestS(r.stand[0], r.stand[1]) }));
export const nearStop = (s: number) => STOPS.find((p) => Math.abs(s - p.s) < 6) ?? null;

/* ---------- 3×3 döndürme bulmacası ---------- */
export const GRID = 3, CENTER = 4;
/** Her parça için çeyrek tur sayısı (0 = doğru). Orta parça sabit; en az 4 parça yanlış başlar. */
export function scramble(seed: number): number[] {
  let s = seed * 9301 + 49297; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (;;) { const a = Array.from({ length: GRID * GRID }, (_, i) => (i === CENTER ? 0 : Math.floor(r() * 4))); if (a.filter((x) => x).length >= 4) return a; }
}
export const rotateTile = (a: number[], i: number) => (i === CENTER ? a : a.map((v, k) => (k === i ? (v + 1) % 4 : v)));
export const isSolved = (a: number[]) => a.every((v) => v === 0);
