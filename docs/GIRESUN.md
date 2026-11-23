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
