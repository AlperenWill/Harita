import { describe, expect, it } from 'vitest';
import { LEVEL_Y, TOUR, eye3 } from '../src/app/games/ayasofya/walk';
import { ADAPT_SECONDS, APEX_Y, APSE, ARCH_Y, DOME_WINDOWS, EXPOSURE, GALLERY_Y, MIHRAB, PEND_R, POIS, R, RING_Y, adapt, columns, domeWindows, inspectFov, shafts, sunPosition, sunVector, zoneAt } from '../src/app/games/ayasofya/hagia';

describe('Ayasofya: ölçek', () => {
  it('kubbe ~31 m çap, tepe ~55–56 m, 40 pencere; pandantif geometrisi tutarlı', () => {
    expect(2 * R).toBeCloseTo(31, 0); expect(APEX_Y).toBeGreaterThan(55); expect(APEX_Y).toBeLessThan(56.5);
    expect(domeWindows()).toHaveLength(40); expect(DOME_WINDOWS).toBe(40);
    // pandantif küresi: köşede kemer üzengisine, kasnakta kubbe halkasına oturur
    expect(ARCH_Y + Math.sqrt(PEND_R ** 2 - 2 * R * R)).toBeCloseTo(ARCH_Y); expect(ARCH_Y + Math.sqrt(PEND_R ** 2 - R * R)).toBeCloseTo(RING_Y);
    for (const w of domeWindows()) expect(Math.hypot(w.pos[0], w.pos[2])).toBeLessThan(R);
  });
  it('sütunlar: yeşil, porfir ve beyaz; hiçbiri tur duraklarının üstünde değil', () => {
    const c = columns(); expect(new Set(c.map((x) => x.kind))).toEqual(new Set(['verd', 'porphyry', 'white']));
    expect(c.filter((x) => x.kind === 'porphyry')).toHaveLength(8);
    for (const st of TOUR) for (const col of c.filter((x) => x.pos[1] === LEVEL_Y[st.level])) expect(Math.hypot(col.pos[0] - st.at[0], col.pos[2] - st.at[1])).toBeGreaterThan(1.2);
  });
  it('mihrap apsisin içinde ve eksenden güneye kaymış', () => {
    expect(MIHRAB[2]).toBeGreaterThan(0.5); expect(Math.hypot(MIHRAB[0] - APSE.cx, MIHRAB[2])).toBeLessThan(APSE.r);
  });
});

describe('Ayasofya: güneş ve ışık huzmeleri', () => {
  it('öğlen güneyde ~49°; sabah doğuda, akşam batıda', () => {
    const n = sunPosition(13.07); expect(n.elevation).toBeCloseTo(49, 0); expect(Math.abs(n.bearing - 180)).toBeLessThan(1);
    expect(sunPosition(8).bearing).toBeLessThan(130); expect(sunPosition(17).bearing).toBeGreaterThan(240);
    const v = sunVector(10); expect(Math.hypot(...v)).toBeCloseTo(1);
  });
  it('gece huzme yok; gündüz yalnızca güneşe bakan pencerelerden, nefin içinde biter', () => {
    expect(shafts(5)).toHaveLength(0);
    for (const h of [8, 10.5, 13, 16]) {
      const s = shafts(h), sun = sunVector(h); expect(s.length).toBeGreaterThan(5); expect(s.length).toBeLessThan(64);
      for (const x of s) {
        expect(x.to[1]).toBeGreaterThanOrEqual(-1e-6); expect(x.to[1]).toBeLessThan(x.from[1]); expect(x.strength).toBeGreaterThanOrEqual(0); expect(x.strength).toBeLessThanOrEqual(1);
        expect(Math.abs(x.to[2])).toBeLessThanOrEqual(R + 0.01); expect(Math.abs(x.to[0])).toBeLessThanOrEqual(2 * R + 0.01);
        const d = [x.from[0] - x.to[0], x.from[1] - x.to[1], x.from[2] - x.to[2]], l = Math.hypot(...d);   // huzme güneş yönünde
        expect((d[0] * sun[0] + d[1] * sun[1] + d[2] * sun[2]) / l).toBeCloseTo(1, 5);
      }
    }
    // sabah ve akşam farklı pencereler ışık alır
    expect(shafts(8)[0].from).not.toEqual(shafts(17)[0].from);
  });
});

describe('Ayasofya: tur, göz uyumu, inceleme', () => {
  it('tur bölgeleri sırayla: avlu → narteks → nef → apsis; galeri durakları üst katta', () => {
    const z = TOUR.map((s) => zoneAt(eye3(s.level, ...s.at))); expect(z[0]).toBe('avlu'); expect(z[1]).toBe('narteks'); expect(z).toContain('nef'); expect(z).toContain('apsis');
    for (const s of TOUR.filter((x) => x.level === 'galeri')) { expect(zoneAt(eye3(s.level, ...s.at))).toBe('galeri'); expect(eye3(s.level, ...s.at)[1]).toBeGreaterThan(GALLERY_Y + 1.5); }
  });
  it('göz uyumu: narteksten nefe girince pozlama önce yüksek (kamaşma), ~2 sn sonra uyum', () => {
    let e = EXPOSURE.narteks; expect(EXPOSURE.narteks).toBeGreaterThan(EXPOSURE.nef * 2);
    for (let i = 0; i < 12; i++) e = adapt(e, EXPOSURE.nef, 1 / 60);          // 0,2 sn
    expect(e).toBeGreaterThan(EXPOSURE.nef * 1.8);
    for (let i = 0; i < 60 * ADAPT_SECONDS; i++) e = adapt(e, EXPOSURE.nef, 1 / 60);
    expect(e).toBeLessThan(EXPOSURE.nef * 1.12);
  });
  it('ilgi noktalarının kaynakları https; dört mozaik var', () => {
    for (const p of POIS) expect(p.source.url).toMatch(/^https:\/\//);
    expect(POIS.filter((p) => p.kind === 'mozaik').map((p) => p.id)).toEqual(expect.arrayContaining(['deisis', 'zoe', 'komnenos', 'apsis-mozaigi']));
  });
  it('inceleme: uzaktaki hedefte görüş açısı daralır', () => {
    expect(inspectFov(50, 4)).toBeLessThan(inspectFov(5, 4)); expect(inspectFov(1000, 1)).toBe(9);
  });
});
