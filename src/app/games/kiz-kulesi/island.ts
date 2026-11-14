/**
 * Ada ve kule içi — saf yerleşim mantığı (test edilir). Ölçüler yaklaşıktır (bkz. README).
 * Ada yerel düzlemi: merkez (0,0), x doğu, -z kuzey; ada üstü y = 1,6 m.
 */
import { DECK, DOCK, clampDeck } from './ferry';

export const ISLAND = { r: 15.2, top: 1.6 } as const;
export const BUILDING = { x0: -7, x1: 7, z0: -5.5, z1: 5.5, h: 7 } as const;     // ana yapı (çatısı teras)
export const TOWER = { x0: -3, x1: 3, z0: -4, z1: 2, top: 17.5 } as const;       // terasın ortasından yükselen kule
export const ROOF_Y = ISLAND.top + BUILDING.h;
export const DOOR = { x: -7.2, z: 2.5 } as const;
export const FERRY_YAW = Math.PI;                                                  // iskelede burun güneye bakar

type P = { x: number; z: number };
/** Vapur yerel ↔ dünya (iskeledeyken) */
export function ferryToWorld(lx: number, lz: number): P {
  const c = Math.cos(FERRY_YAW), s = Math.sin(FERRY_YAW);
  return { x: DOCK.x + lx * c + lz * s, z: DOCK.z - lx * s + lz * c };
}
export function worldToFerry(x: number, z: number): P {
  const dx = x - DOCK.x, dz = z - DOCK.z, c = Math.cos(FERRY_YAW), s = Math.sin(FERRY_YAW);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}
/** İskele tahtası (gangboard): güverteden adanın iskelesine */
export const GANG = { x0: -18.6, x1: -16.2, z0: 11.3, z1: 12.7 } as const;
export const PIER = { x0: -16.4, x1: -10.2, z0: 10.9, z1: 13.1 } as const;   // kıyıya kadar uzanır (ada kenarı z≈11’de x≈-10,5)
const inRect = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }, pad = 0) =>
  x > r.x0 + pad && x < r.x1 - pad && z > r.z0 + pad && z < r.z1 - pad;

export type Area = 'deck' | 'gang' | 'pier' | 'island' | null;
export function areaAt(x: number, z: number, gangDown = true): Area {
  const l = worldToFerry(x, z), [cx, cz] = clampDeck(l.x, l.z);
  if (Math.abs(cx - l.x) < 1e-6 && Math.abs(cz - l.z) < 1e-6) return 'deck';
  if (gangDown && inRect(x, z, GANG)) return 'gang';
  if (inRect(x, z, PIER)) return 'pier';
  if (Math.hypot(x, z) < ISLAND.r && !inRect(x, z, BUILDING, -0.4)) return 'island';
  return null;
}
/** Yürünebilir yükseklik */
export function heightAt(x: number, z: number): number {
  const a = areaAt(x, z);
  if (a === 'deck') return DECK.y;
  if (a === 'gang') return DECK.y + ((x - GANG.x0) / (GANG.x1 - GANG.x0)) * (ISLAND.top - DECK.y);
  return ISLAND.top;
}
/** Eksen eksen kayarak yürü: yürünemez yere adım atılmaz (denize düşme yok) */
export function slide(p: P, dx: number, dz: number, gangDown = true): P {
  const out = { ...p };
  if (areaAt(out.x + dx, out.z, gangDown)) out.x += dx;
  if (areaAt(out.x, out.z + dz, gangDown)) out.z += dz;
  return out;
}

/** Can'ın adada önden yürüdüğü rota (dünya): güverte → iskele tahtası → iskele → kapı */
export const LEAD_ROUTE: P[] = [ferryToWorld(-2.4, -8), { x: -17, z: 12 }, { x: -14.8, z: 12 }, { x: -11.5, z: 9.5 }, { x: -9.2, z: 5.5 }, { x: -8.2, z: 2.6 }];
export const PLAYER_START = ferryToWorld(-1.2, -9);

/* ---------- kule içi: kare kuyu çevresinde 4 kollu merdiven ---------- */
const H = 1.65, RISE = (ROOF_Y - ISLAND.top) / 4;
const CORNERS: [number, number][] = [[-H, H], [-H, -H], [H, -H], [H, H], [-H + 0.6, H]];
export interface PathPoint { x: number; y: number; z: number; heading: number }
/** Kollar: her kol bir duvar boyunca RISE kadar yükselir; köşeler sahanlık (düz) */
export const STAIR_LEN = (() => { let L = 0; for (let i = 0; i < 4; i++) L += Math.hypot(CORNERS[i + 1][0] - CORNERS[i][0], CORNERS[i + 1][1] - CORNERS[i][1]); return L; })();
export function stairAt(s: number): PathPoint {
  let rem = Math.max(0, Math.min(STAIR_LEN, s));
  for (let i = 0; i < 4; i++) {
    const [ax, az] = CORNERS[i], [bx, bz] = CORNERS[i + 1], L = Math.hypot(bx - ax, bz - az);
    if (rem <= L || i === 3) {
      const u = Math.min(1, rem / L), land = 0.45 / L;   // kolun ilk ve son 0,45 m'si sahanlık
      const climb = Math.max(0, Math.min(1, (u - land) / (1 - 2 * land)));
      return { x: ax + (bx - ax) * u, y: ISLAND.top + RISE * (i + climb), z: az + (bz - az) * u, heading: Math.atan2(-(bx - ax), -(bz - az)) };
    }
    rem -= L;
  }
  return { x: CORNERS[4][0], y: ROOF_Y, z: CORNERS[4][1], heading: 0 };
}
/** Duvardaki bilgi taşları (yol üzerindeki konum s ve hangi duvarda) */
export const STONES = [
  { spot: 'tas-1', s: 1.9, wall: 'west' as const },
  { spot: 'tas-2', s: 1 * 3.3 + 1.7, wall: 'north' as const },
  { spot: 'tas-3', s: 2 * 3.3 + 1.7, wall: 'east' as const },
];
export const SHAFT_HALF = 2.3;

/* ---------- teras: ana yapının çatısı, kulenin çevresi ---------- */
export const TERRACE_START = { x: 0, z: 3.6 } as const;
export function terraceOk(x: number, z: number): boolean {
  const pad = 0.5;
  const inRoof = x > BUILDING.x0 + pad && x < BUILDING.x1 - pad && z > BUILDING.z0 + pad && z < BUILDING.z1 - pad;
  const inTower = x > TOWER.x0 - 0.4 && x < TOWER.x1 + 0.4 && z > TOWER.z0 - 0.4 && z < TOWER.z1 + 0.4;
  return inRoof && !inTower;
}
