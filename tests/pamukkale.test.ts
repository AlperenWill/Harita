/** Pamukkale: traverten yamacı basamaklı; rota köyden platoya çıkar; kuru havuzlar ve noktalar rotadan ulaşılabilir */
import { describe, expect, it } from 'vitest';
import { DRY, PLATEAU, ROUTE_LEN, SPOTS, heightAt, nearDry, nearSpot, routeAt, whiteness } from '../src/app/games/pamukkale/terraces';

describe('Pamukkale', () => {
  it('yamaç köyden platoya iner; rota tırmanır, çıplak ayak kısmı travertende', () => {
    expect(heightAt(0, 10)).toBeGreaterThan(heightAt(0, 60)); expect(heightAt(0, 60)).toBeGreaterThan(heightAt(0, 110));
    expect(routeAt(0).p[1]).toBeLessThan(2); expect(routeAt(ROUTE_LEN).p[1]).toBeGreaterThan(PLATEAU - 2);
    expect(routeAt(30).barefoot).toBe(true); expect(routeAt(ROUTE_LEN).barefoot).toBe(false);
    for (let s = 0; s < ROUTE_LEN - 1; s += 0.5) expect(Math.abs(routeAt(s + 0.5).p[1] - routeAt(s).p[1])).toBeLessThan(1.2);   // basamakta sıçrama yok
  });
  it('beş kuru havuz sırayla bulunur, doldurulan havuz listeden düşer; beyazlık dolulukla artar', () => {
    for (const p of DRY) expect(nearDry(p.s, [])?.id).toBe(p.id);
    expect(nearDry(DRY[0].s, [DRY[0].id])).toBeNull(); expect(whiteness(1)).toBeGreaterThan(whiteness(0) + 0.3);
  });
  it('noktalar rotadan tetiklenir, kaynaklar https', () => { for (const s of SPOTS) { expect(nearSpot(s.s)?.id).toBe(s.id); expect(s.source.url).toMatch(/^https:/); } });
});
