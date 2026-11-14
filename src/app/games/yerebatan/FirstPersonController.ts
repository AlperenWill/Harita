/**
 * Birinci şahıs denetleyicisi — serbest kamera yok: göz her zaman platformun üstünde, 1,62 m yükseklikte.
 *
 * Neden bu mekanik: Sarnıcın etkisi ölçek ve karanlıktır; bunu en iyi, ziyaretçinin kendi gözünden ve kendi
 * hızında yürümesi verir. Bu yüzden:
 *   - ayrı koşma tuşu yok; tek hız, en çok 3,5 m/sn (çevik yürüyüş), ivmelenme ve yavaşlama yumuşak;
 *   - yukarı/aşağı bakış ±45° ile sınırlı (gerçekçi boyun hareketi; tavanı ve suyu görmek için yeter, takla atmak yok);
 *   - baş sallanma: adım uzunluğuna bağlı dikey ve yanal salınım, her adımda ayak sesi olayı;
 *   - yürüme yalnızca platformlarda (sütun aralığındaki ahşap yollar) — suya ya da sütuna girilmez.
 * Bakış: masaüstünde Pointer Lock API ile fare, mobilde ekranın sağ yarısında parmak sürükleme.
 * Hassasiyet: masaüstünde piksel başına 0,0022 rad × ayar; mobilde ekran genişliği boyunca sürükleme ≈ 120° × ayar
 * (ekran ne kadar küçükse piksel başına dönüş o kadar küçük olmaz, ama tam ekran kaydırma her cihazda aynı açıyı verir;
 * dokunmatikte bu, fareye göre otomatik olarak daha düşük hassasiyet demektir).
 */
import { useEffect, useRef } from 'react';
import { walkable } from './cistern';

export const PITCH_LIMIT = Math.PI / 4;          // ±45°
export const MAX_SPEED = 3.5, ACCEL = 6, DAMP = 8;
export const STEP_LEN = 0.72;                    // m / adım
export const BOB = { y: 0.028, x: 0.012 } as const;
export const MOUSE_SENS = 0.0022;
export const TOUCH_SWIPE_ANGLE = (120 * Math.PI) / 180;

export interface FPState { x: number; z: number; yaw: number; pitch: number; vx: number; vz: number; dist: number; steps: number }
export const createFP = (x: number, z: number, yaw = 0): FPState => ({ x, z, yaw, pitch: 0, vx: 0, vz: 0, dist: 0, steps: 0 });

export function look(s: FPState, dyaw: number, dpitch: number): FPState {
  return { ...s, yaw: s.yaw + dyaw, pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, s.pitch + dpitch)) };
}
/** Fare: piksel → radyan */
export const mouseDelta = (px: number, py: number, sens = 1) => ({ dyaw: -px * MOUSE_SENS * sens, dpitch: -py * MOUSE_SENS * sens });
/** Dokunma: ekran genişliğine göre ölçek (tam ekran sürükleme = 120° × ayar) */
export const touchDelta = (px: number, py: number, screenW: number, sens = 1) => {
  const k = (TOUCH_SWIPE_ANGLE / Math.max(320, screenW)) * sens;
  return { dyaw: -px * k, dpitch: -py * k };
};

/**
 * Yürüme fiziği: giriş (ileri, sağ) ∈ [-1,1]², yaw'a göre dünyaya çevrilir; hız hedefe ivmelenir, giriş yoksa sönümlenir.
 * Eksen eksen kayma: platform kenarında duvara sürtünür gibi kayar. Adım olayı: her STEP_LEN metrede bir.
 */
export function walk(s: FPState, fwd: number, right: number, dt: number): { state: FPState; step: boolean } {
  const len = Math.hypot(fwd, right), f = len > 1 ? fwd / len : fwd, r = len > 1 ? right / len : right;
  const sin = Math.sin(s.yaw), cos = Math.cos(s.yaw);
  // three.js: yaw 0 → -z ileri; sağ = (cos, -sin)
  const tx = (-sin * f + cos * r) * MAX_SPEED, tz = (-cos * f - sin * r) * MAX_SPEED;
  const k = 1 - Math.exp(-(len > 0.05 ? ACCEL : DAMP) * dt);
  let vx = s.vx + (tx - s.vx) * k, vz = s.vz + (tz - s.vz) * k;
  let x = s.x, z = s.z;
  if (walkable(x + vx * dt, z)) x += vx * dt; else vx = 0;
  if (walkable(x, z + vz * dt)) z += vz * dt; else vz = 0;
  const moved = Math.hypot(x - s.x, z - s.z), dist = s.dist + moved;
  const steps = Math.floor(dist / STEP_LEN);
  return { state: { ...s, x, z, vx, vz, dist, steps }, step: steps > s.steps };
}
/** Baş sallanma: adım döngüsüne bağlı; dururken sönümlenir (speed01: 0..1) */
export function headBob(s: FPState, speed01: number) {
  const ph = (s.dist / STEP_LEN) * Math.PI;
  return { y: -Math.abs(Math.sin(ph)) * BOB.y * speed01 + BOB.y * 0.5 * speed01, x: Math.sin(ph) * BOB.x * speed01 };
}

/* ---------- DOM girdileri ---------- */
export interface LookInput { dyaw: number; dpitch: number }
/**
 * Fare (Pointer Lock) ve dokunma bakışı. Bakış birikimi `acc`a yazılır; oyun döngüsü her karede okuyup sıfırlar.
 * Dokunmatikte: ekranın sol yarısı joystick'e, sağ yarısı bakışa ayrılır (aynı anda iki parmak).
 */
export function useLookInput(el: HTMLElement | null, acc: { current: LookInput }, opts: { sens: number; enabled: boolean; onLockChange?: (locked: boolean) => void }) {
  const cb = useRef(opts.onLockChange); cb.current = opts.onLockChange;
  const sens = opts.sens, enabled = opts.enabled;
  useEffect(() => {
    if (!el || !enabled) return;
    const onMouse = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return;
      const d = mouseDelta(e.movementX, e.movementY, sens); acc.current.dyaw += d.dyaw; acc.current.dpitch += d.dpitch;
    };
    const lockChange = () => cb.current?.(document.pointerLockElement === el);
    const touches = new Map<number, { x: number; y: number }>();
    const tStart = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (t.clientX > innerWidth * 0.4) touches.set(t.identifier, { x: t.clientX, y: t.clientY }); };
    const tMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const p = touches.get(t.identifier); if (!p) continue;
        const d = touchDelta(t.clientX - p.x, t.clientY - p.y, innerWidth, sens);
        acc.current.dyaw += d.dyaw; acc.current.dpitch += d.dpitch; touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    };
    const tEnd = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) touches.delete(t.identifier); };
    document.addEventListener('mousemove', onMouse); document.addEventListener('pointerlockchange', lockChange);
    el.addEventListener('touchstart', tStart, { passive: true }); el.addEventListener('touchmove', tMove, { passive: true });
    el.addEventListener('touchend', tEnd); el.addEventListener('touchcancel', tEnd);
    return () => {
      document.removeEventListener('mousemove', onMouse); document.removeEventListener('pointerlockchange', lockChange);
      el.removeEventListener('touchstart', tStart); el.removeEventListener('touchmove', tMove); el.removeEventListener('touchend', tEnd); el.removeEventListener('touchcancel', tEnd);
    };
  }, [el, acc, sens, enabled]);
}
