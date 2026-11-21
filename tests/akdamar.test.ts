/** Akdamar: tekne dümenle iskeleye varır, rüzgâr doğuya iter; kabartmalar cephelerin üstünde ve ipuçlu */
import { describe, expect, it } from 'vitest';
import { ARM_W, CHURCH_R, ISLAND, PIER, RELIEFS, START, TARGETS, arrived, autoRudder, islandHeight, reliefPos, stepBoat, type Boat } from '../src/app/games/akdamar/site';

describe('Akdamar', () => {
  it('ada tepede düz, iskele suda', () => {
    expect(islandHeight(0, 0)).toBeCloseTo(ISLAND.h - 1.2, 3); expect(islandHeight(15, -10)).toBeCloseTo(ISLAND.h - 1.2, 3); expect(islandHeight(PIER[0], PIER[1])).toBeLessThan(0);
  });
  it('dümen tutulursa tekne iki dakikadan kısa sürede varır; dümensiz rüzgâr doğuya iter', () => {
    let b: Boat = { x: START[0], z: START[1], heading: 0, t: 0 }, t = 0;
    while (!arrived(b) && t < 120) { b = stepBoat(b, autoRudder(b), 1 / 30); t += 1 / 30; }
    expect(arrived(b)).toBe(true);
    let c: Boat = { x: 0, z: 400, heading: 0, t: 0 }; for (let i = 0; i < 300; i++) c = stepBoat(c, 0, 1 / 30); expect(c.x).toBeGreaterThan(3); expect(c.z).toBeLessThan(400);
  });
  it('kabartmalar cephe genişliğine sığar, üst üste binmez; hedeflerin ipucu var', () => {
    for (const r of RELIEFS) expect(Math.abs(r.offset) + r.w / 2, r.id).toBeLessThanOrEqual(ARM_W / 2 + 0.01);
    for (const a of RELIEFS) for (const b of RELIEFS) if (a !== b && a.facade === b.facade && Math.abs(a.y - b.y) < (a.h + b.h) / 2) expect(Math.abs(a.offset - b.offset), `${a.id}/${b.id}`).toBeGreaterThanOrEqual((a.w + b.w) / 2);
    expect(TARGETS.length).toBe(5); for (const t of TARGETS) { expect(t.clue.length).toBeGreaterThan(10); expect(t.text.length).toBeGreaterThan(40); }
    for (const r of RELIEFS) { const { p } = reliefPos(r); expect(Math.max(Math.abs(p[0]), Math.abs(p[2]))).toBeCloseTo(CHURCH_R + 0.03, 2); }
  });
});
