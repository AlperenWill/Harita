import { describe, expect, it } from 'vitest';
import { BOARD_ORDER, BOUNDS, EVENTS, SPOTS, START, TIMELINE_AT, boardFront, nearBoard, orderOk, walkable } from '../src/app/games/malazgirt/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b); if (seen[k] || !walkable(x, z)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Malazgirt — Zaman Çizelgesi', () => {
  const r = reach();
  it('panolara, çizelgeye ve duraklara yürünür', () => {
    for (let k = 0; k < BOARD_ORDER.length; k++) { const f = boardFront(k); expect(r(f[0], f[1]), `${k}`).toBe(true); expect(nearBoard(f[0], f[1], [])).toBe(k); }
    expect(r(TIMELINE_AT[0], TIMELINE_AT[1])).toBe(true);
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('panolar yol boyunca karışık; çizelgenin tek doğru sırası var', () => {
    expect(new Set(BOARD_ORDER)).toEqual(new Set(EVENTS.map((e) => e.id)));
    expect(orderOk(BOARD_ORDER)).toBe(false);
    expect(orderOk([...EVENTS].sort((a, b) => a.order - b.order).map((e) => e.id))).toBe(true);
    for (const e of EVENTS) expect(e.source.url).toMatch(/^https:\/\//);
  });
});
