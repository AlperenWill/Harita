# Yerebatan Sarnıcı — "Suyun Altındaki Işık"

Adres: `/oyun/yerebatan`. 3D haritada Yerebatan Sarnıcı kartındaki **🕯️ Yerebatan: Suyun Altındaki Işık** düğmesiyle de açılır.
Tamamen birinci şahıs, bağımsız bir oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir (~38 KB, gzip ~14 KB). Serbest kamera yok.

## Dosya yapısı
```
src/app/games/yerebatan/
  CisternGame.tsx           ana yönetici: sahne yükleme, oyuncu döngüsü (kamera, yürüme, nişangâh), giriş kapısı, arayüz, ayarlar
  FirstPersonController.ts  bakış (fare + dokunma), ±45° sınırı, yürüme fiziği, baş sallanma, adım olayları (saf + DOM girdi kancası)
  CisternScene.tsx          336 sütun (InstancedMesh), tonozlar, duvarlar, platformlar, ışık, su, sis
  MedusaInteraction.tsx     Medusa başları, gölgeli vurgu ışıkları, otomatik inceleme (yakınlaşma), bilgi paneli
  AudioManager.ts           uzamsal ses (HRTF), damlalar, uzak ayak sesleri, uğultu, bas tonu, yankı
  cistern.ts                ölçüler, sütun ızgarası, platformlar, ilgi noktaları, nişangâh ışın testi (saf)
src/app/pages/YerebatanPage.tsx · tests/yerebatan.test.ts
```

## Neden bu birinci şahıs mekaniği
- **Ölçek ve karanlık:** sarnıcın etkisi 9 metrelik 336 sütunun arasında, karanlıkta durmaktır. Bunu en iyi ziyaretçinin kendi gözü verir;
  dışarıdan bir kamera bu duyguyu kırar. Bu yüzden kamera her zaman gözdedir (platformun 1,62 m üstü), hiçbir modda gözden ayrılmaz.
- **Yavaş, ağır adım; koşma yok:** en yüksek hız 1,1 m/sn; ivmelenme ve durma yumuşak (ağır adım hissi). Sarnıçta koşmak hem ruhuna aykırı
  hem de ışığın ve sesin yavaşça açılmasını bozar.
- **Bakış ±45°:** tavanı ve suyu görmeye yeter; daha fazlası gerçek bir boyun hareketi değil ve mobilde yönelimi kaybettirir.
- **Platformda yürüme:** bugünkü sarnıçta olduğu gibi ziyaretçi sudan yükseltilmiş ahşap yollarda yürür. Yollar sütun aralıklarındadır;
  suya düşme ya da sütuna takılma olmaz. Kenarda eksen eksen kayarak ilerlenir.
- **Baş sallanma:** adım uzunluğuna (0,72 m) bağlı dikey ±2,8 cm, yanal ±1,2 cm; her adımda ahşap ayak sesi. Dururken sönümlenir.
- **Sabit nişangâh:** etkileşim için ayrı bir imleç yok; bakılan yer = seçilen yer. Bir ilgi noktasına 4 m'den yakın bakınca nişangâh parlar.

## Bakış girdisi ve hassasiyet
- **Masaüstü:** Pointer Lock API (Sarnıca in'e tıklayınca). Piksel başına 0,0022 rad × ayar. Esc fareyi bırakır; tekrar tıklayınca sürer.
- **Mobil:** ekranın sağ ~%60'ında parmak sürükleme (sol tarafta joystick; iki parmak aynı anda). Hassasiyet ekran genişliğine göre:
  tam ekran kaydırma ≈ 120° × ayar. Bu, dokunmatikte piksel başına dönüşü fareden düşük tutar (otomatik düşürme) ve her ekran boyutunda aynı hissi verir.
- **Ayar:** dişli simgesinde 0,3×–2,5× kaydırıcı; tarayıcıda hatırlanır.

## Su shader matematiği
`MeshReflectorMaterial` (drei) = düzlemsel yansıma + normal haritası melezi:
1. Su düzlemine göre aynalanmış sanal bir kamerayla sahne düşük çözünürlüklü bir hedefe çizilir (orta kademede 256, yüksekte 512 piksel).
2. Su yüzeyindeki her piksel yansımayı kendi ekran konumundan okur: `uv = proj(p)`.
3. Dalga: **prosedürel** normal haritası (dosya indirilmez; açılışta 2π-periyodik sinüs gürültüsünden üretilir) zamanla kaydırılır;
   normalin xy bileşeni okuma noktasını bozar: `uv' = uv + n.xy · distortion` (distortion = 0,25) → yansıma titrer.
4. Renk: `mix(koyu su, bulanık yansıma, mixStrength)`; dik bakınca koyu su, sığ açıda yansıma baskın.
Düşük kademede yansıma geçişi kapatılır; yalnızca normal haritalı, parlak koyu su kalır (bir çizim geçişi tasarruf).

## Işık ve sis
- Ortam ışığı neredeyse yok (0,05). Her sütunun dibinde turuncu bir ışık varmış gibi görünür:
  - suya düşen 336 yumuşak parıltı (1 InstancedMesh, toplamalı),
  - sütun shader'ında yükseklikle üstel sönen turuncu öz ışıma (`exp(−1,1·y)`), yani 336 sütun için ek ışık hesabı yok,
  - gerçek ışık yalnızca oyuncuya en yakın 4/6/8 sütunda (kademeye göre); ışık havuzu her 0,25 sn'de yeniden atanır.
- **Sis:** üstel sis (FogExp2). Kademeye göre yoğunluk ve kameranın uzak düzlemi birlikte ayarlanır: düşük 0,075 / 34 m, orta 0,055 / 48 m,
  yüksek 0,042 / 64 m. Düşük cihazda sis daha yoğun → daha kısa uzak düzlem → daha az piksel ve parça.
- **Gölge:** yalnızca Medusa başları (gölgeli iki spot) ve giriş kapısı (gölgeli bir spot) gölge üretir/alır; sütunlar gölge hesabına girmez.

## Medusa inceleme modu
Kuzeybatı köşede iki baş: biri **ters**, biri **yan yatık** (iki baş da ters değildir). Oyuncu başlardan birine 3,2 m'den yakınken ona bakarsa
inceleme kendiliğinden açılır: kamera platform kenarındaki sabit bir bakış noktasına süzülür, başa kilitlenir ve görüş 70°'den 36°'ye yavaşça daralır.
Bu sırada bakış ve yürüme durur; E / İncelemeden çık ile göze geri süzülür. Bas tonu Medusa'ya bakarken yükselir.

## Ses
Web Audio ile sentezlenir (dosya yok). 10 damla kaynağı sabit konumlarda HRTF `PannerNode` ile konumlanır: sağdaki sütundan düşen damla sağ kulaktan duyulur,
uzaklıkla söner. Uzakta (25–45 m) rastgele konumlarda yankılı ayak sesleri; oyuncunun kendi adımı konumsuz. İlgi noktasına yaklaştıkça hafif uğultu,
Medusa'ya bakınca derin bas. 3,5 sn'lik sentetik yankı. Dinleyici her karede kamerayla güncellenir.

## Şanlıurfa ile tutarlılık
| | Şanlıurfa (`public/sanliurfa-oyun`) | Yerebatan |
|---|---|---|
| Bağımsız oyun | ✓ | ✓ |
| Birinci şahıs, fare / parmakla bakış | ✓ | ✓ (+ ±45° sınırı, ayarlanabilir hassasiyet) |
| Mobil | sol joystick, sürükleyerek bakış, sağda el düğmesi | aynı yerleşim: sol joystick, sağda bakış, sağ altta İncele |
| Etkileşim | E / el düğmesi | E / İncele; sabit nişangâh parlar |
| Ayak sesi | yüzeye göre | ahşap platform + uzaktan yankılı adımlar |
| Ses konumlandırma | kalabalık mırıltısı (konumsal) | tüm damlalar ve uzak adımlar HRTF ile konumsal |
| Yükleme | Three.js CDN'den | uygulama içinde, CDN yok |
| Pil / WebGL'siz yedek | yok | var |

## İstenenden farklı yapılanlar (açıkça)
- **Hazır taş dokusu yok:** 1K taş dokusu ve normal haritası açılışta kodla üretilir (dosya 0 MB). Düşük kademede 512.
- **PointerLockControls yerine özel denetleyici:** drei'nin denetleyicisi mobil dokunmayı ve ±45° sınırını kapsamadığı için iki girdiyi tek yerde toplayan özel bir denetleyici yazıldı.
- **"Hacimsel sis":** gerçek ışın yürütmeli (raymarch) hacimsel sis mobilde pahalı; üstel sis + sudaki toplamalı parıltılar + sütunların alttan öz ışıması ile taklit edildi.
- **Medusa başları ve Tavus Gözü sütunu stilizedir;** başların yeri yaklaşıktır (kuzeybatı köşe). Platform düzeni gerçek sarnıçtakinin birebir kopyası değildir.
- **Ölçüler:** kaynaklar 138 × 64,6 m ile 143 × 65 m arasında değişiyor; 138 × 64,6 kullanıldı. Kapasite 80.000 m³ olarak verilir (bazı kaynaklarda 100.000 ton).

## Mobil performans notları ve test listesi
- Çizim çağrıları: sütunlar 1, tonozlar 1, parıltılar 1, Tavus Gözü 1, duvar/platform ~25, Medusa ~60 küçük parça; su yansıması sahneyi bir kez daha çizer (düşük kademede kapalı).
- Düşük kademe (`?q=low`, veri tasarrufu, ≤ 3 GB bellek ya da ≤ 4 çekirdek) veya pil < %20: gölge yok, yansıma yok, 4 gerçek ışık, yoğun sis, DPR 1.
Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader) işlevsel test yapıldı. **Gerçek telefonda FPS ölçülmedi.**
- [ ] Orta segment Android ve iPhone 11/12'de 45+ FPS (yansıma açıkken; düşerse `reflect` çözünürlüğü 128'e)
- [ ] Sol joystick + sağ yarıda bakış aynı anda çalışıyor; bakış hassasiyeti rahat
- [ ] Kulaklıkla: damlaların yönü doğru (sağdaki kaynak sağ kulakta)
- [ ] iOS Safari: ses ilk dokunuştan sonra başlıyor; HRTF destekleniyor
- [ ] Masaüstü: Esc sonrası tıklayınca fare kilidi geri geliyor

## Kaynaklar
- [UNESCO — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356/)
- [İBB Atatürk Kitaplığı — Yerebatan Sarnıcı Müzesi](https://ataturkkitapligi.ibb.gov.tr/en/Kitaplik/Muzelerimiz/Yerebatan-Cistern-Museum/11)
- [Archnet — Yerebatan Sarnıcı](https://archnet.org/sites/8249)
- [The National — Basilica Cistern reopens after restoration (2022)](https://www.thenationalnews.com/mena/2022/07/25/basilica-cistern-reopens-after-restoration-in-pictures-2)
- [Amusing Planet — The Incredible Basilica Cistern of Istanbul](https://www.amusingplanet.com/2016/03/the-incredible-basilica-cistern-of.html)
- [istanbul.com — Legend of Basilica Cistern](https://istanbul.com/en/city-life/legend-of-basilica-cistern)
- [Turkey Travel Planner — Basilica Cistern](https://turkeytravelplanner.com/go/Istanbul/Sights/Sultanahmet/Yerebatan.html)
