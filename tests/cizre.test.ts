import { describe, expect, it } from 'vitest';
import { DIRS, PATCHES, SPOTS, START, nearestPatch, patchSolved, walkable, type Dir } from '../src/app/games/cizre/site';

describe('Cizre Kırmızı Medrese — Tuğla Tuğla', () => {
  it('başlangıç, duraklar ve panolar yürünebilir; panolar ayrık', () => {
    for (const p of [START.at, ...SPOTS.map((s) => s.at), ...PATCHES.map((q) => q.at)]) expect(walkable(p[0], p[1]), `${p}`).toBe(true);
    for (const q of PATCHES) expect(nearestPatch(q.at[0], q.at[1])?.id).toBe(q.id);
    expect(walkable(0, 9.5)).toBe(true); expect(walkable(6, 9.5)).toBe(false);
  });
  it('her pano yalnız doğru yönlerle tamamlanır; desen kendi içinde tutarlı', () => {
    for (const p of PATCHES) {
      const right: Record<string, Dir> = {}; for (const [c, r] of p.missing) right[`${p.id}:${c}:${r}`] = p.orient(c, r);
      expect(patchSolved(p, right), p.id).toBe(true);
      const [c, r] = p.missing[0], wrong = { ...right, [`${p.id}:${c}:${r}`]: DIRS.find((d) => d !== p.orient(c, r))! };
      expect(patchSolved(p, wrong)).toBe(false);
      const seen = new Set<Dir>(); for (let cc = 0; cc < p.cols; cc++) for (let rr = 0; rr < p.rows; rr++) seen.add(p.orient(cc, rr));
      expect(seen.size, p.id).toBeGreaterThanOrEqual(2);
      // eksik tuğlanın en az bir komşusu ipucu olarak görünür ve kuralı aynı
      for (const [mc, mr] of p.missing) expect(p.missing.some(([a, b]) => a === mc + 1 && b === mr) && p.missing.some(([a, b]) => a === mc - 1 && b === mr)).toBe(false);
    }
  });
  it('duraklar kaynaklı', () => { for (const s of SPOTS) expect(s.source.url).toMatch(/^https:\/\//); });
});
