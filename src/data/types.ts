export type RegionId =
  | 'marmara'
  | 'ege'
  | 'akdeniz'
  | 'icanadolu'
  | 'karadeniz'
  | 'doguanadolu'
  | 'guneydogu';

export type Category =
  | 'unesco'
  | 'muze'
  | 'han'
  | 'kopru'
  | 'arkeoloji'
  | 'mimari'
  | 'somut-olmayan'
  | 'kultur-peyzaji';

export type Period =
  | 'prehistorik'
  | 'tunc'
  | 'demir'
  | 'antik'
  | 'bizans'
  | 'selcuklu'
  | 'osmanli'
  | 'cumhuriyet'
  | 'yasayan';

export interface HeritageSite {
  id: string;
  name: string;
  /** GeoJSON'daki il adı (ör. "Afyon") */
  province: string;
  category: Category;
  period: Period;
  /** [boylam, enlem] WGS84 */
  coord: [number, number];
  /** İlçe (biliniyorsa) */
  district?: string;
  /** tr.wikipedia.org başlığı — fotoğraf çalışma anında Wikipedia REST API'den çekilir */
  wiki?: string;
  summary: string;
  didYouKnow: string;
  /** "Kayıp mimari detay" görevi için incelenecek detay */
  detail?: string;
  /** Opsiyonel Draco sıkıştırılmış GLB yolu; yoksa prosedürel low-poly model kullanılır */
  model?: string;
}

export interface RegionDef {
  id: RegionId;
  name: string;
  color: string;
  provinces: string[];
}
