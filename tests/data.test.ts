import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { geoArea, geoContains, geoDistance } from 'd3-geo';
import { merge } from 'topojson-client';
import { REGIONS, REGION_OF_PROVINCE, ELEVATION } from '../src/data/regions';
import type { HeritageSite } from '../src/data/types';
import marmara from '../src/data/heritage/marmara';
import ege from '../src/data/heritage/ege';
import akdeniz from '../src/data/heritage/akdeniz';
import icanadolu from '../src/data/heritage/icanadolu';
import karadeniz from '../src/data/heritage/karadeniz';
import doguanadolu from '../src/data/heritage/doguanadolu';
import guneydogu from '../src/data/heritage/guneydogu';
import { buildProvinceQuest } from '../src/state/quests';

const byRegion: Record<string, HeritageSite[]> = { marmara, ege, akdeniz, icanadolu, karadeniz, doguanadolu, guneydogu };
const all = Object.values(byRegion).flat();
const high = JSON.parse(readFileSync('public/data/tr-high.topo.json', 'utf8'));
// Nokta-içinde testleri sadeleştirilmemiş ham veri üzerinde yapılır (d3 sarım kuralına çevrilerek).
const raw = JSON.parse(readFileSync('data/raw/tr-cities.geojson', 'utf8'));
const rewindPoly = (rings: any) =>
  geoArea({ type: 'Polygon', coordinates: rings } as any) > 2 * Math.PI ? rings.map((r: any) => [...r].reverse()) : rings;
const provinces = raw.features.map((f: any) => ({
  ...f,
  geometry: f.geometry.type === 'Polygon'
    ? { ...f.geometry, coordinates: rewindPoly(f.geometry.coordinates) }
    : { ...f.geometry, coordinates: f.geometry.coordinates.map(rewindPoly) },
})) as any[];
const EARTH_KM = 6371;

describe('coğrafi veri', () => {
  it('81 il var ve hepsi bir bölgeye, bir rakıma sahip', () => {
    expect(provinces).toHaveLength(81);
    for (const f of provinces) {
      expect(REGION_OF_PROVINCE[f.properties.name], f.properties.name).toBeDefined();
      expect(ELEVATION[f.properties.name], f.properties.name).toBeGreaterThan(0);
    }
    expect(REGIONS.reduce((n, r) => n + r.provinces.length, 0)).toBe(81);
  });

  it('7 bölge topolojik olarak birleştirilebiliyor', () => {
    for (const r of REGIONS) {
      const names = new Set(r.provinces);
      const m = merge(high, high.objects.provinces.geometries.filter((g: any) => names.has(g.properties.name)));
      expect(m.coordinates.length, r.id).toBeGreaterThan(0);
    }
  });
});

describe('miras veri seti', () => {
  it('kimlikler benzersiz', () => {
    expect(new Set(all.map((s) => s.id)).size).toBe(all.length);
  });

  it('her il en az bir miras noktası içeriyor', () => {
    const covered = new Set(all.map((s) => s.province));
    const missing = provinces.map((f) => f.properties.name).filter((n) => !covered.has(n));
    expect(missing).toEqual([]);
  });

  it('her nokta doğru bölge dosyasında', () => {
    for (const [rid, list] of Object.entries(byRegion))
      for (const s of list) expect(REGION_OF_PROVINCE[s.province], s.id).toBe(rid);
  });

  it('her noktanın koordinatı beyan edilen ilin sınırları içinde (kıyı/ada için ≤ 4 km tolerans)', () => {
    const errors: string[] = [];
    for (const s of all) {
      const own = provinces.find((f) => f.properties.name === s.province);
      if (geoContains(own, s.coord)) continue;
      const other = provinces.find((f) => geoContains(f, s.coord));
      if (other) {
        errors.push(`${s.id}: ${s.province} yerine ${other.properties.name} içinde`);
        continue;
      }
      // Hiçbir ilin içinde değil → denizde/adacıkta. En yakın sınır köşesine mesafe.
      let min = Infinity;
      const polys = own.geometry.type === 'Polygon' ? [own.geometry.coordinates] : own.geometry.coordinates;
      for (const p of polys) for (const c of p[0]) min = Math.min(min, geoDistance(c, s.coord) * EARTH_KM);
      if (min > 4) errors.push(`${s.id}: ${s.province} sınırına ${min.toFixed(1)} km uzakta`);
    }
    expect(errors).toEqual([]);
  });

  it('il görevleri üretilebiliyor; en az 10 ilde "3 farklı dönem" görevi var', () => {
    const provNames = [...new Set(all.map((s) => s.province))];
    const quests = provNames.map((p) => buildProvinceQuest(p, all.filter((s) => s.province === p)));
    expect(quests.filter((q) => q.kind === 'periods').length).toBeGreaterThanOrEqual(10);
  });
});
