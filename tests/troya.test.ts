/** Troya: rota höyüğün çevresinden geçer; her nokta rotadan bulunur; bilmecelerin cevabı seçeneklerde ve katman listesinde */
import { describe, expect, it } from 'vitest';
import { LAYERS, MOUND, ROUTE_LEN, STOPS, TRENCH, heightAt, isCorrect, nearStop, routeAt } from '../src/app/games/troya/site';

describe('Troya', () => {
  it('höyük ortada yüksek, yarma höyüğü keser; rota yeterince uzun', () => {
    expect(heightAt(40, 40)).toBeLessThan(heightAt(10, 20)); expect(heightAt(TRENCH.x, -20)).toBeLessThan(MOUND.h - TRENCH.d + 0.01); expect(ROUTE_LEN).toBeGreaterThan(300);
    for (let s = 0; s < ROUTE_LEN; s += 1) expect(Math.abs(routeAt(s + 1).p[1] - routeAt(s).p[1])).toBeLessThan(2.5);
  });
  it('noktalar rotada sırayla; cevaplar seçeneklerde ve katman listesinde; kaynaklar https', () => {
    const order = [...STOPS].sort((a, b) => a.s - b.s).map((x) => x.id); expect(order).toEqual(STOPS.map((x) => x.id));
    for (const st of STOPS) { expect(nearStop(st.s)?.id).toBe(st.id); expect(st.source.url).toMatch(/^https:/);
      if (st.answer) { expect(st.options).toContain(st.answer); expect(LAYERS.map((l) => l.n)).toContain(st.answer); expect(isCorrect(st, st.options.find((o) => o !== st.answer)!)).toBe(false); } }
  });
});
