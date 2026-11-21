/** Yol noktalarından yay uzunluğuna göre rota (saf; testlerde DOM gerektirmez) */
export type V3 = [number, number, number];
export function makeRoute(WP: [number, number][], heightAt: (x: number, z: number) => number) {
  const LENS = [0]; for (let i = 1; i < WP.length; i++) LENS.push(LENS[i - 1] + Math.hypot(WP[i][0] - WP[i - 1][0], WP[i][1] - WP[i - 1][1]));
  const ROUTE_LEN = LENS[LENS.length - 1];
  function routeAt(s: number): { p: V3; dir: [number, number] } {
    const c = Math.max(0, Math.min(ROUTE_LEN, s)); let i = 1; while (i < LENS.length - 1 && LENS[i] < c) i++;
    const a = WP[i - 1], b = WP[i], k = (c - LENS[i - 1]) / Math.max(1e-6, LENS[i] - LENS[i - 1]);
    const x = a[0] + (b[0] - a[0]) * k, z = a[1] + (b[1] - a[1]) * k, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    return { p: [x, heightAt(x, z), z], dir: [dx / l, dz / l] };
  }
  function closestS(x: number, z: number) { let best = 0, bd = Infinity; for (let s = 0; s <= ROUTE_LEN; s += 0.5) { const p = routeAt(s).p, d = Math.hypot(p[0] - x, p[2] - z); if (d < bd) { bd = d; best = s; } } return best; }
  return { ROUTE_LEN, routeAt, closestS };
}

