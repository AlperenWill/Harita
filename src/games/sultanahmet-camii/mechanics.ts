/**
 * Sultanahmet Camii — "Işık Takibi" oyun mantığı (saf; three.js ve React'e bağımlı değildir, test edilir).
 *
 * Neden bu mekanik: araştırmada yapının en özgün özelliği, binlerce çiniyi pencerelerden süzülen ışığın
 * gün boyunca farklı yerlerde göstermesi. Oyunda güneş kendiliğinden ilerler; oyuncu ışığın zeminde
 * oluşturduğu havuzu takip edip içinde durur ve o ışığın düştüğü duvardaki gizli çini desenini açar.
 * Kaybetme yok: ışık kaçarsa güneş nazikçe geri sarılır (şiddetsiz, rekabetsiz, sakin tempo).
 */
import { HALL, MOTIFS, isLit, panels, shafts, walkColliders, type MotifId, type Panel, type Rect, type V3 } from './layout';

export const CLOCK_RATE = 1 / 22;          // oyun saati / gerçek saniye (1 saat ≈ 22 sn)
export const MIN_STAGE_SECONDS = 45;      // her ışık penceresi en az bu kadar sürer (saat gerekirse yavaşlar)
const REACH = 7;                           // havuz panoya bu mesafedeyse ışık o duvara ulaşıyor sayılır
export const CHARGE_TIME = 2.5;            // havuzda kesintisiz durma süresi (sn)
export const POOL_R = 2.2;                 // havuzun yarıçapı (m)
export const SPEED = 3.4;                  // sakin yürüyüş hızı (m/sn)
export const RADIUS = 0.45;
const WALL_GAP = 1.6;                      // havuz duvara çok yakınsa oyuncunun durabileceği yere çekilir

export interface Stage { motif: MotifId; panel: Panel; from: number; to: number }

/** Her panonun önünde ışık havuzu oluşan kesintisiz saat aralığı → bir aşama */
export function stages(): Stage[] {
  return panels().slice().sort((a, b) => a.hour - b.hour).map((p) => {
    const st = { motif: p.motif, panel: p, from: p.hour, to: p.hour };
    if (!isLit(p, p.hour)) throw new Error(`${p.motif} kendi saatinde ışık almıyor`);
    while (st.from - 0.05 >= 6.5 && targetPool(st, st.from - 0.05)) st.from -= 0.05;
    while (st.to + 0.05 <= 19.5 && targetPool(st, st.to + 0.05)) st.to += 0.05;
    return { ...st, from: +st.from.toFixed(2), to: +st.to.toFixed(2) };
  });
}
/** Aşamanın saat hızı: kısa pencerelerde güneş yavaşlar, oyuncunun yetişecek zamanı olur */
export const stageRate = (st: Stage) => Math.min(CLOCK_RATE, (st.to - st.from) / MIN_STAGE_SECONDS);

const ix = HALL.len / 2 - HALL.wall - WALL_GAP, iz = HALL.wid / 2 - HALL.wall - WALL_GAP;
/** O saatte panoyu aydınlatan huzmenin oluşturduğu, oyuncunun durabileceği havuz noktası */
export function targetPool(stage: Stage, hour: number): V3 | null {
  const p = stage.panel.pos;
  let best: V3 | null = null, bestD = Infinity;
  for (const s of shafts(hour)) {
    if (s.to[1] >= 6) continue;
    const d = Math.hypot(s.to[0] - p[0], s.to[2] - p[2]);
    if (d < REACH && d < bestD) { bestD = d; best = s.to; }
  }
  if (!best) return null;
  return [Math.max(-ix, Math.min(ix, best[0])), 0, Math.max(-iz, Math.min(iz, best[2]))];
}

/* ---------- Hareket: yalnızca harim içinde, fil ayaklarına ve minbere çarparak ---------- */
const INNER: Rect = [-HALL.len / 2 + HALL.wall, -HALL.wid / 2 + HALL.wall, HALL.len / 2 - HALL.wall, HALL.wid / 2 - HALL.wall];
const OBSTACLES = walkColliders().filter(([x0, z0, x1, z1]) => {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  return cx > INNER[0] && cx < INNER[2] && cz > INNER[1] && cz < INNER[3] && x1 - x0 < 10 && z1 - z0 < 10;
});
export function blocked(x: number, z: number): boolean {
  const r = RADIUS;
  if (x < INNER[0] + r || x > INNER[2] - r || z < INNER[1] + r || z > INNER[3] - r) return true;
  return OBSTACLES.some(([x0, z0, x1, z1]) => x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r);
}

export interface GameState {
  stage: number;
  hour: number;
  charge: number;
  revealed: MotifId[];
  done: boolean;
  avatar: { x: number; z: number };
  rewinds: number;
  elapsed: number;
}
export type GameEvent = { type: 'reveal'; motif: MotifId } | { type: 'rewind' } | { type: 'win' };

const STAGES = stages();
export const START = { x: -HALL.len / 2 + HALL.wall + 3, z: 0 };
export function createGame(): GameState {
  return { stage: 0, hour: STAGES[0].from, charge: 0, revealed: [], done: false, avatar: { ...START }, rewinds: 0, elapsed: 0 };
}
export const currentStage = (s: GameState) => STAGES[Math.min(s.stage, STAGES.length - 1)];

/**
 * Bir oyun adımı. move: dünya düzleminde istenen hareket yönü (uzunluk ≤ 1).
 * Durumu değiştirmeden yeni durum ve olayları döndürür.
 */
export function step(prev: GameState, move: { x: number; z: number }, dt: number): { state: GameState; events: GameEvent[] } {
  if (prev.done) return { state: prev, events: [] };
  const s: GameState = { ...prev, avatar: { ...prev.avatar }, revealed: [...prev.revealed], elapsed: prev.elapsed + dt };
  const events: GameEvent[] = [];
  const len = Math.hypot(move.x, move.z);
  if (len > 0.05) {
    const k = (SPEED * dt) / Math.max(1, len);
    const nx = s.avatar.x + move.x * k, nz = s.avatar.z + move.z * k;
    if (!blocked(nx, s.avatar.z)) s.avatar.x = nx;          // eksen eksen: engel boyunca kayarak ilerle
    if (!blocked(s.avatar.x, nz)) s.avatar.z = nz;
  }
  const st = STAGES[s.stage];
  s.hour += dt * stageRate(st);
  const pool = targetPool(st, s.hour);
  const inside = !!pool && Math.hypot(s.avatar.x - pool[0], s.avatar.z - pool[2]) < POOL_R;
  s.charge = inside ? s.charge + dt / CHARGE_TIME : Math.max(0, s.charge - dt * 0.25);
  if (s.charge >= 1) {
    s.revealed.push(st.motif); s.charge = 0; s.stage += 1;
    events.push({ type: 'reveal', motif: st.motif });
    if (s.stage >= STAGES.length) { s.done = true; events.push({ type: 'win' }); }
    else s.hour = STAGES[s.stage].from;
  } else if (s.hour > st.to) {
    s.hour = st.from; s.rewinds += 1; events.push({ type: 'rewind' });
  }
  return { state: s, events };
}

/**
 * Hedefe yürüme (dokunarak hedef seçme ve otomatik testler için): düz gider; bir engele takılırsa
 * kısa süre engelin yanına çekilip yeniden dener. Oyuncu kamerayı değil, yalnızca hedefi seçer.
 */
export class Steering {
  private stall = 0; private side = 0; private sideT = 0; private last = { x: 0, z: 0 };
  direction(from: { x: number; z: number }, to: { x: number; z: number }, dt: number): { x: number; z: number } {
    const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { this.stall = 0; return { x: 0, z: 0 }; }
    const moved = Math.hypot(from.x - this.last.x, from.z - this.last.z); this.last = { ...from };
    this.stall = moved < SPEED * dt * 0.3 ? this.stall + dt : 0;
    if (this.stall > 0.25 && this.sideT <= 0) { this.side = this.side === 1 ? -1 : 1; this.sideT = 0.9; this.stall = 0; }
    if (this.sideT > 0) { this.sideT -= dt; return { x: (-dz / d) * this.side, z: (dx / d) * this.side }; }
    return { x: dx / d, z: dz / d };
  }
}
export { MOTIFS, STAGES };
