import { describe, expect, it } from 'vitest';
import { OLD_WIN, SPOTS, START, TRUE_WIN, WATCH, WINDOWS, WIN_AT, dateLabel, dayOf, lightHits, sunriseAzimuth, throughNotch, walkable } from '../src/app/games/tillo/site';

describe('Tillo — Işık Hadisesi', () => {
  it('güneş ekinokslarda doğudan, yazın kuzeydoğudan doğar', () => {
    expect(Math.abs(sunriseAzimuth(dayOf(3, 21)) - 90)).toBeLessThan(0.6);
    expect(Math.abs(sunriseAzimuth(dayOf(9, 23)) - 90)).toBeLessThan(0.6);
    expect(sunriseAzimuth(dayOf(6, 21))).toBeLessThan(65);
    expect(sunriseAzimuth(dayOf(12, 21))).toBeGreaterThan(115);
  });
  it('ışık yalnız 21 Mart ve 23 Eylül çevresinde, yalnız doğru pencereden sandukalara düşer', () => {
    expect(lightHits(TRUE_WIN, dayOf(3, 21))).toBe(true);
    expect(lightHits(TRUE_WIN, dayOf(9, 23))).toBe(true);
    expect(lightHits(OLD_WIN, dayOf(3, 21))).toBe(false);
    const days: number[] = []; for (let d = 1; d <= 365; d++) if (lightHits(TRUE_WIN, d)) days.push(d);
    expect(days.length).toBeGreaterThanOrEqual(2); expect(days.length).toBeLessThanOrEqual(8);
    for (const d of days) expect(throughNotch(d)).toBe(true);
    expect(WINDOWS.filter((_, i) => lightHits(i, dayOf(3, 21)))).toHaveLength(1);
  });
  it('tarih etiketi', () => { expect(dateLabel(dayOf(3, 21))).toBe('21 Mart'); expect(dateLabel(dayOf(9, 23))).toBe('23 Eylül'); expect(dateLabel(1)).toBe('1 Ocak'); });
  it('başlangıç, duraklar, pencere ve izleme yeri yürünebilir; içeri kapıdan girilir', () => {
    for (const p of [START.at, WATCH.at, WIN_AT, ...SPOTS.map((s) => s.at)]) expect(walkable(p[0], p[1]), `${p}`).toBe(true);
    expect(walkable(-3.8, 0)).toBe(true); expect(walkable(-3.8, 2)).toBe(false); expect(walkable(3.8, 0)).toBe(false);
  });
});
