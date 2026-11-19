/** Zil Kale: vadi rotası, açılma anları, sis matematiği, tarih katmanı. */
import { describe, expect, it } from 'vitest';
import { BRIDGE, CASTLE, LAYERS, REVEALS, ROUTE_LEN, SUMMIT_S, bridgeDeck, castleBase, heightAt, nearLayer, nextLayer, riverX, routeAt, waterY } from '../src/app/games/zilkale/valley';
import { BASE_DENSITY, CLEAR_FACTOR, density, linearFogRange, phaseHG, revealWeight, shaftIntensity, stepOpen, wind } from '../src/app/games/zilkale/VolumetricFogSystem';

describe('Zil Kale vadisi', () => {
  it('rota dere kıyısından başlar, köprüde dereyi geçer, yokuşu tırmanıp kale burnuna çıkar; hiçbir yerde suya girmez', () => {
    let crossed = false, prevSide = Math.sign(routeAt(0).p[0] - riverX(routeAt(0).p[2]));
    for (let s = 0; s <= ROUTE_LEN; s += 0.5) {
      const r = routeAt(s), side = Math.sign(r.p[0] - riverX(r.p[2]));
      if (!r.onBridge) { expect(Math.abs(r.p[0] - riverX(r.p[2])), `${s}`).toBeGreaterThan(5); expect(r.p[1]).toBeGreaterThanOrEqual(waterY(r.p[2]) + 0.4); }
      if (side !== prevSide) { expect(r.onBridge || routeAt(s - 0.5).onBridge).toBe(true); crossed = true; } prevSide = side;
    }
    expect(crossed).toBe(true); expect(routeAt(ROUTE_LEN).p[1]).toBeGreaterThan(routeAt(0).p[1] + 40); expect(ROUTE_LEN).toBeGreaterThan(300);
  });
  it('köprü kamburdur: ortası uçlarından yüksek, suyun en az 2 m üstünde; kale burnu dereden yüksekte', () => {
    const c = riverX(BRIDGE.z); expect(bridgeDeck(c)).toBeGreaterThan(bridgeDeck(c + BRIDGE.span / 2) + 4); expect(bridgeDeck(c + BRIDGE.span / 2)).toBeGreaterThan(waterY(BRIDGE.z) + 2);
    expect(castleBase()).toBeGreaterThan(waterY(CASTLE.z) + 50); expect(heightAt(riverX(-50), -50)).toBeLessThan(waterY(-50) + 0.1);
  });
  it('açılma anları sırayla: köprü → şelale → kale; kale tepesi rotanın sonunda', () => {
    expect(REVEALS.map((r) => r.id)).toEqual(['kopru', 'selale', 'kale']); expect(REVEALS[0].s).toBeLessThan(REVEALS[1].s); expect(REVEALS[1].s).toBeLessThan(REVEALS[2].s);
    expect(SUMMIT_S).toBeGreaterThan(REVEALS[1].s);
  });
});
describe('Sis matematiği', () => {
  it('HG faz: ileri saçılma (güneşe bakınca güçlü), normalize ~1', () => {
    expect(phaseHG(1)).toBeGreaterThan(phaseHG(0)); expect(phaseHG(0)).toBeGreaterThan(phaseHG(-1));
    let sum = 0; const N = 2000; for (let i = 0; i < N; i++) { const c = -1 + (2 * (i + 0.5)) / N; sum += phaseHG(c) * 2 * Math.PI * (2 / N); } expect(sum).toBeCloseTo(1, 2);
  });
  it('huzme: güneşe bakınca parlak, sırtı dönükken sönük; çok yoğun sis huzmeyi boğar', () => {
    expect(shaftIntensity(BASE_DENSITY * 0.5, 0.95)).toBeGreaterThan(shaftIntensity(BASE_DENSITY * 0.5, -0.5) * 3);
    expect(shaftIntensity(0.2, 0.95, 30)).toBeLessThan(shaftIntensity(0.03, 0.95, 30));
  });
  it('açılma: bölgede yoğunluk tabanın ~%12’sine iner; açılış hızlı, kapanış yavaş', () => {
    const s = REVEALS[0].s; expect(revealWeight(s).id).toBe('kopru'); expect(revealWeight(5).id).toBeNull();
    expect(density(s, 0, 1) / density(s, 0, 0)).toBeCloseTo(CLEAR_FACTOR, 5);
    let o = 0; for (let i = 0; i < 120; i++) o = stepOpen(o, 1, 1 / 60); expect(o).toBeGreaterThan(0.7);
    let c = 1; for (let i = 0; i < 120; i++) c = stepOpen(c, 0, 1 / 60); expect(c).toBeGreaterThan(0.3);
  });
  it('rüzgâr yönü birim vektör, hız 0..1; doğrusal sis aralığı mantıklı', () => {
    for (let t = 0; t < 200; t += 3.7) { const w = wind(t); expect(Math.hypot(...w.dir)).toBeCloseTo(1); expect(w.speed).toBeGreaterThanOrEqual(0); expect(w.speed).toBeLessThanOrEqual(1); }
    expect(linearFogRange(0.03)[1]).toBeCloseTo(63.3, 0);
  });
});
describe('Tarih katmanı', () => {
  it('her nokta rotadan ulaşılabilir; çift dokunuş sıradakini bulur; kaynaklar https', () => {
    for (const l of LAYERS) { expect(nearLayer(l.s)?.id, l.id).toBe(l.id); expect(l.source.url).toMatch(/^https:\/\//); }
    expect(nextLayer(0, [])?.id).toBe('ev'); expect(nextLayer(0, LAYERS.map((l) => l.id))).toBeNull();
  });
});

import { activated, morphTarget, stepMorph } from '../src/app/games/zilkale/HistoryLayerMorphing';
import { budget, pathDist, scatter } from '../src/app/games/zilkale/ProceduralVegetation';
import { fogPlan, summitClear } from '../src/app/games/zilkale/VolumetricFogSystem';
describe('Tarih katmanı geçişi', () => {
  it('yakında hedef 1, uzakta 0; geçiş ~1,5 sn; 0,5 eşiği bir kez tetiklenir', () => {
    const l = LAYERS[0]; expect(morphTarget(l.s, l)).toBe(1); expect(morphTarget(l.s + l.reach * 1.5, l)).toBe(0);
    let m = 0, fired = 0; for (let i = 0; i < 90; i++) { const n = stepMorph(m, 1, 1 / 60); if (activated(m, n)) fired++; m = n; } expect(m).toBeGreaterThan(0.9); expect(fired).toBe(1);
  });
});
describe('Bitki örtüsü + kademe', () => {
  it('düşük kademe alt bitki %50 ve yalnız patika kenarında (≤ 7 m); hiçbiri patikada ya da derede değil', () => {
    expect(budget('fern', 'low')).toBe(budget('fern', 'high') / 2);
    const low = scatter('fern', 'low'); expect(low.length).toBeGreaterThan(budget('fern', 'low') * 0.8);
    for (const p of low.slice(0, 400)) { const d = pathDist(p.x, p.z); expect(d).toBeGreaterThanOrEqual(1.2); expect(d).toBeLessThanOrEqual(7.5); expect(Math.abs(p.x - riverX(p.z))).toBeGreaterThanOrEqual(7.5); }
    for (const p of scatter('spruce', 'medium').slice(0, 300)) expect(Math.hypot(p.x - CASTLE.x, p.z - CASTLE.z)).toBeGreaterThan(22);
  });
  it('pil tasarrufu: doğrusal sis, perde/huzme/rüzgâr yok; tepede sis açılır', () => {
    const p = fogPlan('high', true); expect(p.linear).toBe(true); expect(p.sheets + p.shafts).toBe(0); expect(p.windAnim).toBe(false);
    expect(fogPlan('low', false).sheets).toBeLessThan(fogPlan('high', false).sheets);
    expect(summitClear(0)).toBe(0); expect(summitClear(ROUTE_LEN)).toBe(1); expect(density(ROUTE_LEN, 0, 1)).toBeLessThan(density(SUMMIT_S - 80, 0, 0) * 0.15);
  });
});
