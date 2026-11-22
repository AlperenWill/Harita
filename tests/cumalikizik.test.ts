import { describe, expect, it } from 'vitest';
import { BOUNDS, HOUSES, SPOTS, START, heightAt, houseSamples, onStreet, walkable } from '../src/app/games/cumalikizik/village';

/** Izgara üzerinde başlangıçtan erişilebilen hücreler (BFS) */
function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}

describe('Cumalıkızık köyü', () => {
  it('başlangıç yürünebilir ve 10 durağın hepsine yürüyerek ulaşılır', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(10);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('duraklar birbirinden ayrık ve kaynaklı', () => {
    for (const a of SPOTS) { expect(a.source.url).toMatch(/^https:\/\//); for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(8); }
  });
  it('evler sokağa taşmıyor ve köy yeterince dolu', () => {
    expect(HOUSES.length).toBeGreaterThan(50);
    for (const h of HOUSES) for (const p of houseSamples(h, 5)) expect(onStreet(p[0], p[1], -0.2), h.id).toBe(false);
    for (const id of ['ev-tokmak', 'ev-cumba', 'ev-hatil', 'ev-kerpic', 'ev-avlu']) expect(HOUSES.some((h) => h.id === id), id).toBe(true);
  });
  it('arazi yumuşak: 0,5 m adımda ani sıçrama yok', () => {
    for (let x = -60; x < 60; x += 3) for (let z = -90; z < 80; z += 0.5) expect(Math.abs(heightAt(x, z + 0.5) - heightAt(x, z))).toBeLessThan(0.1);
  });
});
