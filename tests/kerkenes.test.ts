import { describe, expect, it } from 'vitest';
import { BOUNDS, GATE_ANGLES, HOUSES, NCELL, PLOTS, PLOT_SIZE, RING, SPOTS, START, cellsNear, groundY, magAt, plotAt, walkable } from '../src/app/games/kerkenes/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Kerkenes Dağı', () => {
  it('güney kapısından başlanıp 5 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(5);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('sur yalnızca kapılardan geçilir; kapı dışında sur geçilmez', () => {
    const r = RING.r0 + 4;
    expect(walkable(0, -r)).toBe(false);   // kuzeyde sur, kapı yok
    expect(walkable(0, r)).toBe(true);     // güney kapısı
    const gx = Math.cos(GATE_ANGLES[1]) * r, gz = Math.sin(GATE_ANGLES[1]) * r;
    expect(walkable(Math.cos(GATE_ANGLES[1] + 0.45) * r, Math.sin(GATE_ANGLES[1] + 0.45) * r)).toBe(false);
    expect(walkable(gx, gz)).toBe(true);
  });
  it('evler ve saray geçilmez; ışınsal sokaklar açık kalır', () => {
    for (const h of HOUSES.slice(0, 10)) expect(walkable(h.x, h.z), `${h.x},${h.z}`).toBe(false);
    expect(walkable(0, -50)).toBe(false);
    for (const a of GATE_ANGLES) expect(walkable(Math.cos(a) * 60, Math.sin(a) * 60), `${a}`).toBe(true);
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
  it('tarama alanları: içinde ev yok, hücrelerin en az %85\'i yürünerek taranabilir, plan duvarları güçlü iz verir', () => {
    const r = reach();
    for (const p of PLOTS) {
      for (const h of HOUSES) expect(Math.abs(h.x - p.c[0]) > PLOT_SIZE / 2 || Math.abs(h.z - p.c[1]) > PLOT_SIZE / 2, p.id).toBe(true);
      const got = new Set<number>(); for (let x = p.c[0] - PLOT_SIZE / 2; x <= p.c[0] + PLOT_SIZE / 2; x += 0.5) for (let z = p.c[1] - PLOT_SIZE / 2; z <= p.c[1] + PLOT_SIZE / 2; z += 0.5) if (plotAt(x, z) === p && r(x, z)) for (const k of cellsNear(p, x, z)) got.add(k);
      expect(got.size / (NCELL * NCELL), p.id).toBeGreaterThanOrEqual(0.85);
      let strong = 0; for (let j = 0; j < NCELL; j++) for (let i = 0; i < NCELL; i++) if (magAt(p, i, j) > 0.8) strong++; expect(strong, p.id).toBeGreaterThan(8);
    }
  });
});
