import { describe, expect, it } from 'vitest';
import * as S from '../src/app/games/galata/StaircaseMechanic';
import * as F from '../src/app/games/galata/firstPerson';
import { CRESTS, DUNGEON, WALK_Z, inBeam, trackBeam, type V3 } from '../src/app/games/galata/dungeon';
import { VIEWPOINTS, bearingOf, distanceOf, isWater, toLocal } from '../src/app/games/galata/panorama';
import { EXHIBITS, nearestExhibit } from '../src/app/games/galata/exhibits';

describe('Galata: sarmal merdiven (yürüyerek çıkma)', () => {
  it('yükseklik açıyla artar, basamaklıdır ve tepede durur', () => {
    let prev = -1;
    for (let th = 0; th <= S.TOP_THETA; th += 0.05) { const y = S.floorAt(th); expect(y).toBeGreaterThanOrEqual(prev); prev = y; }
    expect(S.floorAt(S.TOP_THETA)).toBeCloseTo(S.TOP_Y, 5); expect(S.floorAt(S.TOP_THETA + 5)).toBeCloseTo(S.TOP_Y, 5); expect(S.floorAt(-1)).toBe(0);
  });
  it('açı tur atınca da kesintisiz izlenir; uçlarda sınırlanır', () => {
    let th = 0.1; const r = 2.6;
    for (let k = 1; k <= 200; k++) { const a = 0.1 + k * 0.1; th = S.unwrap(th, Math.cos(a) * r, Math.sin(a) * r); }
    expect(th).toBeCloseTo(0.1 + 200 * 0.1, 5);
    expect(S.clampTheta(-3)).toBeGreaterThan(-0.5); expect(S.clampTheta(999)).toBeLessThan(S.TOP_THETA + 0.5);
  });
  it('çıkmak nefes harcar; durunca dolar, pencere önünde daha hızlı; nefes bitince yavaşlar ama durmaz', () => {
    let b = 1; for (let i = 0; i < 50; i++) b = S.breathStep(b, 0.2, true, false, 0.1);
    expect(b).toBeLessThan(0.1); expect(S.speedFactor(b)).toBeGreaterThan(0.25); expect(S.speedFactor(1)).toBe(1);
    const rest = S.breathStep(0.2, 0, false, false, 1), win = S.breathStep(0.2, 0, false, true, 1);
    expect(rest).toBeGreaterThan(0.2); expect(win).toBeGreaterThan(rest);
    expect(S.breathStep(0.5, 0, true, true, 1)).toBe(0.5);   // yürürken dolmaz
  });
  it('her pencere bir sahanlıkta, merdivenin içinde ve kaynaklı', () => {
    expect(S.WINDOWS.length).toBe(S.TURNS - 1);
    for (const w of S.WINDOWS) { expect(w.theta).toBeGreaterThan(0); expect(w.theta).toBeLessThan(S.TOP_THETA); expect(S.atWindow(w.theta, w)).toBe(true); expect(w.source.url).toMatch(/^https:/); }
  });
});

describe('Galata: birinci şahıs hareket ve bakış', () => {
  it('ileri, bakılan yöne gider; sağa adım dik yöne; çapraz hızlanmaz', () => {
    const [x, z] = F.walk([0, 0], 0, 1, 0, 2, 1); expect(x).toBeCloseTo(0); expect(z).toBeCloseTo(-2);
    const [x2, z2] = F.walk([0, 0], 0, 0, 1, 2, 1); expect(x2).toBeCloseTo(2); expect(z2).toBeCloseTo(0);
    const [x3, z3] = F.walk([0, 0], 1.1, 1, 1, 2, 1); expect(Math.hypot(x3, z3)).toBeCloseTo(2, 5);
  });
  it('alanlar ve engeller', () => {
    expect(F.clampTo({ kind: 'rect', minX: -1, maxX: 1, minZ: -2, maxZ: 2 }, [5, -9])).toEqual([1, -2]);
    const [rx, rz] = F.clampTo({ kind: 'ring', rMin: 8, rMax: 9 }, [3, 0]); expect(Math.hypot(rx, rz)).toBeCloseTo(8);
    const [px, pz] = F.pushOut([0.1, 0], [{ x: 0, z: 0, r: 1 }]); expect(Math.hypot(px, pz)).toBeCloseTo(1);
  });
  it('bakış serbest: yaw sınırsız, pitch yalnızca boyun sınırında; hedefe bakış ölçülür', () => {
    expect(F.clampPitch(3)).toBe(F.PITCH_LIMIT); expect(F.clampPitch(-3)).toBe(-F.PITCH_LIMIT);
    expect(F.lookError([0, 1.6, 0], 0, 0, [0, 1.6, -5])).toBeCloseTo(0, 5);
    expect(F.lookError([0, 1.6, 0], Math.PI, 0, [0, 1.6, -5])).toBeCloseTo(Math.PI, 5);
    expect(F.yawError([0, 0], -Math.PI / 2, [10, 0])).toBeCloseTo(0, 5);
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
