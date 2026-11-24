import { describe, expect, it } from 'vitest';
import { BOUNDS, CUTS, PERIODS, SPOTS, START, STEPS, canDig, groundY, nearestCut, orderOk, walkable } from '../src/app/games/oylum/site';

function reach() {
  const cell = 0.25, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.3) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Oylum Höyük — Katman Katman', () => {
  const r = reach();
  it('başlangıçtan durakların ve üç kesitin önüne yürünür', () => {
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    for (const c of CUTS) { expect(r(c.at[0], c.at[1]), `kesit ${c.k}`).toBe(true); expect(nearestCut(c.at[0], c.at[1])?.k).toBe(c.k); }
  });
  it('alttaki düzlük daha alçakta; kesitler rampa dışında geçilmez', () => {
    for (let i = 1; i < STEPS.length; i++) expect(STEPS[i].y).toBeLessThan(STEPS[i - 1].y);
    expect(walkable(-2, STEPS[1].z0)).toBe(false); expect(walkable(-2, STEPS[2].z0)).toBe(false);
    expect(CUTS.map((c) => c.face[1])).toEqual([...CUTS.map((c) => c.face[1])].sort((a, b) => b - a));
  });
  it('kazı yukarıdan aşağı; dönem sırası en altta en eski', () => {
    expect(canDig(0, [])).toBe(true); expect(canDig(2, [0])).toBe(false); expect(canDig(2, [0, 1])).toBe(true);
    expect(orderOk({ 0: 'mo2b', 1: 'mo2a', 2: 'mo3' })).toBe(true);
    expect(orderOk({ 0: 'mo3', 1: 'mo2a', 2: 'mo2b' })).toBe(false);
    expect(PERIODS).toHaveLength(CUTS.length);
  });
  it('duraklar ve buluntular kaynaklı', () => { for (const s of [...SPOTS, ...CUTS]) expect(s.source.url).toMatch(/^https:\/\//); });
});
