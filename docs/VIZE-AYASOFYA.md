# Vize Ayasofyası (Kırklareli) — "Bizye'nin Katedrali"

Kod: `src/app/games/vizeayasofya/`
- `site.ts`: kilise planı (nef, yan nefler, narteks), sütun sıraları, dış alan ve duraklar. Saf veridir, test edilir (`tests/vizeayasofya.test.ts`).
- `VizeModels.tsx`: 3B modeller (duvarlar, sütunlar, galeriler, çatılar, apsisler, kasnaklı kubbe, narteks, kasaba, sur parçaları).
- `VizeAyasofyaGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `vize-ayasofya` (adı "Vize Küçük Ayasofya", `src/data/heritage/marmara.ts`).

**Uyarı:** Vize'deki yapı, İstanbul'daki Küçük Ayasofya'dan (Aziz Sergios ve Bakkhos Kilisesi, Iustinianus dönemi) farklıdır; ikisi aynı adla anılabilir. Bu oyun yalnızca Vize'deki yapıyı anlatır. Miras verisindeki "Orta Bizans'ın en iyi korunmuş yapılarından" ifadesi, yapının tarihlendirmesinin tartışmalı olmasıyla çelişir; oyunda kullanılmadı.

## Oyun
Oyuncu yamaçtaki yoldan kiliseye yürür, narteksten girer, sütunların arasında ve çokgen kasnaklı kubbenin altında dolaşır. 6 ayrıntı:
1. Bizye'nin yamacı
2. Bazilika planı
3. Çokgen kasnaklı kubbe
4. Ne zaman yapıldı?
5. Cami olarak
6. Yakın tarihli araştırma

## Kıbleyi bul (mekanik)
Kubbe bölümünün doğu kenarında bir pusula noktası var. **E** ile pusula açılır: üstte bakılan yönün derecesi, ana yönler ve yeşil kıble işareti görünür. Oyuncu Mekke yönüne (≈150°) döner ve yeniden **E**'ye basar. Fark 15°'den azsa kıble bulunur. O zaman cami katmanı yerden yükselir: güney duvarda mihrap, yanında minber, binanın eksenine göre çapraz uzanan halı safları. Minber artık yürünmez. Hedef toplam 7: 6 ayrıntı ve kıble.
- **Hesap:** Vize (41,57° K, 27,77° D) ile Mekke (21,42° K, 39,83° D) arasındaki büyük daire başlangıç yönü ≈ 149,5°. `tests/vizeayasofya.test.ts` bunu yeniden hesaplayıp doğrular.
- **Kaynak:** Kıble kavramı için [TDV İslâm Ansiklopedisi — Kıble](https://islamansiklopedisi.org.tr/kible). Bu sayfa açılıp okunmadı.
- **Temsilî:** Mihrabın, minberin ve safların yeri ışın hesabıyla bulundu. Vize'deki mihrabın gerçek yeri doğrulanmadı. "Camiye çevrilen kiliselerde mihrap kıbleye göre kaydırılır" ifadesi genel bir gözlemdir; bu yapı için ayrıca doğrulanmadı.

## Model düzeltmeleri
- Nefin tavanı yoktu, kubbenin çevresinden gökyüzü görünüyordu. Kubbe bölümünün iki yanına beşik tonozlar eklendi. Kubbe bölümünü dairesel açıklıklı bir döşeme kapatıyor. Nefin iki ucunda çatıya kadar çıkan alınlık duvarları var. Eyice'nin anlattığı "dört beşik tonozlu üst yapı"ya daha yakın, ama yan kollar temsilî.
- Kubbe bölümünü tamamen örten bir çatı levhası kubbenin içini gizliyordu; levhaya kubbe açıklığı verildi. Kasnak sekizgen yapıldı, içi de görünüyor; kasnakta içte ışıklı, dışta koyu pencereler var.
- Dolu çatı üçgeni beşik tonozu gizliyordu; çatı iki eğik levha olarak yeniden yapıldı.
- Duvar dokusu dev kareli bir desen gibiydi. Yerine dört sıra kesme taş ve beş sıra tuğladan oluşan dönüşümlü, ölçekli bir doku yapıldı.
- Dış duvarlarda pencere yoktu. Yan duvarlara, narteks cephesine, apsislere ve nefin üst duvarlarına kemerli pencereler eklendi.
- Apsis içeriden kara bir levhaydı. Kuzey duvarda apsise açılan bir kemer gözü açıldı. Apsislerin yarım kubbe başlıkları ters yöne, nefin içine bakıyordu; düzeltildi.

## Kaynaklarda bulunanlar
- **Yer ve işlev:** Antik Bizye'nin akropolünün güneybatı yamacında; sıklıkla piskoposluk kilisesi (katedral) olarak tanımlanır. [Columbia / DAI Vize projesi](https://projects.mcah.columbia.edu/vize/html/intro.htm), [Klein](https://arthistory.columbia.edu/sites/default/files/content/faculty/pdfs/klein/The-Church-of-Hagia-Sophia.pdf)
- **Plan:** Bazilika planı; batıda narteks, üç çokgen apsis, galeriler, büyük bir kubbe. [Columbia / DAI](https://projects.mcah.columbia.edu/vize/html/intro.htm)
- **Kubbe:** Yüksek çokgen kasnak; Eyice'ye göre üst yapı haç planlıdır, kubbe dört beşik tonozla örtülüdür ve payeler sonradan eklenmiştir. [Belleten](https://belleten.gov.tr/tam-metin/3333/tur)
- **Cami:** 15. yüzyılda camiye çevrildi; adı Gazi Süleyman Paşa Camii. Adı veren kişi kesin değil. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/vize-kucuk-ayasofya-camii-gazi-suleyman-pasa-camii), [TDV](https://islamansiklopedisi.org.tr/ayasofya-camii--vize)
- **Araştırma:** 1950'lerde çok harapken Vakıflar 1952–53'te onarım hazırlığı yaptı ama başlamadı; Bauer ve Klein 2003–2004 saha çalışması yaptı. [Columbia / DAI](https://projects.mcah.columbia.edu/vize/html/intro.htm)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Tarihlendirme:** Bir veri tabanı 6. yüzyılı verir; Mango ve Eyice mimariyi 13.–14. yüzyıla yerleştirir; bazı turizm siteleri Iustinianus'a bağlar. Oyunda tek bir tarih verilmiyor; "Küçük Ayasofya" adı Iustinianus'la ilgili İstanbul yapısından geldiği için kafa karıştırıcıdır.
- **Katedral kimliği:** "Sıklıkla" tanımlanır, tartışmalıdır.
- **Yapı ayrıntıları (galerilerin düzeni, sütun sayısı, kasnağın yüksekliği, apsis boyutları):** Kaynaklarda ayrıntılı ölçü bulunamadı; oyundaki değerler temsilîdir.
- **11.–12. yüzyıl onarımı veya kubbe restorasyonu:** Bu aramada doğrulanamadı.

## Temsilî olanlar
- Kilisenin boyutları, sütun sayısı ve yerleri (oyunda 10 sütun), galerilerin düzeni.
- Kubbenin yüksekliği, kasnağın altıgen biçimi ve pencere sayısı.
- Zemin deseni, çatı biçimleri.
- Kasaba evleri, sur parçaları, servi ve yamaç.
