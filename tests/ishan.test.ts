import { describe, expect, it } from 'vitest';
import { BOUNDS, CROSS, PEEKS, SPOTS, START, inChurch, nearPeek, walkable } from '../src/app/games/ishan/site';

function reach() {
  const seen = new Set<string>(), cell = 0.3, k = (x: number, z: number) => `${Math.round(x / cell)},${Math.round(z / cell)}`, q: [number, number][] = [[START.at[0], START.at[1]]]; seen.add(k(...q[0]));
  while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) { const nx = x + dx, nz = z + dz, kk = k(nx, nz); if (nx < BOUNDS.x0 || nx > BOUNDS.x1 || nz < BOUNDS.z0 || nz > BOUNDS.z1 || seen.has(kk) || !walkable(nx, nz)) continue; seen.add(kk); q.push([nx, nz]); } }
  return (x: number, z: number) => seen.has(k(x, z));
}
describe('İşhan — Pencereden Bak', () => {
  const r = reach();
  it('kilisenin çevresinde duraklara ve pencere taşlarına yürünür; kiliseye girilmez', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    for (const [i, p] of PEEKS.entries()) { expect(r(p.stand[0], p.stand[1]), p.id).toBe(true); expect(nearPeek(p.stand[0], p.stand[1], [])).toBe(i); expect(inChurch(p.cam[0], p.cam[2])).toBe(true); }
    expect(walkable(CROSS.cx, 0)).toBe(false);
  });
  it('plan ölçüleri kaynakla uyumlu (~35 × 20,75 m)', () => {
    expect(CROSS.x1 - CROSS.x0).toBeCloseTo(35, 0); expect(CROSS.thw * 2).toBeCloseTo(20.75, 1);
  });
});
