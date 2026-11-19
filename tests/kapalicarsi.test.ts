/** Kapalıçarşı: prosedürel üretim, yürünebilirlik, ipucu mantığı, kalabalık simülasyonu. */
import { describe, expect, it } from 'vitest';
import { GRID, TRADES, compass, edgeRect, generate, nearestEsnaf, shopAtDoor, slide, walkable, type Layout, type V2 } from '../src/app/games/kapalicarsi/ProceduralStreetGenerator';
import { QUESTIONS, answer } from '../src/app/games/kapalicarsi/clues';

/** BFS: başlangıçtan bir noktaya yürünebilir mi (0,5 m ızgara) */
function reachable(L: Layout, a: V2, b: V2) {
  const c = 0.5, key = (x: number, z: number) => `${Math.round(x / c)},${Math.round(z / c)}`, seen = new Set([key(...a)]), q: V2[] = [a];
  while (q.length) { const [x, z] = q.shift()!; if (Math.hypot(x - b[0], z - b[1]) < 0.8) return true;
    for (const [dx, dz] of [[c, 0], [-c, 0], [0, c], [0, -c]]) { const n: V2 = [x + dx, z + dz], k = key(...n); if (seen.has(k) || !walkable(L, ...n)) continue; seen.add(k); q.push(n); } }
  return false;
}
const SEEDS = [1, 42, 1234, 99991, 2026];
describe('Kapalıçarşı üreteci', () => {
  it('aynı tohum aynı çarşıyı, farklı tohum farklı çarşıyı verir', () => {
    expect(JSON.stringify(generate(42))).toBe(JSON.stringify(generate(42)));
    expect(generate(42).edges.map((e) => `${e.a}-${e.b}`).join()).not.toBe(generate(43).edges.map((e) => `${e.a}-${e.b}`).join());
  });
  it('her tohumda: ana cadde tam, yüzlerce dükkân, 4 kapı, her loncadan sokak adları; başlangıç yürünebilir', () => {
    for (const s of SEEDS) {
      const L = generate(s);
      expect(L.edges.filter((e) => e.main && e.b >= 0)).toHaveLength(GRID.cols - 1);
      expect(L.shops.length).toBeGreaterThan(150); expect(L.gates).toHaveLength(4); expect(L.esnaf.length).toBeGreaterThan(15);
      expect(walkable(L, ...L.start.at)).toBe(true);
      expect(L.streets.find((x) => x.name === 'Kalpakçılar Caddesi')).toBeTruthy();
      for (const sh of L.shops) expect(TRADES).toContain(sh.trade);
    }
  });
  it('labirent bağlı: hedef, yem, her esnaf ve rastgele dükkân kapıları başlangıçtan yürünerek ulaşılabilir', () => {
    for (const s of SEEDS.slice(0, 3)) {
      const L = generate(s), pts: V2[] = [L.shops[L.target].door, L.shops[L.decoy].door, ...L.esnaf.slice(0, 6).map((e) => e.at), ...L.shops.filter((_, k) => k % 37 === 0).map((x) => x.door)];
      for (const p of pts) { expect(walkable(L, ...p), `${s} ${p}`).toBe(true); expect(reachable(L, L.start.at, p), `${s} ${p}`).toBe(true); }
    }
  });
  it('hedef eşyanın zanaatına uygun bir dükkânda; yem başka bir dükkânda ve hedeften uzak', () => {
    for (const s of SEEDS) { const L = generate(s), t = L.shops[L.target], d = L.shops[L.decoy];
      expect(L.item.trades).toContain(t.trade); expect(L.target).not.toBe(L.decoy); expect(Math.hypot(t.door[0] - d.door[0], t.door[1] - d.door[1])).toBeGreaterThan(20); }
  });
  it('dükkân kapıları yürünebilir, cephenin önünde; kapı önü algılanır; duvar geçilmez', () => {
    const L = generate(7);
    for (const sh of L.shops) expect(walkable(L, ...sh.door), `${sh.id}`).toBe(true);
    const sh = L.shops[10]; expect(shopAtDoor(L, ...sh.door)?.id).toBe(sh.id);
    let p: V2 = [...sh.door]; for (let i = 0; i < 60; i++) p = slide(L, p, sh.normal[0] * 0.1, sh.normal[1] * 0.1);   // dükkâna doğru yürü: cephede durur
    const R = edgeRect(L, L.edges[sh.edge]); expect(Math.abs(-(p[0] - R.c[0]) * R.d[1] + (p[1] - R.c[1]) * R.d[0])).toBeLessThanOrEqual(R.w);
  });
  it('pusula: x doğu, −z kuzey', () => {
    expect(compass([0, 0], [0, -10])).toBe('kuzey'); expect(compass([0, 0], [10, 0])).toBe('doğu'); expect(compass([0, 0], [-10, 10])).toBe('güneybatı');
  });
});
describe('Kapalıçarşı ipuçları', () => {
  it('doğru sorular hedefe, "benzer" sorusu yeme götürür; yön cevabı hedefin gerçek yönünü söyler', () => {
    const L = generate(1234), e = L.esnaf.find((x) => Math.hypot(x.at[0] - L.shops[L.target].door[0], x.at[1] - L.shops[L.target].door[1]) > 10)!;
    expect(answer(L, e, 'esnaf').leadsTo).toBe('hedef'); expect(answer(L, e, 'benzer').leadsTo).toBe('yem');
    expect(answer(L, e, 'yon').text).toContain(compass(e.at, L.shops[L.target].door));
    expect(answer(L, e, 'esnaf').text).toContain(['kuyumcular', 'halıcılar', 'bakırcılar', 'aktarlar', 'lambacılar', 'çiniciler', 'antikacılar', 'kumaşçılar'].find((t) => answer(L, e, 'esnaf').text.includes(t))!);
    for (const q of QUESTIONS) expect(answer(L, e, q.id).text.length).toBeGreaterThan(10);
  });
  it('sokağı yalnızca aynı loncadan esnaf bilir', () => {
    for (const s of SEEDS) { const L = generate(s), t = L.shops[L.target];
      for (const e of L.esnaf) { const a = answer(L, e, 'sokak'); expect(a.leadsTo === 'hedef').toBe(e.trade === t.trade); } }
  });
  it('esnafın yanına gelince algılanır', () => { const L = generate(5), e = L.esnaf[0]; expect(nearestEsnaf(L, e.at[0] + 1, e.at[1])?.id).toBe(e.id); });
});

import { createCrowd, stepCrowd } from '../src/app/games/kapalicarsi/CrowdSystem';
describe('Kapalıçarşı kalabalığı', () => {
  it('500 ajan 60 sn boyunca sokaklarda kalır, hız sınırını aşmaz, vitrin ve sohbet durumları oluşur', () => {
    const L = generate(42), c = createCrowd(L, 520, 3); let r = 1; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const prev = c.agents.map((a) => [a.x, a.z]); let maxV = 0, browse = 0, talk = 0;
    for (let f = 0; f < 60 * 30; f++) {
      stepCrowd(c, 1 / 30, [0, 0], rnd);
      c.agents.forEach((a, i) => { const v = Math.hypot(a.x - prev[i][0], a.z - prev[i][1]) * 30; if (v < 10) maxV = Math.max(maxV, v); prev[i] = [a.x, a.z]; if (a.state === 1) browse++; if (a.state === 2) talk++; });
    }
    for (const a of c.agents) expect(walkable(L, a.x, a.z, 0), `${a.x},${a.z}`).toBe(true);
    expect(maxV).toBeLessThan(1.75);   // yürüme ≤ 1,5 m/sn + şerit değişimi ≤ 0,8 m/sn expect(browse).toBeGreaterThan(0); expect(talk).toBeGreaterThan(0);
  });
  it('500 ajanın bir adımı hızlı (bütçe: < 2 ms)', () => {
    const L = generate(1), c = createCrowd(L, 520, 1), t0 = performance.now();
    for (let i = 0; i < 100; i++) stepCrowd(c, 1 / 60, [0, 0]);
    expect((performance.now() - t0) / 100).toBeLessThan(2);
  });
});

import { counterItems } from '../src/app/games/kapalicarsi/items';
describe('Kapalıçarşı tezgâhları', () => {
  it('hedef yalnızca hedef dükkânda, yem yalnızca yem dükkânında; her tezgâhta 5 nesne; deterministik', () => {
    for (const s of SEEDS) {
      const L = generate(s); let hedef = 0, yem = 0;
      for (const sh of L.shops) { const items = counterItems(L, sh.id); expect(items).toHaveLength(5); hedef += items.filter((i) => i.role === 'hedef').length; yem += items.filter((i) => i.role === 'yem').length;
        if (items.some((i) => i.role === 'hedef')) expect(sh.id).toBe(L.target); if (items.some((i) => i.role === 'yem')) expect(sh.id).toBe(L.decoy); }
      expect(hedef).toBe(1); expect(yem).toBe(1);
      expect(JSON.stringify(counterItems(L, L.target))).toBe(JSON.stringify(counterItems(L, L.target)));
    }
  });
});
