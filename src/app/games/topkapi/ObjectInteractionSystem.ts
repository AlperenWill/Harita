/**
 * Nesne etkileşim sistemi (saf mantık; arayüz TopkapiGame.tsx içinde).
 *
 * Neden: "Görünmez rehber" fikrinde oyuncu bir şey aramaz; saray ona seslenir. Bu yüzden etkileşim yaklaşmayla tetiklenir:
 *   uzak      → nesne hafifçe nabız gibi parlar
 *   fısıltı   → tetik mesafesinin 2,2 katına girince kısa bir fısıltı satırı görünür (nesne "konuşur")
 *   inceleme  → tetik mesafesine girince kamera kendiliğinden yaklaşır (zoom/macro), anlatım başlar
 *   görüldü   → çıkınca nesne bir daha kendiliğinden tetiklenmez; dokunarak yeniden açılabilir
 * İnceleme kipleri: zoom (uzaktaki ayrıntıya görüş daralır), macro (çok yakın, dar açı), rotate (iki parmak / sürükleme ile 360° döndürme),
 * listen (kamera sabit; ses sahnesi öne çıkar — Divan'da kafesin ardından dinleme).
 */
import type { Thing, V3 } from './palace';

export type Phase = 'far' | 'whisper' | 'inspect';
export const WHISPER_FACTOR = 2.2;
export const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/** Gözün konumuna göre en yakın, henüz görülmemiş nesne ve evresi */
export function nearestThing(eye: V3, things: Thing[], seen: string[]): { thing: Thing; phase: Phase; d: number } | null {
  let best: { thing: Thing; phase: Phase; d: number } | null = null;
  for (const t of things) {
    if (seen.includes(t.id)) continue;
    const d = dist(eye, t.pos); if (d > t.trigger * WHISPER_FACTOR) continue;
    if (!best || d < best.d) best = { thing: t, d, phase: d <= t.trigger ? 'inspect' : 'whisper' };
  }
  return best;
}
/** İnceleme sırasında göz: verilmişse o; yoksa nesneye doğru, kipine göre yaklaşmış konum */
export function inspectEye(t: Thing, eye: V3): V3 {
  if (t.from) return t.from;
  if (t.mode === 'zoom' || t.mode === 'listen') return eye;                 // yerinden; yalnızca görüş daralır
  const keep = t.mode === 'macro' ? 0.75 : 1.05, d = Math.max(0.001, dist(eye, t.pos)), k = Math.max(0, 1 - keep / d);
  return [eye[0] + (t.pos[0] - eye[0]) * k, t.mode === 'rotate' ? t.pos[1] + 0.12 : eye[1] + (t.pos[1] - eye[1]) * 0.6, eye[2] + (t.pos[2] - eye[2]) * k];
}
/** Döndürme: sürükleme (px) ya da iki parmağın açı farkı (rad) → nesnenin yaw'ı */
export const dragToYaw = (px: number, screenW: number) => (px / Math.max(320, screenW)) * Math.PI * 2;
export function twoFingerAngle(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.atan2(b.y - a.y, b.x - a.x); }
/** Nabız: uzak nesnelerin parlaması (0..1) */
export const pulse = (t: number, phase: Phase) => (phase === 'far' ? 0.35 + 0.25 * Math.sin(t * 2.2) : phase === 'whisper' ? 0.7 + 0.3 * Math.sin(t * 5) : 1);
