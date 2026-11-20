# Teslim öncesi kontroller

## Yazı yönü ve ayrıntı güncellemesi

Tabelaların çift taraflı tek yüzeyi, birbirine zıt yöne bakan iki ayrı ön
yüzeyle değiştirildi. Böylece arka taraftan görülen yazılar aynalanmaz.
Üç sahnedeki bütün tabelalar yüz yönü, malzeme ve UV eşliği için denetlendi.
Yeni mimari ve ev içi detaylarından sonra 145 mantık kontrolü yeniden geçti.
Bu güncelleme için yeni bir gerçek tarayıcı görsel incelemesi yapılmadı.

## 17 Kasım 2026 — gerçek tarayıcı kontrolü

- Üç 3B sahne tarayıcıda açıldı; Mevlâna, Çatalhöyük ve Karatay görselleri incelendi.
- Görevler, yanlış/doğru cevaplar, 20 kanıt, bölüm kilitleri, sınavlar,
  otomatik kayıt ve rapor akışı için 142 doğrulama geçti.
- Bütün görev ve kanıt noktalarının çarpışma alanı dışında bulunduğu ve
  hareket sisteminin geçebileceği rotalarla erişildiği doğrulandı.
- WASD ile 0,5 saniyede yaklaşık 1,53 m yürüyüş; Shift ile 2,65 m koşu
  ölçüldü. E tuşu doğru bilgi panelini açtı.
- 1280×720 masaüstü, 390×844 dikey ve 844×390 yatay telefon yerleşimleri incelendi.
- Dokunmatik arayüz modunda sanal çubuk ve kamera sürüklemesi denendi.
- Çatalhöyük'te E/Araştır ile eve iniş ve dama dönüş tamamlandı.
- İncelenen tarayıcı oturumunda JavaScript hata kaydı bulunmadı.

## 19 Kasım 2026 — teslim sürümü kontrolü

- Açılış başlığı ve JavaScript kapalı mesajında kalan Antalya metinleri düzeltildi.
- `data.js`, `worlds.js` ve `game.js` sözdizimi kontrolünden geçti.
- Güncel oyun mantığı ve gerçek Three.js geometri üretimi, DOM/GPU taklitleri
  kullanılan yerel test ortamında 145 doğrulamadan geçti.
- Ek kontroller: indirilen raporun dosya adı, 10/10 görev ve 20/20 kanıt
  toplamları, bütün tarihî kaynak bağlantılarının rapora yazılması.
- Yayın paketinde bütün yerel script/CSS başvuruları doğrulandı; npm,
  React, Node.js sunucusu veya derleme bağımlılığı bulunmuyor.

## Sınırlar

19 Kasım'daki test ortamı gerçek GPU görüntüsünü yeniden doğrulamaz.
Görsel tarayıcı incelemesi 17 Kasım'da yapılmıştır. Fiziksel Android/iOS
cihazları, bütün tarayıcı sürümleri ve orta sınıf telefonlarda FPS ölçümü
yapılmamıştır. Dokunmatik arayüz testi, gerçek cihaz performans testi değildir.

Mimari modeller eğitim amaçlıdır; fotogrametri veya birebir ölçülü restorasyon
modelleri değildir. Yayın paketine geliştirme/test ekranları eklenmemiştir.
