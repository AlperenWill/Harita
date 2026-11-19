# Miras. Haritası — çalışma notları

- Harita yalnızca `src/data/playables.ts` listesindeki oynanabilir yerleri gösterir. Yeni bir oyun yapıldığında ya da zip olarak geldiğinde onu bu listeye ekle ve haritaya yerleştir: `docs/OYUN-EKLEME.md`.
- Kapsam: popüler yerler detaylı, az bilinen yerler kısa oyun. Her ilde en değerli 1–2 yer.
- Tema açık (beyaz). Arayüz sade kalsın. Her değişiklik telefonda dikey ekranda da çalışmalı.
- Yanıtlar Türkçe. Kaynakları bağlantı olarak ver. Doğrulanmamış bilgileri ve ölçülmemiş performansı açıkça belirt.
- Kontroller: `npx tsc --noEmit -p .`, `npx vitest run`, `npx vite build`.
