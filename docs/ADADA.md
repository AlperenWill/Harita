# Adada Antik Kenti (Isparta) — "Dağ Eteğindeki Kent"

Kod: `src/app/games/adada/`
- `site.ts`: arazi yüksekliği (kuzeye ve doğuya yükselir, tiyatro çanağında dikleşir), sütunlu cadde, agora, Trajan Tapınağı podyumu, tiyatro, akropol kulesi ve duraklar. Saf veridir, test edilir (`tests/adada.test.ts`).
- `AdadaModels.tsx`: 3B modeller (arazi renkleriyle cadde, agora ve oturma sıraları; stoa sütunları; tapınak; sahne duvarı; kule; çamlar; dağlar).
- `AdadaGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`), az bilinen yer. Miras verisindeki kayıt: `adada` (`src/data/heritage/akdeniz.ts`).

## Oyun
Oyuncu sütunlu caddenin başından yürür, agoraya geçer, Trajan Tapınağı kalıntısının önüne çıkar ve kuzeybatıdaki tiyatro çanağına iner. 5 ayrıntı:
1. Dağ eteğindeki kent
2. Sütunlu cadde
3. Agora
4. Trajan Tapınağı
5. Tiyatro

## Kaynaklarda bulunanlar
- **Konum:** Isparta'nın Sütçüler ilçesinde, Sağrak köyü yakınında (yerel adı Karabavlu), Toros eteğinde bir Pisidia kenti. [Süleyman Demirel Üniversitesi — Adada Ancient City Survey](https://insantoplum.sdu.edu.tr/arkeoloji/en/surveys/adada-ancient-city-survey-14248s.html)
- **Süreklilik:** Kazılar yaklaşık 17 yüzyıllık kesintisiz yerleşim izi gösteriyor. [Hürriyet Daily News](https://www.hurriyetdailynews.com/ancient-city-reveals-traces-of-17-centuries-of-uninterrupted-life-221078)
- **Agora:** Akropolün batısında; Helenistik ve erken Roma İmparatorluk dönemlerinde ticari, idari ve dini merkez. [SDÜ](https://insantoplum.sdu.edu.tr/arkeoloji/en/surveys/adada-ancient-city-survey-14248s.html)
- **Cadde ve stoalar:** Agoranın batısından geçen ana caddenin iki yanında stoalar var. [Küre Ansiklopedisi — Adada Antik Kenti](https://kureansiklopedi.com/tr/detay/adada-antik-kenti-798de)
- **Trajan Tapınağı:** Görülebilen kalıntılar arasında anılıyor. [Lonely Planet](https://www.lonelyplanet.com/turkey/lake-district/attractions/adada/a/poi-sig/1543711/1319708)
- **Kamu yapıları:** Kazı raporlarına göre kentteki kamu yapıları meclis kararlarıyla yapılmış. [Hürriyet Daily News](https://www.hurriyetdailynews.com/ancient-city-reveals-traces-of-17-centuries-of-uninterrupted-life-221078)

Not: Bilgiler arama sonuçlarının özetlerinden alındı; sayfalar açılıp okunmadı.

## Doğrulanmayanlar ve tutarsızlıklar
- **Tiyatro kapasitesi:** Kaynaklar yaklaşık 500 ile yaklaşık 5.000 arası farklı rakamlar veriyor; oyunda rakam yok.
- **Augustus Tapınağı:** Adada için bu tapınağı doğrulayan kaynak bulunamadı (bu ad Pisidia Antiokheiası için geçiyor); oyuna konmadı.
- **Tapınakların adı:** Bir araştırma makalesi kentteki tapınağı "Tanrı İmparatorlar ve Zeus Megistos Serapis Tapınağı" diye adlandırıyor; Trajan adının hangi yapıya ait olduğu kaynaklarda net değil. Oyunda "Trajan Tapınağı" kullanıldı ve konumu temsilî.
- **Kuruluş tarihi:** Bir kaynak MÖ 3. yüzyıl diyor; oyunda tarih verilmedi.

## Temsilî olanlar
- Yerleşim: caddenin, agoranın, tapınağın, tiyatronun ve kulenin birbirine göre konumu.
- Sütun sayısı, yükseklikleri, hangilerinin kırık olduğu.
- Tapınağın planı; tiyatronun oturma sıralarının sayısı ve biçimi.
- Akropol kulesi ve kuleye çıkan rampa.
- Arazinin eğimi.
