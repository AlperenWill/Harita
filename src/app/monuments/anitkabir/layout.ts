/**
 * Anıtkabir yerleşimi — 1:1 ölçek (1 birim = 1 metre). Saf veri: three.js'e bağımlı değildir, test edilebilir.
 * Başlangıç noktası Tören Meydanı'nın merkezidir. Mozole -Z yönünde, Aslanlı Yol -X yönündedir.
 * Ana ölçüler bilinen gerçek değerlerdir (mozole 72×52×17 m, 44 sütun 14,4 m, 42 basamak, meydan 129×84,25 m,
 * Aslanlı Yol 262 m ve 24 aslan, 10 kule). Yapıların birbirine göre konumu yaklaşık yerleştirilmiştir.
 */
export type V3 = [number, number, number];
export interface Box { pos: V3; size: V3 }

export const PLAZA = { w: 129, d: 84.25 };
export const STAIRS = { steps: 42, rise: 0.16, tread: 0.4, width: 44 };
export const PODIUM_H = STAIRS.steps * STAIRS.rise;                 // 6,72 m
const STAIRS_DEPTH = STAIRS.steps * STAIRS.tread;                    // 16,8 m
export const MAUSOLEUM = {
  w: 72, d: 52, h: 17, colH: 14.4, colSize: 1.5,
  // meydan kenarı + merdiven + 4 m teras + yarı derinlik
  z: -(PLAZA.d / 2 + STAIRS_DEPTH + 4 + 26),
};
export const MAUSOLEUM_FRONT_Z = MAUSOLEUM.z + MAUSOLEUM.d / 2;
export const LION_ROAD = { length: 262, width: 12, startX: -(PLAZA.w / 2 + 12), lions: 24 };

/** 44 sütun: ön ve arka cephede 8'er (köşeler dahil), yan cephelerde 14'er */
export function mausoleumColumns(): V3[] {
  const out: V3[] = [], hx = MAUSOLEUM.w / 2 - 1, hz = MAUSOLEUM.d / 2 - 1, y = PODIUM_H + MAUSOLEUM.colH / 2;
  for (let i = 0; i < 8; i++) {
    const x = -hx + (i * 2 * hx) / 7;
    out.push([x, y, MAUSOLEUM.z + hz], [x, y, MAUSOLEUM.z - hz]);
  }
  for (let i = 1; i <= 14; i++) {
    const z = MAUSOLEUM.z - hz + (i * 2 * hz) / 15;
    out.push([-hx, y, z], [hx, y, z]);
  }
  return out;
}

/** 42 basamak: meydandan mozole terasına */
export function stairSteps(): Box[] {
  const out: Box[] = [], z0 = -PLAZA.d / 2;
  for (let i = 0; i < STAIRS.steps; i++) {
    const depth = STAIRS_DEPTH - i * STAIRS.tread;       // her basamak arkaya kadar uzanan bir levha
    out.push({ pos: [0, i * STAIRS.rise + STAIRS.rise / 2, z0 - i * STAIRS.tread - depth / 2], size: [STAIRS.width, STAIRS.rise, depth] });
  }
  return out;
}

/** 24 aslan: yolun iki yanında 12 çift. rotY: yola dönük */
export function lions(): { pos: V3; rotY: number }[] {
  const out: { pos: V3; rotY: number }[] = [], pairs = LION_ROAD.lions / 2, gap = LION_ROAD.length / (pairs + 1);
  for (let i = 1; i <= pairs; i++) {
    const x = LION_ROAD.startX - i * gap;
    out.push({ pos: [x, 0, -(LION_ROAD.width / 2 + 2.2)], rotY: 0 }, { pos: [x, 0, LION_ROAD.width / 2 + 2.2], rotY: Math.PI });
  }
  return out;
}

export const TOWER = { w: 12, d: 14, h: 7.2, roofH: 4.2 };
/** 10 kule */
export function towers(): { name: string; pos: V3 }[] {
  const roadEnd = LION_ROAD.startX - LION_ROAD.length, px = PLAZA.w / 2 + 7, pz = PLAZA.d / 2 + 8;
  return [
    { name: 'İstiklal', pos: [roadEnd - 10, 0, -16] },
    { name: 'Hürriyet', pos: [roadEnd - 10, 0, 16] },
    { name: 'Mehmetçik', pos: [-px, 0, -19] },
    { name: 'Müdafaa-i Hukuk', pos: [-px, 0, 19] },
    { name: 'İnkılap', pos: [-px, 0, -pz] },
    { name: 'Cumhuriyet', pos: [px, 0, -pz] },
    { name: 'Barış', pos: [-24, 0, pz] },
    { name: 'Zafer', pos: [24, 0, pz] },
    { name: '23 Nisan', pos: [px, 0, -19] },
    { name: 'Misak-ı Millî', pos: [px, 0, 19] },
  ];
}

/** Meydanı çevreleyen sütunlu galeriler: çatı levhaları ve sütun konumları */
export function porticos(): { roofs: Box[]; pillars: V3[] } {
  const roofs: Box[] = [], pillars: V3[] = [], H = 6.4, D = 8, pz = PLAZA.d / 2, px = PLAZA.w / 2;
  const row = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.round(len / 5);
    for (let i = 0; i <= n; i++) pillars.push([x0 + ((x1 - x0) * i) / n, H / 2, z0 + ((z1 - z0) * i) / n]);
  };
  // mozolenin karşısındaki uzun kenar (İnönü'nün lahdi ortada)
  roofs.push({ pos: [0, H + 0.45, pz + D / 2], size: [PLAZA.w + 2 * D, 0.9, D] }); row(-px, pz + 0.8, px, pz + 0.8);
  // kısa kenarlar: ortada giriş boşluğu
  for (const s of [-1, 1]) for (const [a, b] of [[-pz, -12], [12, pz]] as const) {
    roofs.push({ pos: [s * (px + D / 2), H + 0.45, (a + b) / 2], size: [D, 0.9, b - a] });
    row(s * (px + 0.8), a, s * (px + 0.8), b);
  }
  // mozole tarafı: merdivenin iki yanı
  for (const s of [-1, 1]) {
    const a = STAIRS.width / 2 + 6, b = px;
    roofs.push({ pos: [(s * (a + b)) / 2, H + 0.45, -(pz + D / 2)], size: [b - a, 0.9, D] });
    row(s * a, -(pz + 0.8), s * b, -(pz + 0.8));
  }
  return { roofs, pillars };
}

export const FLAGPOLE = { pos: [PLAZA.w / 2 + 32, 0, 0] as V3, h: 29.53 };
export const INONU = { pos: [0, 0, PLAZA.d / 2 + 4] as V3 };

/** Ağaçların giremeyeceği alanlar (x0, z0, x1, z1) */
export const KEEP_OUT: [number, number, number, number][] = [
  [-PLAZA.w / 2 - 22, MAUSOLEUM.z - MAUSOLEUM.d / 2 - 18, PLAZA.w / 2 + 44, PLAZA.d / 2 + 22],
  [LION_ROAD.startX - LION_ROAD.length - 26, -26, LION_ROAD.startX + 4, 26],
];
export const isClear = (x: number, z: number) => KEEP_OUT.every(([x0, z0, x1, z1]) => x < x0 || x > x1 || z < z0 || z > z1);

/** Kamera pozları: hedef, uzaklık, yatay açı (azimut) ve dikey açı (kutup) */
export interface Pose { target: V3; distance: number; azimuth: number; polar: number }
const roadMid = LION_ROAD.startX - LION_ROAD.length / 2;
export const POSES: Record<string, Pose> = {
  overview: { target: [-30, 0, -30], distance: 330, azimuth: 0.5, polar: Math.PI / 4 },
  entrance: { target: [0, PODIUM_H + 7, MAUSOLEUM_FRONT_Z], distance: 60, azimuth: 0.22, polar: 1.36 },
  mozole: { target: [0, PODIUM_H + 6, MAUSOLEUM.z + 6], distance: 135, azimuth: 0.35, polar: 1.12 },
  'aslanli-yol': { target: [roadMid + 40, 0, 0], distance: 150, azimuth: -1.15, polar: 1.05 },
  'toren-meydani': { target: [0, 0, 0], distance: 150, azimuth: 0.2, polar: 0.62 },
  muze: { target: [40, 3, -PLAZA.d / 2 - 4], distance: 85, azimuth: 0.5, polar: 1.1 },
  inonu: { target: [0, 3, PLAZA.d / 2 + 4], distance: 70, azimuth: Math.PI, polar: 1.1 },
  kuleler: { target: [LION_ROAD.startX - LION_ROAD.length - 6, 4, 0], distance: 80, azimuth: -1.9, polar: 1.1 },
  bayrak: { target: [FLAGPOLE.pos[0], 14, 0], distance: 90, azimuth: 1.2, polar: 1.2 },
};
/** Hotspot işaretçilerinin sahnedeki konumu */
export const HOTSPOTS: Record<string, V3> = {
  mozole: [0, PODIUM_H + MAUSOLEUM.h + 6, MAUSOLEUM.z],
  'aslanli-yol': [roadMid, 7, 0],
  'toren-meydani': [0, 5, 6],
  muze: [44, 11, -PLAZA.d / 2 - 4],
  inonu: [0, 11, PLAZA.d / 2 + 4],
  kuleler: [LION_ROAD.startX - LION_ROAD.length - 10, 16, 0],
  bayrak: [FLAGPOLE.pos[0], FLAGPOLE.h + 5, 0],
};
