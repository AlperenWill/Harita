import { describe, expect, it } from 'vitest';
import { BOUNDS, CELLS, POOL, SPOTS, START, groundY, walkable } from '../src/app/games/meydanmedrese/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Meydan Medresesi', () => {
  it('meydandan 5 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(5);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('taç kapıdan avluya girilir; duvarlar, hücreler ve havuz geçilmez', () => {
    expect(walkable(0, 15)).toBe(true);      // taç kapı
    expect(walkable(6, 15)).toBe(false);     // duvar
    expect(walkable(0, -15.2)).toBe(true);   // eyvan geçidi
    expect(walkable(-6, -15.2)).toBe(false); // kuzey duvarı
    for (const c of CELLS) expect(walkable((c.x0 + c.x1) / 2, 0)).toBe(false);
    expect(walkable(POOL.x, POOL.z)).toBe(false);
  });
  it('yükseklik düz: adım farkı yok', () => {
    for (const x of [-20, 0, 20]) expect(groundY(x, 0)).toBe(0);
  });
  it('duraklar kaynaklı ve birbirinden ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(3);
  });
});
