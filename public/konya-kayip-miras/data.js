/* Konya's sourced content; investigation narrative and facsimiles are fictional. */
window.KONYA = (() => {
  const sources = [
    {id:'mev',name:'Kültür Portalı — Mevlâna Müzesi',url:'https://www.kulturportali.gov.tr/turkiye/konya/gezilecekyer/mevlna-muzesi'},
    {id:'sema',name:'UNESCO — Mevlevi Sema Töreni',url:'https://ich.unesco.org/en/RL/mevlevi-sema-ceremony-00100'},
    {id:'cat',name:'UNESCO — Çatalhöyük Neolitik Alanı',url:'https://whc.unesco.org/en/list/1405/'},
    {id:'home',name:'Kültür Portalı — Çatalhöyük Neolitik Kenti',url:'https://www.kulturportali.gov.tr/portal/catalhoyukneolitikkenti'},
    {id:'kar',name:'Kültür Portalı — Karatay Medresesi',url:'https://kulturportali.gov.tr/turkiye/konya/gezilecekyer/karatay-medresesi-cini-eserler-muzesi'},
    {id:'museum',name:'Türkiye Müzeleri — Karatay Müzesi',url:'https://muze.gov.tr/muze-detay?DistId=MRK&SectionId=KRT02'}
  ];
  const mission = (id,name,x,z,intro,fact,src,clues,activity,quiz,answer) => ({
    id,x,z,intro,source:sources.find(s=>s.id===src).url,sourceId:src,
    tr:[name,fact,quiz[0],quiz[1]],answer,activity,
    puzzle:[activity.prompt,activity.prompt,activity.options||[],activity.options||[],activity.answer||0],
    clues:clues.map((c,i)=>({id:id+'-'+i,parent:id,kind:'clue',x:c[0],z:c[1],tr:[c[2]],description:c[3],purpose:c[4]}))
  });
  const chapters=[
    {name:'Mevlâna Müzesi',era:'13. yüzyıldan günümüze',title:['Sesini koruyan miras'],story:['Deniz: Araştırma arşivindeki üç dosyanın açıklamaları birbirine karışmış. İlk dosyada “miras yalnızca taş değildir” yazıyor. Yeşil Kubbe’yi, avluyu ve Mevlevi kültürünü inceleyip bu cümlenin ne anlattığını bulalım. Kayıp olan eserler değil, onların birbirleriyle kurduğu bağ.'],resolution:'İlk anahtar: AKTARIM. Yapılar korunurken müzik, bilgi ve gelenek de insanlarla yaşar.',sites:[
      mission('kubbe','Yeşil Kubbe’nin izi',5,9,'İlk dosyadaki çizimde sivri, dilimli bir örtü var. Deniz, çizimi gerçek yapının görünümüyle karşılaştırmanı istiyor.','Mevlâna’nın 1273’teki vefatından sonra türbesi 1274’te yaptırıldı. Kubbe-i Hadra adı Yeşil Kubbe’yi ifade eder. Bugünkü külliye farklı dönemlerin eklerini taşır.','mev',[
        [7,2,'Turkuaz dilimli örtü','Türbe üzerindeki uzun, dilimli ve turkuaz kaplı örtüyü gözlemle. Burada gördüğün model, bu ayırt edici biçimin eğitim amaçlı yorumudur.','Arşiv çizimini doğru yapı ile eşleştirmek.'],
        [19,2,'Türbenin yapı katmanları','Türbenin çevresindeki daha alçak kubbeli yapılar, bütünün tek bir kubbeden oluşmadığını gösterir. Külliyenin tüm bölümleri aynı tarihte yapılmamıştır.','Tek bir tarihi bütün külliyeye uygulamamak.']],
        {type:'choice',prompt:'Çizimdeki uzun, dilimli turkuaz örtü hangi yapıyı işaret ediyor?',options:['Karatay’ın mermer taçkapısını','Mevlâna Türbesi’nin Yeşil Kubbesi’ni','Çatalhöyük’ün düz damını'],answer:1},
        ['Kubbe-i Hadra hangi tanınan yapıdır?',['Yeşil Kubbe','Kerpiç ev','Roma tiyatrosu']],0),
      mission('avlu','Avlunun hafızası',-8,6,'İkinci notta iki mekânın adı silinmiş. Deniz: “Avludaki su yapısı ile derviş hücrelerinin işlevini ayırırsak kayıt okunabilir.”','Avlunun kuzey ve batı yönlerinde derviş hücreleri bulunur. Avludaki üstü örtülü şadırvan 1512’de Yavuz Sultan Selim tarafından yaptırılmıştır.','mev',[
        [-17,-2,'Derviş hücreleri','Avlu kenarındaki küçük, tekrarlanan mekânları gözlemle. Bunlar derviş hücrelerini temsil eder.','Yaşam mekânını su yapısından ayırmak.'],
        [-7,-9,'Örtülü şadırvan','Ortadaki sütunların taşıdığı örtüyü ve su haznesini incele. Şadırvan, avludaki su yapısıdır.','Avlu kaydındaki eksik işlevleri tamamlamak.']],
        {type:'match',prompt:'Gözlem kartlarını uygun işlevlerle eşleştir.',pairs:[['Derviş hücreleri','Dervişlerin yaşam mekânları'],['Şadırvan','Avludaki su yapısı']]},
        ['Avludaki şadırvan hangi tarihle ilişkilidir?',['MÖ 7400','1251','1512']],2),
      mission('sema','Taşın ötesindeki miras',4,-11,'Deniz: “Dosyanın bu sayfasında bir ney çizimi var. Bir çalgı, bir yapının anlatamadığı hangi mirası anlatır?” Bilgi vitrinlerini incele.','Mevlevi sema töreni müzik ve belirli kuralları olan bir tasavvuf törenidir. Ney ve kudüm eşlik eden çalgılardandır. Gelenek 2008’de UNESCO Temsili Listesi’ne alındı.','sema',[
        [4,-17,'Ney ve kudüm temsilleri','Ney üflemeli, kudüm vurmalı bir çalgıdır. Vitrindeki modeller görev için üretilmiş temsillerdir; gerçek müze eserlerinin kopyası değildir.','Müzik ile kültürel aktarımın bağını kurmak.'],
        [-1,-17,'Yaşayan gelenek kartı','Sema yalnızca bir gösteri olarak açıklanamaz; dinî ve kültürel bağlamı vardır. Bu oyun töreni canlandırmaz.','Somut olmayan mirasın neden korunacağını anlamak.']],
        {type:'choice',prompt:'Bu iki gözlem arşivdeki hangi başlığı tamamlar?',options:['Yalnızca bina ölçüleri','Yalnızca tarımsal depolama','Yaşayan kültürün kuşaklara aktarımı'],answer:2},
        ['Sema törenini en doğru anlatan ifade hangisidir?',['Yalnızca eğlence gösterisidir','Müzik ve kuralları olan tasavvuf törenidir','Bir mimari yapı türüdür']],1),
      mission('zaman','İlk dosyanın zaman çizgisi',-8,-23,'Deniz: “Aynı avluda farklı yüzyılların izi var. Tarih kartlarını sırala; böylece yanlışlıkla tek döneme yazılmış dosyayı düzelteceğiz.”','Türbe 1274’te yaptırıldı; avludaki şadırvan 1512’ye aittir. Dergâh 1926’da müze olarak açıldı, 1954’te Mevlâna Müzesi adını aldı.','mev',[
        [-14,-24,'Türbe ve şadırvan tarih kartı','Türbe: 1274. Şadırvan: 1512. Aynı toplulukta yer almaları aynı zamanda yapıldıkları anlamına gelmez.','Yapım evrelerini sıralamak.'],
        [-2,-24,'Müzeye dönüşüm kartı','Müze olarak açılış: 1926. Mevlâna Müzesi adının kullanılması: 1954. Kart çağdaş bir araştırma aracıdır.','Yapım tarihi ile müze tarihini ayırmak.']],
        {type:'order',prompt:'Kartlara en eskiden en yeniye dokun.',items:['Müze olarak açılış — 1926','Şadırvan — 1512','Türbe — 1274'],correct:[2,1,0]},
        ['Doğru kronoloji hangisidir?',['Türbe → şadırvan → müze','Müze → türbe → şadırvan','Şadırvan → müze → türbe']],0)
    ]},
    {name:'Çatalhöyük',era:'Neolitik • MÖ 7400–6200',title:['Birlikte yaşamın izleri'],story:['Deniz: İkinci dosya bizi çok daha eskiye götürüyor. Burada Selçuklu yapıları yok. Neolitik yerleşimin eğitim amaçlı canlandırmasında, damlardan evlere uzanan hayatı araştıracağız. “Birlikte yaşamak” sözü bu dosyanın anahtarı olabilir.'],resolution:'İkinci anahtar: YAŞAM. Ev düzeni ve gündelik izler, yerleşik toplulukların yaşamını anlamaya yardım eder.',sites:[
      mission('dam','Sokak yerine damlar',0,13,'Deniz: “Kayıttaki çizimi biri ortaçağ şehri sanmış. Bitişik evlere ve dam girişine bakarak bu hatayı düzelt.”','Çatalhöyük’te evler bitişik kümeler oluşturur; giriş damdan sağlanır. Doğu Höyük’teki Neolitik yerleşim MÖ 7400–6200 arasına tarihlenir.','cat',[
        [-5,9,'Bitişik evlerin düzeni','Birbirine yaslanan kerpiç evlerin arasında düzenli sokaklar yok. Hareketin önemli bir bölümü dam düzeyinde gerçekleşiyordu.','Yerleşimi Ortaçağ kentinden ayırmak.'],
        [0,-1,'Dam açıklığı ve merdiven','Ev girişi damdaki açıklıktan sağlanır. Yakındaki “Eve in” istasyonuyla temsili iç mekâna da bakabilirsin.','Ev girişini doğru yerde tanımlamak.']],
        {type:'choice',prompt:'Bu yerleşimin ayırt edici erişim biçimi hangisi?',options:['Sütunlu Roma caddeleri','Bitişik evler ve damdan giriş','Surlu kalenin kapısı'],answer:1},
        ['Doğu Höyük’teki bu yaşam hangi döneme aittir?',['Osmanlı','Roma','Neolitik']],2),
      mission('ev','Bir evin gündelik hayatı',10,-5,'Deniz: “Bir evdeki küçük ayrıntılar büyük anıtlardan daha çok şey söyleyebilir. Ocak ve depolama alanını kaydın doğru satırına yerleştir.”','Kerpiç evlerde ocaklar ve depolama bölmeleri bulunur. Ahşap ve kamış da yapı malzemeleri arasındadır. Bu düzen gündelik faaliyetleri araştırmaya yardım eder.','home',[
        [10,1,'Ocak gözlem penceresi','Kesit evin içindeki ocak ve pişirme alanını dam kenarından gözlemle. Günlük yaşamın bir bölümü yiyecek hazırlamaya ayrılmıştır.','Ocak ile pişirme işlevini ilişkilendirmek.'],
        [14,-9,'Depolama bölmeleri','Kesit evdeki küçük bölmeler ve kaplar depolamayı anlatır. Nesneler kesin bir kazı buluntusunun kopyası değil, eğitim temsilleridir.','Depolama ile ev içi düzeni ilişkilendirmek.']],
        {type:'match',prompt:'Gündelik yaşam izlerini işlevleriyle eşleştir.',pairs:[['Ocak','Pişirme ve ısı'],['Depolama bölmesi','Ürün ve malzeme saklama']]},
        ['Hangi malzemeler bu evlerle uyumludur?',['Mermer ve betonarme','Kerpiç, ahşap ve kamış','Çelik ve cam cephe']],1),
      mission('yorum','Kanıt mı, yorum mu?',-10,-14,'Deniz: “Son not, bütün duvar resimlerinin anlamının çözüldüğünü iddia ediyor. Bir araştırmacı bunu kanıtsız yazabilir mi?”','Çatalhöyük’te duvar resimleri ve kabartmalar bulunmuştur. Varlıkları arkeolojik kanıttır; simgelerin anlamları ise araştırma ve yorum konusudur. Alan 2012’de UNESCO Dünya Mirası Listesi’ne alındı.','cat',[
        [-13,-8,'Duvar resmi temsili','Kesit evin duvarındaki kırmızı geometrik bezeme, buluntulardan esinlenen bir tasarımdır; belirli bir özgün resmin birebir kopyası değildir.','Buluntu ile oyun tasarımını ayırmak.'],
        [-13,-20,'Kazı katmanları panosu','Doğu Höyük’te on sekiz Neolitik yerleşim katmanı belirlenmiştir. Birikmiş yapım evreleri uzun süreli yaşamı gösterir.','Kanıtın neyi söylediğini ve söylemediğini değerlendirmek.']],
        {type:'choice',prompt:'Araştırma raporuna hangi cümleyi yazmalıyız?',options:['Her resmin anlamı kesin olarak bilinir','Bütün evler aynı gün yapılmıştır','Resimler bulundu; anlamları yorum gerektirir'],answer:2},
        ['Hangisi kanıt ile yorumu doğru ayırır?',['Resmin varlığı kanıt, anlamı araştırma konusudur','Her varsayım kesin bilgidir','Oyundaki her nesne gerçek kazı buluntusudur']],0)
    ]},
    {name:'Karatay Medresesi',era:'Anadolu Selçuklu • 1251',title:['Bilginin ve ustalığın izi'],story:['Deniz: Son dosyada bir taçkapı çizimi ve çini renkleri kalmış. Karatay’da taşın, çininin ve eğitimin nasıl bir araya geldiğini araştır. Sonra üç dosyanın ortak anlamını kendi gözlemlerinle tamamlayacağız.'],resolution:'Üçüncü anahtar: BİLGİ. Mimari ve zanaat, öğrenmeyle birlikte kuşaklar arasında aktarılır. Kayıp Miras bir hazine değil; doğru bağlamları silinmiş bir arşivdi. Üç dosyayı yeniden anlamlı hâle getirdin.',sites:[
      mission('tackapi','Taçkapıdaki kimlik',0,14,'Deniz: “Dosyadaki 1251 tarihi bu kapıyla ilgili. Mermer işçiliğini ve araştırma levhasını inceleyerek yapı kimliğini doğrula.”','Karatay Medresesi 1251’de Emir Celâleddin Karatay tarafından yaptırıldı. Doğudaki giriş gök ve beyaz mermerdendir. Portalda yazı ve bezemeler bulunur.','kar',[
        [-4,9,'Mermer taçkapı bezemeleri','Kapının derin çerçevelerini, geometrik taş bezemesini ve iki renkli mermer düzenini gözlemle. Modelde özgün kitabe metni taklit edilmez.','Yapının ayırt edici girişini tanımak.'],
        [4,9,'1251 tarih levhası','Araştırma levhası yapımı 1251’e, yaptıranı Emir Celâleddin Karatay’a bağlar. Bu levha modern görev aracıdır; tarihî kitabe değildir.','Tarih ile yapı kimliğini eşleştirmek.']],
        {type:'choice',prompt:'Bu giriş için doğru kimlik kartını seç.',options:['Neolitik kerpiç ev — MÖ 7400','Karatay Medresesi — 1251','Mevlâna Türbesi — 1274'],answer:1},
        ['Karatay Medresesi’ni kim yaptırdı?',['Emir Celâleddin Karatay','Marcus Aurelius','Yavuz Sultan Selim']],0),
      mission('cini','Çininin geometrisi',-6,-6,'Deniz: “Ustanın çizimi kayıp, fakat renkler ve tekrar eden biçimler ortada. Gözlemini kullanarak çini kaydını tamamla.”','İç mekânda mozaik ve plaka çiniler bulunur. Mozaik bezemelerde turkuaz, lacivert ve siyah kullanılmıştır. Çini işçiliği yapının belirgin özelliklerindendir.','kar',[
        [-10,-10,'Turkuaz ve lacivert çiniler','Duvarın yıldızlı geometrik düzenine ve turkuaz, lacivert, siyah renklerine bak. Oyundaki desen tarihî işçilikten esinlenen yeni bir desendir.','Renk ve geometriyi birlikte gözlemlemek.'],
        [-7,-17,'Mozaik çini örneği','Küçük renkli parçalar daha büyük bir düzen oluşturur. Buradaki eğitim panosu parçadan bütüne kurulan bezemeyi gösterir.','Malzeme ile yapım tekniği arasındaki bağı kurmak.']],
        {type:'pattern',prompt:'Gözlemlediğin çini paletini seç.',options:['Turkuaz • lacivert • siyah','Kırmızı • pembe • beyaz','Sarı • turuncu • yeşil'],colors:[['#22a9ac','#173355','#171d25'],['#d44','#e9a4b4','#fff'],['#e4c65a','#d98040','#769246']],answer:0},
        ['Karatay’daki mozaik çinilerde hangi palet kullanılır?',['Pembe ve turuncu','Turkuaz, lacivert ve siyah','Yalnızca beyaz']],2),
      mission('miras','Üç dosya, bir miras',6,-20,'Deniz: “Kubbeyle örtülü ana mekânı ve ders hücresini incele. Sonra üç mekândan topladığımız bilgileri doğru dönemlere bağla.”','Karatay tek katlı, kapalı avlulu bir medresedir. Selçuklu döneminde hadis ve tefsir öğretimi için inşa edilmiştir. 1955’te Çini Eserler Müzesi olarak açıldı.','museum',[
        [5,-12,'Kubbeyle örtülü avlu','Başını kaldır: Ana avlu kubbeyle örtülüdür. Merkezdeki açıklık ışık alır. Bu mekân açık hava meydanı gibi yorumlanmamalıdır.','Mimari planı doğru tanımlamak.'],
        [10,-20,'Ders mekânı ve araştırma masası','Medrese bir öğrenim yapısıdır. Bu eğitim temsilindeki masa özgün müze eşyası değildir. Burada hadis ve tefsir eğitimi verilmiştir.','Son dosyayı bilginin aktarımıyla ilişkilendirmek.']],
        {type:'order',prompt:'Araştırdığın üç tarihî evreyi eskiden yeniye sırala.',items:['Mevlâna Türbesi — 1274','Çatalhöyük Doğu Höyük — MÖ 7400–6200','Karatay Medresesi — 1251'],correct:[1,2,0]},
        ['Karatay’ın planı nasıl tanımlanır?',['Açık tiyatro','Kapalı avlulu medrese','Damdan girilen Neolitik ev']],1)
    ]}
  ];
  return {sources,chapters};
})();
