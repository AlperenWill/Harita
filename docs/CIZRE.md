# Şırnak Cizre — Kırmızı Medrese: "Tuğla Tuğla" (kısa oyun)

Rota: `oyun/cizre` · Kod: `src/app/games/cizre/` · Test: `tests/cizre.test.ts` · Derinlik: kısa.

## Oyun
- **Sahne:** Oyuncu meydandan taç kapıdan avluya girer.
- **Ayrıntılar:** 4 ayrıntı E ile incelenir: medrese, cami ve külliye, türbe, onarım.
- **Mekanik:** Avlu duvarlarında 3 tuğla pano var: balıksırtı, dama ve zikzak. Her panoda 3 eksik tuğla bulunur. Oyuncu panoyu açar, eksik tuğlaya dokunur ve yönünü (yatay, dikey, sağa eğik, sola eğik) panonun kuralına göre seçer.
- **Kayıt:** Üç pano bitince onarım kartı açılır. Medresenin 1847'den sonra harabeye dönüp 2020'de başlayan onarımla yeniden açılmasına dayanır.

## Kaynaklarda bulunanlar
Bilgiler arama sonuçlarındaki özetlerden alındı.
- **Ad:** "Medreseya Sor" (Kırmızı Medrese), adını kırmızı tuğlalarından alır. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/kirmizi-medrese-8bfcc)
- **Malzeme:** Kırmızı tuğla, moloz taş ve kesme taş.
- **Külliye:** Cami, öğrenci ve yönetim bölümleri ve türbeden oluşur. [Mardin Artuklu Üniversitesi](https://gcris.artuklu.edu.tr/entities/publication/06f6d23a-4248-4f47-a7c6-95ee071710f7)
- **Yapım:** Çoğunlukla Cizre Beyi II. Şeref Han'a bağlanır.
- **Harabe ve onarım:** Beylik 1847'de kaldırılınca harabeye döndü. Kültür ve Turizm Bakanlığı'nın 2020'de başlattığı onarımdan yaklaşık iki buçuk yıl sonra yeniden açıldı. [Bengütürk](https://www.benguturk.com/kultur-sanat/cizre-restore-edilen-tarihi-yapilariyla-ziyaretcilerini-bekliyor-110855h)

## Belirsiz olanlar
- **Yapım tarihi:** Kaynaklarda 1508, 15. yüzyıl ya da 14. yüzyıl olarak geçiyor. Kartta üçü de yazıyor.
- **Melayê Cizîrî:** Türbede medfun olduğu yerel kaynaklara dayanıyor ([Rudaw](https://rudaw.net/turkish/middleeast/turkey/1211202314)); kartta "anlatılır" diye geçiyor.
- **Mem û Zîn:** Bağlantısı akademik kaynakla doğrulanmadı; oyunda geçmiyor.

## Temsilî olanlar
- **Yapı:** Oda düzeni, kanatların ölçüsü, kubbeler, taç kapının biçimi, taş ve tuğla bantlarının yüksekliği.
- **Tuğla desenleri:** Panolardaki üç desen medresenin gerçek bezemesi değil; kartta da bu yazıyor.
- **Çevre:** Çevredeki evler.

## Harita verisi düzeltmesi
`src/data/heritage/guneydogu.ts` içindeki özet "kırmızı boyalı süslemelerinden" diyordu. Kaynaklar adın kırmızı tuğlalardan geldiğini söylüyor; özet buna göre düzeltildi.

Aynı kayıttaki dönem alanı hâlâ `selcuklu`. Yapı Cizre Beyliği'ne bağlandığı için bu da büyük olasılıkla yanlış, ama düzeltilmedi.
