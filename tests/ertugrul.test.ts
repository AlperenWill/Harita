import { describe, expect, it } from 'vitest';
import { BOUNDS, BUSTS, GARDEN, GATE, MOSQUE, POSTS, SPOTS, START, TENT, TOMB, WALL_T, groundY, walkable } from '../src/app/games/ertugrul/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Ertuğrul Gazi Türbesi', () => {
  it('meydandan 6 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(6);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('bahçeye yalnızca kapıdan girilir; türbe, nöbet noktaları, büstler, cami ve çadır geçilmez', () => {
    expect(walkable(0, GARDEN.z1 + WALL_T / 2)).toBe(true);
    expect(walkable(10, GARDEN.z1 + WALL_T / 2)).toBe(false);
    expect(walkable(GARDEN.x1 + WALL_T / 2, -10)).toBe(false);
    expect(GATE.x1 - GATE.x0).toBeGreaterThan(4);
    expect(walkable(TOMB.c[0], TOMB.c[1])).toBe(false);
    for (const p of [...POSTS, ...BUSTS]) expect(walkable(p[0], p[1])).toBe(false);
    expect(BUSTS).toHaveLength(16);
    expect(walkable(MOSQUE.c[0], MOSQUE.c[1])).toBe(false);
    expect(walkable(TENT.c[0], TENT.c[1])).toBe(false);
  });
  it('yükseklik sürekli: 0,5 m adımda 0,3 m\'den fazla sıçrama yok', () => {
    const r = reach();
    for (let x = BOUNDS.x0; x < BOUNDS.x1; x += 0.5) for (let z = BOUNDS.z0; z < BOUNDS.z1; z += 0.5) {
      if (r(x, z) && r(x + 0.5, z)) expect(Math.abs(groundY(x + 0.5, z) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.3);
      if (r(x, z) && r(x, z + 0.5)) expect(Math.abs(groundY(x, z + 0.5) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.3);
    }
  });
  it('duraklar kaynaklı ve birbirinden ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(3);
  });
});
