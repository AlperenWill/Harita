# Yerebatan Sarnıcı — Karanlıkta suyun altında kaybolan sütunları ışık kaynağıyla tek tek aydınlatarak sarnıcın haritasını çıkar ve iki Medusa başını bul

`game.json` bu klasörün tek veri kaynağıdır (şema: `src/games/schema/game-definition.schema.json`).

**Durum:** Araştırma tamam, game.json hazır; oyun kodu yazılmadı.

## Neden bu mekanik
Araştırmada sarnıcı benzersiz kılan şey karanlık suyun içinden yükselen 336 sütunluk orman ve iki Medusa başı. Aydınlatarak keşif, bu karanlığı ve ölçeği oyuncunun kendi ışığıyla yavaş yavaş açmasını sağlar; Medusa başları sakin bir 'bulma' anı olur, korku öğesi değil.

**Çıkış noktası (araştırma):** Suyun içinde yükselen sütun ormanı ve Medusa başları

## Oyun döngüsü
Işık kaynağı sürüklenerek sütunlar tek tek aydınlatılır; aydınlanan sütunlar sarnıcın 28×12 düzenini çizer; iki Medusa başı bulununca tamamlanır.

**Kazanma koşulu:** Sarnıcın sütun düzeni aydınlatılıp iki Medusa başı bulununca tamamlanır

## Kamera
Su altında yavaş süzülme: su yüzeyine yakın, sabit hızlı kamera; oyuncu yalnızca ışığın yönünü değiştirir.

## Hareketler
Sürükle, basılı tut.

## Mobil performans kontrol listesi
| Madde | Durum |
|---|---|
| Varlık bütçesi ≤ 8 MB | 336 sütun tek InstancedMesh |
| Damlama sesi | Web Audio 'cistern-drips' ön ayarı (0 bayt) |
| Pil/WebGL/yatay mod | Çekirdekten gelir |

Hedef: ≤ 8 MB, orta segment telefonda ≥ 45 FPS.

## Kaynaklar
- [UNESCO World Heritage Centre — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356)
- [İBB Atatürk Kitaplığı — Yerebatan Sarnıcı Müzesi](https://ataturkkitapligi.ibb.gov.tr/en/Kitaplik/Muzelerimiz/Yerebatan-Cistern-Museum/11)
- [Archnet — Yerebatan Sarnıcı](https://archnet.org/sites/8249)
- [The National — Basilica Cistern reopens after restoration (2022)](https://www.thenationalnews.com/mena/2022/07/25/basilica-cistern-reopens-after-restoration-in-pictures-2)
