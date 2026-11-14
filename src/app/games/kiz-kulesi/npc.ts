/**
 * Can (NPC) — saf davranış mantığı (test edilir).
 *
 * Animasyon durum makinesi: dört durum, öncelik sırasıyla point > talk > walk > idle.
 *   - point: konuşma satırı bir yeri gösteriyorsa (kule, taş, manzara) — kol hedefe uzanır
 *   - talk : konuşuyorsa — el hareketleri + dudak senkronu
 *   - walk : hareket ediyorsa (hız > 0,25 m/sn)
 *   - idle : nefes alma, hafif ağırlık aktarımı
 * Geçişler ani değil: her duruma 0..1 ağırlık verilir ve ağırlıklar ~0,25 sn'de yumuşakça kayar (blend).
 * Yürürken konuşmak mümkündür: alt gövde walk, üst gövde talk/point ağırlığını taşır.
 *
 * Takip davranışları (neden): "beside" vapurda oyuncunun yanında kalmak (rehber gibi, ama yolunu kesmeden),
 * "lead" adada önden yürüyüp oyuncu geride kalınca beklemek, "behind" dar merdivende arkadan gelmek
 * (oyuncunun görüşünü kapatmaz). Böylece oyuncu hiç kaybolmaz ve Can hiçbir zaman önüne geçip yolunu tıkamaz.
 */
export type AnimState = 'idle' | 'walk' | 'talk' | 'point';
export const WALK_SPEED = 2.2, RUN_SPEED = 3.4;

export function desiredState(i: { speaking: boolean; pointing: boolean; speed: number }): AnimState {
  if (i.speaking && i.pointing) return 'point';
  if (i.speaking) return 'talk';
  if (i.speed > 0.25) return 'walk';
  return 'idle';
}
export type Weights = Record<AnimState, number>;
export const ZERO: Weights = { idle: 1, walk: 0, talk: 0, point: 0 };
/** Ağırlıkları hedefe doğru kaydır; yürüme alt gövde katmanı olduğundan konuşurken de korunur */
export function blend(w: Weights, target: AnimState, moving: boolean, dt: number, tau = 0.25): Weights {
  const k = 1 - Math.exp(-dt / tau), out = { ...w };
  for (const s of ['idle', 'walk', 'talk', 'point'] as AnimState[]) {
    const goal = s === target ? 1 : s === 'walk' && moving ? 1 : 0;
    out[s] = w[s] + (goal - w[s]) * k;
  }
  return out;
}

export type Follow = 'beside' | 'lead' | 'behind' | 'stay';
type P = { x: number; z: number };
/**
 * Bir sonraki hedef nokta. heading: oyuncunun/yolun ileri yönü (rad, three.js yaw).
 *  beside: oyuncunun 1,4 m sağında; lead: rota üzerinde oyuncunun 3 m önü, ama oyuncu 6 m'den uzaksa bekle;
 *  behind: 1,8 m arkası.
 */
export function followTarget(mode: Follow, npc: P, player: P, heading: number, route?: P): P {
  const fx = -Math.sin(heading), fz = -Math.cos(heading);   // ileri
  const rx = -fz, rz = fx;                                    // sağ
  if (mode === 'beside') return { x: player.x + rx * 1.4 + fx * 0.3, z: player.z + rz * 1.4 + fz * 0.3 };
  if (mode === 'behind') return { x: player.x - fx * 1.8, z: player.z - fz * 1.8 };
  if (mode === 'lead' && route) {
    const far = Math.hypot(npc.x - player.x, npc.z - player.z) > 6;
    return far ? npc : route;
  }
  return npc;
}
/** Hedefe doğru adım: yakınsa durur, uzaksa yürür, çok uzaksa hızlanır (oyuncuyu kaybetmez) */
export function stepToward(npc: P, target: P, dt: number): { pos: P; speed: number; yaw: number | null } {
  const dx = target.x - npc.x, dz = target.z - npc.z, d = Math.hypot(dx, dz);
  if (d < 0.35) return { pos: npc, speed: 0, yaw: null };
  const v = d > 5 ? RUN_SPEED : Math.min(WALK_SPEED, d * 1.5), s = Math.min(d, v * dt);
  return { pos: { x: npc.x + (dx / d) * s, z: npc.z + (dz / d) * s }, speed: v, yaw: Math.atan2(-dx, -dz) };
}
