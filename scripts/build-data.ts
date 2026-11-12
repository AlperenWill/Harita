// Uygulama verisi: src/data altındaki doğrulanmış miras veri setinden
// src/app/data/turkiye.json üretir (şehirler + tarihi noktalar).
// Çalıştırma: npm run data
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { geoArea, geoCentroid, geoContains } from 'd3-geo';
import { REGIONS, REGION_OF_PROVINCE, ELEVATION, CATEGORY_LABEL, PERIOD_BY_ID, displayProvince } from '../src/data/regions';
import { DISTRICT, PLATE } from '../src/data/districts';
import marmara from '../src/data/heritage/marmara';
import ege from '../src/data/heritage/ege';
import akdeniz from '../src/data/heritage/akdeniz';
import icanadolu from '../src/data/heritage/icanadolu';
import karadeniz from '../src/data/heritage/karadeniz';
import doguanadolu from '../src/data/heritage/doguanadolu';
import guneydogu from '../src/data/heritage/guneydogu';

const all = [...marmara, ...ege, ...akdeniz, ...icanadolu, ...karadeniz, ...doguanadolu, ...guneydogu];
const raw = JSON.parse(readFileSync('data/raw/tr-cities.geojson', 'utf8'));
const rewind = (r: any) => (geoArea({ type: 'Polygon', coordinates: r } as any) > 2 * Math.PI ? r.map((x: any) => [...x].reverse()) : r);
const slug = (s: string) =>
  s.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const cities = raw.features.map((f: any) => {
  const name: string = f.properties.name;
  const geometry = f.geometry.type === 'Polygon'
    ? { ...f.geometry, coordinates: rewind(f.geometry.coordinates) }
    : { ...f.geometry, coordinates: f.geometry.coordinates.map(rewind) };
  const feat = { type: 'Feature', properties: {}, geometry };
  const sites = all.filter((s) => s.province === name);
  // İşaretçi: ağırlık merkezi il sınırı içindeyse o, değilse ilin ilk miras noktası
  let center = geoCentroid(feat as any) as [number, number];
  if (!geoContains(feat as any, center)) center = sites[0].coord;
  const region = REGIONS.find((r) => r.id === REGION_OF_PROVINCE[name])!;
  const unesco = sites.filter((s) => s.category === 'unesco').length;
  const top = sites.slice(0, 3).map((s) => s.name);
  const display = displayProvince(name);
  const summary =
    `${region.name} Bölgesi’nde yer alan ${display} (${String(PLATE[name]).padStart(2, '0')}), ` +
    `ortalama ${ELEVATION[name].toLocaleString('tr-TR')} m rakımlı bir ildir. Öne çıkan miras: ${top.join(', ')}` +
    (unesco ? `; ${unesco} UNESCO Dünya Mirası alanı.` : '.');
  return {
    id: slug(display), name: display, plate: PLATE[name], region: region.id, regionName: region.name,
    center: [+center[0].toFixed(4), +center[1].toFixed(4)], summary,
    sites: sites.map((s) => ({
      id: s.id, name: s.name, district: DISTRICT[s.id] ?? null,
      category: s.category, categoryLabel: CATEGORY_LABEL[s.category],
      period: s.period, periodLabel: PERIOD_BY_ID[s.period].label,
      coord: s.coord, summary: s.summary, didYouKnow: s.didYouKnow, wiki: s.wiki ?? null,
    })),
  };
}).sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'));

mkdirSync('src/app/data', { recursive: true });
writeFileSync('src/app/data/turkiye.json', JSON.stringify({ cities }, null, 1));
console.log(`${cities.length} il, ${cities.reduce((n: number, c: any) => n + c.sites.length, 0)} tarihi nokta yazıldı.`);
