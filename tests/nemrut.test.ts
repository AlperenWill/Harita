import { describe, expect, it } from 'vitest';
import { BEST_HOUR, DRAG_HZ, GOLDEN, SUNRISE, SUNSET, approach, atmosphere, inGolden, phaseOf, restoreTarget, shouldUpdate, sunPosition, sunVector } from '../src/app/games/nemrut/DynamicLightingSystem';
import { CAMERAS, FIGURES, PLATEAU_R, STATUE, TERRACE_X, TUMULUS, fallenSpot, heightAt, inFront, onTerrace, scatter, statueSpots } from '../src/app/games/nemrut/terrain';
import { dragToHours, wrapHour, clock } from '../src/app/games/nemrut/TimeSliderUI';

describe('Nemrut: güneş ve atmosfer', () => {
  it('öğlen güneyde ve en yüksekte; gün doğumu doğuda, batımı batıda; gündüz ~13 saat', () => {
    const n = sunPosition(12); expect(n.elevation).toBeCloseTo(90 - 38 + 10, 0); expect(Math.abs(n.bearing - 180)).toBeLessThan(1);
    expect(sunPosition(SUNRISE).elevation).toBeCloseTo(0, 1); expect(sunPosition(SUNRISE).bearing).toBeLessThan(90); expect(sunPosition(SUNSET).bearing).toBeGreaterThan(270);
    expect(SUNSET - SUNRISE).toBeGreaterThan(12.5); expect(SUNSET - SUNRISE).toBeLessThan(13.5);
    expect(Math.hypot(...sunVector(9))).toBeCloseTo(1); expect(sunVector(SUNRISE + 1)[0]).toBeGreaterThan(0.8); expect(sunVector(SUNSET - 1)[0]).toBeLessThan(-0.8);
  });
  it('evreler: gece → şafak → sisli sabah → öğle → altın saat → alacakaranlık → gece', () => {
    expect([2, SUNRISE - 0.2, SUNRISE + 0.6, 12, SUNSET - 0.6, SUNSET + 0.2, 23].map(phaseOf)).toEqual(['gece', 'safak', 'sabah', 'ogle', 'altin', 'alacakaranlik', 'gece']);
  });
  it('sis sabah en yoğun, öğle en seyrek; yıldızlar yalnızca gece; tanrı ışınları güneş alçakken', () => {
    const dawn = atmosphere(SUNRISE + 0.5), noon = atmosphere(12), dusk = atmosphere(SUNSET - 0.5), night = atmosphere(1);
    expect(dawn.fogDensity).toBeGreaterThan(dusk.fogDensity); expect(dusk.fogDensity).toBeGreaterThan(noon.fogDensity);
    expect(night.stars).toBe(1); expect(noon.stars).toBe(0); expect(night.sunIntensity).toBe(0);
    expect(dawn.godRays).toBeGreaterThan(0.3); expect(noon.godRays).toBe(0); expect(night.godRays).toBe(0);
    expect(dusk.sunColor[2]).toBeLessThan(noon.sunColor[2]);                      // akşam ışığı daha sıcak
    expect(dawn.fogColor[0] - dawn.fogColor[2]).toBeLessThan(dusk.fogColor[0] - dusk.fogColor[2]);   // sabah gri, akşam pembe/altın
    expect(night.wind).toBeLessThan(noon.wind); expect(noon.wind).toBeLessThan(dusk.wind);
    for (let h = 0; h < 24; h += 0.25) { const a = atmosphere(h); expect(a.fogDensity).toBeGreaterThan(0); expect(a.godRays).toBeGreaterThanOrEqual(0); expect(a.godRays).toBeLessThanOrEqual(1); expect(a.ambient).toBeGreaterThan(0); }
  });
  it('pil: sürgü hareket ederken güncelleme 30 Hz, dururken her kare', () => {
    expect(DRAG_HZ).toBe(30); expect(shouldUpdate(1.0, 0.99, false)).toBe(true); expect(shouldUpdate(1.0, 0.99, true)).toBe(false); expect(shouldUpdate(1.0, 1 - 1 / 30, true)).toBe(true);
    let n = 0, last = -1; for (let f = 0; f < 60; f++) { const t = f / 60; if (shouldUpdate(t, last, true)) { n++; last = t; } } expect(n).toBe(30);
  });
});

describe('Nemrut: restore', () => {
  it('doğu terası gün doğumunda, batı terası gün batımında canlanır; yaklaşınca her saatte', () => {
    expect(inGolden('dogu', SUNRISE + 0.7)).toBe(true); expect(inGolden('bati', SUNRISE + 0.7)).toBe(false); expect(inGolden('bati', SUNSET - 0.7)).toBe(true);
    expect(restoreTarget('dogu', 12, false)).toBe(0); expect(restoreTarget('dogu', 12, true)).toBe(1); expect(restoreTarget('dogu', BEST_HOUR.dogu, false)).toBe(1);
    expect(BEST_HOUR.bati).toBeGreaterThan(GOLDEN.bati[0]); expect(BEST_HOUR.bati).toBeLessThan(GOLDEN.bati[1]);
  });
  it('geçiş yumuşak ve hedefi aşmaz', () => {
    let a = 0; const v: number[] = []; for (let i = 0; i < 240; i++) { a = approach(a, 1, 1 / 60); v.push(a); }
    expect(v[5]).toBeLessThan(0.15); expect(a).toBeGreaterThan(0.98); expect(Math.max(...v)).toBeLessThanOrEqual(1);
  });
});

describe('Nemrut: arazi ve heykeller', () => {
  it('tümülüs ~50 m; teraslar düz; plato dışında yamaç dik iner', () => {
    expect(heightAt(0, 0)).toBeGreaterThan(44); expect(heightAt(0, 0)).toBeLessThanOrEqual(TUMULUS.h); expect(heightAt(TUMULUS.r, 0)).toBeCloseTo(0, 5);
    for (const s of [1, -1]) for (const z of [-20, 0, 20]) { expect(Math.abs(heightAt(s * TERRACE_X, z))).toBeLessThan(0.01); expect(onTerrace(s * (TERRACE_X + 8), z)).toBe(true); }
    expect(heightAt(PLATEAU_R + 200, 0)).toBeLessThan(-100);
  });
  it('beş dev heykel, yüzleri tümülüsten dışarı; başlar önlerinde yerde; kamera asla arkaya geçmez', () => {
    expect(FIGURES.map((f) => f.id)).toEqual(['antiochos', 'kommagene', 'zeus', 'apollon', 'herakles']);
    expect(STATUE.total).toBeGreaterThanOrEqual(8); expect(STATUE.total).toBeLessThanOrEqual(10);
    for (const side of [1, -1] as const) {
      const sp = statueSpots(side); expect(sp).toHaveLength(5); expect(sp[2].z).toBe(0);
      sp.forEach((s, i) => { const f = fallenSpot(side, i); expect(Math.abs(f.x)).toBeGreaterThan(Math.abs(s.x) + 5); expect(Math.abs(heightAt(f.x, f.z))).toBeLessThan(0.01); });
    }
    for (const v of ['dogu', 'bati'] as const) for (const p of [CAMERAS[v].far, CAMERAS[v].near]) expect(inFront(v, p[0])).toBe(true);
    expect(CAMERAS.tumulus.far[1]).toBeGreaterThan(150);
  });
  it('kaya/çalı saçılımı tekrarlanabilir; heykel sırasına ve kamera önüne düşmez', () => {
    const a = scatter(300, 11, 80, 330), b = scatter(300, 11, 80, 330); expect(a).toEqual(b); expect(a).toHaveLength(300);
    for (const s of a) { expect(Math.abs(Math.abs(s.x) - TERRACE_X) < 9 && Math.abs(s.z) < 30).toBe(false); }
  });
  it('sürgü: tam ekran sürükleme 12 saat; saat 0–24 arasında sarar', () => {
    expect(dragToHours(390, 390)).toBe(12); expect(wrapHour(25)).toBe(1); expect(wrapHour(-1)).toBe(23); expect(clock(18.5)).toBe('18:30');
  });
});
