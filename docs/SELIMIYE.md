# Selimiye Camii ve Külliyesi (Edirne) — "Sekiz Ayağın Altında"

Kod: `src/app/games/selimiye/`
- `site.ts`: ibadet mekânı (45 × 36 m), sekiz ayak, avlu, dört minare, dış meydan ve duraklar. Saf veridir, test edilir (`tests/selimiye.test.ts`).
- `SelimiyeModels.tsx`: 3B modeller (duvarlar, tavan ve kubbe, ayaklar ve kemerler, pencereler, çini panoları, halı, avlu, minareler, şehir).
- `SelimiyeGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: detaylı (`depth: 'detayli'`), popüler yer. Miras verisindeki kayıt: `selimiye` (`src/data/heritage/marmara.ts`).

## Oyun
Oyuncu külliye meydanından avluya, oradan sekiz ayaklı ibadet mekânına girer; kubbenin altında ve çini panolarının önünde dolaşır, minarelere bakar. 6 ayrıntı:
1. Sinan'ın ustalık eseri
2. Dört minare
3. Avlu
4. Tek bir büyük mekân
5. Sekiz ayaklı kubbe
6. İznik çinileri

## Kaynaklarda bulunanlar
- **Tarih ve yapıcı:** II. Selim'in emriyle Edirne'nin en yüksek noktasında 1569–1575 arasında yapıldı; UNESCO ölçütü (i): Sinan'ın yaratıcı dehasının başyapıtı. 2011'de Dünya Mirası Listesi'ne alındı. [UNESCO](https://whc.unesco.org/en/list/1366), [UNESCO kararı](https://whc.unesco.org/en/decisions/4308), [Wikipedia](https://en.wikipedia.org/wiki/Selimiye_Mosque,_Edirne)
- **Mekân ve kubbe:** İbadet mekânı yaklaşık 45 × 36 m; kubbe sekiz ayağa oturur. [UNESCO nominasyonu](https://whc.unesco.org/document/152488)
- **Minareler:** Dört minare, üç şerefeli. [Habertürk](https://www.haberturk.com/turkiye-nin-dunya-mirasi-viii-2887897)
- **Çini:** İç mekânda İznik çinicilik geleneğinin en parlak döneminden çiniler. [UNESCO](https://whc.unesco.org/en/list/1366)
- **Ustalık eseri:** Sinan'ın bu yapı için "ustalık eserim" dediği Türkçe kaynaklarda aktarılır; durak başlığı bu söyleyişten esinlendi, ama oyun metninde bu cümle yok (tek kaynağı UNESCO olan durağa bir Türkçe kaynak cümlesi karıştırmamak için). [İslam ve İhsan](https://www.islamveihsan.com/mimar-sinanin-ustalik-eseri-selimiye.html)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Kubbe çapı:** 31,25 / 31,5 / 32 m olarak farklı veriliyor; oyunda 31,5 m kullanıldı (UNESCO). Yükseklik 42–43 m.
- **Minare yüksekliği:** UNESCO belgesi kurşun kaplı külah uçlarına kadar yaklaşık 70,9 m verir; Türkçe haberlerde 85 m dolayı geçer. Oyundaki minareler 71 m. "83 m" bir kaynakta bulunamadı.
- **Açılış tarihi:** Bir haber 14 Mart 1575 diyor; oyunda yalnızca 1569–1575 yazıyor. Bir kaynak çalışmanın 1568'de başladığını söylüyor.
- **Müezzin mahfili, minber, mihrap ayrıntıları ve külliyenin medrese/arasta/Dar-ül Hadis bölümleri:** Bu aramada doğrulanamadı; oyunda yer almıyor. Oyundaki iç mekânda bir mihrap nişi ve basit bir minber bulunuyor, ikisi de temsilî.
- **Ayasofya'dan büyük kubbe iddiası:** Tek bir kaynakta; oyuna alınmadı.

## Temsilî olanlar
- Avlunun biçimi, revak sütunları ve ortadaki havuz (gerçek külliyenin avlusu farklı olabilir).
- Ayakların ve kemerlerin ölçüsü ve biçimi; pencere sayıları ve yerleri.
- Çini ve halı desenleri; avizeler.
- Mihrap nişi ve minberin biçimi.
- Çevredeki evler ve ağaçlar.
