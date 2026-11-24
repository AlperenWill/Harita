import { describe, expect, it } from 'vitest';
import { BOUNDS, DOLAP_AT, KH, ROUNDS, SHELVES, SPOTS, START, atDolap, groundY, levelAfter, slide, trayOk, walkable } from '../src/app/games/safranbolu/site';

/** İki katlı BFS: durum (x, z, kat); komşuya yükseklik farkı 0.6'dan küçükse geçilir, kat merdivende değişir */
function reach() {
  const cell = 0.3, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz * 2);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number, up: boolean) => (Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell)) * 2 + (up ? 1 : 0);
  const q = [idx(START.at[0], START.at[1], false)]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, up = c % 2 === 1, cc = (c - (c % 2)) / 2, i = cc % nx, j = (cc - i) / nx, [x0, z0] = at(i, j), y0 = groundY(x0, z0, up);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const [x, z] = at(a, b);
      if (!walkable(x, z, up) || Math.abs(groundY(x, z, up) - y0) > 0.6) continue; const nu = levelAfter(x, z, up), k = idx(x, z, nu); if (seen[k]) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number, up: boolean) => seen[idx(x, z, up)] === 1;
}
describe('Safranbolu — Dönme Dolap', () => {
  const r = reach();
  it('meydandan hana, sokaktan eve ve merdivenle üst kata, odalara ve dolaba yürünür', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1], !!s.up), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    expect(r(DOLAP_AT[0], DOLAP_AT[1], true)).toBe(true); expect(atDolap(DOLAP_AT[0], DOLAP_AT[1], true)).toBe(true);
    expect(r(3, 90, true)).toBe(true);
  });
  it('kat ayrımı: üst katta zemin yüksekliği, odalar yalnız kapıdan; harem-selamlık arası kapalı', () => {
    expect(groundY(0, 83, true)).toBe(KH.up); expect(walkable(-1.5, 85, true)).toBe(false); expect(walkable(-3.5, 85, true)).toBe(true);
    expect(walkable(0, 90, true)).toBe(false);
    let p = { at: [-1, 90] as [number, number], up: true }; for (let i = 0; i < 20; i++) p = slide(p.at, 0.2, 0, p.up); expect(p.at[0]).toBeLessThan(0);
  });
  it('dolap: raftaki ikram istenenle eşleşir (sıra önemsiz)', () => {
    for (const rd of ROUNDS) { expect(rd.want.length).toBeLessThanOrEqual(SHELVES); const tray = [...rd.want].reverse() as (typeof rd.want[number] | null)[]; while (tray.length < SHELVES) tray.push(null); expect(trayOk(tray, rd.want)).toBe(true); }
    expect(trayOk(['kahve', null, null], ['kahve', 'kahve'])).toBe(false);
  });
});
