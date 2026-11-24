# Cacabey Medresesi — "Göğe Açılan Kubbe"

Kod: `src/app/games/cacabey/`
- `site.ts`: meydan, medresenin bölümleri, kuyu, minare ve duraklar. Saf veridir, test edilir (`tests/cacabey.test.ts`).
- `CacabeyModels.tsx`: 3B modeller.
- `CacabeyGame.tsx`: oyun yöneticisi. Öteki yeni oyunlarla aynı ortak arayüzü kullanır.

Kapsam: kısa oyun (`depth: 'kisa'`).

## Oyun
Oyuncu meydanda dolaşır ve taçkapıdan girer. Giriş holünden kubbeli orta avluya, kuyunun çevresine ve eyvana yürür. 7 ayrıntı:
1. taçkapı ve yazıt
2. iki dilli vakfiye
3. aydınlık feneri
4. kuyu ve havuz
5. eyvan ve odalar
6. köşedeki kule
7. cephanelikten camiye

## Kuyudan gözle (mekanik)
Kuyunun doğu kenarında **E** ile gözlem paneli açılır: kubbedeki aydınlık fenerinden görünen gece göğü suya yansır. Yıldız açıklığın tam ortasındaki halkadan geçerken **İşaretle**'ye basılır; üç yıldız işaretlenince kart açılır. Erken ya da geç basınca ipucu çıkar. Hedef toplam 8: 7 ayrıntı ve gözlem.
- **Kaynak:** Kubbe açıklığından görünen gökyüzünün kuyuya yansıdığı ve gözlemlerin vakit belirleme, takvim ve kıble tayini için kullanıldığı [İstiklal](https://www.istiklal.com.tr/islam/ilk-astronomi-mektebi-kirsehir-cacabey-medresesinin-sirri-1090605h) haberinde aktarılıyor; bu bir aktarımdır.
- **Temsilî:** Yıldızların hızı ve yolu, gözlemin bu biçimde yapılışı. Bir yıldızın açıklığın ortasından geçmesinin başucuna en yakın an olduğu genel bir gökbilim bilgisidir; bu medresede böyle kullanıldığı doğrulanmadı.
- **Test:** `tests/cacabey.test.ts`, üç yıldızın her birinin halkada yakalanabilecek kadar kaldığını doğrular.

## Model düzeltmeleri
- Eyvanın beşik tonozu ters çiziliyordu: yarım silindirin alt yarısı seçilmişti, tonoz hamak gibi aşağı sarkıyordu ve üstünden gökyüzü görünüyordu. Üst yarısı seçildi. Dışa taş kabuk, avlu tarafına kemer silmesi, kuzey ucuna yarım daire alınlık eklendi.

## Kaynaklarda bulunanlar
- **Yapım:** Taçkapı yazıtına göre hicrî 671 (1272–73) yılında, III. Keyhüsrev döneminde Kırşehir valisi Nûreddin Cebrâil bin Caca yaptırdı. Bazı kaynaklar 1271–72 diyor. [TDV İslâm Ansiklopedisi](https://islamansiklopedisi.org.tr/caca-bey-medresesi)
- **Vakfiye:** 10 Mayıs 1272 tarihli; Arapça ve Moğolca yazılmış. [TDV İslâm Ansiklopedisi](https://islamansiklopedisi.org.tr/caca-bey-medresesi)
- **Gözlem:** Kubbedeki aydınlık fenerinden giren ışık ve gökyüzü görüntüsü avludaki kuyuya düşüyordu. Gözlemlerin vakit belirleme, takvim hesapları ve kıble tayini için kullanıldığı aktarılıyor. [İstiklal](https://www.istiklal.com.tr/islam/ilk-astronomi-mektebi-kirsehir-cacabey-medresesinin-sirri-1090605h), [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/cacabey-ve-gokbilim-medresesi-2581b)
- **Kule:** Kuzeybatı köşesinde silindirik bir kule var. Kaynaklar minare mi, gözlem kulesi mi olduğunda ayrılıyor.
- **Sonraki kullanım:** 19. yüzyılda bir gezgin cephanelik olarak kullanıldığını yazmış. Sonra kısmen camiye dönüştürüldü; bugün cami ve ziyarete açık. [Wikipedia](https://en.wikipedia.org/wiki/Cacabey_Madrasa)
- **Dikkat:** "Dünyanın ilk astronomi okulu" nitelemesi tanıtım dilidir, akademik olarak kanıtlanmış değildir. Oyunda bu böyle belirtildi.

Not: Sayfalar çalışma ortamından açılamadı; bilgiler arama sonuçlarındaki özetlerden alındı.

## Temsilî olanlar
- Ölçüler ve iç düzen: hol, avlu, eyvan, oda sayısı.
- Kubbenin kasnağı ve geçiş öğeleri.
- Taçkapının biçimi, mukarnas kavsara ve geometrik bezeme kuşakları.
- Kuyunun biçimi ve ışık huzmesi.
- Minarenin bezemesi. Turkuaz kuşaklar temsilî; kaynakta doğrulanmadı.
- Meydan, ağaçlar ve çevredeki evler.
