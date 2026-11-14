import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { geoArea, geoContains } from 'd3-geo';
import { SITES } from '../src/app/istanbul/sites';
import { BADGES, MOTIFS as STORE_MOTIFS, isCompleted } from '../src/app/istanbul/store';
import { MOTIFS, PHASES, WALK, MIHRAB_ZONE, panels, isLit, shafts, sunPosition, walkColliders, insideHall } from '../src/app/istanbul/sultanahmet/layout';

const raw = JSON.parse(readFileSync('data/raw/istanbul-districts.geojson', 'utf8'));
const fix = (r: any) => (geoArea({ type: 'Polygon', coordinates: r } as any) > 2 * Math.PI ? r.map((x: any) => [...x].reverse()) : r);
const districts = raw.features.map((f: any) => ({ ...f, geometry: f.geometry.type === 'Polygon' ? { ...f.geometry, coordinates: fix(f.geometry.coordinates) } : { ...f.geometry, coordinates: f.geometry.coordinates.map(fix) } }));

describe('İstanbul araştırma dosyaları', () => {
  it('39 ilçe verisi', () => expect(districts).toHaveLength(39));
  it('her yapı şablona uyar, en az 3 https kaynak içerir ve koordinatı beyan edilen ilçededir', () => {
    for (const s of SITES) {
      expect(s.unescoId).toBe('356bis');
      expect(s.gameConcept.avoidElements).toEqual(expect.arrayContaining(['savaş', 'rekabet', 'şiddet']));
      expect(s.sources.length, s.id).toBeGreaterThanOrEqual(3);
      for (const src of s.sources) expect(src.url).toMatch(/^https:\/\//);
      const d = districts.find((f: any) => geoContains(f, s.coordinates));
      expect(d?.properties.name, s.id).toBe(s.district);
    }
  });
});

describe('Sultanahmet: ışık-gölge mekaniği', () => {
  it('güneş öğlen güneyde ve en yüksekte, sabah doğuda', () => {
    const noon = sunPosition(13.07), morning = sunPosition(8);
    expect(noon.elevation).toBeCloseTo(49, 0);
    expect(Math.abs(noon.bearing - 180)).toBeLessThan(1);
    expect(morning.bearing).toBeGreaterThan(80); expect(morning.bearing).toBeLessThan(130);
  });
  it('gece ışık huzmesi yok, gündüz var', () => {
    expect(shafts(5)).toHaveLength(0);
    expect(shafts(10).length).toBeGreaterThan(0);
  });
  it('6 motif panosu var, her biri kendi saatinde ışık alıyor ve hepsi farklı yerde', () => {
    const ps = panels();
    expect(ps.map((p) => p.motif)).toEqual([...MOTIFS]);
    expect(STORE_MOTIFS).toEqual(MOTIFS);
    for (const p of ps) expect(isLit(p, p.hour), p.motif).toBe(true);
    for (const a of ps) for (const b of ps) if (a !== b) expect(Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2])).toBeGreaterThan(6);
  });
  it('panolar her saatte ışık almaz (aranacak bir şey var)', () => {
    const ps = panels();
    expect(ps.some((p) => !isLit(p, 13))).toBe(true);
  });
  it('üç ışık dönemi tanımlı', () => expect(PHASES.map((p) => p.id)).toEqual(['sabah', 'ogle', 'ikindi']));
});

describe('Sultanahmet: yürüme', () => {
  const C = walkColliders();
  const hit = (x: number, z: number) => C.some(([x0, z0, x1, z1]) => x > x0 - WALK.radius && x < x1 + WALK.radius && z > z0 - WALK.radius && z < z1 + WALK.radius);
  it('avludan şadırvanın yanından geçip kapıdan girerek mihraba yürünebilir', () => {
    const path: [number, number][] = [];
    for (let x = WALK.spawn.x; x < WALK.spawn.x + 8; x += 0.5) path.push([x, 0]);
    for (let z = 0; z <= 6; z += 0.5) path.push([WALK.spawn.x + 8, z]);
    for (let x = WALK.spawn.x + 8; x < WALK.spawn.x + 20; x += 0.5) path.push([x, 6]);
    for (let z = 6; z >= 0; z -= 0.5) path.push([WALK.spawn.x + 20, z]);
    for (let x = WALK.spawn.x + 20; x < MIHRAB_ZONE.x; x += 0.5) path.push([x, 0]);
    for (const [x, z] of path) expect(hit(x, z), `(${x}, ${z})`).toBe(false);
    expect(insideHall(MIHRAB_ZONE.x, 0)).toBe(true);
  });
});

describe('rozetler', () => {
  it('Çini Ustası yalnızca 6 motif bulununca; tüm Sultanahmet rozetleri deneyimi tamamlar', () => {
    const finds = { 'sultanahmet-camii': MOTIFS.slice(0, 5).map((m) => `motif:${m}`) };
    const cini = BADGES.find((b) => b.id === 'cini-ustasi')!;
    expect(cini.earned({ visited: {}, finds })).toBe(false);
    const all = { 'sultanahmet-camii': [...MOTIFS.map((m) => `motif:${m}`), 'isik:sabah', 'isik:ogle', 'isik:ikindi', 'kubbe', 'mihrap'] };
    expect(isCompleted({ visited: {}, finds: all }, 'sultanahmet-camii')).toBe(true);
  });
});
