import { describe, expect, it } from 'vitest';
import { BOUNDS, ROUTE, SHIP, SPOTS, START, TABLE_AT, atTable, groundY, halfBeam, nextOk, walkable } from '../src/app/games/bandirma/site';

function reach() {
  const cell = 0.2, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b); if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.6) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Bandırma — Seyir Defteri', () => {
  const r = reach();
  it('parktan iskeleyle güverteye, salondaki harita masasına ve duraklara yürünür', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    expect(r(TABLE_AT[0], TABLE_AT[1])).toBe(true); expect(atTable(TABLE_AT[0], TABLE_AT[1])).toBe(true); expect(groundY(TABLE_AT[0], TABLE_AT[1])).toBe(SHIP.deckY);
  });
  it('gövde kaynaktaki ölçülerde; güverteden aşağı atlanmaz', () => {
    expect(halfBeam(0) * 2).toBeCloseTo(6.9, 1); expect(halfBeam(SHIP.L / 2 + 0.1)).toBe(0);
    expect(walkable(0, 3.4)).toBe(false); expect(groundY(0, 4.2)).toBe(0);
  });
  it('rota: İstanbul → Sinop → Samsun', () => {
    expect(nextOk([], 'istanbul')).toBe(true); expect(nextOk([], 'samsun')).toBe(false);
    expect(nextOk(['istanbul'], 'sinop')).toBe(true); expect(nextOk(['istanbul', 'sinop'], 'samsun')).toBe(true); expect(ROUTE.length).toBe(3);
  });
});
