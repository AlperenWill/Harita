# Kerkenes Dağı — "Taş Surlu Kent"

Kod: `src/app/games/kerkenes/`
- `site.ts`: tepe yüksekliği, dairesel sur ve yedi kapı, ışınsal sokaklar, evler, saray kompleksi, kazı çukuru ve duraklar. Saf veridir, test edilir (`tests/kerkenes.test.ts`).
- `KerkenesModels.tsx`: 3B modeller (arazi, sur ve kuleler, sokaklar, evler, saray, kazı çukuru, çimen, dağlar).
- `KerkenesGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: detaylı (`depth: 'detayli'`). Miras verisindeki kayıt: `kerkenes` (`src/data/heritage/icanadolu.ts`).

Ölçek: Gerçek kentin surları yaklaşık 7 km uzunluğunda; oyundaki sur çapı yaklaşık 250 m. Kent gerçek ölçeğinin küçük bir kesitidir.

## Oyun
Oyuncu güney kapısından surların içine girer, ışınsal sokaklarda dolaşır, saray kompleksinin önüne ve kazı çukuruna gelir. 5 ayrıntı:
1. Taş surlu kent
2. Yedi kapı
3. Saray kompleksi
4. Kazı alanı
5. Yıkım ve son

## Kaynaklarda bulunanlar
- **Boyut:** Kerkenes Dağı, Anadolu platosundaki en büyük Demir Çağı yerleşimlerinden biridir; yaklaşık 7 km taş sur ve yaklaşık 2,5 km² alan. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/kerkenes-harabeleri-8ba67)
- **Yedi kapı:** Sur, yedi kapıyla delinmiştir. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/kerkenes-harabeleri-8ba67), [Wikipedia](https://en.wikipedia.org/wiki/Kerkenes)
- **Tarih:** Kent yaklaşık MÖ 7. yüzyılın sonu ile 6. yüzyılın ilk yarısında kuruldu ve iskân edildi. [UCF — Kerkenes Projesi](https://sciences.ucf.edu/anthropology/kerkenes/overview/)
- **Saray:** Kazılarda kentin kuzey kesiminde büyük bir saray kompleksi bulundu. [UCF — Kerkenes Projesi](https://sciences.ucf.edu/anthropology/kerkenes/overview/)
- **Kazı:** Kerkenes Projesi 1993–2012 arasında Geoffrey ve Françoise Summers yönetiminde çalıştı. [UCF — Kerkenes Projesi](https://sciences.ucf.edu/anthropology/kerkenes/overview/)
- **Yıkım:** Kentin yanarak terk edildiği ve bunun Pers Kralı Kiros ile Lidya Kralı Kroisos arasındaki çatışmayla ilişkilendirildiği aktarılıyor. [University of Sydney — Kerkenes Projesi](https://neaf.sydney.edu.au/?p=1216)

## Doğrulanmayanlar ve tartışmalı bilgiler
- **Dairesel ve ışınsal plan:** Kentin dairesel sur ve ışınsal sokak planına sahip olduğu yaygın olarak anlatılıyor. Bu arama sonuçlarında doğrulanamadı; oyundaki düzen temsilîdir.
- **Kentin kimin tarafından kurulduğu:** Medler'in kurduğu ya da Lidya'nın üç askerî garnizondan biri olduğu gibi farklı hipotezler var. Oyunda kuruluş iddiası yok.
- **Yıkım–Kiros/Kroisos bağlantısı:** Bir hipotez; oyunda "bir hipotezdir ve tartışmalıdır" diye işaretlendi.
- **Antik ad:** Kentin adı bilinmiyor; oyunda yalnızca "Kerkenes Dağı" kullanılıyor.
- Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Temsilî olanlar
- Sur çapı ve kapı sayısı oyun ölçeğinde kısaltıldı; kapılar gerçek kentteki yedi kapının yerlerine göre dizilmedi.
- Evlerin sayısı, biçimi ve dağılımı; sokakların genişliği.
- Saray kompleksinin düzeni ve sütunları.
- Kazı çukurunun ve ip ağının biçimi.
- Tepenin yüksekliği ve arazi eğimi.

## Bilinen görsel sorun
- Yukarı doğru bakıldığında gökyüzü kubbesinin üst kısmı koyu kahverengi görünüyor (drei `Sky` ayarları). Görüntü yalnızca kamera çok yukarı baktığında çıkıyor; sonraki turda gökyüzü ayarları düzeltilecek.
