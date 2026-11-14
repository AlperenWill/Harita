/** İstanbul miras noktası araştırma dosyası (her yapı için ayrı JSON, sites/ altında) */
export interface IstanbulSite {
  id: string;
  /** UNESCO mülk referansı (İstanbul Tarihi Alanları: 356bis). Bileşen kimlikleri doğrulanamadığı için kullanılmaz. */
  unescoId: string;
  name: string;
  /** Harita ikonu: cami = minare, saray = kubbe, muze = sütun */
  kind: 'cami' | 'saray' | 'muze';
  district: string;
  /** [boylam, enlem] */
  coordinates: [number, number];
  /** playable: 3D deneyimi hazır · research: araştırma tamam, deneyim yapılacak */
  status: 'playable' | 'research';
  unesco: { property: string; inscribed: number; component: string };
  summary: string;
  researchNotes: {
    constructionYear: number;
    constructionPeriod?: string;
    architect: string;
    patron?: string;
    uniqueFeatures: string[];
    restorationHistory: string[];
    unverified?: string[];
  };
  gameConcept: { type: string; coreMechanic: string; targetEmotion: string; avoidElements: string[]; gesture?: string };
  /** Ortak görsel dil sabit; yalnızca ışık tonu ve ambiyans yapıya göre değişir */
  atmosphere: { light: string; ambient: 'courtyard-water' | 'dome-hum' | 'garden-birds' };
  sources: { title: string; url: string; type: string }[];
}
