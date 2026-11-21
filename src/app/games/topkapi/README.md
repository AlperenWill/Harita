# Topkapı Sarayı — serbest yürüyüş + rehber

Rota: `/oyun/topkapi` (3D haritada Topkapı kartındaki **Oyna** düğmesi). Giriş noktası `TopkapiGame.tsx` (varsayılan dışa aktarım, `{ onExit }`).

## Oynanış
- **Serbest yürüyüş:** joystick (mobil) / WASD (masaüstü), Shift ile koşma. Hız 3,5 m/sn.
- **Birinci şahıs kamera:** göz hizası (1,62 m; alçak tavanda tavanın altında kalır). Masaüstünde tıkla + fareyle, telefonda sürükleyerek bakılır. Oyuncunun kendi modeli çizilmez.
- **Rehber Hasan Efendi** (kurgusal saray kâtibi) on duraklık turu yönetir (`TOUR`). Sıradaki durağa yürür, oyuncu çok geride kalırsa bekler. Oyuncu yanına gelip **E**'ye (ya da "Konuş" düğmesine) basınca anlatır, kendiliğinden başlamaz; yazı daktilo efektiyle gelir, sesli okuma açılıp kapatılabilir. Durak bir iç mekândaysa kapının önünde bekler ve oyuncuyla birlikte geçer. Tur bitince oyuncuyu izler.
- **Yol bulma:** her bölge için ızgara + hedef başına BFS akış alanı (`guideStep`, `nextWaypoint`). Görüş açıksa doğrudan yürür.
- **İnceleme:** yakındaki yapı ya da nesne için "İncele" düğmesi (F) bilgi kartı açar; her kartta kaynak bağlantısı var. Hazinede vitrine yaklaşılır, nesne sürükleyerek çevrilir.
- **Kapılar:** yaklaşınca "gir" düğmesi (E). Ekran kararır, bölge değişir.

## Bölgeler (aynı anda yalnızca biri çizilir)
| Bölge | İçerik |
|---|---|
| Avlular | Bâb-ı Hümâyun (stilize tuğra levhası), Aya İrini, Bâbüsselâm (iki külahlı kule), servi yolu ve lale tarhları, şadırvanlar, Divan revakı ve Adalet Kulesi, bacalı mutfaklar, Bâbüssaâde, Arz Odası, III. Ahmed Kütüphanesi, Enderun, revaklı Hazine; güvercinler |
| Divan-ı Hümâyun | Kalem işi kubbe, çini kuşak, altın kafesli pencere, sedirler, avize, vezirler |
| Harem | Altın Yol (kandiller), Valide Sultan Dairesi (tam çini, boyalı tavan, ocak, sedir, halı), hamam (cam gözlü kubbe, göbek taşı, kurna, buhar) |
| Enderun Hazinesi | Kaşıkçı Elması (dağılma shader'ı), Topkapı Hançeri, altın taht |

## Grafik
- **Mimari kit** (`kit.tsx`): kurşun kaplı kubbe + kasnak pencereleri + alem, sivri kemerli revak (sütun/kemer InstancedMesh), konsollu geniş saçak + kırma çatı, külahlı sekizgen kule, pencere sıraları.
- **Prosedürel dokular:** kesme taş, sıva, kurşun, çimen, kaldırım taşı, mermer, ahşap; yükseklikten Sobel ile normal haritası. Kutu ve silindirlerde dünya ölçekli UV var, büyük duvarlarda taş gerilmez.
- **Işık:** drei `Sky` + oyuncuyu izleyen gölgeli güneş, `Environment` + `Lightformer` (HDRI dosyası yok), sis. İç mekânlarda odaya özgü ışık (gün ışığı, kandil titremesi, ocak ateşi, cam göz).
- **Son işlem:** Bloom (orta/yüksek), N8AO (yüksek), ACES ton eşleme, vinyet.
- **Figürler:** Kız Kulesi'nin iskeletli karakteri kaftan, kuşak, yaka şeridi, başlık (kavuk, sarık, börk, yemeni) ve sakalla giydirilir. Duranlar, sohbet edenler ve döngüsel yolda yürüyenler var (`EXTRAS`). 55 m'den uzaktakiler çizilmez.

## Kalite kademeleri
`?q=low|medium|high` ile sabitlenir. Sabitlenmezse cihazdan tahmin edilir; kare hızı düşerse bir kademe iner, düşük pilde tasarruf kipine geçer.
- **Düşük:** gölge, bloom ve AO yok; lale ve buhar sayısı az; `minTier` figürleri yok; elmas shader'ı yerine düz malzeme kullanılır.

## Ses
`AudioManager.ts`: Web Audio ile sentez. Bölgeye göre karışım: dış mekânda rüzgâr ve kuş, Divan'da beş konumlu (HRTF) konuşma benzeri uğultu, koridorda çıtırtı, hamamda su ve damla, hazinede parıltı. Anlatım tarayıcının tr-TR konuşma sentezi; cihazda Türkçe ses yoksa yalnızca yazı görünür.

## Test ve hata ayıklama
- `tests/topkapi.test.ts`: başlangıç, durak, kapı ve figür noktaları yürünebilir; kapılar karşılıklı; rehber turun tamamını kendi başına yürüyebiliyor; her nesne incelenebilir; figür yolları engelsiz.
- `?debug`: `window.__topkapi.tp(zone, x, z, yaw, pitch, dist)`, `stop(i)`, `inspect(id)`, `state()`.

## Dürüstlük notları
- Saray planı **stilizedir**: yapıların yeri ve biçim dili gerçeğe benzetildi, ölçüler kısaltıldı. Rölöve değildir.
- Hasan Efendi kurgusaldır. Kıyafetler dönem havası verir, birebir rekonstrüksiyon değildir.
- Tuğra levhası gerçek bir padişahın tuğrası değildir ve yazı içermez. Kubbe kuşağındaki "yazı" okunmayan bir süstür.
- Nesne metinleri kartta gösterilen kaynaklara dayanır (Wikipedia, Britannica, UNESCO, Daily Sabah).
- Kare hızı gerçek telefonlarda ölçülmedi; görüntüler yazılım GPU'su (swiftshader) ile alındı.
