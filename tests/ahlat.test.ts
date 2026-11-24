import { describe, expect, it } from 'vitest';
import { BOUNDS, NI, NJ, SPOTS, STELES, START, graveAt, hasGrave, nearestStele, pairOk, steleFront, walkable } from '../src/app/games/ahlat/site';

function reach() {
  const cell = 0.25, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Ahlat — Taştaki İmza', () => {
  const r = reach();
  it('başlangıçtan durakların ve süslü şahidelerin önüne yürünür', () => {
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    for (const s of STELES) { const f = steleFront(s); expect(r(f[0], f[1]), s.id).toBe(true); expect(nearestStele(f[0], f[1], [])?.id).toBe(s.id); }
  });
  it('mezarların üstünden geçilmez; mezarlık kalabalık', () => {
    let n = 0; for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) if (hasGrave(i, j)) { n++; const g = graveAt(i, j); expect(walkable(g.x, g.z)).toBe(false); }
    expect(n).toBeGreaterThan(600);
    for (const s of STELES) expect(hasGrave(...s.cell)).toBe(true);
  });
  it('aynı ustanın tek bir çifti var', () => {
    expect(pairOk('ejder', 'geometrik')).toBe(true); expect(pairOk('geometrik', 'ejder')).toBe(true);
    expect(pairOk('ejder', 'palmet')).toBe(false); expect(pairOk('kandil', 'palmet')).toBe(false);
  });
  it('duraklar kaynaklı', () => { for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//); });
});
