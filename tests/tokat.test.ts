import { describe, expect, it } from 'vitest';
import { BENCH_AT, SPOTS, START, TARGET, apply, atBench, emptyCloth, phaseOf, walkable } from '../src/app/games/tokat/site';

function reach() {
  const seen = new Set<string>(), cell = 0.1, k = (x: number, z: number) => `${Math.round(x / cell)},${Math.round(z / cell)}`, q: [number, number][] = [[START.at[0], START.at[1]]]; seen.add(k(...q[0]));
  while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) { const nx = x + dx, nz = z + dz, kk = k(nx, nz); if (seen.has(kk) || !walkable(nx, nz)) continue; seen.add(kk); q.push([nx, nz]); } }
  return (x: number, z: number) => seen.has(k(x, z));
}
describe('Tokat — Kalıp Bas', () => {
  const r = reach();
  it('tezgâha ve duraklara yürünür', () => {
    expect(r(BENCH_AT[0], BENCH_AT[1])).toBe(true); expect(atBench(BENCH_AT[0], BENCH_AT[1])).toBe(true);
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
  });
  it('önce kalıplar, sonra boyalar; yanlış kalıp ve erken boya reddedilir', () => {
    let c = emptyCloth(); expect(phaseOf(c)).toBe('kalip');
    expect(apply(c, 4, { kalip: 'gul' }).reason).toBe('yanlis');
    c = apply(c, 0, { kalip: 'gul' }).cloth; expect(apply(c, 0, { color: 'kirmizi' }).reason).toBe('once-hepsi');
    for (let i = 0; i < 9; i++) { const res = apply(c, i, { kalip: TARGET[i].k }); if (res.ok) c = res.cloth; }
    expect(phaseOf(c)).toBe('kalem');
    expect(apply(c, 1, { color: 'kirmizi' }).reason).toBe('yanlis');
    for (let i = 0; i < 9; i++) c = apply(c, i, { color: TARGET[i].c }).cloth;
    expect(phaseOf(c)).toBe('bitti');
  });
});
