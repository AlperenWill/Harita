/** Nemrut keşif oyunu: yürünebilirlik, nesnelere ve parçalara ulaşım, görevler, horoskop bulmacası. */
import { describe, expect, it } from 'vitest';
import { FRAGMENTS, HOROSCOPE, QUESTS, START, THINGS, WEST_STELAE, areaAt, hitPlanet, matches, nearFragment, nearestThing, slide, walkable, watching, type Progress, type V2 } from '../src/app/games/nemrut/site';
import { GOLDEN } from '../src/app/games/nemrut/DynamicLightingSystem';
import { FIGURES, TUMULUS } from '../src/app/games/nemrut/terrain';

/** BFS ile zirve halkasında iki nokta arası yürünebilir mi (0,5 m ızgara) */
function reachable(a: V2, b: V2) {
  const c = 0.5, key = (x: number, z: number) => `${Math.round(x / c)},${Math.round(z / c)}`, seen = new Set([key(...a)]), q: V2[] = [a];
  while (q.length) { const [x, z] = q.shift()!; if (Math.hypot(x - b[0], z - b[1]) < 1) return true;
    for (const [dx, dz] of [[c, 0], [-c, 0], [0, c], [0, -c]]) { const n: V2 = [x + dx, z + dz], k = key(...n); if (seen.has(k) || !walkable(...n)) continue; seen.add(k); q.push(n); } }
  return false;
}
describe('Nemrut keşfi', () => {
  it('başlangıç yürünebilir; tümülüse çıkılamaz; teraslar ve kuzey yolu birbirine bağlı', () => {
    expect(walkable(...START.at)).toBe(true); expect(walkable(0, 0)).toBe(false); expect(walkable(TUMULUS.r - 5, 0)).toBe(false);
    expect(reachable(START.at, [100, 0])).toBe(true); expect(reachable([100, 0], [-106, 0])).toBe(true);
    expect(areaAt(105, 0)).toBe('dogu'); expect(areaAt(-105, 0)).toBe('bati'); expect(areaAt(0, -95)).toBe('kuzey');
    let p: V2 = [80, 0]; for (let i = 0; i < 100; i++) p = slide(p, -0.1, 0); expect(Math.hypot(...p)).toBeGreaterThan(TUMULUS.r);
  });
  it('her nesne ve her yazıt parçası başlangıçtan yürüyerek ulaşılabilir ve incelenebilir', () => {
    for (const t of THINGS()) {
      let spot: V2 | null = null;
      for (let r = 0; r < t.reach && !spot; r += 0.4) for (let a = 0; a < 24; a++) { const x = t.at[0] + Math.cos(a / 3.82) * r, z = t.at[1] + Math.sin(a / 3.82) * r; if (walkable(x, z) && nearestThing(x, z)?.id === t.id) { spot = [x, z]; break; } }
      expect(spot, t.id).not.toBeNull(); expect(reachable(START.at, spot!), t.id).toBe(true); expect(t.source.url).toMatch(/^https:\/\//);
    }
    for (const f of FRAGMENTS) { expect(walkable(...f.at), f.id).toBe(true); expect(reachable(START.at, f.at), f.id).toBe(true); expect(nearFragment(...f.at, [])?.id).toBe(f.id); expect(nearFragment(...f.at, [f.id])).toBeNull(); }
  });
  it('ad eşleştirme: her parça tek bir tanrıya uyar', () => {
    for (const f of FRAGMENTS) expect(FIGURES.filter((g) => matches(f.id, g.id)).map((g) => g.id)).toEqual([f.god]);
    expect(matches('oromasdes', 'zeus')).toBe(true); expect(matches('mithras', 'herakles')).toBe(false);
  });
  it('görevler: boş ilerlemede hiçbiri tamam değil, tam ilerlemede hepsi tamam; gün doğumu/batımı terasa bağlı', () => {
    const empty: Progress = { area: 'guney', hour: 6, read: [], frags: [], placed: [], planets: [], seen: [], watched: [] };
    expect(QUESTS.some((q) => q.done(empty))).toBe(false);
    const full: Progress = { ...empty, read: FIGURES.map((f) => f.id), frags: FRAGMENTS.map((f) => f.id), placed: FRAGMENTS.map((f) => f.id), planets: HOROSCOPE.planets.map((p) => p.id), seen: WEST_STELAE.map((s) => s.id), watched: ['dogu', 'bati'] };
    expect(QUESTS.every((q) => q.done(full))).toBe(true);
    const mid = (g: [number, number]) => (g[0] + g[1]) / 2;
    expect(watching('dogu', mid(GOLDEN.dogu))).toBe('dogu'); expect(watching('bati', mid(GOLDEN.dogu))).toBeNull(); expect(watching('bati', mid(GOLDEN.bati))).toBe('bati'); expect(watching('kuzey', mid(GOLDEN.bati))).toBeNull();
  });
  it('horoskop: 19 yıldız, 3 gezegen; gezegene dokunmak onu bulur, yıldıza dokunmak bulmaz', () => {
    expect(HOROSCOPE.stars).toHaveLength(19); expect(HOROSCOPE.planets).toHaveLength(3);
    for (const p of HOROSCOPE.planets) expect(hitPlanet(...p.at)?.id).toBe(p.id);
    for (const s of HOROSCOPE.stars) expect(hitPlanet(...s)).toBeNull();
  });
});
