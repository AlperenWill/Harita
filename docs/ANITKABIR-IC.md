# Anıtkabir iç mekânları: Şeref Holü ve müze

Kod: `src/app/monuments/anitkabir/interior.ts` (veri, ölçüler, çarpışma), `AnitkabirInterior.tsx` (çizim), `interact.ts` (E ile etkileşim).

## Kaynaklardan alınanlar
- Şeref Holü'nün iki yanında dikdörtgen planlı, mermer zeminli, **dokuzar çapraz tonozla** örtülü galeriler var. Bölmeler siyah mermer şeritlerle ayrılır.
- Girişte eşiğin ardından siyah mermerle çevrili enine kırmızı mermer dikdörtgen girişi işaretler.
- Zemin kırmızı ağırlıklıdır. Türk halı ve kilim motifleri (koç boynuzu, "yaba") halı izlenimi verir.
- Yan duvarlar kaplan postu beyaz mermer ve yeşil mermerle kaplıdır. Kaynaklar, mermerin geldiği yer konusunda birbirini tutmuyor.
- Tavan 27 kirişlidir ve 16. yüzyıl halı ve kilim desenli mozaikle bezelidir.
- Yan duvarlarda altışar, toplam **12 bronz meşale** var.
- Girişin karşısında, büyük pencereli nişte tek parça, ~40 ton kırmızı mermer sembolik lahit durur. Taş Osmaniye'den getirilmiştir. Niş beyaz Afyon mermeriyle kaplıdır; pencere Ankara Kalesi'ne bakar.
- Mozolenin tören meydanına bakan cephesinde solda Gençliğe Hitabe, sağda Onuncu Yıl Nutku yazılıdır (taş üzerine altın varak).
- Müze Şeref Holü'nün altındadır; girişi Misak-ı Millî Kulesi'ndendir. Bölümleri:
  - **1. bölüm:** Atatürk'ün kişisel eşyaları.
  - **2. bölüm:** Panoramalar. Çanakkale 6 × 40 m, Sakarya 7 × 30 m, Büyük Taarruz 7 × 30 m; önlerinde maket alanı var.
  - **3. bölüm:** Panorama bölümünü çevreleyen koridordaki 18 tonozda Millî Mücadele ve inkılaplar.
  - **4. bölüm:** Atatürk'ün kitapları.

Bağlantılar:
- [Kültür ve Turizm Bakanlığı — Anıtkabir](https://www.ktb.gov.tr/TR-96392/anitkabir.html)
- [Anıtkabir — Anıt Blok Hakkında](https://www.anitkabir.tsk.tr/02_insaasi/anit_blok_hakkinda.html)
- [Vikipedi — Anıtkabir](https://tr.wikipedia.org/wiki/An%C4%B1tkabir_Komutanl%C4%B1%C4%9F%C4%B1)
- [Arkitera — Anıtkabir'in Mimari Gerçekleri](https://www.arkitera.com/haber/anitkabirin-mimari-gercekleri/)
- [Kültür Portalı — Atatürk ve Kurtuluş Savaşı Müzesi](https://www.kulturportali.gov.tr/turkiye/ankara/gezilecekyer/anitkabr-ataturk-ve-kurtulus-savasi-muzes)
- [Vikipedi — Atatürk ve Kurtuluş Savaşı Müzesi](https://tr.wikipedia.org/wiki/Atat%C3%BCrk_ve_Kurtulu%C5%9F_Sava%C5%9F%C4%B1_M%C3%BCzesi)
- [Anıtkabir — Müze Hakkında](https://www.anitkabir.tsk.tr/03_muzeler/muze_hakkinda.html)

Not: anitkabir.tsk.tr ve Vikipedi sayfaları çalışma ortamından açılamadı. Bilgiler arama sonuçlarındaki özetlerden alındı.

## Yaklaşık ya da temsilî olanlar
- Holün iç ölçüleri yayımlanmamıştır ve bulunamadı. İç ölçüleri dış ölçülerden türettim (sütunlu blok 57,35 × 41,65 m, yükseklik 17 m, 44 sütun):
  - orta hol yaklaşık 16 m genişlik, galeriler yaklaşık 10 m,
  - galeri tonozlarının başlangıcı 7 m,
  - hol tavanı 14,2 m,
  - niş 11 × 6,5 m,
  - pencere 8 × 11 m.
- Kaynakta "kırmızı dikdörtgenler üç girişi işaretler" geçiyor. Cephede yan giriş olmadığı için tek büyük bronz kapı modellendi. Kapı ölçüsü (6 × 11 m) bulunamadı, temsilîdir.
- Lahit ölçüsü 40 tondan hesaplandı: 1,6 × 1,45 × 6,4 m, kırmızı mermer ~2,7 t/m³.
- Müzenin plan düzeni temsilîdir. İlk bölüm Misak-ı Millî Kulesi'nin yanındaki galerili yapıda, öteki bölümler kaide içindedir.
  - Müze zemini meydanın 0,9 m altına alındı; 7 m'lik panoramalar ancak böyle sığıyor.
  - Bölümler arasında kapıdan "ışınlanılır".
- Panorama resimleri ve maketleri canlandırmadır.
- 18 tonozdaki pano başlıkları ve sırası temsilîdir.
- 1. bölümdeki vitrin nesneleri temsilîdir.
- Mezar odası (sekizgen, piramidal örtülü) ziyarete kapalı olduğu için modellenmedi.
- Atatürk'ün araçları ayrı kulelerde sergileniyor: Cadillac 23 Nisan Kulesi'nde, 1934 Lincoln Barış Kulesi'nde. Bunlar henüz modellenmedi.

## Etkileşim
Kart, kapı geçişi ya da inceleme kendiliğinden açılmaz. Yaklaşınca alt ortada istem çıkar ("İncele: … E", "Müzeye gir · E"). Kart **E** tuşuyla ya da düğmeye dokununca açılır; Esc ya da E kapatır.
