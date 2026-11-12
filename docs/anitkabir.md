# Anıtkabir İnteraktif 3D Sahnesi

Adres: `/anit/ankara-anitkabir` · 3D haritadaki Anıtkabir bilgi kartından da açılır.

> **Model hakkında:** Depoda hazır bir Anıtkabir GLB modeli yoktur. Sahne, bilinen gerçek ölçülerle
> **koddan (prosedürel)** kurulur: indirilen model ve doku boyutu 0 bayttır, sahne kodu ~7 KB (gzip).
> Yapıların birbirine göre konumu yaklaşıktır; mimari süslemeler sadeleştirilmiştir. Gerçek bir model
> üretildiğinde aşağıdaki Blender ayarlarıyla dışa aktarılıp sahneye eklenebilir.

## Dosya yapısı
```
src/app/monuments/
  types.ts                      ortak şema (MonumentData) ve sahne props'ları (isActive, cameraTarget, onPointClick)
  store.ts                      Zustand: activeMonument, selectedPoint, cameraTarget, timeOfDay, quality, batterySaver
  registry.ts                   id → { data, lazy(Scene) }  (yeni anıt = yeni satır)
  useDeviceProfile.ts           WebGL desteği, mobil tespiti, pil tasarrufu, ?q= kalite sabitleme
  data/ankara-anitkabir.json    veri (diğer illerle aynı şema)
  anitkabir/
    layout.ts                   1:1 ölçekli yerleşim (saf veri, test edilir)
    materials.ts                prosedürel taş / kilim / çim shader'ları, gece modu, bayrak
    AnitkabirScene.tsx          Canvas, LOD, InstancedMesh, ışık, kamera, hotspot'lar
src/app/pages/MonumentPage.tsx  rota, saat seçici, bilgi kartı, iskelet, WebGL'siz yedek, yatay mod önerisi
tests/anitkabir.test.ts
```
Bağımlılıklar (hepsi projede mevcut): `three`, `@react-three/fiber`, `@react-three/drei`, `camera-controls`,
`zustand`, `tailwindcss`, `lucide-react`.

## 1. Blender'dan GLB dışa aktarma (gerçek model eklenecekse)
- Ölçek: 1 birim = 1 m, **+Y yukarı**, dönüşümler uygulanmış (Ctrl+A → All Transforms). Başlangıç noktası Tören Meydanı merkezi.
- Üç ayrı nesne/koleksiyon: `LOD0` (~20k üçgen), `LOD1` (~5k), `LOD2` (~500). Decimate yerine elle sadeleştirme tercih edilir.
- Tekrarlayan parçalar (sütun, aslan, basamak) tek mesh + **Linked Duplicate (Alt+D)**: glTF'e instancing olarak yazılır.
- Malzeme: doku yerine **vertex color** (Color Attribute) + en fazla tek 1K normal haritası.
- Export → glTF 2.0 (.glb): *Apply Modifiers* açık, *Compression (Draco)* açık (seviye 6; position 14, normal 10, texcoord 12, color 10 bit),
  *GPU Instancing* açık, animasyon ve kamera kapalı.
- Sonradan: `npx @gltf-transform/cli optimize in.glb out.glb --compress draco --texture-compress webp` (hedef < 5 MB).
- Yükleme: `useGLTF(url, true)` (Draco çözücüsü yalnızca gerektiğinde iner) ve drei `<Detailed>` ile üç LOD.

## 2. Sahne: LOD, InstancedMesh, ışık
- **InstancedMesh:** 44 sütun, başlık ve kaideler, 42 basamak, 24 aslanın her parçası, 10 kule, galeri sütunları ve yüzlerce
  ağaç birer çağrıdır. Tüm sahne ~35–45 draw call ile çizilir.
- **LOD** (kamera uzaklığı, histerezisli; saniyede 5 kez kontrol):
  LOD0 başlıklar, kapı, yazıt panoları, 42 ayrı basamak, aslan ayrıntıları · LOD1 bloklar, 44 sütun, 6 kaba basamak ·
  LOD2 tek blok + rampa. "Düşük" kalitede LOD0'a hiç inilmez.
- **Malzeme:** dünya koordinatına bağlı gürültüyle prosedürel traverten; meydan zemini shader'da üretilen kilim deseni. UV ve doku yok.
- **Işık:** 1 yönlü ışık (1024² yumuşak gölge) + yarımküre dolgu. Gölgeyi yalnızca ana yapılar düşürür; ağaçlar düşürmez.
- **Sis:** üstel sis (gerçek hacimsel değildir); park sınırını ve uzak ağaçları yumuşatır.
- **Saat:** sabah / öğle / akşam / gece. Gece modunda mozole emissive ile aydınlanır, iki meşale yanar; gölge kapanır.

## Yerleşim (hava fotoğrafına göre)
Mozole meydanın kısa kenarında (+X), Aslanlı Yol uzun kenara dik (-Z), bayrak direği ön kenarın ortasında (+Z),
İnönü'nün lahdi karşı kısa kenardaki galeride (-X). Binalar gri kırma çatılı ve meydana bakan sütunlu galerilidir.

## Yürüme modu ve Şeref Holü
"Yürü" düğmesi birinci şahıs moduna geçer: WASD + fareyi sürükleyerek bakış; dokunmatikte joystick + ekranı sürükleme.
Zemin yüksekliği `groundHeight()` ile hesaplanır: 42 basamak rampa gibi çıkılır, kaide kenarından düşülmez.
Çarpışma `walkColliders()` dikdörtgenleriyle yapılır (binalar, kuleler, sütunlar, hol duvarları, lahit).
Mozolenin içi boştur ve kapıdan girilir: mermer desenli zemin, altın mozaik tavan, duvar meşaleleri, bronz parmaklıklı
pencere ve sembolik lahit. İç mekân temsilîdir; gerçek süslemeler sadeleştirilmiştir.

## Gece aydınlatması
Gece modunda mozole projektörle aydınlatılmış gibi parlar, yol ve meydan lambaları yanar (ışık halesi + yere düşen
ışık havuzu), bina pencereleri ve galeriler aydınlanır. Bunlar emissive/eklemeli yüzeylerdir; gerçek ışık kaynakları
yalnızca meşalelerde, holün içinde ve "Yüksek" kalitede birkaç noktada kullanılır.

## 3. Kamera
Varsayılan: 45° kuş bakışı. Tek parmak döndürme, iki parmak pinch-zoom ve kaydırma; fare: sol döndür, sağ kaydır, tekerlek zoom.
Uzaklık 34–760 m, zeminin altına inilmez, hedef bir kutuyla sınırlıdır ve kamera mozole bloğunun içinden geçemez.
Çift tıklama / çift dokunma: mozole girişine sinematik geçiş.

## 4. Hotspot'lar
7 nokta (Mozole, Aslanlı Yol, Tören Meydanı, Müze, İnönü'nün Lahdi, Kuleler, Bayrak Direği). Dokunma alanı 44×44 px,
üzerine gelince parlama, tıklayınca kamera o noktaya gider ve bilgi kartı açılır.

## 5. Entegrasyon
`useMonumentStore.setActiveMonument('ankara-anitkabir')` sahneyi yükler; `null` kaldırır. Rota bunu otomatik yapar.
Yeni bir anıt için: aynı şemada bir JSON + bir sahne bileşeni yazıp `registry.ts`'e eklemek yeterlidir.

## 6. Performans ve mobil test listesi
**Bu sürümde gerçek cihazda FPS ölçümü yapılmadı.** Geliştirme ortamında yalnızca ekran kartsız (yazılım tabanlı)
tarayıcıda doğrulama yapıldı; orada kalite otomatik "Düşük"e indi. Aşağıdaki değerler ölçüm değil **tahmindir**:

| Kalite | İçerik | Tahmini FPS (Adreno 6xx / A12) |
|---|---|---|
| Yüksek | gölge, sis, 760 ağaç, DPR ≤ 1,75 | masaüstü 60; mobilde 40–55 |
| Orta (mobil varsayılan) | gölge, sis, 340 ağaç, DPR ≤ 1,4 | 50–60 |
| Düşük / pil tasarrufu | gölge, sis ve partikül yok, 150 ağaç, DPR 1 | 60 |

FPS düşerse kalite kendiliğinden bir kademe iner. `?q=high|medium|low` kaliteyi sabitler.

Gerçek cihazda kontrol edilecekler:
- [ ] Chrome DevTools → Performance: orta segment Android'de 30 sn dolaşım, kare süresi < 22 ms
- [ ] `renderer.info.render.calls` < 60, üçgen sayısı LOD0'da < 25k
- [ ] Lighthouse Mobile: ilk etkileşim < 3 sn (three paketi ~180 KB gzip; yalnızca bu rotada iner)
- [ ] iOS Safari: pinch-zoom, çift dokunma, yatay/dikey geçişte kamera çerçevesi
- [ ] Pil < %20 (Android Chrome): "Pil tasarrufu" etiketi ve gölgelerin kapanması. iOS bu API'yi desteklemez.
- [ ] 10 dk kullanımda ısınma ve bellek (sekme belleği sabit kalmalı)
- [ ] WebGL kapalıyken vaziyet planı yedeği ve bilgi kartları
