import { describe, expect, it } from 'vitest';
import { ADAPT_SECONDS, APEX_Y, APSE, ARCH_Y, DOME_WINDOWS, EXPOSURE, GALLERY_Y, MIHRAB, PEND_R, POIS, R, RAILS, RING_Y, adapt, columns, domeWindows, inspectEye, inspectFov, lookingAt, shafts, sunPosition, sunVector, zoneAt } from '../src/app/games/ayasofya/hagia';

describe('Ayasofya: ölçek', () => {
  it('kubbe ~31 m çap, tepe ~55–56 m, 40 pencere; pandantif geometrisi tutarlı', () => {
    expect(2 * R).toBeCloseTo(31, 0); expect(APEX_Y).toBeGreaterThan(55); expect(APEX_Y).toBeLessThan(56.5);
    expect(domeWindows()).toHaveLength(40); expect(DOME_WINDOWS).toBe(40);
    // pandantif küresi: köşede kemer üzengisine, kasnakta kubbe halkasına oturur
    expect(ARCH_Y + Math.sqrt(PEND_R ** 2 - 2 * R * R)).toBeCloseTo(ARCH_Y); expect(ARCH_Y + Math.sqrt(PEND_R ** 2 - R * R)).toBeCloseTo(RING_Y);
    for (const w of domeWindows()) expect(Math.hypot(w.pos[0], w.pos[2])).toBeLessThan(R);
  });
  it('sütunlar: yeşil, porfir ve beyaz; hiçbiri zemin rayının üstünde değil', () => {
    const c = columns(); expect(new Set(c.map((x) => x.kind))).toEqual(new Set(['verd', 'porphyry', 'white']));
    expect(c.filter((x) => x.kind === 'porphyry')).toHaveLength(8);
    for (const p of RAILS[0].points) for (const col of c.filter((x) => x.pos[1] === 0)) expect(Math.hypot(col.pos[0] - p[0], col.pos[2] - p[2])).toBeGreaterThan(2);
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

describe('Ayasofya: rota, göz uyumu, inceleme', () => {
  it('bölgeler rotaya göre: narteks → nef → apsis; galeri rayı üst katta', () => {
    const z = RAILS[0].points.map(zoneAt); expect(z[0]).toBe('narteks'); expect(z).toContain('nef'); expect(z[z.length - 1]).toBe('apsis');
    for (const p of RAILS[1].points) { expect(zoneAt(p)).toBe('galeri'); expect(p[1]).toBeGreaterThan(GALLERY_Y + 1.5); }
  });
  it('göz uyumu: narteksten nefe girince pozlama önce yüksek (kamaşma), ~2 sn sonra uyum', () => {
    let e = EXPOSURE.narteks; expect(EXPOSURE.narteks).toBeGreaterThan(EXPOSURE.nef * 2);
    for (let i = 0; i < 12; i++) e = adapt(e, EXPOSURE.nef, 1 / 60);          // 0,2 sn
    expect(e).toBeGreaterThan(EXPOSURE.nef * 1.8);
    for (let i = 0; i < 60 * ADAPT_SECONDS; i++) e = adapt(e, EXPOSURE.nef, 1 / 60);
    expect(e).toBeLessThan(EXPOSURE.nef * 1.12);
  });
  it('her ilgi noktası kendi rayından görülebilir; kaynaklar https', () => {
    for (const p of POIS) {
      const rail = RAILS.find((r) => r.id === p.rail)!; let ok = false;
      for (const e of rail.points) { const d = [p.pos[0] - e[0], p.pos[1] - e[1], p.pos[2] - e[2]], l = Math.hypot(...d); if (lookingAt(e, d.map((v) => v / l) as [number, number, number], rail.id)?.id === p.id) ok = true; }
      expect(ok, p.id).toBe(true); expect(p.source.url).toMatch(/^https:\/\//);
    }
    expect(POIS.filter((p) => p.kind === 'mozaik').map((p) => p.id)).toEqual(expect.arrayContaining(['deisis', 'zoe', 'komnenos', 'apsis-mozaigi']));
  });
  it('inceleme: yüksekteki hedefe yürünmez, görüş daralır; yakındaki hedefe yaklaşılır', () => {
    const dome = POIS.find((p) => p.id === 'kubbe')!, zoe = POIS.find((p) => p.id === 'zoe')!;
    expect(inspectEye(dome, [3, 1.7, 0])[1]).toBeCloseTo(1.7);
    const e = inspectEye(zoe, [20, GALLERY_Y + 1.68, 22]); expect(e[0]).toBeGreaterThan(20); expect(e[1]).toBeCloseTo(GALLERY_Y + 1.68);
    expect(inspectFov(50, 4)).toBeLessThan(inspectFov(5, 4)); expect(inspectFov(1000, 1)).toBe(9);
  });
});
