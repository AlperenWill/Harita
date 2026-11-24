import { describe, expect, it } from 'vitest';
import { BOUNDS, GALLERY_CELLS, SPOTS, START, TERRACE, TOMBS, WORK, WORK_AT, WORK_GRID, blockZ, canCarve, cellAt, galleryBack, groundY, slide, walkable, type V2 } from '../src/app/games/amasya/site';

/** Yükseklik farkı 0.6 m'den küçük adımlarla BFS (merdivenden düşme/atlama yok) */
function reach() {
  const cell = 0.4, nx = Math.round((BOUNDS.x1 - BOUNDS.x0) / cell) + 1, nz = Math.round((BOUNDS.z1 - BOUNDS.z0) / cell) + 1, seen = new Uint8Array(nx * nz);
  const at = (i: number, j: number) => [BOUNDS.x0 + i * cell, BOUNDS.z0 + j * cell];
  const idx = (x: number, z: number) => Math.round((z - BOUNDS.z0) / cell) * nx + Math.round((x - BOUNDS.x0) / cell);
  const q = [idx(START.at[0], START.at[1])]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop()!, i = c % nx, j = (c - i) / nx, [x0, z0] = at(i, j);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const k = b * nx + a, [x, z] = at(a, b); if (seen[k] || !walkable(x, z) || Math.abs(groundY(x, z) - groundY(x0, z0)) > 0.6) continue; seen[k] = 1; q.push(k); } }
  return (x: number, z: number) => seen[idx(x, z)] === 1;
}
describe('Amasya — Kayadan Ayır', () => {
  const r = reach();
  it('güney kıyıdan köprü, sokak ve merdivenle teras, tünel ve batı mezarlarına yürünür', () => {
    for (const s of SPOTS) { expect(r(s.at[0], s.at[1]), s.id).toBe(true); expect(s.source.url).toMatch(/^https:\/\//); }
    expect(r(WORK_AT[0], WORK_AT[1])).toBe(true); expect(groundY(WORK_AT[0], WORK_AT[1])).toBe(TERRACE.y);
    expect(r(-66, -30)).toBe(true);
  });
  it('her mezarın galerisinden bloğun arkasına geçilir; bloğun içine girilmez', () => {
    for (const t of TOMBS) { const [bz0] = blockZ(t), behind: V2 = [t.x, (bz0 + galleryBack(t)) / 2]; expect(r(behind[0], behind[1]), t.id).toBe(true); expect(walkable(t.x, bz0 + 1)).toBe(false); }
  });
  it('teras kenarından aşağı atlanmaz; nehre girilmez', () => {
    let [x, z]: V2 = [0, -28.2]; for (let i = 0; i < 40; i++) [x, z] = slide([x, z], 0, 0.3); expect(groundY(x, z)).toBe(TERRACE.y);
    expect(walkable(10, 15)).toBe(false); expect(walkable(0, 15)).toBe(true);
  });
  it('oyma ızgarası: blok ortada, galeri ters U; yukarıdan aşağıya hepsi oyulabilir', () => {
    expect(WORK_GRID.length).toBe(WORK.rows); expect(GALLERY_CELLS).toBeGreaterThan(15);
    expect(cellAt(4, 0)).toBe('b'); expect(cellAt(0, 0)).toBe('g'); expect(cellAt(4, WORK.rows - 1)).toBe('g');
    const carved = new Set<string>(); let progress = true;
    while (progress) { progress = false; for (let r2 = WORK.rows - 1; r2 >= 0; r2--) for (let c = 0; c < WORK.cols; c++) if (canCarve(c, r2, carved)) { carved.add(`${c},${r2}`); progress = true; } }
    expect(carved.size).toBe(GALLERY_CELLS);
    expect(canCarve(0, 0, new Set())).toBe(false);
  });
});
