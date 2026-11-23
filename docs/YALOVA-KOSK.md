# Yalova Atatürk Köşkü / Yürüyen Köşk — "Ağaç İçin Kaydırılan Köşk"

Kod: `src/app/games/yalovakosk/`
- `site.ts`: köşkün konumu (şu anki ve kaydırılmadan önceki), çınar, ray izleri, çitli bahçe ve duraklar. Saf veridir, test edilir (`tests/yalovakosk.test.ts`).
- `YalovaKoskModels.tsx`: 3B modeller (ahşap köşk, çınar, ray izleri ve eski temel çizgisi, bahçe, kent, Marmara).
- `YalovaKoskGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `yalova-kosk` (`src/data/heritage/marmara.ts`; koordinat kent merkezindeki Yürüyen Köşk'e aittir).

**Önemli ayrım:** Yalova'da iki ayrı Atatürk köşkü anılır. Bu oyun **kent merkezindeki Yürüyen Köşk**'ü anlatır. **Termal Atatürk Köşkü** (1929, mimar S. Hakkı Eldem olarak anılır) ayrı bir yapı olarak geçer; ancak iki yapının ayrı olduğunu bağımsız bir kaynakla doğrulayamadım (yalnızca köşkün tabelasındaki bir ifade ve arama özetleri). Kaynaklarda ikisi zaman zaman karışıyor.

**Oyunda köşkün içine girilmez.** Oyuncu bahçede, çınarın altında ve ray izlerinin üzerinde dolaşır.

## Oyun
5 ayrıntı:
1. Yürüyen Köşk
2. Çınar ağacı
3. Raylarla kaydırma
4. Restorasyon ve ziyaret
5. Termal'deki köşk ayrı

## Kaynaklarda bulunanlar
- **Yapım ve ad:** Yapımına 21 Ağustos 1929'da Atatürk'ün talimatıyla başlandı; çınar ağacının dalı kesilmesin diye köşk raylar üzerinde kaydırıldı, bu yüzden "Yürüyen Köşk". [CNN Türk](https://cnnturk.com/yasam/ataturkun-emriyle-tasinmisti-dal-kesilmeyecek-kosk-yuruyecek-635043)
- **Kaydırma:** Yaklaşık 4,80 m (bazı haberlerde "yaklaşık 5 m"); iş 10 Ağustos 1930'da tamamlandı. [Timeturk](https://www.timeturk.com/kultur/ataturk-agac-icin-kosku-kaydirmis/haber-1677866), [CNN Türk](https://cnnturk.com/yasam/ataturkun-emriyle-tasinmisti-dal-kesilmeyecek-kosk-yuruyecek-635043)
- **Çınar:** Doğu çınarı, yaklaşık 390–400 yaşında. [Cumhuriyet](https://www.cumhuriyet.com.tr/haber/ataturkun-dali-kesilmesin-diye-kosku-tasittigi-cinar-agaci-400-yasinda-1136954)
- **Ziyaret:** Restore edilerek 2006'da ziyarete açıldı; yılda yaklaşık 50 bin ziyaretçi. [Hürriyet Daily News](https://hurriyetdailynews.com/walking-mansion-now-open-to-visitors-52898)
- **Termal Atatürk Köşkü:** 1929'da yapıldı, mimar S. Hakkı Eldem olarak anılır. [Wikipedia](https://en.wikipedia.org/wiki/Yalova_Atat%C3%BCrk_Mansion)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Çınarın yaşı:** 390–400 arasında farklı veriliyor.
- **Kaydırma mesafesi:** 4,80 m ile "yaklaşık 5 m" arası.
- **Termal köşkünün yapım süresi (38 gün), oda sayısı (11 oda, 3 şeref salonu) ve kullanım ayrıntıları:** Bir haber sitesinden; oyuna alınmadı.
- **Atatürk'ün Termal'e ilk gelişi (1927 / 1929):** Kaynaklar çelişiyor; oyunda yok.
- **"Dünya Mirası Listesi'ne girecek" açıklaması:** Bir konuşma bilgisi; oyuna alınmadı.
- **Atatürk'ün bu köşkte kaldığı süre ve olaylar:** Doğrulanamadı; oyunda yok.

## Temsilî olanlar
- Köşkün biçimi, boyutu, kat sayısı ve pencere düzeni.
- Ray izlerinin ve eski temel çizgisinin yeri ve görünümü.
- Çınarın tacının boyutu ve biçimi.
- Bahçenin düzeni, havuz, tarhlar; çevredeki evler ve Marmara.
