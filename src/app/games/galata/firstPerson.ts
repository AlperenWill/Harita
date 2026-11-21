/**
 * Galata Kulesi — birinci şahıs hareket ve bakış (saf; React ve three.js'e bağımlı değildir, test edilir).
 *
 * Bütün bölümler birinci şahıstır ve bakış serbesttir: yaw sınırsız, pitch yalnızca boyun sınırıyla (±~77°).
 * Hareket her bölümün yürünebilir alanıyla sınırlanır (dikdörtgen oda, halka balkon, sarmal merdiven) ve
 * vitrin gibi engellerin çevresinden itilir. Koordinat: x doğu, z güney (three.js'te -z ileri), yaw pozitif = sola dönüş.
 */
export type XZ = [number, number];
export const PITCH_LIMIT = 1.35;
export const WALK_SPEED = 2.1;

/** Yaw için yatay ileri ve sağ birim vektörler */
export const forwardOf = (yaw: number): XZ => [-Math.sin(yaw), -Math.cos(yaw)];
export const rightOf = (yaw: number): XZ => [Math.cos(yaw), -Math.sin(yaw)];
export const clampPitch = (p: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Girdi (ileri, sağa; -1..1) → yeni konum. Çapraz girdi hızlanmaz. */
export function walk([x, z]: XZ, yaw: number, fwd: number, strafe: number, speed: number, dt: number): XZ {
  let f = fwd, s = strafe; const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
  const F = forwardOf(yaw), R = rightOf(yaw);
  return [x + (F[0] * f + R[0] * s) * speed * dt, z + (F[1] * f + R[1] * s) * speed * dt];
}

export type Area =
  | { kind: 'rect'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'ring'; rMin: number; rMax: number };
/** Konumu yürünebilir alana sıkıştırır */
export function clampTo(a: Area, [x, z]: XZ): XZ {
  if (a.kind === 'rect') return [Math.max(a.minX, Math.min(a.maxX, x)), Math.max(a.minZ, Math.min(a.maxZ, z))];
  const r = Math.hypot(x, z);
  if (r < 1e-6) return [a.rMin || 0, 0];
  const k = Math.max(a.rMin, Math.min(a.rMax, r)) / r; return [x * k, z * k];
}
/** Dairesel engellerden dışarı it (vitrinler, sütunlar) */
export function pushOut([x, z]: XZ, circles: { x: number; z: number; r: number }[]): XZ {
  for (const c of circles) {
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz);
    if (d < c.r) { const k = d < 1e-6 ? 1 : c.r / d; x = c.x + (d < 1e-6 ? c.r : dx * k); z = c.z + (d < 1e-6 ? 0 : dz * k); }
  }
  return [x, z];
}
/** Bakış yönü (yaw, pitch) bir hedefe ne kadar yakın: açı farkı (rad) */
export function lookError(eye: [number, number, number], yaw: number, pitch: number, target: [number, number, number]): number {
  const dx = target[0] - eye[0], dy = target[1] - eye[1], dz = target[2] - eye[2], l = Math.hypot(dx, dy, dz) || 1;
  const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
  return Math.acos(Math.max(-1, Math.min(1, (fx * dx + fy * dy + fz * dz) / l)));
}
/** Yalnızca yatay yön farkı (teras: uzak noktalara bakış) */
export function yawError(eye: XZ, yaw: number, target: XZ): number {
  const want = Math.atan2(-(target[0] - eye[0]), -(target[1] - eye[1]));
  return Math.abs(wrapAngle(want - yaw));
}
/** Bakış süresi sayacı: hedefe bakılırken dolar, bakılmazsa hızla boşalır */
export function dwell(t: number, looking: boolean, dt: number): number { return looking ? t + dt : Math.max(0, t - dt * 2); }
