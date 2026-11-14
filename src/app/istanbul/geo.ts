import * as THREE from 'three';
import { geoMercator, geoArea } from 'd3-geo';
import type { MultiPolygon, Polygon, Position } from 'geojson';

/** İstanbul'un sınır kutusu → dünya düzleminde ~100 birim genişlik (1 birim ≈ 1,7 km). Kuzey = -Z. */
const proj = geoMercator().fitExtent([[-50, -50], [50, 50]], { type: 'MultiPoint', coordinates: [[27.97, 40.8], [29.96, 41.59]] });
export const toWorld = (lon: number, lat: number): [number, number] => proj([lon, lat]) as [number, number];

const km2 = (ring: Position[]) => { const a = geoArea({ type: 'Polygon', coordinates: [ring] }); return Math.min(a, 4 * Math.PI - a) * 6371 * 6371; };
const ringPts = (ring: Position[]) => ring.slice(0, -1).map(([lon, lat]) => { const [x, z] = toWorld(lon, lat); return new THREE.Vector2(x, -z); });

/** GeoJSON → THREE.Shape[]; kaynaktaki ilçeler arası küçük boşluklar (sahte delikler) atılır */
export function shapesOf(g: Polygon | MultiPolygon): THREE.Shape[] {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.filter((p) => p[0].length > 3).map((p) => {
    const s = new THREE.Shape(ringPts(p[0]));
    for (const h of p.slice(1)) if (km2(h) > 0.5) s.holes.push(new THREE.Path(ringPts(h)));
    return s;
  });
}
export function outline(shapes: THREE.Shape[], z: number): Float32Array {
  const out: number[] = [];
  for (const s of shapes) for (const pts of [s.getPoints(), ...s.holes.map((h) => h.getPoints())])
    pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; out.push(a.x, a.y, z, b.x, b.y, z); });
  return new Float32Array(out);
}
/** Yaka: Boğaz'ın batısı Avrupa, doğusu Anadolu (ilçe merkezine göre kaba ayrım) */
const ANADOLU = new Set(['Adalar', 'Ataşehir', 'Beykoz', 'Çekmeköy', 'Kadıköy', 'Kartal', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sultanbeyli', 'Şile', 'Tuzla', 'Ümraniye', 'Üsküdar']);
export const sideOf = (name: string) => (ANADOLU.has(name) ? 'anadolu' : 'avrupa');
