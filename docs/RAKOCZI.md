# Rákóczi Müzesi (Tekirdağ) — "Rodosto'daki Sürgün"

Kod: `src/app/games/rakoczi/`
- `site.ts`: konağın zemin katı (salon, Mikes'in odası, merdiven bloğu, vitrinler), avlu bahçesi ve duraklar. Saf veridir, test edilir (`tests/rakoczi.test.ts`).
- `RakocziModels.tsx`: 3B modeller (ahşap konak, iç eşya, bronz büst, avlu, çeşme, ağaçlar, Tekirdağ evleri, Marmara).
- `RakocziGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`). Miras verisindeki kayıt: `rakoczi` (`src/data/heritage/marmara.ts`).

**Önemli sınır:** Oyun yalnızca zemin kat ve bahçeyi gezdirir; bodrum ve üst kat metinle anlatılır. Üst kata çıkılamaz, merdiven yalnızca temsilî.

## Oyun
Oyuncu avlu bahçesinden ahşap konağa yürür; zemin katta büstlü salonu ve Kelemen Mikes'in odasını gezer. 6 ayrıntı:
1. II. Ferenc Rákóczi
2. Ahşap konak
3. Bronz büst
4. Kelemen Mikes
5. Üst katın koleksiyonu
6. Macar–Türk dostluğu

## Kaynaklarda bulunanlar
- **Sürgün:** Rákóczi, 1720–1735 arasında Tekirdağ'da (Rodosto) sürgünde yaşadı; Sultan III. Ahmed'in ona bir ev verdiği aktarılır. [Wikipedia](https://en.wikipedia.org/wiki/R%C3%A1k%C3%B3czi_Museum,_Tekirda%C4%9F), [Macar Ulusal Müzesi](https://mnm.hu/en/node/1809)
- **Bina:** 18. yüzyıl ahşap ev; Osmanlı mimarisinin tipik örneği. [Wikipedia](https://en.wikipedia.org/wiki/R%C3%A1k%C3%B3czi_Museum,_Tekirda%C4%9F)
- **Sergiler:** Zemin katta Rákóczi'nin bronz büstü; bodrumda yaveri Kelemen Mikes'in büstü; çalışma odası; birinci katta annesinin portreleri ve Macaristan'dan gelen porselen ve seramikler. [Wikipedia](https://en.wikipedia.org/wiki/R%C3%A1k%C3%B3czi_Museum,_Tekirda%C4%9F)
- **Müze:** Ev Macar devletine bağışlanarak müzeye dönüştürüldü. [Wikipedia](https://en.wikipedia.org/wiki/R%C3%A1k%C3%B3czi_Museum,_Tekirda%C4%9F), [Daily Sabah](https://www.dailysabah.com/arts-culture/2018/05/19/rakoczi-museum-symbol-of-turkish-hungarian-friendship)
- **Košice:** Slovakya'daki Košice'de bu yapının bir replikası bulunur. [Visit Košice](https://visitkosice.org/en/vidiet-a-zazit/rodosto)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı. Bir arama sonucu (wikiwand) yapay zekâya yönelik gömülü bir yönerge içeriyordu; yok sayıldı ve o sayfadan hiçbir şey kullanılmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Açılış tarihi:** Wikipedia 25 Eylül 1982; Macar müzesinin kendi sitesi 1986 diyor. Oyunda ikisi de belirtildi.
- **Miras verisindeki not:** `didYouKnow` alanı "evin bazı odalarının Kassa'daki orijinal evin birebir kopyası" olduğunu söylüyor. Kaynaklar tersini söylüyor: Košice'deki yapı Tekirdağ'daki evin kopyasıdır, bir kaynağa göre iç bezemelerin bir kısmı da oraya taşınmıştır. Bu not oyuna alınmadı; veri dosyasının düzeltilmesi gerekebilir.
- **Rákóczi'nin kalıntıları (1906):** Bir kaynak "1906'da İstanbul'dan taşındığını" söylüyor; yer ve bağlam net değil, oyuna alınmadı.
- **Çalışma saatleri ve kapalı gün (pazartesi):** Kaynaklar farklı; oyunda yok.

## Temsilî olanlar
- Konağın ölçüleri, oda düzeni, bölme duvarının yeri.
- Büstün biçimi, vitrinlerin ve masanın yeri; kitaplık.
- Üst katın ve bodrumun varlığı yalnızca metinle anlatılır.
- Avlunun düzeni, çeşme ve ağaçlar; çevredeki evler.
