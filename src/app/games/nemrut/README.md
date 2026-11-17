# Nemrut Dağı — "Tanrıların Alacakaranlığı"

Adres: `/oyun/nemrut`. 3D haritada Nemrut Dağı kartındaki **⛰️ Nemrut: Tanrıların Alacakaranlığı** düğmesiyle de açılır.
Bağımsız oyun; kodu ayrı bir parça olarak yalnızca bu sayfada indirilir (~32 KB, gzip ~13 KB). Serbest kamera ve yürüyüş yok.

> Not: İstekte "Fable 5.2 gücü" geçiyor. Fable 5.2 bir oyun motoru değil, bu kodu yazan yapay zekâ modelinin adıdır.
> Oyun, projedeki diğer oyunlarla aynı teknolojiyle yapıldı: React Three Fiber, drei, three.js, postprocessing.

## Dosya yapısı
```
src/app/games/nemrut/
  NemrutGame.tsx            ana yönetici: gün döngüsü durumu, üç sabit kamera, atmosferin sahneye uygulanması, restore, arayüz
  DynamicLightingSystem.ts  güneş konumu, evreler, atmosfer (ışık rengi/şiddeti, sis, yıldız, tanrı ışınları, rüzgâr), restore zamanlaması,
                            30 Hz güncelleme kuralı (saf, test edilir)
  ColossalHeads.tsx         oturan dev heykeller, düşmüş başlar, LOD, köşe rengi (vertex color) restore karışımı
  ProceduralTerrain.tsx     yükseklik fonksiyonundan arazi ağı, köşe rengine yazılmış statik gölgelendirme, instanced kaya ve çalılar
  terrain.ts                yükseklik fonksiyonu, heykel ve düşmüş baş yerleri, saçılım, sabit kameralar (saf, test edilir)
  TimeSliderUI.tsx          zaman sürgüsü, ekran sürükleme ve çift dokunma hareketleri
  AudioManager.ts           konumlu rüzgâr (HRTF), restore sesi, tr-TR anlatım
src/app/pages/NemrutPage.tsx · tests/nemrut.test.ts
```

## Oynanış: "Zamanın ötesinde nöbet"
- **Tek etkileşim zaman:** alttaki sürgü ya da ekranı tek parmakla yatay sürükleme (tam ekran = 12 saat). Çift dokunma / "En iyi ışık" / Boşluk:
  o bakışın altın saatine yumuşakça akar (Doğu Terası gün doğumu, Batı Terası ve Tümülüs gün batımı).
- **Üç sabit kamera:** Doğu Terası, Batı Terası (heykelleri hafif çaprazdan, önden), Tümülüs (kuş bakışı). Kamera heykel sırasının arkasına asla
  geçmez (testte doğrulanır). "Yaklaş" düğmesi aynı hat üzerinde yakın plana geçer.
- **Restore:** her teras kendi altın saatinde ya da oyuncu yaklaşınca canlanır: düşmüş başlar yay çizerek gövdelerine döner ve renk yukarıdan aşağı akar.

## Neden bu aydınlatma tekniği
Nemrut'ta anlatılan şey ışığın gün içindeki değişimidir; bu yüzden hazır ışık haritası kullanılamaz. Çözüm: **tek gerçek zamanlı yönlü güneş**
(tek gölge haritası) + yarım küre dolgu ışığı. Gökyüzü, sis rengi/yoğunluğu, yıldızlar ve tanrı ışınlarının gücü tek bir saf fonksiyondan
(`atmosphere(saat)`) gelir; böylece sahnede saatle ilgili tek bir doğruluk kaynağı vardır ve test edilebilir.
- **Güneş:** enlem 38° K, sapma +10° (ağustos sonu). Gün doğumu ~05:28, batımı ~18:32 (yerel güneş saati).
- **Gölge:** yalnızca heykeller gölge üretir ve alır; gölge kamerası etkin terasa oturtulur (68 × 44 m). Arazi gölge haritasına girmez:
  eğim ve vadi koyuluğu köşe renklerine bir kez yazılır (statik ışık haritası görevi), üstüne gerçek zamanlı yönlü ışık gelir.
- **Tanrı ışınları:** ekran uzayı (postprocessing `GodRays`), kaynak güneş diski. Gücü `sis × güneşin alçaklığı` ile değişir; öğle ve gece sıfırdır.
  Gerçek hacimsel ışın yürütme değildir.
- **Sis:** üstel sis + rüzgâr yönünde sürüklenen 26–44 büyük yumuşak bulut (tek InstancedMesh). Sabah yoğun ve gri, akşam pembe/altın, öğle seyrek.
  Kuş bakışında yoğunluk 0,28 ile çarpılır (kamera ~350 m uzakta; yoksa her şey beyaza döner).
- **Gece:** yıldızlar + karşı yönden çok zayıf ay ışığı; heykeller siluet.

## Köşe rengi (vertex color) karışımı
Her köşede iki renk saklanır: `color` (aşınmış kireçtaşı) ve `restored` (canlandırma). Parça gölgelendiricisinde:
```
dalga = uTop + 1 − uRestore · (uTop + 2,5)            // yukarıdan aşağı inen süpürme yüksekliği
a     = smoothstep(dalga − 0,6, dalga + 0,6, y_dünya)  // bu parça dalganın üstünde mi
renk  = (1 − a) · c_aşınmış + a · c_canlandırma
```
Doku değişimi yok; tek uniform (`uRestore` 0→1) değişir. Geçiş `a ← a + (hedef − a)(1 − e^(−dt/0,9))` ile yumuşatılır.
**LOD:** teras bakışında o terasın başları ayrıntılıdır (yüz hatları küre üzerinde yer değiştirme, sakal, başlık); diğer teras ve kuş bakışında ~100 üçgenlik siluet.

## Mobil ve pil
| | düşük | orta | yüksek |
|---|---|---|---|
| Sis | doğrusal sis (ucuz; uzak araziyi de gizler) | üstel + 26 bulut | üstel + 44 bulut |
| Tanrı ışınları / gölge | yok / yok | var / 1024 | var / 2048 |
| Arazi / kaya / çalı | 110² / 220 / 120 | 180² / 520 / 320 | 240² / 900 / 600 |
- Pil < %20 (şarjda değilse) → düşük profil.
- **Sürgü hareket ederken** güneş/atmosfer güncellemesi 30 Hz; durunca her kare (testte: 60 karede tam 30 güncelleme).
- `?q=low|medium|high` kademeyi sabitler.

## Ses
Sürekli rüzgâr üç konumlu (HRTF) kaynaktan gelir: ana rüzgâr batı-kuzeybatıdan, iki dar bantlı "kıvrılma" kaynağı etkin heykel sırasının arkasından —
heykellerin arkasından dolanan rüzgâr daha ıslıklı duyulur. Şiddet saate göre: gece sakin, öğle hafif, gün doğumu/batımında sert. Restore'da taş sürtünmesi + parıltı.

## Şanlıurfa ile tutarlılık
| | Şanlıurfa | Nemrut |
|---|---|---|
| Bağımsız oyun, şiddetsiz, sakin | ✓ | ✓ |
| Kamera | birinci şahıs, serbest bakış | üç sabit bakış; kullanıcı kamerayı hiç çevirmez |
| Etkileşim | yürü, konuş, topla | yalnızca zaman |
| Ortam sesi | ayak sesi, kalabalık, martı | konumlu rüzgâr |
| Yükleme | Three.js CDN'den | uygulama içinde |

## İstenenden farklı / dürüstçe
- **Restore renkleri VARSAYIMSALDIR.** Heykellerin özgün boyasına (kırmızı, mavi, altın) dair bu çalışmada kaynak bulunamadı; arayüzde de böyle yazar.
  Başların gövdelere dönmesi de bir canlandırmadır: gerçekte başlar düştükleri yerde durur.
- **Heykeller ve arazi stilizedir:** taş blok gövdeler, yaklaşık yüz hatları; gerçek sayısal yükseklik modeli ya da tarama yok (dosya 0 MB).
  Aslan ve kartal heykelleri basit bloklardır; kabartma steller ve aslan horoskopu modellenmedi.
- **"Rüzgâr şiddeti gece daha sessiz, öğle daha hafif"** isteği uygulandı; en sert rüzgâr gün doğumu/batımına verildi (kurgusal bir tercih).
- **Doğrulanamayanlar:** tümülüs çapı kaynaklarda 150–152 m (istekteki 145 m doğrulanmadı); zirve 2.134 m tek kaynaktan.

## Mobil performans test listesi (gerçek cihazda — henüz ÖLÇÜLMEDİ)
Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader) işlevsel test yapıldı.
- [ ] Orta segment Android ve iPhone 11/12: teras bakışında 45+ FPS (GodRays + gölge açık)
- [ ] **Sis testi:** şafakta (en yoğun sis) FPS düşüyor mu; bulut sayısı 26 → 14'e inince fark; düşük kademede doğrusal sise geçiş görsel olarak kabul edilebilir mi
- [ ] Sürgüyü hızlı sürüklerken takılma yok (30 Hz güncelleme); bırakınca görüntü oturuyor
- [ ] Bakış değişiminde (LOD yeniden üretimi) takılma < 200 ms
- [ ] Pil < %20: gölge, tanrı ışınları ve bulutlar kapanıyor
- [ ] Kulaklıkla: rüzgâr batıdan geliyor; Doğu ↔ Batı terasında kıvrılma sesi taraf değiştiriyor
- [ ] Gece: yıldızlar görünür, heykeller siluet; ekran tamamen kararmıyor

## Kaynaklar
- [UNESCO — Nemrut Dağ](https://whc.unesco.org/en/list/448/)
- [World Heritage Site — Nemrut Dag](https://www.worldheritagesite.org/list/Nemrut+Dag)
- [Wikipedia — Mount Nemrut](https://en.wikipedia.org/wiki/Mount_Nemrut)
- [Le Petit Journal — Nemrut Dağı, site UNESCO](https://lepetitjournal.com/istanbul/comprendre-turquie/nemrut-dagi-site-unesco-anatolie)
