/** Ani: plato kanyonlarla çevrili; rota platoda kalır; fotoğraf noktaları sırayla ve vizör hesabı doğru */
import { describe, expect, it } from 'vitest';
import { AIM_TOL, GORGE_DEPTH, ROUTE_LEN, SHOTS, aimError, edgeDist, heightAt, nearShot, routeAt } from '../src/app/games/ani/site';

describe('Ani', () => {
  it('kanyonlar platodan derin; rota platodan düşmez ve yumuşak', () => {
    expect(heightAt(200, 0)).toBeLessThan(-GORGE_DEPTH + 5); expect(heightAt(-200, 0)).toBeLessThan(-GORGE_DEPTH + 5); expect(Math.abs(heightAt(0, 0))).toBeLessThan(2);
    expect(ROUTE_LEN).toBeGreaterThan(400);
    for (let s = 0; s <= ROUTE_LEN; s += 1) { const p = routeAt(s).p; expect(edgeDist(p[0], p[2])).toBeGreaterThan(0.5); expect(Math.abs(routeAt(s + 1).p[1] - p[1])).toBeLessThan(1); }
  });
  it('noktalar rotada sırayla; her biri kendi yerinde bulunur; kaynaklar https', () => {
    expect([...SHOTS].sort((a, b) => a.s - b.s).map((x) => x.id)).toEqual(SHOTS.map((x) => x.id));
    for (const sh of SHOTS) { expect(nearShot(sh.s)?.id).toBe(sh.id); expect(sh.source.url).toMatch(/^https:/); }
  });
  it('vizör: hedefe bakınca küçük, ters yöne bakınca büyük hata', () => {
    expect(aimError([0, 0], [0, 1], [0, 10])).toBeLessThan(0.01); expect(aimError([0, 0], [0, 1], [10, 10])).toBeCloseTo(Math.PI / 4, 3);
    expect(aimError([0, 0], [0, -1], [0, 10])).toBeGreaterThan(AIM_TOL);
  });
});
