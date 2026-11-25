# Zil Kale & Çamlıhemşin — “Sis İçindeki İzler”

Rota: `/oyun/zilkale` (haritada Zilkale → “Oyna”). Hata ayıklama: `?debug` (`window.__zil`), kalite sabitleme: `?q=low|medium|high`, pil tasarrufunu zorlama: `?saver`.

## Dosya yapısı

```
src/app/games/zilkale/
├── valley.ts                 # saf: arazi yüksekliği, dere, rota (s), köprü güvertesi, şelale, açılma anları, Tarih Katmanı noktaları
├── VolumetricFogSystem.ts    # saf: sis yoğunluğu σ(s,t,open), rüzgâr, HG faz + Beer–Lambert huzme, kademe planı (fogPlan)
├── HistoryLayerMorphing.ts   # harabe ↔ sağlam çözülme gölgelendiricisi, çürük ↔ taze ahşap, yakınlık hedefi ve zamanlama
├── ProceduralVegetation.ts   # eğreltiotu, yosun, orman gülü, ladin (+uzak pano), kızılağaç; yerleşim + köşe gölgelendiricisinde rüzgâr
├── OrganicArchitecture.tsx   # moloz taş + yosun/liken, tahta (normal + displacement), arazi, patika, dere/şelale suyu, sıçrama,
│                             #   tek kemerli köprü, Zil Kale (LOD), Hemşin evi ve serender (LOD), uzak dağlar
├── ZilKaleAudio.ts           # Web Audio: dere (mesafeyle), şelale, rüzgâr (rüzgâr yönünden), inek çanları, cızırtı/fısıltı, ayak sesi
├── ZilKaleGame.tsx           # ana yönetici: kamera, girdi, sis/ışık döngüsü, bitki örtüsü, sis perdeleri, huzmeler, arayüz, yedek ekran
└── README.md
src/app/pages/ZilKalePage.tsx # tembel yüklenen sayfa
tests/zilkale.test.ts         # rota, köprü, açılma anları, sis matematiği, Tarih Katmanı, bitki yerleşimi, pil planı
```

## Oynanış
- **Vadi:** birinci şahıs; patikanın çevresinde serbest (WASD bakılan yöne, patikadan en çok 1,2 m sapma; dikey sürükleme), bakış serbest (fare sürükleme, yatay sürükleme). Arkana dönüp ileri basarsan geldiğin yöne yürürsün. Yokuşta bakış eğime kendiliğinden uyar.
- **Kale tepesi:** rotanın son ~14 metresinde kamera sabit geniş açıya geçer: kale, kayalık burun ve uzaktaki sırtlar. Kamera kalenin dışında, ~40 m uzakta durur; duvarların içine girmez.
- **Açılma anları:** taş köprü, şelale ve kale girişi. Sis ~2 sn içinde tabanın %12'sine iner, ekranda yerin adı belirir. Uzaklaşınca sis ~5 sn içinde geri gelir.
- **Tarih Katmanı:** köy evi, serender, köprünün kayıp kitabesi, dış surlar, ana burç. Yaklaşınca yapı çözülerek “sağlam hâle” döner, cızırtı ve fısıltı sesi çalar, kaynaklı bir kart açılır. Çift dokunuş seni henüz görmediğin en yakın noktaya götürür.

## Sis ve ışık matematiği (özet)
- Mesafe sisi FogExp2'dir: `T = e^(−(σd)²)`. σ rotaya, rüzgâr esintisine ve açılma ilerlemesine bağlıdır.
- Işık huzmesinin parlaklığı: `σ · p_HG(cosθ, g = 0,6) · e^(−σd)`.
  - Güneşe bakınca güçlenir.
  - Çok yoğun siste boğulur, en çok orta yoğunlukta parlar.
- Pil tasarrufunda doğrusal sis kullanılır (`far ≈ 1,9/σ`). Sis perdeleri, ışık huzmeleri ve rüzgâr animasyonu kapanır; Tarih Katmanı geçişi anlık olur.

## Mobil performans test listesi (bitki örtüsü + sis)
Gerçek telefonda kare hızı ölçülmedi. Aşağıdaki maddeler gerçek cihazda kontrol edilmeli.

**Hazırlık**
- [ ] Orta sınıf bir Android (ör. 4 GB RAM) ve eski bir iPhone kullan. Chrome/Safari uzaktan hata ayıklama açık olsun.
- [ ] Sayfayı `?q=low`, `?q=medium` ve `?q=high` ile ayrı ayrı aç. Her birinde rotanın tamamını yürü.

**Bitki örtüsü**
- [ ] Düşük kademede alt bitki örtüsü %50'dir ve yalnız patika kenarında (≤ 7 m) durur. Yamaçlarda eğreltiotu olmamalı.
- [ ] Uzak ladinler çapraz iki düzlemlik panodur. Pano ile tam ağaç arasındaki geçiş patikadan rahatsız edici görünmemeli.
- [ ] Rüzgârda ağaçların dibi sabit kalmalı, yalnız uçları sallanmalı. Komşu bitkiler farklı anda eğilmeli; “tek blok” gibi sallanmamalı.
- [ ] Çizim çağrıları tür başına birdir (Spector.js ile doğrula). Toplam çağrı sayısı yaklaşık 60'ın altında olmalı.
- [ ] Alfa kesmeli eğreltiotu yapraklarının kenarlarında titreme (aliasing) kabul edilebilir düzeyde mi? Düşük kademede antialias kapalıdır.

**Sis**
- [ ] Açılma anları (köprü, şelale, kale) her kademede tetiklenmeli. Ekranda yer adı belirmeli, sis yaklaşık 2 sn'de açılmalı.
- [ ] Sis perdesi sayısı: yüksek 36, orta 22, düşük 12. Sayfa yarı saydam katmanlar yüzünden ağırlaşırsa düşükte sayıyı azalt.
- [ ] Işık huzmeleri güneşe bakınca (köprüden yukarı vadiye) belirginleşmeli, ters yöne bakınca sönmeli.
- [ ] Pil tasarrufu (`?saver` ya da şarj < %20 ve şarjda değil):
  - doğrusal sis,
  - perde, huzme ve rüzgâr animasyonu yok,
  - son işlem efektleri (bloom) yok,
  - Tarih Katmanı geçişi anlık.
- [ ] Kale tepesinde uzak sırtlar ancak sis açılınca görünmeli; vadide sisin içinden “parlamamalı”.

**Genel**
- [ ] PerformanceMonitor kare hızı düştüğünde kademeyi indirmeli (high → medium → low). `?q=` verilmişse indirmemeli.
- [ ] Dokunmatik:
  - dikey sürükleme yürütür,
  - yatay sürükleme bakar,
  - çift dokunuş sıradaki tarih izine götürür,
  - kart açıkken sürükleme kartı kapatmaz.
- [ ] 10 dakikalık yürüyüşte cihaz ısısı ve pil tüketimi not edilmeli. Ses bağlamı arka planda (sekme gizli) askıya alınmalı.

## Şanlıurfa ve öteki oyunlarla tutarlılık
Bu oyun öteki oyunlarla aynı altyapıyı kullanır:
- aynı cihaz profili ve kademe adları,
- aynı `?q=` ve `?debug` sözleşmesi,
- pil tasarrufu kancası (`navigator.getBattery`),
- tr-TR sesli okuma,
- alttaki kart düzeni ve kaynak bağlantısı,
- WebGL yoksa Vikipedi fotoğraflı yedek ekran.

## Dürüstlük notları
- Vadi stilizedir. Gerçek Zil Kale dereden ~380 m yukarıda ve ~1.100 m rakımdadır; oyunda yokuş ~70 m'ye kısaltıldı.
- Kalenin yapım tarihi kesin bilinmiyor. Genellikle 14.–15. yüzyıla tarihlenir. Kalenin “sağlam hâli” bir canlandırmadır.
- Oyundaki köprü Şenyuva tipi tek kemerli bir köprüdür, Şenyuva'nın birebir kopyası değildir. 1696 ya da 1699 tarihli kitabe 1946 selinde kayboldu. Oyundaki kitabe taşı ve üstündeki “yazı” temsilîdir.
- Şelale, ev ve serender belirli bir yapıyı değil, bölgenin tipik öğelerini temsil eder.
- Gölge yok: sisli havada ışık dağınıktır, bu seçim performans için de yapıldı.

## Kaynaklar
- [Wikipedia — Zilkale](https://en.wikipedia.org/wiki/Zilkale)
- [Kültür Envanteri — Zilkale](https://kulturenvanteri.com/en/yer/zilkale/)
- [Wikipedia — Fırtına River bridges](https://en.wikipedia.org/wiki/F%C4%B1rt%C4%B1na_River_bridges)
- [Küre Ansiklopedi — Kale (Hala) Köprüsü](https://kureansiklopedi.com/tr/detay/kale-hala-koprusu-993cd)
- [Art of Wayfaring — Historic Bridges of the Storm Valley](https://artofwayfaring.com/destinations/historic-bridges-of-the-storm-valley)
