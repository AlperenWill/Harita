# Mardin — Zinciriye Medresesi ve taş evler: "Damdan Dama"

Rota: `oyun/mardin` · Kod: `src/app/games/mardin/` · Test: `tests/mardin.test.ts` · Derinlik: detaylı.

## Oyun
- **Mekanik:** Oyuncu yamacın dibindeki sokaktan başlar. Kent altı kademe hâlinde yükselir. Her kademe alttaki evlerin damı ve bir üstteki evin terasıdır. Kaynaktaki "her evin çatısı bir üstteki evin terası" bilgisine dayanır.
- **Tırmanış:** Kademeleri taş merdivenler bağlar; birinin üstünde tonozlu bir geçit (abbara) var. Bazı yerlerde üst evin damı alttaki sokağın önüne taşar. Bu yüzden her kademeye her yerden çıkılamaz; merdiveni bulmak gerekir.
- **Dam sayacı:** Her yeni kademeye ilk kez çıkıldığında dam sayılır (5 dam).
- **Pus:** Yükseldikçe pus açılır, ufuk uzar. Pus uzaklığı `hazeFar` ile yere yakınken yaklaşık 420 m, damda yaklaşık 5.800 m.
- **Zinciriye:** Avlusu 3. kademededir; doğudaki taç kapıdan ve yıldız tonozlu holden girilir. Damı en üst sokakla aynı hizadadır. Damda iki dilimli kubbe var, güneyde ova görünür.
- **Ayrıntılar:** 8 ayrıntı E ile incelenir.

## Kaynaklarda bulunanlar
Bilgiler arama sonuçlarındaki özetlerden alındı.
- **Yapım:** Artuklu Melik Necmeddin İsa 1385'te yaptırdı; Sultan İsa Medresesi diye de anılır. [Wikipedia — Sultan Isa Medrese](https://en.wikipedia.org/wiki/Sultan_Isa_Medrese)
- **Plan:** Doğu cephesinde anıtsal taç kapı, arkasında yıldız tonozlu hol, oradan avlu. Doğu ve batı uçlarında dilimli kubbeler var. [Küre Ansiklopedisi](https://kureansiklopedi.com/tr/detay/zinciriye-medresesi-296e3) · [Wikipedia](https://en.wikipedia.org/wiki/Sultan_Isa_Medrese)
- **Mescit ve türbe:** Avlunun batısında süslü kubbeli küçük mescit, kakma işli mihrap ve taş minber, Sultan İsa'nın türbesi var. Timur'a karşı savaşan Melik İsa'nın bir süre burada tutsak kaldığı anlatılır. [Wikipedia](https://en.wikipedia.org/wiki/Sultan_Isa_Medrese)
- **Manzara:** Damından Mezopotamya ovası görülür. [Mardin Life](https://www.mardinlife.com/mardin/the-perfect-view-of-mesopotamia-starts-at-zinciriye-madrasa)
- **Taş evler:** Evler kademeli dizilir; her evin çatısı bir üstteki evin terası işlevi görür. [Küre — Mardin Taş Evleri](https://kureansiklopedi.com/tr/detay/mardin-tas-evleri-55be6)
- **Yamaç ve eyvan:** Evler kalenin eteğinden ovaya doğru teras teras yerleşir; her evde eyvan ve teras bulunur. [Hürriyet](https://www.hurriyet.com.tr/seyahat/mimari-harikasi-mardin-evleri-41689947)
- **Abbara:** Mardin'deki tonozlu geçitlere abbara denir. [CNN Türk](https://www.cnnturk.com/seyahat/antik-kent-mardinin-gizemli-yapilari-abbaralar)

## Belirsiz olanlar
- **Kat sayısı:** Medresenin kaç katlı olduğu kaynaklarda çelişkili (iki kat ya da tek kat). Oyunda avlu bir kademede, dam iki kademe yukarıda.
- **Revak ayrıntısı:** Revaklardaki dilimli kemer anlatımı Diyarbakır'daki aynı adlı medreseye ait olabilir; oyunda kullanılmadı.
- **Adın kökeni:** "Zinciriye" adının nereden geldiği doğrulanmadı; oyunda geçmiyor.

## Temsilî olanlar
- **Kent dokusu:** Kademe sayısı ve yüksekliği (3,6 m), evlerin düzeni, merdivenlerin ve abbaranın yeri, kale ve minare.
- **Medrese:** İç düzen, revak sayısı ve kubbelerin ölçüsü. Taç kapının oyma deseni ve yıldız tonoz deseni çizimdir; gerçek motif değil.
- **Ova:** Ovadaki tarlalar ve uzaklıklar.

## Model notları
- **Başlangıç:** İlk hâlinde oyuncu bir cephenin 2 m önünde başlıyordu; merdivenleri gören bir yere alındı.
- **Taç kapı:** Nişin üstü düz siyah bir boşluk gibi görünüyordu. Yıldız tonoz desenli bir yüzle değiştirildi; havada duran mukarnas blokları kaldırıldı.
- **Ova:** Soluk rengi ve yakın pusu yüzünden seçilmiyordu. Tarla renkleri koyulaştırıldı, pus uzaklığı artırıldı.
