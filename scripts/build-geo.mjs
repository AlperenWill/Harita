// Gerçek il sınırları (OSM türevi GeoJSON, ODbL) → iki LOD seviyeli TopoJSON.
//  - tr-low.topo.json  : genel görünüm (7 bölge), agresif sadeleştirme, minik adalar elenir
//  - tr-high.topo.json : bölge/il görünümü, kıyı ve sınır detayı korunur
// Koordinatlar WGS84 lon/lat olarak kalır; projeksiyon istemcide d3-geo ile yapılır.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile, filter, filterWeight } from 'topojson-simplify';
import { geoArea } from 'd3-geo';

const src = JSON.parse(readFileSync('data/raw/tr-cities.geojson', 'utf8'));

// d3-geo küresel sarım kuralı: dış halka saat yönünde. Ters sarılmış poligonlar
// d3'te "dünyanın geri kalanı" anlamına gelir; geoContains/geoBounds bozulur.
function rewind(geom) {
  const fixPoly = (rings) => {
    const area = geoArea({ type: 'Polygon', coordinates: rings });
    return area > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
  };
  if (geom.type === 'Polygon') return { ...geom, coordinates: fixPoly(geom.coordinates) };
  return { ...geom, coordinates: geom.coordinates.map(fixPoly) };
}

const features = src.features.map((f) => ({
  type: 'Feature',
  properties: { name: f.properties.name },
  geometry: rewind(f.geometry),
}));

function build(keepRatio, minWeightFilter) {
  let topo = topology({ provinces: { type: 'FeatureCollection', features } }, 1e5);
  topo = presimplify(topo);
  const minWeight = quantile(topo, keepRatio);
  topo = simplify(topo, minWeight);
  if (minWeightFilter) topo = filter(topo, filterWeight(topo, minWeightFilter));
  return topo;
}

mkdirSync('public/data', { recursive: true });
const low = build(0.18, 2e-6);
const high = build(0.55);
writeFileSync('public/data/tr-low.topo.json', JSON.stringify(low));
writeFileSync('public/data/tr-high.topo.json', JSON.stringify(high));
console.log('low', JSON.stringify(low).length, 'bytes; high', JSON.stringify(high).length, 'bytes');
