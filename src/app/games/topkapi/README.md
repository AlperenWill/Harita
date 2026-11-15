# Topkapı Sarayı — "Harem'in Fısıltıları & Hazine'nin Sırrı"

Adres: `/oyun/topkapi`. 3D haritada Topkapı Sarayı kartındaki **🏰 Topkapı: Harem'in Fısıltıları** düğmesiyle de açılır.
Bağımsız, hikâye odaklı oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir (~52 KB, gzip ~19 KB). Serbest yürüyüş ve serbest kamera yok.

## Dosya yapısı
```
src/app/games/topkapi/
  TopkapiGame.tsx            ana yönetici: bölüm akışı (Zustand), raylı kamera, portal ayıklama çağrısı, girdiler, arayüz
  palace.ts                  bölümler, odalar, raylar, portal ayıklama (visibleRooms), nesneler ve metinler (saf, test edilir)
  ObjectInteractionSystem.ts yaklaşma evreleri (uzak → fısıltı → inceleme), inceleme gözü, döndürme girdileri (saf, test edilir)
  ImperialGate.tsx           Bâb-ı Hümâyun (tuğra parlaması) + kuş bakışı avlular (billboard LOD ağaçlar)
  HaremCorridor.tsx          Divan, Harem koridoru, Valide Sultan Dairesi, hamam (buhar, köpük); yer tutucular
  TreasureRoom.tsx           hazine odası, elmas kırılma shader'ı, Topkapı Hançeri
  materials.ts               İznik çinisi (clearcoat), halı (normal + displacement), sedef kapı (emissive), stilize tuğra
  AudioManager.ts            fısıltı, konumlu Divan uğultusu, oda ortamları, tr-TR anlatım
src/app/pages/TopkapiPage.tsx · tests/topkapi.test.ts
```

## Bölümler
| Bölüm | Kamera | Etkileşim |
|---|---|---|
| Bâb-ı Hümâyun | Birinci şahıs, ray boyunca ileri/geri, sınırlı bakış | Kapıya yaklaşınca tuğra parlar; kamera yukarı bakıp yakınlaşır |
| Avlular | Kendiliğinden süzülen kuş bakışı (34 sn, atlanabilir) | Yapılar etiketlenir; kullanıcı kontrolü yok |
| Divan → Harem | Birinci şahıs; koridorda dar açı (44°) ve hafif titreme | Kafesli pencere (dinleme), sedef kapı, İznik çinileri, mermer kurna |
| Enderun Hazinesi | Birinci şahıs; vitrine otomatik yakınlaşma | Kaşıkçı Elması ve Topkapı Hançeri: sürükle / iki parmakla 360° çevir |

## Neden bu etkileşim ("görünmez rehber")
Oyuncu nesne aramaz; saray ona seslenir. Bir nesnenin tetik mesafesinin 2,2 katına girince nesne **fısıldar** (kısa bir cümle + nefes sesi),
tetik mesafesine girince kamera **kendiliğinden** yakınlaşır ve anlatım başlar. Görülen nesne yeniden kendiliğinden tetiklenmez; yakınındayken
düğmesiyle yeniden açılır. Dört inceleme kipi: `zoom` (yerinden, görüş daralır), `macro` (0,75 m'ye yaklaşır, dar açı), `rotate` (çevirme), `listen` (ses öne çıkar).

## Portal ayıklama matematiği (`palace.visibleRooms`)
Odalar x ekseninde art arda durur; aralarında 1,5 m genişliğinde kapı (portal) vardır.
1. Bulunulan oda her zaman tam ayrıntılıdır.
2. Komşu oda için kapının iki kenarına giden yönlerin bakış yönüyle açısı hesaplanır: `θ₁ = atan2(z₁ − z_göz, x_kapı − x_göz) − yaw`, `θ₂` benzer.
3. Görüş aralığı `[−hfov/2 − pay, +hfov/2 + pay]` ile kapının açısal aralığı `[min θ, max θ]` kesiştirilir. Kesişim boşsa kapı görünmez; oda yer tutucu kalır.
4. Kesişim boş değilse komşu oda çizilir ve **daralmış** aralıkla bir sonraki kapıya geçilir (zincir). Kapı arkadaysa (açı sarması) zincir biter.
Sonuç: aynı anda en çok bulunulan oda + kapılardan gerçekten görünen odalar çizilir; diğerleri tek kutudur (ışık, çini, eşya yok). Her 0,1 sn'de bir hesaplanır.
Yatay görüş açısı kameranın dikey açısından türetilir: `hfov = 2·atan(tan(vfov/2)·aspect)`.

## Malzeme, ışık, efekt
- **Çini:** `MeshPhysicalMaterial`, `clearcoat: 1.0`, `roughness: 0.2`; lale, karanfil, sümbül desenleri canvas'ta çizilir.
- **Halı:** desen + yükseklikten normal haritası + `displacementMap` (96×64 bölmeli düzlem); düşük kademede displacement kapalı.
- **Sedef kapı:** `emissiveMap` yalnızca sedef parçalarında; hafifçe parlar.
- **Işık sıcaklığı:** Divan ~4800 K beyaz/resmî, koridor ~2400 K titrek mum, Valide dairesi ~2900 K sıcak, hazine soğuk ve parlak.
- **Hamam:** üstel sis + yükselen sprite buhar + kurnada 60 köpük küreciği.
- **Elmas shader'ı:** düz fasetler; üç renk kanalı için farklı kırılma indisi (2,40 / 2,42 / 2,45) ile `refract`, prosedürel ışık ortamı, Fresnel.
  Taş döndükçe fasetlerin yakaladığı ışık şeritleri değişir. Gerçek ışın izleme değildir.
- **Pil < %20 ya da düşük kademe:** buhar ve mücevher shader'ı kapanır (düz fiziksel malzeme).
- **LOD:** avlu ağaçları 55 m'den uzakta kameraya dönük sprite, yakında 3D; çatılar için billboard yapılmadı (yapılar zaten birkaç kutu).

## Şanlıurfa ile tutarlılık
| | Şanlıurfa | Topkapı |
|---|---|---|
| Bağımsız oyun, şiddetsiz keşif, bilgi toplama | ✓ (3 hatıra taşı, rehber) | ✓ (7 nesne, görünmez rehber) |
| Kamera | birinci şahıs, serbest bakış ve yürüyüş | raylı; sınırlı bakış; avluda otomatik |
| Etkileşim | E / el düğmesi | yaklaşınca otomatik + düğme / E |
| Yükleme | Three.js CDN'den | uygulama içinde |

## İstenenden farklı yapılanlar (açıkça)
- **"Devlet kapısından içeri giren artık padişahın kuludur" sözü kullanılmadı.** Tarihî bir alıntı olduğuna dair kaynak bulamadım; kapının
  fısıltısı açıkça oyun için yazılmış bir cümledir ("Bu kapıdan geçen, sarayın düzenine girer…").
- **Divan'da taht yok.** Divan-ı Hümâyun'da padişah tahtı bulunmaz; padişahın toplantıları duvarın üstündeki kafesli pencereden izlediği anlatılır. Sahne buna göre kuruldu.
- **Vezirlerin sesi gerçek konuşma değil:** konumlu (HRTF) formant uğultusu; sözcük içermez.
- **Çiçek anlamları:** "sadakat, bereket" gibi anlamlar kesin kaynağa dayanmadığı için kartta "sonraki yorumlar" olarak geçer.
- **Tuğra stilize:** gerçek bir padişahın tuğrası değildir, yazı içermez.
- **Nesneye dokunma:** nesnenin kendisine değil, yakınındayken çıkan düğmesine dokunulur (bakış katmanı dokunmaları sürüklemeye ayırıyor).
- **Yerleşim kurgusal:** odaların sırası ve bitişikliği gerçek saray planının sadeleştirilmesidir; avlu maketi kabadır. Model/doku dosyası yok (0 MB).
- **Doğrulanamayanlar:** Bâb-ı Hümâyun'un tarihi ve tuğranın kime ait olduğu, kafesli pencerenin ayrıntıları bu çalışmadaki aramayla doğrulanamadı; metinlerde kesin tarih/isim verilmedi.

## Mobil performans test listesi (gerçek cihazda — henüz ÖLÇÜLMEDİ)
Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader) işlevsel test yapıldı.
- [ ] Orta segment Android ve iPhone 11/12'de her bölümde 45+ FPS; en ağır yerler: avlu (110 ağaç + etiketler) ve Valide dairesi (clearcoat + displacement)
- [ ] Portal ayıklama: Divan'da kapıya sırtını dönünce koridor yer tutucuya dönüyor (çizim çağrısı düşüyor); kapıya bakınca zincir açılıyor
- [ ] Koridor titremesi rahatsız etmiyor; gerekirse `shake` 0,5'e
- [ ] Hazine: tek parmak sürükleme ve iki parmak çevirme nesneyi döndürüyor
- [ ] Pil < %20: buhar ve mücevher pırıltısı kapanıyor
- [ ] Kulaklıkla Divan: sesler doğru yönden geliyor; dinleme kipinde öne çıkıyor
- [ ] iOS Safari: ses ilk dokunuştan sonra başlıyor; tr-TR anlatım çalışıyor

## Kaynaklar
- [Wikipedia — Topkapı Palace](https://en.wikipedia.org/wiki/Topkap%C4%B1_Palace)
- [Wikipedia — Spoonmaker's Diamond](https://en.wikipedia.org/wiki/Spoonmaker%27s_Diamond)
- [Daily Sabah — Discovering Ottoman treasures at Topkapı Palace](https://www.dailysabah.com/feature/2014/11/27/discovering-ottoman-treasures-at-topkapi-palace)
- [Bilkent Üniversitesi — Topkapı: Imperial Treasury](https://www.ee.bilkent.edu.tr/~history/topkapi3.html)
- [Encyclopaedia Britannica — Topkapı Palace Museum](https://www.britannica.com/topic/Topkapi-Palace-Museum)
- [UNESCO — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356/)
