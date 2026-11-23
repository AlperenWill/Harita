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

## Köşkü kaydır (mekanik)
Oyun 1930'da başlar: köşk **eski yerindedir** ve çınarın köşke uzanan dalı çatısının batı yamacına değer. Rayların doğu ucunda bir **kriko** (makara, kol, halat) var. Her **E**'ye ya da düğmeye basışta köşk 40 cm doğuya kayar, toplam yaklaşık 4,8 m. Köşkün yürünmez alanı da onunla birlikte kayar; yolda biri varsa kriko çevrilmez. Köşk yerine varınca "Dal kurtuldu" kartı açılır. Eski temelin taş sırası, köşkün önceki yerini gösterir. Hedef toplam 6: 5 ayrıntı ve kaydırma.
- **Kaynak:** Yaklaşık 4,8 m ve 10 Ağustos 1930 için [Timeturk](https://www.timeturk.com/kultur/ataturk-agac-icin-kosku-kaydirmis/haber-1677866) kullanıldı; bazı haberler "yaklaşık 5 m" der.
- **Temsilî:** Kriko, makara ve halat düzeneği; dalın biçimi ve çatıya değdiği yer; kaydırmanın adım adım yapılışı. Köşkün gerçekte hangi düzenekle kaydırıldığı doğrulanmadı.

## Model düzeltmeleri
- Bahçe çiti kalın, düz bir levha duvar gibiydi. Dikmeli, kuşaklı, çıtalı ahşap çit yapıldı; kapıda taş babalar var.
- Çınarın dalları kesik kütük gibi taçtan dışarı çıkıyordu. Dallar gövdeden çıkıp taç içinde incelerek bitiyor. Köşke uzanan ayrı bir dal ve ucunda yapraklar var; gövde dibine kök şişkinliği eklendi. Ağaç 1,1 m batıya alındı, çünkü eski konumda gövde köşkün temeline giriyordu.
- Pencereler camsız kahverengi levhalardı. Camlı, beyaz kasalı ve yeşil kepenkli pencereler dört yüze ve iki kata eklendi. Kapı camlı oldu; balkona payandalar ve çıtalı korkuluk eklendi.
- Çiçek tarhları düz renkli kutulardı. Ahşap kenarlı, topraklı ve çiçek öbekli yapıldı.
- Havuzun taş halkası havada duruyordu. Yerden yükselen bir havuz kenarı yapıldı.
- Köşk kaydırılabildiği için çimen, köşkün eski ve yeni yerinin ikisinde de bitmiyor.

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
