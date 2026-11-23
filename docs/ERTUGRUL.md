# Ertuğrul Gazi Türbesi (Bilecik, Söğüt) — "Söğüt'te Bir Sessizlik"

Kod: `src/app/games/ertugrul/`
- `site.ts`: türbe bahçesi, kapı, türbe, nöbet noktaları, büstler, cami tepesi, şenlik alanı ve duraklar. Saf veridir, test edilir (`tests/ertugrul.test.ts`).
- `ErtugrulModels.tsx`: 3B modeller (duvarlar, türbe, nöbet kulübeleri, büstler, cami, kıl çadır, Söğüt evleri, ağaçlar, dağlar).
- `ErtugrulGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `ertugrul-turbe` (`src/data/heritage/marmara.ts`).

## Oyun
Oyuncu Söğüt meydanından türbe bahçesinin kapısına yürür, nöbet noktaları ve büstlerin arasından türbeye gelir, batıdaki tepede camiyi, doğuda şenlik alanını görür. 6 ayrıntı:
1. Söğüt
2. Türbe
3. Mezarın tarihi
4. Ertuğrul Gazi Camii
5. Nöbet ve büstler
6. Anma ve Şenlikler

## Zaman şeridi (mekanik)
Sol üstteki **zaman şeridi** (ya da **1–4** tuşları) türbe bahçesini dört döneme çevirir. Sahne yerden yükselerek ya da yere inerek değişir:
1. **1280'ler, açık mezar:** Höyük, baş ve ayak taşı, taş halka, çalı çit. Tepede göçebe kıl çadırları var, kasaba yok.
2. **Orhan Gazi dönemi, ilk türbe taşları:** Alçak moloz taş bahçe duvarı ve mezarın çevresinde alçak altıgen taş duvar.
3. **Sonra, altıgen türbe:** Bugünkü bahçe duvarı, kubbeli altıgen türbe, tepede cami, Söğüt evleri.
4. **Bugün, büstler ve nöbet:** Büstler, nöbet noktaları ve aralıklarla birkaç adım yürüyüp dönen iki nöbetçi.

Oyuncu bahçedeyken bir dönemi ilk kez seçince o dönem sayılır ve kartı açılır. Hedef toplam 10: 6 ayrıntı ve 4 dönem.
- **Kaynaklar:** Açık mezar ve ilk türbe taşları için [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/ertugrul-gazi-camii-ve-turbesi). Altıgen türbe ve 1970'lerde konan büstler için [TDV İslâm Ansiklopedisi](https://islamansiklopedisi.org.tr/ertugrul-gazi-camii-ve-turbesi). Büstlerin bir kısmının tartışmalar sonucu kaldırıldığı için [Diken](https://www.diken.com.tr/?p=832768). Diken'e yalnızca arama sonucu özetinden ulaşıldı, sayfa açılmadı.
- **Temsilî:** Erken dönemlerin biçimi bilinmiyor. Höyük, çit, taş halka, alçak duvarlar, çadırlar, dönemler arası geçişlerin sırası ve nöbetçilerin hareketi temsilîdir. "Sonra" dönemi tek bir tarihe bağlanmadı, çünkü türbe birkaç kez yeniden yapıldı.
- **Bilerek oyuna alınmayanlar:** Büstlerin kimleri gösterdiği ve "16 büyük Türk devleti" listesi. Kaynaklar büstlerin kimleri gösterdiğini söylemiyor. 16 devlet listesi de tarihçilerce tartışmalı ([Wikipedia — 16 Great Turkic Empires](https://en.wikipedia.com/wiki/16_Great_Turkic_Empires)). Bu yüzden büstler isimsiz kaldı.

## Kaynaklarda bulunanlar
- **Yer:** Söğüt, Osmanlı Beyliği'nin çıkış yeri olarak anılır. [Küre Ansiklopedisi — Söğüt](https://kureansiklopedi.com/tr/detay/sogut-2)
- **Mezar ve türbe:** Ertuğrul Gazi'nin yaklaşık 1281–82'de öldüğü ve Söğüt'e gömüldüğü aktarılır. Mezarın Osman Bey tarafından açık mezar olarak düzenlendiği (1281–85) ve ilk türbe taşlarının Orhan Gazi döneminde konduğu söylenir. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/ertugrul-gazi-camii-ve-turbesi), [TDV İslâm Ansiklopedisi](https://islamansiklopedisi.org.tr/ertugrul-gazi-camii-ve-turbesi)
- **Mimari:** Altıgen planlı, kubbeli ve kırma çatılı; erken Osmanlı türbe mimarisi. [TDV İslâm Ansiklopedisi](https://islamansiklopedisi.org.tr/ertugrul-gazi-camii-ve-turbesi)
- **Cami:** Söğüt'ün güneybatısındaki bir tepede; ölümünden sonra yapıldığı ve 19. yüzyıl sonunda yeniden inşa edildiği aktarılır. [Küre Ansiklopedisi — Söğüt](https://kureansiklopedi.com/tr/detay/sogut-2)
- **Nöbet ve büstler:** Jandarma personelinin nöbet töreni; türbenin önünde on altı Türk devletinin ve Cumhuriyet'in kurucularının büstleri. [Bursa Hakimiyet](https://www.bursahakimiyet.com.tr/yasam/ertugrul-gazi-turbesi-ni-yaklasik-3-milyon-kisi-ziyaret-etti-1562197)
- **Anma:** Her yıl Eylül sonunda; 2025'te yaklaşık 3 milyon ziyaretçi. [Daily Sabah](https://www.dailysabah.com/turkiye/ertugrul-ghazi-commemorated-at-ceremony-in-turkiyes-bilecik/news), [Bursa Hakimiyet](https://www.bursahakimiyet.com.tr/yasam/ertugrul-gazi-turbesi-ni-yaklasik-3-milyon-kisi-ziyaret-etti-1562197)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Türbenin kökeni:** Kaynaklar çelişiyor: bir yayın "birkaç kez yeniden yapıldığı için kökeni hakkında kesin bir şey söylenemez" diyor; Daily Sabah türbeye dönüşümü I. Mehmed'e bağlıyor. Oyunda "kaynaklarda kesin değildir" denildi.
- **II. Abdülhamid:** Miras verisindeki `didYouKnow` alanı bugünkü yapının II. Abdülhamid döneminde yeniden düzenlendiğini söylüyor; bu aramada doğrulanamadı, oyuna alınmadı.
- **Yakınların gömülmesi:** Saruyatu ya da Savcı Bey'in aynı avluda yattığı yerel bir gelenek; oyuna alınmadı.
- **Edebali:** Şeyh Edebali'nin türbesi eski Bilecik'te, bu türbede değil; oyuna alınmadı.
- **Anma tarihleri:** Yılın tam günü kaynaklarda net verilmedi; oyunda "Eylül sonu".

## Temsilî olanlar
- Bahçenin ve türbenin ölçüleri; altıgen gövde, kubbe ve kapı biçimi.
- Büstlerin yeri, biçimi ve sırası (oyunda bahçenin iki yan duvarı boyunca on altı).
- Nöbet kulübelerinin yeri.
- Tepedeki caminin biçimi, çadır ve şenlik alanı, çevredeki evler.
