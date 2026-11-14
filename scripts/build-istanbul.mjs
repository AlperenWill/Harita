// İstanbul ilçe sınırları (ozanyerli/istanbul-districts-geojson) → sadeleştirilmiş TopoJSON.
// Çıktı: public/data/istanbul.topo.json  ·  Çalıştırma: npm run istanbul
import { readFileSync, writeFileSync } from 'node:fs';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { geoArea } from 'd3-geo';

const src = JSON.parse(readFileSync('data/raw/istanbul-districts.geojson', 'utf8'));
// d3 küresel sarım kuralına çevir (dış halka saat yönünde)
const fix = (rings) => (geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings);
const features = src.features.map((f) => ({
  type: 'Feature',
  properties: { name: f.properties.name },
  geometry: f.geometry.type === 'Polygon' ? { ...f.geometry, coordinates: fix(f.geometry.coordinates) } : { ...f.geometry, coordinates: f.geometry.coordinates.map(fix) },
}));
let topo = topology({ districts: { type: 'FeatureCollection', features } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.08));
writeFileSync('public/data/istanbul.topo.json', JSON.stringify(topo));
console.log(features.length, 'ilçe ·', JSON.stringify(topo).length, 'bayt');
