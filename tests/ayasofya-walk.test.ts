/** Ayasofya serbest yürüyüş modeli: noktalar yürünebilir, rehber turun tamamını yürüyebiliyor, figür yolları açık, nesneler incelenebilir. */
import { describe, expect, it } from 'vitest';
import { POIS } from '../src/app/games/ayasofya/hagia';
import { DOORS, EXTRAS, START, TOUR, camClear, clearLine, guideGoal, guideStep, nearestDoor, nearestPoi, poiLevel, slide, walkable, type Level, type V2 } from '../src/app/games/ayasofya/walk';

describe('Ayasofya yürüyüş', () => {
  it('başlangıç, duraklar, kapı doğma ve bekleme noktaları yürünebilir', () => {
    expect(walkable(START.level, ...START.at)).toBe(true);
    for (const s of TOUR) expect(walkable(s.level, ...s.at), s.id).toBe(true);
    for (const d of DOORS) { expect(walkable(d.to, ...d.spawn), `${d.id} spawn`).toBe(true); expect(walkable(d.level, ...d.wait), `${d.id} wait`).toBe(true); expect(nearestDoor(d.to, ...d.spawn), d.id).toBeNull(); }
  });
  it('avludan apsise kesintisiz yürünebilir; duvarlar kapı dışında geçilmez', () => {
    let p: V2 = [-50, 10]; for (let i = 0; i < 200; i++) p = slide('zemin', p, 0.1, 0);
    expect(p[0]).toBeLessThan(-43.4);   // cephe duvarı, kapı açıklığının dışında
    expect(walkable('zemin', -42.5, 0)).toBe(true); expect(walkable('zemin', -32, 0)).toBe(true); expect(walkable('zemin', -32, 6)).toBe(false);
    expect(walkable('zemin', 33, 0)).toBe(true);
  });
  it('rehber turun tamamını kendi başına yürüyebiliyor (rampadan geçerek)', () => {
    let lv: Level = START.level, p: V2 = [START.at[0] + 2, START.at[1] + 1];
    for (let i = 0; i < TOUR.length; i++) {
      let t = 0;
      for (; t < 300; t += 0.05) {
        const g = guideGoal(lv, i), s = guideStep(lv, p, g.at, 0.05, 3.2); p = s.p;
        if (Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) < 0.5) { if (!g.door) break; lv = g.door.to; p = [...g.door.spawn]; }
      }
      expect(t, `${TOUR[i].id} durağına ulaşılamadı (${p.map((v) => v.toFixed(1))} @ ${lv})`).toBeLessThan(300);
    }
  });
  it('her ilgi noktası kendi katında bir yerden incelenebilir', () => {
    for (const poi of POIS) {
      const l = poiLevel(poi); let ok = false;
      for (let r = 0.5; r < 14 && !ok; r += 0.5) for (let a = 0; a < 32; a++) { const x = poi.pos[0] + Math.cos(a / 5.1) * r, z = poi.pos[2] + Math.sin(a / 5.1) * r; if (walkable(l, x, z) && nearestPoi(l, x, z)?.id === poi.id) { ok = true; break; } }
      expect(ok, poi.id).toBe(true);
    }
  });
  it('figürler yürünebilir yerde, yolları engelsiz; kamera duraklarda serbest', () => {
    for (const e of EXTRAS) { expect(walkable(e.level, ...e.at), e.id).toBe(true); if (e.path) for (let i = 0; i < e.path.length; i++) expect(clearLine(e.level, e.path[i], e.path[(i + 1) % e.path.length]), `${e.id} ${i}`).toBe(true); }
    for (const s of TOUR) expect(camClear(s.level, ...s.at), s.id).toBe(true);
  });
});
