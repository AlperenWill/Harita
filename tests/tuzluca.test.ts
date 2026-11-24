import { describe, expect, it } from 'vitest';
import { BOUNDS, BREATH, SEAT_AT, SPOTS, START, TEMP, atSeat, breathPhase, cycleGood, temperature, walkable } from '../src/app/games/tuzluca/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b); if (seen[k] || !walkable(x, z)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Tuzluca — Serin Nefes', () => {
  const r = reach();
  it('girişten duraklara ve terapi salonundaki oturma yerine yürünür', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    expect(r(SEAT_AT[0], SEAT_AT[1])).toBe(true); expect(atSeat(SEAT_AT[0], SEAT_AT[1])).toBe(true);
  });
  it('yamaçtan tünel dışında içeri girilmez; ayaklar ve salon duvarları geçilmez', () => {
    expect(walkable(10, -5)).toBe(false); expect(walkable(0, -5)).toBe(true);
    expect(walkable(-8, -34)).toBe(false); expect(walkable(0, -21.85)).toBe(true); expect(walkable(0, -78.3)).toBe(true); expect(walkable(-16, -34)).toBe(true);
    expect(walkable(10, -80)).toBe(false); expect(walkable(0, -80)).toBe(true); expect(walkable(10, -86)).toBe(true);
  });
  it('termometre içeri girdikçe düşer, derinde ~12 °C', () => {
    let prev = Infinity; for (let z = 40; z > -95; z -= 1) { const t = temperature(z); expect(t).toBeLessThanOrEqual(prev + 1e-9); prev = t; }
    expect(temperature(30)).toBe(TEMP.out); expect(temperature(-80)).toBe(TEMP.deep);
  });
  it('nefes ritmi: evreler sırayla gelir; puan eşiği', () => {
    expect(breathPhase(0).phase).toBe('in'); expect(breathPhase(BREATH.inhale + 0.1).phase).toBe('out');
    expect(breathPhase(BREATH.inhale + BREATH.exhale + 0.1).cycle).toBe(1);
    expect(cycleGood(0.9, 0.8)).toBe(true); expect(cycleGood(0.9, 0.3)).toBe(false);
  });
});
