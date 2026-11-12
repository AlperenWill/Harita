/** Tüm anıt/miras sahnelerinin ortak veri şeması (81 ilin miras noktalarıyla aynı yapı). */
export interface MonumentPoint {
  id: string;
  name: string;
  short: string;
  body: string;
  didYouKnow?: string;
}
export interface MonumentData {
  id: string;
  type: 'monument';
  /** [boylam, enlem] */
  coordinates: [number, number];
  /** LOD başına hedef poligon bütçesi */
  lodConfig: { near: number; mid: number; far: number };
  interactions: ('orbit' | 'zoom' | 'info-panel')[];
  metadata: {
    name: string;
    city: string;
    siteId: string;
    summary: string;
    built: string;
    architects: string[];
    /** Opsiyonel: WebGL yoksa gösterilecek panorama fotoğrafı (yoksa vaziyet planı çizilir) */
    fallbackImage?: string;
    points: MonumentPoint[];
  };
}
export type TimeOfDay = 'sabah' | 'ogle' | 'aksam' | 'gece';
export type Quality = 'high' | 'medium' | 'low';

/** Her anıt sahnesi bu props'ları alır; harita sisteminden bağımsız çalışır. */
export interface MonumentSceneProps {
  isActive: boolean;
  /** Bir nokta id'si, 'overview' ya da 'entrance' */
  cameraTarget?: string;
  onPointClick?: (pointId: string) => void;
}
