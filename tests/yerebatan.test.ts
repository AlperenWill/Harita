import { describe, expect, it } from 'vitest';
import { COLUMNS, GRID, MEDUSA, MEDUSA_IDS, POIS, SIZE, START, WALKWAYS, hitsColumn, lookingAt, onWalkway, walkable, DECK_Y, EYE } from '../src/app/games/yerebatan/cistern';
import { PITCH_LIMIT, createFP, headBob, look, mouseDelta, touchDelta, walk, MAX_SPEED, STEP_LEN } from '../src/app/games/yerebatan/FirstPersonController';

describe('Yerebatan: yerleşim', () => {
  it('336 sütun, 12 × 28, sarnıç sınırları içinde', () => {
    expect(COLUMNS).toHaveLength(336); expect(GRID.rows * GRID.cols).toBe(336);
    for (const [x, z] of COLUMNS) { expect(Math.abs(x)).toBeLessThan(SIZE.len / 2); expect(Math.abs(z)).toBeLessThan(SIZE.wid / 2); }
  });
  it('platformlar hiçbir sütunla kesişmez; başlangıç yürünebilir', () => {
    expect(walkable(START.x, START.z)).toBe(true);
    for (const r of WALKWAYS) for (let x = r.x0 + 0.3; x < r.x1 - 0.3; x += 0.5) for (let z = r.z0 + 0.3; z < r.z1 - 0.3; z += 0.5) expect(hitsColumn(x, z), `${x},${z}`).toBe(false);
  });
  it('platform ağı bağlı: girişten her ilgi noktasının yanına yürünebilir', () => {
    // ızgara üzerinde taşkın doldurma (0,25 m adım)
    const key = (x: number, z: number) => `${Math.round(x * 4)},${Math.round(z * 4)}`, seen = new Set<string>(), q: [number, number][] = [[START.x, START.z]];
    while (q.length) { const [x, z] = q.pop()!; const k = key(x, z); if (seen.has(k) || !walkable(x, z)) continue; seen.add(k); q.push([x + 0.25, z], [x - 0.25, z], [x, z + 0.25], [x, z - 0.25]); }
    for (const p of POIS) {
      let ok = false; for (let dx = -4; dx <= 4 && !ok; dx += 0.25) for (let dz = -4; dz <= 4 && !ok; dz += 0.25) if (seen.has(key(p.pos[0] + dx, p.pos[2] + dz)) && Math.hypot(dx, dz) < 4) ok = true;
      expect(ok, p.id).toBe(true);
    }
  });
  it('iki Medusa: biri ters (180°), biri yan (90°), kuzeybatı köşede', () => {
    expect(MEDUSA.map((m) => m.roll).sort()).toEqual([Math.PI / 2, Math.PI]);
    for (const id of MEDUSA_IDS) { const p = POIS.find((x) => x.id === id)!; expect(p.pos[0]).toBeLessThan(-60); expect(p.pos[2]).toBeLessThan(-15); }
    for (const p of POIS) expect(p.source.url).toMatch(/^https:\/\//);
  });
  it('nişangâh: ilgi noktasına doğru bakınca bulur, ters yöne bakınca bulmaz', () => {
    const p = POIS.find((x) => x.id === 'devsirme')!, eye: [number, number, number] = [p.pos[0] + 2.5, DECK_Y + EYE, p.pos[2]];
    const d = [p.pos[0] - eye[0], p.pos[1] - eye[1], p.pos[2] - eye[2]], l = Math.hypot(...d);
    expect(lookingAt(eye, d.map((v) => v / l) as [number, number, number])?.id).toBe('devsirme');
    expect(lookingAt(eye, [1, 0, 0])).toBeNull();
  });
});

describe('Yerebatan: birinci şahıs denetleyicisi', () => {
  it('yukarı/aşağı bakış ±45° ile sınırlı', () => {
    let s = createFP(START.x, START.z);
    s = look(s, 0, 5); expect(s.pitch).toBeCloseTo(PITCH_LIMIT); s = look(s, 0, -10); expect(s.pitch).toBeCloseTo(-PITCH_LIMIT);
    expect((PITCH_LIMIT * 180) / Math.PI).toBeCloseTo(45);
  });
  it('dokunmatik hassasiyet ekran genişliğine göre: tam kaydırma ≈ 120°; fareden düşük', () => {
    const t = touchDelta(390, 0, 390); expect((-t.dyaw * 180) / Math.PI).toBeCloseTo(120, 0);
    expect(Math.abs(touchDelta(1, 0, 390).dyaw)).toBeLessThan(Math.abs(mouseDelta(1, 0).dyaw) * 3);
    expect(Math.abs(touchDelta(100, 0, 1000).dyaw)).toBeLessThan(Math.abs(mouseDelta(100, 0).dyaw));
  });
  it('koşma yok: hız 1,1 m/sn sınırını aşmaz; platform dışına çıkılmaz; adım olayı üretilir', () => {
    let s = createFP(START.x, START.z, 0), steps = 0, maxV = 0;
    for (let i = 0; i < 600; i++) { const r = walk(s, 1, 0.3, 1 / 60); s = r.state; if (r.step) steps++; maxV = Math.max(maxV, Math.hypot(s.vx, s.vz)); expect(onWalkway(s.x, s.z)).toBe(true); }
    expect(maxV).toBeLessThanOrEqual(MAX_SPEED + 1e-9); expect(steps).toBeGreaterThan(3); expect(s.dist / STEP_LEN).toBeGreaterThan(steps - 1);
  });
  it('girişte bırakılınca durur; baş sallanma dururken sıfır', () => {
    let s = createFP(START.x, START.z, 0);
    for (let i = 0; i < 60; i++) s = walk(s, 1, 0, 1 / 60).state;
    for (let i = 0; i < 120; i++) s = walk(s, 0, 0, 1 / 60).state;
    expect(Math.hypot(s.vx, s.vz)).toBeLessThan(0.01);
    const b = headBob(s, 0); expect(Math.abs(b.x) + Math.abs(b.y)).toBe(0);
  });
});
