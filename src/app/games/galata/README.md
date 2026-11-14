# Galata Kulesi — "Zamanın Nefesi"

Adres: `/oyun/galata-kulesi`. 3D haritada Galata Kulesi noktasının bilgi kartındaki **🏰 Galata Kulesi: Zamanın Nefesi** düğmesiyle de açılır.
Bağımsız bir oyundur: kodu ayrı bir parça olarak yalnızca bu sayfada indirilir (~63 KB, gzip ~21 KB). Serbest kamera hiçbir bölümde yoktur.

## Dosya yapısı
```
src/app/games/galata/
  GalataTowerGame.tsx   ana bileşen: bölüm akışı, dokunma/klavye girdileri, arayüz, giriş sahnesi
  store.ts              Zustand durumu (bölüm, bulunan armalar, dinlenen vitrinler, manzaralar; "tamamlandı" kalıcı)
  DungeonScene.tsx      1. zindan: fener spot ışığı + fener shader'ı (armalar yalnızca koninin içinde görünür)
  dungeon.ts            zindan ölçüleri, armalar, koni tespiti (saf, test edilir)
  StaircaseMechanic.ts  2. merdiven ritim mantığı (saf, test edilir)
  StaircaseScene.tsx    sarmal merdiven, pencere aralıklarından süzülen ışık
  ExhibitScene.tsx      3. sergi katı: vitrinler, otomatik kilitlenen yörünge kamera
  exhibits.ts           vitrin içerikleri ve kilitlenme mantığı
  TerracePanorama.tsx   4. teras: gün batımı, şehir, 4 bakış noktası, panorama kamerası
  panorama.ts           bakış noktaları, gerçek koordinattan pusula yönü, kaba su maskesi (saf, test edilir)
  TowerExterior.tsx     kulenin dış görünüşü (prosedürel)
  textures.ts           1K prosedürel taş dokusu + normal haritası, arma çizimleri
  AudioManager.ts       kat bazlı sentezlenmiş ses ve çapraz geçiş, tr-TR anlatım
  device.ts             kademe, pil tasarrufu, WebGL algılama
  Fallback.tsx          WebGL yoksa fotoğraf + sesli anlatım
src/app/pages/GalataPage.tsx   rota; tests/galata.test.ts
```

## Bölümler ve mekanik gerekçeleri
| Bölüm | Mekanik | Kamera | Dokunma | Neden |
|---|---|---|---|---|
| Zindan (Ceneviz) | Fenerle 3 gizli armayı bul (1,2 sn üzerinde tut) | Birinci şahıs, kilitli bakış; yalnızca ileri/geri | Parmağı sürükle → fener | 16. yy'da kule zindandı; karanlık + tek ışık yavaş ve dikkatli bakmayı öğretir |
| Merdiven | Vuruşta yukarı kaydır; her sahanlıkta basılı tutup nefes al | Sarmal boyunca kilitli | Yukarı kaydır, basılı tut | Dar sarmal merdiveni çıkmak ritmik ve yorucudur; nefes molası tempoyu yavaşlatır |
| Sergi (Osmanlı → Cumhuriyet) | 4 vitrine yaklaş, dinle | Galeride ileri/geri; vitrine otomatik kilitlenen yakın yörünge | İleri/geri düğmeleri | Müze katında beceri değil dinleme istenir |
| Teras (bugün) | 4 tarihi noktaya bak | Panorama kaydırıcı: yalnızca 4 önayar yön, sonra otomatik yakınlaşma | Yatay kaydır | Tırmanışın ödülü manzaradır; serbest dönüş yerine anlamlı noktalar |

Kaybetme ve süre baskısı yok. Merdivende kaçırılan vuruş yalnızca basamak saymaz; üst üste 3 kaçırmada tempo 75'ten en fazla ~52 vuruş/dk'ya kadar yavaşlar.
Kısa tutulan nefes cezasız tekrarlanır. Kaydıramayanlar için ekranda "basamak çık" düğmesi de vardır.

## Şanlıurfa ile tutarlılık
| | Şanlıurfa (`public/sanliurfa-oyun`) | Galata |
|---|---|---|
| Bağımsız oyun, kendi döngüsü | ✓ | ✓ |
| Şiddetsiz, sakin keşif; toplama | ✓ 3 hatıra taşı | ✓ 3 arma, 4 vitrin, 4 manzara |
| Rehber anlatımı | NPC diyalogları (yazılı) | Bilgi kartı + tr-TR sesli anlatım |
| Ortam sesi | Yüzeye göre ayak sesi, kalabalık, martı | Kat bazlı: damla, ayak sesi + nefes, oda tonu, rüzgâr + martı |
| Kamera | ✗ birinci şahıs **serbest fareyle bakış** | ✓ her bölümde kilitli/önayarlı |
| Yükleme | Three.js CDN'den (internet gerekir) | Uygulama içinde, CDN yok |
| Pil / WebGL'siz yedek | yok | var |

Şanlıurfa oyununa dokunulmadı.

## İstenenden farklı yapılanlar (açıkça)
- **GLB model yok.** Depoda lisanslı bir Galata Kulesi modeli bulunmadığı ve buradan indirilemediği için kule prosedürel geometriyle
  çizildi. Bu yüzden varlık boyutu 0 MB (6 MB sınırının altında). Taş için 1K prosedürel doku + ondan Sobel ile üretilen normal haritası kullanıldı.
  Gerçek bir GLB eklenecekse `TowerExterior.tsx` yerine `useGLTF` ile yüklenmeli ve 6 MB sınırı korunmalı.
- **HDRI dosyası yok.** Gün batımı ortam haritası sahnede üretilir (drei `Environment` + `Lightformer`), gökyüzü drei `Sky` shader'ıdır.
- **Hacimsel ışık taklittir.** Merdivende üstel sis + toplamalı ışık konileri kullanıldı; gerçek ışın yürütmeli (raymarch) hacimsel ışık mobilde pahalıdır.
- **360° fotoğraf yok.** WebGL'siz yedek, Vikipedi/Wikimedia Commons fotoğraflarını sırayla gösterir ve metni tr-TR okur.
- **Ses dosyası yok.** Tüm sesler Web Audio ile sentezlenir; anlatım tarayıcının konuşma sentezidir (cihazda Türkçe ses yoksa yalnızca altyazı).
- Şehir dokusu ve kıyı çizgisi **kabadır** (blok kutular, elle yaklaşık su maskesi); yalnızca 4 bakış noktasının yönleri gerçek koordinatlardan hesaplanır.

## Mobil test kontrol listesi
Geliştirme ortamında yalnızca ekran kartsız tarayıcıda (swiftshader, ~9 FPS) işlevsel test yapıldı. **Gerçek telefonda FPS ölçülmedi.**
- [ ] Orta segment Android (Adreno 6xx) ve iPhone 11/12'de her bölümde 45+ FPS (Chrome DevTools / Safari Web Inspector, 30 sn)
- [ ] Teras en ağır bölüm: düşük kademede (`?q=low`) 500, orta kademede 1100 şehir bloğu — FPS düşükse sayı azaltılmalı
- [ ] Zindanda gölge kapalı (spot ışığı `castShadow={false}`), terasta açık; `?q=low` ve pil < %20 iken terasta da kapalı
- [ ] Zindan: parmakla sürükleme feneri yönlendiriyor, ileri/geri düğmeleri basılı tutulunca yürüyor
- [ ] Merdiven: yukarı kaydırma vuruşa göre "Tam/İyi/Erken/Geç" veriyor; sahanlıkta basılı tutma halkayı dolduruyor
- [ ] Sergi: vitrine yaklaşınca kamera kilitleniyor ve anlatım başlıyor; "Devam" kilidi açıyor
- [ ] Teras: yatay kaydırma noktalar arasında geçiyor; dönüşten sonra yakınlaşma oluyor
- [ ] Ses ilk dokunuştan sonra başlıyor; sessize alma anlatımı da durduruyor; iOS'ta sessiz mod anahtarı
- [ ] WebGL kapalı tarayıcıda fotoğraf + "Dinle" çalışıyor
- [ ] Dikey tutulan telefonda yatay çevirme ipucu görünüyor
- [ ] Bellek: bölümler arası geçişlerde (Safari) çökme yok

## Tarihsel bilgiler ve doğrulanamayanlar
**UNESCO notu:** Galata Kulesi, UNESCO'nun "İstanbul'un Tarihi Alanları" (356) listesindeki dört bileşen alanın (Sultanahmet, Süleymaniye, Zeyrek, Kara Surları) içinde değildir; bu yüzden oyunda UNESCO mirası olarak etiketlenmedi. UNESCO kaynağı yalnızca terastan görülen Ayasofya ve Süleymaniye için kullanıldı.

Kullanılanlar: 1348 Ceneviz yapımı ve "Christea Turris" adı; 16. yy'da Kasımpaşa tersanesindeki esirler için zindan;
18. yy'dan itibaren yangın gözetleme; 1794 yangını; 1965–67 onarımı; 6 Ekim 2020'de müze olarak açılış; Hezarfen efsanesi (Evliya Çelebi).

Doğrulanamayan ya da yaklaşık olanlar: gövde çapı (~16,4 m) ve duvar kalınlığı (~3,75 m), teras yüksekliği (~51,65 m) —
yaygın olarak verilen değerler, birincil kaynakla doğrulanmadı. Yükseklik kaynağa göre 62,59 m (külahsız) ya da 66,9 m (külahla).
Zindan geçidinin biçimi, armaların yeri ve merdivenin basamak sayısı **kurgusaldır**. Hezarfen'in uçuşu kanıtlanmamış bir efsanedir ve oyunda öyle anlatılır.

## Kaynaklar
- [Wikipedia — Galata Tower](https://en.wikipedia.org/wiki/Galata_Tower)
- [Kültür Envanteri — Galata Kulesi](https://kulturenvanteri.com/en/yer/galata-kulesi/)
- [Archnet — Galata Kulesi](https://archnet.org/sites/8254)
- [T.C. Kültür ve Turizm Bakanlığı İstanbul — Galata Kulesi](https://istanbul.ktb.gov.tr/EN-307578/galata-kulesi.html)
- [Google Arts & Culture — Galata Tower: A Timeless Icon of Istanbul (Kültür Varlıkları ve Müzeler Genel Müdürlüğü)](https://artsandculture.google.com/story/iQVBpoYAf5pRQw)
- [UNESCO — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356/)
