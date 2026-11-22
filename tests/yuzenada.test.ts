import { describe, expect, it } from 'vitest';
import { BOUNDS, CYCLE, ISLANDS, PIERS, SPOTS, START, dockedAt, groundY, islandAt, walkableShore } from '../src/app/games/yuzenada/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkableShore(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Yüzen Adalar', () => {
  it('kıyıdan 7 durağın hepsine ve iki iskelenin ucuna yürünür', () => {
    const r = reach(); expect(SPOTS).toHaveLength(7);
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    for (const p of PIERS) expect(r(p.a[0] + (p.b[0] - p.a[0]) * 0.95, p.a[1] + (p.b[1] - p.a[1]) * 0.95), p.id).toBe(true);
  });
  it('büyük ada her turda iki iskeleye de yanaşır; yanaştığında kenarı iskele ucuna 1 m\'den yakın', () => {
    const seen = new Set<string>();
    for (let t = 0; t < CYCLE; t += 0.5) { const d = dockedAt(t); if (!d) continue; seen.add(d.id); const c = islandAt(0, t).c, gap = Math.hypot(c[0] - d.b[0], c[1] - d.b[1]) - ISLANDS[0].r; expect(gap).toBeLessThan(1); expect(gap).toBeGreaterThan(0); }
    expect(seen).toEqual(new Set(['kuzey', 'guney']));
  });
  it('adalar birbirine ve kıyıya çarpmaz', () => {
    for (let t = 0; t < 2000; t += 1.5) { const cs = ISLANDS.map((_, i) => islandAt(i, t).c);
      for (let i = 0; i < 3; i++) { expect(Math.hypot(...cs[i])).toBeLessThan(55 - ISLANDS[i].r + 6);
        for (let j = i + 1; j < 3; j++) expect(Math.hypot(cs[i][0] - cs[j][0], cs[i][1] - cs[j][1]), `${t} ${i}-${j}`).toBeGreaterThan(ISLANDS[i].r + ISLANDS[j].r + 1); } }
  });
  it('kıyı yolu yumuşak', () => {
    const r = reach();
    for (let x = BOUNDS.x0; x < BOUNDS.x1; x += 0.5) for (let z = BOUNDS.z0; z < BOUNDS.z1; z += 0.5) if (r(x, z) && r(x, z + 0.5)) expect(Math.abs(groundY(x, z + 0.5) - groundY(x, z)), `${x},${z}`).toBeLessThan(0.3);
  });
});
