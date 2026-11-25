import { describe, expect, it } from 'vitest';
import { ACRO, AIM_TOL, BOUNDS, MAX_SLOPE, SPOTS, START, TARGETS, WATCH, WATCH_EYE, aimAt, groundY, nearDoor, walkable, TOWER_DOOR } from '../src/app/games/tios/site';

function reach() {
  const seen = new Set<string>(), cell = 0.4, k = (x: number, z: number) => `${Math.round(x / cell)},${Math.round(z / cell)}`, q: [number, number][] = [[START.at[0], START.at[1]]]; seen.add(k(...q[0]));
  while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[cell, 0], [-cell, 0], [0, cell], [0, -cell]]) { const nx = x + dx, nz = z + dz, kk = k(nx, nz);
    if (nx < BOUNDS.x0 || nx > BOUNDS.x1 || nz < BOUNDS.z0 || nz > BOUNDS.z1 || seen.has(kk) || !walkable(nx, nz) || Math.abs(groundY(nx, nz) - groundY(x, z)) / cell >= MAX_SLOPE) continue; seen.add(kk); q.push([nx, nz]); } }
  return (x: number, z: number) => seen.has(k(x, z));
}
describe('Tios — Gözcü Kulesi', () => {
  const r = reach();
  it('gözcü kulesinin kapısına (akropol düzlüğü) ve duraklara yürünür', () => {
    expect(r(TOWER_DOOR[0], TOWER_DOOR[1])).toBe(true); expect(nearDoor(TOWER_DOOR[0], TOWER_DOOR[1])).toBe(true); expect(groundY(TOWER_DOOR[0], TOWER_DOOR[1])).toBe(ACRO.h); expect(walkable(WATCH[0], WATCH[1])).toBe(false);
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
  });
  it('kuzeybatı yamacı dik, güneydoğu rampası yürünür eğimde', () => { const x = ACRO.cx - ACRO.rx * 1.05; expect(Math.abs(groundY(x - 0.5, ACRO.cz) - groundY(x + 0.5, ACRO.cz))).toBeGreaterThan(MAX_SLOPE); });
  it('her hedefe tam bakınca bulunur, ters yöne bakınca bulunmaz', () => {
    const from = WATCH_EYE;
    for (const [i, t] of TARGETS.entries()) {
      const dx = t.at[0] - from[0], dy = t.at[1] - from[1], dz = t.at[2] - from[2], yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz));
      const a = aimAt(yaw, pitch, []); expect(a.k, t.id).toBe(i); expect(a.angle).toBeLessThan(AIM_TOL);
      expect(aimAt(yaw + Math.PI, pitch, [t.id]).k === i).toBe(false);
      expect(t.source.url).toMatch(/^https:\/\//);
    }
    // hedefler birbirinden yeterince ayrı (tolerans içinde iki hedef olmasın)
    for (let i = 0; i < TARGETS.length; i++) for (let j = i + 1; j < TARGETS.length; j++) { const a = TARGETS[i].at, b = TARGETS[j].at, u = a.map((v, k) => v - from[k]), v = b.map((w, k) => w - from[k]);
      const c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v)); expect(Math.acos(c)).toBeGreaterThan(AIM_TOL * 2.5); }
  });
});
