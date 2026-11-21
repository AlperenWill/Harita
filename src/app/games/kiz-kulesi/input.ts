/** Paylaşılan yürüme girdisi (joystick + WASD), -1..1; y > 0 = geri, y < 0 = ileri (ekran yönü). React durumu değildir. */
export const walk = { x: 0, y: 0 };
/** Birinci şahıs bakış (yaw sınırsız, pitch boyun sınırı); sahneler kendi başlangıç yönünü verir */
export const view = { yaw: 0, pitch: 0 };
/** Bakış yönüne göre yürüme vektörü (dünya ya da vapur yerel düzleminde), uzunluk ≤ 1 */
export function fpMove() {
  const len = Math.hypot(walk.x, walk.y); if (len < 0.08) return null;
  const k = Math.min(1, len) / len, f = -walk.y * k, s = walk.x * k, y = view.yaw;
  return { x: -Math.sin(y) * f + Math.cos(y) * s, z: -Math.cos(y) * f - Math.sin(y) * s };
}
export const keys = new Set<string>();
/** ≡ menü açıkken yürüme durur */
export const inputPause = { on: false };
/** Klavye ve joystick'i birleştir (her karede çağrılır) */
export function readKeys(stick: { x: number; y: number }) {
  const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  walk.x = Math.max(-1, Math.min(1, stick.x + kx)); walk.y = Math.max(-1, Math.min(1, stick.y + ky));
  if (inputPause.on) { walk.x = 0; walk.y = 0; }
}
