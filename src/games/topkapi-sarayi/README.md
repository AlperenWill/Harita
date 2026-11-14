# Topkapı Sarayı — Odalarda nesneleri bulup topla

`game.json` bu klasörün tek veri kaynağıdır (şema: `src/games/schema/game-definition.schema.json`).

**Durum:** Araştırma tamam, game.json hazır; oyun kodu yazılmadı.

## Neden bu mekanik
Araştırmada öne çıkan şey sarayın tören değil gündelik hayat mekânı olması (Harem odaları, mutfaklar). Nesne toplama, oyuncuyu bu gündelik hayatın küçük izlerini tek tek bulmaya yönlendirir; her nesne bir hikâye parçası açar.

**Çıkış noktası (araştırma):** Harem odalarındaki nesneler ve saray mutfaklarının gündelik hayatı

## Oyun döngüsü
Odadan odaya noktadan noktaya ilerle, nesneyi dokunarak seç, hikâye parçası açılır; parçalar birleşince sarayın bir günü anlatılır.

**Kazanma koşulu:** Tüm hikâye parçaları birleşince sarayın bir günü baştan sona anlatılır

## Kamera
Birinci şahıs, noktadan noktaya: yalnızca ileri/geri/sağ/sol; serbest fareyle bakış kapalı.

## Hareketler
Joystick, dokun, basılı tut.

## Mobil performans kontrol listesi
| Madde | Durum |
|---|---|
| Varlık bütçesi ≤ 8 MB | Oda başına ayrı parça (lazy) yüklenmeli |
| Çizim çağrısı | Odalar arası geçişte önceki oda bellekten atılmalı |
| Pil/WebGL/yatay mod | Çekirdekten gelir |

Hedef: ≤ 8 MB, orta segment telefonda ≥ 45 FPS.

## Kaynaklar
- [UNESCO World Heritage Centre — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356)
- [Encyclopaedia Britannica — Topkapı Palace Museum](https://www.britannica.com/topic/Topkapi-Palace-Museum)
- [istanbul.com — History of Topkapi Palace](https://istanbul.com/blog/history-of-istanbul/history-of-topkapi-palace)
