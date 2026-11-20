/**
 * OYNANABİLİR YERLER — haritanın TEK kaynağı.
 *
 * Harita yalnızca bu listedeki yerleri gösterir: oyunu olmayan bölge ve iller gri kalır, tıklanmaz.
 * Yeni bir oyun eklemek = bu listeye bir satır eklemek (ayrıntı: docs/OYUN-EKLEME.md).
 *
 * Kapsam ilkesi: popüler yerler "detaylı" (uzun, zengin oyun), az bilinen yerler "kisa" (hızlı, hafif oyun).
 * Her ilde bütün noktaları yapmak yerine en değerli 1–2 yer seçilir.
 *
 * id: miras verisindeki (src/data/heritage/*) nokta kimliği → bilgi, fotoğraf (Vikipedi) ve konum oradan da doğrulanır (tests/playables.test.ts).
 * kind: 'route' = uygulama içi sayfa (src/app/pages + App.tsx rotası), 'static' = public/ altında bağımsız klasör (zip ile gelen oyunlar).
 */
export type PlayableKind = 'route' | 'static';
export type PlayableDepth = 'detayli' | 'kisa';

export interface Playable {
  id: string;
  name: string;
  /** GeoJSON il adı (ör. "Afyon", "İstanbul") */
  province: string;
  /** [boylam, enlem] */
  coord: [number, number];
  /** Oyunun adı (kartta ve düğmede) */
  title: string;
  emoji: string;
  /** Bir cümlelik tanıtım */
  blurb: string;
  kind: PlayableKind;
  /** route: '/oyun/...' gibi uygulama yolu (baştaki / olmadan); static: 'klasor/index.html' */
  path: string;
  depth: PlayableDepth;
  /** tr.wikipedia başlığı (kart fotoğrafı) */
  wiki?: string;
}

export const PLAYABLES: Playable[] = [
  // ---- İstanbul ----
  { id: 'ayasofya', name: 'Ayasofya', province: 'İstanbul', coord: [28.9802, 41.0086], title: 'Işığın ve Taşın Dansı', emoji: '🕌', blurb: 'Kubbenin altında ışığı ve mozaikleri keşfet.', kind: 'route', path: 'oyun/ayasofya', depth: 'detayli', wiki: 'Ayasofya' },
  { id: 'topkapi', name: 'Topkapı Sarayı', province: 'İstanbul', coord: [28.9834, 41.0115], title: 'Harem’in Fısıltıları', emoji: '🏰', blurb: 'Avlulardan Harem’e sarayın gizli köşelerinde dolaş.', kind: 'route', path: 'oyun/topkapi', depth: 'detayli', wiki: 'Topkapı_Sarayı' },
  { id: 'yerebatan', name: 'Yerebatan Sarnıcı', province: 'İstanbul', coord: [28.9779, 41.0084], title: 'Suyun Altındaki Işık', emoji: '🕯️', blurb: 'Sütunlar arasında, suyun üstünde yürü.', kind: 'route', path: 'oyun/yerebatan', depth: 'detayli', wiki: 'Yerebatan_Sarnıcı' },
  { id: 'galata', name: 'Galata Kulesi', province: 'İstanbul', coord: [28.9742, 41.0256], title: 'Zamanın Nefesi', emoji: '🗼', blurb: 'Kuleye tırman, İstanbul’u yukarıdan izle.', kind: 'route', path: 'oyun/galata-kulesi', depth: 'detayli', wiki: 'Galata_Kulesi' },
  { id: 'kiz-kulesi', name: 'Kız Kulesi', province: 'İstanbul', coord: [29.0041, 41.0211], title: 'Vapur Yolculuğu', emoji: '🚢', blurb: 'Vapurla adaya geç, kulenin hikâyesini dinle.', kind: 'route', path: 'oyun/kiz-kulesi', depth: 'detayli', wiki: 'Kız_Kulesi' },
  { id: 'kapalicarsi', name: 'Kapalıçarşı', province: 'İstanbul', coord: [28.9680, 41.0106], title: 'Bin Dükkânın Sırrı', emoji: '🏪', blurb: 'Çarşının sokaklarında kayıp eşyanın izini sür.', kind: 'route', path: 'oyun/kapalicarsi', depth: 'detayli', wiki: 'Kapalıçarşı' },
  { id: 'dolmabahce', name: 'Dolmabahçe Sarayı', province: 'İstanbul', coord: [29.0000, 41.0392], title: 'Kristal ve Işığın İhtişamı', emoji: '💎', blurb: 'Salonlarda parlayan on nesneyi bul.', kind: 'route', path: 'oyun/dolmabahce', depth: 'detayli', wiki: 'Dolmabahçe_Sarayı' },
  // ---- Ankara ----
  { id: 'anitkabir', name: 'Anıtkabir', province: 'Ankara', coord: [32.8370, 39.9250], title: '3D Anıtkabir’i Keşfet', emoji: '🏛️', blurb: 'Aslanlı Yol’dan Şeref Holü’ne yürü.', kind: 'route', path: 'anit/ankara-anitkabir', depth: 'detayli', wiki: 'Anıtkabir' },
  // ---- Kapadokya ----
  { id: 'goreme', name: 'Kapadokya (Göreme)', province: 'Nevşehir', coord: [34.8450, 38.6400], title: 'Gün Doğumunda Balon', emoji: '🎈', blurb: 'Balonla peribacalarının üstünde uç; yönü rüzgâr katmanlarıyla seç.', kind: 'route', path: 'oyun/kapadokya', depth: 'detayli', wiki: 'Kapadokya' },
  // ---- Ege ----
  { id: 'efes', name: 'Efes Antik Kenti', province: 'İzmir', coord: [27.3417, 37.9395], title: 'Zaman Penceresi', emoji: '🏛️', blurb: 'Mermer caddelerden Celsus’a ve tiyatroya yürü; yıkık yapılar Roma dönemine dönsün.', kind: 'route', path: 'oyun/efes', depth: 'detayli', wiki: 'Efes' },
  // ---- Güneydoğu ----
  { id: 'balikligol', name: 'Balıklıgöl', province: 'Şanlıurfa', coord: [38.7860, 37.1460], title: 'Urfa’nın Minik Kâşifleri', emoji: '🐟', blurb: 'Göl bahçesinde küçük kâşiflerle oyna.', kind: 'static', path: 'sanliurfa-oyun/index.html', depth: 'kisa', wiki: 'Balıklıgöl' },
  { id: 'nemrut', name: 'Nemrut Dağı', province: 'Adıyaman', coord: [38.7410, 37.9810], title: 'Tanrıların Alacakaranlığı', emoji: '⛰️', blurb: 'Dev başlar arasında gün doğumunu bekle.', kind: 'route', path: 'oyun/nemrut', depth: 'detayli', wiki: 'Nemrut_Dağı' },
  // ---- Karadeniz ----
  { id: 'zilkale', name: 'Zil Kale', province: 'Rize', coord: [41.0667, 40.9581], title: 'Sis İçindeki İzler', emoji: '🌫️', blurb: 'Sisli Fırtına Vadisi’nden kaleye yürü.', kind: 'route', path: 'oyun/zilkale', depth: 'detayli', wiki: 'Zilkale' },
];

export const PLAYABLE_BY_ID = new Map(PLAYABLES.map((p) => [p.id, p]));
export const playablesIn = (province: string) => PLAYABLES.filter((p) => p.province === province);
export const PLAYABLE_PROVINCES = new Set(PLAYABLES.map((p) => p.province));

/** Oyunun tam adresi (uygulama tabanına göre) */
export const playableUrl = (p: Playable, base = '/') => `${base}${p.path}`;
