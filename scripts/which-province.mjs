// Kullanım: node scripts/which-province.mjs lon,lat [lon,lat ...] — noktanın hangi ilde olduğunu söyler
import { readFileSync } from 'node:fs';
import { geoArea, geoContains } from 'd3-geo';
const raw = JSON.parse(readFileSync('data/raw/tr-cities.geojson','utf8'));
const rw = (r)=> geoArea({type:'Polygon',coordinates:r})>2*Math.PI? r.map(x=>[...x].reverse()):r;
const fs = raw.features.map(f=>({...f,geometry:f.geometry.type==='Polygon'?{...f.geometry,coordinates:rw(f.geometry.coordinates)}:{...f.geometry,coordinates:f.geometry.coordinates.map(rw)}}));
for (const a of process.argv.slice(2)) { const [x,y]=a.split(',').map(Number); console.log(a, fs.find(f=>geoContains(f,[x,y]))?.properties.name); }
