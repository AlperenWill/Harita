# Miras.

Türkiye'nin 81 ilindeki tarihi ve kültürel mirası 3D harita üzerinde keşfetmek için web uygulaması.

```bash
npm install
npm run dev        # http://localhost:5173  (ana uygulama)  ·  /3d/  (Miras. Haritası tek başına)
npm test           # veri ve asistan testleri
npm run build      # tip kontrolü + üretim paketi
npm run data       # src/data → src/app/data/turkiye.json (şehirler + tarihi noktalar; asistan bilgi tabanı)
```

## Sayfalar
| Yol | İçerik |
|---|---|
| `/` | Anasayfa: Miras. logosu, Haritayı Aç, Oyun Hakkında |
| `/harita` | **Miras. Haritası** — 3D harita (aşağıdaki proje), sayfaya gömülü |
| `/istanbul`, `/istanbul/:id` | **İstanbul Katmanları** — UNESCO mirası haritası ve Sultanahmet deneyimi: [docs/istanbul.md](docs/istanbul.md) |
| `/anit/ankara-anitkabir` | **Anıtkabir 3D sahnesi** — ayrıntılar: [docs/anitkabir.md](docs/anitkabir.md) |
| `/kaynakca`, `/ayarlar` | Kaynaklar; animasyon azaltma ve sohbet geçmişi temizleme |

Logo: **M** ve **.** kırmızı (#F04448), **iras** (ve “Haritası”) beyaz; bu yüzden logo daima koyu zemin üzerinde kullanılır
(`src/app/components/Logo.tsx`, 3D haritada `src/ui/TopBar.tsx`).

Sağ alttaki **AI asistan** her sayfada açılır. Varsayılan olarak yerel bilgi tabanından (81 il + tarihi noktalar)
yanıt verir. Gerçek bir dil modeline bağlamak için `.env` dosyasına
`VITE_ASSISTANT_API_URL=https://sunucunuz/assistant` ekleyin: istek `POST { messages }`, beklenen yanıt `{ reply }`
(`src/app/lib/assistant.ts`).

## Yapı
- `src/app/` — ana uygulama (React + TypeScript + Tailwind + React Router + Lucide)
- `src/data/` — doğrulanmış miras veri seti (her koordinat, testte il sınırına karşı kontrol edilir)
- `3d/` + `src/main3d.tsx`, `src/scene/` … — Miras. Haritası (3D harita; aşağıda ayrıntılı)
- `public/sanliurfa-oyun/`, `public/izmir-efes/` — 3D haritadaki Şanlıurfa ve İzmir kartlarından açılan 3D macera oyunları

---

## Anadolu Mirası — İnteraktif 3D Kültürel Keşif Platformu (/3d/)

Türkiye'nin 81 ilini **gerçek sınır verisiyle** 3D olarak çizen; 7 bölge → il → miras noktası hiyerarşisinde
sinematik kamera geçişleriyle gezilen, şiddetsiz keşif mekanikleriyle (Keşif Günlüğü, mühür koleksiyonu,
Zaman Yolcusu rozetleri) öğrenmeyi teşvik eden bir web uygulaması.

```bash
npm install
npm run dev        # geliştirme sunucusu
npm test           # veri + coğrafi doğrulama testleri
npm run build      # tip kontrolü + üretim paketi
npm run geo        # ham GeoJSON'dan iki LOD'lu TopoJSON'u yeniden üret
```

## Teknoloji

| Katman | Seçim | Neden |
|---|---|---|
| UI / durum | React 18 + TypeScript + Zustand (persist) | Küçük, seçici abonelik; ilerleme `localStorage`'da kalıcı |
| 3D | three.js + React Three Fiber + drei | Bildirimsel sahne, `Detailed` (LOD), `Html`, `CameraControls` |
| Coğrafya | d3-geo (Mercator projeksiyon, centroid, alan) + topojson | Gerçek koordinatlar, topolojik bölge birleştirme |
| Kamera | camera-controls | Kritik sönümlü yumuşatma, kesintiye dayanıklı geçiş, dokunmatik jestler |
| Ses | Web Audio API (sentez) | Sıfır bayt ses dosyası; dönemine göre ambiyans |
| Paket | Vite (code-splitting, vendor chunk'ları) | |

## Dosya yapısı

```
data/raw/tr-cities.geojson     81 il sınırı (OpenStreetMap türevi, ODbL — cihadturhan/tr-geojson)
scripts/build-geo.mjs          GeoJSON → d3 sarımına çevir → TopoJSON → sadeleştir (low/high LOD)
scripts/which-province.mjs     Bir koordinatın hangi ilde olduğunu söyler (veri girişi yardımcısı)
public/data/tr-{low,high}.topo.json
src/
  geo/        projection.ts (d3-geo), topology.ts (yükleme/merge), shapes.ts (GeoJSON → THREE.Shape)
  data/       types.ts, regions.ts (7 bölge, rakım, dönem/kategori), heritage/<bölge>.ts (181 nokta)
  state/      store.ts (zustand), quests.ts (veriden türetilen görevler), useQuestWatcher.ts
  scene/      Experience, TurkeyMap (extrude), CameraRig, SiteMarkers
  scene/explore/  ExploreMode (lazy), models.tsx (prosedürel low-poly + LOD + GLB/Draco yolu), Atmosphere
  audio/      ambient.ts (dönemsel ambiyans sentezi)
  ui/         TopBar, Dock, QuestTracker, Journal (lazy), Seal, Overlays (toast, intro, yatay mod)
tests/data.test.ts
```

## 1. Gerçek GeoJSON ile 3D harita
- Sınırlar OSM türevi 81 il GeoJSON'undan gelir; **elle çizim yoktur**. `build-geo.mjs` halkaları d3'ün küresel
  sarım kuralına çevirir (aksi hâlde `geoContains`/`geoBounds` "dünyanın geri kalanını" döndürür), TopoJSON'a
  dönüştürür ve iki LOD üretir: genel görünüm için **low** (~26 KB gzip), bölgeye girince **high**.
- İstemcide `d3.geoMercator().fitExtent` projeksiyonu, haritayı 100 birim genişliğe oturtur (1 birim ≈ 16 km).
- İller `THREE.ExtrudeGeometry` ile **ilin yaklaşık ortalama rakımına göre** yükseltilir (≈15× dikey abartı):
  doğuya doğru yükselen Anadolu platosu haritada okunur. (Rakımlar il bazında yaklaşık değerlerdir; gerçek
  DEM/topografya katmanı bir sonraki adım olarak eklenebilir.)
- Bölgeler `topojson.merge` ile **topolojik olarak** birleştirilir; kaynak verideki il arası minik boşluklar
  (<300 km² sahte delikler) atılır, gerçek göller korunur.

## 2. Hiyerarşi ve kamera
`Level = country | region | province | site`. `CameraRig` her seviye için hedef kutuyu `worldBounds` ile hesaplar,
önce eğik bir kutup açısına döner, sonra `fitToBox` ile sığdırır. Bölgeye girildiğinde iller bölge
yüksekliğinden gerçek rakımlarına "yükselir"; diğer bölgeler sönükleşip alçalır. Hover: renk + kaldırma,
tıklama: kısa sıcak parlama, aktif il: çini turkuazı kontur. `Esc` bir üst seviyeye döner.

## 3. Miras noktaları ve keşif modu
- 181 nokta, **81 ilin tamamında**; UNESCO alanlarının yanında hanlar, köprüler, yerel müzeler, kazı alanları ve
  somut olmayan miras (Kuş Dili, Âşıklık, Hıdrellez, Karagöz…). Her kayıtta özet, "Biliyor muydunuz?" ve
  isteğe bağlı "kayıp mimari detay" bulunur.
- **Test, her noktanın beyan edilen ilin sınırları içinde olduğunu ham poligonlarla doğrular**
  (ada/kıyı için ≤4 km tolerans). Bu test geliştirme sırasında üç hatalı koordinatı yakaladı.
- Noktaya tıklanınca haritadan çıkılmaz: model ilin yüzeyinde belirir, kamera sinematik yaklaşır ve
  kullanıcı dokunmadığında yavaşça yörüngede döner.
- Modeller kategori+dönemden türetilen 12 prosedürel low-poly tiptir (kubbe-minare, taç kapı, bazilika,
  tapınak, höyük, T-dikilitaş, köprü, kervansaray, kaya cephesi…), paylaşılan prosedürel taş dokusuyla PBR
  `MeshStandardMaterial`. `<Detailed>` ile 3 LOD. Bir kayda `model: '/models/x.glb'` eklenirse Draco
  sıkıştırılmış GLB yüklenir (`useGLTF(url, true)`); sıkıştırma için:
  `npx @gltf-transform/cli optimize in.glb out.glb --compress draco`.
- Atmosfer: toz partikülleri (tek draw call), ışık huzmeleri, temas gölgesi ve dönemine göre sentezlenen ses
  (Roma: ağustos böceği, Bizans: koro pedi, Selçuklu/Osmanlı: ney benzeri ezgi, köprülerde su).
- Bilgi kartı sahnede noktaya bağlı yüzer; fotoğraf çalışma anında **Türkçe Vikipedi REST API**'den
  (Wikimedia Commons) yalnızca kart açıldığında çekilir, bulunamazsa noktaya özgü motif gösterilir.

## 4. Oyunlaştırma (şiddetsiz)
- **Mühür**: keşfedilen her nokta, kimliğinden deterministik üretilen bir geometrik mühür kazandırır.
- **Görevler veriden türetilir**: ilde ≥3 dönem varsa "Zaman Katmanları: 3 farklı döneme ait eser bul",
  yoksa "ilin tüm noktalarını keşfet"; bölge görevleri; genel rozetler (Zaman Yolcusu, Yolun İzinde,
  Yaşayan Mirasın Sesi, Kayıp Mimari Detaylar, Yedi İklim, Dünya Mirası Koleksiyoncusu).
- Keşif modunda parıldayan nokta "kayıp mimari detay"dır; incelendiğinde günlüğe işlenir.

## 5. Mobil ve performans
- İlk ekran: uygulama + three + R3F ≈ 330 KB gzip ve 26 KB harita; yerelde ~0,9 sn'de etkileşime hazır.
  Bölge verisi (7 ayrı chunk), yüksek LOD harita, keşif modu ve Keşif Günlüğü **lazy** yüklenir; bölge verisi
  üzerine gelindiğinde önden indirilir.
- `PerformanceMonitor` + `AdaptiveDpr` FPS düşerse çözünürlüğü düşürür; DPR üst sınırı 1,75.
- Dokunmatik: tek parmak döndürme, iki parmak pinch-zoom + kaydırma; işaretçiler ekran-sabit boyutta ve büyük
  dokunma alanlı. Dikey tutulan telefonda **zorunlu yatay mod** ekranı (destekleyen tarayıcıda tam ekran +
  yön kilidi). `prefers-reduced-motion` desteklenir; tüm hiyerarşi alt panelden klavyeyle de gezilebilir.

## Tasarım dili
Tüf, buğday, zeytin, kiremit ve bazalt tonlarında pastel bölgeler; vurgu olarak çini turkuazı ve safran.
Yazı: **Fraunces** (başlık) + **Manrope** (metin), ikisi de Türkçe karakter destekli. Paneller yarı saydam ve
bulanık; sahnenin merkezini kapatmaz.

## Lisans / kaynak
İl sınırları © OpenStreetMap katkıcıları, ODbL. Fotoğraflar çalışma anında Vikipedi/Wikimedia Commons'tan
kendi lisanslarıyla gösterilir.
