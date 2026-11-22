# Oyun arayüzü (HUD)

Bütün oyunlar aynı arayüzü kullanır: `src/app/games/shared/hud/Hud.tsx`. İlk örnek: Kapadokya (`src/app/games/kapadokya/BalloonGame.tsx`).

Geçirilen oyunlar: Kapadokya, Ani, İshak Paşa, Akdamar, Troya, Efes, Pamukkale, Zil Kale, Ayasofya, Topkapı, Dolmabahçe, Nemrut, Hattuşa,
Kapalıçarşı, Kız Kulesi, Galata, Yerebatan, Cumalıkızık, Bayburt Kalesi, Şeytan Kalesi, Munzur Vadisi, Yüzen Adalar, Sümela Manastırı, Trabzon Ayasofya, Sagalassos, Cacabey Medresesi, Mahmut Bey Camii, Anıtkabir (anıt sayfası). Bağımsız Şanlıurfa oyununa aynı görünümde ≡ menü
`public/sanliurfa-oyun/index.html` sonunda eklendi. Konya ve Antalya oyunlarının kendi menüleri bu arayüzün örnek alındığı yapıdır.
Oyuna özel paneller (konuşma kutuları, defter, kroki, ışık paneli…) aynı açık temaya boyandı; oyuna özel düğmeler sağ üstte ≡'in soluna konur.

## Yerleşim (önce telefon, dikey ekran)
| Yer | Bileşen | Ne |
|---|---|---|
| — | (sol üstte geri düğmesi yok) | Haritaya dönüş yalnızca ≡ menüde ("Haritaya dön"); başlangıç kartında da "Haritaya dön" bağlantısı var |
| Sağ üst | `GameMenu` | Tek "≡" düğmesi (Konya/Antalya oyunlarındaki gibi). Açılınca oyun durur: Devam et, Nasıl oynanır, Ayarlar, Baştan başla, Haritaya dön |
| Üst orta (telefonda ikinci satır) | `Objective` | Sıradaki hedef + ilerleme çubukları + sayı |
| Sol | `ToolPanel` | Oyuna özel gösterge (ör. rüzgâr katmanları); başlığa dokununca daralır |
| Sağ alt | `ActionDock` + `RoundAction` | Ana kontrol (vurgu renginde) ve ikincil kontrol |
| Alt orta | `Hint` | Kısa ipucu; birkaç saniye sonra kendiliğinden solar |
| Alt orta (ipucunun üstü) | `InteractPrompt` | "İncele: …  [E]" istemi: oyuncu bir şeyin yanındayken / ona bakarken çıkar |
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

## Etkileşim: kendiliğinden hiçbir şey açılmaz
- Bilgi kartı, bulmaca, vizör, zaman penceresi, rehber konuşması ve inceleme yakınlaşması **asla kendiliğinden açılmaz**. Oyuncu yaklaşınca
  ya da baktığında yalnızca `InteractPrompt` çıkar; kart oyuncu **E**'ye (dokunmatikte düğmeye) basınca açılır.
- Rehberli oyunlarda (Ayasofya, Topkapı) rehber durakta bekler; "Konuş: … E" ile anlatır. Kız Kulesi'nde Can "anlatmak istiyor" der, E ile konuşur.
- Kamera kendiliğinden hedefe dönmez ve yakınlaşmaz (yalnızca oyuncunun açtığı inceleme kipinde, ör. Yerebatan Medusa).

## Kamera ve kontroller (masaüstü)
- **Bütün yürüyüş oyunları birinci şahıstır** (göz hizası ~1,62 m); oyuncunun kendi modeli çizilmez. Kapadokya'da sepetin içinden bakılır.
- Kamera klavyeyle (A/D, sol/sağ oklar) **çevrilmez**.
- Sahneye tıkla → imleç kilitlenir, fareyle bak; Esc imleci bırakır. Kart, bulmaca ya da menü açılınca kilit kendiliğinden bırakılır.
  Ortak kod: `src/app/games/shared/mouseLook.tsx` (`useMouseLook`, `LookCrosshair`) ve `src/app/games/shared/fpLook.tsx`
  (`useFpLook`: fare kilidi + dokunmatik sürükleme, `applyFp`: kamerayı göz hizasına koyar).
- W/S (ve oklar yukarı/aşağı) yürür; A/D serbest yürünen oyunlarda yana adımdır, Akdamar'da teknede dümendir.
  Rotaya bağlı oyunlarda (Hattuşa, Dolmabahçe, Troya, Efes…) W bakılan yöne göre rotada ileri/geri götürür.
- Dokunmatik: sol alttaki joystick yürür (rotalı eski oyunlarda dikey sürükleme), ekranın geri kalanında sürükleme bakar.
- Akdamar adası yörünge kamerasıdır (yürüyüş değil): sürükleyerek döndür, tekerlek yaklaştırır.

## Bir oyunu geçirmek
1. Eski üst sıra, kart, başlık ve bitiş bileşenlerini kaldır.
2. `<Hud theme>` içine `TopBar` (`objective`, `right={<GameMenu onPause …/>}`), ana kontroller için `ActionDock`, kartlar için `InfoSheet`, `StartSheet` ve `EndSheet` koy.
3. Kontrol listesini (`CONTROLS`) bir kez yaz: hem başlangıç ekranında hem menüdeki "Nasıl oynanır"da kullanılır.
4. Baştan başla için bir `restart` işlevi ver.
