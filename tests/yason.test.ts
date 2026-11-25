import { describe, expect, it } from 'vitest';
import { BOUNDS, CH, FACADE, MISSING, PUZZLE_AT, SPOTS, START, cellKind, toneOf, walkable } from '../src/app/games/yason/site';

function reach() {
  const seen = new Set<string>(), cell = 0.25, k = (x: number, z: number) => `${Math.round(x / cell)},${Math.round(z / cell)}`, q: [number, number][] = [[START.at[0], START.at[1]]]; seen.add(k(...q[0]));
  while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) { const nx = x + dx, nz = z + dz, kk = k(nx, nz); if (nx < BOUNDS.x0 || nx > BOUNDS.x1 || nz < BOUNDS.z0 || nz > BOUNDS.z1 || seen.has(kk) || !walkable(nx, nz)) continue; seen.add(kk); q.push([nx, nz]); } }
  return (x: number, z: number) => seen.has(k(x, z));
}
describe('Yason — Açık Taş, Koyu Taş', () => {
  const r = reach();
  it('burunda duraklara, cephe önüne ve iki kapıdan kilisenin içine yürünür; denize girilmez', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    expect(r(PUZZLE_AT[0], PUZZLE_AT[1])).toBe(true); expect(r(0, 0.1)).toBe(true);
    expect(walkable(0, -50)).toBe(false); expect(walkable(40, -10)).toBe(false);
  });
  it('cephe: kapı boşluğu, kemer ve sıra taşları; eksik taşların hepsinin tonu belli; sıralar dönüşümlü', () => {
    expect(cellKind(5, 0)).toBe('door'); expect(cellKind(0, 0)).toBe('course');
    expect(MISSING.length).toBeGreaterThanOrEqual(8); expect(MISSING.some(([c, rr]) => cellKind(c, rr) === 'arch')).toBe(true);
    for (const [c, rr] of MISSING) expect(toneOf(c, rr)).not.toBeNull();
    expect(toneOf(0, 0)).not.toBe(toneOf(0, 1)); expect(FACADE.cols * FACADE.w).toBeCloseTo(CH.hw * 2);
  });
});
