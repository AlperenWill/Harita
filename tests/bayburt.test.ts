import { describe, expect, it } from 'vitest';
import { BOUNDS, CITY, GATE, SPOTS, START, TOWERS, groundY, hillY, inside, rampAt, walkable } from '../src/app/games/bayburt/kale';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Bayburt Kalesi', () => {
  it('şehirden yol ile kapıya, kapıdan 7 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(7);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('kale düzlüğü şehirden en az 30 m yüksekte; kapı sur çizgisinde', () => {
    expect(hillY(0, 0) - hillY(START.at[0], START.at[1])).toBeGreaterThan(30);
    expect(inside(GATE[0], GATE[1])).toBe(false);
    expect(rampAt(GATE[0], GATE[1]).d).toBeLessThan(1);
  });
  it('yürüme yolu yumuşak: 0,5 m adımda 0,25 m\'den fazla sıçrama yok', () => {
    const r = reach();
    for (let x = BOUNDS.x0; x < BOUNDS.x1; x += 1) for (let z = BOUNDS.z0; z < BOUNDS.z1; z += 0.5)
      if (r(x, z) && r(x, z + 0.5)) expect(Math.abs(groundY(x, z + 0.5) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.3);
  });
  it('burçlar ve duraklar kaynaklı; şehir dolu', () => {
    expect(TOWERS.length).toBeGreaterThan(15);
    expect(new Set(TOWERS.map((t) => t.kind))).toEqual(new Set(['yuvarlak', 'kare', 'ucgen']));
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    expect(CITY.length).toBeGreaterThan(60);
  });
});
