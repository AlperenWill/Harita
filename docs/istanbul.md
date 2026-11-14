# İstanbul Katmanları — UNESCO Mirası Modüler 3D Keşif

Adres: `/istanbul` (harita) · `/istanbul/:id` (mikro-deneyim). 3D Anadolu haritasında İstanbul ilinden de açılır.

## Mimari
```
data/raw/istanbul-districts.geojson   39 ilçe sınırı (ozanyerli/istanbul-districts-geojson)
scripts/build-istanbul.mjs            → public/data/istanbul.topo.json (38 KB gzip)   · npm run istanbul
scripts/fetch-unesco.ts               UNESCO XML listesinden 356 kaydını çeker        · npm run unesco
src/app/istanbul/
  types.ts                            araştırma dosyası şeması (IstanbulSite)
  sites/*.json + sites/index.ts       her yapı için ayrı araştırma dosyası (şablon + kaynaklar)
  store.ts                            Keşif Günlüğü (Zustand, kalıcı): ziyaretler, bulgular, rozetler
  quality.ts                          cihaz kademesi (low/medium/high) ve ayarları
  geo.ts · IstanbulMap.tsx            ana harita: ilçeler, ikonlu işaretçiler, sinematik kamera
  Journal.tsx · Joystick.tsx · LandscapeGate.tsx
  sultanahmet/                        1. mikro-deneyim
    layout.ts                         ölçüler, güneş konumu, ışın izleme, çini panoları, çarpışma (saf, test edilir)
    motifs.ts                         6 çini motifi: bilgi + kaynak + prosedürel çizim
    audio.ts                          sentezlenmiş ambiyans; isteğe bağlı ezan kaydı
    SultanahmetScene.tsx              R3F sahne
    SultanahmetExperience.tsx         arayüz
src/app/pages/IstanbulPage.tsx · IstanbulSitePage.tsx   rotalar; EXPERIENCES kaydı
public/sw.js                          çevrimdışı önbellek
tests/istanbul.test.ts
```
**Yeni yapı eklemek:** `sites/` altına JSON (şemaya uygun, en az 3 kaynak) → haritada otomatik çıkar ve araştırma kartı açılır.
3D deneyim hazır olunca `IstanbulSitePage.tsx` içindeki `EXPERIENCES` kaydına bir satır eklenir; ana sistem değişmez.

## 1. Veri ve araştırma
Şablon senin verdiğin JSON'un genişletilmiş hâlidir (`kind`, `district`, `status`, `unesco`, `summary`, `sources`, `atmosphere` eklendi).
- `unescoId` olarak doğrulanabilen mülk referansı **356bis** kullanılır. Bileşen alanı adları UNESCO'nun güncel adlarıdır
  (ör. "Sultanahmet Urban Archaeological Component Area"). `356-001` gibi bileşen kimlikleri doğrulanamadığı için kullanılmadı.
- Her yapıda en az 3 kaynak var ve bilgi kartlarında bağlantı olarak gösterilir. Test, her kaynağın https bağlantısı olduğunu
  ve koordinatın beyan edilen ilçenin sınırları içinde kaldığını denetler.
- Doğrulanamayan bilgiler `researchNotes.unverified` alanında açıkça işaretlenir ve sahnede "yaklaşık" olarak geçer.
- **UNESCO API:** UNESCO'nun herkese açık bir JSON API'si yok; `npm run unesco` herkese açık XML listesini okur.
  Bu betik geliştirme ortamında ağ kısıtı nedeniyle çalıştırılamadı, sonucu doğrulanmadı.
- **Kültür Portalı / İBB Kültür A.Ş.:** Programatik erişim noktası bulunamadı; bu kaynaklardan otomatik veri çekilmiyor.

| Yapı | Kaynaklar |
|---|---|
| Sultanahmet Camii | UNESCO 356 · Yildiz, Harvard doktora tezi (2024) · Hürriyet Daily News · TRT Haber · Türkiye Gazetesi |
| Ayasofya | UNESCO 356 · Univ. of Melbourne Pursuit · Medievalists.net · History Hit |
| Topkapı Sarayı | UNESCO 356 · Britannica · istanbul.com |
| Süleymaniye | UNESCO 356 · Bilkent Üniversitesi akustik çalışması · Hürriyet Daily News · Muslim Heritage |

## 2. Sultanahmet: "Işık-gölge ile zaman yolculuğu"
- Saat sürgüsü (06:30–19:30) ekinoks gününde İstanbul için güneşin yüksekliğini ve yönünü hesaplar. Yapı kıble ekseninde
  (~151°) durduğu için sabah, öğle ve ikindi ışığı farklı duvarlardan girer.
- Güneşe bakan duvarlardaki pencerelerden ışın izlenir. Işığın düştüğü yerde zemin aydınlanır, huzme ve toz görünür.
- 6 çini panosunun (lale, karanfil, sümbül, servi, hatayi, rumi) her biri günün belli bir saatinde ışık alır. Işıkta motif
  ortaya çıkar; dokununca keşfedilir ve kaynaklı bilgi kartı açılır. Gölgedeki panoya dokunmak ipucu verir.
  Çift dokunma panonun önüne yakınlaştırır (yapıya özel hareket).
- Meditatif yürüyüş: yavaş tempo; avluda şadırvan suyu, içeride kubbe yankısını anımsatan tını.
- **Ezan:** Dini bir okuyuş olduğu için sentezlenmedi. `public/audio/sultanahmet-ezan.mp3` adıyla lisanslı bir kayıt eklenirse
  "Ezanı dinle" düğmesi kendiliğinden görünür. Depoda kayıt yoktur.
- Ölçüler yaklaşıktır; 6 minare ve avlu düzeni korunmuştur. Süslemeler stilize edilmiştir, birebir değildir.

## 3. Harita ↔ deneyim geçişi
İşaretçiye dokunulunca kamera yapının hemen üstüne alçalır, ekran kararır (0,45 sn), deneyim sayfası açılır ve kararma
yavaşça kalkar. Deneyim kameraya yüksekten alçalarak başlar. Haritaya dönüldüğünde kamera Tarihi Yarımada'dan başlar.

## 4. Keşif Günlüğü ve rozetler
Ziyaret edilen yapı haritada yeşil tik alır. Rozetler bulgulardan türetilir (ayrı saklanmaz):
Çini Ustası (6 motif) · Işığın Yolcusu (sabah, öğle, ikindi ışığı) · Kubbe Kaşifi (kubbenin altından yukarı bak) ·
Huzur Yürüyüşü (mihraba yürü) · Tarihi Yarımada Gezgini (4 yapının hepsi). Bir yapının bütün rozetleri alınınca o deneyim
"tamamlandı" sayılır.

## 5. Mobil, performans, çevrimdışı
- **Kademe algılama** (`quality.ts`): veri tasarrufu, cihaz belleği ≤ 3 GB, ≤ 4 çekirdek ya da zayıf GPU adı → düşük
  (gölge, sis, toz kapalı; DPR 1). Dokunmatik → orta. `?q=low|medium|high` kademeyi sabitler.
- **LOD:** İç mekân (panolar, kandiller, halı, huzmeler) yalnızca yürürken çizilir; kubbe ve minare segment sayısı kademeye göre azalır.
- **Varlık boyutu:** Model, doku ve ses dosyası yok (0 MB). Sultanahmet kodu 14 KB gzip; harita verisi 38 KB gzip.
- **Yatay mod:** Dikey tutulan dokunmatik cihazda deneyimin üstünü kapatan zorunlu uyarı; destekleyen tarayıcıda tek dokunuşla tam ekran ve yatay kilit.
- **Çevrimdışı:** `public/sw.js` ziyaret edilen sayfaların kodunu, verisini ve fontlarını önbelleğe alır (yalnızca üretim derlemesinde).

### Test listesi (gerçek cihazda)
**Gerçek cihazda FPS ölçülmedi.** Geliştirme ortamında yalnızca ekran kartsız tarayıcıda işlevsel test yapıldı.
- [ ] Orta segment Android (Adreno 6xx) ve iPhone 11/12'de orta kademede 45+ FPS (Chrome DevTools Performance, 30 sn yürüyüş)
- [ ] `renderer.info.render.calls` iç mekânda < 120
- [ ] Düşük kademe: gölge, sis ve toz gerçekten kapalı
- [ ] İnterneti kapatıp daha önce açılmış `/istanbul/sultanahmet-camii` sayfasını yeniden aç (service worker)
- [ ] iOS Safari: yatay mod uyarısı, joystick, çift dokunma
- [ ] Ses: ilk dokunuştan sonra başlıyor, sessize alma çalışıyor

### Yedek senaryolar
WebGL yoksa harita yerine araştırma kartı kullanılabilir (yapı sayfaları kartla da çalışır). Ses başlatılamazsa deneyim
sessiz devam eder. Kaynak bağlantıları her durumda erişilebilir.

## Şanlıurfa ile görsel tutarlılık kontrolü
- **Aynı olan:** Pastel, sıcak harita tonları (Anadolu 3D haritasıyla aynı palet), Türkçe arayüz, şiddetsiz keşif mekaniği,
  dokunmatik joystick ve sürükleyerek bakış, prosedürel geometri.
- **Farklı olan:** Şanlıurfa'daki Balıklıgöl oyunu ayrı bir proje; kendi düz HTML arayüzü ve Three.js r128 sürümü var.
  İstanbul ise Miras. tasarım dilini kullanıyor (Inter, beyaz kartlar, #F04448 vurgusu, bulanık paneller) — Anıtkabir sahnesiyle aynı.
  Yapılar arasında yalnızca ışık tonu (`atmosphere.light`) ve ambiyans sesi değişir.
