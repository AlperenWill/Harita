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


/**
 * Rota koridorunda serbest yürüyüş (oyuncu rotaya raylı bağlı değil): konum = rota üzerindeki s + yanal sapma o (|o| ≤ width).
 * (wx, wz) dünya düzlemindeki yer değiştirme; rota yönüne izdüşürülüp s'ye, dikine o'ya eklenir. s'ye bağlı oyun mantığı (duraklar,
 * pencereler) olduğu gibi çalışır. Koridor genişliği her oyunda yapılara girilmeyecek kadar dar seçilir.
 */
export function freeStep(routeAt: (s: number) => { dir: [number, number] }, len: number, st: { s: number; o: number }, wx: number, wz: number, width: number) {
  const d = routeAt(st.s).dir, nx = -d[1], nz = d[0];
  st.s = Math.max(0, Math.min(len, st.s + wx * d[0] + wz * d[1]));
  st.o = Math.max(-width, Math.min(width, st.o + wx * nx + wz * nz));
}
/** Koridordaki konum: rota noktası + yanal sapma (yükseklik rota noktasınınki) */
export function freePos(routeAt: (s: number) => { p: V3; dir: [number, number] }, s: number, o: number): V3 {
  const R = routeAt(s); return [R.p[0] - R.dir[1] * o, R.p[1], R.p[2] + R.dir[0] * o];
}
/** Bakış yönüne göre giriş (ileri fwd, yana str) → birim dünya yönü; giriş yoksa null */
export function inputDir(yaw: number, fwd: number, str: number): [number, number] | null {
  const m = Math.hypot(fwd, str); if (m < 0.05) return null;
  const wx = -Math.sin(yaw) * fwd + Math.cos(yaw) * str, wz = -Math.cos(yaw) * fwd - Math.sin(yaw) * str, l = Math.hypot(wx, wz) || 1;
  return [wx / l, wz / l];
}
/**
 * Bir karelik serbest yürüyüş (Efes, Pamukkale, Truva, Zil Kale, Dolmabahçe, Hattuşa): bakılan yöne göre W/S + A/D ya da sürükleme;
 * st.head yalnızca başlangıçta rota yönüne konur, sonra kamera rotayı kendiliğinden İZLEMEZ. Dönen değer: yürünen mesafe (m).
 */
export function walkFree(live: { s: number; o: number; v: number; input: number; strafe: number; yaw: number }, st: { head: number; dir?: [number, number] },
  routeAt: (s: number) => { dir: [number, number] }, len: number, dt: number, speed: number, width: number, can: boolean): number {
  if (Number.isNaN(st.head)) { const R0 = routeAt(live.s); st.head = Math.atan2(-R0.dir[0], -R0.dir[1]); }
  const d = can ? inputDir(st.head + live.yaw, live.input, live.strafe) : null; if (d) st.dir = d;
  const want = d ? Math.min(1, Math.hypot(live.input, live.strafe)) * speed : 0;
  live.v += (want - live.v) * (1 - Math.exp(-dt * 5));
  const s0 = live.s, o0 = live.o; if (st.dir && live.v > 0.01) freeStep(routeAt, len, live, st.dir[0] * live.v * dt, st.dir[1] * live.v * dt, width);
  return Math.hypot(live.s - s0, live.o - o0);
}
