/** Paylaşılan yürüme girdisi (joystick + WASD), -1..1; y > 0 = geri, y < 0 = ileri (ekran yönü). React durumu değildir. */
export const walk = { x: 0, y: 0 };
export const keys = new Set<string>();
/** Klavye ve joystick'i birleştir (her karede çağrılır) */
export function readKeys(stick: { x: number; y: number }) {
  const kx = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const ky = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
  walk.x = Math.max(-1, Math.min(1, stick.x + kx)); walk.y = Math.max(-1, Math.min(1, stick.y + ky));
}
