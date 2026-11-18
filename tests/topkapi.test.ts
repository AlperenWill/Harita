/**
 * Topkapı — dünya modeli testleri (saf; DOM ve WebGL yok).
 * Rehber turunun baştan sona yürünebildiğini, kapıların ve doğma noktalarının geçerli olduğunu, nesnelerin erişilebilir olduğunu sınar.
 */
import { describe, expect, it } from 'vitest';
import { DOORS, START, STOP_RADIUS, THINGS, TOUR, TREES, camClear, guideGoal, guideStep, nearestDoor, nearestThing, slide, walkable, type V2, type Zone } from '../src/app/games/topkapi/world';

describe('Topkapı dünyası', () => {
  it('başlangıç, tur durakları, kapı doğma ve bekleme noktaları yürünebilir', () => {
    expect(walkable(START.zone, ...START.at)).toBe(true);
    for (const s of TOUR) expect(walkable(s.zone, ...s.at), s.id).toBe(true);
    for (const d of DOORS) { expect(walkable(d.to, ...d.spawn), `${d.id} spawn`).toBe(true); expect(walkable(d.zone, ...d.wait), `${d.id} wait`).toBe(true); }
  });
  it('her kapının karşılığı var ve doğma noktası geri dönüş kapısını hemen tetiklemiyor', () => {
    for (const d of DOORS) {
      expect(DOORS.some((b) => b.zone === d.to && b.to === d.zone), d.id).toBe(true);
      expect(nearestDoor(d.to, ...d.spawn), `${d.id} spawn kapı içinde`).toBeNull();
    }
  });
  it('kapılara yürüyerek ulaşılabilir (kapı merkezinin yarıçapı içinde yürünebilir bir nokta var)', () => {
    for (const d of DOORS) {
      let ok = false;
      for (let a = 0; a < 32 && !ok; a++) for (const r of [0.2, 0.5, 0.8, 1.1]) { const x = d.at[0] + Math.cos(a / 5.1) * r * d.r, z = d.at[1] + Math.sin(a / 5.1) * r * d.r; if (walkable(d.zone, x, z)) { ok = true; break; } }
      expect(ok, d.id).toBe(true);
    }
  });
  it('ağaçlar yolları ve kapı önlerini kapatmıyor', () => {
    for (const t of TREES()) { expect(Math.abs(t.z) >= 4 || t.kind === 'servi', `${t.x},${t.z}`).toBe(true); for (const d of DOORS.filter((x) => x.zone === 'avlu')) expect(Math.hypot(t.x - d.at[0], t.z - d.at[1]) > 2).toBe(true); }
  });
  it('kayarak yürüme duvardan geçirmiyor', () => {
    let p: V2 = [-62.5, 20];   // Bâbüsselâm duvarının batısı, açıklığın dışında
    for (let i = 0; i < 100; i++) p = slide('avlu', p, 0.1, 0);
    expect(p[0]).toBeLessThan(-61.5 - 0.3);
  });
  it('rehber turun tamamını kendi başına yürüyebiliyor (kapılardan geçerek)', () => {
    let zone: Zone = START.zone, p: V2 = [START.at[0] + 1, START.at[1] + 1.5];
    for (let i = 0; i < TOUR.length; i++) {
      let t = 0;
      for (; t < 240; t += 0.05) {
        const g = guideGoal(zone, i), s = guideStep(zone, p, g.at, 0.05, 3.2); p = s.p;
        if (Math.hypot(p[0] - g.at[0], p[1] - g.at[1]) < 0.5) {
          if (!g.door) break;
          const d = g.door; zone = d.to; p = [d.spawn[0] + 0.8, d.spawn[1]]; if (!walkable(zone, ...p)) p = [...d.spawn];
        }
      }
      expect(t, `${TOUR[i].id} durağına ulaşılamadı (${p.map((v) => v.toFixed(1))} @ ${zone})`).toBeLessThan(240);
      expect(zone).toBe(TOUR[i].zone);
    }
  });
  it('her nesne kendi bölgesinde yürünebilir bir noktadan incelenebilir', () => {
    for (const t of THINGS) {
      let found = false;
      for (let r = 0.5; r < t.reach && !found; r += 0.5) for (let a = 0; a < 24; a++) { const x = t.pos[0] + Math.cos(a / 3.82) * r, z = t.pos[2] + Math.sin(a / 3.82) * r; if (walkable(t.zone, x, z) && nearestThing(t.zone, x, z)?.id === t.id) { found = true; break; } }
      expect(found, t.id).toBe(true);
      expect(t.source.url.startsWith('https://')).toBe(true);
    }
  });
  it('tur durakları rehberin konuşma yarıçapıyla uyumlu; kamera duraklarda serbest', () => {
    expect(STOP_RADIUS).toBeGreaterThan(2);
    for (const s of TOUR) expect(camClear(s.zone, ...s.at), s.id).toBe(true);
  });
});

import { EXTRAS, clearLine } from '../src/app/games/topkapi/world';
describe('Topkapı figürleri', () => {
  it('her figür yürünebilir yerde; yürüyüş yolları engelsiz', () => {
    for (const e of EXTRAS) {
      expect(walkable(e.zone, ...e.at), e.id).toBe(true);
      if (e.path) for (let i = 0; i < e.path.length; i++) expect(clearLine(e.zone, e.path[i], e.path[(i + 1) % e.path.length]), `${e.id} ${i}`).toBe(true);
    }
  });
});
