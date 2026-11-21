import { describe, expect, it } from 'vitest';
import data from '../src/app/monuments/data/ankara-anitkabir.json';
import { COL_Z, DOORS, EXHIBITS, HALL, MUSE1, MUSE2, PANORAMAS, SARCOPHAGUS, SARC_SIZE, VAULTS, allColliders, arcOf, museumBlocked, nearestInteract, pierXs, torchPositions } from '../src/app/monuments/anitkabir/interior';
import { FRONT_X, HOTSPOTS, LION_ROAD, MAUSOLEUM, PLAZA, PODIUM_H, POSES, STAIR_X0, TERRACE_X, WALK, groundHeight, isClear, lions, mausoleumColumns, stairSteps, towers } from '../src/app/monuments/anitkabir/layout';

describe('Anıtkabir yerleşimi (1:1 ölçek)', () => {
  it('bilinen ölçü ve sayılar', () => {
    expect([MAUSOLEUM.len, MAUSOLEUM.wid, MAUSOLEUM.h]).toEqual([57.35, 41.65, 17]);
    expect(MAUSOLEUM.podium.x1 - MAUSOLEUM.podium.x0).toBeCloseTo(72, 6);
    expect(MAUSOLEUM.podium.halfW * 2).toBe(52);
    expect(mausoleumColumns()).toHaveLength(44);
    expect(new Set(mausoleumColumns().map((c) => c.join())).size).toBe(44);
    expect(stairSteps()).toHaveLength(42);
    expect(lions()).toHaveLength(24);
    expect(towers()).toHaveLength(10);
    expect([PLAZA.w, PLAZA.d, LION_ROAD.length]).toEqual([129, 84.25, 262]);
  });
  it('merdiven meydandan mozole terasına ulaşır', () => {
    const s = stairSteps(), last = s[s.length - 1];
    expect(last.pos[1] + last.size[1] / 2).toBeCloseTo(PODIUM_H, 5);
  });
  it('aslanlar ve yol ağaçsız alanda kalır', () => {
    for (const l of lions()) expect(isClear(l.pos[0], l.pos[2])).toBe(false);
  });
});

describe('yürüme modu', () => {
  const hit = (x: number, z: number) => allColliders().some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  it('zemin: meydan 0, merdiven rampa, teras ve hol kaide yüksekliğinde', () => {
    expect(groundHeight(0, 0)).toBe(0);
    expect(groundHeight((STAIR_X0 + TERRACE_X) / 2, 0)).toBeCloseTo(PODIUM_H / 2, 5);
    expect(groundHeight(TERRACE_X + 2, 0)).toBe(PODIUM_H);
    expect(groundHeight(SARCOPHAGUS[0] - 8, 0)).toBe(PODIUM_H);
    expect(groundHeight(TERRACE_X + 2, 40)).toBe(0);      // kaidenin dışı
  });
  it('meydandan kapıdan geçip lahde kadar engelsiz yürünür; duvarlar ve lahit engeldir', () => {
    for (let x = WALK.spawn.x; x < SARCOPHAGUS[0] - 4; x += 0.5) expect(hit(x, 0), `x=${x}`).toBe(false);
    expect(hit(HALL.front + 0.5, 6)).toBe(true);           // kapının yanındaki ön duvar
    expect(hit(SARCOPHAGUS[0], 0)).toBe(true);
    expect(hit(FRONT_X + 1, MAUSOLEUM.wid / 2 - 1)).toBe(true);   // köşe sütunu
  });
});

describe('Şeref Holü (v2)', () => {
  const hit = (x: number, z: number) => allColliders().some(([x0, z0, x1, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
  it('kaynaklardaki sayılar: 9\'ar tonozlu iki galeri, 12 meşale, 27 kiriş, üç giriş, ~40 t lahit', () => {
    expect(pierXs()).toHaveLength(HALL.bays + 1); expect(HALL.bays).toBe(9);
    expect(torchPositions()).toHaveLength(12);
    expect(HALL.beams).toBe(27);
    const t = SARC_SIZE[0] * SARC_SIZE[1] * SARC_SIZE[2] * 2.7; expect(t).toBeGreaterThan(36); expect(t).toBeLessThan(44);
  });
  it('sütunlarla hol arasında koridor yok: galeriler sütun hattına kadar uzanır, yan cephe sütun aralarında kapalıdır', () => {
    expect(HALL.halfW).toBeGreaterThan(COL_Z - 0.5);
    for (let x = HALL.x0 + 1; x < HALL.x1 - 1; x += 0.5) { const nearPier = pierXs().some((p) => Math.abs(p - x) < 1.2); if (!nearPier) expect(hit(x, 17), `galeri x=${x}`).toBe(false); }
    expect(hit((HALL.x0 + HALL.x1) / 2, COL_Z)).toBe(true);
  });
  it('üç girişten de holün içine girilir', () => {
    for (const z of [0, -HALL.sideDoor.z, HALL.sideDoor.z]) for (let x = HALL.front - 2; x < HALL.x0 + 2; x += 0.25) expect(hit(x, z), `z=${z} x=${x}`).toBe(false);
  });
});

describe('Atatürk ve Kurtuluş Savaşı Müzesi', () => {
  it('panorama ölçüleri ve 18 tonoz', () => {
    expect(PANORAMAS.map((p) => [p.h, p.w])).toEqual([[6, 40], [7, 30], [7, 30]]);
    for (const p of PANORAMAS) expect(arcOf(p)).toBeLessThan(Math.PI);
    expect(VAULTS).toHaveLength(18);
    expect(MUSE2.y + MUSE2.h).toBeLessThan(PODIUM_H);   // müze Şeref Holü'nün altında, kaidenin içinde
  });
  it('kapılar ve ışınlanma noktaları geçilebilir yerde; kapıda istem çıkar', () => {
    for (const d of DOORS) {
      if (d.to.level !== 'out') expect(museumBlocked(d.to.level, d.to.x, d.to.z, WALK.radius), d.id).toBe(false);
      if (d.level !== 'out') { const R = d.level === 'muze1' ? MUSE1 : MUSE2, cx = (R.x0 + R.x1) / 2; expect(museumBlocked(d.level, d.at[0] + Math.sign(cx - d.at[0]) * 1, d.at[1], WALK.radius), d.id + ' kapı önü').toBe(false); }
      expect(nearestInteract(d.level, d.at[0], d.at[1])?.kind).toBe('door');
    }
  });
  it('her müze sergisine yaklaşılabilir (yakınında yürünebilir bir nokta var)', () => {
    for (const e of EXHIBITS.filter((x) => x.level !== 'out')) {
      let ok = false; for (let a = 0; a < 6.3 && !ok; a += 0.2) for (let d = 0.5; d < e.reach && !ok; d += 0.4) { const x = e.at[0] + Math.cos(a) * d, z = e.at[2] + Math.sin(a) * d; if (!museumBlocked(e.level, x, z, WALK.radius)) ok = true; }
      expect(ok, e.id).toBe(true);
    }
  });
  it('lahit holün sonundaki nişte', () => { expect(SARCOPHAGUS[0]).toBeGreaterThan(HALL.x1 - HALL.niche.depth); });
});

describe('Anıtkabir verisi (ortak şema)', () => {
  it('şema alanları ve her nokta için hotspot + kamera pozu var', () => {
    expect(data.id).toBe('ankara-anitkabir');
    expect(data.type).toBe('monument');
    expect(data.coordinates).toEqual([32.8375, 39.9255]);
    expect(data.lodConfig).toEqual({ near: 20000, mid: 5000, far: 500 });
    expect(data.interactions).toEqual(['orbit', 'zoom', 'info-panel']);
    for (const p of data.metadata.points) { expect(HOTSPOTS[p.id], p.id).toBeDefined(); expect(POSES[p.id], p.id).toBeDefined(); }
  });
});
