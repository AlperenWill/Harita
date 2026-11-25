import { describe, expect, it } from 'vitest';
import { BOUNDS, PEN, RELIEFS, SPOTS, START, VIEW_AT, atView, groundY, nearRelief, reliefFront, walkable } from '../src/app/games/amasra/site';

function reach() {
  const cell = 0.4, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b); if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.6) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Amasra — Taştaki Armalar', () => {
  const r = reach();
  it('karadan kapıyla kaleye, kabartmalara, köprüden Boztepe seyir yerine yürünür', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    for (const [k, rl] of RELIEFS.entries()) { const f = reliefFront(rl.a); expect(r(f[0], f[1]), rl.id).toBe(true); expect(nearRelief(f[0], f[1], [])).toBe(k); }
    expect(r(VIEW_AT[0], VIEW_AT[1])).toBe(true); expect(atView(VIEW_AT[0], VIEW_AT[1])).toBe(true);
  });
  it('surun üstünden ya da denizden geçilmez', () => {
    expect(walkable(PEN.rx * 0.9, 0)).toBe(false); expect(walkable(-PEN.rx * 0.9, 0)).toBe(false);
    expect(walkable(25, 32)).toBe(false); expect(walkable(0, 0)).toBe(true);
  });
});
