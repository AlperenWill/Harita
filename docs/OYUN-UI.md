# Oyun arayüzü (HUD)

Bütün oyunlar aynı arayüzü kullanır: `src/app/games/shared/hud/Hud.tsx`. İlk örnek: Kapadokya (`src/app/games/kapadokya/BalloonGame.tsx`).

## Yerleşim (önce telefon, dikey ekran)
| Yer | Bileşen | Ne |
|---|---|---|
| Sol üst | `BackButton` (`TopBar` içinde) | "← Harita". Her oyunda aynı yerde, aynı biçimde |
| Sağ üst | `SettingsCluster` | Ses + "⋯" menü: sesli anlatım, ses, nasıl oynanır, baştan başla, haritaya dön |
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

## Bir oyunu geçirmek
1. Eski üst sıra, kart, başlık ve bitiş bileşenlerini kaldır.
2. `<Hud theme>` içine `TopBar` (`objective`, `right={<SettingsCluster …/>}`), ana kontroller için `ActionDock`, kartlar için `InfoSheet`, `StartSheet` ve `EndSheet` koy.
3. Kontrol listesini (`CONTROLS`) bir kez yaz: hem başlangıç ekranında hem menüdeki "Nasıl oynanır"da kullanılır.
4. Baştan başla için bir `restart` işlevi ver.
