# Dolmabahçe Sarayı — "Kristal ve Işığın İhtişamı" (Parıltı Avı)

Rota: `/oyun/dolmabahce`. 3D haritada Dolmabahçe kartındaki düğmeyle açılır. Giriş noktası `DolmabahceGame.tsx` (`{ onExit }`).

## Dosya yapısı
```
dolmabahce/
  DolmabahceGame.tsx        Ana yönetici: parıltı avı durumu, ileri/geri hareket, bölgeye göre otomatik kamera, avize yörüngesi,
                            makro inceleme, haleler, kalite planı, arayüz
  CrystalChandelier.tsx     Kristal avize: damla kristaller tek InstancedMesh, ampuller, yaldızlı gövde, LOD silüeti, yörünge kamerası
  LuxuryMaterialSystem.ts   PBR: kristal (transmission), altın varak, mermer, Hereke halısı (yer değiştirme + sheen), maun, pirinç, kadife
  SparkleHuntMechanic.ts    Parlayan nesneler, nabız matematiği, yaklaşma algılama, çift dokunuşla en yakın nesne (saf, test edilir)
  ReflectionOptimizer.ts    Uyarlanabilir yansıma (düzlemsel / ortam küpü), transmission açık-kapalı, kristal sayısı, avize LOD'u (saf)
  PalaceScene.tsx           Medhal, Muayede (56 sütun, kubbe, Hereke, dev avize), koridor, Kristal Merdiven, Süfera, Atatürk'ün odası
  palace.ts                 Plan, rota (yay uzunluğu), bölgeler, merdiven geometrisi, kamera sınırlama (saf)
  DolmabahceAudio.ts        Sessizlik + oda yankısı, zemine göre ayak sesi, konumlu kristal tınısı
```

## Oynanış
- **Rota:** Medhal → Muayede Salonu (avizenin altından geçer) → koridor → Kristal Merdiven (sol kol) → Süfera Salonu → Atatürk'ün odası.
- **Hareket:** yalnızca ileri/geri (W/S ya da ekranı dikey sürükleme). Hız yumuşakça artar ve azalır.
- **Kamera:** her bölümde kendiliğinden en iyi açıyı bulur ve yavaşça süzülür. Serbest kamera yok.
  - Avizenin altında kamera avizenin çevresinde aşağıdan yukarı doğru döner (`orbitCamera`).
  - Kristal Merdiven'de sabit bir köşe açısı kullanılır; iki kol ve kristal korkuluklar kadraja girer.
- **Parıltı Avı:** on nesne nabız atar (eklemeli hale + yıldız ışıltısı).
  - Yaklaşınca kristal ve altın nesnelerde cam tınısı çalar ve "İncele" düğmesi çıkar.
  - "İncele"ye basınca kamera nesneye makro yakınlaşır (dar görüş açısı) ve malzeme kartı açılır: ad, malzeme, bilgi, kaynak.
  - Çift dokunuş ya da N tuşu: henüz bulunmamış en yakın nesneye kendiliğinden gider ve kartı açar.

## PBR gerekçeleri (ayrıntı: LuxuryMaterialSystem.ts)
- **Kristal: `transmission 1, ior 1.5, roughness 0, thickness 0.5`.**
  - Bohem/soda-kireç camının kırılma indisi ~1,50'dir. Cilalı kesme yüzeyde pürüz kırılan görüntüyü bulanıklaştırır ("buzlu cam"). 0,5 kalınlık ince damla prizmalarda belirgin ama aşırı olmayan bir kırılma ofseti verir.
  - Yalnızca yüksek kademede açıktır, çünkü transmission ek bir opak sahne geçişi ister.
  - Orta ve düşük kademede ortam haritasından güçlü yansıyan yarı saydam cam (`clearcoat 1`) kullanılır.
- **Altın varak: `metalness 1, roughness 0.2, clearcoat 0.8`.**
  - Rengi speküler yansımadan gelir.
  - Alçı kabartma üzerine yapıştırıldığı için kusursuz ayna değil, yumuşak parlar.
  - Vernik tabakası ikinci, beyaz ve keskin bir parıltı ekler.
  - Kabartma (rokoko C-kıvrımlar, rozet) yükseklik haritasından Sobel ile normal haritası olarak üretilir.
- **Hereke:** desenli doku, tüy normal haritası ve yüksek kademede `displacementMap` var. `sheen 1` yatay bakışta lif saçılmasıyla rengi açar; istenen fresnel renk değişimi budur.
- **Mermer:** `roughness 0.08 + clearcoat`. Yansıma düzlemsel yansımadan ya da ortam küpünden gelir.

## Avize kristal matematiği (ayrıntı: CrystalChandelier.tsx)
- **Katlar:** k = 0..K−1; her katın kendi yarıçapı (r_k) ve yüksekliği (y_k) var.
- **Sarkan diziler:** her kat halkasında n_k = ⌊2π·r_k / aralık⌋ dizi bulunur.
  - Dizideki i'nci damlanın yeri `(r_k cosθ, y_k − i·ℓ, r_k sinθ)`, boyutu `s0·(1 − 0,12 i)`.
- **Çelenkler:** her kat halkasında, ardışık iki kol arasında sarkan kemerler var.
  - Sarkma bir parabol: `y = y_k − sarkma·(1 − (2u − 1)²)`.
- **Dönüşüm:** `M = T(p) · R_y(θ + π/2) · R_x(salınım) · S(s)`. Damlalar dışa bakar; avize çok yavaş (0,03 rad/sn) döndükçe parıltılar halka boyunca akar.
- **Sayılar:** dev avizede 2000+ damla tek draw call'dur. Orta kademede %60'ı, düşükte %30'u çizilir.
- **LOD:** uzakta damlaların yerine tek bir cam silüet çizilir. Histerezis (±%15) sınırda titremeyi önler.

## Uyarlanabilir yansıma
- **Yüksek:** düzlemsel yansıma 1024 px + bulanıklık; kristalde transmission açık; bloom.
- **Orta:** düzlemsel yansıma 512 px, bulanıklık yok; transmission kapalı; bloom.
- **Düşük / pil tasarrufu:** düzlemsel yansıma kapalı, statik ortam küpü (Lightformer'lardan bir kez üretilir); bloom yok; kristal %30.
  - Pil tasarrufunda nabız da durur, nesneler sabit parlaklıkta kalır.
- **Her zaman:** aynı anda yalnızca oyuncunun bulunduğu odanın zemini düzlemsel yansıtıcıdır (her yansıtıcı ayrı bir sahne geçişi demek).

## Mobil test listesi (henüz gerçek cihazda ÖLÇÜLMEDİ)
1. **Transmission:** `?q=high` ile avizenin altında 30 sn bekle (yörünge). Kare hızı 30 fps'nin üstünde mi? Düşüyorsa PerformanceMonitor ortaya iniyor ve transmission kapanıyor mu?
2. **Kırılma doğruluğu:** yüksek kademede damlaların arkasındaki sütunlar ve pencereler kırılmış/ters görünüyor mu, yoksa düz saydam mı? Kristal Merdiven korkuluklarına yakın inceleme yap.
3. **Transmission kapalıyken (`?q=medium`):** kristal hâlâ "cam" okunuyor mu (yansıma + bloom), yoksa gri plastik gibi mi?
4. **Düzlemsel yansıma:** Medhal ve Muayede'de zemin yansıması net mi? Oda değişince yansıtıcı doğru odaya geçiyor mu? `renderer.info.render.calls` yansıtıcı açık ve kapalıyken kaç?
5. **Pil tasarrufu (pil < %20):** düzlemsel yansıma, transmission ve nabız kapanıyor mu?
6. **Avize LOD:** uzaktan silüete, yakından damlalara geçiş sırasında titreme var mı?
7. **Dokunma:** dikey sürükleme ileri/geri akıcı mı? Çift dokunuş en yakın nesneye gidip kartı açıyor mu?
8. **Ses:** mermerde sert ve yankılı, halıda boğuk ayak sesi; kristal tınısı nesnenin yönünden geliyor mu (kulaklıkla)?
9. **Isınma:** 10 dk sonra kare hızı düşüşü.

## Şanlıurfa ve öteki oyunlarla tutarlılık
- Aynı cihaz profili (`?q=`, pil tasarrufu, PerformanceMonitor) ve `?debug` kancaları (`window.__dolma`).
- Türkçe arayüz, isteğe bağlı tr-TR sesli okuma, kaynak bağlantılı bilgi kartları.
- WebGL yoksa Vikipedi fotoğrafı ve kart yedeği.
- Misafir karakteri Kız Kulesi'nin iskeletli karakteridir.

## Dürüstlük notları
- **Plan ve ölçek:** plan stilizedir, ölçüler kısaltılmıştır. Muayede kubbesi gerçekte ~36 m'dir, burada ~30 m.
- **UNESCO:** Dolmabahçe UNESCO Dünya Mirası Listesi'nde değil ("İstanbul Tarihî Alanları" başka bölgeleri kapsar). Oyunda UNESCO etiketi kullanılmadı.
- **Kaynaklarda tartışmalı ya da değişken bilgiler:**
  - Avizenin "Kraliçe Victoria'nın hediyesi" olduğu bilgisi tartışmalıdır; kartta öyle belirtilir.
  - 4,5 ton / 750 lamba, 14 ton altın varak, 56 sütun ve "en büyük Hereke halısı" ikincil kaynaklardandır.
- **Saat 09.05:** odadaki saat 09.05'i gösterir. Atatürk 10 Kasım 1938'de saat 09.05'te sarayda vefat etti.
- **Kristal:** Kristal Merdiven'deki "Baccarat kristali, pirinç, maun" kaynaklardadır. Avizedeki damla yerleşimi ise stilize bir canlandırmadır.

## Kaynaklar
- [Wikipedia — Dolmabahçe Palace](https://en.wikipedia.org/wiki/Dolmabah%C3%A7e_Palace)
- [Britannica — Dolmabahçe Palace](https://www.britannica.com/topic/Dolmabahce-Palace)
- [Daily Sabah — Silent witness of 166 years of history: Dolmabahçe Palace](https://www.dailysabah.com/arts/silent-witness-of-166-years-of-history-dolmabahce-palace/news)
- [Archnet — Dolmabahçe Sarayı](https://archnet.org/sites/3475)
- [istanbul.com — Dolmabahçe Palace guide](https://istanbul.com/dolmabahce-palace-guide)
