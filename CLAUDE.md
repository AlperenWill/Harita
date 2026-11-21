# Miras. Haritası — çalışma notları

- Harita yalnızca `src/data/playables.ts` listesindeki oynanabilir yerleri gösterir. Yeni bir oyun yapıldığında ya da zip olarak geldiğinde onu bu listeye ekle ve haritaya yerleştir: `docs/OYUN-EKLEME.md`.
- Bir zip'te birden çok yer varsa her yer haritada ayrı nokta olur ve kendi bölümünü doğrudan açar (`?mekan=`). Zip'li oyunlara "haritaya dön" düğmesi eklenir.
- Kapsam: popüler yerler detaylı, az bilinen yerler kısa oyun. Her ilde en değerli 1–2 yer.
- Tema açık (beyaz). Arayüz sade kalsın. Her değişiklik telefonda dikey ekranda da çalışmalı.
- Yanıtlar Türkçe. Kaynakları bağlantı olarak ver. Doğrulanmamış bilgileri ve ölçülmemiş performansı açıkça belirt.
- Oyun arayüzü ortaktır: `src/app/games/shared/hud/Hud.tsx` (kurallar: `docs/OYUN-UI.md`). Yeni oyunlar bu arayüzü kullanır.
- Kontroller: `npx tsc --noEmit -p .`, `npx vitest run`, `npx vite build`.
