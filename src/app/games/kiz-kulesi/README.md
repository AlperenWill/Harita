# Kız Kulesi — "Vapur Yolculuğu & Ada Keşfi"

Adres: `/oyun/kiz-kulesi`. 3D haritada Kız Kulesi noktasının kartındaki **🚢 Kız Kulesi: Vapur Yolculuğu** düğmesiyle de açılır.
Bağımsız, NPC odaklı bir oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir (~66 KB, gzip ~24 KB). Serbest kamera yok.

## Dosya yapısı
```
src/app/games/kiz-kulesi/
  MaidensTowerGame.tsx   ana yönetici: bölüm geçişleri, diyalog tetikleyicileri, joystick / etkileşim / zoom, başlık ve son ekranı
  FerryScene.tsx         1. bölüm: vapur modeli, rota, sallanma, güvertede yürüyüş, takip kamerası
  ferry.ts               sallanma matematiği, güverte sınırı, rota (saf, test edilir)
  Water.tsx              Gerstner dalga shader'ı; köpük yalnızca vapur burnu ve ada kıyısında
  NPCController.tsx      Can: iskelet, 4 durumlu animasyon makinesi, dudak senkronu, işaret etme, rüzgâr
  npc.ts                 durum seçimi, ağırlık karışımı, takip davranışları (saf, test edilir)
  rig.ts                 karakter geometrileri ve üçgen sayımı (bütçe testi)
  DialogueSystem.tsx     daktilo diyalog kutusu (react-spring), sesli okuma, geçme
  dialogue.ts            diyalog verisi yükleme, rastgele sıra, daktilo zamanlaması, dudak senkronu (saf, test edilir)
  dialogues.json         TÜM replikler — kod değiştirmeden düzenlenir
  IslandExploration.tsx  2. bölüm: iskele/ada, kule içi merdiven, teras, dönüş
  island.ts              yürünebilir alanlar, iskele tahtası, merdiven yolu, teras sınırı (saf, test edilir)
  TowerModel.tsx         Kız Kulesi, iskele, iki yaka (prosedürel)
  store.ts               Zustand: bölüm, diyalog oynatma ve kuyruğu, tercihler
  sound.ts               motor, su, martı, rüzgâr (Web Audio sentezi) + tr-TR sesli okuma
  input.ts               joystick + klavye birleştirme
src/app/pages/KizKulesiPage.tsx · tests/kizkulesi.test.ts
```

## Akış
| Bölüm | Oyuncu | Can | Kamera |
|---|---|---|---|
| Vapur (gidiş) | Baş güvertesinde serbest ama sınırlı yürüyüş (düşme yok) | Yanında (beside); replikler rastgele sırayla | Arkada ve köprüüstü hizasında, burna (kuleye) bakar; vapurla birlikte kuleye ilerler |
| Yanaşma | İskele tahtası inince güverte → tahta → iskele → kapı | Önden yürür (lead), oyuncu 6 m geride kalırsa bekler | Batıdan, sabit yönlü takip |
| Kule içi | Dar merdivende yol boyunca ileri/geri | Arkadan gelir (behind); 3 taşta durdurup işaret ederek anlatır | Oyuncunun arkasında, kuyunun içinde |
| Teras | Çatıda kulenin çevresinde yürüyüş | Yanında; iki yakayı gösterir; etkileşim düğmesi ek bilgi | Doğudan, yüksekten batıya |
| Dönüş | İskeleden vapura bin | Adada kalır, vedalaşır | Doğudan iskeleye |

Kullanıcının kamera üzerindeki tek kontrolü yakınlaştırmadır (+/− düğmeleri, fare tekerleği, iki parmak, klavyede +/−).

## Neden bu NPC davranışı
- **Rehber, oyun karakteri değil:** Can oyuncunun yolunu kesmemeli ve kaybolmamalı. Vapurda yanında, adada önden (oyuncu geride kalınca bekleyerek),
  dar merdivende arkadan yürür; böylece görüşü hiç kapatmaz.
- **Konuşurken ne anlattığını gösterir:** replik bir yerden bahsediyorsa (`anim: "point"`, `lookAt: "tower" | "stone" | "view"`) sağ kolu omuzdan
  hedefe döner; değilse yüzünü oyuncuya çevirir ve el hareketleri yapar.
- **4 durum, yumuşak geçiş:** idle / walk / talk / point; öncelik point > talk > walk > idle. Her duruma 0..1 ağırlık verilir ve ~0,25 sn'de karışır.
  Yürüme alt gövde katmanı olduğu için Can yürürken konuşabilir.
- **Dudak senkronu:** ses dosyası olmadığı için ses analizine değil, daktilonun son yazdığı harfe bağlıdır: sesli harfte çene açılır, sessizde yarı,
  boşlukta kapanır. Sesli okuma açıkken konuşma sentezi ile aynı satırı okur (tam eşzamanlı değildir).

## Vapur sallanma matematiği (`ferry.ts`)
```
heave(t) = 0.10·sin(0.90t) + 0.04·sin(1.73t + 1.0)     m     (en çok ±0,14 m)
pitch(t) = 0.018·sin(0.70t + 0.5) + 0.006·sin(1.31t)   rad   (en çok ±1,4°)
roll(t)  = 0.026·sin(0.55t) + 0.008·sin(1.19t + 2.0)   rad   (en çok ±1,9°)
```
Frekanslar birbirinin katı olmadığı için hareket tekrar ediyormuş gibi görünmez. Hepsi `k` ile ölçeklenir: seyirde 1, iskelede 0,2–0,25.
Kamera sallanmayan vapur dönüşümüne bağlıdır (yalnızca konum ve yön): ekranda dünya değil vapur sallanır; deniz tutmasını azaltır.
Rota ikinci dereceden Bezier'dir, hız profili smoothstep: yavaş kalkış, yavaş yanaşma (75 sn).

## Su shader'ı
3 Gerstner dalgası (18 m, 9 m, 5 m), analitik normal, Fresnel ile gökyüzü yansıması, güneş parıltısı. Köpük **yalnızca** iki yerde:
vapurun burnu (hızla orantılı, burnun önü ve gövdenin ilk ~10 m'si) ve adanın kıyısı (kule dibi). Ağ kameranın altında ızgara adımına yapışarak taşınır.
Orta kademede 160×160 (~51k üçgen), düşük kademede 96×96.

## Şanlıurfa ile tutarlılık
| | Şanlıurfa (`public/sanliurfa-oyun`) | Kız Kulesi |
|---|---|---|
| Bağımsız oyun | ✓ | ✓ |
| Rehber NPC ve diyalog | Rehberle konuşma (E / el düğmesi), Devam düğmesi | Can sürekli yanında; daktilo + sesli okuma; el düğmesi / Boşluk ile geç |
| Mobil | Sol joystick, sağ el düğmesi | Aynı yerleşim: sol joystick, sağ etkileşim düğmesi |
| Ortam sesi | Ayak sesi, kalabalık, martılar | Vapur motoru, su, martılar, rüzgâr |
| Kamera | ✗ birinci şahıs, **serbest bakış** | ✓ otomatik takip, yalnızca zoom |
| Yükleme | Three.js CDN'den | Uygulama içinde, CDN yok |

## İstenenden farklı yapılanlar (açıkça)
- **Mixamo / hazır karakter yok.** Bu ortamdan indirilemiyor ve lisans kontrolü gerekiyor. Can, kemik görevi gören iç içe gruplardan oluşan prosedürel
  bir karakter (SkinnedMesh değil, katı parçalar). Üçgen sayısı testte ölçülür: 5000'in altında. Kıyafet dokusu 512×512 canvas.
- **"Deniz feneri olarak başladı" ve "zindan" replikleri düzeltildi.** Kaynaklara göre kule önce gözetleme/savunma yapısıydı; fener 18. yüzyılda
  Damat İbrahim Paşa döneminde eklendi. Zindan kullanımı tek ve zayıf bir kaynakta geçiyor; Can bunu "rivayet" olarak söyler.
- **UNESCO notu:** Kız Kulesi UNESCO'nun "İstanbul'un Tarihi Alanları" bileşenlerinden biri değildir; oyunda UNESCO mirası olarak etiketlenmedi.
- **Ses dosyası yok,** sesli okuma tarayıcının tr-TR konuşma sentezi (cihazda Türkçe ses yoksa yalnızca yazı).
- **Ölçüler ve iç mekân yaklaşık/kurgusal:** ada ve yapı boyutları, kule içindeki dört kollu merdiven ve taşların yeri stilizedir. Yakalardaki şehir dokusu kabadır;
  yalnızca simge yapıların konumu gerçek koordinatlardan hesaplanır.

## Mobil kontroller ve performans notları
- Sol: sanal joystick (yalnızca dokunmatikte görünür). Sağ: etkileşim düğmesi — konuşma varken hızlandırır/geçer, yoksa o bölümün etkileşim repliğini açar.
- Sağ üst: + / − yakınlaştırma; iki parmakla da yakınlaştırılır. Dikey ekranda da oynanır (zorunlu yatay yok).
- Düşük kademe (`?q=low`, veri tasarrufu, ≤ 3 GB bellek ya da ≤ 4 çekirdek) veya pil < %20: gölge yok, su 96×96, şehir 350 blok, DPR 1, kenar yumuşatma kapalı.
- Şehir blokları tek InstancedMesh (iki yaka için iki çizim çağrısı); her karakter ~2,8k üçgen; gölge haritası 1024.
- Bölümler arasında sahne tamamen değişir (beyaz geçiş); aynı anda yalnızca bir bölümün nesneleri bellekte.

### Gerçek cihazda test listesi
Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader) işlevsel test yapıldı. **Gerçek telefonda FPS ölçülmedi.**
- [ ] Orta segment Android ve iPhone 11/12'de vapur bölümünde 45+ FPS (en ağır bölüm: su + iki yaka)
- [ ] Joystick ve etkileşim düğmesi aynı anda kullanılabiliyor (çoklu dokunma)
- [ ] İki parmakla yakınlaştırma joystick'i tetiklemiyor
- [ ] Sesli okuma iOS Safari'de ilk dokunuştan sonra çalışıyor; kapatınca susuyor
- [ ] Pil < %20 iken gölgeler kapanıyor
- [ ] WebGL kapalı tarayıcıda fotoğraf + Can'ın replikleri

## Kaynaklar
- [Wikipedia — Maiden's Tower](https://en.wikipedia.org/wiki/Maiden%27s_Tower)
- [Üsküdar Belediyesi — Maiden's Tower](https://www.uskudar.bel.tr/en/main/pages/maidens-tower/307)
- [Oxford Business Group — Turkey's history encapsulated in Istanbul's Maiden's Tower](https://www.oxfordbusinessgroup.com/overview/turkeys-history-encapsulated-istanbuls-maidens-tower)
- [İletişim Başkanlığı — Maiden's Tower reopens after 2 years of restoration](https://www.iletisim.gov.tr/ENGLISH/dis_basinda_turkiye/detay/maidens-tower-in-istanbul-reopens-in-original-outlook-after-2-years-of-restoration)
- [GoTürkiye — Istanbul's landmark Maiden's Tower reopens](https://goturkiye.com/branding/press-releases/istanbuls-landmark-maidens-tower-reopens)
- [Habertürk — Kız Kulesi açılıyor](https://www.haberturk.com/kiz-kulesi-aciliyor-3590728-magazin)
