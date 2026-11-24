# Kasaba Köyü Mahmut Bey Camii — "Çivisiz Cami"

Kod: `src/app/games/mahmutbey/`
- `site.ts`: köy, cami bölümleri, direkler, evler, mezarlık ve duraklar. Saf veridir, test edilir (`tests/mahmutbey.test.ts`).
- `MahmutbeyModels.tsx`: 3B modeller.
- `MahmutbeyGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`).

## Oyun
Oyuncu köy yolundan meydana yürür, son cemaat yerinden harime girer ve ahşap direklerin arasında dolaşır. 6 ayrıntı:
1. Candaroğlu Mahmut Bey
2. "Çivisiz Cami"
3. ahşap direkler
4. kalem işi tavan
5. Dünya Mirası
6. onarım

## Kalem işini tamamla (mekanik)
Harimin tavanında üç bezeme gözü solmuş. Oyuncu gözün altında **E**'ye basınca panel açılır: çevredeki 8 göz renkli, ortadaki eksiktir. Renkler bir düzene uyar: satır boyunca lacivert, yeşil, altın sırayla gelir, bir alt satır iki adım kayar. Oyuncu eksik rengi seçer; yanlış seçimde ipucu çıkar. Doğru seçince tavandaki göz boyanır. Üçü bitince kart açılır. Hedef toplam 9: 6 ayrıntı ve 3 göz.
- **Kaynak:** Tavan, kiriş ve ahşap yüzeylerin kalem işiyle süslü olduğu ve iyi korunduğu bilgisi [YÖK Açık Bilim — Kasaba Köy Mahmud Bey Camii](https://acikbilim.yok.gov.tr/handle/20.500.12812/466539) tezinden; arama özetinden alındı.
- **Temsilî:** Renk düzeni, solmuş gözler ve onarım biçimi. Panelde gösterilen düzen tavanın genel dokusuyla birebir aynı değildir. Bu camide hangi parçaların onarıldığı doğrulanmadı.

## Model düzeltmeleri
- Giriş duvarının iç yüzü taş görünüyordu (öteki iç duvarlar sıvalıydı). Kapı boşluğunun iki yanına ve üstüne iç sıva eklendi.
- Genel olarak model iyi durumdaydı: ahşap direkler, kirişler, kalem işi tavan, mahfil, mihrap ve minber yerindeydi. Bu yüzden büyük bir yeniden yapım gerekmedi.

## Kaynaklarda bulunanlar
- **Yapım:** 1366'da Candaroğulları döneminde Mahmut Bey yaptırdı. Kaynaklar onu Kötürüm Bayezid'in kardeşi ya da Âdil Bey'in oğlu olarak tanıtıyor. [Kastamonu İl Kültür ve Turizm](https://kastamonu.ktb.gov.tr/Eklenti/49682,kasaba-camii-brosurpdf.pdf), [YÖK Açık Bilim](https://acikbilim.yok.gov.tr/handle/20.500.12812/466539)
- **Çivisiz:** Ahşap öğeler çivi kullanılmadan, geçmeyle birleştirilmiş. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/mahmutbey-camii-civisiz-camii-9bfbc)
- **Ahşap ve bezeme:** Ahşap taşıyıcı ve çatı sistemi ile kalem işi bezemeler, 13–14. yüzyıl Anadolu ahşap yapıları içinde sıra dışı sayılıyor.
- **UNESCO:** 2023'te "Wooden Hypostyle Mosques of Medieval Anatolia" (Ortaçağ Anadolusu'nun Ahşap Hipostil Camileri) adıyla Dünya Mirası Listesi'ne girdi. Beş bileşenden biri; kentsel sit dışındaki tek bileşen. [UNESCO karar 45 COM 8B.46](https://whc.unesco.org/en/decisions/8427)
- **Onarım:** 2007'de Vakıflar Genel Müdürlüğü onardı. [Timeturk](https://www.timeturk.com/tr/2011/11/04/civisiz-cami-650-yildir-ayakta.html)

Not: Sayfalar çalışma ortamından açılamadı; bilgiler arama sonuçlarındaki özetlerden alındı. "Mihrap dışında çimento yok" bilgisi tek bir kaynakta geçtiği için oyuna konmadı.

## Temsilî olanlar
- Ölçüler, direk sayısı ve yerleri.
- Mahfilin biçimi, mihrap ve minber.
- Kalem işi desenleri ve halılar.
- Pencereler, çatının biçimi, son cemaat yeri.
- Köy evleri, mezarlık, ağaçlar ve köy yolu.
