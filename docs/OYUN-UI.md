# Oyun arayüzü (HUD)

Bütün oyunlar aynı arayüzü kullanır: `src/app/games/shared/hud/Hud.tsx`. İlk örnek: Kapadokya (`src/app/games/kapadokya/BalloonGame.tsx`).

Geçirilen oyunlar: Kapadokya, Ani, İshak Paşa, Akdamar, Troya, Efes, Pamukkale, Zil Kale, Ayasofya, Topkapı, Dolmabahçe, Nemrut, Hattuşa,
Kapalıçarşı, Kız Kulesi, Galata, Yerebatan, Anıtkabir (anıt sayfası). Bağımsız Şanlıurfa oyununa aynı görünümde "← Harita" ve ≡ menü
`public/sanliurfa-oyun/index.html` sonunda eklendi. Konya ve Antalya oyunlarının kendi menüleri bu arayüzün örnek alındığı yapıdır.
Oyuna özel paneller (konuşma kutuları, defter, kroki, ışık paneli…) aynı açık temaya boyandı; oyuna özel düğmeler sağ üstte ≡'in soluna konur.

## Yerleşim (önce telefon, dikey ekran)
| Yer | Bileşen | Ne |
|---|---|---|
| Sol üst | `BackButton` (`TopBar` içinde) | "← Harita". Her oyunda aynı yerde, aynı biçimde |
| Sağ üst | `GameMenu` | Tek "≡" düğmesi (Konya/Antalya oyunlarındaki gibi). Açılınca oyun durur: Devam et, Nasıl oynanır, Ayarlar, Baştan başla, Haritaya dön |
| Üst orta (telefonda ikinci satır) | `Objective` | Sıradaki hedef + ilerleme çubukları + sayı |
| Sol | `ToolPanel` | Oyuna özel gösterge (ör. rüzgâr katmanları); başlığa dokununca daralır |
| Sağ alt | `ActionDock` + `RoundAction` | Ana kontrol (vurgu renginde) ve ikincil kontrol |
| Alt orta | `Hint` | Kısa ipucu; birkaç saniye sonra kendiliğinden solar |
| Üst orta | `Toast` | Doğru / yanlış gibi kısa bildirim |
| Alt (masaüstünde sağ alt) | `InfoSheet` | Bilgi kartı: etiket, başlık, metin, "Dinle", kaynak |
| Ortada | `StartSheet`, `EndSheet`, `Modal` | Başlangıç, bitiş, menü ve yardım pencereleri |

## Tema
- Sitenin açık dili: sıcak beyaz cam (beyaz + bulanıklık), koyu mürekkep yazı (`#1f1b17`), ince çizgi.
- Oyuna özgü tek şey **vurgu rengi**: `<Hud theme={{ accent: '#e8702a' }}>`. Ana düğme, ilerleme ve etiketler bu rengi alır.
- Dokunma hedefleri en az 44 px. Çentik ve ev çubuğu için güvenli alan payı otomatik.
- HUD sahneye dokunuşu engellemez; yalnız düğme ve paneller tıklanır.

## Ayarlar (ortak, tarayıcıda saklanır)
`src/app/games/shared/hud/settings.ts` → `useSettings()`. Bir oyunda değiştirilen ayar bütün oyunlarda geçerlidir.
- **Görüntü:** grafik kalitesi (Otomatik / Düşük / Orta / Yüksek), pil tasarrufu (düşük kaliteye kilitler). Otomatikte kare hızı düşünce kalite kendiliğinden iner. Adresteki `?q=` her zaman önceliklidir.
- **Ses:** ses aç/kapa, ses seviyesi, sesli anlatım.
- **Kontrol:** bakış hassasiyeti (0,4×–2×).

Oyunda kullanımı: `const G = useSettings()`; kademe `initialTier(G)`, otomatik düşürme `adaptive(G) && <PerformanceMonitor …>`, ses `audio.setMuted(G.muted)`, `audio.setVolume(G.volume)`, anlatım `useSettings.getState().tts`, sürükleme hızı `× sensitivity`.

## Kamera ve kontroller (masaüstü)
- Kamera klavyeyle (A/D, sol/sağ oklar) **çevrilmez**.
- Birinci şahıs oyunlar (Ani, İshak Paşa, Troya, Efes, Pamukkale, Zil Kale, Kapalıçarşı, Yerebatan, Galata): sahneye tıkla → imleç kilitlenir, fareyle bak; Esc imleci bırakır. Kart, bulmaca ya da menü açılınca kilit kendiliğinden bırakılır. Ortak kod: `src/app/games/shared/mouseLook.tsx` (`useMouseLook`, `LookCrosshair`).
- W/S (ve oklar yukarı/aşağı) yürür. A/D yalnız serbest yürünen oyunlarda yana adımdır (Kapalıçarşı, Yerebatan, Kız Kulesi) ya da teknede dümendir (Akdamar).
- Üçüncü şahıs ve yörünge kameraları (Kapadokya, Akdamar adası, Ayasofya, Topkapı, Nemrut, Hattuşa, Dolmabahçe): fareyle sürükleyerek döndür; Akdamar'da tekerlek yaklaştırır.
- Dokunmatik değişmedi: dikey sürükleme yürür, yatay sürükleme bakar.

## Bir oyunu geçirmek
1. Eski üst sıra, kart, başlık ve bitiş bileşenlerini kaldır.
2. `<Hud theme>` içine `TopBar` (`objective`, `right={<GameMenu onPause …/>}`), ana kontroller için `ActionDock`, kartlar için `InfoSheet`, `StartSheet` ve `EndSheet` koy.
3. Kontrol listesini (`CONTROLS`) bir kez yaz: hem başlangıç ekranında hem menüdeki "Nasıl oynanır"da kullanılır.
4. Baştan başla için bir `restart` işlevi ver.
