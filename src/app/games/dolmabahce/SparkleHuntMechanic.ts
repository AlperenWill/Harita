/**
 * Dolmabahçe — Parıltı Avı mekaniği (saf; test edilir): parlayan nesneler, nabız (emissive pulse), yaklaşma algılama, en yakın nesne.
 *
 * NABIZ MATEMATİĞİ: parlaklık(t) = taban + genlik · ((1 + sin(2π·f·t + φ)) / 2)^2
 *   Kare alma, tepeyi sivriltir ve vadiyi uzatır: nesne çoğu zaman sakin, kısa anlarda "göz kırpar" gibi parlar (sürekli yanıp sönme
 *   lüks bir mekânda ucuz durur). Her nesnenin fazı φ farklıdır; hepsi aynı anda parlamaz. Bulunan nesnenin genliği 0,15'e iner.
 *   Pil tasarrufunda nabız kapanır: parlaklık sabit (taban + genlik/2).
 * YAKLAŞMA: oyuncunun rota konumu s ile nesnenin rotadaki izdüşümü sAnchor arasındaki fark |s − sAnchor| < reach → "İncele" düğmesi.
 *   3B uzaklık yerine rota farkı kullanılır: üst kattaki nesne alt kattan "yakın" sayılmaz.
 */
import { CHANDELIER, STAIR, SUFERA_CHANDELIER, UPPER, closestS, stairPoint, type V3 } from './palace';

export type Material = 'kristal' | 'altin' | 'hali' | 'mermer' | 'saat';
export interface Sparkle {
  id: string; name: string; material: Material; matLabel: string; pos: V3; reach: number; text: string; source: { title: string; url: string };
  cam: { from: V3; look: V3; fov: number }; sAnchor: number; phase: number;
}
const SRC = {
  wiki: { title: 'Wikipedia — Dolmabahçe Palace', url: 'https://en.wikipedia.org/wiki/Dolmabah%C3%A7e_Palace' },
  brit: { title: 'Britannica — Dolmabahçe Palace', url: 'https://www.britannica.com/topic/Dolmabahce-Palace' },
  sabah: { title: 'Daily Sabah — Silent witness of 166 years of history', url: 'https://www.dailysabah.com/arts/silent-witness-of-166-years-of-history-dolmabahce-palace/news' },
  archnet: { title: 'Archnet — Dolmabahçe Sarayı', url: 'https://archnet.org/sites/3475' },
};
type Raw = Omit<Sparkle, 'sAnchor' | 'phase'>;
const RAW: Raw[] = [
  { id: 'aynali-konsol', name: 'Yaldızlı ayna ve konsol', material: 'altin', matLabel: 'Altın varak, ayna camı · 19. yüzyıl', pos: [-8.6, 2.4, 7], reach: 3.2,
    text: 'Girişteki salonda yaldızlı çerçeveli büyük aynalar mekânı olduğundan geniş gösterir. Sarayın tavan ve süslemelerinde kullanılan altın varağın toplamı kaynaklarda sıkça 14 ton olarak anılır.', source: SRC.wiki, cam: { from: [-5.2, 2.2, 7.4], look: [-8.6, 2.3, 7], fov: 38 } },
  { id: 'samdan', name: 'Kristal şamdan', material: 'kristal', matLabel: 'Kesme kristal, yaldızlı bronz', pos: [8.2, 1.35, 5], reach: 3,
    text: 'Konsolların üstündeki kesme kristal şamdanlar mum ışığını yüzlerce yüzeyde kırar. Saray Avrupa’dan getirilen kristal ve yaldızlı eşyalarıyla tanınır.', source: SRC.brit, cam: { from: [6.3, 1.7, 5.6], look: [8.2, 1.35, 5], fov: 30 } },
  { id: 'muayede-avize', name: 'Muayede Salonu avizesi', material: 'kristal', matLabel: 'Bohem kristali · ~4,5 ton · 750 lamba', pos: [CHANDELIER.x, CHANDELIER.y, CHANDELIER.z], reach: 5,
    text: 'Muayede Salonu’nun kubbesinden sarkan dev kristal avizenin yaklaşık 4,5 ton ağırlığında ve 750 lambalı olduğu yazılır. Kraliçe Victoria’nın hediyesi olduğu sık anlatılır; ancak bu bilgi kaynaklarda tartışmalıdır.', source: SRC.wiki, cam: { from: [4, 3.2, -16], look: [CHANDELIER.x, CHANDELIER.y - 1, CHANDELIER.z], fov: 50 } },
  { id: 'hereke', name: 'Hereke halısı', material: 'hali', matLabel: 'İpek ve yün, el dokuması · Hereke', pos: [0, 0.05, -26], reach: 4,
    text: 'Saraydaki halıların çoğu Hereke’deki saray fabrikasında dokundu. Muayede Salonu’ndaki halı, dünyanın en büyük Hereke halılarından biri olarak anılır.', source: SRC.wiki, cam: { from: [6.5, 2.6, -21.5], look: [2, 0, -27], fov: 46 } },
  { id: 'kubbe', name: 'Muayede kubbesi ve sütunlar', material: 'altin', matLabel: 'Kalem işi, altın yaldız', pos: [0, 24, -20], reach: 4,
    text: 'Bayram tebrikleri (muayede) için kullanılan salon yaklaşık 2.000 m²’dir. Kubbe kaynaklara göre 36 m yükseklikte ve 56 sütun üzerindedir; burada ölçek kısaltılmıştır.', source: SRC.sabah, cam: { from: [12, 1.8, -8], look: [0, 22, -22], fov: 62 } },
  { id: 'kristal-korkuluk', name: 'Kristal Merdiven korkulukları', material: 'kristal', matLabel: 'Baccarat kristali, pirinç, maun', pos: stairPoint(-1, 0.45), reach: 3,
    text: 'Çift at nalı biçimindeki Kristal Merdiven’in korkulukları Baccarat kristali, pirinç ve maundan yapılmıştır. Üstündeki cam tavan merdiveni gün ışığıyla doldurur.', source: SRC.wiki, cam: { from: [STAIR.cx - 2.8, 3.2, STAIR.cz + 3.2], look: stairPoint(-1, 0.45), fov: 40 } },
  { id: 'cam-tavan', name: 'Kristal Merdiven’in cam tavanı', material: 'kristal', matLabel: 'Cam, demir çerçeve', pos: [STAIR.cx, 14.8, STAIR.cz], reach: 3.5,
    text: 'Merdiven boşluğunun tavanı camla örtülüdür; kristal korkuluklar bu tepeden gelen ışığı her basamakta yeniden parlatır.', source: SRC.wiki, cam: { from: [STAIR.cx + 1, UPPER + 1.6, -29], look: [STAIR.cx, 14.8, STAIR.cz], fov: 60 } },
  { id: 'sufera-avize', name: 'Süfera Salonu avizesi', material: 'kristal', matLabel: 'Kristal, yaldızlı bronz', pos: [SUFERA_CHANDELIER.x, SUFERA_CHANDELIER.y, SUFERA_CHANDELIER.z], reach: 3.5,
    text: 'Yabancı elçilerin kabul edildiği Süfera (Elçiler) Salonu da kristal avizesi ve yaldızlı süslemeleriyle sarayın en gösterişli odalarındandır. Saray, Bohem ve Baccarat kristal avize koleksiyonuyla tanınır.', source: SRC.brit, cam: { from: [39, UPPER + 2, -36.5], look: [SUFERA_CHANDELIER.x, SUFERA_CHANDELIER.y - 0.6, SUFERA_CHANDELIER.z], fov: 50 } },
  { id: 'yaldiz-tavan', name: 'Altın yaldızlı tavan', material: 'altin', matLabel: 'Altın varak, alçı kabartma', pos: [35, UPPER + 7.9, -45], reach: 3.5,
    text: 'Tavanlardaki kabartmalar altın varakla kaplanmıştır. Kaynaklarda sarayın tavanlarının yaldızlanmasında 14 ton altın kullanıldığı yazılır.', source: SRC.wiki, cam: { from: [33.5, UPPER + 1.7, -38], look: [35.5, UPPER + 7.9, -46], fov: 58 } },
  { id: 'saat', name: 'Saat 09.05', material: 'saat', matLabel: 'Duvar saati', pos: [51.8, UPPER + 2.2, -44], reach: 3.2,
    text: 'Atatürk 10 Kasım 1938’de saat 09.05’te bu sarayda hayatını kaybetti. Odasındaki saat o anı gösterir; sarayın saatlerinin bu saate ayarlandığı anlatılır. Yatağın üzerinde Türk bayrağı örtülüdür.', source: SRC.archnet, cam: { from: [48.5, UPPER + 1.8, -44], look: [51.8, UPPER + 2.1, -44], fov: 36 } },
];
/** Rotada nesnenin "önünde durulan" nokta (yüksekteki nesneler için zemindeki izdüşüm) */
const ANCHOR: Record<string, V3> = {
  'aynali-konsol': [0, 0, 7], samdan: [0, 0, 5], 'muayede-avize': [0, 0, -20], hereke: [6, 0, -24], kubbe: [0, 0, -8], 'kristal-korkuluk': stairPoint(-1, 0.45),
  'cam-tavan': [35, UPPER, -30.5], 'sufera-avize': [35, UPPER, -38], 'yaldiz-tavan': [38, UPPER, -42.5], saat: [47.5, UPPER, -44],
};
export const SPARKLES: Sparkle[] = RAW.map((r, i) => ({ ...r, sAnchor: closestS(ANCHOR[r.id]), phase: i * 1.37 }));

/** Nabız: taban + genlik·((1+sin)/2)²; bulunduysa genlik düşer; pil tasarrufunda sabit */
export function pulse(t: number, s: Sparkle, found: boolean, saver: boolean, base = 0.35, amp = 1.4, f = 0.45): number {
  const a = found ? 0.15 : amp;
  if (saver) return base + a / 2;
  const w = (1 + Math.sin(2 * Math.PI * f * t + s.phase)) / 2;
  return base + a * w * w;
}
/** Oyuncunun rota konumunda yakındaki nesne (en yakın) */
export function nearSparkle(s: number): Sparkle | null {
  let best: Sparkle | null = null, bd = Infinity;
  for (const k of SPARKLES) { const d = Math.abs(s - k.sAnchor); if (d < k.reach && d < bd) { bd = d; best = k; } }
  return best;
}
/** Çift dokunuş: henüz bulunmamış en yakın nesnenin rota konumu (ileri ya da geri) */
export function nextUnfound(s: number, found: string[]): Sparkle | null {
  let best: Sparkle | null = null, bd = Infinity;
  for (const k of SPARKLES) { if (found.includes(k.id)) continue; const d = Math.abs(s - k.sAnchor); if (d < bd) { bd = d; best = k; } }
  return best;
}
