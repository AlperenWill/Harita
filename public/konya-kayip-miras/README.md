# Tarihî Konya'nın İzinde — Kayıp Miras

**JOURNEY THROUGH HISTORICAL KONYA**

Antalya tarihî keşif oyununun Konya devamı. Tamamen Türkçe, birinci şahıs,
üç ayrı Three.js sahnesi, 10 araştırma görevi ve 20 anlamlı kanıt noktası.

## Başlatma

Arşivi tamamen çıkarıp `index.html` dosyasını açın. Bütün çalıştırma
bağımlılıkları yereldir. Node.js, npm, React veya derleme sistemi yoktur.
Bir statik web sunucusunda aynı dizini yayınlamak da yeterlidir.
GitHub Pages ve Vercel için giriş dosyası kökteki `index.html` dosyasıdır;
derleme komutu veya sunucu işlevi gerekmez.

## Bölümler

| Mekân | Görev | Kanıt | Ana araştırma |
|---|---:|---:|---|
| Mevlâna Müzesi | 4 | 8 | Türbe, avlu, Mevlevi kültürü, zaman çizgisi |
| Çatalhöyük | 3 | 6 | Damdan erişim, ev içi yaşam, kanıt ve yorum |
| Karatay Medresesi | 3 | 6 | Taçkapı, çini sanatı, kapalı avlulu medrese |

Her görevde Deniz'in kısa başlangıç mesajı, açık hedef, iki gözlem,
etkileşimli etkinlik, tarihî açıklama ve tamamlama ekranı vardır.
Eşleştirme ve sıralama etkinlikleri yalnızca çoktan seçmeli soru değildir.
Yanlış cevaplar ilerlemeyi kaybettirmez; açıklama ile yeniden deneme sunar.
Bölüm sınavı bir sonraki mekânı açar. Son rapor metin dosyası olarak indirilebilir.

## Korunan seri sistemleri

Kaynak referans: kullanıcının Antalya `perge-stage1.zip` oyunu.
Orijinalin koyu yeşil/altın arayüzü, sol görev paneli, günlük akışı,
Deniz karakteri, WASD/fare ve dokunmatik kontrolleri, çarpışma ızgarası,
otomatik kayıt, grafik kalite uyarlaması ve sahne kaynaklarını temizleme
sistemleri uyarlanmıştır. Konya'nın mimarisi ve görev verileri yenidir.

Eklenenler: çarpışmaları dikkate alan rota hesabı, zeminde açılıp kapanan
yönlendirme halkaları, bütün bölümlere ait kanıt ekranı, etkileşimli kart
sıralama, iki sütunlu eşleştirme, kaynaklı indirilebilir rapor.

## Dosyalar

- `index.html`: uygulama iskeleti ve erişilebilir arayüz alanları.
- `style.css`: Antalya paletini koruyan masaüstü/mobil arayüz.
- `data.js`: 10 görev, 20 kanıt, sınavlar, öykü ve kaynak eşlemeleri.
- `worlds.js`: üç mimari ortam, malzemeler ve sahne geometrileri.
- `game.js`: kontroller, görev durumu, kayıt, etkinlikler, rota ve rapor.
- `vendor/three.min.js`: yerel Three.js 0.160.1.
- `vendor/THREE-LICENSE.txt`: Three.js MIT lisansı.
- `KAYNAKLAR.md`: tarihî kaynaklar ve yorum sınırları.
- `TESTLER.md`: teslim öncesi kontroller ve sınırlar.

## Ses, performans ve kayıt

Sesli anlatım bulunmaz. Müzik ve ortam efektleri ayrı kontrol edilir ve
başlangıçta sıfırdır. Ses bağlamı yalnızca kullanıcı oyuna başladıktan
sonra açılır. Oyun sessiz oynanabilir.

Tekrarlanan geometri `InstancedMesh` ile gruplanır. Tek sahne bellekte
tutulur; bölüm değişiminde eski kaynaklar serbest bırakılır. Grafik
ayarları piksel oranını ve gölgeleri değiştirir; uyarlanabilir mod
kare hızına göre kaliteyi düşürür. Düşük ayarda gölgeler kapalıdır.
Gerçek telefon donanımları farklıdır; kesin bir FPS garantisi verilmez.

İlerleme `localStorage` içinde `konya:v1:` önekiyle tutulur ve Antalya
kaydını değiştirmez. Depolama engellendiğinde oyun oturum içinde sürer.
Kaynak bağlantıları dış sayfadır; oyun varlıkları dış ağ isteği gerektirmez.

## Tarihî sorumluluk

Oyuncu tarihî eser toplamaz; anlamlı gözlem notlarını toplar. Deniz ve
karışmış arşiv dosyaları kurmacadır. Gerçek tarih ile kurmaca ayrılır.
Mevlâna ve Karatay tanınan mimari özelliklerden esinlenen, sıkıştırılmış
ölçekli yorumlardır. Çatalhöyük, güncel kazı alanının birebir kopyası değil,
Neolitik ev düzenini açıklayan bir canlandırmadır. Geometrik bezemeler ve
ev eşyaları özgün eğitim tasarımlarıdır; özgün eser oldukları iddia edilmez.

Çatalhöyük evine iniş/çıkış, ayrı bir kesit odaya geçişle temsil edilir.
Bu erişim animasyonlu fiziksel merdiven tırmanışı değildir. Görevler
dam rotasında ve gözlem kesitlerinde ilerler.
