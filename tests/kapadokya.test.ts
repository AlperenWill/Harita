/** Kapadokya balonu: katman seçerek her noktaya ulaşılabilir; zemine çarpmaz; sınırda geri itilir */
import { describe, expect, it } from 'vitest';
import { BOUND, LAYERS, SPOTS, START, heightAt, layerAt, nearSpot, step, wind, type Balloon } from '../src/app/games/kapadokya/flight';

/** Basit pilot: her 5 sn'de hedefe en çok yaklaştıran katmanı seçer, o katmanın ortasına yükselir/alçalır */
function fly(target: [number, number], maxT = 900) {
  let b: Balloon = { ...START }, t = 0, want = 1;
  while (t < maxT) {
    if (Math.round(t * 10) % 50 === 0) { const dx = target[0] - b.x, dz = target[1] - b.z, d = Math.hypot(dx, dz); want = LAYERS.map((l, i) => [i, (l.dir[0] * dx + l.dir[1] * dz) / d] as const).sort((a, c) => c[1] - a[1])[0][0]; }
    const agl = b.y - heightAt(b.x, b.z), mid = [30, 100, 190][want];
    b = step(b, agl < mid - 8 ? 1 : agl > mid + 8 ? -1 : 0, 0.1, t); t += 0.1;
    expect(b.y).toBeGreaterThanOrEqual(heightAt(b.x, b.z) + 1.1);
    if (Math.hypot(b.x - target[0], b.z - target[1]) < 50) return t;
  }
  return Infinity;
}
describe('Kapadokya balon uçuşu', () => {
  it('katmanlar farklı yönlere eser; alçak katman doğuya', () => {
    expect(layerAt(10)).toBe(0); expect(layerAt(100)).toBe(1); expect(layerAt(300)).toBe(2);
    expect(wind(0, 0, 20)[0]).toBeGreaterThan(3); expect(wind(0, 0, 100)[1]).toBeLessThan(-2); expect(wind(0, 0, 250)[1]).toBeGreaterThan(3);
  });
  it('her noktaya katman seçerek 15 dakikadan kısa sürede ulaşılır', () => {
    for (const s of SPOTS) expect(fly(s.at), s.id).toBeLessThan(900);
  });
  it('sınırın dışında rüzgâr merkeze iter; nokta yakınında “görüldü”', () => {
    const [wx] = wind(BOUND + 60, 0, 20); expect(wx).toBeLessThan(0);
    expect(nearSpot({ x: SPOTS[0].at[0], y: heightAt(SPOTS[0].at[0], SPOTS[0].at[1]) + 50, z: SPOTS[0].at[1], vy: 0 })?.id).toBe(SPOTS[0].id);
  });
});
