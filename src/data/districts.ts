/**
 * Miras noktalarının ilçeleri. Yalnızca emin olunan ilçeler yazılır; listede olmayan
 * noktalarda arayüz yalnızca il adını gösterir (yanlış ilçe göstermektense eksik bırakılır).
 */
export const DISTRICT: Record<string, string> = {
  // Marmara
  ayasofya: 'Fatih', yerebatan: 'Fatih', kariye: 'Fatih', topkapi: 'Fatih', 'turk-kahvesi': 'Fatih', yenikapi: 'Fatih',
  galata: 'Beyoğlu', 'kiz-kulesi': 'Üsküdar',
  selimiye: 'Merkez', 'bayezid-saglik': 'Merkez', uzunkopru: 'Uzunköprü', hidrellez: 'Merkez',
  'vize-ayasofya': 'Vize', asagipinar: 'Merkez', rakoczi: 'Süleymanpaşa', seka: 'İzmit', 'yalova-kosk': 'Merkez',
  justinianus: 'Adapazarı', 'ertugrul-turbe': 'Söğüt', cumalikizik: 'Yıldırım', 'koza-han': 'Osmangazi', karagoz: 'Osmangazi',
  aktopraklik: 'Nilüfer', kyzikos: 'Erdek', zagnos: 'Karesi', troya: 'Merkez', assos: 'Ayvacık', kilitbahir: 'Eceabat',
  // Ege
  efes: 'Selçuk', bergama: 'Bergama', kizlaragasi: 'Konak', yesilova: 'Bornova', 'izmir-saat-kulesi': 'Konak', 'izmir-agora': 'Konak',
  sardes: 'Salihli', mesir: 'Şehzadeler', 'muradiye-manisa': 'Şehzadeler', afrodisias: 'Karacasu', priene: 'Söke', didyma: 'Didim',
  hierapolis: 'Pamukkale', laodikeia: 'Pamukkale', akhan: 'Pamukkale', 'bodrum-kalesi': 'Bodrum', kaunos: 'Ortaca',
  stratonikeia: 'Yatağan', 'afyon-ulu': 'Merkez', ayazini: 'İhsaniye', aizanoi: 'Çavdarhisar', 'kutahya-cini': 'Merkez', karun: 'Merkez',
  // Akdeniz
  aspendos: 'Serik', xanthos: 'Kaş', myra: 'Demre', karain: 'Döşemealtı', kizilkule: 'Alanya', 'hadrian-kapisi': 'Muratpaşa', perge: 'Aksu',
  adada: 'Sütçüler', 'isparta-gul': 'Merkez', sagalassos: 'Ağlasun', hacilar: 'Merkez', kizkalesi: 'Erdemli', uzuncaburc: 'Silifke',
  yumuktepe: 'Yenişehir', 'taskopru-adana': 'Seyhan', misis: 'Yüreğir', yilankale: 'Ceyhan', 'hatay-muze': 'Antakya',
  'st-pierre': 'Antakya', 'habib-neccar': 'Antakya', titus: 'Samandağ', karatepe: 'Kadirli', germanicia: 'Dulkadiroğlu',
  // İç Anadolu
  anitkabir: 'Çankaya', amm: 'Altındağ', augustus: 'Altındağ', 'ankara-kalesi': 'Altındağ', gordion: 'Polatlı', arslanhane: 'Altındağ',
  catalhoyuk: 'Çumra', mevlana: 'Karatay', sema: 'Karatay', 'ince-minare': 'Selçuklu', esrefoglu: 'Beyşehir', zazadin: 'Selçuklu',
  kultepe: 'Kocasinan', 'sultanhan-kayseri': 'Kocasinan', 'gevher-nesibe': 'Melikgazi', midas: 'Han', odunpazari: 'Odunpazarı',
  luletasi: 'Odunpazarı', divrigi: 'Divriği', 'gok-medrese-sivas': 'Merkez', asiklik: 'Merkez', ihlara: 'Güzelyurt',
  'sultanhani-aksaray': 'Sultanhanı', asikli: 'Gülağaç', binbirkilise: 'Merkez', hatuniye: 'Merkez', cacabey: 'Merkez',
  gumusler: 'Merkez', 'tyana-kemer': 'Bor', goreme: 'Merkez', derinkuyu: 'Derinkuyu', avanos: 'Avanos', sarihan: 'Avanos',
  kerkenes: 'Sorgun', 'sarikaya-hamam': 'Sarıkaya', 'tas-mescit': 'Merkez',
  // Karadeniz
  zilkale: 'Çamlıhemşin', 'senyuva-koprusu': 'Çamlıhemşin', 'rize-kalesi': 'Merkez', 'rize-cay': 'Merkez', sumela: 'Maçka',
  'trabzon-ayasofya': 'Ortahisar', 'trabzon-kosk': 'Ortahisar', kemence: 'Ortahisar', ishan: 'Yusufeli', 'kus-dili': 'Çanakçı',
  'giresun-adasi': 'Merkez', yason: 'Perşembe', ikiztepe: 'Bafra', amisos: 'Atakum', 'bandirma-vapuru': 'İlkadım', balatlar: 'Merkez',
  mahmutbey: 'Merkez', pompeiopolis: 'Taşköprü', amasra: 'Amasra', tios: 'Çaycuma', safranbolu: 'Safranbolu', 'cinci-han': 'Safranbolu',
  mudurnu: 'Mudurnu', konuralp: 'Merkez', 'kral-kaya': 'Merkez', 'amasya-bimarhane': 'Merkez', hazeranlar: 'Merkez',
  'tokat-gok': 'Merkez', hidirlik: 'Merkez', 'tokat-yazma': 'Merkez', hattusa: 'Boğazkale', alacahoyuk: 'Alaca',
  'bayburt-kale': 'Merkez', 'dede-korkut': 'Merkez',
  // Doğu Anadolu
  'cifte-minareli': 'Yakutiye', 'erzurum-kongre': 'Yakutiye', 'osk-vank': 'Uzundere', altintepe: 'Üzümlü', 'mama-hatun': 'Tercan',
  ani: 'Merkez', 'kars-kalesi': 'Merkez', ishakpasa: 'Doğubayazıt', 'seytan-kalesi': 'Çıldır', tuzluca: 'Tuzluca',
  arslantepe: 'Battalgazi', 'battalgazi-ulu': 'Battalgazi', harput: 'Merkez', munzur: 'Ovacık', 'yuzen-adalar': 'Solhan',
  'mus-alaeddin': 'Merkez', ahlat: 'Ahlat', 'bitlis-ulu': 'Merkez', 'van-kalesi': 'Tuşba', akdamar: 'Gevaş', hosap: 'Gürpınar',
  'hakkari-medrese': 'Merkez',
  // Güneydoğu Anadolu
  zeugma: 'Şehitkamil', 'gaziantep-kale': 'Şahinbey', bakircilar: 'Şahinbey', yesemek: 'İslahiye', gobeklitepe: 'Haliliye',
  karahantepe: 'Haliliye', balikligol: 'Eyyübiye', harran: 'Harran', halfeti: 'Halfeti', 'diyarbakir-sur': 'Sur', ongozlu: 'Sur',
  'diyarbakir-ulu': 'Sur', dara: 'Artuklu', zinciriye: 'Artuklu', deyrulzafaran: 'Artuklu', hasankeyf: 'Hasankeyf', tillo: 'Tillo',
  'siirt-battaniye': 'Merkez', 'cizre-kirmizi': 'Cizre', nemrut: 'Kahta', cendere: 'Kahta', perre: 'Merkez', oylum: 'Merkez',
};

/** İl plaka kodları */
export const PLATE: Record<string, number> = {
  Adana: 1, Adıyaman: 2, Afyon: 3, Ağrı: 4, Amasya: 5, Ankara: 6, Antalya: 7, Artvin: 8, Aydın: 9, Balıkesir: 10,
  Bilecik: 11, Bingöl: 12, Bitlis: 13, Bolu: 14, Burdur: 15, Bursa: 16, Çanakkale: 17, Çankırı: 18, Çorum: 19, Denizli: 20,
  Diyarbakır: 21, Edirne: 22, Elazığ: 23, Erzincan: 24, Erzurum: 25, Eskişehir: 26, Gaziantep: 27, Giresun: 28, Gümüşhane: 29,
  Hakkari: 30, Hatay: 31, Isparta: 32, Mersin: 33, İstanbul: 34, İzmir: 35, Kars: 36, Kastamonu: 37, Kayseri: 38, Kırklareli: 39,
  Kırşehir: 40, Kocaeli: 41, Konya: 42, Kütahya: 43, Malatya: 44, Manisa: 45, Kahramanmaraş: 46, Mardin: 47, Muğla: 48, Muş: 49,
  Nevşehir: 50, Niğde: 51, Ordu: 52, Rize: 53, Sakarya: 54, Samsun: 55, Siirt: 56, Sinop: 57, Sivas: 58, Tekirdağ: 59, Tokat: 60,
  Trabzon: 61, Tunceli: 62, Şanlıurfa: 63, Uşak: 64, Van: 65, Yozgat: 66, Zonguldak: 67, Aksaray: 68, Bayburt: 69, Karaman: 70,
  Kırıkkale: 71, Batman: 72, Şırnak: 73, Bartın: 74, Ardahan: 75, Iğdır: 76, Yalova: 77, Karabük: 78, Kilis: 79, Osmaniye: 80, Düzce: 81,
};
