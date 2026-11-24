import { describe, expect, it } from 'vitest';
import { BOUNDS, GATE, HOUSES, LENS, RAMP, SPOTS, START, TARGETS, TOWERS, WALK_Y, WALL, aimedTarget, groundY, walkable } from '../src/app/games/diyarbakirsur/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; const [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.6) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Diyarbakır Surları', () => {
  const r = reach();
  it('başlangıçtan bütün duraklara yürünür (sur üstü dahil)', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    expect(SPOTS.filter((s) => groundY(s.at[0], s.at[1]) === WALK_Y).length).toBeGreaterThanOrEqual(2);
  });
  it('sur yalnızca Mardin Kapı\'dan geçilir; burçların içine girilmez', () => {
    expect(walkable(GATE.x, 0)).toBe(true); expect(groundY(GATE.x, 0)).toBe(0);   // kapı geçidi yerde
    expect(groundY(GATE.x - 10, 0)).toBe(WALK_Y);
    expect(walkable(GATE.x, WALL.zOut + 0.5)).toBe(true);
    expect(walkable(GATE.x + 12, WALL.zOut + 0.4)).toBe(false);
    for (const t of TOWERS) expect(walkable(t.x, t.z + t.r * 0.95) && groundY(t.x, t.z + t.r * 0.95) < 1, t.id).toBe(false);
  });
  it('rampa sur üstüne bağlanır ve evler yolu kapamaz', () => {
    const x = (RAMP.x0 + RAMP.x1) / 2;
    expect(r(x, RAMP.zBot - 2)).toBe(true);
    expect(r(x, -0.5)).toBe(true);
    expect(groundY(x, (RAMP.zBot + RAMP.zTop) / 2)).toBeGreaterThan(3);
    for (const h of HOUSES) expect(walkable((h.x0 + h.x1) / 2, (h.z0 + h.z1) / 2)).toBe(false);
  });
  it('yürünen yolda 0,5 m adımda ani sıçrama yok', () => {
    for (let x = BOUNDS.x0; x < BOUNDS.x1; x += 0.5) for (let z = BOUNDS.z0; z < BOUNDS.z1; z += 0.5) {
      if (r(x, z) && r(x + 0.5, z) && walkable(x + 0.25, z)) expect(Math.abs(groundY(x + 0.5, z) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.6);
      if (r(x, z) && r(x, z + 0.5) && walkable(x, z + 0.25)) expect(Math.abs(groundY(x, z + 0.5) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.6);
    }
  });
  it('duraklar kaynaklı ve ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(8);
  });
  it('her kitabe yürünebilir bir yerden dürbünle görülür; arkadan okunmaz', () => {
    for (const t of TARGETS) {
      let ok = false;
      for (let d = 12; d <= t.max - 2 && !ok; d += 4) { const x = t.at[0] + t.n[0] * d, z = t.at[2] + t.n[1] * d; if (!r(x, z)) continue;
        const eye: [number, number, number] = [x, groundY(x, z) + 1.62, z], v = [t.at[0] - x, t.at[1] - eye[1], t.at[2] - z], l = Math.hypot(...v);
        ok = aimedTarget(eye, [v[0] / l, v[1] / l, v[2] / l])?.id === t.id; }
      expect(ok, t.id).toBe(true);
    }
    const t = TARGETS[0], eye: [number, number, number] = [t.at[0] - t.n[0] * 20, 2, t.at[2] - t.n[1] * 20], v = [t.at[0] - eye[0], t.at[1] - eye[1], t.at[2] - eye[2]], l = Math.hypot(...v);
    expect(aimedTarget(eye, [v[0] / l, v[1] / l, v[2] / l])).toBe(null);
    expect(LENS.aim).toBeLessThan(0.1);
  });
});
