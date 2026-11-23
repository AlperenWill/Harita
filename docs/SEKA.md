# SEKA Kâğıt Müzesi (Kocaeli) — "Hamurdan Rulolara"

Kod: `src/app/games/seka/`
- `site.ts`: fabrika salonu, kapı, kâğıt makinesi gövdesi, vitrinler, matbaa makineleri, avlu, baca, havuz ve duraklar. Saf veridir, test edilir (`tests/seka.test.ts`).
- `SekaModels.tsx`: 3B modeller (tuğla salon, testere dişli çatı, makine hattı, vitrinler, matbaa makineleri, baca, havuz, ağaçlar, tepeler).
- `SekaGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `seka` (`src/data/heritage/marmara.ts`). Heritage özetindeki "Cumhuriyetin ilk kâğıt fabrikası" ifadesi doğrulanamadı; oyunda yalnızca "ilk sanayi kuruluşları arasında" denildi.

## Oyun
Oyuncu avludan eski fabrika salonuna girer; uzun kâğıt makinesinin iki yanında dolaşır, vitrinleri ve matbaa makinelerini görür. 6 ayrıntı:
1. Sümerbank fabrikası
2. Kâğıt makinesi
3. Mehmet Ali Kağıtçı
4. Vitrinler
5. Matbaa makineleri
6. Kapanış ve müze

## Kâğıt hattı (mekanik)
Makinenin güneyinde beş kumanda panosu var. Oyuncu bölümleri sırayla çalıştırır: **hamur kasası → elek → pres → kurutma silindirleri → kalender ve sarıcı**. Sırası gelmeyen pano uyarı verir ("Önce … çalışmalı"). Pano lambası yeşilse bölüm çalışıyor, sarı yanıp sönüyorsa sıradaki demektir. Çalışan bölümün merdaneleri döner, kâğıt şeridi o bölüme ulaşır, kurutmada buhar çıkar, son bölümde rulo büyür. Her bölüm bir bilgi kartı açar. Hedef toplam 11: 6 ayrıntı ve 5 bölüm.
- **Kaynak:** Bölümlerin sırası ve ne yaptıkları, kâğıt makinelerinin genel çalışma düzenidir. [Wikipedia — Paper machine](https://en.wikipedia.org/wiki/Paper_machine). Bölüm metinlerinde sayısal değer (su oranı, sıcaklık, hız) kullanılmadı.
- **Temsilî:** SEKA'daki makinenin kendi bölümleri, sayıları ve ölçüleri bu aramada doğrulanmadı. Oyundaki silindir ve merdane sayıları, buhar davlumbazı, panolar ve lambalar temsilîdir. Salonun pencereleri de temsilîdir.

## Kaynaklarda bulunanlar
- **Fabrika:** Sümerbank İzmit Kâğıt ve Karton Fabrikası. Temel 1934'te atıldı (14 ya da 18 Ağustos; kaynaklar çelişiyor), deneme üretimi 18 Nisan 1936, resmî açılış 6 Kasım 1936. [DergiPark](https://dergipark.org.tr/tr/download/article-file/1473662), [Wikipedia](https://en.wikipedia.org/wiki/SEKA_Paper_Museum)
- **Kapanış:** Özelleştirme Yüksek Kurulu'nun 14.09.1998 tarihli kararı. [DergiPark](https://dergipark.org.tr/tr/download/article-file/1473662)
- **Müze:** 6 Kasım 2016'da açıldı; 115 vitrin; restore edilmiş makineler ve beş matbaa makinesi; Roma sikkeleri, belgeler, kâğıttan heykeller. [Wikipedia](https://en.wikipedia.org/wiki/SEKA_Paper_Museum), [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/seka-kagit-muzesi-bc9a2)
- **Kurucu:** Türkiye'nin ilk kâğıt mühendisi Mehmet Ali Kağıtçı; müze onun adını taşıyor. [Wikipedia](https://en.wikipedia.org/wiki/SEKA_Paper_Museum)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **"Türkiye'nin ilk kâğıt fabrikası":** Kaynaklar "ilk sanayi kuruluşlarından biri" diyor; kesin "ilk" doğrulanamadı.
- **"Dünyanın en büyük kâğıt müzesi", "Türkiye'nin ilk kâğıt müzesi":** Müzenin kendi tanıtım dili; bağımsız doğrulama yok. Oyunda bunun tanıtım dili olduğu belirtiliyor.
- **Müze açılış tarihi:** Müzenin kendi zaman çizelgesi 1994'te bir açılış da listeliyor; çoğu kaynak 2016 diyor. Oyunda 2016 kullanıldı.
- **Salon sayısı:** Kaynaklarda 16 ya da 18; oyunda yok.
- **Yıllık kapasite (12.000 ton):** Tek bir kaynakta; oyunda yok.

## Temsilî olanlar
- Salonun ölçüleri ve biçimi; testere dişli çatı.
- Kâğıt makinesinin hattı (silindir sayısı ve yerleşimi); gerçek makine çok daha uzundur ve karmaşıktır.
- Vitrinlerin sayısı (oyunda 8) ve içerikleri; matbaa makinelerinin biçimi.
- Avlu, baca ve havuz.
