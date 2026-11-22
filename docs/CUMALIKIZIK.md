# Cumalıkızık — "Kapı Kapı Cumalıkızık"

Kod: `src/app/games/cumalikizik/`
- `village.ts`: sokaklar, evler, yapılar ve duraklar. Saf veridir, test edilir (`tests/cumalikizik.test.ts`).
- `CumalikizikModels.tsx`: 3B modeller.
- `CumalikizikGame.tsx`: oyun yöneticisi ve arayüz.

## Oyun
Oyuncu köyde serbestçe dolaşır ve 10 ayrıntıyı bulur:
1. iki tokmaklı kapı
2. kafesli ve cumbalı pencereler
3. ahşap hatıllı taş duvar
4. kerpiç dolgulu ahşap iskelet
5. taş döşeli sokak
6. Cuma Camii
7. köy hamamı
8. avlu kapısı
9. meydan ve çınar (vakıf köyü, UNESCO)
10. Uludağ eteği

Hiçbir kart kendiliğinden açılmaz. Durağa yaklaşınca "İncele: … E" istemi çıkar. Kroki **M** tuşuyla ya da sağ üstteki düğmeyle açılır.

## Kaynaklarda doğrulananlar
- **Vakıf köyü ve UNESCO:** Köy, Orhan Gazi döneminde vakıf köyü olarak kuruldu; geliri Orhan Gazi Külliyesi'ne ayrılmıştı. 2014'te Bursa ile birlikte UNESCO Dünya Mirası Listesi'ne girdi ("Bursa and Cumalıkızık: the Birth of the Ottoman Empire", no. 1452). [UNESCO](https://whc.unesco.org/en/list/1452), [Bursa Alan Başkanlığı](https://alanbaskanligi.bursa.bel.tr/en/unesco/adaylik-dosyasi/ustun-evrensel-deger/)
- **Evlerin yapımı:**
  - Evler 2–3 katlıdır.
  - Zemin kat ahşap hatıllı moloz taştır; hatıllar yaklaşık 80–100 cm aralıklıdır.
  - Üst katlar kerpiç dolgulu ahşap iskelettir.
  - Çatılar beşik ya da kırmadır, alaturka kiremitle örtülüdür.
  - Bazı onarımlarda kerpiç dolgunun yerini tuğla almıştır.

  [ODTÜ tezi](https://avesis.metu.edu.tr/yonetilen-tez/0aae4aad-7396-448f-9891-00609bcd6e33/cumalikizik-koyundeki-geleneksel-evlerin-yapim-teknikleri-bursa-turkiye), [KTB — Cumalıkızık Houses](https://ktb.gov.tr/EN-36102/cumalikizik-houses.html)
- **Pencereler:** Üst katlarda cumbalı ya da kafesli pencereler var. Bir çalışmaya göre sokağa bakan ara katlarda çıkma genellikle yoktur.
- **Avlu:** Evlere çift kanatlı ahşap avlu kapısından girilir. Avlu duvarları da ahşap hatıllı moloz taştır.
- **Tokmaklar:**
  - Anadolu Ajansı'na göre küçük tokmağı kadınlar, büyüğünü erkekler çalar. Bu bir gelenek anlatısıdır.
  - Köşklü ve Büber (Art-Sanat) 135 evi inceledi; bugüne ulaşan 66 halka ile 40 tokmak kaydetti ve çoğunu 19. yüzyıla tarihlendirdi. [Makale kaydı](https://avesis.atauni.edu.tr/yayin/50904872-2896-430d-afda-b936dcd437b9/door-ring-knocker-and-mirrors-in-bursa-cumalikizik-houses-bursa-cumalikizik-evlerinde-kapi-halka-tokmak-ve-aynalari)
- **Sokaklar:** Yassı taşla döşelidir. [TRT Haber](https://www.trthaber.com/haber/turkiye/yedi-asirlik-osmanli-koyu-cumalikizik-762706.html)
- **Konum ve ürünler:** Köy Bursa merkezine yaklaşık 10–12 km uzaklıkta, Uludağ eteğindedir. Kestanesi, böğürtleni ve ahududusuyla bilinir. [KTB — Cumalıkızık](https://www.ktb.gov.tr/EN-36101/cumalikizik.html), [Daily Sabah](https://www.dailysabah.com/travel/2019/03/09/cumalikizik-a-700-year-old-ottoman-village)
- **Cami:** Yapım tarihi kaynaklarda çelişiyor; kimi 1396, kimi 17. yüzyıl diyor. Oyunda iki tarih de veriliyor.
- **Hamam:** Tarihi kesin bilinmiyor; kimi kaynak 15. yüzyıl diyor.
- **Köyün adı:** Cuma namazı için insanların burada toplanmasından geldiği anlatılıyor. [Daily Sabah](https://www.dailysabah.com/travel/2019/03/09/cumalikizik-a-700-year-old-ottoman-village)

Not: Vikipedi ve UNESCO sayfaları çalışma ortamından açılamadı. Bilgiler arama sonuçlarındaki özetlerden alındı.

## Temsilî olanlar (doğrulanmadı ya da bilerek sadeleştirildi)
- Sokak planı, ev sayısı ve yerleşim. Köyün gerçek planı değil; dokusundan esinlenen bir düzen.
- Sıva renkleri. Bugünkü köyde renkli evler görülüyor ama renk dağılımı için kaynak bulunamadı.
- Caminin, hamamın ve çeşmenin biçimi ve ölçüleri. Minare, son cemaat yeri ve kubbe sayısı temsilîdir.
- Sokak ortasındaki su oluğu için kaynak bulunamadı; modellenmedi.
- Meydandaki çınar ağacı ve çeşme temsilîdir.
