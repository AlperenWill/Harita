# İstanbul UNESCO Mirası — "Her Yapı Bir Oyun"

Adres: `/istanbul` (harita, yalnızca giriş kapısı) · `/istanbul/:id` (o yapının bağımsız oyunu).

Her UNESCO yapısı kendi klasöründe, kendi döngüsü, kamerası, arayüzü ve kazanma koşuluyla **ayrı bir oyundur**.
Serbest kamera, genel keşif modu, bütün yapıları içeren tek sahne ve harita üzerinde doğrudan oynanış yoktur.

## Mimari
```
src/games/
  schema/game-definition.schema.json   UNESCO verisi → oyun mekaniği dönüşüm şeması (JSON Schema 2020-12)
  core/                                 ORTAK ÇEKİRDEK — oyun mantığı içermez
    registry.ts                         import.meta.glob: */game.json hemen, */index.tsx tembel (ayrı parça)
    GameLauncher.tsx                    kimliğe göre oyunu dinamik import eder; kod yoksa araştırma kartı, WebGL yoksa yedek
    GameCanvas.tsx                      R3F kurulumu (gölge, DPR, kenar yumuşatma cihaz profilinden)
    LoadingScreen.tsx · Fallback.tsx    yükleme ekranı · WebGL'siz yedek (fotoğraf + tr-TR sesli anlatım)
    device.ts                           kademe algılama, pil < %20 → gölge/son işlem kapalı, useDeviceProfile
    audio.ts                            ses motoru: Web Audio ile sentezlenen ambiyans ön ayarları (0 bayt)
    Joystick.tsx · walkInput.ts · LandscapeGate.tsx   mobil araçlar
    progress.ts · types.ts              Keşif Günlüğü (ziyaret/tamamlama/bulgu) · GameProps sözleşmesi
  sultanahmet-camii/                    OYNANABİLİR — "Işık Takibi"
    game.json  index.tsx  scene.tsx  mechanics.ts  camera.ts  ui.tsx  layout.ts  assets/  README.md
  ayasofya/ topkapi-sarayi/ suleymaniye/ yerebatan-sarnici/
    game.json  README.md                araştırma + oyun tasarımı hazır; kod (index.tsx) eklenince kendiliğinden oynanır
src/app/istanbul/IstanbulMap.tsx        harita: yalnızca önayarlı kamera, işaretçiye dokununca GameLauncher'a gider
src/app/pages/IstanbulSitePage.tsx      <GameLauncher id=… research={ResearchCard} />
tests/games.test.ts                     şema doğrulama (ajv), kayıt, koordinat–ilçe, kamera önayarları, oyun mekaniği
```

**Yeni oyun eklemek:** `src/games/<id>/game.json` (şemaya uygun) → haritada çıkar ve araştırma kartı açılır.
`index.tsx` (varsayılan dışa aktarım, `GameProps` alır) eklenince aynı işaretçi oyunu yükler. Çekirdek ve harita değişmez.

### Oyun sözleşmesi (`GameProps`)
```ts
{ def: GameDefinition; device: DeviceProfile; onFind(key); onComplete(finds); onExit() }
```
Oyun çekirdekle yalnızca bunlarla konuşur. Mantık, kamera ve arayüz paylaşılmaz.

## UNESCO verisi → oyun mekaniği şeması
`game.json` alanları: kimlik ve UNESCO bileşeni · `research` (dönem, mimar, özgün özellikler, restorasyonlar, `unverified`) ·
**`transformation`** (`uniqueFeature` → `mechanic`, `mechanicType`, `winCondition`, `camera.preset`, `gestures`,
`targetEmotion`, `avoidElements` — "şiddet" zorunlu) · `budget` (`maxAssetMB` ≤ 8, `targetFps` ≥ 45) ·
`atmosphere` (ışık tonu, ses ön ayarı) · `fallback` (Vikipedi başlığı, sesli anlatım metni) · `sources` (≥ 3, https).
Test her `game.json` dosyasını şemaya karşı doğrular; kamera önayarlarının yapılar arasında tekrarlanmadığını ve
`freecam` olmadığını denetler.

| Yapı | Mekanik | Kamera | Hareketler | Durum |
|---|---|---|---|---|
| Sultanahmet Camii | Işık takibi | Üçüncü şahıs takip | joystick, dokun | **oynanabilir** |
| Ayasofya | Mozaik zaman çizelgesi | Kilitli yörünge | sürükle, çift dokun, iki parmak | araştırma |
| Topkapı Sarayı | Nesne toplama | Birinci şahıs, noktadan noktaya | joystick, dokun, basılı tut | araştırma |
| Süleymaniye | Frekans eşleştirme | Sabit geniş açı + kaydırma | kaydır, basılı tut | araştırma |
| Yerebatan Sarnıcı | Sütunları ve Medusa'yı aydınlatma | Su altında yavaş süzülme | sürükle, basılı tut | araştırma |

Her mekaniğin gerekçesi ve oyuna özel mobil kontrol listesi o oyunun `README.md` dosyasındadır.

## Sultanahmet — "Işık Takibi"
- **Neden:** Yapının araştırmadaki en özgün yanı pencerelerden süzülen ışığın çinileri gün boyunca farklı yerlerde göstermesi.
  Oyuncu toplamaz, yarışmaz: güneşi izler.
- **Döngü:** Güneş ekinoks gününde İstanbul için hesaplanan konumla ilerler (yapı kıble ekseninde ~151°). Pencerelerden ışın
  izlenir; ışığın zemine düştüğü yerde altın halkalı bir havuz oluşur ve güneşle birlikte kayar. Oyuncu halkanın içinde
  2,5 sn durunca, ışığın düştüğü duvardaki panoda çini deseni açılır ve kaynaklı bilgi kartı çıkar. Altı desen sabahtan akşama.
- **Kaybetme yok:** Işık penceresi kaçarsa güneş o aşamanın başına nazikçe geri sarılır. Kısa pencerelerde saat yavaşlar
  (her aşama en az 45 sn).
- **Kamera:** Önce atlanabilir 7 sn'lik sinematik rota, sonra üçüncü şahıs takip. Oyuncunun kamera kontrolü yoktur.
- **Sahne:** Işık huzmeleri ve havuzlar tek `InstancedMesh` çifti (2 çizim çağrısı); saat ~1 dk ilerledikçe matrisler güncellenir.
- **Doğrulama:** Testte kusursuz oynayan bir yapay oyuncu altı deseni de geri sarma olmadan 600 sn içinde açar; hiç hareket
  etmeyen oyuncu kaybetmez, yalnızca geri sarılır.
- **Ezan:** Dini bir okuyuş olduğu için sentezlenmez. Ses motorunda lisanslı bir kaydı çalacak `playRecording` vardır;
  depoda kayıt yoktur.
- Ölçüler yaklaşıktır; süslemeler stilize edilmiştir, birebir rölöve değildir.

## Harita
Harita yalnızca giriş kapısıdır: üç önayar ("Tüm İstanbul", "Tarihi Yarımada", yapıya alçalış). Kullanıcı kamerayı
döndüremez ya da yakınlaştıramaz. İşaretçiye dokunulunca kamera yapıya alçalır, ekran kararır ve o yapının oyun parçası yüklenir.
Oyun ekranında site menüsü gizlenir; çıkış oyunun kendi düğmesindedir.

## Mobil, pil, yedek
- **Kademe** (`core/device.ts`): veri tasarrufu, ≤ 3 GB bellek, ≤ 4 çekirdek ya da zayıf GPU → düşük (gölge, sis, parçacık
  kapalı; DPR 1). Dokunmatik → orta. `?q=low|medium|high` sabitler.
- **Pil:** Battery API destekleyen tarayıcıda pil %20'nin altında ve şarjda değilse düşük profile geçilir (gölge ve son işlem kapanır).
  iOS Safari Battery API sunmaz; orada bu kural çalışmaz.
- **WebGL yok:** Vikipedi'den yapının fotoğrafı ve `fallback.narration` metninin tr-TR sesli okunuşu.
- **Yatay mod:** Dikey tutulan dokunmatik cihazda zorunlu uyarı.
- **Çevrimdışı:** `public/sw.js` ziyaret edilen sayfaları önbelleğe alır (üretim derlemesi).
- **Boyut:** Sultanahmet oyun parçası ~41 KB (gzip ~16 KB), dosya varlığı 0 MB.

**Gerçek telefonda FPS ölçülmedi.** Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader) işlevsel test yapıldı.
Gerçek cihazda yapılacaklar:
- [ ] Orta segment Android (Adreno 6xx) ve iPhone 11/12'de orta kademede 45+ FPS (30 sn oynanış)
- [ ] Pil tasarrufu: pil %20 altında gölgelerin kapandığı
- [ ] WebGL kapalı tarayıcıda fotoğraf + sesli anlatım
- [ ] iOS Safari: yatay mod uyarısı, joystick, zemine dokunarak yürüme

## Şanlıurfa ile tutarlılık kontrolü
| | Şanlıurfa (`public/sanliurfa-oyun`) | İstanbul (`src/games/*`) |
|---|---|---|
| Bağımsız oyun | ✓ kendi klasörü, kendi döngüsü | ✓ |
| Şiddetsiz, sakin keşif | ✓ hatıra taşı toplama, rehberle konuşma | ✓ |
| Kamera | ✗ birinci şahıs, **serbest fareyle bakış** | ✓ yalnızca önayar |
| Yükleme | ayrı HTML sayfası, Three.js CDN'den (internet gerekir) | ana uygulama içinde dinamik import, CDN yok |
| Mobil | joystick + sürükleyerek bakış | joystick + dokunarak yürüme; yatay mod uyarısı |
| Pil / WebGL'siz yedek | yok | var (çekirdek) |
| Görsel dil | kendi düz HTML arayüzü | Miras. tasarım dili (Inter, beyaz kartlar, #F04448) |

Sonuç: Şanlıurfa "her yapı bir oyun" fikrine uyuyor ama serbest kamera kuralına uymuyor ve çekirdeği (pil, yedek, yükleme)
kullanmıyor. İstenirse `src/games/` yapısına taşınıp kamerası önayara çevrilebilir; bu çalışmada dokunulmadı.

## Veri ve kaynaklar
- `unescoId` olarak doğrulanabilen mülk referansı **356bis** kullanılır; `356-001` gibi bileşen kimlikleri doğrulanamadı.
- `npm run unesco` UNESCO'nun herkese açık XML listesini okur; geliştirme ortamında ağ kısıtı nedeniyle çalıştırılamadı.
- İlçe sınırları: [ozanyerli/istanbul-districts-geojson](https://github.com/ozanyerli/istanbul-districts-geojson) — lisansı belirtilmemiş.

| Yapı | Kaynaklar |
|---|---|
| Sultanahmet Camii | UNESCO 356 · Yildiz, Harvard doktora tezi (2024) · Hürriyet Daily News · TRT Haber · Türkiye Gazetesi · İznik Mavi Çini (motifler) |
| Ayasofya | UNESCO 356 · Univ. of Melbourne Pursuit · Medievalists.net · History Hit |
| Topkapı Sarayı | UNESCO 356 · Britannica · istanbul.com |
| Süleymaniye | UNESCO 356 · Bilkent Üniversitesi akustik çalışması · Hürriyet Daily News · Muslim Heritage |
| Yerebatan Sarnıcı | UNESCO 356 · İBB Atatürk Kitaplığı · Archnet · The National (2022) |
