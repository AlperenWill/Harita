import { describe, expect, it } from 'vitest';
import { BOUNDS, GATHER, MASTERS, SPOTS, START, nearMaster, walkable } from '../src/app/games/mudurnu/site';

function reach() {
  const seen = new Set<string>(), cell = 0.4, k = (x: number, z: number) => `${Math.round(x / cell)},${Math.round(z / cell)}`, q: [number, number][] = [[START.at[0], START.at[1]]]; seen.add(k(...q[0]));
  while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) { const nx = x + dx, nz = z + dz, kk = k(nx, nz); if (nx < BOUNDS.x0 || nx > BOUNDS.x1 || nz < BOUNDS.z0 || nz > BOUNDS.z1 || seen.has(kk) || !walkable(nx, nz)) continue; seen.add(kk); q.push([nx, nz]); } }
  return (x: number, z: number) => seen.has(k(x, z));
}
describe('Mudurnu — Cuma Duası', () => {
  const r = reach();
  it('ustalara, meydandaki toplanma yerlerine ve duraklara yürünür', () => {
    for (const [i, m] of MASTERS.entries()) { expect(r(m.at[0], m.at[1]), m.id).toBe(true); expect(nearMaster(m.at[0], m.at[1], [])).toBe(i); }
    for (const g of GATHER) expect(walkable(g[0], g[1])).toBe(true);
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
  });
});
