# Kilis — Oylum Höyük: "Katman Katman" (kısa oyun)

Rota: `oyun/oylum` · Kod: `src/app/games/oylum/` · Test: `tests/oylum.test.ts` · Derinlik: kısa.

## Oyun
- **Sahne:** Oyuncu ovadan höyüğe yürür. Güney yamaçta basamaklı bir açma var: üç düzlük, aralarında kesit yüzleri ve rampalar.
- **Kazı:** Üç kesitte E ile kazılır. Kazı yukarıdan aşağı ilerler; üstteki kesit kazılmadan alttakine geçilmez. Bu, üst üste binme ilkesidir: alttaki katman daha eskidir.
- **Buluntular:** Her kesitten bir buluntu çıkar ve kartı açılır: tablet parçası, çömlek ve kap.
- **Kesit panosu:** Sonunda panoda her katmana bir dönem yerleştirilir.
- **Hedef:** 3 ayrıntı, 3 buluntu ve kesit.

## Kaynaklarda bulunanlar
Bilgiler arama sonuçlarındaki özetlerden alındı.
- **Konum ve boyut:** Kilis'in yaklaşık 7 km kuzeydoğusunda; 460 × 320 m, yüksekliği 37 m'ye varıyor. [Daily Sabah](https://www.dailysabah.com/arts/excavation-resumes-in-oylum-hoyuk-on-syrian-border/news)
- **Kazı:** 1987 ya da 1988'de başladı. Bugün Atilla Engin başkanlığında, Kültür ve Turizm Bakanlığı izniyle, Gaziantep Üniversitesi ve Kilis Valiliği iş birliğiyle sürüyor. [Anatolian Archaeology](https://anatolianarchaeology.net/excavations-started-at-oylum-hoyuk-one-of-the-largest-mounds-in-the-middle-east)
- **Hedef ve yazılı buluntular:** 2025 kazısının hedefi Hitit İmparatorluk dönemi katmanı. Höyükten MÖ 2. binyılın ikinci yarısına ait birkaç yazılı buluntu çıktı. [Daily Sabah](https://www.dailysabah.com/arts/excavation-resumes-in-oylum-hoyuk-on-syrian-border/news)
- **Kent adı önerisi:** Engin'e göre höyük MÖ 3000'lerde Ulisim, MÖ 2000'lerde Hitit ve Mısır belgelerindeki Kuilzila ya da Ukulzat olabilir. Bunlar önerdir; kartlarda da öyle yazıyor. [Anatolian Archaeology](https://anatolianarchaeology.net/excavations-started-at-oylum-hoyuk-one-of-the-largest-mounds-in-the-middle-east)

## Temsilî olanlar
- **Açma:** Yeri, ölçüsü ve basamak yükseklikleri.
- **Katmanlar:** Üç katman ve dönemleri yalınlaştırıldı. Gerçek höyükte katman sayısı çok daha fazladır.
- **Buluntular:** Biçimleri (tablet, boyalı çömlek, kulplu kap) ve hangi kesitten çıktıkları.
- **Çevre:** Kazı çadırı ve zeytin ağaçları.

## Harita verisi notu
`src/data/heritage/guneydogu.ts` içindeki özet şunları söylüyor; ikisi de bu oturumda doğrulanmadı, değiştirilmedi:
- "Tunç Çağı'nda kuzey Suriye ile Anadolu arasında bir köprü"
- "mühürler uzak ticaret ağlarını gösterir"
