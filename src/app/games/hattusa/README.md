# Hattuşa — "Kralın Yolu: Surların Gölgesinde"

Rota: `/oyun/hattusa` (haritada Çorum → Hattuşa). Hata ayıklama: `?debug` (`window.__hattusa`), kalite: `?q=low|medium|high`, pil tasarrufu: `?saver`.

## Dosya yapısı
```
src/app/games/hattusa/
├── site.ts                 # saf: arazi + Yerkapı seti, ~6 km sur halkası (4 m örnekler), kapılar, elçinin rotası, Yazılıkaya
├── GateRitualMechanic.ts   # saf: sınır geçiş ritüeli (kapalı → eğilme → bekçi sözü → kanatlar açılır → açık), çarpışma, yanlış yön
├── OpenWorldStreamer.ts    # saf: 120 m'lik sur parçaları için hi/lo/off planı (histerezisli), uzak arazi kararı
├── AncientWallSystem.ts    # çokgen taş + kerpiç dokuları, aşınma gölgelendiricisi, sur şeridi/kule/mazgal geometrisi
├── RockReliefRenderer.ts   # kabartma yükseklik haritaları, POM + kendi gölgesi, altın iz maskesi, Yazılıkaya kaya kütleleri
├── HattusaGame.tsx         # ana yönetici: parça akışı durumu, kamera, ritüel akışı, kapılar, Yazılıkaya, ses, arayüz
└── README.md
src/app/pages/HattusaPage.tsx · tests/hattusa.test.ts
```

## Oynanış
- Elçi Büyükkale'den çıkar. Sırasıyla:
  1. Aslanlı Kapı'dan dışarı.
  2. Yerkapı setinin dış merdiveni ve Sfenksli Kapı'dan içeri.
  3. Kral Kapısı'ndan dışarı.
  4. Yazılıkaya'ya.
- Kapalı bir halkada üç kapıdan geçip dışarıda bitmek için bu sıra gerekir. Kapıların sur üstündeki yerleri gerçeğe uygundur: batı, güney ucu, doğu.
- Her kapıda ritüel yapılır. Ritüelsiz kapı kapalıdır (oyuncu durur, uyarı alır). Geçilmiş bir kapıdan 20 m'den fazla geri dönülemez.
- **Kamera:**
  - Birinci şahıs, göz hizasında; yürüyüş rotaya bağlı (W/joystick bakılan yöne göre ileri/geri), bakış serbest. Ritüelde eğilince göz alçalır.
  - Rölyef İnceleme yalnızca oyuncu E'ye / düğmeye basınca açılır; kamera kendiliğinden yer değiştirmez.
- **Dokunmatik:** sol joystick yürütür, ekranı sürüklemek bakar; ≫ düğmesi (ya da N) sıradaki kapıya ya da kabartmaya götürür.

## Mobil performans test listesi (6 km sur + aşınma)
Gerçek telefonda kare hızı ölçülmedi. Yazılımsal GPU'yla (swiftshader) yapılan denemede düşük kademede ~16 kare/sn görüldü. Bu sayı gerçek cihazı temsil etmez.

**Sur akışı (6 km)**
- [ ] `?q=low|medium|high` ile Aslanlı Kapı'dan Yazılıkaya'ya yürü.
- [ ] Parça geçişlerinde (yaklaşık 120 m'de bir) takılma oluyor mu, bak.
- [ ] Her an yakın ayrıntılı ("hi") parça sayısı 1–4 arasında olmalı. `tests/hattusa.test.ts` bunu denetliyor.
- [ ] Uzaklaşan parça bellekten boşaltılıyor mu? Spector.js / bellek profiliyle kontrol et (geometriler `dispose`).
- [ ] Sınırda ileri-geri yürürken parça sürekli açılıp kapanmamalı (histerezis %25).

**Aşınma gölgelendiricisi**
- [ ] Taş kenarları daha açık ve pürüzlü, derzler koyu görünmeli.
- [ ] Duvar diplerinde toprak/nem lekesi, dikey yüzlerde yağmur izi olmalı.
- [ ] Pil tasarrufunda (`?saver` ya da şarj < %20) gölgelendirici eki kapanmalı; yalnız statik doku kalmalı.
- [ ] İlk açılışta gölgelendirici derlenirken takılma süresini not et.

**Kabartmalar**
- [ ] Orta kademede POM 12 adım, yüksekte 24 adım; düşükte POM kapalı (normal haritası).
- [ ] İnceleme modunda güneş döndükçe figür gölgeleri yer değiştirmeli.
- [ ] Altın iz parıltısı çok hafif olmalı. Bu sanatsal bir vurgu, kartta da belirtiliyor.

**Uzak arazi**
- [ ] Düşükte dağ panosu ve uzak arazi kaldırılır, yalnız gök + sis kalır (arazi 1,8 km kareye küçülür).

**Dokunmatik ve genel**
- [ ] Dikey sürükleme yürütür, çift dokunuş sıradaki hedefe götürür.
- [ ] Ritüel düğmesi ve diyalog kutusu başparmağın erişebileceği yerde olmalı.
- [ ] PerformanceMonitor kare hızı düşünce kademeyi indirmeli. Ritüel süreleri gerçek zamanla işler; düşük kare hızında da 2 sn sürer.

## Şanlıurfa ve öteki oyunlarla tutarlılık
- Serbest kamera yok.
- Aynı cihaz profili ve `?q=` / `?debug` sözleşmesi.
- Pil tasarrufu.
- Canvas'ta üretilen dokular, Sobel normal haritası.
- tr-TR sesli okuma (bekçiler erkek sesi).
- Kaynaklı kartlar.
- WebGL2 yoksa Vikipedi fotoğraflı yedek ekran.

## Dürüstlük notları
- Plan stilizedir: Yazılıkaya'ya giden yol kısaltıldı ve kentin doğusuna yerleştirildi. Gerçek Yazılıkaya kentin kuzeydoğusundadır.
- Gerçekte Sfenksli Kapı Yerkapı setinin üstündedir ve set altında bir tünel (poterne) vardır. Oyunda kapıya dış merdivenle çıkılır.
- Bekçi sözleri kurgusaldır. Hitit metinlerinden alıntı değildir.
- Kral Kapısı'ndaki figür bir savaşçı tanrıdır. Yerindeki kabartma kopyadır; aslı Ankara'dadır.
- Yazılıkaya'daki altın parıltı istek üzerine eklenmiş sanatsal bir vurgudur. Kabartmalarda altın kaplama kanıtı bilinmemektedir.
- Mazgal biçimi Hitit kule/kap modellerinden esinlenilerek temsilî çizilmiştir.
- Su sesi yoktur: Hattuşa kurak bir bölgedir.

## Kaynaklar
- [UNESCO — Hattusha: the Hittite Capital](https://whc.unesco.org/en/list/377)
- [Wikipedia — Hattuşaş](https://tr.wikipedia.org/wiki/Hattu%C5%9Fa%C5%9F)
- [Wikipedia — Yazılıkaya](https://tr.wikipedia.org/wiki/Yaz%C4%B1l%C4%B1kaya)
