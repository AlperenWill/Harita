import { describe, expect, it } from 'vitest';
import { APSE, ARCH_FEET, BOUNDS, DECK_H, DECK_X, FLOOD, GAUGE, HALF_W, PIER_X, RAMP_X, SPOTS, START, floodDanger, floodLevel, groundY, walkable } from '../src/app/games/justinianus/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Justinianus (Beşköprü) Köprüsü', () => {
  it('ovadan 7 durağın hepsine yürünür (tabliyeye rampadan çıkılır)', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(7);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    expect(groundY(0, 0)).toBe(DECK_H);
  });
  it('parapet bandı geçilmez; tabliye ve rampa yürünür', () => {
    expect(walkable(0, HALF_W + 0.3)).toBe(false);
    expect(walkable(DECK_X + 10, HALF_W + 0.3)).toBe(false);
    expect(walkable(0, 0)).toBe(true);
    expect(walkable(DECK_X + 10, 0)).toBe(true);
    expect(walkable(RAMP_X + 3, HALF_W + 0.3)).toBe(true);   // rampa bitti, ova
  });
  it('dere ovada yürünmez; doğu yakaya köprüden geçilir', () => {
    expect(walkable(6, 20)).toBe(false);
    const r = reach();
    expect(r(-20, 20)).toBe(true);
    expect(r(130, 20)).toBe(true);   // doğu ova: yalnızca tabliye üzerinden
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
  it('ayak mahmuzları, apsis, zafer takı temelleri ve ölçek direği geçilmez', () => {
    for (const x of PIER_X) { expect(walkable(x, HALF_W + 3)).toBe(false); expect(walkable(x, -HALF_W - 3)).toBe(false); }
    expect(walkable(APSE.c[0], APSE.c[1])).toBe(false);
    for (const f of ARCH_FEET) expect(walkable(f[0], f[1])).toBe(false);
    expect(walkable(GAUGE.c[0], GAUGE.c[1])).toBe(false);
  });
  it('taşkın eğrisi: sıfırdan tepeye çıkar, bekler, iner', () => {
    expect(floodLevel(0)).toBe(0);
    let prev = 0; for (let t = 0; t <= FLOOD.rise; t += 1) { const l = floodLevel(t); expect(l).toBeGreaterThanOrEqual(prev); prev = l; }
    expect(floodLevel(FLOOD.rise + 1)).toBeCloseTo(FLOOD.peak, 5);
    expect(floodLevel(FLOOD.rise + FLOOD.hold + FLOOD.fall + 1)).toBe(0);
    expect(floodDanger(FLOOD.peak, 8)).toBe('dry'); expect(floodDanger(0.5, 0)).toBe('wade'); expect(floodDanger(1.5, 0)).toBe('swept');
  });
  it('taşkın koşmadan da atlatılır: ölçekten tabliyeye yürüme hızında (suda yavaşlayarak) giden yol hiç sürüklenmez', () => {
    // 0,5 m ızgarada ölçekten tabliyeye en kısa yol (4 komşu: gerçek yoldan uzun, yani ihtiyatlı)
    const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, par = new Int32Array(nx * nz).fill(-2);
    const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
    const start = idx(GAUGE.c[0] + 1.5, GAUGE.c[1]), goal = idx(0, 0); par[start] = -1; const q = [start];
    for (let h = 0; h < q.length && par[goal] === -2; h++) { const c = q[h], i = c % nx, j = (c - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (par[k] !== -2 || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; par[k] = c; q.push(k); } }
    expect(par[goal]).not.toBe(-2);
    const path: number[] = []; for (let c = goal; c !== -1; c = par[c]) path.push(c); path.reverse();
    let t = 0, worst = 'dry';
    for (const c of path) { const i = c % nx, j = (c - i) / nx, x = BOUNDS.x0 + i * cell, z = BOUNDS.z0 + j * cell, d = floodDanger(floodLevel(t), groundY(x, z));
      if (d === 'swept') { worst = `swept@${x},${z},t=${t.toFixed(1)}`; break; } t += cell / (1.7 * (d === 'wade' ? 0.75 : 1)); }
    expect(worst).toBe('dry');
  });
});
