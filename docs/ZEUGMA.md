# Zeugma Mozaik Müzesi — "Mozaiklerin Evi"

Kod: `src/app/games/zeugma/`
- `site.ts`: müze binası (hol, mozaik salonu, karanlık salon), vitrinler, meydan ve duraklar. Saf veridir, test edilir (`tests/zeugma.test.ts`).
- `ZeugmaModels.tsx`: 3B modeller (taş cephe, mozaik zemin, vitrinler, sergi kaidesi, meydan, ağaçlar, tepeler).
- `ZeugmaGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: detaylı (`depth: 'detayli'`), popüler yer. Miras verisindeki kayıt: `zeugma` (`src/data/heritage/guneydogu.ts`).

## Oyun
Oyuncu meydandan müzenin girişine yürür, holden mozaik salonuna geçer, vitrinlerin arasında dolaşır ve karanlık salona girer. 5 ayrıntı:
1. Müze binası
2. Zeugma kenti
3. Mozaik zemin
4. "Çingene Kız" mozaiği
5. Kaçırılan parçalar

## Panoyu onar (mekanik)
Salonun batısında bir restorasyon masası var. Üstündeki mozaik pano 3×3 parçaya bölünmüş ve parçaların hepsi yanlış yöne dönük. **E** ile bulmaca açılır; parçalara dokununca 90° döner, hepsi doğru yöne gelince pano tamamlanır ve kart açılır. Masadaki pano da bulmacayla birlikte döner. Hedef toplam 6: 5 ayrıntı ve pano.
- **Temsilî:** Kuşlu madalyon deseni, restorasyon masası ve bulmaca oyun için çizildi; gerçek bir Zeugma mozaiğinin kopyası değildir.

## Model ve grafik düzeltmeleri
- Bina düz bir kutuydu. Taş kaplamalı cephe, saçaklı ve cam kapılı giriş, ad levhası, üstte pencere bandı ve çatı parapeti eklendi; biçim temsilî.
- Bütün salon zemini rastgele renkli çizgilerden oluşan bir dokuyla kaplıydı. Zemin cilalı taş karo oldu. Mozaikler artık korkuluklu ve taş bordürlü üç zemin panosunda duruyor (meander kuşaklı rozet, baklava ızgarası, yıldız ve halkalar). Duvarlarda iki mozaik pano var. Dokular gerçek taşçık (tessera) ızgarasıyla çizildi; desenler temsilî.
- İç duvarlar tuğla dokusundaydı. Müze sıvası ve tavan ışık şeritleri yapıldı.
- Vitrinler beyaz kutulardı. Yerlerinde artık zemin mozaikleri var.
- "Çingene Kız" yerinde yüz yerine iki mavi daire vardı. Koyu zeminli, dağınık koyu saçlı, iri gözlü temsilî bir mozaik portre çizildi. Gerçek eserin kopyası değildir.
- Karanlık salon karanlık değildi. Duvarlar, zemin ve tavan koyu kaplandı; portreyi tek bir spot ışığı aydınlatıyor.

## Kaynaklarda bulunanlar
- **Açılış:** Müze 9 Eylül 2011'de açıldı. Mozaikler, Fırat üzerindeki baraj planları nedeniyle sular altında kalma tehlikesi yüzünden kentten taşındı. [Wikipedia](https://en.wikipedia.org/wiki/Zeugma_Mosaic_Museum)
- **Kent ve kurucu:** Kaynaklar kurucu olarak Seleukos I Nikator'u anar; Fırat üzerine ilk köprünün onun döneminde kurulduğu aktarılır. Kuruluş tarihi farklı verilir: MÖ 305, MÖ 300 ya da MÖ 3. yüzyıl. [Wikipedia](https://en.wikipedia.org/wiki/Zeugma_Mosaic_Museum)
- **"Çingene Kız":** Yaklaşık MS 2. yüzyıl. Menad Evi'nde bulundu. Adı, dağınık saçları ve yüzünden gelir. Kimin tasvir edildiği tartışmalıdır. [Gaziantep Kültür ve Turizm Müdürlüğü](https://gaziantep.ktb.gov.tr/EN-200730/zeugma-mosaic-museum.html)
- **Kaçırılan parçalar:** 1960'larda yurt dışına kaçırıldı; bazı parçalar ABD'den 2018'de iade edildi. [Daily Sabah](https://www.dailysabah.com/turkey/2018/12/08/iconic-gypsy-girl-welcomes-visitors-with-missing-pieces-retrieved-decades-later)
- **Ziyaretçi:** Müze ziyaretçi rekorları kırdı. [Hürriyet Daily News](https://www.hurriyetdailynews.com/zeugma-mosaic-museum-breaks-visitor-record-213468)

Not: Bilgiler arama sonuçlarındaki özetlerden alındı; sayfalar açılıp okunmadı. Kaynaklar arasında çelişen rakamlar (müze alanı, sergilenen mozaik alanı, ziyaretçi sayısı) oyuna konmadı.

## Temsilî olanlar
- Müze binasının biçimi, salon düzeni, vitrin sayısı ve yerleri.
- Karanlık salonun aydınlatması ve sergi kaidesi (kaynaklar "ayrı bir karanlık oda" diye anlatır; düzen temsilîdir).
- Mozaik zemin desenleri (tesserae dokusu ve ortadaki rozet). Oyundaki desenler gerçek mozaiklerin birebir kopyası değildir.
- Meydan, ağaçlar ve arazi.
