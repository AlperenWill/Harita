/** Dolmabahçe: rota, bölgeler, parıltı avı, nabız, avize kristal matematiği. */
import { describe, expect, it } from 'vitest';
import { ROUTE_LEN, ROOMS, STAIR, UPPER, clampToRoom, closestS, routeAt, stairPoint, zoneAt } from '../src/app/games/dolmabahce/palace';
import { SPARKLES, nearSparkle, nextUnfound, pulse } from '../src/app/games/dolmabahce/SparkleHuntMechanic';

const inside = (p: [number, number, number]) => ROOMS.some((r) => p[0] >= r.x0 - 0.01 && p[0] <= r.x1 + 0.01 && p[2] >= r.z0 - 0.01 && p[2] <= r.z1 + 0.01 && p[1] >= r.y - 0.01 && p[1] <= r.y + r.h);
describe('Dolmabahçe rotası', () => {
  it('rota baştan sona odaların içinden geçer; bölgeler sırayla gelir; merdiven 6 m tırmanır', () => {
    const seen: string[] = [];
    for (let s = 0; s <= ROUTE_LEN; s += 0.2) { const r = routeAt(s); expect(inside(r.p), `${s} ${r.p}`).toBe(true); const z = zoneAt(r.p); if (seen[seen.length - 1] !== z) seen.push(z); }
    expect(seen).toEqual(['medhal', 'muayede', 'avize', 'muayede', 'koridor', 'merdiven', 'sufera', 'ataturk']);
    expect(routeAt(0).p[1]).toBe(0); expect(routeAt(ROUTE_LEN).p[1]).toBe(UPPER); expect(ROUTE_LEN).toBeGreaterThan(80);
  });
  it('merdiven kolları tabanda birleşir, yarım daire çizip sahanlıkta buluşur (çift at nalı)', () => {
    const a0 = stairPoint(-1, 0), b0 = stairPoint(1, 0), a1 = stairPoint(-1, 1), b1 = stairPoint(1, 1);
    expect(a0[0]).toBeCloseTo(b0[0]); expect(a1[0]).toBeCloseTo(b1[0]); expect(a1[1]).toBe(UPPER);
    expect(Math.hypot(stairPoint(-1, 0.5)[0] - STAIR.cx, stairPoint(-1, 0.5)[2] - STAIR.cz)).toBeCloseTo(STAIR.r);
  });
  it('kamera kısıtlaması odanın içinde tutar', () => { const c = clampToRoom('medhal', [-50, 99, 30]); expect(inside(c)).toBe(true); });
});
describe('Parıltı avı', () => {
  it('her nesneye rotadan ulaşılır (yakınında "İncele" çıkar); kaynaklar https', () => {
    for (const k of SPARKLES) { expect(nearSparkle(k.sAnchor)?.id, k.id).toBe(k.id); expect(k.source.url).toMatch(/^https:\/\//); expect(k.sAnchor).toBeGreaterThanOrEqual(0); }
    expect(new Set(SPARKLES.map((k) => k.id)).size).toBe(SPARKLES.length);
  });
  it('nabız: bulunmamış nesne bulunmuştan parlak tepe yapar; pil tasarrufunda sabit; değerler sınırlı', () => {
    const k = SPARKLES[0]; let max = 0, maxF = 0;
    for (let t = 0; t < 10; t += 0.01) { max = Math.max(max, pulse(t, k, false, false)); maxF = Math.max(maxF, pulse(t, k, true, false)); }
    expect(max).toBeGreaterThan(1.6); expect(maxF).toBeLessThan(0.55);
    expect(pulse(0, k, false, true)).toBeCloseTo(pulse(3.3, k, false, true));
    for (let t = 0; t < 5; t += 0.1) expect(pulse(t, k, false, false)).toBeGreaterThanOrEqual(0.35);
  });
  it('çift dokunuş en yakın bulunmamış nesneyi seçer', () => {
    const first = SPARKLES[0]; expect(nextUnfound(first.sAnchor, [])?.id).toBe(first.id);
    expect(nextUnfound(first.sAnchor, [first.id])?.id).not.toBe(first.id); expect(nextUnfound(0, SPARKLES.map((k) => k.id))).toBeNull();
    expect(closestS(routeAt(40).p)).toBeCloseTo(40, 0);
  });
});

import { GRAND, SALON, crystalLayout, orbitCamera } from '../src/app/games/dolmabahce/CrystalChandelier';
import { chandelierLod, reflectionPlan, reflectorRoom } from '../src/app/games/dolmabahce/ReflectionOptimizer';
describe('Kristal avize ve optimizasyon', () => {
  it('dev avizede binlerce damla; çelenkler parabol (uçlarda sığ, ortada derin); ölçek seyreltir', () => {
    const all = crystalLayout(GRAND, 1), low = crystalLayout(GRAND, 0.3);
    expect(all.length).toBeGreaterThan(2000); expect(low.length).toBeLessThan(all.length * 0.45); expect(crystalLayout(SALON).length).toBeGreaterThan(300);
    for (const d of all) { const r = Math.hypot(d.p[0], d.p[2]); expect(r).toBeLessThan(4.2); expect(d.s).toBeGreaterThan(0); }
  });
  it('yörünge kamerası avizenin altında, sabit yarıçapta döner', () => {
    for (const t of [0, 5, 13]) { const c = orbitCamera([0, 17, -20], t); expect(Math.hypot(c[0], c[2] + 20)).toBeCloseTo(8.5); expect(c[1]).toBeLessThan(17); }
  });
  it('yansıma planı: düşükte küp, yüksekte düzlemsel + transmission; pil tasarrufu düşüğe iner; tek yansıtıcı oda', () => {
    expect(reflectionPlan('low', false).reflect).toBe('cube'); expect(reflectionPlan('high', false).reflect).toBe('planar'); expect(reflectionPlan('high', false).transmission).toBe(true);
    expect(reflectionPlan('high', true).reflect).toBe('cube'); expect(reflectionPlan('medium', false).transmission).toBe(false);
    expect(reflectorRoom('avize')).toBe('muayede'); expect(reflectorRoom('merdiven')).toBeNull();
  });
  it('avize LOD histerezisi sınırda titremez', () => {
    const p = reflectionPlan('medium', false); let l = chandelierLod(p.lodNear - 1, 'siluet', p); expect(l).toBe('detay');
    l = chandelierLod(p.lodNear + 1, l, p); expect(l).toBe('detay'); l = chandelierLod(p.lodNear * 1.2, l, p); expect(l).toBe('siluet');
  });
});
