# Ayasofya — Mozaik parçalarını zaman çizelgesinde doğru döneme yerleştirerek mekânın katmanlarını sırayla aç

`game.json` bu klasörün tek veri kaynağıdır (şema: `src/games/schema/game-definition.schema.json`).

**Durum:** Araştırma tamam, game.json hazır; oyun kodu (index.tsx) yazılmadı — haritada araştırma kartı açılır.

## Neden bu mekanik
Araştırmadaki özgün özellik: Bizans mozaikleriyle Osmanlı hat levhalarının aynı mekânda katman katman durması. Mekanik bu katmanlaşmayı oyuncunun eliyle kurdurur: parçayı doğru döneme koymak, yapının 1500 yıllık tarihini sıraya dizmektir.

**Çıkış noktası (araştırma):** Bizans mozaikleri ile Osmanlı hat levhalarının aynı mekânda katmanlaşması

## Oyun döngüsü
Mozaik ve levha parçaları zaman çizelgesine sürüklenir; doğru döneme oturan parça mekânda yerini alır ve o dönemin ışığı/sesi değişir.

**Kazanma koşulu:** Bütün parçalar doğru döneme yerleştirilince 537’den bugüne mekânın hikâyesi tamamlanır

## Kamera
Kilitli yörünge: yalnızca yatay eksende sınırlı dönüş, seçilen mozaiğe kilitlenen yakınlaşma.

## Hareketler
Sürükle, çift dokun, iki parmakla yakınlaştır.

## Mobil performans kontrol listesi
| Madde | Durum |
|---|---|
| Varlık bütçesi ≤ 8 MB | Mozaik görselleri lisanslı/serbest kaynaktan, KTX2 sıkıştırmalı olmalı |
| Kilitli yörünge | Yatay açı sınırı kodda sabit; serbest dönüş yok |
| Düşük kademe | Mozaik dokuları 1K'ya iner |
| Pil/WebGL/yatay mod | Çekirdekten gelir |

Hedef: ≤ 8 MB, orta segment telefonda ≥ 45 FPS.

## Kaynaklar
- [UNESCO World Heritage Centre — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356)
- [University of Melbourne, Pursuit — Hagia Sophia reigns serene](https://pursuit.unimelb.edu.au/articles/hagia-sophia-reigns-serene)
- [Medievalists.net — Hagia Sophia: past, present, future](https://www.medievalists.net/2020/07/hagia-sophia-past-present-future/)
- [History Hit — Hagia Sophia: history and facts](https://www.historyhit.com/locations/hagia-sophia/)
