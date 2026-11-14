import { describe, expect, it } from 'vitest';
import { MOTIFS, PHASES, WALK, MIHRAB_ZONE, panels, isLit, shafts, sunPosition, walkColliders, insideHall } from '../src/games/sultanahmet-camii/layout';
import { BADGES } from '../src/app/istanbul/Journal';

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
  it('ilerlemeyi okur: Işığın peşinde yalnızca Sultanahmet tamamlanınca', () => {
    const isik = BADGES.find((b) => b.id === 'isik')!;
    expect(isik.earned({ visited: { 'sultanahmet-camii': 1 }, completed: {}, finds: { 'sultanahmet-camii': MOTIFS.slice(0, 5) } })).toBe(false);
    expect(isik.earned({ visited: {}, completed: { 'sultanahmet-camii': 1 }, finds: {} })).toBe(true);
  });
});
