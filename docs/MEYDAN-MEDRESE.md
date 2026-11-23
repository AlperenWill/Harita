# Meydan Medresesi (Hakkâri) — "Biçer'in Avlusu"

Kod: `src/app/games/meydanmedrese/`
- `site.ts`: medrese planı (dış duvar, taç kapı, avlu, yan hücreler, eyvan, havuz), meydan ve çevredeki evler, duraklar. Saf veridir, test edilir (`tests/meydanmedrese.test.ts`).
- `MeydanModels.tsx`: 3B modeller (moloz taş duvarlar, sivri kemerli taç kapı ve kitabe levhası, avlu döşemesi, hücreler, eyvan, havuz, meydan, evler, kavaklar, dağlar).
- `MeydanMedreseGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`), az bilinen yer. Miras verisindeki kayıt: `hakkari-medrese` (`src/data/heritage/doguanadolu.ts`, il adı `Hakkari`).

## Oyun
Oyuncu meydandan kitabeli taç kapıya yürür, avluya girer, havuzun çevresinde dolaşır ve kuzeydeki eyvana geçer. 5 ayrıntı:
1. Taç kapı ve kitabe
2. Avlulu plan
3. Yaptıran tartışması
4. Restorasyon
5. Kent arşivi ve müze planı

## Kaynaklarda bulunanlar
- **Kitabe ve tarih:** Giriş kapısı üzerindeki iki satırlık nesih kitabe, yapımı H. 1112 / M. 1700–1701 olarak verir; kitabede ağırlıklı olarak Kur'an ayetleri var. [Hakemli makale (hjuoz.uoz.edu.krd)](https://hjuoz.uoz.edu.krd/index.php/hum/article/download/1836/1306/7289)
- **Plan:** Selçuklu döneminde başlayıp Beylikler ve Osmanlı döneminde gelişen avlulu medrese planının 18. yüzyıl başındaki bir yansıması. [Hakemli makale](https://hjuoz.uoz.edu.krd/index.php/hum/article/download/1836/1306/7289)
- **Yaptıran:** Bir habere göre İzzeddin oğlu İbrahim Bey; başka bir kaynağa göre Hakkâri Emiri İbrahim Han Bey. Kaynaklar tutarsız. [Habertürk](https://www.haberturk.com/hakkari-haberleri/35154819-hakkaride-464-yillik-tarihi-medrese-yeniden-ayaga-kaldiriliyor)
- **Restorasyon:** 1984'te Vakıflar Genel Müdürlüğü onardı; 2014–2015'te üniversiteye tahsis edildi ve çevre düzenlemesiyle ziyarete açıldı. [TRT Haber](https://www.trthaber.com/haber/kultur-sanat/uc-asirlik-medrese-yeni-yuzuyle-ziyaretcilerini-agirliyor-425990.html)
- **Gelecek kullanım:** Kent arşivi ve etnografya müzesine dönüştürülmesi planlanıyor. [Daily Sabah](https://www.dailysabah.com/arts/events/history-for-posterity-archive-museum-to-be-opened-in-hakkaris-meydan-madrasah)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı. Hakkâri'deki Zeynel Bey Medresesi (1560) ayrı bir yapıdır; bazı haberler ikisini karıştırıyor. Habertürk başlığındaki "464 yıllık" ifadesi Zeynel Bey Medresesi'ne ait olabilir; bu kaynak yalnızca yaptıran rivayeti için kullanıldı.

## Temsilî olanlar
- Duvar yüksekliği, avlu ölçüleri, hücre sayısı ve yerleri; eyvanın biçimi.
- Taç kapının kemeri ve duvarın üstüne taşan taç kütlesi.
- Kitabe levhası: oyunda yalnızca tarih yazıyor; gerçek kitabenin metni ve hattı farklıdır.
- Avludaki havuz (kaynaklarda doğrulanmadı), meydandaki evler ve kavaklar.

## Teknik not: siyah kareler
- Zemindeki kabartma dokusu (`bumpMap`), ufka yatık bakışta NaN üretiyor; son işleme (Polish) bu pikseli tüm kareye yayınca ekran siyaha dönüyordu. Bu oyunda zeminden kabartma kaldırıldı. Aynı doku başka oyunlarda da kullanılıyor; Odunpazarı'nda zemin alçaltılarak geçici olarak giderilmişti. Diğer oyunların ayrıca denetlenmesi gerekiyor.
