import { describe, expect, it } from 'vitest';
import data from '../src/app/monuments/data/ankara-anitkabir.json';
import { HOTSPOTS, LION_ROAD, MAUSOLEUM, PLAZA, PODIUM_H, POSES, isClear, lions, mausoleumColumns, stairSteps, towers } from '../src/app/monuments/anitkabir/layout';

describe('Anıtkabir yerleşimi (1:1 ölçek)', () => {
  it('bilinen ölçü ve sayılar', () => {
    expect([MAUSOLEUM.w, MAUSOLEUM.d, MAUSOLEUM.h]).toEqual([72, 52, 17]);
    expect(mausoleumColumns()).toHaveLength(44);
    expect(new Set(mausoleumColumns().map((c) => c.join())).size).toBe(44);
    expect(stairSteps()).toHaveLength(42);
    expect(lions()).toHaveLength(24);
    expect(towers()).toHaveLength(10);
    expect([PLAZA.w, PLAZA.d, LION_ROAD.length]).toEqual([129, 84.25, 262]);
  });
  it('merdiven meydandan mozole terasına ulaşır', () => {
    const s = stairSteps(), last = s[s.length - 1];
    expect(last.pos[1] + last.size[1] / 2).toBeCloseTo(PODIUM_H, 5);
  });
  it('aslanlar ve yol ağaçsız alanda kalır', () => {
    for (const l of lions()) expect(isClear(l.pos[0], l.pos[2])).toBe(false);
  });
});

describe('Anıtkabir verisi (ortak şema)', () => {
  it('şema alanları ve her nokta için hotspot + kamera pozu var', () => {
    expect(data.id).toBe('ankara-anitkabir');
    expect(data.type).toBe('monument');
    expect(data.coordinates).toEqual([32.8375, 39.9255]);
    expect(data.lodConfig).toEqual({ near: 20000, mid: 5000, far: 500 });
    expect(data.interactions).toEqual(['orbit', 'zoom', 'info-panel']);
    for (const p of data.metadata.points) { expect(HOTSPOTS[p.id], p.id).toBeDefined(); expect(POSES[p.id], p.id).toBeDefined(); }
  });
});
