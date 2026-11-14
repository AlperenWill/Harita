/**
 * Galata Kulesi — teras panoraması: dört önceden belirlenmiş tarihi bakış noktası (saf; test edilir).
 * Yönler gerçek koordinatlardan hesaplanır (kuzey = 0°, saat yönünde). Serbest dönüş yok:
 * oyuncu yalnızca bu dört nokta arasında yatay kaydırır.
 */
export const GALATA: [number, number] = [28.97413, 41.02562];   // [boylam, enlem]

export interface Viewpoint { id: string; name: string; coord: [number, number]; era: string; text: string; source: { title: string; url: string } }
export const VIEWPOINTS: Viewpoint[] = [
  { id: 'suleymaniye', name: 'Süleymaniye Camii', coord: [28.96403, 41.01611], era: 'Osmanlı · 1550–1557',
    text: 'Mimar Sinan’ın Kanuni Sultan Süleyman için yaptığı külliye, Haliç’in karşı yamacında tepeyi taçlandırır. Kuleden bakınca Tarihi Yarımada’nın silueti bu kubbeyle başlar.',
    source: { title: 'UNESCO — Historic Areas of Istanbul', url: 'https://whc.unesco.org/en/list/356/' } },
  { id: 'ayasofya', name: 'Ayasofya', coord: [28.98008, 41.00854], era: 'Bizans · 537',
    text: 'Galata Kulesi’nden yaklaşık 800 yıl önce yapılmış dev kubbe. Ceneviz gözcüleri de aynı kubbeye bakıyordu: kule yapıldığında Ayasofya Bizans’ın büyük kilisesiydi.',
    source: { title: 'UNESCO — Historic Areas of Istanbul', url: 'https://whc.unesco.org/en/list/356/' } },
  { id: 'kiz-kulesi', name: 'Kız Kulesi', coord: [29.00412, 41.02109], era: 'Bizans → Osmanlı',
    text: 'Boğaz’ın girişinde, Üsküdar açığındaki küçük adada duran kule. Efsaneye göre Hezarfen Ahmed Çelebi 17. yüzyılda Galata Kulesi’nden kanatlarla bu kıyıya, Üsküdar’a süzülmüştü.',
    source: { title: 'Wikipedia — Galata Tower', url: 'https://en.wikipedia.org/wiki/Galata_Tower' } },
  { id: 'bogaz', name: 'Boğaziçi', coord: [29.012, 41.04], era: 'Bugün',
    text: 'Kuzeydoğuda Boğaz’ın kıyıları uzanır. Osmanlı döneminde kule yangın gözetleme kulesi olarak kullanıldı; gözcüler buradan şehrin dört bir yanını izlerdi.',
    source: { title: 'Kültür Envanteri — Galata Kulesi', url: 'https://kulturenvanteri.com/en/yer/galata-kulesi/' } },
];

const M_PER_DEG_LAT = 111_320;
/** Kuleye göre yerel düzlem (m): x doğu, z güney (three.js'te -z kuzeydir) */
export function toLocal([lon, lat]: [number, number]): [number, number] {
  const x = (lon - GALATA[0]) * M_PER_DEG_LAT * Math.cos((GALATA[1] * Math.PI) / 180);
  const z = -(lat - GALATA[1]) * M_PER_DEG_LAT;
  return [x, z];
}
/** Pusula yönü (derece, kuzey = 0, doğu = 90) */
export function bearingOf(coord: [number, number]): number {
  const [x, z] = toLocal(coord);
  return ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
}
export const distanceOf = (coord: [number, number]) => Math.hypot(...toLocal(coord));
/** Pusula yönü → three.js kamera yaw (kamera -z'ye bakar; yaw pozitif = sola dönüş) */
export const yawFor = (bearingDeg: number) => -(bearingDeg * Math.PI) / 180;

/**
 * Kaba su maskesi (Haliç, Boğaz, Marmara) — yalnızca şehir dokusunu yerleştirmek için; harita doğruluğunda değildir.
 * Yerel koordinatlarda (m).
 */
export function isWater(x: number, z: number): boolean {
  // Haliç: Karaköy–Eminönü arasından kuzeybatıya kıvrılan dar körfez
  const hx = x + 200, center = 560 - Math.max(0, -hx) * 0.35, half = Math.max(110, 230 - Math.max(0, -hx) * 0.04);
  if (x < 900 && x > -4500 && Math.abs(z - center) < half) return true;
  // Boğaz: Karaköy'ün doğusu, Üsküdar kıyısına kadar; kuzeye doğru biraz daralır
  const west = 650 + Math.max(0, -z) * 1.1, east = 3100 + Math.max(0, -z) * 0.4;
  if (x > west && x < east && z < 1200) return true;
  // Marmara: Sarayburnu'nun güneydoğusu
  if (z > 1200 && x > 900 + (z - 1200) * -0.2) return true;
  if (z > 2600) return true;
  return false;
}
