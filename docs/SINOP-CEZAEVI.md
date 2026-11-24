# Sinop Tarihi Cezaevi — "Anadolu'nun Alkatrazı"

Kod: `src/app/games/sinopcezaevi/`
- `site.ts`: iç kale surları ve kuleleri, avlu, gardiyan binası, koğuş binası (koridor, 4 koğuş, 12 hücre), kent evleri, rıhtım ve duraklar. Saf veridir, test edilir (`tests/sinopcezaevi.test.ts`).
- `SinopModels.tsx`: 3B modeller.
- `SinopCezaeviGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisine yeni nokta eklendi: `sinop-cezaevi` (`src/data/heritage/karadeniz.ts`). Koordinat [35.1480, 42.0230] yaklaşıktır, doğrulanmadı.

## Oyun
Oyuncu limandaki rıhtımdan sur kapısına yürür, avluya girer, koğuş binasına yan kapıdan girip koridorda dolaşır. 7 ayrıntı:
1. Sinop Kalesi
2. "Anadolu'nun Alkatrazı"
3. 1887: kaleden cezaevine
4. koğuşlar
5. hücreler
6. Sabahattin Ali
7. ünlü mahkûmlar ve müze

## Kaynaklarda bulunanlar
- **Cezaevi:** 1887'de Sinop Kalesi'nin iç kalesinde açıldı. [Wikipedia](https://en.wikipedia.org/wiki/Sinop_Fortress_Prison)
- **Kapanış:** Wikipedia ve bir akademik makale 1997'yi veriyor ([DergiPark](https://dergipark.org.tr/en/download/article-file/26910)). Türkçe kaynakların çoğu ise 1999 diyor. Oyunda iki tarih de belirtildi.
- **Lakap:** "Anadolu'nun Alkatrazı". [Lonely Planet](https://www.lonelyplanet.com/points-of-interest/tarihi-sinop-cezaevi/1060210)
- **Ünlü mahkûmlar:** Sabahattin Ali, Nazım Hikmet, Mustafa Suphi, II. Devlet Giray. [Gazete Vatan](https://www.gazetevatan.com/galeri/sinop-tarihi-cezaevi-muzesi-kapilarini-aciyor-burada-yatan-unlu-isimlerin-hatiralari-yasatilacak-2282527), [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/sinop-tarihi-cezaevi-4a0b8)
- **Müze:** Onarıldıktan sonra müze olarak açıldı. [bianet](https://bianet.org/haber/sinop-tarihi-cezaevi-ve-muzesi-nin-restorasyonuna-baslaniyor-224870)

Not: Bilgiler arama sonuçlarındaki özetlerden alındı. Doğrulanmayanlar:
- Sabahattin Ali'nin "Aldırma Gönül"ü burada yazdığı yaygın bir anlatı. Oyunda "anlatılır" diye geçiyor.
- Refik Halit Karay ve Kemal Tahir'in burada yattığı doğrulanamadı; oyuna konmadı.

## Temsilî olanlar
- Surların ölçüsü, kule sayısı ve yerleri, kapının biçimi.
- Koğuş binasının düzeni: koridor, 4 koğuş, 12 hücre. Ranzalar, yataklar ve parmaklıklı kapılar da temsilî. Gerçek cezaevinde birden çok avlu ve bina var.
- Gardiyan binası, bilgi panoları, avlu döşemesi, çınarlar.
- Rıhtım, kayıklar ve kent evleri.

## Mekanik: gece sayımı (temsilî)
- **Başlatma:** Gardiyan binasının kapısında (`ROUND`) **E**'ye basınca gece çöker. Gökyüzü kararır, güneş ve ortam ışığı kısılır, koridor lambaları sönükleşir. Oyuncunun elinde titreyen bir fener (nokta ışık) olur.
- **Kilitleme:** Oyuncu koğuş binasına gider ve 12 hücre kapısının önünde (`CELL_DOORS`, erişim 1,1 m) **E** ile kapıyı kilitler. Parmaklıklı demir kapı menteşesi üzerinde dönüp açıklığa oturur.
- **Takip:** Hedef çubuğu `k/12` gösterir. Krokide gardiyan kapısı ve kilitlenmemiş kapılar sarı işaretle görünür.
- **Bitiş:** 12 kapı kilitlenince "Gece sayımı" kartı açılır. Kart "Temsilî sahne" olarak işaretli, kaynağı [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/sinop-tarihi-cezaevi-4a0b8). Kart kapanınca sabah olur ve kapılar yeniden açılır. Sayım, hedefin 8. maddesi sayılır.
- **Doğrulanmayan:** Sayımın Sinop'ta nasıl yapıldığına dair ayrıntılı bir kaynak bulunamadı. Sahne, cezaevlerindeki genel sayım ve kilitleme uygulamasını canlandırır. Kart metni bunu açıkça söyler.

## Model düzeltmeleri
- **Hücre kapıları:** Birleşik demir geometriden ayrılıp menteşeli, ayrı ayrı dönen kanatlar oldu. Kilit kutusu eklendi.
- **Sıva dokusu:** İri, bulanık lekeler duvarda 30–40 cm'lik lekeler gibi görünüyordu. Yerine ince gözenekler, birkaç soluk leke, kılcal çatlaklar ve yağlı boya bandında aşınma izleri kondu.
- **Gece ışığı:** drei `Environment` ortam ışığını kendi değerine döndürdüğü için gece değeri her karede yazılıyor. Sabah olunca eski değer geri konuyor.
