import { describe, expect, it } from 'vitest';
import { BOUNDS, DIGS, SEAT_TOP, SPOTS, START, STEP, groundY, nearDig, seatY, walkable } from '../src/app/games/konuralp/site';

function reach() {
  const seen = new Set<string>(), cell = 0.4, k = (x: number, z: number) => `${Math.round(x / cell)},${Math.round(z / cell)}`, q: [number, number][] = [[START.at[0], START.at[1]]]; seen.add(k(...q[0]));
  while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) { const nx = x + dx, nz = z + dz, kk = k(nx, nz);
    if (nx < BOUNDS.x0 || nx > BOUNDS.x1 || nz < BOUNDS.z0 || nz > BOUNDS.z1 || seen.has(kk) || !walkable(nx, nz) || Math.abs(groundY(nx, nz) - groundY(x, z)) >= STEP) continue; seen.add(kk); q.push([nx, nz]); } }
  return (x: number, z: number) => seen.has(k(x, z));
}
describe('Konuralp — Kazı Sezonu', () => {
  const r = reach();
  it('açmaların yanına ve duraklara yürünür', () => {
    for (const [i, d] of DIGS.entries()) { const p = d.at; expect(r(p[0], p[1]), d.id).toBe(true); expect(nearDig(p[0], p[1], {})).toBe(i); expect(d.source.url).toMatch(/^https:\/\//); }
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
  });
  it('oturma alanı yükselir, ara geçitler düzdür; tepede yamaçla buluşur', () => {
    expect(seatY(30)).toBeGreaterThan(seatY(20));
    expect(seatY(25.5)).toBeCloseTo(seatY(24.2), 5);
    expect(groundY(0, -46)).toBeCloseTo(SEAT_TOP, 5);
    expect(groundY(0, -60)).toBeCloseTo(SEAT_TOP, 5);
  });
});
