/**
 * Anıtkabir yerleşimi — 1:1 ölçek (1 birim = 1 metre). Saf veri: three.js'e bağımlı değildir, test edilebilir.
 * Yerleşim hava fotoğrafına göre kurulmuştur. Başlangıç noktası Tören Meydanı'nın merkezidir:
 *   +X  mozole (meydanın kısa kenarında, merdiven meydana bakar)
 *   -Z  Aslanlı Yol (uzun kenara dik gelir)
 *   +Z  bayrak direği ve Çankaya yönündeki giriş
 *   -X  İsmet İnönü'nün lahdinin bulunduğu galeri
 * Ana ölçüler bilinen değerlerdir (kaide 72×52 m, sütunlu blok 57,35×41,65 m, yükseklik 17 m, 44 sütun 14,4 m,
 * 42 basamak, meydan 129×84,25 m, Aslanlı Yol 262 m ve 24 aslan, 10 kule). Yapıların konumu yaklaşıktır.
 */
export type V3 = [number, number, number];
export interface Box { pos: V3; size: V3 }
/** Düzlemde dikdörtgen: [x0, z0, x1, z1] */
export type Rect = [number, number, number, number];

export const PLAZA = { w: 129, d: 84.25 };
export const STAIRS = { steps: 42, rise: 0.16, tread: 0.4, width: 40 };
export const PODIUM_H = STAIRS.steps * STAIRS.rise;                  // 6,72 m
export const STAIRS_DEPTH = STAIRS.steps * STAIRS.tread;             // 16,8 m
export const STAIR_X0 = PLAZA.w / 2;                                 // merdivenin başladığı yer
export const TERRACE_X = STAIR_X0 + STAIRS_DEPTH;                    // merdivenin bittiği, terasın başladığı yer

const LEN = 57.35, WID = 41.65;
export const MAUSOLEUM = {
  len: LEN, wid: WID, h: 17, colH: 14.4, colSize: 1.5,
  x: TERRACE_X + 6 + LEN / 2,
  podium: { x0: TERRACE_X, x1: TERRACE_X + 6 + LEN + 8.65, halfW: 26 },   // 72 × 52 m kaide
};
export const FRONT_X = MAUSOLEUM.x - LEN / 2;
const BACK_X = MAUSOLEUM.x + LEN / 2;

/** Şeref Holü: sütunların içindeki kapalı hacim */
const INSET = 5, WALL = 1.2;
export const HALL = {
  outer: [FRONT_X + INSET, -(WID / 2 - INSET), BACK_X - INSET, WID / 2 - INSET] as Rect,
  x0: FRONT_X + INSET + WALL, x1: BACK_X - INSET - WALL, halfW: WID / 2 - INSET - WALL,
  floorY: PODIUM_H, ceilY: PODIUM_H + 13.4, wall: WALL,
  door: { w: 5, h: 8 },
};
export const SARCOPHAGUS: V3 = [HALL.x1 - 7, PODIUM_H, 0];

/** 44 sütun: ön ve arka cephede 8'er (köşeler dahil), yan cephelerde 14'er */
export function mausoleumColumns(): V3[] {
  const out: V3[] = [], hz = WID / 2 - 1, x0 = FRONT_X + 1, x1 = BACK_X - 1, y = PODIUM_H + MAUSOLEUM.colH / 2;
  for (let i = 0; i < 8; i++) { const z = -hz + (i * 2 * hz) / 7; out.push([x0, y, z], [x1, y, z]); }
  for (let i = 1; i <= 14; i++) { const x = x0 + (i * (x1 - x0)) / 15; out.push([x, y, -hz], [x, y, hz]); }
  return out;
}

/** 42 basamak: meydandan mozole terasına (+X yönünde yükselir) */
export function stairSteps(): Box[] {
  const out: Box[] = [];
  for (let i = 0; i < STAIRS.steps; i++) {
    const depth = STAIRS_DEPTH - i * STAIRS.tread;               // her basamak terasa kadar uzanan bir levha
    out.push({ pos: [STAIR_X0 + i * STAIRS.tread + depth / 2, i * STAIRS.rise + STAIRS.rise / 2, 0], size: [depth, STAIRS.rise, STAIRS.width] });
  }
  return out;
}

const B_DEPTH = 12;
export const BUILDING_H = 8.5;
const FAR_Z = -(PLAZA.d / 2 + B_DEPTH / 2), NEAR_Z = -FAR_Z, SIDE_X = -(PLAZA.w / 2 + B_DEPTH / 2);
export const LION_ROAD = { length: 262, width: 12, x: -10, startZ: -(PLAZA.d / 2 + B_DEPTH + 2), lions: 24 };

/** Meydanı çevreleyen galerili binalar. portico: sütunlu cephenin baktığı yön */
export function buildings(): { name: string; pos: V3; size: V3; portico: '+z' | '-z' | '+x' }[] {
  const b = (name: string, x0: number, x1: number, z: number, portico: '+z' | '-z') =>
    ({ name, pos: [(x0 + x1) / 2, 0, z] as V3, size: [x1 - x0, BUILDING_H, B_DEPTH] as V3, portico });
  return [
    b('uzak-sol', SIDE_X - B_DEPTH / 2, LION_ROAD.x - 14, FAR_Z, '+z'),
    b('uzak-sag', LION_ROAD.x + 14, 46, FAR_Z, '+z'),
    b('yakin-sol', SIDE_X - B_DEPTH / 2, -14, NEAR_Z, '-z'),
    b('yakin-sag', 14, 62, NEAR_Z, '-z'),
    { name: 'yan', pos: [SIDE_X, 0, 0], size: [B_DEPTH, BUILDING_H, PLAZA.d], portico: '+x' },
  ];
}

export const TOWER = { w: 12, d: 12, h: 11.5, roofH: 4.6 };
/** 10 kule */
export function towers(): { name: string; pos: V3 }[] {
  const roadEnd = LION_ROAD.startZ - LION_ROAD.length;
  return [
    { name: 'İstiklal', pos: [LION_ROAD.x - 16, 0, roadEnd - 8] },
    { name: 'Hürriyet', pos: [LION_ROAD.x + 16, 0, roadEnd - 8] },
    { name: 'Mehmetçik', pos: [LION_ROAD.x - 20, 0, FAR_Z] },
    { name: 'Müdafaa-i Hukuk', pos: [LION_ROAD.x + 20, 0, FAR_Z] },
    { name: 'İnkılap', pos: [SIDE_X, 0, FAR_Z] },
    { name: 'Cumhuriyet', pos: [40, 0, FAR_Z] },
    { name: 'Barış', pos: [SIDE_X, 0, -22] },
    { name: 'Zafer', pos: [SIDE_X, 0, 22] },
    { name: '23 Nisan', pos: [-20, 0, NEAR_Z] },
    { name: 'Misak-ı Millî', pos: [20, 0, NEAR_Z] },
  ];
}

/** 24 aslan: yolun iki yanında 12 çift, yola dönük */
export function lions(): { pos: V3; rotY: number }[] {
  const out: { pos: V3; rotY: number }[] = [], pairs = LION_ROAD.lions / 2, gap = LION_ROAD.length / (pairs + 1), off = LION_ROAD.width / 2 + 2.2;
  for (let i = 1; i <= pairs; i++) {
    const z = LION_ROAD.startZ - i * gap;
    out.push({ pos: [LION_ROAD.x - off, 0, z], rotY: Math.PI / 2 }, { pos: [LION_ROAD.x + off, 0, z], rotY: -Math.PI / 2 });
  }
  return out;
}

export const FLAGPOLE = { pos: [0, 0, PLAZA.d / 2 - 4] as V3, h: 29.53 };
export const INONU = { pos: [SIDE_X + 2.5, 0, 0] as V3 };

/** Gece yanan aydınlatma direkleri: yol boyunca ve meydanın çevresinde */
export function lamps(): V3[] {
  const out: V3[] = [];
  for (let z = LION_ROAD.startZ - 10; z > LION_ROAD.startZ - LION_ROAD.length; z -= 21.8) for (const s of [-1, 1]) out.push([LION_ROAD.x + s * (LION_ROAD.width / 2 + 5.2), 0, z]);
  for (let x = -54; x <= 54; x += 21.6) out.push([x, 0, -PLAZA.d / 2 + 1.5], [x, 0, PLAZA.d / 2 - 1.5]);
  for (const z of [-28, 0, 28]) out.push([-PLAZA.w / 2 + 1.5, 0, z]);
  for (const z of [-24, 24]) out.push([TERRACE_X + 2.5, PODIUM_H, z], [BACK_X + 5, PODIUM_H, z]);
  return out;
}

/* ---------- Yürüme modu: zemin yüksekliği ve çarpışma ---------- */
const P = MAUSOLEUM.podium;
/** (x, z) noktasında yürünen zeminin yüksekliği: meydan 0, merdiven rampa, teras ve hol kaide yüksekliğinde */
export function groundHeight(x: number, z: number): number {
  if (Math.abs(z) <= STAIRS.width / 2 && x >= STAIR_X0 && x < TERRACE_X) return ((x - STAIR_X0) / STAIRS_DEPTH) * PODIUM_H;
  if (x >= P.x0 && x <= P.x1 && Math.abs(z) <= P.halfW) return PODIUM_H;
  return 0;
}
/** Yürürken geçilemeyen dikdörtgenler */
export function walkColliders(): Rect[] {
  const out: Rect[] = [];
  const add = (cx: number, cz: number, w: number, d: number) => out.push([cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2]);
  for (const b of buildings()) add(b.pos[0], b.pos[2], b.size[0], b.size[2]);
  for (const t of towers()) add(t.pos[0], t.pos[2], TOWER.w, TOWER.d);
  for (const c of mausoleumColumns()) add(c[0], c[2], MAUSOLEUM.colSize + 0.3, MAUSOLEUM.colSize + 0.3);
  for (const l of lions()) add(l.pos[0], l.pos[2], 3.6, 3.6);
  // Şeref Holü duvarları: ön duvarda kapı boşluğu
  const [x0, z0, x1, z1] = HALL.outer, w = HALL.wall, dw = HALL.door.w / 2;
  out.push([x0, z0, x1, z0 + w], [x0, z1 - w, x1, z1], [x1 - w, z0, x1, z1], [x0, z0, x0 + w, -dw], [x0, dw, x0 + w, z1]);
  add(SARCOPHAGUS[0], SARCOPHAGUS[2], 5, 7.5);
  add(FLAGPOLE.pos[0], FLAGPOLE.pos[2], 4, 4);
  add(INONU.pos[0], INONU.pos[2], 3.4, 5.4);
  // merdivenin iki yanındaki kabartma duvarları
  for (const s of [-1, 1]) add(STAIR_X0 + STAIRS_DEPTH / 2, s * (STAIRS.width / 2 + 3), STAIRS_DEPTH, 6);
  return out;
}
export const WALK = { eye: 1.7, radius: 0.5, bound: [-200, -360, 190, 150] as Rect, spawn: { x: 20, z: 0, yaw: -Math.PI / 2 }, door: { x: FRONT_X - 2, z: 0, yaw: -Math.PI / 2 } };

/** Ağaçların giremeyeceği alanlar */
export const KEEP_OUT: Rect[] = [
  [SIDE_X - 22, FAR_Z - 22, P.x1 + 26, NEAR_Z + 34],
  [LION_ROAD.x - 13, LION_ROAD.startZ - LION_ROAD.length - 30, LION_ROAD.x + 13, LION_ROAD.startZ + 6],
];
export const isClear = (x: number, z: number) => KEEP_OUT.every(([x0, z0, x1, z1]) => x < x0 || x > x1 || z < z0 || z > z1);

/** Kamera pozları: hedef, uzaklık, yatay açı (azimut) ve dikey açı (kutup) */
export interface Pose { target: V3; distance: number; azimuth: number; polar: number }
const roadMidZ = LION_ROAD.startZ - LION_ROAD.length / 2;
export const POSES: Record<string, Pose> = {
  // fotoğraftaki açı: Çankaya tarafından, mozole sağda
  overview: { target: [25, 0, -25], distance: 330, azimuth: 0.2, polar: 0.92 },
  entrance: { target: [FRONT_X, PODIUM_H + 7, 0], distance: 62, azimuth: -Math.PI / 2 + 0.25, polar: 1.36 },
  mozole: { target: [MAUSOLEUM.x - 8, PODIUM_H + 6, 0], distance: 135, azimuth: -0.75, polar: 1.1 },
  'aslanli-yol': { target: [LION_ROAD.x, 0, roadMidZ + 50], distance: 150, azimuth: 0.35, polar: 1.05 },
  'toren-meydani': { target: [0, 0, 0], distance: 160, azimuth: 0.15, polar: 0.62 },
  muze: { target: [34, 4, FAR_Z], distance: 85, azimuth: 0.4, polar: 1.1 },
  inonu: { target: [SIDE_X, 3, 0], distance: 75, azimuth: Math.PI / 2 - 0.3, polar: 1.1 },
  kuleler: { target: [LION_ROAD.x, 4, LION_ROAD.startZ - LION_ROAD.length - 6], distance: 85, azimuth: 0.5, polar: 1.1 },
  bayrak: { target: [0, 14, FLAGPOLE.pos[2]], distance: 90, azimuth: 0.5, polar: 1.2 },
};
/** Hotspot işaretçilerinin sahnedeki konumu */
export const HOTSPOTS: Record<string, V3> = {
  mozole: [MAUSOLEUM.x, PODIUM_H + MAUSOLEUM.h + 6, 0],
  'aslanli-yol': [LION_ROAD.x, 7, roadMidZ],
  'toren-meydani': [-18, 5, 0],
  muze: [30, BUILDING_H + 6, FAR_Z],
  inonu: [SIDE_X, BUILDING_H + 5, 0],
  kuleler: [LION_ROAD.x, 20, LION_ROAD.startZ - LION_ROAD.length - 8],
  bayrak: [0, FLAGPOLE.h + 6, FLAGPOLE.pos[2]],
};
