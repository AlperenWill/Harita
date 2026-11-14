/**
 * Vapur — saf matematik (test edilir).
 *
 * Sallanma: gerçek fizik yerine, frekansları birbirinin katı olmayan birkaç sinüsün toplamı. Böylece hareket
 *   tekrar ediyormuş gibi görünmez, ama hiçbir zaman sert de değildir:
 *     heave(t) = 0.10·sin(0.90t) + 0.04·sin(1.73t + 1.0)          (dikey, m)
 *     pitch(t) = 0.018·sin(0.70t + 0.5) + 0.006·sin(1.31t)          (baş-kıç, rad ≈ en çok 1,4°)
 *     roll(t)  = 0.026·sin(0.55t) + 0.008·sin(1.19t + 2.0)          (yan yatma, rad ≈ en çok 2°)
 *   Hepsi `k` ile ölçeklenir: seyirde 1, iskelede 0,25 (yanaşınca sakinleşir). Genlikler deniz tutmasını önlemek için küçük tutuldu.
 * Rota: Karaköy yönünden adaya; hız profili smoothstep (yavaş kalkış, yavaş yanaşma).
 */
export const BOB = { heave: [0.1, 0.04], pitch: [0.018, 0.006], roll: [0.026, 0.008] } as const;
export function bob(t: number, k = 1) {
  return {
    heave: k * (BOB.heave[0] * Math.sin(0.9 * t) + BOB.heave[1] * Math.sin(1.73 * t + 1)),
    pitch: k * (BOB.pitch[0] * Math.sin(0.7 * t + 0.5) + BOB.pitch[1] * Math.sin(1.31 * t)),
    roll: k * (BOB.roll[0] * Math.sin(0.55 * t) + BOB.roll[1] * Math.sin(1.19 * t + 2)),
  };
}

/** Güverte (vapurun yerel koordinatı, -z = baş). Oyuncu yalnızca açık baş güvertesinde yürür; düşme yok. */
export const DECK = { x: 3.1, zFront: -13.2, zBack: -5.4, y: 2.6 } as const;
export function clampDeck(x: number, z: number): [number, number] {
  const cz = Math.min(DECK.zBack, Math.max(DECK.zFront, z));
  // baş kısmı daralır: z = -10'dan sonra her metrede genişlik 0,55 m azalır
  const half = DECK.x - Math.max(0, -cz - 10) * 0.55 - 0.45;
  return [Math.max(-half, Math.min(half, x)), cz];
}

/** Ada yerel düzlemi (m): ada merkezi (0,0); x doğu, -z kuzey. İskele adanın batısında. */
export const DOCK = { x: -21, z: 4, heading: Math.PI / 2 } as const;   // vapur burnu kuzeye bakarak yanaşır
export const FERRY_SECONDS = 75;
const START = { x: -330, z: -420 };   // kuzeybatıdan (Karaköy yönü) yaklaşır
const smooth = (u: number) => u * u * (3 - 2 * u);

/** u ∈ [0,1] → vapurun konumu ve yönü. Son bölümde iskeleye paralel döner. */
export function ferryPose(u: number): { x: number; z: number; yaw: number; speed: number } {
  const s = smooth(Math.max(0, Math.min(1, u)));
  // ikinci dereceden Bezier: başlangıç → adanın kuzeybatı açığı → iskele
  const c = { x: DOCK.x - 40, z: DOCK.z - 90 };
  const x = (1 - s) ** 2 * START.x + 2 * (1 - s) * s * c.x + s * s * DOCK.x;
  const z = (1 - s) ** 2 * START.z + 2 * (1 - s) * s * c.z + s * s * DOCK.z;
  const dx = 2 * (1 - s) * (c.x - START.x) + 2 * s * (DOCK.x - c.x), dz = 2 * (1 - s) * (c.z - START.z) + 2 * s * (DOCK.z - c.z);
  // three.js: yaw 0 → burun -z yönünde; hareket yönüne çevir
  const yaw = Math.atan2(-dx, -dz);
  const du = 6 * u * (1 - u);   // smoothstep türevi: hız profili
  return { x, z, yaw, speed: Math.max(0, Math.min(1, u)) < 1 ? du : 0 };
}
