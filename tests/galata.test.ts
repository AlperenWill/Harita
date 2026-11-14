import { describe, expect, it } from 'vitest';
import * as S from '../src/app/games/galata/StaircaseMechanic';
import { CRESTS, DUNGEON, WALK_Z, inBeam, trackBeam, type V3 } from '../src/app/games/galata/dungeon';
import { VIEWPOINTS, bearingOf, distanceOf, isWater, toLocal } from '../src/app/games/galata/panorama';
import { EXHIBITS, nearestExhibit } from '../src/app/games/galata/exhibits';

describe('Galata: merdiven ritmi', () => {
  it('vuruşa denk gelen kaydırma basamak çıkar, uzak olan çıkmaz', () => {
    let s = S.createClimb(0);
    let r = S.stepInput(s, 0.8 + 0.05); expect(r.events[0]).toMatchObject({ type: 'step', judgement: 'tam' }); s = r.state;
    r = S.stepInput(s, 1.6 + 0.25); expect(r.events[0]).toMatchObject({ type: 'step', judgement: 'iyi' }); s = r.state;
    r = S.stepInput(s, 2.0); expect(r.events[0].type).toBe('miss'); expect(r.state.steps).toBe(2);
  });
  it('kusursuz oyuncu: 3 sahanlıkta nefes alarak 48 basamağı çıkar', () => {
    let s = S.createClimb(0), t = 0, landings = 0, top = false;
    while (!top && t < 400) {
      if (s.phase === 'climb') {
        t = s.origin + Math.ceil((t - s.origin) / s.beat + 0.5) * s.beat;   // bir sonraki vuruş
        const r = S.stepInput(s, t); s = r.state;
        for (const e of r.events) { if (e.type === 'landing') landings++; if (e.type === 'top') top = true; }
      } else if (s.phase === 'breath') {
        s = S.holdStart(s, t); t += S.BREATH_FULL; const r = S.tick(s, t); s = r.state;
        expect(r.events[0].type).toBe('breath-done');
      }
    }
    expect(top).toBe(true); expect(s.steps).toBe(S.TOTAL_STEPS); expect(landings).toBe(S.FLIGHTS - 1); expect(s.missed).toBe(0);
  });
  it('kısa nefes cezasız tekrarlanır; sahanlıkta basamak çıkılmaz', () => {
    let s = { ...S.createClimb(0), steps: S.STEPS_PER_FLIGHT, phase: 'breath' as const };
    expect(S.stepInput(s, 10).events).toEqual([]);
    s = S.holdStart(s, 10) as typeof s;
    const r = S.holdEnd(s, 11); expect(r.events[0].type).toBe('breath-short'); expect(r.state.phase).toBe('breath');
  });
  it('art arda 3 kaçırma tempoyu yavaşlatır, ama en yavaş sınırın altına inmez', () => {
    let s = S.createClimb(0);
    for (let i = 0; i < 30; i++) s = S.stepInput(s, s.origin + s.beat * 0.5 + i * 0.001).state;
    expect(s.beat).toBeGreaterThan(S.START_BEAT); expect(s.beat).toBeLessThanOrEqual(S.SLOWEST_BEAT);
    expect(s.phase).toBe('climb');
  });
});

describe('Galata: zindan feneri', () => {
  const eye: V3 = [0, DUNGEON.eye, WALK_Z[0]];
  const aimAt = (p: V3): V3 => { const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]; const l = Math.hypot(...d); return d.map((x) => x / l) as V3; };
  it('armalar duvarlarda ve geçidin içinde', () => {
    for (const c of CRESTS) { expect(Math.abs(c.pos[0])).toBeLessThanOrEqual(DUNGEON.wid / 2); expect(Math.abs(c.pos[2])).toBeLessThanOrEqual(DUNGEON.len / 2); }
  });
  it('fener armaya tutulunca 1,2 sn sonra bulunur; başka yöne tutulunca bulunmaz', () => {
    const c = CRESTS[0];
    expect(inBeam(eye, aimAt(c.pos), c.pos)).toBe(true);
    let hold: Record<string, number> = {}, found: string[] = [];
    for (let i = 0; i < 20; i++) { const r = trackBeam(hold, found, eye, aimAt(c.pos), 0.05); hold = r.hold; found = [...found, ...r.newly]; }
    expect(found).toEqual([]);
    for (let i = 0; i < 6; i++) { const r = trackBeam(hold, found, eye, aimAt(c.pos), 0.05); hold = r.hold; found = [...found, ...r.newly]; }
    expect(found).toContain(c.id);
    expect(trackBeam({}, [], eye, [0, 0, 1], 5).newly).toEqual([]);
  });
});

describe('Galata: teras panoraması', () => {
  it('yönler gerçek konumlarla uyumlu', () => {
    const b = Object.fromEntries(VIEWPOINTS.map((v) => [v.id, bearingOf(v.coord)]));
    expect(b.ayasofya).toBeGreaterThan(150); expect(b.ayasofya).toBeLessThan(175);     // güney-güneydoğu
    expect(b.suleymaniye).toBeGreaterThan(205); expect(b.suleymaniye).toBeLessThan(235); // güneybatı
    expect(b['kiz-kulesi']).toBeGreaterThan(90); expect(b['kiz-kulesi']).toBeLessThan(110); // doğu
    expect(b.bogaz).toBeGreaterThan(40); expect(b.bogaz).toBeLessThan(75);              // kuzeydoğu
    const sorted = Object.values(b).sort((x, y) => x - y);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeGreaterThan(30);
    for (const v of VIEWPOINTS) { expect(distanceOf(v.coord)).toBeGreaterThan(1000); expect(distanceOf(v.coord)).toBeLessThan(4000); }
  });
  it('su maskesi: kule ve camiler karada, Kız Kulesi ve Boğaz suda', () => {
    expect(isWater(0, 0)).toBe(false);
    expect(isWater(...toLocal(VIEWPOINTS[0].coord))).toBe(false);
    expect(isWater(...toLocal(VIEWPOINTS[1].coord))).toBe(false);
    expect(isWater(...toLocal(VIEWPOINTS[2].coord))).toBe(true);
    expect(isWater(...toLocal(VIEWPOINTS[3].coord))).toBe(true);
    expect(isWater(...toLocal([28.9711, 41.0168]))).toBe(false);   // Eminönü, Yeni Cami
    expect(isWater(...toLocal([28.973, 41.0205]))).toBe(true);    // Haliç ağzı (Galata Köprüsü)
  });
});

describe('Galata: sergi', () => {
  it('dört vitrin eşit aralıklı; yalnızca dinlenmemiş vitrine kilitlenir', () => {
    expect(EXHIBITS).toHaveLength(4);
    expect(nearestExhibit(EXHIBITS[0].angle + 0.1, [])?.id).toBe(EXHIBITS[0].id);
    expect(nearestExhibit(EXHIBITS[0].angle + 0.1, [EXHIBITS[0].id])).toBeNull();
    expect(nearestExhibit(EXHIBITS[0].angle + Math.PI / 4, [])).toBeNull();
  });
});
