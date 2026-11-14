# Sultanahmet — varlıklar

Bu oyunun dosya varlığı yoktur (0 MB). Her şey çalışma anında üretilir:

- `motifs.ts` — altı çini motifinin (lale, karanfil, sümbül, servi, hatayi, rumi) canvas dokuları, duvar çini kuşağı dokusu ve her motifin kaynaklı açıklaması (`MOTIF_INFO`).
- Yapı geometrisi (`../scene.tsx`) ölçüleri `../layout.ts` dosyasındaki yaklaşık değerlerden üretilir; birebir rölöve değildir.
- Ses `../../core/audio.ts` ile Web Audio üzerinden sentezlenir (`courtyard-water` ön ayarı).

Gerçek bir model ya da ses kaydı eklenecekse bu klasöre konmalı ve toplam boyut `game.json` → `budget.maxAssetMB` (8 MB) sınırını aşmamalıdır.
