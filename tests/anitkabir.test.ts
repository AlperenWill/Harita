import { describe, expect, it } from 'vitest';
import data from '../src/app/monuments/data/ankara-anitkabir.json';
import { FRONT_X, HALL, HOTSPOTS, LION_ROAD, MAUSOLEUM, PLAZA, PODIUM_H, POSES, SARCOPHAGUS, STAIR_X0, TERRACE_X, WALK, groundHeight, isClear, lions, mausoleumColumns, stairSteps, towers, walkColliders } from '../src/app/monuments/anitkabir/layout';

describe('Anıtkabir yerleşimi (1:1 ölçek)', () => {
  it('bilinen ölçü ve sayılar', () => {
    expect([MAUSOLEUM.len, MAUSOLEUM.wid, MAUSOLEUM.h]).toEqual([57.35, 41.65, 17]);
    expect(MAUSOLEUM.podium.x1 - MAUSOLEUM.podium.x0).toBeCloseTo(72, 6);
    expect(MAUSOLEUM.podium.halfW * 2).toBe(52);
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

describe('yürüme modu', () => {
  const hit = (x: number, z: number) => walkColliders().some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  it('zemin: meydan 0, merdiven rampa, teras ve hol kaide yüksekliğinde', () => {
    expect(groundHeight(0, 0)).toBe(0);
    expect(groundHeight((STAIR_X0 + TERRACE_X) / 2, 0)).toBeCloseTo(PODIUM_H / 2, 5);
    expect(groundHeight(TERRACE_X + 2, 0)).toBe(PODIUM_H);
    expect(groundHeight(SARCOPHAGUS[0] - 8, 0)).toBe(PODIUM_H);
    expect(groundHeight(TERRACE_X + 2, 40)).toBe(0);      // kaidenin dışı
  });
  it('meydandan kapıdan geçip lahde kadar engelsiz yürünür; duvarlar ve lahit engeldir', () => {
    for (let x = WALK.spawn.x; x < SARCOPHAGUS[0] - 4; x += 0.5) expect(hit(x, 0), `x=${x}`).toBe(false);
    expect(hit(HALL.outer[0] + 0.5, 6)).toBe(true);        // kapının yanındaki ön duvar
    expect(hit(SARCOPHAGUS[0], 0)).toBe(true);
    expect(hit(FRONT_X + 1, MAUSOLEUM.wid / 2 - 1)).toBe(true);   // köşe sütunu
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
