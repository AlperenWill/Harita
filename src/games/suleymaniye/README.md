# Süleymaniye Külliyesi — Ses dalgalarını görselleştir

`game.json` bu klasörün tek veri kaynağıdır (şema: `src/games/schema/game-definition.schema.json`).

**Durum:** Araştırma tamam, game.json hazır; oyun kodu yazılmadı. Küplerin akustik etkisinin büyüklüğü bu çalışmada ölçümle doğrulanmadı; oyun bunu kesin bilgi gibi sunmamalı.

## Neden bu mekanik
Araştırmadaki özgün özellik kubbe akustiği ve kubbeye yerleştirilen seramik küpler. Görsel bir yapıyı 'dinlenen' bir oyuna çevirmek için frekans eşleştirme seçildi: oyuncu yankıyı dengeleyerek Sinan'ın akustik çözümünü sezgiyle kavrar.

**Çıkış noktası (araştırma):** Kubbe akustiği ve kubbeye yerleştirilmiş seramik küpler

## Oyun döngüsü
Ses dalgaları görselleşir; oyuncu kaydırarak her küpün frekansını sesin frekansına yaklaştırır, eşleşen küp yankıyı yumuşatır.

**Kazanma koşulu:** Bütün küpler eşleşince mekân dengeli bir yankıyla tek bir ses gibi tınlar

## Kamera
Sabit geniş açı; aktif ses kaynağına doğru yavaşça kayar.

## Hareketler
Kaydır, basılı tut.

## Mobil performans kontrol listesi
| Madde | Durum |
|---|---|
| Varlık bütçesi ≤ 8 MB | Ses Web Audio ile sentezlenir (0 bayt) |
| Ses gecikmesi | Mobilde AudioContext ilk dokunuşla açılmalı |
| Pil/WebGL/yatay mod | Çekirdekten gelir |

Hedef: ≤ 8 MB, orta segment telefonda ≥ 45 FPS.

## Kaynaklar
- [UNESCO World Heritage Centre — Historic Areas of Istanbul](https://whc.unesco.org/en/list/356)
- [Bilkent Üniversitesi — Acoustical characterization of clay pots in Ottoman architecture](https://repository.bilkent.edu.tr/items/c6801d01-8aaa-49c6-8165-e699273f20bc/full)
- [Hürriyet Daily News — Restoration reveals architectural secrets of Istanbul’s Süleymaniye Mosque](https://www.hurriyetdailynews.com/restoration-reveals-architectural-secrets-of-istanbuls-suleymaniye-mosque-228238)
- [Muslim Heritage — Sinan’s acoustical technology](https://muslimheritage.com/sinans-acoustical-tech/)
