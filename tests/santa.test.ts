import { describe, expect, it } from 'vitest';
import { BOUNDS, HAMLETS, SPOTS, START, churchFront, fogFar, groundY, nearChurch, walkable } from '../src/app/games/santa/site';

function reach() {
  const cell = 1, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b); if (seen[k] || !walkable(x, z) || groundY(x, z) - groundY(x0, z0) > 1.0) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Santa — Sisteki Yedi Kilise', () => {
  const r = reach();
  it('yedi kilisenin önüne ve duraklara yürünür; adım başına tırmanış sınırlı', () => {
    for (const [i, h] of HAMLETS.entries()) { const f = churchFront(h); expect(r(Math.round(f[0]), Math.round(f[1])), h.id).toBe(true); expect(nearChurch(f[0], f[1], [])).toBe(i); }
    for (const s of SPOTS) { expect(r(Math.round(s.at[0]), Math.round(s.at[1])), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
  });
  it('sis kiliseler bulundukça açılır', () => { expect(fogFar(7)).toBeGreaterThan(fogFar(0) * 4); });
});
