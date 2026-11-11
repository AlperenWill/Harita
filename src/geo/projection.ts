import { geoMercator, type GeoProjection } from 'd3-geo';

/** Haritanın dünya birimindeki genişliği (doğu-batı). 1 birim ≈ 16 km. */
export const MAP_WIDTH = 100;

// Türkiye'nin coğrafi sınır kutusu (adalar dahil). Projeksiyonu poligonla değil
// köşe noktalarıyla oturtuyoruz: sarım yönünden bağımsız ve deterministik.
const TR_BOUNDS = {
  type: 'MultiPoint' as const,
  coordinates: [
    [25.66, 35.81],
    [44.83, 42.11],
  ],
};

let _proj: GeoProjection | null = null;
export function projection(): GeoProjection {
  if (!_proj) {
    _proj = geoMercator().fitExtent(
      [
        [-MAP_WIDTH / 2, -MAP_WIDTH / 2],
        [MAP_WIDTH / 2, MAP_WIDTH / 2],
      ],
      TR_BOUNDS,
    );
  }
  return _proj;
}

/** [boylam, enlem] → dünya düzlemi [x, z] (kuzey = -z) */
export function toWorld(lon: number, lat: number): [number, number] {
  const p = projection()([lon, lat])!;
  return [p[0], p[1]];
}

/** Rakım (m) → extrude yüksekliği (dünya birimi). Dikey abartı ≈ 15x */
export function elevationToHeight(m: number): number {
  return 0.35 + (m / 1000) * 0.95;
}
