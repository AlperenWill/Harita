/** Hattuşa: ~6 km sur, rota kapılardan geçer (başka yerde suru kesmez), ritüel kuralı, akış planı */
import { describe, expect, it } from 'vitest';
import { GATES, ROUTE_LEN, WALL_LEN, YAZ_S, distToWall, routeAt } from '../src/app/games/hattusa/site';
import { BOW_T, OPEN_T, begin, canPerform, doorOpen, guard, newRitual, nextGate, tick } from '../src/app/games/hattusa/GateRitualMechanic';
import { CHUNKS, countLevels, streamPlan } from '../src/app/games/hattusa/OpenWorldStreamer';

describe('Hattuşa yerleşimi', () => {
  it('sur çevresi ~6 km; kapılar sırayla Aslanlı → Sfenksli → Kral; Yazılıkaya sonda', () => {
    expect(WALL_LEN).toBeGreaterThan(5600); expect(WALL_LEN).toBeLessThan(6400);
    expect(GATES.map((g) => g.id)).toEqual(['aslanli', 'sfenksli', 'kral']); expect(GATES[0].s).toBeLessThan(GATES[1].s); expect(GATES[1].s).toBeLessThan(GATES[2].s); expect(YAZ_S).toBeGreaterThan(GATES[2].s);
  });
  it('rota suru yalnızca kapılarda keser (kapılardan uzakta sura ≥ 15 m)', () => {
    for (let s = 0; s < ROUTE_LEN; s += 2) { const p = routeAt(s).p; if (GATES.some((g) => Math.abs(s - g.s) < 25)) continue; expect(distToWall(p[0], p[2]), `${s}`).toBeGreaterThan(15); }
  });
});
describe('Sınır geçiş ritüeli', () => {
  it('ritüelsiz kapı kapalı: oyuncu geçidin önünde durur ve uyarı alır', () => {
    const st = newRitual(), g = GATES[0]; const r = guard(st, g.s - 5, g.s + 10); expect(r.s).toBeLessThanOrEqual(g.s - 1.5); expect(r.warn?.kind).toBe('kapali');
  });
  it('ritüel: eğil → konuşma → açılış → açık; sonra geçilir, kapı "geçildi" olur', () => {
    let st = newRitual(); const g = GATES[0];
    expect(canPerform(st, g.s - 6)?.id).toBe(g.id); expect(canPerform(st, g.s - 40)).toBeNull();
    st = begin(st, g.id); st = tick(st, BOW_T + 0.1, false); expect(st.phase[g.id]).toBe('speech');
    st = tick(st, 0.1, true); expect(st.phase[g.id]).toBe('opening'); expect(doorOpen(st, g.id)).toBeLessThan(0.1);
    st = tick(st, OPEN_T + 0.1, false); expect(doorOpen(st, g.id)).toBe(1);
    const r = guard(st, g.s, g.s + 5); expect(r.warn).toBeNull(); expect(r.st.passed).toContain(g.id); expect(nextGate(r.st)?.id).toBe('sfenksli');
  });
  it('yanlış yön: geçilmiş kapıdan 20 m’den fazla geri dönülemez', () => {
    const st = { ...newRitual(), passed: ['aslanli' as const] }; const g = GATES[0]; const r = guard(st, g.s + 5, g.s - 60); expect(r.s).toBeCloseTo(g.s - 20); expect(r.warn?.kind).toBe('geri');
  });
});
describe('Açık dünya akışı', () => {
  it('oyuncu yanında az sayıda parça "hi", uzaktakiler "off"; histerezis sınırda takılmayı önler', () => {
    const p = routeAt(GATES[0].s).p, m = streamPlan(p[0], p[2], 'medium'), n = countLevels(m);
    expect(n.hi).toBeGreaterThan(0); expect(n.hi).toBeLessThan(5); expect(n.off).toBeGreaterThan(CHUNKS.length / 3);
    const low = countLevels(streamPlan(p[0], p[2], 'low')); expect(low.hi).toBeLessThanOrEqual(n.hi);
    const m2 = streamPlan(p[0] + 150, p[2], 'medium', m); m.forEach((v, k) => { if (v === 'hi' && m2.get(k) !== 'hi') { const c = CHUNKS[k]; expect(Math.hypot(c.center[0] - p[0] - 150, c.center[1] - p[2])).toBeGreaterThan(120); } });
  });
});
