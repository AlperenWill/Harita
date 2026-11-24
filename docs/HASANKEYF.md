# Hasankeyf — "Türbeyi Taşı"

Rota: `oyun/hasankeyf` · Kod: `src/app/games/hasankeyf/` · Test: `tests/hasankeyf.test.ts` · Derinlik: detaylı.

## Oyun
1. **Gezinti:** Dicle'nin kuzey kıyısında Zeynel Bey Türbesi var; karşıda Eski Köprü'nün ayakları, El Rızk minaresi, kayalıktaki mağaralar ve kale görülür. Bu ayrıntılar E ile incelenir.
2. **Taşıma:** Türbenin arkasında E'ye basınca türbe tekerlekli modüler taşıyıcının (SPMT) üstünde olur.
   - Oyuncu platformu yol boyunca sürer: W/S ileri-geri, A/D dönüş. Platform yoldan çıkamaz.
   - Yokuşta güvenli hız düşer (`safeSpeed`). Hızlı gidilirse sarsıntı göstergesi dolar; dolunca platform 2 saniye durur.
   - Platform Kültür Park'taki temele varınca türbe yerine konur.
3. **Baraj:** Parkta E'ye basınca su yükselir. Aşağı kent, köprü ayakları ve kıyı göl altında kalır; kayalığın üstü ve kale suyun üstünde kalır.

Hedef 7 parçadan oluşur: 5 ayrıntı, taşıma ve baraj.

## Kaynaklarda bulunanlar
Bilgiler arama sonuçlarındaki özetlerden alındı.
- **Zeynel Bey Türbesi:** Uzun Hasan, 1473 Otlukbeli Savaşı'nda ölen oğlu Zeynel Bey için yaptırdı. Dıştan silindirik, içten sekizgendir; Anadolu'da tek örnek sayılır. [Habertürk](https://www.haberturk.com/hasankeyf-te-552-yillik-zeynel-bey-turbesi-turistlerin-ugrak-noktalarindan-3837248)
- **Türbenin taşınması:** 2017'de SPMT ile yaklaşık 2 km uzaktaki Kültür Park'a taşındı. Ağırlık kaynağa göre 1.100 ya da 1.150 ton veriliyor. [CNN Türk — SPMT](https://cnnturk.com/turkiye/tarihi-turbe-2-kilometre-tasinacak-595781) · [CNN Türk — Bakan açıklaması](https://cnnturk.com/turkiye/bakandan-hasankeyf-tarihi-eserleri-hakkinda-onemli-aciklama-651734)
- **Taşınan öteki yapılar:** Artuklu Hamamı, İmam Abdullah Zaviyesi'nin türbe bölümü ve minaresi, kalenin Orta Kapısı ve El Rızk Camii (önce minaresi, sonra gövdesi). [CNN Türk — Er-Rızk](https://cnnturk.com/turkiye/hasankeyfteki-son-eser-er-rizk-camisi-tasiniyor-1462068)
- **Eski Köprü:** Dört kemerliydi; Artuklu Fahreddin Kara Arslan yaptırdı. Ayakları ve bir kemeri kalmıştı. [Wikipedia — Old Bridge, Hasankeyf](https://en.wikipedia.org/wiki/Old_Bridge,_Hasankeyf)
- **Mağaralar:** Sayıları 5.000–7.000 olarak tahmin ediliyor. [National Geographic](https://www.nationalgeographic.com/magazine/article/turkey-flooding-dams-displaced-antiquities-mesopotamia)
- **Baraj:** Ilısu Barajı'nın gölü kenti büyük ölçüde örttü. [NPR](https://www.npr.org/2019/12/01/783932621/turkish-valley-home-to-human-settlements-for-millenia-soon-will-be-a-lake) · [Columbia MCID](https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/hasankeyf)

## Belirsiz olanlar
- **Dolma tarihi:** Kaynaklar 2019 ya da 2020 diyor; kartta "2019–2020" yazıyor.
- **Türbenin süslemesi:** Sırlı tuğla ya da çini bezeme doğrulanamadı. Oyundaki firuze bantlar temsilî.
- **Köprü:** En büyük kemer açıklığı ve yapım yılı doğrulanamadı; kartta geçmiyor.

## Temsilî olanlar
- **Yerleşim:** Uzaklıklar ve yol çok kısaltıldı. Gerçekte 2 km olan yol oyunda yaklaşık 290 m.
- **Biçimler:** Yolun yeri, kayalığın biçimi, mağaraların yeri, kale ve saray kalıntıları, aşağı kent evleri.
- **Ölçüler ve su:** Köprü ayaklarının ölçüsü, minare kuşakları, Kültür Park'taki yapıların biçimleri, su seviyesi.
- **Sarsıntı:** Göstergesi bir oyun kuralıdır; gerçek taşımanın hız sınırı değil.

## Model notları
- **Kayalık:** İlk hâlinde taş örgü dokusu kayalığı duvar gibi gösteriyordu. Yatay kalker katmanları ve çatlaklarla çizilmiş bir doku yapıldı.
- **Görüş:** Kıyıdaki kavaklar başlangıçta ve duraklarda görüşü kapatıyordu; duraklardan uzağa alındı.
- **Minare:** Kayalığın dibinde kayboluyordu. Kayalık geri çekildi, minare ve aşağı kent kıyıya alındı.
- **Taşıyıcı:** Türbe yerine konunca taşıyıcı görüşü kapatmayacak bir yere çekiliyor.
