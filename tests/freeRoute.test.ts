import { describe, expect, it } from 'vitest';
import { freePos, freeStep, inputDir, makeRoute } from '../src/app/games/shared/route';

describe('Rota koridorunda serbest yürüyüş', () => {
  const R = makeRoute([[0, 0], [0, -20], [20, -20]], () => 0);
  it('rota yönünde ilerler, yana sapar ama koridordan çıkmaz', () => {
    const st = { s: 5, o: 0 };
    freeStep(R.routeAt, R.ROUTE_LEN, st, 0, -2, 3); expect(st.s).toBeCloseTo(7); expect(st.o).toBeCloseTo(0);   // ileri (−z)
    freeStep(R.routeAt, R.ROUTE_LEN, st, 10, 0, 3); expect(Math.abs(st.o)).toBe(3);                         // yana: sınırda durur
    const p = freePos(R.routeAt, st.s, st.o); expect(Math.hypot(p[0], p[2] + 7)).toBeCloseTo(3);
  });
  it('bakış yönüne göre giriş: ileri bakış −z, sağa adım +x', () => {
    const f = inputDir(0, 1, 0)!; expect(f[0]).toBeCloseTo(0); expect(f[1]).toBeCloseTo(-1);
    const r = inputDir(0, 0, 1)!; expect(r[0]).toBeCloseTo(1); expect(r[1]).toBeCloseTo(0);
    expect(inputDir(0, 0, 0)).toBeNull();
  });
});
