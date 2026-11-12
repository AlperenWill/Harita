import type { Question } from './quiz';

/** Genel Türkiye testi: 20 soru (doğru cevap her zaman a[0]; gösterimde karıştırılır) */
const RAW: { q: string; a: [string, string, string, string]; explain: string }[] = [
  { q: 'Türkiye’nin başkenti hangi şehirdir?', a: ['Ankara', 'İstanbul', 'İzmir', 'Bursa'], explain: 'Ankara 13 Ekim 1923’te başkent ilan edildi.' },
  { q: 'Türkiye’de kaç il vardır?', a: ['81', '79', '76', '85'], explain: 'Son kurulan iller Kilis, Osmaniye ve Düzce ile sayı 81’e ulaştı.' },
  { q: 'Türkiye kaç coğrafi bölgeye ayrılır?', a: ['7', '5', '6', '8'], explain: '1941’deki Birinci Coğrafya Kongresi’nde 7 bölge belirlendi.' },
  { q: 'Türkiye’nin en yüksek dağı hangisidir?', a: ['Ağrı Dağı', 'Erciyes Dağı', 'Uludağ', 'Kaçkar Dağı'], explain: 'Ağrı Dağı yaklaşık 5.137 m yüksekliğindedir.' },
  { q: 'Türkiye’nin en büyük gölü hangisidir?', a: ['Van Gölü', 'Tuz Gölü', 'Beyşehir Gölü', 'Eğirdir Gölü'], explain: 'Van Gölü yaklaşık 3.700 km² alanıyla en büyük gölümüzdür.' },
  { q: 'Yüzölçümü en büyük ilimiz hangisidir?', a: ['Konya', 'Sivas', 'Ankara', 'Erzurum'], explain: 'Konya yaklaşık 38.000 km² ile en geniş ildir.' },
  { q: 'Göbeklitepe hangi ilimizdedir?', a: ['Şanlıurfa', 'Mardin', 'Diyarbakır', 'Gaziantep'], explain: 'Göbeklitepe yaklaşık 11.600 yıllık anıtsal yapılarıyla Şanlıurfa’dadır.' },
  { q: 'Efes Antik Kenti hangi ilimizdedir?', a: ['İzmir', 'Aydın', 'Muğla', 'Manisa'], explain: 'Efes, İzmir’in Selçuk ilçesindedir.' },
  { q: 'Dev heykelleriyle ünlü Nemrut Dağı hangi ilimizdedir?', a: ['Adıyaman', 'Malatya', 'Van', 'Bitlis'], explain: 'Kommagene Kralı I. Antiokhos’un anıt mezarı Adıyaman’dadır.' },
  { q: 'Mimar Sinan’ın “ustalık eserim” dediği yapı hangisidir?', a: ['Selimiye Camii', 'Süleymaniye Camii', 'Şehzade Camii', 'Sultanahmet Camii'], explain: 'Selimiye Camii Edirne’dedir (1575).' },
  { q: 'Hattuşa hangi uygarlığın başkentidir?', a: ['Hititler', 'Frigler', 'Lidyalılar', 'Urartular'], explain: 'Hattuşa, Çorum’un Boğazkale ilçesindedir.' },
  { q: 'Peribacaları ve Göreme Açık Hava Müzesi hangi ildedir?', a: ['Nevşehir', 'Kayseri', 'Niğde', 'Aksaray'], explain: 'Göreme, Kapadokya’nın kalbinde, Nevşehir’dedir.' },
  { q: '34 plaka kodu hangi ile aittir?', a: ['İstanbul', 'İzmir', 'Konya', 'Kocaeli'], explain: 'İstanbul’un plaka kodu 34’tür.' },
  { q: 'Karadeniz’i Marmara Denizi’ne bağlayan boğaz hangisidir?', a: ['İstanbul Boğazı', 'Çanakkale Boğazı', 'Cebelitarık Boğazı', 'Kerç Boğazı'], explain: 'Çanakkale Boğazı ise Marmara’yı Ege’ye bağlar.' },
  { q: 'Tamamı Türkiye sınırları içinde kalan en uzun akarsu hangisidir?', a: ['Kızılırmak', 'Fırat', 'Sakarya', 'Yeşilırmak'], explain: 'Kızılırmak yaklaşık 1.355 km uzunluğundadır.' },
  { q: 'Pamukkale travertenleri hangi ilimizdedir?', a: ['Denizli', 'Aydın', 'Burdur', 'Uşak'], explain: 'Hierapolis-Pamukkale, Denizli’de UNESCO karma mirasıdır.' },
  { q: 'Sümela Manastırı hangi ilimizdedir?', a: ['Trabzon', 'Rize', 'Giresun', 'Gümüşhane'], explain: 'Sümela, Trabzon’un Maçka ilçesindedir.' },
  { q: 'Osmanlı evleriyle UNESCO listesindeki Safranbolu hangi ildedir?', a: ['Karabük', 'Kastamonu', 'Bartın', 'Bolu'], explain: 'Safranbolu 1994’te UNESCO listesine girdi.' },
  { q: 'Türk Kahvesi Kültürü UNESCO Somut Olmayan Miras listesine hangi yıl girdi?', a: ['2013', '2003', '2008', '2018'], explain: '“Türk Kahvesi Kültürü ve Geleneği” 2013’te listeye alındı.' },
  { q: 'Neolitik kent Çatalhöyük hangi ilimizdedir?', a: ['Konya', 'Karaman', 'Aksaray', 'Niğde'], explain: 'Çatalhöyük Konya’nın Çumra ilçesindedir.' },
];

export function buildGeneralQuiz(rnd: () => number): Question[] {
  return RAW.map(({ q, a, explain }) => {
    const order = [0, 1, 2, 3].sort(() => rnd() - 0.5);
    return { q, options: order.map((i) => a[i]), answer: order.indexOf(0), explain };
  });
}
export const GENERAL_QUIZ_SIZE = RAW.length;
