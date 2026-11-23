# Giresun Adası — "Ares'in Adası"

Kod: `src/app/games/giresun/`
- `site.ts`: ada biçimi, yükseklik, Bizans kilisesi planı, sarnıç ve duraklar. Saf veridir, test edilir (`tests/giresun.test.ts`).
- `GiresunModels.tsx`: 3B modeller (ada, deniz, kilise kalıntısı, tapınak temel taşları, sarnıç, iskele, tekneler, çalılar, dağlar).
- `GiresunGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`), az bilinen yer. Miras verisindeki kayıt: `giresun-adasi` (`src/data/heritage/karadeniz.ts`).

## Oyun
Oyuncu iskeleden adaya çıkar, kayalık yollarda dolaşır, Bizans katolikonuna girer ve altındaki Helenistik temel taşlarını görür. 5 ayrıntı:
1. Ares'in adası (ada adı)
2. Amazon efsanesi
3. Katolikon
4. Tapınak temelleri
5. Argonotlar

## Kayıkla adayı dolaş (mekanik)
İskelenin ucunda **E** ile kayığa binilir. Kayıkta joystick ya da WASD ile kürek çekilir; kayık bakılan yöne gider ve adanın çevresindeki su kuşağında kalır. Tur, adanın doğu kıyısındaki büyük siyah kaya **Hamza Taşı**'nın önündeki şamandıradan başlar; kuzey kıyısı, batı ucu ve iskele açığı geçilip yeniden Hamza Taşı'nın önünde biter. Sıradaki şamandıra yanıp söner, geçilenler yeşile döner. Tur bitince kart açılır; iskeleye dönüp inilebilir. Hedef toplam 6: 5 ayrıntı ve tur.
- **Kaynak:** Aksu şenliklerinde bereket getireceğine inanılarak kayıklarla adanın çevresinde dolaşılması, turun Hamza Taşı önünde başlayıp bitmesi ve Hamza Taşı'nın doğu kıyısındaki büyük siyah bir kaya olması arama sonucu özetlerinden alındı. [Wikipedia — Hamza Stone](https://en.wikipedia.org/wiki/Hamza_Stone), [Yeni Birlik](https://www.gazetebirlik.com/kultur-sanat/3-bin-yillik-rituel-giresunda-yeniden-hayat-buldu-dereye-tas-attilar-dilek-dilediler/999961). Şenliğin tarihi kaynaklarda 20 Mayıs ya da Hicri takvime göre Mayıs 7'si olarak farklı veriliyor. Tur sayısı (sık anlatılan "yedi tur") ve çaput bağlama geleneği doğrulanamadı, oyuna alınmadı.
- **Temsilî:** Şamandıralar, rota ve kayığın biçimi.

## Model düzeltmeleri
- İskele yürünebilir alanın dışındaydı, yani oyuncu iskeleye çıkamıyordu. Eski bir test de bu hatayı doğru kabul ediyordu; düzeltildi.
- Saydam denizin altından kare bir taban levhası görünüyordu. Deniz artık opak; adanın tabanı suyun altında yumuşakça iniyor; kıyıda sığ su kuşağı ve kayalar var.
- Ada çıplak kumdan bir kubbeydi. Ormanlık yapıldı: yapraklı ağaçlar, kıyıya doğru çayır ve kaya, kıyıda kum. Gövdeler ilk denemede yeşil göründü; düzeltildi.
- Kilise lentolu kapısı olan sağlam bir kutuydu. Kazıyla açılmış alçak ve kırık duvarlar, doğuda yarım daire apsis ve iç payeler yapıldı. Apsisin içi yürünür, duvarı geçilmez.
- Sarnıçta su yüzeyi dik duran bir diskti, taş ağız da havada düz bir halkaydı; ikisi de düzeltildi.
- Suyun üstünde yassı mavi elipsler vardı. Gerçek kayık gövdeleri yapıldı.
- Doğu kıyısına Hamza Taşı (siyah kaya) eklendi.

## Kaynaklarda bulunanlar
- **Adlar:** Antik kaynaklarda Aretias; "Ares'in adası" anlamında Areos Nesos; Roma döneminde Khalkeritis. [Wikipedia — Giresun Island](https://en.wikipedia.org/wiki/Giresun_Island), [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/giresun-adasi-aa417)
- **Amazon efsanesi:** Amazonların Ares için adada bir tapınak yaptırdığı anlatılır; bu bir efsanedir. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/giresun-adasi-aa417)
- **Katolikon:** Adanın merkezinde 9.–11. yüzyıla tarihlenen ana kilise (katolikon) ortaya çıkarıldı. [Hürriyet Daily News](https://hurriyetdailynews.com/excavations-reveal-religious-history-of-giresun-island-104830)
- **Tapınak temelleri:** Kilisenin altında Helenistik dönemden bir tapınağın temel taşları ve kilise duvarlarının bu temeller üzerine oturtulduğu bildiriliyor. [DergiPark — Aretias/Khalkeritis Adası](https://dergipark.org.tr/tr/download/article-file/460302)
- **Argonotlar:** Apollonios Rhodios'un Argonautika'sında adaya uğrama anlatılır; bu edebi bir anlatıdır. [Wikipedia — Giresun Island](https://en.wikipedia.org/wiki/Giresun_Island)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı. Kazının başlangıç yılı kaynaklarda 2011 ya da 2012 olarak geçiyor; oyunda yıl verilmedi. Tapınağın tarihi kaynaklarda farklı veriliyor (MÖ 4. yüzyıl ya da 2. yüzyıl); oyunda "Helenistik" denildi. Arrianus'un adada antik bir yapı görmediğini yazdığı aktarılıyor; Ares tapınağının yeri tartışmalı.

## Temsilî olanlar
- Ada biçimi, yüksekliği ve çalıların dağılımı.
- Kilisenin planı, duvar yükseklikleri ve sütun kaideleri.
- Tapınak temel taşlarının düzeni ve yerleşimi.
- Sarnıç çukuru ve iskele, tekneler.

## Bilinen görsel sorunlar
- Ada kıyısında deniz tabanı–ada zemini geçişi sert. Sonraki turda kıyı eğimi yumuşatılacak.
- Kilisenin zemini düz, ada yüzeyi ise hafif eğimli; kenar kısımlarda zemin ile taş döşeme arasında birkaç santimetre fark var.
