/**
 * Ortak birinci şahıs bakışı (Galata'daki düzenin paylaşılan hâli).
 * Masaüstü: sahneye tıkla → imleç kilidi, fareyle bak (Esc bırakır). Dokunmatik: joystick dışında ekranı sürükle → bak.
 * Yaw sınırsız, pitch yalnızca boyun sınırıyla. Kamera göz hizasında; oyuncunun kendi modeli çizilmez.
 */
import { useRef } from 'react';
import * as THREE from 'three';
import { LOOK_PITCH, LOOK_YAW, useMouseLook } from './mouseLook';
import { useSettings } from './hud/settings';

export const FP_PITCH = 1.35;
export interface View { yaw: number; pitch: number }
export const clampFp = (p: number) => Math.max(-FP_PITCH, Math.min(FP_PITCH, p));

/** view'u fare ve dokunmatik sürüklemeyle döndürür; dönen işleyicileri sahneyi saran div'e bağla */
export function useFpLook(view: View | (() => View), enabled: () => boolean, onDown?: () => void) {
  const get = () => (typeof view === 'function' ? view() : view);
  const look = useMouseLook((dx, dy) => { const v = get(); v.yaw -= dx * LOOK_YAW; v.pitch = clampFp(v.pitch - dy * LOOK_PITCH); }, enabled);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  return {
    locked: look.locked,
    handlers: {
      onPointerDown: (e: React.PointerEvent) => { onDown?.(); if (!enabled()) return; look.lock(e); if (e.pointerType !== 'mouse') drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; },
      onPointerMove: (e: React.PointerEvent) => {
        const d = drag.current; if (!d || d.id !== e.pointerId || !enabled()) return;
        const k = useSettings.getState().sensitivity * 1.6, v = get();
        v.yaw -= (e.clientX - d.x) * LOOK_YAW * k; v.pitch = clampFp(v.pitch - (e.clientY - d.y) * LOOK_PITCH * k);
        d.x = e.clientX; d.y = e.clientY;
      },
      onPointerUp: (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; },
      onPointerCancel: (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) drag.current = null; },
    },
  };
}

const _e = new THREE.Euler(0, 0, 0, 'YXZ');
/** Kamerayı göz konumuna ve bakışa yerleştirir (bob: yürürken hafif baş sallanması) */
export function applyFp(camera: THREE.Camera, x: number, y: number, z: number, v: View, bob = 0) {
  camera.position.set(x, y + bob, z);
  _e.set(v.pitch, v.yaw, 0); camera.quaternion.setFromEuler(_e);
}
/** Yumuşak FOV değişimi */
export function easeFov(camera: THREE.Camera, want: number, dt: number) {
  const pc = camera as THREE.PerspectiveCamera;
  if (Math.abs(pc.fov - want) > 0.05) { pc.fov += (want - pc.fov) * (1 - Math.exp(-dt * 5)); pc.updateProjectionMatrix(); }
}
/** Bakış yönü bir noktaya ne kadar yakın (rad) */
export function lookAngle(eye: [number, number, number], v: View, t: [number, number, number]) {
  const dx = t[0] - eye[0], dy = t[1] - eye[1], dz = t[2] - eye[2], l = Math.hypot(dx, dy, dz) || 1;
  const fx = -Math.sin(v.yaw) * Math.cos(v.pitch), fy = Math.sin(v.pitch), fz = -Math.cos(v.yaw) * Math.cos(v.pitch);
  return Math.acos(Math.max(-1, Math.min(1, (fx * dx + fy * dy + fz * dz) / l)));
}
