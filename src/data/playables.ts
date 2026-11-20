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
  // ---- Çanakkale ----
  { id: 'troya', name: 'Troya', province: 'Çanakkale', coord: [26.2389, 39.9575], title: 'Dokuz Kent', emoji: '🐴', blurb: 'Üst üste kurulmuş dokuz kenti gez; her yapının hangi katmana ait olduğunu bul.', kind: 'route', path: 'oyun/troya', depth: 'detayli', wiki: 'Truva' },
  // ---- Ankara ----
  { id: 'anitkabir', name: 'Anıtkabir', province: 'Ankara', coord: [32.8370, 39.9250], title: '3D Anıtkabir’i Keşfet', emoji: '🏛️', blurb: 'Aslanlı Yol’dan Şeref Holü’ne yürü.', kind: 'route', path: 'anit/ankara-anitkabir', depth: 'detayli', wiki: 'Anıtkabir' },
  // ---- Kapadokya ----
  { id: 'goreme', name: 'Kapadokya (Göreme)', province: 'Nevşehir', coord: [34.8450, 38.6400], title: 'Gün Doğumunda Balon', emoji: '🎈', blurb: 'Balonla peribacalarının üstünde uç; yönü rüzgâr katmanlarıyla seç.', kind: 'route', path: 'oyun/kapadokya', depth: 'detayli', wiki: 'Kapadokya' },
  // ---- Konya (zip ile gelen bağımsız oyun: public/konya-kayip-miras) ----
  { id: 'mevlana', name: 'Mevlana Müzesi', province: 'Konya', coord: [32.5048, 37.8705], title: 'Kayıp Miras: Mevlâna', emoji: '🌀', blurb: 'Türbe, avlu ve Mevlevi kültürü: 4 araştırma görevi.', kind: 'static', path: 'konya-kayip-miras/index.html?mekan=mevlana', depth: 'detayli', wiki: 'Mevlana Müzesi' },
  { id: 'catalhoyuk', name: 'Çatalhöyük', province: 'Konya', coord: [32.8280, 37.6670], title: 'Kayıp Miras: Çatalhöyük', emoji: '🏺', blurb: 'Damdan girilen evler ve Neolitik ev içi yaşam: 3 araştırma görevi.', kind: 'static', path: 'konya-kayip-miras/index.html?mekan=catalhoyuk', depth: 'detayli', wiki: 'Çatalhöyük' },
  { id: 'karatay', name: 'Karatay Medresesi', province: 'Konya', coord: [32.4950, 37.8747], title: 'Kayıp Miras: Karatay', emoji: '🔷', blurb: 'Taçkapı, çini sanatı ve kapalı avlulu medrese: 3 araştırma görevi.', kind: 'static', path: 'konya-kayip-miras/index.html?mekan=karatay', depth: 'detayli', wiki: 'Karatay Medresesi' },
  // ---- Antalya (zip ile gelen bağımsız oyun: public/antalya-kayip-kayitlar; üç kent = üç mini oyun) ----
  { id: 'perge', name: 'Perge Antik Kenti', province: 'Antalya', coord: [30.8540, 36.9612], title: 'Kayıp Kayıtlar: Perge', emoji: '🏛️', blurb: 'Yuvarlak kuleli kapıdan gir, kentin su kanalını izle, kayıtları tamamla.', kind: 'static', path: 'antalya-kayip-kayitlar/index.html?mekan=perge', depth: 'detayli', wiki: 'Perge' },
  { id: 'side', name: 'Side Antik Kenti', province: 'Antalya', coord: [31.3890, 36.7660], title: 'Kayıp Kayıtlar: Side', emoji: '⛵', blurb: 'Liman kentinde Rehber Deniz’le kanıtları incele.', kind: 'static', path: 'antalya-kayip-kayitlar/index.html?mekan=side', depth: 'detayli', wiki: 'Side' },
  { id: 'aspendos', name: 'Aspendos Tiyatrosu', province: 'Antalya', coord: [31.1720, 36.9390], title: 'Kayıp Kayıtlar: Aspendos', emoji: '🎭', blurb: 'Antik dünyanın en iyi korunmuş tiyatrolarından birinde kayıtların izini sür.', kind: 'static', path: 'antalya-kayip-kayitlar/index.html?mekan=aspendos', depth: 'detayli', wiki: 'Aspendos' },
  // ---- Ege ----
  { id: 'efes', name: 'Efes Antik Kenti', province: 'İzmir', coord: [27.3417, 37.9395], title: 'Zaman Penceresi', emoji: '🏛️', blurb: 'Mermer caddelerden Celsus’a ve tiyatroya yürü; yıkık yapılar Roma dönemine dönsün.', kind: 'route', path: 'oyun/efes', depth: 'detayli', wiki: 'Efes' },
  { id: 'hierapolis', name: 'Pamukkale ve Hierapolis', province: 'Denizli', coord: [29.1250, 37.9250], title: 'Beyaz Basamaklar', emoji: '🏞️', blurb: 'Travertenleri çıplak ayakla tırman, kurumuş havuzlara suyu yönlendir.', kind: 'route', path: 'oyun/pamukkale', depth: 'detayli', wiki: 'Pamukkale' },
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
