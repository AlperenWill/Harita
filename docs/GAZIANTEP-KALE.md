# Gaziantep Kalesi — "Antep'in Tepesi"

Kod: `src/app/games/gaziantepkale/`
- `site.ts`: höyük yüksekliği, dairesel sur ve 12 burç, güney kapısı, iç yapılar (hamam, cami kalıntısı, Panorama Müzesi, kuyu) ve duraklar. Saf veridir, test edilir (`tests/gaziantepkale.test.ts`).
- `GaziantepModels.tsx`: 3B modeller (höyük, sur ve mazgallar, burçlar, kapı, kalıntılar, müze, çevre evleri, çimen, dağlar).
- `GaziantepKaleGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`); Gaziantep'in ikinci yeri (ilk yer Zeugma Mozaik Müzesi). Miras verisindeki kayıt: `gaziantep-kale` (`src/data/heritage/guneydogu.ts`).

## Oyun
Oyuncu kentin meydanından höyüğe yürür, güney kapısından surların içine girer, hamam ve cami kalıntılarını ve Panorama Müzesi'ni görür. 6 ayrıntı:
1. Antep'in tepesi
2. On iki burç
3. Katman katman kale
4. Hamam ve cami kalıntıları
5. Panorama Müzesi
6. Depremden sonra

## Gedikleri onar (mekanik)
Surun dört yerinde üst bölüm yıkılmış; alt duvar ayakta, iç tarafta moloz yığını var. Oyuncu moloz yığınına yaklaşıp **E**'ye basınca taşlar yerden yükselerek gediği kapatır, mazgallar geri gelir. Dördü onarılınca kart açılır. Hedef toplam 10: 6 ayrıntı ve 4 gedik. Krokide gedikler kırmızı, onarılanlar yeşil.
- **Kaynak:** Şubat 2023 depremlerinin bazı burç ve surlara hasar verdiği ve onarımın Eylül 2023'te başladığı [Gazete Vatan](https://www.gazetevatan.com/galeri/gazianteplilere-duyuruldu-tarih-belli-oldu-ekimde-aciliyor-2289058) haberine dayanıyor.
- **Temsilî:** Hasarların yeri, biçimi ve sayısı; onarımın böyle hızlı yapılması. "Taşların numaralanıp yeniden yerine konması" genel bir restorasyon yöntemidir; bu kalede böyle yapıldığı doğrulanmadı.

## Model ve grafik düzeltmeleri
- Kapı düz kare bir delikti. Kemeri dış hatta kesilmiş, sivri kemerli bir geçit yapıldı; üstüne kemer silmesi ve mazgallar eklendi.
- Burçlarda taşlar dev, surlarda minicikti. Burçlara ayrı ölçekli doku verildi; ölçek yaklaşık eşitlendi. Burç başına bir kuşak silmesi ve daha ince mazgallar eklendi.
- Sur mazgalları çok küçüktü; büyütüldü.
- Cami kalıntısının köşesine kırık bir minare gövdesi eklendi; temsilî.

## Kaynaklarda bulunanlar
- **Yer ve kökeni:** Kentin ortasındaki höyüğün üstünde; Roma döneminde 2.–3. yüzyılda bir müstahkem yer. Bir kaynak, tepenin daha önce Hitit dönemi gözetleme noktası olduğunu söylüyor. [Wikipedia](https://en.wikipedia.org/wiki/Gaziantep_Castle)
- **Iustinianus:** Birçok kaynak 6. yüzyılda genişletme yaptığını aktarır. Bir yayın bunu 10. yüzyıl diye veriyor; diğerleriyle çeliştiği için oyuna alınmadı.
- **Eyyubiler ve Memlükler:** 1181'de Eyyubiler kaleyi aldı, onardı ve güçlendirdi; bazı burçlarda Eyyubi ve Memlük süslemeleri var. [Wikipedia](https://en.wikipedia.org/wiki/Gaziantep_Castle)
- **Burçlar:** 12 burç. Evliya Çelebi'nin 36 burçtan söz ettiği, kalan 24'ün günümüze ulaşmayan dış surlara ait olabileceği bir belgede geçiyor. [Türk Müzeleri belgesi](https://www.turkishmuseums.com/Uploads/Müze/Dosya/421c7885-abd6-44c7-89f0-0c4f24fd1612.pdf)
- **Kazı:** Kale içinde Osmanlı dönemine ait bir hamam ve bir cami kalıntısı bulundu. [Türk Müzeleri belgesi](https://www.turkishmuseums.com/Uploads/Müze/Dosya/421c7885-abd6-44c7-89f0-0c4f24fd1612.pdf)
- **Müze:** Kalenin içindeki Panorama Müzesi 1920'deki savunmayı anlatır. [Gaziantep Kültür ve Turizm Müdürlüğü](https://gaziantep.ktb.gov.tr/EN-200810/museum-of-gaziantep-defense-and-heroism-panoroma.html), [Lonely Planet](https://www.lonelyplanet.com/points-of-interest/gaziantep-castle/476422)
- **Deprem:** Şubat 2023 depremleri bazı burç ve surlarda hasara yol açtı; onarım Eylül 2023'te başladı. [Gazete Vatan](https://www.gazetevatan.com/galeri/gazianteplilere-duyuruldu-tarih-belli-oldu-ekimde-aciliyor-2289058)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı. Selçuklu ve ayrıntılı Osmanlı dönemleri bu aramada ele alınmadı, oyunda yer almıyor. Hendek bilgisi tek bir belgede geçti, bu yüzden oyunda hendek yok. Nitelikli bir restorasyon yılı (2000'ler) doğrulanamadı.

## Temsilî olanlar
- Burçların dairesel yerleşimi: gerçek kalenin planı düzensizdir, oyunda ise eşit aralıklı dairesel halka.
- Kapının konumu ve biçimi.
- Hamam ve cami kalıntılarının planı, ölçüsü ve yeri.
- Panorama Müzesi binasının biçimi (içine girilmez).
- Çevredeki kent evleri ve höyüğün eğimi.
