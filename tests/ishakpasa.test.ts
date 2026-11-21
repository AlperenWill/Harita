/** İshak Paşa: rota terasta kalır; duraklar sırayla; bulmaca karışık başlar, orta parça sabit, dörder dokunuşla çözülür */
import { describe, expect, it } from 'vitest';
import { CENTER, ROUTE_LEN, STOPS, isSolved, nearStop, rotateTile, routeAt, scramble } from '../src/app/games/ishakpasa/site';

describe('İshak Paşa Sarayı', () => {
  it('rota düz terasta ve yeterince uzun', () => {
    expect(ROUTE_LEN).toBeGreaterThan(150);
    for (let s = 0; s <= ROUTE_LEN; s += 1) expect(Math.abs(routeAt(s).p[1])).toBeLessThan(1.5);
  });
  it('duraklar rotada sırayla ve birbirinden ayrı; kaynaklar https', () => {
    expect([...STOPS].sort((a, b) => a.s - b.s).map((x) => x.id)).toEqual(STOPS.map((x) => x.id));
    for (const st of STOPS) { expect(nearStop(st.s)?.id).toBe(st.id); expect(st.source.url).toMatch(/^https:/); }
  });
  it('bulmaca: karışık başlar, orta sabit, her parça en çok 3 dokunuşla düzelir', () => {
    for (let seed = 1; seed < 40; seed++) {
      let a = scramble(seed); expect(isSolved(a)).toBe(false); expect(a[CENTER]).toBe(0); expect(a.filter((v) => v).length).toBeGreaterThanOrEqual(4);
      expect(rotateTile(a, CENTER)).toEqual(a);
      a.forEach((v, i) => { for (let k = 0; k < (4 - v) % 4; k++) a = rotateTile(a, i); }); expect(isSolved(a)).toBe(true);
    }
  });
});
