/** Efes: rota yokuş aşağı iner, pencereler sırayla ve rotadan ulaşılabilir, kaynaklar https */
import { describe, expect, it } from 'vitest';
import { ROUTE_LEN, WINDOWS, colonnade, nearWindow, nextUnseen, routeAt } from '../src/app/games/efes/site';

describe('Efes rotası', () => {
  it('Odeon’dan başlar, Kuretler’den Celsus meydanına iner, tiyatro önünden Arkadiane’ye döner', () => {
    expect(routeAt(0).p[1]).toBeGreaterThan(routeAt(ROUTE_LEN * 0.45).p[1] + 7); expect(routeAt(ROUTE_LEN).p[1]).toBeCloseTo(0);
    expect(ROUTE_LEN).toBeGreaterThan(200);
  });
  it('pencereler rotada sırayla; her biri kendi yerinden tetiklenir; sıradaki pencere bulunur', () => {
    const ids = [...WINDOWS].sort((a, b) => a.s - b.s).map((w) => w.id); expect(ids).toEqual(['odeon', 'trajan', 'hadrian', 'yamac', 'celsus', 'tiyatro', 'arkadiane']);
    for (const w of WINDOWS) { expect(nearWindow(w.s)?.id, w.id).toBe(w.id); expect(w.source.url).toMatch(/^https:\/\//); }
    expect(nextUnseen(0, [])?.id).toBe('odeon'); expect(nextUnseen(0, WINDOWS.map((w) => w.id))).toBeNull();
  });
  it('sütunlar rotanın üstüne dikilmez (yürüme yolu açık)', () => {
    const route = Array.from({ length: Math.ceil(ROUTE_LEN) }, (_, i) => routeAt(i).p);
    for (const [x, z] of colonnade()) expect(Math.min(...route.map((p) => Math.hypot(p[0] - x, p[2] - z))), `${x},${z}`).toBeGreaterThan(1.5);
  });
});
