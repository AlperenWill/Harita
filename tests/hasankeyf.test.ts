import { describe, expect, it } from 'vitest';
import { DRIVE_AT, LAKE_Y, PAD, PARK, PLATEAU_Y, ROAD, ROAD_LEN, SPOTS, START, TOMB0, groundY, nearestOnRoad, onRoad, safeSpeed, terrainY, walkable } from '../src/app/games/hasankeyf/site';

describe('Hasankeyf — Türbeyi Taşı', () => {
  it('başlangıç, duraklar ve taşıma noktası yürünebilir; nehre girilmez', () => {
    expect(walkable(START.at[0], START.at[1])).toBe(true);
    for (const s of SPOTS) expect(walkable(s.at[0], s.at[1]), s.id).toBe(true);
    expect(walkable(DRIVE_AT[0], DRIVE_AT[1])).toBe(true);
    expect(walkable(0, 20)).toBe(false);
    expect(walkable(TOMB0[0], TOMB0[1])).toBe(false);
  });
  it('yol türbeden parka kesintisiz; platform yol boyunca ilerleyebilir', () => {
    expect(ROAD[0]).toEqual(TOMB0);
    expect(Math.hypot(ROAD[ROAD.length - 1][0] - PAD[0], ROAD[ROAD.length - 1][1] - PAD[1])).toBeLessThan(12);
    for (let s = 0; s <= 1; s += 0.01) { const i = Math.min(ROAD.length - 2, Math.floor(s * (ROAD.length - 1))), t = s * (ROAD.length - 1) - i, a = ROAD[i], b = ROAD[i + 1];
      expect(onRoad(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)).toBe(true); }
    expect(onRoad(TOMB0[0] + 20, TOMB0[1])).toBe(false);
    expect(ROAD_LEN).toBeGreaterThan(200);
    expect(nearestOnRoad(PAD[0], PAD[1]).s).toBeGreaterThan(ROAD_LEN - 12);
  });
  it('yol yokuşu ılımlı; dik yerde güvenli hız düşer', () => {
    let maxSlope = 0; for (let s = 0; s < 1; s += 0.002) { const i = Math.min(ROAD.length - 2, Math.floor(s * (ROAD.length - 1))), t = s * (ROAD.length - 1) - i, a = ROAD[i], b = ROAD[i + 1], x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      const d = [(b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1])], sl = (terrainY(x + d[0], z + d[1]) - terrainY(x, z));
      maxSlope = Math.max(maxSlope, Math.abs(sl)); }
    expect(maxSlope).toBeGreaterThan(0.08); expect(maxSlope).toBeLessThan(0.3);
    expect(safeSpeed(0)).toBeGreaterThan(safeSpeed(maxSlope));
  });
  it('park baraj gölünün üstünde; kıyı altında kalır', () => {
    expect(groundY(PARK.at[0], PARK.at[1])).toBeGreaterThan(LAKE_Y + 5);
    expect(PLATEAU_Y).toBeGreaterThan(LAKE_Y);
    expect(walkable(START.at[0], START.at[1], LAKE_Y)).toBe(false);
    expect(walkable(PARK.at[0] + 10, PARK.at[1], LAKE_Y, PAD)).toBe(true);
  });
  it('duraklar kaynaklı ve ayrık', () => {
    for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//);
    for (const a of SPOTS) for (const b of SPOTS) if (a !== b) expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]), `${a.id}-${b.id}`).toBeGreaterThan(8);
  });
});
