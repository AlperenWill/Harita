# Odunpazarı Evleri (Eskişehir) — "Cumbalı Sokak"

Kod: `src/app/games/odunpazari/`
- `site.ts`: dar sokak, meydan, konaklar (kat sayısı, renk, cumba yönü) ve duraklar. Saf veridir, test edilir (`tests/odunpazari.test.ts`).
- `OdunpazariModels.tsx`: 3B modeller (taş zemin katlar, renkli sıvalı üst katlar, ahşap cumbalar, kiremit çatılar, sokak, çınarlar).
- `OdunpazariGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: detaylı (`depth: 'detayli'`). Miras verisindeki kayıt: `odunpazari` (`src/data/heritage/icanadolu.ts`).

## Oyun
Oyuncu yokuşun başından dar sokağa girer, cumbalı konakların arasından meydana yürür. 5 ayrıntı:
1. Dar sokak
2. Cumba
3. Ahşap ve kerpiç
4. Restorasyon
5. Geçici liste

## Kaynaklarda bulunanlar
- **Yapı ve biçim:** Konaklar 19. yüzyıl Osmanlı sivil mimarisinin örneği; cumbalı, çıkmalı, ahşap süslemeli, genellikle iki–üç katlı. [Küre Ansiklopedisi — Odunpazarı Evleri](https://kureansiklopedi.com/tr/detay/odunpazari-evleri-88d0a)
- **Cumba:** Üst kat çıkmasının sahibin toplumsal durumuna işaret ettiği aktarılıyor. [Küre Ansiklopedisi — Odunpazarı Evleri](https://kureansiklopedi.com/tr/detay/odunpazari-evleri-88d0a)
- **Sokaklar:** Evliya Çelebi'nin Seyahatnâme'de övdüğü sokakların birçoğu özgün adlarını koruyor. [Küre Ansiklopedisi — Odunpazari Houses](https://kureansiklopedi.com/en/detay/odunpazari-houses-44305)
- **Geçici liste:** "Odunpazari Historical Urban Site" (ID 5733), 2012'de UNESCO Geçici Listesi'nde. [UNESCO Geçici Liste 5733](https://whc.unesco.org/en/tentativelists/5733)
- **Restorasyon:** Konakların önemli bölümü restore edildi; bir kaydında 2002 restorasyonu anılıyor. [Archnet — Odunpazari Houses Restoration](https://archnet.org/sites/5151)
- **Kullanım:** Bazı konaklar bugün ev müzesi, kafe ya da atölye. [Küre Ansiklopedisi — Odunpazarı Evleri](https://kureansiklopedi.com/tr/detay/odunpazari-evleri-88d0a)

Not: Bilgiler arama sonuçlarındaki özetlerden alındı; sayfalar açılıp okunmadı. Ahşap hatıllı kerpiç yapım bilgisi bir turizm blogunda geçiyor; Odunpazarı Belediyesi sayfası bu ayrıntıyı doğrulamadı, bu yüzden "kaynaklarda farklı anlatılır" diye yazıldı. Bir KURE çocuk sayfası yapay zekâyla üretildiği belirtildiği için kaynak olarak kullanılmadı.

## Temsilî olanlar
- Konak sayısı, boyutları ve renkleri; sokağın eğimi ve uzunluğu.
- Cumbaların ve pencerelerin biçimi; çatı eğimleri.
- Meydan ve çınarlar.
- Taş zemin katlardaki doku ve kapılar.

## Bilinen görsel sorunlar
- Sokağın bitiminde arazi şeridi kenarında beyaz bir ufuk şeridi görünüyor (arazi düzleminin sonu). Sonraki turda arazi kenarı genişletilecek.
- Zemin düzlemi, sokak yüzeyiyle aynı yükseklikte olunca z-çakışması yapıyordu; zemin 15 cm aşağı alınarak giderildi.
