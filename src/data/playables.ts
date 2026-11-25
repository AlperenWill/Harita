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
  { id: 'cumalikizik', name: 'Cumalıkızık', province: 'Bursa', coord: [29.1720, 40.1760], title: 'Kapı Kapı Cumalıkızık', emoji: '🚪', blurb: 'Renkli evlerin arasında dolaş, kapı tokmağından cumbaya köyün sırlarını bul.', kind: 'route', path: 'oyun/cumalikizik', depth: 'detayli', wiki: 'Cumalıkızık' },
  { id: 'troya', name: 'Troya', province: 'Çanakkale', coord: [26.2389, 39.9575], title: 'Dokuz Kent', emoji: '🐴', blurb: 'Üst üste kurulmuş dokuz kenti gez; her yapının hangi katmana ait olduğunu bul.', kind: 'route', path: 'oyun/troya', depth: 'detayli', wiki: 'Truva' },
  // ---- Ankara ----
  { id: 'anitkabir', name: 'Anıtkabir', province: 'Ankara', coord: [32.8370, 39.9250], title: '3D Anıtkabir’i Keşfet', emoji: '🏛️', blurb: 'Aslanlı Yol’dan Şeref Holü’ne yürü.', kind: 'route', path: 'anit/ankara-anitkabir', depth: 'detayli', wiki: 'Anıtkabir' },
  // ---- Kapadokya ----
  { id: 'cacabey', name: 'Cacabey Medresesi', province: 'Kırşehir', coord: [34.1600, 39.1460], title: 'Göğe Açılan Kubbe', emoji: '🔭', blurb: 'Kubbesindeki açıklıktan göğün kuyuya düştüğü Selçuklu medresesini keşfet.', kind: 'route', path: 'oyun/cacabey', depth: 'kisa', wiki: 'Cacabey Medresesi' },
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
  { id: 'sagalassos', name: 'Sagalassos', province: 'Burdur', coord: [30.5170, 37.6770], title: 'Dağdaki Kent', emoji: '⛲', blurb: '1500 metredeki Roma kentinde akan çeşmeleri, Heroon\'u ve Bouleuterion\'u keşfet.', kind: 'route', path: 'oyun/sagalassos', depth: 'detayli', wiki: 'Sagalassos' },
  { id: 'efes', name: 'Efes Antik Kenti', province: 'İzmir', coord: [27.3417, 37.9395], title: 'Zaman Penceresi', emoji: '🏛️', blurb: 'Mermer caddelerden Celsus’a ve tiyatroya yürü; yıkık yapılar Roma dönemine dönsün.', kind: 'route', path: 'oyun/efes', depth: 'detayli', wiki: 'Efes' },
  { id: 'hierapolis', name: 'Pamukkale ve Hierapolis', province: 'Denizli', coord: [29.1250, 37.9250], title: 'Beyaz Basamaklar', emoji: '🏞️', blurb: 'Travertenleri çıplak ayakla tırman, kurumuş havuzlara suyu yönlendir.', kind: 'route', path: 'oyun/pamukkale', depth: 'detayli', wiki: 'Pamukkale' },
  // ---- Güneydoğu ----
  { id: 'balikligol', name: 'Balıklıgöl', province: 'Şanlıurfa', coord: [38.7860, 37.1460], title: 'Urfa’nın Minik Kâşifleri', emoji: '🐟', blurb: 'Göl bahçesinde küçük kâşiflerle oyna.', kind: 'static', path: 'sanliurfa-oyun/index.html', depth: 'kisa', wiki: 'Balıklıgöl' },
  { id: 'nemrut', name: 'Nemrut Dağı', province: 'Adıyaman', coord: [38.7410, 37.9810], title: 'Tanrıların Alacakaranlığı', emoji: '⛰️', blurb: 'Dev başlar arasında gün doğumunu bekle.', kind: 'route', path: 'oyun/nemrut', depth: 'detayli', wiki: 'Nemrut_Dağı' },
  // ---- Doğu Anadolu ----
  { id: 'seytan-kalesi', name: 'Şeytan Kalesi', province: 'Ardahan', coord: [43.0100, 41.0700], title: 'Uçurumdaki Kale', emoji: '🦇', blurb: 'Karaçay Kanyonu’nun ortasındaki kayalığa geç, kilise kalıntısını ve dereye inen basamakları bul.', kind: 'route', path: 'oyun/seytan-kalesi', depth: 'detayli', wiki: 'Şeytan Kalesi' },
  { id: 'munzur', name: 'Munzur Vadisi ve Gözeleri', province: 'Tunceli', coord: [39.2400, 39.3500], title: 'Kırk Göze', emoji: '💧', blurb: 'Vadi boyunca yürü, Munzur Çayı’nın doğduğu gözelere ulaş; yaban keçilerini ve endemik çiçekleri bul.', kind: 'route', path: 'oyun/munzur', depth: 'detayli', wiki: 'Munzur Gözeleri' },
  { id: 'yuzen-adalar', name: 'Solhan Yüzen Adalar', province: 'Bingöl', coord: [41.0500, 38.9500], title: 'Sal Gibi Ada', emoji: '🏝️', blurb: 'Krater gölünde rüzgârla yer değiştiren adaları keşfet; büyük adaya binip gölü geç.', kind: 'route', path: 'oyun/yuzen-adalar', depth: 'detayli', wiki: 'Yüzen Adalar' },
  { id: 'ani', name: 'Ani Ören Yeri', province: 'Kars', coord: [43.5730, 40.5070], title: 'Bin Bir Kilise Kenti', emoji: '📷', blurb: 'Kanyonlar arasındaki Ortaçağ kentini fotoğrafçı olarak belgele.', kind: 'route', path: 'oyun/ani', depth: 'detayli', wiki: 'Ani' },
  { id: 'ishakpasa', name: 'İshak Paşa Sarayı', province: 'Ağrı', coord: [44.1300, 39.5210], title: 'Taşın Nakışı', emoji: '🧩', blurb: 'Ağrı Dağı’na bakan sarayda aşınmış taş süslemeleri parça parça onar.', kind: 'route', path: 'oyun/ishakpasa', depth: 'detayli', wiki: 'İshak Paşa Sarayı' },
  { id: 'akdamar', name: 'Akdamar Kilisesi', province: 'Van', coord: [43.0360, 38.3410], title: 'Taştaki Hikâyeler', emoji: '⛵', blurb: 'Tekneyle adaya geç, kilisenin duvarlarındaki kabartma hikâyeleri bul.', kind: 'route', path: 'oyun/akdamar', depth: 'detayli', wiki: 'Akdamar Kilisesi' },
  // ---- Karadeniz ----
  { id: 'hattusa', name: 'Hattuşa', province: 'Çorum', coord: [34.6150, 40.0140], title: 'Kralın Yolu', emoji: '🦁', blurb: 'Hitit başkentinde kapı ritüellerini yerine getir, Yazılıkaya’ya ulaş.', kind: 'route', path: 'oyun/hattusa', depth: 'detayli', wiki: 'Hattuşaş' },
  { id: 'mahmutbey', name: 'Kasaba Köyü Mahmut Bey Camii', province: 'Kastamonu', coord: [33.7183, 41.4539], title: 'Çivisiz Cami', emoji: '🪵', blurb: 'Çivisiz ahşap direkleri ve kalem işi tavanıyla 1366 tarihli köy camisini keşfet.', kind: 'route', path: 'oyun/mahmutbey', depth: 'kisa', wiki: 'Mahmut Bey Camii' },
  { id: 'sinop-cezaevi', name: 'Sinop Tarihi Cezaevi', province: 'Sinop', coord: [35.1480, 42.0230], title: 'Anadolu\'nun Alkatrazı', emoji: '🔒', blurb: 'Sinop Kalesi\'nin surları içindeki eski cezaevinin koğuşlarını ve hücrelerini dolaş.', kind: 'route', path: 'oyun/sinop-cezaevi', depth: 'kisa', wiki: 'Sinop Cezaevi' },
  { id: 'diyarbakir-sur', name: 'Diyarbakır Surları ve Hevsel Bahçeleri', province: 'Diyarbakır', coord: [40.2370, 37.9100], title: 'Bazalt Surların Kitabeleri', emoji: '🏰', blurb: 'Yedi Kardeş ve Ulu Beden burçlarına yürü, sur üstüne çık, dürbünle kitabeleri bul, Hevsel\'e in.', kind: 'route', path: 'oyun/diyarbakir-sur', depth: 'detayli', wiki: 'Diyarbakır Surları' },
  { id: 'zinciriye', name: 'Zinciriye Medresesi ve Mardin Evleri', province: 'Mardin', coord: [40.7350, 37.3120], title: 'Damdan Dama', emoji: '🪜', blurb: 'Her evin damı üsttekinin terası: merdivenlerden tırman, Zinciriye\'nin damından ovaya bak.', kind: 'route', path: 'oyun/mardin', depth: 'detayli', wiki: 'Zinciriye Medresesi' },
  { id: 'hasankeyf', name: 'Hasankeyf', province: 'Batman', coord: [41.4140, 37.7130], title: 'Türbeyi Taşı', emoji: '🚚', blurb: 'Dicle kıyısını gez, Zeynel Bey Türbesi\'ni tekerlekli platformla Kültür Park\'a taşı, baraj gölünün yükselişini izle.', kind: 'route', path: 'oyun/hasankeyf', depth: 'detayli', wiki: 'Hasankeyf' },
  { id: 'tillo', name: 'Tillo ve Fakirullah Türbesi', province: 'Siirt', coord: [42.0100, 37.9200], title: 'Işık Hadisesi', emoji: '🌅', blurb: 'Yılda iki sabah güneşin ilk ışığı sandukalara düşer: doğru pencereyi aç, doğru günü bul.', kind: 'route', path: 'oyun/tillo', depth: 'kisa', wiki: 'Aydınlar, Siirt' },
  { id: 'cizre-kirmizi', name: 'Cizre Kırmızı Medrese', province: 'Şırnak', coord: [42.1900, 37.3300], title: 'Tuğla Tuğla', emoji: '🧱', blurb: 'Adını kırmızı tuğlalarından alan medresenin avlusunda eksik tuğlaları örgü desenine göre yerine koy.', kind: 'route', path: 'oyun/cizre', depth: 'kisa', wiki: 'Kırmızı Medrese' },
  { id: 'oylum', name: 'Oylum Höyük', province: 'Kilis', coord: [37.0270, 36.7286], title: 'Katman Katman', emoji: '⛏️', blurb: 'Höyüğün yamacındaki açmada kesitleri yukarıdan aşağı kaz, buluntuları çıkar, dönemleri sıraya koy.', kind: 'route', path: 'oyun/oylum', depth: 'kisa', wiki: 'Oylum Höyük' },
  { id: 'arslantepe', name: 'Arslantepe Höyüğü', province: 'Malatya', coord: [38.3610, 38.3820], title: 'Mühür ve Kapı', emoji: '🗝️', blurb: 'Aslanlı kapıdan höyüğe çık, kerpiç sarayın mühürlü depolarını doğru mühürle aç, en eski kılıçları bul.', kind: 'route', path: 'oyun/arslantepe', depth: 'detayli', wiki: 'Arslantepe' },
  { id: 'ahlat', name: 'Ahlat Selçuklu Meydan Mezarlığı', province: 'Bitlis', coord: [42.4630, 38.7570], title: 'Taştaki İmza', emoji: '🪦', blurb: 'Binlerce şahidenin arasında süslü taşların motiflerini kâğıda çıkar, aynı ustanın iki eserini bul.', kind: 'route', path: 'oyun/ahlat', depth: 'detayli', wiki: 'Ahlat Selçuklu Meydan Mezarlığı' },
  { id: 'cifte-minareli', name: 'Çifte Minareli Medrese ve Hatuniye Türbesi', province: 'Erzurum', coord: [41.2770, 39.9040], title: 'Kitabesiz Kapı', emoji: '🕌', blurb: 'Anadolu\'nun en büyük Selçuklu medresesini kim, ne zaman yaptırdı? İpuçlarını topla, iddiaları kanıtlarıyla eşleştir.', kind: 'route', path: 'oyun/cifte-minareli', depth: 'detayli', wiki: 'Çifte Minareli Medrese (Erzurum)' },
  { id: 'mama-hatun', name: 'Mama Hatun Kümbeti', province: 'Erzincan', coord: [40.3880, 39.7780], title: 'Halka Duvar', emoji: '⭕', blurb: 'Dilimli kümbeti saran yuvarlak duvarın nişlerini say, aşınmış dilimleri doğru taşla onar.', kind: 'route', path: 'oyun/mama-hatun', depth: 'kisa', wiki: 'Mama Hatun Kümbeti' },
  { id: 'harput', name: 'Harput Kalesi', province: 'Elazığ', coord: [39.2560, 38.7060], title: 'Süt Kalesi', emoji: '🥛', blurb: 'Efsaneye göre harcı sütle karılan kalenin gediğini ör; yolda Ulu Camii\'nin eğik minaresine uğra.', kind: 'route', path: 'oyun/harput', depth: 'kisa', wiki: 'Harput' },
  { id: 'malazgirt', name: 'Malazgirt Meydan Muharebesi Tarihi Millî Parkı', province: 'Muş', coord: [42.5300, 39.1430], title: 'Zaman Çizelgesi', emoji: '📜', blurb: 'Savaş alanındaki yolda panoların olaylarını topla, 1071\'den bugüne tarih sırasına diz.', kind: 'route', path: 'oyun/malazgirt', depth: 'kisa', wiki: 'Malazgirt Meydan Muharebesi' },
  { id: 'tuzluca', name: 'Tuzluca Tuz Mağaraları', province: 'Iğdır', coord: [43.6600, 40.0450], title: 'Serin Nefes', emoji: '🧂', blurb: 'Sıcak ovadan tuz galerilerine in, termometre düşerken terapi salonunda nefes ritmini tuttur.', kind: 'route', path: 'oyun/tuzluca', depth: 'kisa', wiki: 'Tuzluca' },
  { id: 'zeugma', name: 'Zeugma Mozaik Müzesi', province: 'Gaziantep', coord: [37.3840, 37.0750], title: 'Mozaiklerin Evi', emoji: '🧩', blurb: 'Fırat kıyısındaki antik Zeugma\'nın mozaiklerini ve ünlü Çingene Kız\'ı müzede dolaş.', kind: 'route', path: 'oyun/zeugma', depth: 'detayli', wiki: 'Zeugma Mozaik Müzesi' },
  { id: 'kerkenes', name: 'Kerkenes Dağı', province: 'Yozgat', coord: [34.6100, 39.7500], title: 'Taş Surlu Kent', emoji: '🏛️', blurb: 'Demir Çağı kentinin taş surlarını, kapılarını ve sokaklarını dolaş; saray kompleksini keşfet.', kind: 'route', path: 'oyun/kerkenes', depth: 'detayli', wiki: 'Kerkenes' },
  { id: 'odunpazari', name: 'Odunpazarı Evleri', province: 'Eskişehir', coord: [30.5240, 39.7640], title: 'Cumbalı Sokak', emoji: '🏘️', blurb: 'Çıkmalı ahşap konakların arasındaki dar sokakta yürü; cumbaları ve restorasyonu keşfet.', kind: 'route', path: 'oyun/odunpazari', depth: 'detayli', wiki: 'Odunpazarı' },
  { id: 'giresun-adasi', name: 'Giresun Adası', province: 'Giresun', coord: [38.4300, 40.9300], title: 'Ares\'in Adası', emoji: '⛵', blurb: 'Karadeniz\'deki kayalık adada Bizans kilisesinin kalıntılarını ve altındaki eski tapınak temellerini keşfet.', kind: 'route', path: 'oyun/giresun', depth: 'kisa', wiki: 'Giresun Island' },
  { id: 'kral-kaya', name: 'Amasya Kral Kaya Mezarları', province: 'Amasya', coord: [35.8300, 40.6540], title: 'Kayadan Ayır', emoji: '⛰️', blurb: 'Yeşilırmak kıyısındaki Yalıboyu evlerinden kaya merdiveniyle Pontus kral mezarlarına çık, yarım nişte mezar bloğunu kayadan ayır.', kind: 'route', path: 'oyun/amasya', depth: 'detayli', wiki: 'Amasya Kral Kaya Mezarları' },
  { id: 'safranbolu', name: 'Safranbolu', province: 'Karabük', coord: [32.6900, 41.2430], title: 'Dönme Dolap', emoji: '🏘️', blurb: 'Çarşıdan Cinci Hanı\'na, yokuştan Kaymakamlar Evi\'ne çık; haremden dönme dolapla selamlıktaki misafirlere ikram gönder.', kind: 'route', path: 'oyun/safranbolu', depth: 'detayli', wiki: 'Safranbolu' },
  { id: 'tokat-yazma', name: 'Tokat Yazmacılığı', province: 'Tokat', coord: [36.5450, 40.3080], title: 'Kalıp Bas', emoji: '🪡', blurb: 'Yazma atölyesinde ıhlamur kalıplarla motiflerin çizgisini bas, içlerini fırçayla boya.', kind: 'route', path: 'oyun/tokat', depth: 'kisa', wiki: 'Tokat yazması' },
  { id: 'amasra', name: 'Amasra Kalesi', province: 'Bartın', coord: [32.3870, 41.7480], title: 'Taştaki Armalar', emoji: '🛡️', blurb: 'İki limanın arasındaki kaleye gir, surlardaki Ceneviz armalarını ve kabartmaları bul, Kemere Köprüsü\'nden Boztepe\'ye geç.', kind: 'route', path: 'oyun/amasra', depth: 'kisa', wiki: 'Amasra Kalesi' },
  { id: 'bandirma-vapuru', name: 'Bandırma Vapuru Müzesi', province: 'Samsun', coord: [36.3550, 41.2680], title: 'Seyir Defteri', emoji: '🚢', blurb: 'Parktaki gemi kopyasına çık, güvertede dolaş, harita masasında 1919 yolculuğunun limanlarını sırayla işaretle.', kind: 'route', path: 'oyun/bandirma', depth: 'kisa', wiki: 'Bandırma Vapuru' },
  { id: 'ishan', name: 'İşhan Manastırı', province: 'Artvin', coord: [41.7300, 40.7700], title: 'Pencereden Bak', emoji: '⛪', blurb: 'Kazı yüzünden kapalı kilisenin pencere altındaki taşlara çık; içerideki payeleri, apsisi ve kubbedeki melekleri gör.', kind: 'route', path: 'oyun/ishan', depth: 'kisa', wiki: 'İşhan Kilisesi' },
  { id: 'yason', name: 'Yason Burnu Kilisesi', province: 'Ordu', coord: [37.6930, 41.1080], title: 'Açık Taş, Koyu Taş', emoji: '⚓', blurb: 'Denize uzanan burundaki Aziz Nikolaos Kilisesi\'nde dolaş, batı cephesinin eksik taşlarını açık-koyu düzene göre yerine koy.', kind: 'route', path: 'oyun/yason', depth: 'kisa', wiki: 'Yason Burnu' },
  { id: 'santa', name: 'Santa Harabeleri', province: 'Gümüşhane', coord: [39.6900, 40.4747], title: 'Sisteki Yedi Kilise', emoji: '🌫️', blurb: 'Sisli ladin vadisinde yedi mahallenin yıkık kiliselerini bul; her kilisede sis biraz açılır.', kind: 'route', path: 'oyun/santa', depth: 'kisa', wiki: 'Santa Harabeleri' },
  { id: 'mudurnu', name: 'Mudurnu Tarihî Çarşısı', province: 'Bolu', coord: [31.2080, 40.4630], title: 'Cuma Duası', emoji: '🕌', blurb: 'Ahi kenti Mudurnu’nun çarşısında beş ustayı bul, cuma günü çınarın altındaki esnaf duasına davet et.', kind: 'route', path: 'oyun/mudurnu', depth: 'kisa', wiki: 'Mudurnu' },
  { id: 'hakkari-medrese', name: 'Meydan Medresesi', province: 'Hakkari', coord: [43.7400, 37.5760], title: 'Biçer\'in Avlusu', emoji: '🕌', blurb: 'Kitabeli taç kapısı ve avlusuyla 1700 dolaylarındaki Hakkâri medresesini dolaş.', kind: 'route', path: 'oyun/meydan-medrese', depth: 'kisa', wiki: 'Meydan Medresesi' },
  { id: 'adada', name: 'Adada Antik Kenti', province: 'Isparta', coord: [30.9900, 37.5800], title: 'Dağ Eteğindeki Kent', emoji: '🏛️', blurb: 'Sütunlu caddede yürü; agorayı, Trajan Tapınağı kalıntısını ve yamaçtaki tiyatroyu keşfet.', kind: 'route', path: 'oyun/adada', depth: 'kisa', wiki: 'Adada' },
  { id: 'gaziantep-kale', name: 'Gaziantep Kalesi', province: 'Gaziantep', coord: [37.3830, 37.0660], title: 'Antep\'in Tepesi', emoji: '🏰', blurb: 'Kentin ortasındaki höyüğe çık; surları, burçları, hamam kalıntısını ve Panorama Müzesi\'ni dolaş.', kind: 'route', path: 'oyun/gaziantep-kalesi', depth: 'kisa', wiki: 'Gaziantep Kalesi' },
  { id: 'kyzikos', name: 'Kyzikos Antik Kenti', province: 'Balıkesir', coord: [27.8800, 40.3900], title: 'Hadrian\'ın Tapınağı', emoji: '🏛️', blurb: 'Erdek\'teki antik kentte devasa sütun başlığını, kırık sütunları ve amfiteatr çanağını keşfet.', kind: 'route', path: 'oyun/kyzikos', depth: 'kisa', wiki: 'Kyzikos' },
  { id: 'seka', name: 'SEKA Kâğıt Müzesi', province: 'Kocaeli', coord: [29.9370, 40.7650], title: 'Hamurdan Rulolara', emoji: '📄', blurb: 'Eski kâğıt fabrikasının salonunda uzun makinenin yanında yürü; vitrinleri ve matbaa makinelerini keşfet.', kind: 'route', path: 'oyun/seka', depth: 'kisa', wiki: 'SEKA Kâğıt Müzesi' },
  { id: 'justinianus', name: 'Justinianus (Beşköprü) Köprüsü', province: 'Sakarya', coord: [30.3750, 40.7414], title: 'Taş Kemerler', emoji: '🌉', blurb: '12 kemerli Bizans köprüsünde yürü; taşkını başlat, su yükselmeden köprüye çık ve ahşap köprünün sürüklenişini izle.', kind: 'route', path: 'oyun/justinianus', depth: 'kisa', wiki: 'Justinianus Köprüsü' },
  { id: 'ertugrul-turbe', name: 'Ertuğrul Gazi Türbesi', province: 'Bilecik', coord: [30.1810, 40.0170], title: 'Söğüt\'te Bir Sessizlik', emoji: '🕌', blurb: 'Söğüt\'te türbe bahçesine gir; nöbet noktalarını, büstleri ve tepedeki camiyi gez.', kind: 'route', path: 'oyun/ertugrul', depth: 'kisa', wiki: 'Ertuğrul Gazi Türbesi' },
  { id: 'selimiye', name: 'Selimiye Camii ve Külliyesi', province: 'Edirne', coord: [26.5594, 41.6781], title: 'Sekiz Ayağın Altında', emoji: '🕌', blurb: 'Sinan\'ın ustalık eserinde avludan kubbenin altına yürü; sekiz ayağı, çinileri ve dört minareyi keşfet.', kind: 'route', path: 'oyun/selimiye', depth: 'detayli', wiki: 'Selimiye Camii' },
  { id: 'vize-ayasofya', name: 'Vize Küçük Ayasofya', province: 'Kırklareli', coord: [27.7653, 41.5728], title: 'Bizye\'nin Katedrali', emoji: '⛪', blurb: 'Vize\'deki Bizans kilisesine narteksten gir; sütunların arasında ve çokgen kasnaklı kubbenin altında dolaş.', kind: 'route', path: 'oyun/vize-ayasofya', depth: 'kisa', wiki: 'Vize Ayasofya Camii' },
  { id: 'rakoczi', name: 'Rákóczi Müzesi', province: 'Tekirdağ', coord: [27.5110, 40.9770], title: 'Rodosto\'daki Sürgün', emoji: '🏠', blurb: 'Macar prensin sürgün yıllarını geçirdiği ahşap konakta bronz büstü ve Kelemen Mikes\'in odasını gez.', kind: 'route', path: 'oyun/rakoczi', depth: 'kisa', wiki: 'Rakoczi Müzesi' },
  { id: 'yalova-kosk', name: 'Yalova Atatürk Köşkü', province: 'Yalova', coord: [29.2770, 40.6555], title: 'Ağaç İçin Kaydırılan Köşk', emoji: '🌳', blurb: 'Yürüyen Köşk\'ün bahçesinde yüzlerce yıllık çınarı ve köşkün kaydırıldığı ray izlerini keşfet.', kind: 'route', path: 'oyun/yalova-kosk', depth: 'kisa', wiki: 'Yalova Atatürk Köşkü' },
  { id: 'sumela', name: 'Sümela Manastırı', province: 'Trabzon', coord: [39.6580, 40.6900], title: 'Kayadaki Manastır', emoji: '⛪', blurb: 'Ormandan kaya yüzüne tırman, kayaya oyulmuş manastırın kilisesini ve fresklerini keşfet.', kind: 'route', path: 'oyun/sumela', depth: 'detayli', wiki: 'Sümela Manastırı' },
  { id: 'trabzon-ayasofya', name: 'Trabzon Ayasofya', province: 'Trabzon', coord: [39.6990, 41.0050], title: 'Kubbenin Altında', emoji: '🕍', blurb: 'Denize bakan bahçeden kubbenin altına gir; Âdem-Havva frizini, freskleri ve çan kulesini keşfet.', kind: 'route', path: 'oyun/trabzon-ayasofya', depth: 'detayli', wiki: 'Trabzon Ayasofya Camii' },
  { id: 'bayburt-kale', name: 'Bayburt Kalesi', province: 'Bayburt', coord: [40.2280, 40.2610], title: 'Burç Burç Bayburt Kalesi', emoji: '🏯', blurb: 'Çoruh kıyısındaki kayalığa tırman, burçları ve kitabeleri keşfet.', kind: 'route', path: 'oyun/bayburt', depth: 'detayli', wiki: 'Bayburt Kalesi' },
  { id: 'zilkale', name: 'Zil Kale', province: 'Rize', coord: [41.0667, 40.9581], title: 'Sis İçindeki İzler', emoji: '🌫️', blurb: 'Sisli Fırtına Vadisi’nden kaleye yürü.', kind: 'route', path: 'oyun/zilkale', depth: 'detayli', wiki: 'Zilkale' },
];

export const PLAYABLE_BY_ID = new Map(PLAYABLES.map((p) => [p.id, p]));
export const playablesIn = (province: string) => PLAYABLES.filter((p) => p.province === province);
export const PLAYABLE_PROVINCES = new Set(PLAYABLES.map((p) => p.province));

/** Oyunun tam adresi (uygulama tabanına göre) */
export const playableUrl = (p: Playable, base = '/') => `${base}${p.path}`;
