import { describe, expect, it } from 'vitest';
import { BOUNDS, BREACH_AT, HERDS, SPOTS, START, TROUGH, atBreach, atTrough, groundY, nearHerd, walkable } from '../src/app/games/harput/site';

function reach() {
  const cell = 0.25, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.3) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Harput — Süt Kalesi', () => {
  const r = reach();
  it('sürülere, harç teknesine, gediğe ve duraklara yürünür', () => {
    for (const [i, h] of HERDS.entries()) { const p: [number, number] = [h[0] + 2, h[1]]; expect(r(...p), `sürü ${i}`).toBe(true); expect(nearHerd(...p)).toBe(i); }
    const t: [number, number] = [TROUGH[0] - 1.6, TROUGH[1]]; expect(r(...t)).toBe(true); expect(atTrough(...t)).toBe(true);
    expect(r(BREACH_AT[0], BREACH_AT[1])).toBe(true); expect(atBreach(BREACH_AT[0], BREACH_AT[1])).toBe(true);
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('surdan yalnız güney kapısından geçilir', () => { expect(walkable(0, 27)).toBe(true); expect(walkable(27, 0)).toBe(false); expect(walkable(-27, 0)).toBe(false); });
  it('kaynaklı', () => { for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//); });
});
