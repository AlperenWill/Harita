import type { Category, Period, RegionDef, RegionId } from './types';

// Renkler: Marmara deniz-yeşili, Ege zeytin, Akdeniz kiremit, İç Anadolu buğday/tüf,
// Karadeniz yosun, Doğu bazalt-lavanta, Güneydoğu kumtaşı. Hepsi düşük doygunlukta pastel.
export const REGIONS: RegionDef[] = [
  {
    id: 'marmara',
    name: 'Marmara',
    color: '#9fbfb8',
    provinces: ['Edirne', 'Kırklareli', 'Tekirdağ', 'İstanbul', 'Kocaeli', 'Yalova', 'Sakarya', 'Bilecik', 'Bursa', 'Balıkesir', 'Çanakkale'],
  },
  {
    id: 'ege',
    name: 'Ege',
    color: '#b9bf98',
    provinces: ['İzmir', 'Manisa', 'Aydın', 'Denizli', 'Muğla', 'Afyon', 'Kütahya', 'Uşak'],
  },
  {
    id: 'akdeniz',
    name: 'Akdeniz',
    color: '#ddae94',
    provinces: ['Antalya', 'Isparta', 'Burdur', 'Mersin', 'Adana', 'Hatay', 'Osmaniye', 'Kahramanmaraş'],
  },
  {
    id: 'icanadolu',
    name: 'İç Anadolu',
    color: '#e2cc9c',
    provinces: ['Ankara', 'Konya', 'Kayseri', 'Eskişehir', 'Sivas', 'Kırıkkale', 'Aksaray', 'Karaman', 'Kırşehir', 'Niğde', 'Nevşehir', 'Yozgat', 'Çankırı'],
  },
  {
    id: 'karadeniz',
    name: 'Karadeniz',
    color: '#a3b49a',
    provinces: ['Rize', 'Trabzon', 'Artvin', 'Giresun', 'Ordu', 'Samsun', 'Sinop', 'Kastamonu', 'Bartın', 'Zonguldak', 'Karabük', 'Bolu', 'Düzce', 'Amasya', 'Tokat', 'Çorum', 'Gümüşhane', 'Bayburt'],
  },
  {
    id: 'doguanadolu',
    name: 'Doğu Anadolu',
    color: '#b3aab8',
    provinces: ['Erzurum', 'Erzincan', 'Kars', 'Ağrı', 'Ardahan', 'Iğdır', 'Malatya', 'Elazığ', 'Tunceli', 'Bingöl', 'Muş', 'Bitlis', 'Van', 'Hakkari'],
  },
  {
    id: 'guneydogu',
    name: 'Güneydoğu Anadolu',
    color: '#d9b9a6',
    provinces: ['Gaziantep', 'Şanlıurfa', 'Diyarbakır', 'Mardin', 'Batman', 'Siirt', 'Şırnak', 'Adıyaman', 'Kilis'],
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, RegionDef>;

export const REGION_OF_PROVINCE: Record<string, RegionId> = Object.fromEntries(
  REGIONS.flatMap((r) => r.provinces.map((p) => [p, r.id])),
);

/** Görünen ad (GeoJSON'daki kısaltmalar düzeltilir) */
export const PROVINCE_DISPLAY: Record<string, string> = { Afyon: 'Afyonkarahisar' };
export const displayProvince = (p: string) => PROVINCE_DISPLAY[p] ?? p;

/**
 * İllerin yaklaşık ortalama rakımı (m). Extrude yüksekliği buradan türetilir:
 * doğuya doğru yükselen Anadolu platosu haritada okunur hâle gelir.
 */
export const ELEVATION: Record<string, number> = {
  Adana: 400, Adıyaman: 900, Afyon: 1100, Ağrı: 1900, Amasya: 700, Ankara: 1000, Antalya: 700,
  Artvin: 1200, Aydın: 300, Balıkesir: 300, Bilecik: 600, Bingöl: 1400, Bitlis: 1700, Bolu: 1000,
  Burdur: 1100, Bursa: 500, Çanakkale: 200, Çankırı: 900, Çorum: 900, Denizli: 800, Diyarbakır: 700,
  Edirne: 100, Elazığ: 1100, Erzincan: 1600, Erzurum: 2000, Eskişehir: 900, Gaziantep: 850,
  Giresun: 900, Gümüşhane: 1500, Hakkari: 2200, Hatay: 300, Isparta: 1100, Mersin: 700,
  İstanbul: 100, İzmir: 300, Kars: 1800, Kastamonu: 900, Kayseri: 1200, Kırklareli: 250,
  Kırşehir: 1000, Kocaeli: 200, Konya: 1100, Kütahya: 1000, Malatya: 1100, Manisa: 400,
  Kahramanmaraş: 800, Mardin: 900, Muğla: 600, Muş: 1500, Nevşehir: 1200, Niğde: 1300, Ordu: 700,
  Rize: 900, Sakarya: 200, Samsun: 400, Siirt: 900, Sinop: 400, Sivas: 1400, Tekirdağ: 150,
  Tokat: 800, Trabzon: 900, Tunceli: 1300, Şanlıurfa: 600, Uşak: 900, Van: 1800, Yozgat: 1100,
  Zonguldak: 400, Aksaray: 1100, Bayburt: 1700, Karaman: 1100, Kırıkkale: 800, Batman: 700,
  Şırnak: 1200, Bartın: 300, Ardahan: 1900, Iğdır: 1000, Yalova: 200, Karabük: 600, Kilis: 600,
  Osmaniye: 400, Düzce: 300,
};

export const CATEGORY_LABEL: Record<Category, string> = {
  unesco: 'UNESCO Dünya Mirası',
  muze: 'Müze',
  han: 'Han & Kervansaray',
  kopru: 'Tarihî Köprü',
  arkeoloji: 'Arkeolojik Alan',
  mimari: 'Mimari Yapı',
  'somut-olmayan': 'Somut Olmayan Miras',
  'kultur-peyzaji': 'Kültürel Peyzaj',
};

export const PERIODS: { id: Period; label: string; color: string }[] = [
  { id: 'prehistorik', label: 'Tarih Öncesi', color: '#8a6f5a' },
  { id: 'tunc', label: 'Tunç Çağı & Hitit', color: '#b07a4f' },
  { id: 'demir', label: 'Demir Çağı Krallıkları', color: '#7d7f86' },
  { id: 'antik', label: 'Klasik & Roma', color: '#c9b48a' },
  { id: 'bizans', label: 'Bizans & Ortaçağ', color: '#b98f4e' },
  { id: 'selcuklu', label: 'Selçuklu & Beylikler', color: '#3f8a8c' },
  { id: 'osmanli', label: 'Osmanlı', color: '#2f5f9a' },
  { id: 'cumhuriyet', label: 'Cumhuriyet', color: '#a2453b' },
  { id: 'yasayan', label: 'Yaşayan Miras', color: '#6d8b4f' },
];
export const PERIOD_BY_ID = Object.fromEntries(PERIODS.map((p) => [p.id, p])) as Record<Period, (typeof PERIODS)[number]>;
