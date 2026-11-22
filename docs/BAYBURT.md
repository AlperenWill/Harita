# Bayburt Kalesi — "Burç Burç Bayburt Kalesi"

Kod: `src/app/games/bayburt/`
- `kale.ts`: tepe, yol, surlar, burçlar, şehir ve duraklar. Saf veridir, test edilir (`tests/bayburt.test.ts`).
- `BayburtModels.tsx`: 3B modeller.
- `BayburtGame.tsx`: oyun yöneticisi. Cumalıkızık ile aynı ortak arayüzü (`shared/hud/Hud.tsx`) ve yürüyüş düzenini kullanır.

## Oyun
Oyuncu şehirden kıvrılan yoldan kale kapısına tırmanır, surların içinde serbestçe dolaşır ve 7 ayrıntıyı bulur:
1. kale kapısı
2. burçlar
3. Selçuklu tahkimatı (kitabe)
4. Çoruh'a bakış
5. kazı alanı
6. İpek Yolu
7. "Çinimaçin" adı

Kart kendiliğinden açılmaz; durağa yaklaşınca E ile açılır. Kroki M tuşuyla açılır.

## Kaynaklarda bulunanlar
- **Yapım ve onarımlar:**
  - Kalenin ilk kez ne zaman ve kim tarafından yapıldığı bilinmiyor.
  - Prokopios'a göre Iustinianus döneminde tahkim edildi.
  - Bayburt bir süre Saltukluların yönetiminde kaldı; Selçuklular 1202'de Saltuklulara son verdi.
  - Surlardaki yazıtlara göre Mugisüddin Tuğrul Şah 1200–1230 arasında kaleyi tahkim ettirdi. Kaynaklar onarımın tarih ve yaptıran ayrıntısında ayrılıyor.
  - Kapıdaki yazıta göre kale 1550'de onarıldı.

  [TDV İslâm Ansiklopedisi](https://islamansiklopedisi.org.tr/bayburt-kalesi), [Wikipedia](https://en.wikipedia.org/wiki/Bayburt_Castle)
- **Burçlar:** yarım yuvarlak, dörtgen ve üçgen burçlar; destek duvarları. [Wikipedia](https://en.wikipedia.org/wiki/Bayburt_Castle)
- **Konum:** Çoruh'un yukarı havzasında, şehrin kuzeyindeki sarp kayalık bir tepe. Gezi kaynakları nehrin tepeyi üç yandan çevirdiğini söylüyor. [Hürriyet Daily News](https://www.hurriyetdailynews.com/bayburt-castle-a-key-point-on-historic-silk-road-224979)
- **Kazılar:** MÖ 3000'lere uzanan seramikler ve 1828 Osmanlı-Rus Savaşı'na ait yangın izleri bulundu. Ruslar 1828'de kaleyi tahrip etti. [Halk TV](https://halktv.com.tr/turkiye/turkiyenin-en-buyuk-3-kalesindeki-kazilar-ortaya-cikardi-tarihi-5-bin-yil-geriye-gidiyor-1045264h), [Daily Sabah](https://dailysabah.com/history/2019/01/04/bayburt-castle-to-regain-old-glory-after-restoration)
- **"Çinimaçin Kalesi" adı:** çinilerinden geldiği aktarılıyor. [Wikipedia](https://en.wikipedia.org/wiki/Bayburt_Castle)

Not: Sayfalar çalışma ortamından açılamadı; bilgiler arama sonuçlarındaki özetlerden alındı.

## Doğrulanmamış (oyunda "aktarılır" ya da "anlatılır" diye yazıldı)
- 3 km sur, 30 m yükseklik ve 150 bin m² alan. Bunlar yalnızca basında geçiyor.
- Marco Polo'nun Bayburt'tan geçtiği. Bu bilgi projedeki miras verisinde var; burada ayrıca doğrulanmadı.

## Temsilî olanlar
- Tepenin biçimi, sur çizgisi, burç sayısı ve yerleri, kapının biçimi ve yeri, nehrin yatağı, şehir dokusu.
- Kitabe ve kapı yazıtı levhalarındaki yazı. Gerçek metin değil, süs çizgileri.
- Kazı alanının yeri ve düzeni. Yıkık yapı temelleri.
