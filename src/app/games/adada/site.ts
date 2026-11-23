/**
 * Adada Antik Kenti (Isparta) — "Dağ Eteğindeki Kent": sütunlu ana cadde, taş döşemeli agora, Trajan Tapınağı kalıntısı, yamaca oturan tiyatro
 * ve 5 durak (saf veri; three.js'siz, test edilir). Öteki yeni oyunlarla aynı düzen.
 *
 * Eksenler: +z güney (giriş, cadde başı), −z kuzey (tapınak ve tiyatro yamacı). Arazi kuzeye ve doğuya doğru yükselir; tiyatro çanağı kuzeybatıda.
 * Ölçüler, yerleşim ve yapı biçimleri TEMSİLÎDİR (docs/ADADA.md).
 */
export type V2 = [number, number];
type Rect = { x0: number; x1: number; z0: number; z1: number };
const inR = (r: Rect, x: number, z: number, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;

/** Yürünebilir alan (kent düzlüğü ve yamaç eteği) */
export const AREA: Rect = { x0: -42, x1: 26, z0: -46, z1: 44 };
/** Ana cadde: yol ve iki yanındaki stoa sütun sıraları (sütunlar yürünmez) */
export const STREET = { cx: -18, half: 3.6, colL: -22.8, colR: -13.2, z0: -40, z1: 40, step: 3.2, r: 0.45 };
/** Agora: taş döşeli meydan (caddenin doğusunda) */
export const AGORA: Rect = { x0: -10, x1: 14, z0: -12, z1: 14 };
/** Trajan Tapınağı: podyum (yürünmez) ve ön basamak yönü (güney) */
export const TEMPLE: Rect = { x0: -2, x1: 10, z0: -30, z1: -19 };
/** Tiyatro: orkestra merkezi, kavea yarıçap aralığı (kuzeye ve batıya doğru yükselir) */
export const THEATRE = { c: [-28, -30] as V2, r0: 6, r1: 20 };
/** Akropol kulesi (doğuda; yürünmez) */
export const TOWER = { c: [24, -6] as V2, r: 3 };

export const COLUMNS: V2[] = (() => { const out: V2[] = [];
  for (let z = STREET.z0; z <= STREET.z1 + 0.01; z += STREET.step) { out.push([STREET.colL, z]); out.push([STREET.colR, z]); }
  return out; })();

/** Arazi: kuzeye ve doğuya doğru hafif yükselir; tiyatro çanağında yamaç dikleşir */
export function groundY(x: number, z: number): number {
  const base = 0.04 * -z + 0.02 * (x + 40);
  const dx = x - THEATRE.c[0], dz = z - THEATRE.c[1], r = Math.hypot(dx, dz);
  const radial = 0.2 * Math.max(0, Math.min(r, THEATRE.r1) - THEATRE.r0);
  const north = Math.max(0, Math.min(1, -dz / 10 + 0.3));
  return base + radial * north;
}
export function walkable(x: number, z: number): boolean {
  if (!inR(AREA, x, z, 0.4)) return false;
  if (inR(TEMPLE, x, z, -0.5)) return false;
  if (Math.hypot(x - TOWER.c[0], z - TOWER.c[1]) < TOWER.r + 0.5) return false;
  for (const c of COLUMNS) if (Math.hypot(x - c[0], z - c[1]) < STREET.r + 0.35) return false;
  return true;
}
export function slide(p: V2, dx: number, dz: number): V2 {
  let [x, z] = p;
  if (walkable(x + dx, z)) x += dx;
  if (walkable(x, z + dz)) z += dz;
  return [x, z];
}

/* ===================== duraklar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  hurriyet: { title: 'Hürriyet Daily News — Ancient city reveals traces of 17 centuries of uninterrupted life', url: 'https://www.hurriyetdailynews.com/ancient-city-reveals-traces-of-17-centuries-of-uninterrupted-life-221078' },
  sdu: { title: 'Süleyman Demirel Üniversitesi — Adada Ancient City Survey', url: 'https://insantoplum.sdu.edu.tr/arkeoloji/en/surveys/adada-ancient-city-survey-14248s.html' },
  kure: { title: 'Küre Ansiklopedisi — Adada Antik Kenti', url: 'https://kureansiklopedi.com/tr/detay/adada-antik-kenti-798de' },
  lonely: { title: 'Lonely Planet — Adada', url: 'https://www.lonelyplanet.com/turkey/lake-district/attractions/adada/a/poi-sig/1543711/1319708' },
  wiki: { title: 'Wikipedia — Adada (Pisidia)', url: 'https://en.wikipedia.org/wiki/Adada,_Pisidia' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 4.6): Spot => ({ id, name, kicker, at, reach, text, source, mark });
const gy = (x: number, z: number, up: number): [number, number, number] => [x, groundY(x, z) + up, z];
export const SPOTS: Spot[] = [
  mk('kent', 'Dağ eteğindeki kent', 'Kent', [-16, 32], gy(-16, 32, 4.2),
    'Adada, Isparta\'nın Sütçüler ilçesinde, Sağrak köyü yakınında, Toros Dağları\'nın eteğinde kurulmuş bir Pisidia kentidir. Kazı raporları, yerleşimin yaklaşık 17 yüzyıl boyunca kesintisiz sürdüğünü gösteriyor.', SRC.hurriyet, 5.4),
  mk('cadde', 'Sütunlu cadde', 'Cadde', [-18, 10], gy(-18, 10, 4.4),
    'Agoranın batısından geçen ana caddenin iki yanında stoalar (sütunlu galeriler) yer alır. Oyundaki sütun sayısı ve yükseklikleri temsilîdir.', SRC.sdu, 4.6),
  mk('agora', 'Agora', 'Meydan', [2, 2], gy(2, 2, 3.2),
    'Akropolün batısındaki agora, Helenistik ve erken Roma İmparatorluk dönemlerinde kentin ticari, idari ve dini merkeziydi. Kaynaklar, kentteki kamu yapılarının meclis kararlarıyla yaptırıldığını bildirir.', SRC.sdu, 5.4),
  mk('trajan', 'Trajan Tapınağı', 'Tapınak', [4, -15], gy(4, -15, 5.6),
    'Trajan Tapınağı, Adada\'da hâlâ görülebilen kalıntılar arasında anılır; Pisidia\'daki tapınaklar içinde iyi bilinen örneklerden sayılır. Tapınağın yeri ve biçimi bu oyunda temsilîdir.', SRC.lonely, 4.8),
  mk('tiyatro', 'Tiyatro', 'Tiyatro', [-28, -30], gy(-28, -30, 3.6),
    'Tiyatro, ovanın kuzeybatısında, tepenin yamacına oturur. Kapasitesi kaynaklarda tutarsız verilir (birkaç yüzden birkaç bine kadar), bu yüzden oyunda rakam yok. Oyundaki oturma sıraları temsilîdir.', SRC.sdu, 5.4),
];
export const START: { at: V2; yaw: number } = { at: [-18, 40], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
export const BOUNDS = { x0: -46, x1: 30, z0: -50, z1: 48 };
