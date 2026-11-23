/**
 * Justinianus (Beşköprü) Köprüsü (Sakarya) — "Taş Kemerler": ovada uzanan 12 kemerli Bizans köprüsü, üstünde yürünen tabliye, iki ucunda toprak
 * yaklaşım rampaları, altından akan küçük dere, ovada yürünebilir kıyılar ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: köprü x ekseni boyunca uzanır; kemer açıklıkları z yönünde (dere z ekseninde akar). Tabliyeye uçlardaki rampadan çıkılır; köprü ovadan yandan kemerleriyle görülür. Ölçüler, kemer sayısı dışında TEMSİLÎDİR: gerçek köprü kaynaklara göre 365–430 m'dir, oyunda 152 m (docs/JUSTINIANUS.md).
 */
export type V2 = [number, number];

/** Tabliye yarı uzunluğu, rampa sonu, yarı genişlik ve yükseklik */
export const DECK_X = 76, RAMP_X = 116, HALF_W = 4.9, DECK_H = 8;
export const ARCHES = 12;
/** Parapet bandı: tabliyenin ve rampanın iki yanında yürünmez şerit */
export const BAND = 0.8;
/** Yürünebilir ova */
export const AREA = { x0: -146, x1: 146, z0: -50, z1: 50 };
/** Dere (z yönünde akar): orta kemerlerin altından geçer; kıyıda sığ, yürünebilir */
export const STREAM = { x0: 2.5, x1: 10.2 };   // 7. kemerin altından geçer; ovada yürünmez, doğu yakaya köprüden geçilir

export function groundY(x: number, z: number): number {
  const ax = Math.abs(x);
  if (Math.abs(z) < HALF_W + 0.01) {
    if (ax <= DECK_X) return DECK_H;
    if (ax < RAMP_X) return DECK_H * (RAMP_X - ax) / (RAMP_X - DECK_X);
  }
  return 0;
}
export function walkable(x: number, z: number): boolean {
  if (x < AREA.x0 + 0.4 || x > AREA.x1 - 0.4 || z < AREA.z0 + 0.4 || z > AREA.z1 - 0.4) return false;
  const ax = Math.abs(x), az = Math.abs(z);
  // tabliye ve rampa yürünür; iki yanındaki parapet/yan şerit yürünmez (dik kenar); ötesi ova
  if (ax < RAMP_X + 0.3 && az >= HALF_W && az < HALF_W + BAND) return false;
  if (x > STREAM.x0 - 0.4 && x < STREAM.x1 + 0.4 && az >= HALF_W + BAND) return false;   // dere
  return true;
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  wiki: { title: 'Wikipedia — Sangarius Bridge', url: 'https://en.wikipedia.org/wiki/Sangarius_Bridge' },
  ntv: { title: 'NTV — Justinianus Köprüsü bin beş yıldır ayakta duruyor', url: 'https://www.ntv.com.tr/sanat/galeri-justinianus-koprusu-bin-bes-yildir-ayakta-duruyor,42LnXDyqskaINd9nUeuPvg' },
  ntv2: { title: 'NTV — UNESCO Dünya Miras Geçici Listesi\'ne giren Justinianus Köprüsü\'ne restorasyon projesi', url: 'https://www.ntv.com.tr/sanat/unesco-dunya-miras-gecici-listesine-girenjustinianus-koprusune-restorasyon-pro,S3gqtB9zgEGOyWq6gM94eA' },
  struct: { title: 'Structurae — Sangarius Bridge', url: 'https://structurae.net/en/structures/sangarius-bridge' },
  jhs: { title: 'Journal of Hellenic Studies — Justinian\'s bridge over the Sangarius and the date of Procopius\' De Aedificiis', url: 'https://www.sciencegate.app/document/10.2307/631526' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 5.2): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('kopru', 'Justinianus\'un köprüsü', 'Köprü', [0, 0], gy(0, 0, 3.6),
    'Köprü, Doğu Roma İmparatoru Justinianus döneminde yaklaşık MS 562\'de tamamlandı. Beşköprü köyünde, Adapazarı\'nın birkaç kilometre güneybatısında yer alır. Kaynaklar yapım tarihini kesin vermez; bir inceleme, yapının 559–562 arasında yapıldığını tartışır.', SRC.wiki, 6.5),
  mk('kemer', 'On iki kemer', 'Mimari', [-30, 12.5], gy(-30, 12.5, 7),
    'Köprü 12 kemer gözünden oluşur. Uzunluğu kaynaklarda farklı verilir: 365, 384 ve 429–430 m gibi değerler geçer; genişliği yaklaşık 9,85 m olarak aktarılır. Oyundaki köprü 152 m uzunluğundadır; yani gerçekten kısadır.', SRC.ntv, 5.8),
  mk('duba', 'Taş köprüden önce', 'Tarih', [-12, -14], gy(-12, -14, 3.6),
    'Prokopios, taş köprüden önce nehrin üzerinde ahşap bir dubalı köprü bulunduğunu, bu köprünün taşkınlarda sık sık sürüklendiğini ve birçok kişinin ölümüne yol açtığını anlatır.', SRC.wiki, 5.2),
  mk('dere', 'Çark Deresi', 'Akarsu', [-2.5, 22], gy(-2.5, 22, 3.6),
    'Köprü bugün Sakarya Nehri\'nin değil, Sapanca Gölü yönünden gelen küçük Çark Deresi\'nin (antik adı Melas) üzerinde durur; Sakarya\'nın bugünkü yatağı yaklaşık 3 km doğudadır. Nehrin yatağını değiştirdiği bir yorum olarak aktarılır; kesin bir bilgi sayılmaz.', SRC.wiki, 5.2),
  mk('unesco', 'Geçici liste', 'Koruma', [60, 0], gy(60, 0, 3.6),
    'Köprü, NTV\'ye göre 2018\'de UNESCO Dünya Mirası Geçici Listesi\'ne alındı; ardından restorasyon projesi hazırlandı. Geçici liste, bir yerin Dünya Mirası adaylığı için ilk adımdır; alanın listeye girdiği anlamına gelmez.', SRC.ntv2, 6),
];
export const START: { at: V2; yaw: number } = { at: [-132, 14], yaw: -1.5708 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -150, x1: 150, z0: -54, z1: 54 };
