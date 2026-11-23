import { describe, expect, it } from 'vitest';
import { BOUNDS, CHIMNEY, HALL, MACHINE, POND, PRESSES, SPOTS, START, VITRINS, groundY, walkable } from '../src/app/games/seka/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('SEKA Kâğıt Müzesi', () => {
  it('avludan 6 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(6);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('kapıdan girilir; duvarlar, makine, vitrinler, matbaalar, baca ve havuz geçilmez', () => {
    expect(walkable(-22, HALL.z1 + 0.2)).toBe(true);       // kapı
    expect(walkable(0, HALL.z1 + 0.2)).toBe(false);        // duvar
    expect(walkable((MACHINE.x0 + MACHINE.x1) / 2, 0)).toBe(false);
    for (const v of VITRINS) expect(walkable((v.x0 + v.x1) / 2, (v.z0 + v.z1) / 2)).toBe(false);
    for (const p of PRESSES) expect(walkable((p.x0 + p.x1) / 2, (p.z0 + p.z1) / 2)).toBe(false);
    expect(walkable(CHIMNEY.c[0], CHIMNEY.c[1])).toBe(false);
    expect(walkable(POND.c[0], POND.c[1])).toBe(false);
  });
  it('makinenin iki yanından ve uçlarından dolaşılır', () => {
    const r = reach();
    expect(r(0, -8)).toBe(true); expect(r(0, 8)).toBe(true); expect(r(-28, 0)).toBe(true); expect(r(18, 0)).toBe(true);
  });
  it('zemin düz', () => { expect(groundY(0, 0)).toBe(0); });
  it('duraklar kaynaklı ve birbirinden ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(3);
  });
});
