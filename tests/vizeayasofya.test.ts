import { describe, expect, it } from 'vitest';
import { BOUNDS, CHURCH, COMPASS, FLOOR_H, MIHRAB, MINBER, NARTHEX, NAVE, PIERS, QIBLA_DEG, SPOTS, START, bearingDeg, groundY, headingDeg, mosqueBlock, qiblaDiff, walkable } from '../src/app/games/vizeayasofya/site';

function reach() {
  const cell = 0.5, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a; if (seen[k] || !walkable(BOUNDS.x0 + a * cell, BOUNDS.z0 + b * cell)) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Vize Ayasofyası', () => {
  it('avludan 6 durağın hepsine yürünür', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    expect(SPOTS).toHaveLength(6);
    const r = reach();
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
  });
  it('kiliseye yalnızca ana kapıdan girilir; duvarlar ve sütunlar geçilmez', () => {
    expect(walkable(0, CHURCH.z1 - 0.3)).toBe(true);
    expect(walkable(6, CHURCH.z1 - 0.3)).toBe(false);
    expect(walkable(CHURCH.x1 - 0.3, 0)).toBe(false);
    expect(walkable(0, NAVE.z1 + 0.4)).toBe(true);                      // narteks–nef kapısı
    expect(walkable(6, NAVE.z1 + 0.4)).toBe(false);
    expect(walkable((NARTHEX.x0 + NARTHEX.x1) / 2, (NARTHEX.z0 + NARTHEX.z1) / 2)).toBe(true);
    for (const p of PIERS) expect(walkable(p[0], p[1])).toBe(false);
    expect(PIERS).toHaveLength(10);
    expect(groundY(0, 0)).toBe(FLOOR_H);
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
  it('kıble: Vize\'den Mekke yaklaşık 150°; pusula yönü ve fark doğru; mihrap iç duvarda', () => {
    const b = bearingDeg(41.5728, 27.7653, 21.4225, 39.8262);
    expect(Math.abs(b - QIBLA_DEG)).toBeLessThan(2);
    expect(headingDeg(0)).toBeCloseTo(90, 5);          // ileri −z = doğu (apsis yönü)
    expect(headingDeg(Math.PI / 2)).toBeCloseTo(0, 5); // ileri −x = kuzey
    const yawQ = ((90 - QIBLA_DEG) * Math.PI) / 180; expect(Math.abs(qiblaDiff(yawQ))).toBeLessThan(1e-6);
    expect(qiblaDiff(yawQ + 0.3)).toBeGreaterThan(0);  // sola dönmüş: sağa dönmeli
    expect(walkable(COMPASS.c[0], COMPASS.c[1])).toBe(true);
    expect(MIHRAB.at[0]).toBeGreaterThan(NAVE.x1 - 0.2); expect(MIHRAB.at[1]).toBeGreaterThan(NAVE.z0); expect(MIHRAB.at[1]).toBeLessThan(NAVE.z1);
    const cx = (MINBER.x0 + MINBER.x1) / 2, cz = (MINBER.z0 + MINBER.z1) / 2;
    mosqueBlock.on = false; expect(walkable(cx, cz)).toBe(true); mosqueBlock.on = true; expect(walkable(cx, cz)).toBe(false); mosqueBlock.on = false;
  });
});
