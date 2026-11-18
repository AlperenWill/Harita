/**
 * Paylaşılan yol bulma (saf; DOM yok): bir yürünebilirlik fonksiyonu + sınırlar → ızgara, hedef başına BFS akış alanı.
 * Rehber görüş açıksa hedefe doğrudan yürür; değilse akış alanının eğimini izler ve görüş açık kaldıkça daha ileri bakar (yumuşak yol).
 * Topkapı ve Ayasofya oyunları kullanır.
 */
export type V2 = [number, number];
export interface NavSpace { walkable: (x: number, z: number) => boolean; bounds: { x0: number; x1: number; z0: number; z1: number; cell: number } }
export interface Nav {
  clearLine: (a: V2, b: V2) => boolean;
  nextWaypoint: (p: V2, goal: V2) => V2;
  slide: (p: V2, dx: number, dz: number) => V2;
  step: (p: V2, goal: V2, dt: number, speed: number) => { p: V2; moved: number; yaw: number | null };
}
export function makeNav(space: NavSpace): Nav {
  const { walkable } = space, b = space.bounds;
  let grid: { nx: number; nz: number; free: Uint8Array } | null = null;
  const flows = new Map<string, Float32Array>();
  const G = () => {
    if (grid) return grid;
    const nx = Math.round((b.x1 - b.x0) / b.cell) + 1, nz = Math.round((b.z1 - b.z0) / b.cell) + 1, free = new Uint8Array(nx * nz), m = Math.min(0.15, b.cell * 0.45);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = b.x0 + i * b.cell, z = b.z0 + j * b.cell; free[j * nx + i] = walkable(x, z) && walkable(x + m, z) && walkable(x - m, z) && walkable(x, z + m) && walkable(x, z - m) ? 1 : 0; }
    return (grid = { nx, nz, free });
  };
  const cellOf = (x: number, z: number) => { const g = G(); return [Math.max(0, Math.min(g.nx - 1, Math.round((x - b.x0) / b.cell))), Math.max(0, Math.min(g.nz - 1, Math.round((z - b.z0) / b.cell)))] as const; };
  const flow = (goal: V2) => {
    const key = `${goal[0].toFixed(1)},${goal[1].toFixed(1)}`; let f = flows.get(key); if (f) return f;
    const g = G(); f = new Float32Array(g.nx * g.nz).fill(Infinity);
    const [gi, gj] = cellOf(goal[0], goal[1]), q = new Int32Array(g.nx * g.nz); let h = 0, t = 0; f[gj * g.nx + gi] = 0; q[t++] = gj * g.nx + gi;
    while (h < t) { const c = q[h++], ci = c % g.nx, cj = (c - ci) / g.nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue; const k = j * g.nx + i; if (!g.free[k] || f[k] !== Infinity) continue; f[k] = f[c] + 1; q[t++] = k; } }
    flows.set(key, f); return f;
  };
  const clearLine = (a: V2, c: V2) => {
    const d = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.ceil(d / 0.3);
    for (let k = 1; k <= n; k++) if (!walkable(a[0] + (c[0] - a[0]) * (k / n), a[1] + (c[1] - a[1]) * (k / n))) return false;
    return true;
  };
  const nextWaypoint = (p: V2, goal: V2): V2 => {
    if (clearLine(p, goal)) return goal;
    const g = G(), f = flow(goal); let [i, j] = cellOf(p[0], p[1]);
    if (f[j * g.nx + i] === Infinity) {   // duvar dibindeyse en yakın erişilebilir komşu hücre
      let best = Infinity, bi = i, bj = j;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= g.nx || jj >= g.nz) continue; const v = f[jj * g.nx + ii]; if (v < best) { best = v; bi = ii; bj = jj; } }
      if (best === Infinity) return goal; i = bi; j = bj;
    }
    let wp: V2 = [b.x0 + i * b.cell, b.z0 + j * b.cell];
    for (let s = 0; s < 12; s++) {
      let bi = i, bj = j, bv = f[j * g.nx + i];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= g.nx || jj >= g.nz) continue; if (f[jj * g.nx + ii] < bv) { bv = f[jj * g.nx + ii]; bi = ii; bj = jj; } }
      if (bi === i && bj === j) break; i = bi; j = bj;
      const c: V2 = [b.x0 + i * b.cell, b.z0 + j * b.cell]; if (s > 1 && !clearLine(p, c)) break; wp = c;
    }
    return wp;
  };
  /** Eksen eksen kayarak yürü */
  const slide = (p: V2, dx: number, dz: number): V2 => { let [x, z] = p; if (walkable(x + dx, z)) x += dx; if (walkable(x, z + dz)) z += dz; return [x, z]; };
  const step = (p: V2, goal: V2, dt: number, speed: number) => {
    const d = Math.hypot(goal[0] - p[0], goal[1] - p[1]); if (d < 0.35) return { p, moved: 0, yaw: null };
    const w = nextWaypoint(p, goal), wd = Math.hypot(w[0] - p[0], w[1] - p[1]) || 1, s = Math.min(speed * dt, d);
    const n = slide(p, ((w[0] - p[0]) / wd) * s, ((w[1] - p[1]) / wd) * s), moved = Math.hypot(n[0] - p[0], n[1] - p[1]);
    return { p: n, moved, yaw: moved > 1e-4 ? Math.atan2(-(n[0] - p[0]), -(n[1] - p[1])) : null };
  };
  return { clearLine, nextWaypoint, slide, step };
}
