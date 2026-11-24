import { describe, expect, it } from 'vitest';
import { BOUNDS, BOUNDS_Z, LEVELS, SPOTS, STAIRS, START, STEP, ZIN, boundaryZ, groundY, hazeFar, levelOf, walkable } from '../src/app/games/mardin/site';

function reach() {
  const cell = 0.25, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.4) continue; seen[k] = 1; q.push(k); } }
  return { r: (x: number, z: number) => seen[idx(x, z)] === 1, seen, at, nx };
}
describe('Mardin — Damdan Dama', () => {
  const R = reach();
  it('alt sokaktan bütün duraklara yürünür; medresenin avlusu ve damı dahil', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true); expect(groundY(START.at[0], START.at[1])).toBe(0);
    for (const s of SPOTS) expect(R.r(s.at[0], s.at[1]), s.id).toBe(true);
    expect(groundY(0, 8.4)).toBe(5 * STEP);   // dam
    expect(groundY(2, 0)).toBe(3 * STEP);   // avlu
  });
  it('her kademeye çıkılır; kademe sınırları merdiven dışında geçilmez', () => {
    const levels = new Set<number>();
    R.seen.forEach((v, k) => { if (!v) return; const i = k % R.nx, j = (k - i) / R.nx, [x, z] = R.at(i, j); levels.add(levelOf(groundY(x, z))); });
    for (let k = 0; k < LEVELS; k++) expect(levels.has(k), `kademe ${k}`).toBe(true);
    for (let j = 0; j < BOUNDS_Z.length; j++) for (let x = -58; x < 58; x += 0.5) { if (STAIRS.some((s) => s.j === j && Math.abs(s.x - x) < 2.5)) continue; if ((j === 4 || j === 3) && x > ZIN.x0 && x < ZIN.x1) continue;
      expect(walkable(x, boundaryZ(j, x)), `${j}:${x}`).toBe(false); }
  });
  it('yürünen yolda ani yükseklik sıçraması yok', () => {
    for (let k = 0; k < R.seen.length; k++) { if (!R.seen[k]) continue; const i = k % R.nx, j = (k - i) / R.nx, [x, z] = R.at(i, j);
      for (const [dx, dz] of [[0.25, 0], [0, 0.25]]) { if (!R.r(x + dx, z + dz) || !walkable(x + dx / 2, z + dz / 2)) continue; expect(Math.abs(groundY(x + dx, z + dz) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.4); } }
  });
  it('duraklar kaynaklı ve ayrık; pus yükseldikçe açılır', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(5);
    expect(hazeFar(18)).toBeGreaterThan(hazeFar(0) * 3);
  });
});
