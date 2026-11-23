import { describe, expect, it } from 'vitest';
import { BOUNDS, DECK_H, DECK_X, HALF_W, RAMP_X, SPOTS, START, groundY, walkable } from '../src/app/games/justinianus/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Justinianus (Beşköprü) Köprüsü', () => {
  it('ovadan 5 durağın hepsine yürünür (tabliyeye rampadan çıkılır)', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(5);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    expect(groundY(0, 0)).toBe(DECK_H);
  });
  it('parapet bandı geçilmez; tabliye ve rampa yürünür', () => {
    expect(walkable(0, HALF_W + 0.3)).toBe(false);
    expect(walkable(DECK_X + 10, HALF_W + 0.3)).toBe(false);
    expect(walkable(0, 0)).toBe(true);
    expect(walkable(DECK_X + 10, 0)).toBe(true);
    expect(walkable(RAMP_X + 3, HALF_W + 0.3)).toBe(true);   // rampa bitti, ova
  });
  it('dere ovada yürünmez; doğu yakaya köprüden geçilir', () => {
    expect(walkable(6, 20)).toBe(false);
    const r = reach();
    expect(r(-20, 20)).toBe(true);
    expect(r(130, 20)).toBe(true);   // doğu ova: yalnızca tabliye üzerinden
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
