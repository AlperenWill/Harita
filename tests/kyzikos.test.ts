import { describe, expect, it } from 'vitest';
import { ANCHOR, BOUNDS, CAPITAL, COLUMNS, DRUMS, LENS_TARGETS, PIERS, PODIUM, PODIUM_H, SPOTS, START, TRENCHES, groundY, lensTargetsAt, walkable } from '../src/app/games/kyzikos/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Kyzikos Antik Kenti', () => {
  it('yoldan 6 durağın hepsine yürünür (podyum rampadan çıkılır)', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(6);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('podyumun dik kenarı geçilmez; rampa ağzı açıktır; engeller geçilmez', () => {
    expect(walkable(PODIUM.x0 + 0.3, -10)).toBe(false);
    expect(walkable(0, PODIUM.z1 - 0.3)).toBe(true);
    expect(walkable((CAPITAL.x0 + CAPITAL.x1) / 2, (CAPITAL.z0 + CAPITAL.z1) / 2)).toBe(false);
    for (const t of TRENCHES) expect(walkable((t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2)).toBe(false);
    for (const c of [...COLUMNS, ...DRUMS]) expect(walkable(c[0], c[1])).toBe(false);
    expect(walkable(ANCHOR.c[0], ANCHOR.c[1])).toBe(false);
    expect(groundY(0, -10)).toBeCloseTo(PODIUM_H, 5);
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
  it('amfiteatrın kemer ayakları geçilmez; zaman merceğinin iki hedefi de yürünerek görülebilir', () => {
    for (const c of PIERS) expect(walkable(c[0], c[1])).toBe(false);
    const r = reach();
    for (const t of LENS_TARGETS) { let ok = false;
      for (let x = t.c[0] - t.r; x <= t.c[0] + t.r && !ok; x += 1) for (let z = t.c[1] - t.r; z <= t.c[1] + t.r && !ok; z += 1) if (r(x, z) && lensTargetsAt(x, z).includes(t.id)) ok = true;
      expect(ok, t.id).toBe(true); }
    expect(lensTargetsAt(START.at[0], START.at[1])).toEqual([]);
  });
});
