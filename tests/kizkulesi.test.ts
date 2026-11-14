import { describe, expect, it } from 'vitest';
import { DIALOGUES, advance, byId, lineDuration, mouthOpen, shuffle, visibleChars, type Playback } from '../src/app/games/kiz-kulesi/dialogue';
import { BOB, DECK, FERRY_SECONDS, bob, clampDeck, ferryPose, DOCK } from '../src/app/games/kiz-kulesi/ferry';
import { blend, desiredState, followTarget, stepToward, ZERO } from '../src/app/games/kiz-kulesi/npc';
import { DOOR, LEAD_ROUTE, PLAYER_START, ROOF_Y, STAIR_LEN, STONES, TERRACE_START, areaAt, slide, stairAt, terraceOk, ISLAND } from '../src/app/games/kiz-kulesi/island';
import { buildGeometries, triangleCount } from '../src/app/games/kiz-kulesi/rig';

describe('Kız Kulesi: diyalog verisi ve sistemi', () => {
  it('her diyalog geçerli; istenen replikler var', () => {
    const ids = new Set<string>();
    for (const d of DIALOGUES) { expect(ids.has(d.id)).toBe(false); ids.add(d.id); expect(d.lines.length).toBeGreaterThan(0); for (const l of d.lines) expect(l.text.length).toBeGreaterThan(10); }
    const all = DIALOGUES.flatMap((d) => d.lines.map((l) => l.text)).join(' ');
    expect(all).toContain('Bak, ufukta beliriyor!');
    expect(all).toContain('kızını yılanlardan korumak için');
    expect(all).toContain('Boğaz’ın iki yakasını aynı anda görebilirsin');
    expect(all).toContain('Bir dahaki sefere gün batımında gelmeliyiz!');
    expect(DIALOGUES.filter((d) => d.trigger.type === 'random')).toHaveLength(3);
  });
  it('rastgele sıra tekrarsız ve tohuma göre değişir', () => {
    const a = shuffle([1, 2, 3, 4, 5], 7), b = shuffle([1, 2, 3, 4, 5], 99);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]); expect(a).not.toEqual(b);
  });
  it('daktilo: zamanla harf açılır; geç önce tamamlar, sonra sonraki satıra geçer', () => {
    const d = byId('vapur-efsane')!, p: Playback = { dialogue: d, line: 0, start: 0, revealed: false };
    expect(visibleChars(d.lines[0].text, 0.2)).toBeGreaterThan(3);
    expect(visibleChars(d.lines[0].text, lineDuration(d.lines[0].text) + 0.01)).toBe(d.lines[0].text.length);
    const r1 = advance(p, 0.5); expect(r1.event).toBe('complete-line');
    const r2 = advance(r1.state!, 0.6); expect(r2.event).toBe('next-line'); expect(r2.state!.line).toBe(1);
    const r3 = advance({ ...r2.state!, revealed: true }, 9); expect(r3.event).toBe('end'); expect(r3.state).toBeNull();
  });
  it('dudak senkronu: yazılırken açılıp kapanır, bitince kapalı', () => {
    const d = byId('teras')!, p: Playback = { dialogue: d, line: 0, start: 0, revealed: false };
    const vals = Array.from({ length: 40 }, (_, i) => mouthOpen(p, i * 0.025));
    expect(Math.max(...vals)).toBeGreaterThan(0.7); expect(Math.min(...vals)).toBeLessThan(0.4);
    expect(mouthOpen(p, 99)).toBe(0); expect(mouthOpen(null, 1)).toBe(0);
  });
});

describe('Kız Kulesi: vapur', () => {
  it('sallanma küçük ve sınırlı; iskelede sakinleşir', () => {
    let maxRoll = 0, maxPitch = 0, maxHeave = 0;
    for (let t = 0; t < 120; t += 0.05) { const b = bob(t); maxRoll = Math.max(maxRoll, Math.abs(b.roll)); maxPitch = Math.max(maxPitch, Math.abs(b.pitch)); maxHeave = Math.max(maxHeave, Math.abs(b.heave)); }
    expect(maxRoll).toBeLessThanOrEqual(BOB.roll[0] + BOB.roll[1]); expect((maxRoll * 180) / Math.PI).toBeLessThan(2.1);
    expect(maxPitch).toBeLessThanOrEqual(BOB.pitch[0] + BOB.pitch[1]); expect(maxHeave).toBeLessThanOrEqual(0.141);
    expect(Math.abs(bob(3, 0.25).roll)).toBeLessThan(Math.abs(bob(3, 1).roll) + 1e-9);
  });
  it('güverteden düşülmez: her nokta güverte sınırına çekilir', () => {
    for (const [x, z] of [[10, -9], [-10, -20], [0, 5], [3, -14]]) {
      const [cx, cz] = clampDeck(x, z); expect(Math.abs(cx)).toBeLessThanOrEqual(DECK.x); expect(cz).toBeGreaterThanOrEqual(DECK.zFront); expect(cz).toBeLessThanOrEqual(DECK.zBack);
    }
  });
  it('rota: kuzeybatıdan gelir, iskelede durur, hız sonda 0', () => {
    const a = ferryPose(0), e = ferryPose(1);
    expect(a.x).toBeLessThan(-200); expect(a.z).toBeLessThan(-300);
    expect(e.x).toBeCloseTo(DOCK.x); expect(e.z).toBeCloseTo(DOCK.z); expect(e.speed).toBe(0);
    expect(FERRY_SECONDS).toBeGreaterThan(40);
  });
});

describe('Kız Kulesi: Can (NPC)', () => {
  it('durum makinesi önceliği: point > talk > walk > idle', () => {
    expect(desiredState({ speaking: true, pointing: true, speed: 2 })).toBe('point');
    expect(desiredState({ speaking: true, pointing: false, speed: 2 })).toBe('talk');
    expect(desiredState({ speaking: false, pointing: false, speed: 2 })).toBe('walk');
    expect(desiredState({ speaking: false, pointing: false, speed: 0 })).toBe('idle');
  });
  it('geçişler yumuşak; yürürken konuşma katmanlanır', () => {
    let w = { ...ZERO };
    w = blend(w, 'talk', true, 0.05); expect(w.talk).toBeGreaterThan(0); expect(w.talk).toBeLessThan(0.5);
    for (let i = 0; i < 40; i++) w = blend(w, 'talk', true, 0.05);
    expect(w.talk).toBeGreaterThan(0.95); expect(w.walk).toBeGreaterThan(0.95); expect(w.idle).toBeLessThan(0.05);
  });
  it('takip: yanında / arkasında; önden giderken oyuncu uzaklaşırsa bekler', () => {
    const pl = { x: 0, z: 0 };
    const b = followTarget('beside', pl, pl, 0); expect(b.x).toBeGreaterThan(1);
    const h = followTarget('behind', pl, pl, 0); expect(h.z).toBeGreaterThan(1.5);
    expect(followTarget('lead', { x: 10, z: 0 }, pl, 0, { x: 20, z: 0 })).toEqual({ x: 10, z: 0 });
    expect(followTarget('lead', { x: 3, z: 0 }, pl, 0, { x: 20, z: 0 })).toEqual({ x: 20, z: 0 });
    const s = stepToward({ x: 0, z: 0 }, { x: 10, z: 0 }, 0.1); expect(s.pos.x).toBeGreaterThan(0); expect(s.yaw).toBeCloseTo(-Math.PI / 2);
  });
  it('poligon bütçesi: karakter 5000 üçgenin altında', () => {
    const n = triangleCount(buildGeometries()); expect(n).toBeLessThan(5000); expect(n).toBeGreaterThan(500);
  });
});

describe('Kız Kulesi: ada ve kule', () => {
  it('güverteden iskele tahtasına, iskeleden kapıya yürünebilir (denize düşmeden)', () => {
    expect(areaAt(PLAYER_START.x, PLAYER_START.z)).toBe('deck');
    let p = { ...PLAYER_START };
    for (const goal of [...LEAD_ROUTE.slice(1), DOOR]) {
      for (let i = 0; i < 400 && Math.hypot(goal.x - p.x, goal.z - p.z) > 0.3; i++) {
        const d = Math.hypot(goal.x - p.x, goal.z - p.z); p = slide(p, ((goal.x - p.x) / d) * 0.1, ((goal.z - p.z) / d) * 0.1);
        expect(areaAt(p.x, p.z), `${p.x},${p.z}`).not.toBeNull();
      }
    }
    expect(Math.hypot(p.x - DOOR.x, p.z - DOOR.z)).toBeLessThan(1.7);
    expect(areaAt(-30, 0)).toBeNull(); expect(areaAt(0, 0)).toBeNull();   // deniz ve binanın içi
    expect(areaAt(-17.2, 12, false)).toBeNull();                          // tahta kalkıkken geçilmez
  });
  it('merdiven: zeminden terasa sürekli yükselir; taşlar yolun üstünde', () => {
    let prev = stairAt(0).y;
    for (let s = 0.1; s <= STAIR_LEN; s += 0.1) { const y = stairAt(s).y; expect(y).toBeGreaterThanOrEqual(prev - 1e-9); prev = y; }
    expect(stairAt(0).y).toBeCloseTo(ISLAND.top); expect(stairAt(STAIR_LEN).y).toBeCloseTo(ROOF_Y);
    for (const st of STONES) { expect(st.s).toBeGreaterThan(0); expect(st.s).toBeLessThan(STAIR_LEN); }
  });
  it('teras: başlangıç geçerli, kulenin içine ve korkuluğun dışına çıkılmaz', () => {
    expect(terraceOk(TERRACE_START.x, TERRACE_START.z)).toBe(true);
    expect(terraceOk(0, -1)).toBe(false); expect(terraceOk(9, 0)).toBe(false);
  });
});
