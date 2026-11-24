import { describe, expect, it } from 'vitest';
import { BOUNDS, CLAIMS, CLUES, SPOTS, START, TURBE, matchOk, nearestClue, walkable } from '../src/app/games/ciftemin/site';

function reach() {
  const cell = 0.25, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Çifte Minareli Medrese — Kitabesiz Kapı', () => {
  const r = reach();
  it('başlangıçtan duraklara, ipuçlarına ve türbenin içine yürünür', () => {
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    for (const c of CLUES) { expect(r(c.at[0], c.at[1]), c.id).toBe(true); expect(nearestClue(c.at[0], c.at[1], [])?.id).toBe(c.id); }
    expect(r(TURBE.x, TURBE.z)).toBe(true);
  });
  it('medrese duvarlarından ve minare payandalarından geçilmez', () => {
    expect(walkable(-12, -20)).toBe(false); expect(walkable(14, 18)).toBe(false); expect(walkable(-8.2, -25.2)).toBe(false);
  });
  it('pano: her iddia kendi dayanağıyla eşleşir', () => {
    expect(matchOk(Object.fromEntries(CLAIMS.map((c) => [c.id, c.ev])))).toBe(true);
    expect(matchOk({ a: 'kitabe', b: 'turbe', c: 'yarim' })).toBe(false);
    expect(new Set(CLAIMS.map((c) => c.ev)).size).toBe(CLUES.length);
  });
  it('kaynaklı', () => { for (const s of [...SPOTS, ...CLUES]) expect(s.source.url).toMatch(/^https:\/\//); });
});
