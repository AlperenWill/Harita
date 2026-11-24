import { describe, expect, it } from 'vitest';
import { BOUNDS, ERODED, NICHES, SPOTS, START, lobeFront, nearLobe, nearNiche, nichePos, walkable } from '../src/app/games/mamahatun/site';

function reach() {
  const cell = 0.2, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Mama Hatun — Halka Duvar', () => {
  const r = reach();
  it('kapıdan halka koridora girilir; her nişe ve aşınmış dilime ulaşılır', () => {
    expect(NICHES).toHaveLength(13);
    for (let i = 0; i < NICHES.length; i++) { const p = nichePos(i); expect(r(p[0], p[1]), `niş ${i}`).toBe(true); expect(nearNiche(p[0], p[1])).toBe(i); }
    for (const k of ERODED) { const p = lobeFront(k); expect(r(p[0], p[1]), `dilim ${k}`).toBe(true); expect(nearLobe(p[0], p[1], [])).toBe(k); }
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('duvar yalnız batıdaki kapıdan geçilir; kümbete girilmez', () => {
    expect(walkable(-7.4, 0)).toBe(true); expect(walkable(7.4, 0)).toBe(false); expect(walkable(0, 7.4)).toBe(false); expect(walkable(0, 0)).toBe(false);
  });
  it('nişler ayrık', () => { for (let i = 0; i < 13; i++) for (let j = i + 1; j < 13; j++) { const a = nichePos(i), b = nichePos(j); expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(2.2); } });
});
