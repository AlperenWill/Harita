import { describe, expect, it } from 'vitest';
import { CHAPTERS, COURT, DOOR, DRONE, PORTALS, RAILS, ROOMS, THINGS, roomAt, thingsOf, visibleRooms, EYE } from '../src/app/games/topkapi/palace';
import { WHISPER_FACTOR, dragToYaw, inspectEye, nearestThing, pulse, twoFingerAngle } from '../src/app/games/topkapi/ObjectInteractionSystem';

describe('Topkapı: bölümler ve odalar', () => {
  it('dört bölüm; odalar art arda ve aralarında kapı var', () => {
    expect(CHAPTERS).toEqual(['kapi', 'avlu', 'ic', 'hazine']);
    for (let i = 1; i < ROOMS.length; i++) expect(ROOMS[i].x0).toBe(ROOMS[i - 1].x1);
    expect(PORTALS).toHaveLength(ROOMS.length - 1);
    expect(roomAt(7).id).toBe('divan'); expect(roomAt(20).id).toBe('koridor'); expect(roomAt(40).id).toBe('valide'); expect(roomAt(50).id).toBe('hamam');
  });
  it('ışık sıcaklığı: Divan en beyaz, koridor en sıcak; koridor dar açılı ve titrek', () => {
    const k = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
    expect(k.divan.kelvin).toBeGreaterThan(k.valide.kelvin); expect(k.valide.kelvin).toBeGreaterThan(k.koridor.kelvin);
    expect(k.koridor.fov).toBeLessThan(k.divan.fov); expect(k.koridor.shake).toBe(1); expect(k.divan.shake).toBe(0);
  });
  it('iç ray her odadan geçer ve odaların içinde kalır', () => {
    const seen = new Set(RAILS.ic.map((p) => roomAt(p[0]).id)); expect(seen.size).toBe(ROOMS.length);
    for (const p of RAILS.ic) { expect(Math.abs(p[2])).toBeLessThan(roomAt(p[0]).halfW); expect(p[1]).toBe(EYE); }
    // kapılardan geçerken ray açıklığın içinde
    for (const pt of PORTALS) for (const p of RAILS.ic) if (Math.abs(p[0] - pt.x) < 1.6) expect(Math.abs(p[2])).toBeLessThan(DOOR.w / 2);
  });
});

describe('Topkapı: portal ayıklama', () => {
  it('bulunulan oda her zaman görünür; kapıya bakınca komşu oda eklenir, sırtını dönünce çıkar', () => {
    expect(visibleRooms([7, EYE, 0], 0, 80)).toEqual(expect.arrayContaining(['divan', 'koridor']));
    const back = visibleRooms([7, EYE, 0], Math.PI, 80); expect(back).toEqual(['divan']);
    const side = visibleRooms([7, EYE, 0], Math.PI / 2, 60); expect(side).toEqual(['divan']);
  });
  it('zincirleme: koridorun içinden ileri bakınca Valide dairesi, hizalıysa hamam da görünür; yana kayınca zincir kopar', () => {
    const v = visibleRooms([23, EYE, 0], 0, 60); expect(v).toEqual(expect.arrayContaining(['koridor', 'valide', 'hamam'])); expect(v).not.toContain('divan');
    const off = visibleRooms([36, EYE, 3.5], 0.6, 30); expect(off).toContain('valide'); expect(off).not.toContain('hamam');
    const both = visibleRooms([23, EYE, 0], Math.PI / 2, 170); expect(both).toEqual(expect.arrayContaining(['divan', 'valide']));
  });
  it('hiçbir konumda dörtten fazla, hiçbir zaman sıfır oda dönmez; yinelenen yok', () => {
    for (let x = 1; x < 53; x += 2.3) for (let a = -3; a < 3; a += 0.7) { const v = visibleRooms([x, EYE, 0], a, 70); expect(v.length).toBeGreaterThan(0); expect(new Set(v).size).toBe(v.length); expect(v[0]).toBe(roomAt(x).id); }
  });
});

describe('Topkapı: nesne etkileşimi', () => {
  it('her nesne kendi bölümünün rayından tetiklenebilir; kaynaklar https', () => {
    for (const t of THINGS) {
      expect(t.source.url).toMatch(/^https:\/\//);
      const rail = RAILS[t.chapter as 'kapi' | 'ic' | 'hazine']; let min = Infinity;
      for (let i = 0; i < rail.length - 1; i++) for (let k = 0; k <= 20; k++) { const u = k / 20, x = rail[i][0] + (rail[i + 1][0] - rail[i][0]) * u, z = rail[i][2] + (rail[i + 1][2] - rail[i][2]) * u; min = Math.min(min, Math.hypot(x - t.pos[0], z - t.pos[2])); }
      expect(min, t.id).toBeLessThan(t.trigger);
    }
    expect(thingsOf('hazine').map((t) => t.id)).toEqual(['kasikci', 'hancer']); expect(thingsOf('avlu')).toHaveLength(0);
  });
  it('evreler: uzak → fısıltı → inceleme; görülen nesne yeniden tetiklenmez', () => {
    const t = THINGS.find((x) => x.id === 'cini')!, list = [t];
    expect(nearestThing([t.pos[0], EYE, t.pos[2] - t.trigger * WHISPER_FACTOR - 1], list, [])).toBeNull();
    expect(nearestThing([t.pos[0], EYE, t.pos[2] - t.trigger * 1.5], list, [])?.phase).toBe('whisper');
    expect(nearestThing([t.pos[0], EYE, t.pos[2] - t.trigger * 0.8], list, [])?.phase).toBe('inspect');
    expect(nearestThing([t.pos[0], EYE, t.pos[2] - 0.5], list, [t.id])).toBeNull();
  });
  it('inceleme gözü: zoom/listen yerinden; macro ve rotate yaklaşır; döndürme girdileri', () => {
    const eye: [number, number, number] = [0, EYE, 0], tug = THINGS.find((x) => x.id === 'tugra')!, kas = THINGS.find((x) => x.id === 'kasikci')!;
    expect(inspectEye(tug, eye)).toEqual(eye);
    const e = inspectEye(kas, [-3.4, EYE, 0]); expect(Math.hypot(e[0] - kas.pos[0], e[2] - kas.pos[2])).toBeCloseTo(1.05, 2);
    expect(dragToYaw(390, 390)).toBeCloseTo(Math.PI * 2); expect(twoFingerAngle({ x: 0, y: 0 }, { x: 0, y: 5 })).toBeCloseTo(Math.PI / 2);
    expect(pulse(0, 'inspect')).toBe(1); expect(pulse(0, 'far')).toBeLessThan(pulse(0, 'whisper') + 0.4);
  });
  it('avlu: drone rotası yüksekten ve yapıların üstünden geçer', () => {
    for (const d of DRONE) expect(d.pos[1]).toBeGreaterThan(20);
    expect(COURT.map((c) => c.id)).toEqual(expect.arrayContaining(['bab-i-humayun', 'babusselam', 'divan', 'harem', 'hazine']));
  });
});
