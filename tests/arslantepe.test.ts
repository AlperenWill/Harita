import { describe, expect, it } from 'vitest';
import { BOUNDS, LOCKS, ROOMS, SEALS, SPOTS, START, doorFront, groundY, impression, nearestLock, sameShape, sealFits, walkable } from '../src/app/games/arslantepe/site';

function reach(open: string[]) {
  const cell = 0.25, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b);
      if (seen[k] || !walkable(x, z, open) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.4) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Arslantepe — Mühür ve Kapı', () => {
  it('başlangıçtan durakların ve mühürlü kapıların önüne yürünür; kapalı depoya girilmez', () => {
    const r = reach([]);
    for (const s of SPOTS) expect(r(s.at[0], s.at[1]), s.id).toBe(true);
    for (const rm of ROOMS.filter((q) => q.side === 'n')) { const [fx, fz] = doorFront(rm); expect(r(fx, fz), rm.id).toBe(true); expect(nearestLock(fx, fz, [])?.id).toBe(rm.id);
      expect(r((rm.x0 + rm.x1) / 2, (rm.z0 + rm.z1) / 2), `${rm.id} kapalı`).toBe(false); }
  });
  it('mühür açılınca depoya girilir', () => {
    const r = reach(LOCKS.map((l) => l.room));
    for (const rm of ROOMS) expect(r((rm.x0 + rm.x1) / 2, (rm.z0 + rm.z1) / 2), rm.id).toBe(true);
  });
  it('baskı mührün ayna görüntüsü: aynalanmamış hâli hiçbir açıyla baskıya denk gelmez', () => {
    for (const l of LOCKS) { const seal = SEALS.find((s) => s.id === l.seal)!, imp = impression(seal, l.rot);
      for (const a of [0, 45, 90, 135, 180, 225, 270, 315]) { const c = (a * Math.PI) / 180, rot = seal.strokes.map((st) => st.map(([x, y]) => [x * Math.cos(c) - y * Math.sin(c), x * Math.sin(c) + y * Math.cos(c)] as [number, number]));
        expect(sameShape(rot, imp), `${l.seal} ${a}`).toBe(false); }
      expect(sealFits(l.room, l.seal)).toBe(true);
      for (const s of SEALS) if (s.id !== l.seal) expect(sealFits(l.room, s.id)).toBe(false); }
    expect(new Set(LOCKS.map((l) => l.seal)).size).toBe(LOCKS.length);
    expect(SEALS.length).toBeGreaterThan(LOCKS.length);
  });
  it('duraklar kaynaklı ve ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(6);
  });
});
