# Justinianus (Beşköprü) Köprüsü (Sakarya) — "Taş Kemerler"

Kod: `src/app/games/justinianus/`
- `site.ts`: köprünün tabliyesi ve rampaları (iki katlı arazi yüksekliği), dere, ova ve duraklar. Saf veridir, test edilir (`tests/justinianus.test.ts`).
- `JustinianusModels.tsx`: 3B modeller (12 kemerli köprü gövdesi, rampalar, parapetler, tabliye, dere, sazlık, kavaklar, dağlar).
- `JustinianusGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `justinianus` (`src/data/heritage/marmara.ts`).

## Oyun
Oyuncu ovadan köprünün batı rampasına yürür, tabliyede dolaşır, doğu yakaya iner; kemerleri yandan, dereyi kıyıdan görür. Dere ovada yürünmez, doğu yakaya yalnızca köprüden geçilir. 5 ayrıntı:
1. Justinianus'un köprüsü
2. On iki kemer
3. Taş köprüden önce (ahşap dubalı köprü)
4. Çark Deresi
5. Geçici liste

## Taşkın (mekanik)
Ovadaki **taşkın ölçeğinde** (metre çizgili direk) **E** ile taşkın başlar. Su ovada başta yavaş, sonra hızlanarak 70 saniyede 3,6 m'ye yükselir, 8 saniye bekler, 18 saniyede çekilir. Su bel hizasını (zeminden 1,1 m) geçerse sel oyuncuyu sürükler; oyuncu ölçeğin yanına döner ve yeniden deneyebilir. Su dizi geçince (0,35 m) yürüyüş yavaşlar. Güvenli yer köprünün tabliyesi ya da rampanın yüksek kısmıdır.

Derenin yukarı akıntı tarafında ahşap bir **dubalı köprü** durur. Su 1,6 m'yi geçince parçaları akıntıyla sürüklenir. Bu, Prokopios'un anlattığı taşkınları ve taş köprünün neden yapıldığını gösterir. Taşkın atlatılınca bir kart açılır. Hedef toplam 8: 7 ayrıntı ve taşkın.
- **Test:** `tests/justinianus.test.ts`, ölçekten tabliyeye giden en kısa yolu yürüme hızıyla (koşmadan, suda yavaşlayarak) izler ve oyuncunun hiç sürüklenmediğini doğrular. Telefonda koşma tuşu olmadığı için bu önemlidir.
- **Temsilî:** Taşkının yüksekliği, hızı ve süresi; dubalı köprünün biçimi ve yeri; ölçek direği.

## Ayaklar ve uç yapılar
- **Ayaklar:** Yukarı akıntı yanında yuvarlak, aşağı akıntı yanında sivri. Kaynaklara göre bu, sivri mahmuzu yukarı akıntıda olan Roma köprülerinin çoğundan farklıdır. Oyunda kuzey (−z) yukarı akıntı kabul edildi. Mahmuzların uzunluğu ve başlıkları temsilîdir. [Wikiwand — Sangarius Bridge](https://www.wikiwand.com/en/articles/Sangarius_Bridge)
- **Doğu ucundaki apsis:** Yarım kubbesi doğuya bakar; kaynaklarda yaklaşık 11 m yüksek, 9 m geniş. İşlevi belirsiz; dinî bir yapı olabileceği düşünülüyor. Oyundaki yeri (rampanın kuzeydoğusu) temsilîdir. [Wikiwand](https://www.wikiwand.com/en/articles/Sangarius_Bridge)
- **Batı ucundaki zafer takı:** Bugün yok; yalnızca temelleri kaldı (Léon de Laborde'un 1838 çizimlerinde görülür). Oyunda yalnızca iki temel bloğu var.
- **Not:** Bir kaynak "yedi ana kemer" diyor; öteki kaynaklar 12 kemer gözü sayıyor. Oyunda 12 göz var. Bu bilgiler arama sonucu özetlerinden alındı; Wikipedia sayfası bu oturumda açılamadı.
- **Restorasyon:** DHA, köprünün 8 yıl süren restorasyon ve kazının ardından yeniden ziyarete açıldığını yazıyor. Haber yalnızca arama sonucunda görüldü; oyun metnine alınmadı. [DHA](https://www.dha.com.tr/foto-galeri/unesco-listesindeki-justinianus-koprusu-8-yillik-restorasyonun-ardindan-yeniden-ziyarete-acildi-2921582)

## Kaynaklarda bulunanlar
- **Tarih ve yer:** Yaklaşık MS 562'de tamamlanmış; Beşköprü köyünde, Adapazarı'nın birkaç kilometre güneybatısında. [Wikipedia — Sangarius Bridge](https://en.wikipedia.org/wiki/Sangarius_Bridge), [Structurae](https://structurae.net/en/structures/sangarius-bridge)
- **Kemerler ve ölçüler:** 12 kemer gözü (kaynaklar tutarlı). Uzunluk 365, 384 ve 429–430 m olarak farklı veriliyor; genişlik yaklaşık 9,85 m. [NTV](https://www.ntv.com.tr/sanat/galeri-justinianus-koprusu-bin-bes-yildir-ayakta-duruyor,42LnXDyqskaINd9nUeuPvg)
- **Önceki köprü:** Prokopios, taşkınlarda sık sık sürüklenen ahşap bir dubalı köprüyü anlatır. [Wikipedia](https://en.wikipedia.org/wiki/Sangarius_Bridge)
- **Dere:** Köprü bugün küçük Çark Deresi'nin (antik adı Melas) üzerinde; Sakarya'nın bugünkü yatağı yaklaşık 3 km doğuda. [Wikipedia](https://en.wikipedia.org/wiki/Sangarius_Bridge)
- **Geçici liste ve restorasyon:** NTV'ye göre 2018'de UNESCO Dünya Mirası Geçici Listesi; ardından restorasyon projesi. [NTV](https://www.ntv.com.tr/sanat/unesco-dunya-miras-gecici-listesine-girenjustinianus-koprusune-restorasyon-pro,S3gqtB9zgEGOyWq6gM94eA)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Yapım tarihi:** Bir inceleme (Whitby, 1985) yapıyı 559–562 arasında tartışıyor; "562" tamamlanma yılıdır, başlangıç kesin değil.
- **Uzunluk:** 365 / 384 / 429–430 m çelişkisi metinde belirtildi; oyunda köprü 152 m.
- **Kemer ayrıntısı:** Bir Arapça kaynak "7 ana + 5 taşkın kemeri" diyor; ikinci bir kaynak bulunamadı, oyunda 12 eşit kemer var.
- **Nehrin yatağı:** Justinianus'un Sakarya'yı Sapanca'ya doğru kaydırmayı amaçladığı bir bilim insanı yorumudur, kesin bilgi değildir; oyunda "yorum olarak aktarılır" diye geçiyor.
- **Restorasyonun tamamlandığı:** Tek bir haber kaynağında geçti; oyuna alınmadı.

## Temsilî olanlar
- Köprü 152 m'ye kısaltıldı; kemerlerin biçimi (yarım daire), eşit açıklığı ve kalınlıkları.
- Rampaların ve parapetlerin biçimi; tabliyenin kaplaması.
- Derenin yeri ve genişliği; bitki örtüsü ve kavaklar.
- Köprünün altı yürünmez; oyun yalnızca tabliyede ve ovada geçer.
