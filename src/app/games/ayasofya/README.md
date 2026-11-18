# Ayasofya — "Işığın ve Taşın Dansı"

Adres: `/oyun/ayasofya`. 3D haritada Ayasofya kartındaki **🕌 Ayasofya: Işığın ve Taşın Dansı** düğmesiyle de açılır.
Bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir (~54 KB, gzip ~21 KB). Serbest kamera yok.

## Önce dürüst bir not: "Fable 5.2" bir oyun motoru değil
İstekte Fable 5.2'nin sahne/asset API'leri, Nanite benzeri geometri sıkıştırması ve "50M+ poligonu 5 MB'a sığdırma" özelliği isteniyordu.
Fable 5.2 bu kodu yazan yapay zekâ modelinin adıdır; böyle bir motoru, komutu ya da API'si yoktur. Uydurma API yazmak yerine oyun,
projedeki diğer oyunlarla aynı gerçek teknolojiyle yapıldı: **React Three Fiber + drei + three.js + postprocessing**. Buna bağlı olarak:
- **Lazer tarama / fotogrametri verisi yok.** CyArk/ICOMOS verisine bu ortamdan erişilemiyor ve lisansı ayrıca gerekir. Yapı, yayımlanmış
  yaklaşık ölçülerden **prosedürel** olarak kuruldu (1 birim = 1 m). "1:1" yalnızca ana ölçüler için geçerlidir; ayrıntılar stilizedir.
- **Blender/Maya export, doku bake ve LOD betiği yok**, çünkü dışarıdan model/doku dosyası yok (varlık boyutu 0 MB). Gerçek bir model
  eklenirse önerilen hat aşağıda "Gerçek model eklenirse" bölümünde.
- **Fotogerçekçi değil.** PBR malzemeler, gerçek zamanlı ışık ve post-processing var; ama sonuç stilize bir canlandırmadır.
- **Mozaik panoları özgün eserlerin kopyası değildir**; kompozisyonu anımsatan basit çizimlerdir. Hat levhalarının yazısı yeniden üretilmedi.
- **Ezan ve ilahi sentezlenmedi.** Dini okuyuşları taklit etmek yerine mihrap önünde yalnızca ışık odaklanır; "müzik" seçeneği sentez bir dem sesidir.

## Dosya yapısı
```
src/app/games/ayasofya/
  HagiaSophiaGame.tsx  ana yönetici: serbest yürüyüş, üçüncü şahıs kamera, rehber Elif Hoca, inceleme, göz uyumu, kalite, post-processing, arayüz
  walk.ts              yürünebilir alan (zemin + güney galeri), rampa, rehber turu, figürler, kamera çarpışması (saf, test edilir)
  Outside.tsx          dış mekân: avlu, dış narteks revakı, payandalar, pencereli kasnak + kubbe, şerefeli minareler, şadırvan, bahçe
  HagiaScene.tsx       kabuk (kubbe, pandantif, yarım kubbeler, apsis, narteks), galeriler, sütunlar, pencereler, ışık huzmeleri,
                       mozaik panoları (doku akışı), mihrap, minber, omphalion, ölçek figürleri, ışıklar
  materials.ts         altın mozaik shader'ı, prosedürel mermerler (yeşil Tesalya, porfir, beyaz), pano çizimleri
  hagia.ts             ölçüler, güneş, pencereler, huzme hesabı, bölgeler, pozlama, ilgi noktaları (saf, test edilir)
  AudioManager.ts      bölgeye göre yankı (akustik), ortam sesi, adım, isteğe bağlı sentez müzik
src/app/pages/AyasofyaPage.tsx · tests/ayasofya.test.ts
```

## Ölçek ve mimari
Kubbe çapı ~31 m (kaynaklarda 31–32), tepe ~55,6 m, kubbe eteğinde 40 pencere; kubbe kasnağı 41,5 m; pandantifler yarıçapı R·√2 olan
kürenin parçasıdır (köşede kemer üzengisine, üstte kasnağa oturur — testte doğrulanır). Doğu ve batıda yarım kubbeler, doğuda apsis,
kuzey–güneyde pencereli timpanon duvarları, iki katlı yan nefler ve galeriler, batıda alçak ve karanlık narteks.
Mihrap apsisin ekseninden güneye kaydırılmış ve kıbleye çevrilidir. Ölçek için zeminde 1,70 m boyunda 14 ziyaretçi figürü durur.
Modelde 56 sütun var; gerçek yapıda yaygın olarak 107 sütun sayılır (bu sayı bu çalışmada kaynakla doğrulanmadı).

## Oynanış: serbest yürüyüş + rehber (v5)
- **Serbest yürüyüş:** joystick (mobil) / WASD (masaüstü), Shift ile koşma; hız 3,5 m/sn. Ray sistemi kaldırıldı.
- **Üçüncü şahıs kamera:** sürükleyerek çevrilir; yukarı sürükleyince bakış yükselir (kubbe görülür). İki parmak / tekerlek ile yakınlaşır. Duvarların, narteks tavanının ve galeri döşemesinin içine girmez.
- **Rehber Elif Hoca** (kurgusal sanat tarihçisi) on duraklık turu yönetir: avlu → narteks → kubbe altı → ayaklar ve pandantifler → omphalion → sütunlar → mihrap ve minber → rampa → Deisis → Zoe ve Komnenos. Durağa yürür, oyuncu geride kalırsa bekler, yanına gelince anlatır (daktilo yazısı + açılıp kapanabilen sesli okuma). Galeri katına rampa kapısından birlikte geçerler. Oyuncu galeriye önden çıkmışsa rampa durağı atlanır. Yol bulma Topkapı ile ortaktır (`shared/nav.ts`).
- **İncele:** yakındaki ilgi noktası için düğme çıkar (F). Kamera hedefe döner; uzaktaki hedefte (kubbe, apsis mozaiği) görüş açısı daralır.
- **Göz uyumu** korunur: narteksten nefe geçince ~2 sn kamaşma.
- **Figürler:** Kız Kulesi iskeletli karakteri. Avluda, nefte ve galeride ziyaretçiler (bazıları başörtülü), görevliler ve mihrap yakınında bir imam. Duranlar, sohbet edenler ve döngüsel yolda yürüyenler var (`shared/Crowd.tsx`). Eski tek parça ölçek figürleri kaldırıldı.

## Işık ve malzeme
- **Huzmeler (god rays):** güneşe bakan her pencereden (40 kubbe + 24 timpanon) güneş yönünde bir huzme; nef sınırında ya da zeminde biter;
  zemine düştüğü yerde ışık havuzu. Hepsi 2 InstancedMesh; saat değişince matrisler yeniden hesaplanır. Havada 900 toz zerresi.
  Bu, gerçek ışın yürütmeli hacimsel ışık değil, toplamalı (additive) geometriyle taklittir.
- **Altın mozaik shader'ı:** UV tessera ızgarasına bölünür; her taşın normali hücreye özgü rastgele bir eğimle bozulur, pürüzlülüğü
  0,18–0,5 arasında değişir, derzler metalik değildir. Böylece bakış açısı değişince farklı taşlar parlar. Uzaklıkla ayrıntı düz altına karışır (LOD).
- **Mermer:** tür başına 512² prosedürel doku + normal haritası; damarlar tam sayı frekanslı bozulmuş sinüslerle (dikişsiz).
- **Ortam haritası:** dosya değil; sahnede üretilir (drei `Environment` + `Lightformer`), saatle değişir.
- **Post-processing:** bloom (pencereler ve altın parıltıları), yüksek kademede N8AO ortam kapatma, ACES ton eşleme, vinyet.
  Pozlama ton eşlemeden önce ayrı bir efektle uygulanır.

## Uyarlanabilir kalite
| | düşük | orta | yüksek |
|---|---|---|---|
| Bloom / AO | yok / yok | var / yok | var / var |
| Gölge (sütun, figür) | yok | var | var |
| Tessera ayrıntısı, toz | yok | var | var |
| DPR | 1 | 1–1,5 | 1–2 |
| Pano dokusu (yaklaşınca) | 512 | 1024 | 1024 |
Başlangıç kademesi cihazdan tahmin edilir; `PerformanceMonitor` kare hızı düşünce bir kademe indirir. `?q=low|medium|high` sabitler.
**Pil < %20** (şarjda değilse): huzmeler ve dinamik gölge kapanır, düşük profile geçilir. **Doku akışı:** mozaik panoları 256 px ile başlar,
kamera 16 m'den yakına gelince yüksek çözünürlüğü üretilir. **Aşamalı yükleme:** kabuk → sütunlar/galeriler → ayrıntılar; yükleme çubuğu.
**Instancing:** sütun gövdeleri tür başına 1, başlık/kaideler 1, 64 pencere 1, huzmeler 1, havuzlar 1, figürler 1 çizim çağrısı.

## Ses
Bölgeye göre yankı: nef 7 sn, apsis 4 sn, galeri 1,8 sn, narteks 2,6 sn; bölge değişince çapraz geçer. Adım sesleri ve uzaktan fısıltılar
o bölgenin yankısına gider. Ortam: hafif rüzgâr, şehir uğultusu, narteks yakınında su sesi. Müzik isteğe bağlı ve varsayılan kapalı.

## Şanlıurfa ile tutarlılık
| | Şanlıurfa | Ayasofya |
|---|---|---|
| Bağımsız oyun, şiddetsiz keşif | ✓ | ✓ |
| Kamera | birinci şahıs, serbest bakış | üçüncü şahıs, serbest yürüyüş (v5) |
| Görsel | düz renkli low-poly, post-processing yok | PBR, ortam haritası, bloom/AO, dinamik güneş |
| Etkileşim | E / el düğmesi | yakınlık düğmesi + F / İncele, rehber diyaloğu |
| Yükleme | Three.js CDN'den | uygulama içinde, aşamalı |
Görsel düzey Şanlıurfa'nın üstünde; üslup (stilize figürler, Türkçe arayüz, sakin tempo) aynı ailede kalır.

## Gerçek model eklenirse (öneri; bu depoda uygulanmadı)
1. Blender'dan glTF 2.0 (GLB): +Y yukarı, metre; malzemeler Principled BSDF → metalik/pürüzlülük.
2. `gltf-transform`: `weld` → `simplify` (meshopt) → `meshopt` sıkıştırma; dokular KTX2 (`etc1s` renk, `uastc` normal).
3. LOD: 3 seviye (yakın / orta / uzak), drei `<Detailed>` ile; panolar ayrı dosyalar, yaklaşınca `useGLTF.preload`.
4. Gerçekçi hedef: mobilde toplam 5–8 MB ve birkaç yüz bin üçgen. 50 milyon poligon tarayıcıda 5 MB'a sığmaz.

## Test ölçütleri (gerçek cihazda — henüz ÖLÇÜLMEDİ)
Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader) işlevsel test yapıldı.
- [ ] iPhone 12, orta kademe: ana nefte 45+ FPS (30 sn otomatik tur); bloom açık
- [ ] Samsung A54, orta kademe: 30+ FPS; düşerse PerformanceMonitor düşük kademeye indiriyor
- [ ] Düşük kademede bloom/gölge/toz kapalı ve görüntü hâlâ okunur
- [ ] Narteks → nef geçişinde kamaşma ~2 sn sürüp uyum sağlıyor
- [ ] Saat kaydırıcısı: huzmeler ve pencere parlaklığı yön değiştiriyor
- [ ] Galeri panolarına yaklaşınca doku netleşiyor; taşlar tek tek seçiliyor
- [ ] Pil < %20: huzmeler ve gölgeler kapanıyor
- [ ] Kulaklıkla: nef ve galeri yankısı belirgin biçimde farklı

## Kaynaklar
- [Britannica — Hagia Sophia: Architecture](https://www.britannica.com/topic/Hagia-Sophia/Architecture)
- [World History Encyclopedia — Hagia Sophia](https://www.worldhistory.org/Hagia_Sophia/)
- [Live Science — Hagia Sophia: Facts, History & Architecture](https://www.livescience.com/27574-hagia-sophia.html)
- [UNESCO — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356/)
- [hagiasophia.com — Deesis Mosaic](https://www.hagiasophia.com/hagia-sophia-mosaics) · [Comnenus Mosaic](https://www.hagiasophia.com/comnenus)
- [University of Utah, Marriott Library — South gallery imperial portrait mosaics](https://collections.lib.utah.edu/ark:/87278/s62n8fht)

Doğrulanamayanlar: hat levhalarının çapı ve hattatı, toplam sütun sayısı (107), minberin kesin tarihi. Deisis'in tarihi kaynaklarda tartışmalıdır.

## v3 düzeltmeleri
- **Kamera:** dikey eksen tersti (aşağı sürükleyince yukarı bakıyordu) ve sınırda birikip takılıyordu; düzeltildi. Hassasiyet 0,8×.
  İstenen "pitch −45°…−90°" sınırı uygulanmadı: kamerayı yalnızca yere baktırır, kubbe görülemezdi; sınır −40°…+80° kaldı.
- **Doku netliği:** tüm dokularda anizotropi 16 ve mipmap; mermer orta/yüksek kademede 1024 px. Doku dosyası olmadığı için Blender UV adımı yok.
- **Dış mekân:** avlu, batı cephesi ve kapı, dıştan kurşun kubbeler, 4 minare, şadırvan, instanced ağaç ve çit. Zemin rayı avludan başlar;
  avlu ↔ iç geçişinde arka plan ve sis yoğunluğu anında değişir. GLB yok, hepsi prosedürel.
- **Figürler:** kapsül yerine bacak/gövde/kol/baş/el parçalı figürler (kişi başı ~330 üçgen, 2 InstancedMesh) ve bekleme salınımı.
  Mixamo modeli indirilemediği için kullanılmadı; yürüme animasyonu yok (figürler yerinde durur).
- **Merdiven:** modelde merdiven yok; galeriye geçiş kararma ile yapılır (gerçek yapıda da galeriye rampa ile çıkılır). Bu madde uygulanmadı.
- **Kubbe bezemesi:** ana kubbede 40 kaburga, etek ve tepe kuşakları, zikzak bordür, tepe madalyonu; yarım kubbelerde 14 kaburga.
  Desen shader'da üretilir (doku yok); düşük kademede kapalıdır.

## v4: "Turkuaz & Altın" (fotoğraf referansı)
- Zemin: içeride turkuaz halı (`#2A9D8F`, roughness 0,6, hafif sheen); narteks mermer kalır.
- Işık: sıcak altın ortam ışığı (`#FFD700`) + pencerelerden ve huzmelerden soğuk gün ışığı (`#E0F7FA`).
- Avizeler: 9 adet, alçak asılı, üç halkalı (4,6 / 3,1 / 1,6 m), orta-yüksek kademede avize başına 68 ampul; ampuller bloom eşiğinin üstünde.
- Kubbe bezemesi: altın zemin üzerine koyu lacivert kaburga, kuşak ve madalyon. Hat yazıları üretilmedi (levhalar yazısız).
- Referansla "birebir" değildir: yapı prosedüreldir; halı referanstakinden biraz daha açık görünür.

## v5: serbest yürüyüş, rehber ve yeni dış mimari
- **Dış mimari:** Kutu biçimli kütle yerine sıcak tonlu, kat silmeli sıva (dünya ölçekli UV), iki sıra pencere, kuzey ve güneyde dörder payanda var. Timpanon duvarlarında 7 + 5 pencere, kubbede 40 pencereli ve dişli kasnak, kurşun kubbe ve alem bulunuyor. Batı ve doğu yarım kubbeleri, köşe eksedra kubbeleri, sivri kemerli dış narteks revakı ve şerefeli dört minare (iki balkon, kalem külah) eklendi. Şadırvanın sütunları, şebekesi ve saçağı yenilendi; servi ve çınarlar, lale tarhları ve güvercinler eklendi.
- **Işık:** Avluda drei `Sky` ve oyuncuyu izleyen gölgeli güneş kullanılıyor. İçeride mevcut ışık sistemi (huzmeler, avizeler, ortam haritası) korunuyor.
- **İç mekân:** Mermer kaplama, ayak ve narteks zemini daha sık tekrarlanıyor; damarlar artık iri görünmüyor. Yan nef ve galeri duvarlarında gün ışığı alan pencereler, narteksin batı duvarında küçük pencereler var. Galeri döşemesi artık mermer.
- **Dürüstlük:** Plan ve ölçüler stilizedir. Rampa çizilmez; kat geçişi ekran kararmasıyla yapılır. Yalnızca güney galeri yürünebilir. Kare hızı gerçek telefonlarda ölçülmedi.
