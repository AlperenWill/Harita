# Kapalıçarşı — "Bin Dükkânın Sırrı" (Kayıp Eşya Avcısı)

Rota: `/oyun/kapalicarsi`. 3D haritada Kapalıçarşı kartındaki düğmeyle açılır. Giriş noktası `BazaarGame.tsx` (varsayılan dışa aktarım, `{ onExit }`).

## Dosya yapısı
```
kapalicarsi/
  BazaarGame.tsx                Ana yönetici: tohum/çarşı durumu, birinci şahıs kontrol, dükkân kamerası, ışık havuzu, kalite, arayüz
  ProceduralStreetGenerator.ts  Tohumlu çarşı üreteci: ızgara + rastgele Kruskal + ek döngüler, sokak/lonca adları, dükkân slotları,
                                kapılar, esnaf, hedef/yem, tavan gözleri, yürünebilirlik (saf, test edilir)
  Architecture.tsx              Zemin, birleştirilmiş duvarlar, GPU desenli tonoz ve yelken tonozlar, instanced dükkân modülleri,
                                tabela atlası, vitrin malları (LOD), ampul/kepenk, ışık huzmeleri, gece lambaları, kapılar, bedesten
  ShopInterior.tsx              Girilen dükkânın içi: zanaata özgü raflar ve mallar, tezgâh, 5 aday nesne, sıcak ampul ışığı
  items.ts                      Tezgâh nesneleri ve çeşitleri (hedef/yem/benzer), deterministik (saf)
  CrowdSystem.ts                Ajan simülasyonu (sokak grafı üstünde) + iki InstancedMesh (yakın ayrıntılı, uzak siluet), vertex shader animasyonu
  clues.ts                      Esnafın 5 soruya cevabı: doğru sorular hedefe, "benzer" sorusu yeme götürür (saf)
  DialogueSystem.tsx            Esnaf diyalog kutusu (daktilo, sesli okuma, deftere yazma)
  BazaarAudio.ts                Uzamsal ses: uğultu, seslenmeler, ayak sesi, zanaata göre dükkân sesleri (HRTF)
```

## Oynanış
- **Kayıp eşya.** Her girişte yeni bir tohumla yeni bir çarşı ve yeni bir eşya üretilir: antika anahtar, eski harita, gümüş pusula, sedef kutu ya da kehribar tespih. `?seed=` ile aynı çarşı tekrar açılır.
- **Esnafa sor.** Esnafın beş sorusu var:
  - *Hangi esnafın işine yarar?* Doğru cevap: zanaat.
  - *En son nerede görüldü?* Doğru cevap: pusula yönü + uzaklık, esnafın bulunduğu yerden.
  - *Hangi sokakta?* Yalnızca aynı loncadan esnaf bilir; öbürleri seni doğru loncaya yönlendirir.
  - *Benzer bir şey satan var mı?* **Yanıltıcı.** "Benzer ama sahte" eşyanın bulunduğu dükkâna gönderir.
  - *Çarşı hakkında ne anlatırsın?* Tarih bilgisi verir, ipucu vermez.
- **Defter (J)** eşyanın tarifini ve tüm ipuçlarını kimin, nerede söylediğiyle tutar. Pusula şeridi yönü gösterir, çünkü ipuçları pusula yönüyle verilir.
- **Dükkân.** Kapıya gelince "Dükkâna gir"e bas; kamera tezgâha yaklaşır. Tezgâhta 5 nesne vardır. Bir nesneye dokununca kamera ona yakınlaşır ve nesne döner. "Aradığım bu!" deyince:
  - **Hedef:** oyun kazanılır.
  - **Yem:** "benzer ama değil" uyarısı gelir.
  - **Öbür nesneler:** "tarife uymuyor" uyarısı gelir. Başka dükkânlarda da aynı türden ama tarife uymayan çeşitler çıkar.
- **Kamera.** Serbest kamera yok. Sokakta birinci şahıs görünüm var; dükkânda kamera tezgâha ve seçilen nesneye otomatik geçer.
- **Kontroller.**
  - Dokunmatik: tek parmakla sürükleme yürütür (yukarı: ileri) ve döndürür (yana). Çift dokunuş en yakın dükkânın kapısına götürür.
  - Masaüstü: WASD ile yürü, fareyle sürükleyerek bak. E konuşur ya da dükkâna girer, Esc dükkândan çıkar.
- **Gündüz / gece.** Gece kepenkler kapalıdır. Yalnızca kavşak güvenlik lambaları ve tavan gözlerinden süzülen soluk ay ışığı vardır; çarşı neredeyse boştur.

## Teknik gerekçeler
- **Neden ızgara + rastgele Kruskal + döngüler?** Gerçek çarşı dik açılı bir ızgaraya yakındır: ortada bedesten, doğu–batı ana cadde var.
  - Kapsayan ağaç her noktaya ulaşılabilirliği garanti eder.
  - Ana cadde her zaman açıktır; kaybolunca dönülecek tanıdık omurgadır.
  - Ek kenarların ~%30'u açılınca döngüler oluşur; böylece çıkmaz sokak yığını değil, gerçek bir labirent hissi çıkar.
  - Sokaklar loncalara göre adlanır ve bir sokaktaki dükkânların ~%78'i aynı zanaattandır.
- **Neden tavan deseni gölgelendiricide?** Tonozların uzunlukları her çarşıda farklı ve doku dosyası yok.
  - Tonoz ağına iki öznitelik yazılır: `aL` (tonoz boyunca metre) ve `aA` (kesit açısı).
  - Parça gölgelendiricisi bunlardan kemer kuşaklarını (kırmızı–krem taş dizisi), üzengi bantlarını ve bölme ortasındaki kalem işi madalyonu çizer.
  - Kavşakların yelken tonozlarında radyal kaburgalar ve tepe gözü çizilir. Tavan gözleri gündüz ışıma verir, bloom bunları taşırır.
- **Neden instancing?** Çarşı her girişte yeniden üretilir ve yüzlerce dükkânın her biri birkaç parçadan oluşur.
  - Duvarlar tek birleşik ağdır.
  - Ayak, kemer, tabela, mal, ampul, kepenk ve huzme birer InstancedMesh'tir.
  - Toplam yaklaşık 20–25 draw call eder.
- **Tabelalar** tek bir canvas atlasındadır; her örnek, kendi UV kaydırma özniteliğiyle atlastaki hücresini seçer.

## Kalabalık
Kalabalık matematiği sokak grafı üzerinde 1B konumla çalışır; ayrıntılar `CrowdSystem.ts` başındaki yorumda.
- **Konum ve ilerleme:** konum `p = A + d·t + n·şerit`, ilerleme `t += ±v·dt`.
- **Hız:** v, 0,95–1,5 m/sn arasında.
- **Kavşak seçimi:** ağırlıklar düz devam 2, dönüş 1, geri dönüş 0,15.
- **Dönüşlerde süreklilik:** konum yeni kenara izdüşürülür, böylece sıçrama olmaz.
- **Vitrin:** saniyede %6 olasılıkla 2–6 sn durur.
- **Sohbet:** saniyede %2 olasılıkla, 2 m içindeki biriyle 3–5 sn durur.
- **Oyuncudan kaçınma:** şerit oyuncudan uzağa kayar ve hız yarıya iner. Şerit değişimi en çok 0,8 m/sn'dir.
- **Çizim:** yakındaki ≤48 kişi + esnaf ayrıntılı ağa, kalanlar siluet ağına yazılır; her ağ tek draw call'dur.
- **Animasyon:** yürüme, vertex shader'da parça kimliğiyle (bacak/kol) yapılır. CPU her kişi için yalnızca matris + 4 sayı yazar.

## Mobil performans
- **Kademeler:**
  - Yüksek: 560 kişi, 8 gerçek ışık, mal LOD'u 34 m.
  - Orta: 400 kişi, 5 ışık, LOD 26 m.
  - Düşük: 220 kişi, 3 ışık, LOD 18 m; bloom ve huzme yok.
- **Pil tasarrufu** (pil %20'nin altında ve şarjda değilken): 100 kişi; ışık huzmeleri, toz ve sis kapanır.
- **Uyarlanabilir LOD:** oyuncudan uzak dükkânların vitrin malları gizlenir (2,5 Hz güncelleme); uzaktan yalnızca kapı ve tabela görünür.
- **Doku akışının karşılığı:** ayrıntılı dükkân içi ve gerçek ampul ışığı yalnızca girilen dükkânda üretilir. Sokakta tek düşük çözünürlüklü tabela atlası kullanılır.
- **Işık havuzu:** sabit sayıda gerçek ışık her 0,3 sn'de oyuncuya en yakın dükkânlara (gündüz) ya da lambalara (gece) taşınır.

## Mobil test listesi (henüz gerçek cihazda ÖLÇÜLMEDİ)
Geliştirme ortamında yalnızca yazılım GPU'su (swiftshader) ile işlevsel test yapıldı.
1. **500+ NPC:** yüksek kademede (`?q=high`) ana caddede 30 sn yürü; 30 fps altına düşüyor mu? PerformanceMonitor kademe düşürüyor mu?
2. **Draw call:** `renderer.info.render.calls` sokakta 30'un altında mı (ekran görüntüsü + konsol)?
3. **Kalabalık simülasyonu bütçesi:** 520 ajan için adım < 2 ms (vitest'te otomatik ölçülür; cihazda Performance panelinde doğrula).
4. **Pil tasarrufu:** pil < %20 iken NPC 100'e iniyor mu; huzme ve sis kapanıyor mu?
5. **Dokunma:** tek parmak sürükleme yürüme/dönme akıcı mı? Çift dokunuş en yakın kapıya götürüyor mu? Düğmeler yanlışlıkla yürütmüyor mu?
6. **Dükkân içi:** girişte takılma (ilk ayrıntılı iç mekân üretimi) 100 ms'yi aşıyor mu?
7. **Isınma:** 10 dk oynayınca cihaz ısınması ve kare hızındaki düşüş.
8. **Ses:** sağdaki dükkânın sesi sağ kulaktan geliyor mu (kulaklıkla)? Halıcının önünde uğultu kısılıyor mu?
9. **Bellek:** "Başka çarşı" ile 5 kez yeni çarşı üret; bellek sürekli artıyor mu?

## Şanlıurfa ve öteki oyunlarla tutarlılık
- Aynı cihaz profili yapısı (`?q=`, pil tasarrufu, PerformanceMonitor).
- Alttaki diyalog kutusu, daktilo ve isteğe bağlı tr-TR sesli okuma.
- WebGL yoksa Vikipedi fotoğrafı ve metin yedeği.
- Türkçe arayüz, `?debug` kancaları (`window.__bazaar`).

## Dürüstlük notları
- **Çarşı düzeni gerçek planın kopyası değildir;** her seferinde yeniden üretilen bir kurgudur.
- **Gerçek olanlar:** Kalpakçılar Caddesi'nin varlığı, ortada Cevahir Bedesteni, kapı adları (Beyazıt, Nuruosmaniye, Mahmutpaşa, Çuhacıhan, Kürkçüler, Kuyumcular, Mercan, Çarşıkapı), sokakların lonca adı taşıması.
- **Uydurma olanlar:** "Kandilciler", "Aktarlar", "Çiniciler" gibi bazı sokak adları; esnaf, eşyalar ve hikâye.
- **Ölçek:** üretilen çarşıda ~200 dükkân var. Gerçek çarşı kaynaklara göre 3.000–4.000 dükkân ve 61 civarı sokaktır; sayılar kaynaktan kaynağa ve döneme göre değişir.
- **Tarih bilgileri** (clues.ts → FACTS) aşağıdaki kaynaklara dayanır. Sandal Bedesteni'nin tarihi kaynaklarda farklıdır (1460 ya da 1545); bu yüzden oyunda tarih verilmez.

## Kaynaklar
- [Wikipedia — Grand Bazaar, Istanbul](https://en.wikipedia.org/wiki/Grand_Bazaar,_Istanbul)
- [Archnet — Grand Bazaar](https://archnet.org/sites/3472)
- [istanbul.com — Must-knows about the Grand Bazaar](https://istanbul.com/blog/historical-bazaars-markets/must-knows-about-the-grand-bazaar)
- [Hürriyet — Her sokağı farklı bir dünya](https://www.hurriyet.com.tr/seyahat/her-sokagi-farkli-bir-dunya-25927396)
- [Küre Ansiklopedi — Kapalı Çarşı](https://kureansiklopedi.com/tr/detay/kapalicarsi-7d9f5461)
