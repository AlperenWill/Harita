# Kyzikos Antik Kenti (Balıkesir) — "Hadrian'ın Tapınağı"

Kod: `src/app/games/kyzikos/`
- `site.ts`: tapınak podyumu ve rampası, amfiteatr çanağı, kazı çukurları, devasa başlık, kırık sütunlar, çıpa taşı ve duraklar. Saf veridir, test edilir (`tests/kyzikos.test.ts`).
- `KyzikosModels.tsx`: 3B modeller (ova, podyum, kırık sütunlar, düşmüş kolon kütükleri, başlık bloğu, çanak, çukurlar, çıpa taşı, kavaklar, dağ ve deniz).
- `KyzikosGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `kyzikos` (`src/data/heritage/marmara.ts`).

## Oyun
Oyuncu kıstaktaki yoldan ovaya girer, rampayla tapınak podyumuna çıkar ve batıdaki amfiteatr çanağına iner. 6 ayrıntı:
1. Kıstaktaki liman kenti
2. Hadrian Tapınağı
3. Deprem ve imparator
4. Amfiteatr
5. Argonotların çıpa taşı
6. Kazı çalışmaları

## Zaman merceği
Saat düğmesi ya da **T** ile açılır. Açıkken Hadrian Tapınağı'nın ve amfiteatrın eski hâli, kalıntıların üstünde yarı saydam olarak belirir; ekran sıcak bir tona döner. Oyuncu mercek açıkken tapınağın (34 m) ve amfiteatrın (28 m) yakınına gelince o yapının eski hâli "görüldü" sayılır. Hedef toplam 8: 6 ayrıntı ve 2 eski hâl.
- **Tapınak canlandırması:** Çift sıra Korint sütunu (dipteros), kapalı naos, saçaklık ve alınlıklı çatı. Kaynaklar yalnızca dipteros ve Korint düzenini söylüyor. Sütun sayısı, sütun yüksekliği (14 m), naos ve çatı biçimi temsilîdir; gerçek tapınak çok daha büyüktü.
- **Amfiteatr canlandırması:** Dış elips cephe ve basamaklı oturma kuşağı, tamamen temsilî.
- **Kalıntıdaki yeni modeller:** Yivli sütunlar, Attik kaideler, Korint başlıkları (dev başlık dahil), devrik arşitrav ve silme blokları, amfiteatrın kenarında kemerli taşıyıcı ayak kalıntıları, çevrede zeytinlikler. Bunların hepsi temsilîdir; amfiteatr ayaklarının sayısı ve yeri bir kaynaktan alınmadı.

## Kaynaklarda bulunanlar
- **Konum ve kuruluş:** Kapıdağ Yarımadası'nın anakarayla birleştiği kıstakta; Miletos kolonisi, M.Ö. 756 (kaynaklar 8. yüzyılı gösterir). Limanlarında 200'den fazla gemi barındığı yazılır. [DergiPark — Kyzikos, Hellespontus'da bir eyalet merkezi](https://dergipark.org.tr/en/pub/ataunigsed/issue/2584/33252)
- **Tapınak:** Korinth düzeninde, çift sıra sütunlu (dipteros). Bir haberde boyutları yaklaşık 116 × 62 m olarak tahmin ediliyor. [Daily Sabah](https://www.dailysabah.com/turkiye/cyzicus-worlds-largest-temple-column-capital/news)
- **Deprem ve Hadrian:** Deprem yılı kaynaklarda MS 117 ya da 123; Hadrian'ın ziyareti MS 124. [DergiPark](https://dergipark.org.tr/en/pub/ataunigsed/issue/2584/33252)
- **Amfiteatr:** Anadolu'daki üç amfiteatrdan en sağlamı olduğu söyleniyor. [DergiPark](https://dergipark.org.tr/en/pub/ataunigsed/issue/2584/33252)
- **Argonotlar:** Apollonios Rhodios, Argonotların yarımadada durduğunu ve bir çıpa taşı bıraktığını anlatır. [Turkey From the Inside](https://www.turkeyfromtheinside.com/?p=1753)
- **Kazı:** İlk dönem 1989–1996, ikinci dönem 2006'dan beri; alan büyük ölçüde özel mülkiyette. [Yeni Birlik](https://www.gazetebirlik.com/kultur-sanat/kyzikos-antik-kentinde-kazi-donemi-basladi/182015)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı. Tarih ve ölçü verileri kaynaklar arasında tutarsız.

## Doğrulanmayanlar ve tutarsızlıklar
- **"Dünyanın en büyük tapınağı", "dünyanın sekizinci harikası":** Turizm kaynaklarında geçiyor; oyuna alınmadı.
- **Tiyatro:** Bir makalede kavea ve orkestra çapları verilmiş; doğrulanamadığı ve oyunda tiyatro olmadığı için kullanılmadı.
- **Stadyum:** Bu aramada bilgi çıkmadı.
- **Deprem yılı:** MS 117 / 123 çelişkisi metinde belirtildi.

## Temsilî olanlar
- Podyumun, rampanın ve sütunların ölçüleri; sütun sayısı ve hangilerinin ayakta olduğu. Gerçek tapınak çok daha büyüktür.
- Amfiteatrin biçimi (elips çukur) ve oturma sıraları.
- Kazı çukurlarının yeri ve çıpa taşının biçimi.
- Ovanın bitki örtüsü ve kavaklar.
