import { describe, expect, it } from 'vitest';
import { ARCH, ARCH_AT, BOARD_ORDER, BOUNDS, EVENTS, MAP_Q, MAP_STEPS, SPOTS, START, TABLE_FRONT, TARGETS, TIMELINE_AT, boardFront, groundY, nearBoard, orderOk, shoot, walkable } from '../src/app/games/malazgirt/site';

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
  it('okçuluk: her hedef bir atış açısıyla vurulur; yere bakan atış vurmaz; atış yerine ve masaya yürünür', () => {
    expect(r(ARCH_AT[0], ARCH_AT[1])).toBe(true); expect(r(TABLE_FRONT[0], TABLE_FRONT[1])).toBe(true);
    const o: [number, number, number] = [ARCH_AT[0], groundY(ARCH_AT[0], ARCH_AT[1]) + ARCH.eye, ARCH_AT[1]];
    for (const [k, t] of TARGETS.entries()) { let ok = false; for (let p = -0.05; p < 0.3 && !ok; p += 0.002) { const dx = t.x - o[0], dz = t.z - o[2], L = Math.hypot(dx, dz), d: [number, number, number] = [(dx / L) * Math.cos(p), Math.sin(p), (dz / L) * Math.cos(p)]; ok = shoot(o, d, (ARCH.minV + ARCH.maxV) / 2) === k; } expect(ok, `hedef ${k}`).toBe(true); }
    expect(shoot(o, [0.7, -0.7, 0], 40)).toBe(-1);
  });
  it('kum masası adımları ve soru tutarlı', () => {
    expect(MAP_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const st of MAP_STEPS) for (const p of [...st.b, st.r, ...st.s]) { expect(Math.abs(p[0])).toBeLessThanOrEqual(1); expect(Math.abs(p[1])).toBeLessThanOrEqual(1); }
    expect(MAP_Q.correct).toBeLessThan(MAP_Q.options.length);
  });
});
