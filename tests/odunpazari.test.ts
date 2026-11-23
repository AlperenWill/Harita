import { describe, expect, it } from 'vitest';
import { BOUNDS, BUILD_STEPS, HOUSES, LANE, LOT, LOT_AT, LOT_HOUSE, SPOTS, START, groundY, walkable } from '../src/app/games/odunpazari/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Odunpazarı Evleri', () => {
  it('giriş sokağından 5 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(5);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('evlerin içine girilmez; sokak dışı yürünmez', () => {
    for (const h of HOUSES) expect(walkable(h.x, h.z), `${h.x},${h.z}`).toBe(false);
    expect(walkable(LANE.x1 + 3, 0)).toBe(false);
  });
  it('yükseklik sürekli: 0,5 m adımda 0,3 m\'den fazla sıçrama yok', () => {
    for (let z = BOUNDS.z0; z < BOUNDS.z1 - 0.5; z += 0.5) expect(Math.abs(groundY(0, z + 0.5) - groundY(0, z))).toBeLessThan(0.3);
  });
  it('duraklar kaynaklı ve birbirinden ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(3);
  });
  it('restorasyon parseli: boş, komşu evlerle çakışmaz, önü yürünür; altı yapım adımı', () => {
    expect(BUILD_STEPS).toHaveLength(6);
    for (const h of HOUSES) { const ov = Math.abs(h.x - LOT_HOUSE.x) < (h.w + LOT_HOUSE.w) / 2 - 0.01 && Math.abs(h.z - LOT_HOUSE.z) < (h.d + LOT_HOUSE.d) / 2 - 0.01; expect(ov).toBe(false); }
    expect(walkable((LOT.x0 + LOT.x1) / 2, (LOT.z0 + LOT.z1) / 2)).toBe(false);
    expect(reach()(LOT_AT[0], LOT_AT[1])).toBe(true);
  });
});
