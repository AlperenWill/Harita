import * as THREE from 'three';
import type { MultiPolygon, Polygon, Position } from 'geojson';
import { geoArea } from 'd3-geo';
import { toWorld } from './projection';

const EARTH_KM2 = 6371 * 6371;
/** Halka alanı (km²), sarım yönünden bağımsız */
function ringKm2(ring: Position[]): number {
  const a = geoArea({ type: 'Polygon', coordinates: [ring] });
  return Math.min(a, 4 * Math.PI - a) * EARTH_KM2;
}

function ringToPoints(ring: Position[]): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const n = ring.length - (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const [x, z] = toWorld(ring[i][0], ring[i][1]);
    // Shape XY düzleminde; grup -90° X ekseninde döndürülünce (x, h, z) olur
    pts.push(new THREE.Vector2(x, -z));
  }
  return pts;
}

/**
 * GeoJSON (Multi)Polygon → THREE.Shape[].
 * Kaynak veride komşu il sınırları arasında birkaç km²'lik boşluklar (sliver) bulunur;
 * birleştirmede bunlar sahte "delik" olarak kalır. minHoleKm2 altındaki delikler atılır,
 * gerçek göller (ör. Van Gölü) korunur.
 */
export function geometryToShapes(geom: Polygon | MultiPolygon, minHoleKm2 = 300): THREE.Shape[] {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const shapes: THREE.Shape[] = [];
  for (const rings of polys) {
    const outer = ringToPoints(rings[0]);
    if (outer.length < 3) continue;
    const shape = new THREE.Shape(outer);
    for (let i = 1; i < rings.length; i++) {
      if (ringKm2(rings[i]) < minHoleKm2) continue;
      const hole = ringToPoints(rings[i]);
      if (hole.length >= 3) shape.holes.push(new THREE.Path(hole));
    }
    shapes.push(shape);
  }
  return shapes;
}

/** Sınır çizgisi için LineSegments pozisyon dizisi (dünya koordinatında, verilen yükseklikte). */
export function outlinePositions(geom: Polygon | MultiPolygon, y: number): Float32Array {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  const out: number[] = [];
  for (const rings of polys)
    for (const ring of rings)
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, z1] = toWorld(ring[i][0], ring[i][1]);
        const [x2, z2] = toWorld(ring[i + 1][0], ring[i + 1][1]);
        out.push(x1, y, z1, x2, y, z2);
      }
  return new Float32Array(out);
}

/** Geometrinin dünya düzlemindeki sınır kutusu: [minX, minZ, maxX, maxZ] */
export function worldBounds(geom: Polygon | MultiPolygon): [number, number, number, number] {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const rings of polys)
    for (const [lon, lat] of rings[0]) {
      const [x, z] = toWorld(lon, lat);
      if (x < a) a = x;
      if (z < b) b = z;
      if (x > c) c = x;
      if (z > d) d = z;
    }
  return [a, b, c, d];
}

/** Shape'lerin dış ve iç halkalarını, shape düzleminde (z = depth) çizgi parçaları olarak döndürür. */
export function shapeOutline(shapes: THREE.Shape[], depth: number): Float32Array {
  const out: number[] = [];
  const push = (pts: THREE.Vector2[]) => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push(a.x, a.y, depth, b.x, b.y, depth);
    }
  };
  for (const s of shapes) {
    push(s.getPoints());
    for (const h of s.holes) push(h.getPoints());
  }
  return new Float32Array(out);
}
