/**
 * Zonguldak — Tios (Filyos) Antik Kenti: "Gözcü Kulesi" (kısa). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney; kuzey (−z) deniz. Batıda denize uzanan akropol tepesi (surlar, güneydoğuda kapı ve rampa, içinde sarnıç ve
 * tapınak terası), tepenin batısında sular altındaki antik mendirek, doğuda Filyos (Billaios) Çayı'nın ağzı, kıyıya yakın tiyatro,
 * güneyde kent merkezi (hamam, nymphaeum, taş döşeli yol), su kemeri ve nekropol.
 * Mekanik: akropolün kuzeybatısındaki gözcü noktasından bakarak beş yeri bulmak (bakış yönü hedefe yeterince yakınken E).
 * Yerleşim, ölçüler ve yapıların biçimi TEMSİLÎDİR.
 */
export type V2 = [number, number];
export type V3 = [number, number, number];
export type Rect = [number, number, number, number];
export const BOUNDS = { x0: -60, x1: 110, z0: -44, z1: 75 };
export const SEA_Z = -44;
/** Akropol: elips tepe, düzlük 12 m; güneydoğuda yumuşak rampa, öbür yanlarda dik yamaç */
export const ACRO = { cx: -20, cz: -22, rx: 26, rz: 20, h: 12, wall: 0.9 };
const RAMP = [Math.SQRT1_2, Math.SQRT1_2];   // güneydoğu
export function acroD(x: number, z: number) { return Math.hypot((x - ACRO.cx) / ACRO.rx, (z - ACRO.cz) / ACRO.rz); }
/** Gözcü kulesi (kuzeybatı): kare kule; güney yüzündeki kapıdan E ile çıkılır (tırmanış canlandırılmaz) */
export const TOWER = { x0: -38.5, x1: -33.5, z0: -32.5, z1: -27.5, h: 12 };
export const TOWER_DOOR: V2 = [-36, -26];
export function groundY(x: number, z: number): number {
  const d = acroD(x, z); if (d <= 1) return ACRO.h;
  const ux = (x - ACRO.cx) / ACRO.rx, uz = (z - ACRO.cz) / ACRO.rz, l = Math.hypot(ux, uz), dot = (ux * RAMP[0] + uz * RAMP[1]) / l;
  const ramp = Math.max(0, (dot - 0.82) / 0.18), w = 0.14 + ramp * 0.95, t = Math.min(1, (d - 1) / w);
  return ACRO.h * (1 - t * t * (3 - 2 * t));
}
/** Sur: düzlüğün kenarında halka, güneydoğuda kapı boşluğu */
export const GATE = { a: Math.atan2(RAMP[1] * ACRO.rz, RAMP[0] * ACRO.rx), half: 0.13 };
export const angDiff = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export const CISTERN: Rect = [-26, -26, -19, -20];
export const TEMPLE: Rect = [-14, -32, -4, -24];
export const THEATRE = { c: [34, -24] as V2, r0: 6, r1: 20 };
export const BATH: Rect = [12, 22, 28, 34];
export const NYMPH: Rect = [34, 18, 46, 21];
export const AQUEDUCT = { z: 60, x0: -20, x1: 70 };
export const RIVER = { x0: 92, x1: 106 };
export const SKENE: Rect = [THEATRE.c[0] - 14, THEATRE.c[1] - 10.5, THEATRE.c[0] + 14, THEATRE.c[1] - 7.5];
const RECTS: Rect[] = [CISTERN, TEMPLE, BATH, NYMPH, SKENE, [TOWER.x0, TOWER.z0, TOWER.x1, TOWER.z1]];
const inR = (x: number, z: number, r: Rect, p: number) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p;
export function walkable(x: number, z: number): boolean {
  const p = 0.4;
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < SEA_Z + 2 || z > BOUNDS.z1 - 1) return false;
  if (x > RIVER.x0 - p && x < RIVER.x1 + p) return false;
  const d = acroD(x, z); if (Math.abs(d - ACRO.wall) < 0.06 && angDiff(Math.atan2((z - ACRO.cz) / ACRO.rz, (x - ACRO.cx) / ACRO.rx), GATE.a) > GATE.half) return false;
  { const dx = x - THEATRE.c[0], dz = z - THEATRE.c[1], r = Math.hypot(dx, dz); if (r < THEATRE.r1 + p && dz > -p && r > THEATRE.r0 - p) return false; }
  if (Math.abs(z - AQUEDUCT.z) < 1 + p && x > AQUEDUCT.x0 && x < AQUEDUCT.x1 && Math.round((x - AQUEDUCT.x0) / 6) * 6 + AQUEDUCT.x0 - x > -1 - p && Math.round((x - AQUEDUCT.x0) / 6) * 6 + AQUEDUCT.x0 - x < 1 + p) return false;   // kemer ayakları
  return !RECTS.some((r) => inR(x, z, r, p));
}
/** Eğim sınırı: dik yamaçtan çıkılmaz/inilmez */
export const MAX_SLOPE = 0.9;
const ok = (x0: number, z0: number, x1: number, z1: number) => { if (!walkable(x1, z1)) return false; const L = Math.hypot(x1 - x0, z1 - z0); return L < 1e-6 || Math.abs(groundY(x1, z1) - groundY(x0, z0)) / L < MAX_SLOPE; };
export function slide(p: V2, dx: number, dz: number): V2 { let [x, z] = p; if (ok(x, z, x + dx, z)) x += dx; if (ok(x, z, x, z + dz)) z += dz; return [x, z]; }

/* ===================== kaynaklar ===================== */
export interface Source { title: string; url: string }
export const SRC = {
  belleten: { title: 'Belleten — Tios (Tieion) üzerine makale', url: 'https://belleten.gov.tr/tam-metin/3656/tur' },
  kure: { title: 'Küre Ansiklopedi — Filyos (Tios) Örenyeri', url: 'https://kureansiklopedi.com/tr/detay/filyos-tios-orenyeri' },
  sonmez: { title: 'Sönmez 2008 — Tios (liman)', url: 'https://www.ancientportsantiques.com/wp-content/uploads/Documents/PLACES/Bosphorus-BlackSea/Tios-Sonmez2008.pdf' },
  ht: { title: 'Habertürk — 2700 yıllık antik kentin kriptosu ortaya çıkartıldı', url: 'https://www.haberturk.com/2700-yillik-antik-kentin-kriptosu-ortaya-cikartildi-2730629' },
  savunma: { title: 'Trakya Üniversitesi — Tios antik kenti savunma mimarisi', url: 'https://acikerisim.trakya.edu.tr/items/4868aa6e-2cd3-45fb-857f-e8993d7978d1' },
};

/* ===================== gözcü noktası ve hedefler ===================== */
export const WATCH: V2 = [-36, -30];
export const EYE = 1.62;
export const WATCH_EYE: V3 = [WATCH[0], ACRO.h + TOWER.h + EYE, WATCH[1]];
/** Kulede bakılan yönün korkuluğuna yaslanılır: göz, kule merkezinden bakış yönünde 2,3 m öndedir */
export const LEAN = 2.3;
export const eyeAt = (yaw: number): V3 => [WATCH_EYE[0] - Math.sin(yaw) * LEAN, WATCH_EYE[1], WATCH_EYE[2] - Math.cos(yaw) * LEAN];
export interface Target { id: string; name: string; kicker: string; at: V3; text: string; source: Source }
export const TARGETS: Target[] = [
  { id: 'liman', name: 'Batık liman', kicker: 'Batıda, denizde', at: [-70, -0.5, -62], source: SRC.sonmez,
    text: 'Akropolün batısında denize doğru uzanan antik liman ve mendireklerin bir bölümü bugün su altındadır. (Oyunda mesafe kısaltılmıştır; mendireğin biçimi temsilîdir.)' },
  { id: 'tiyatro', name: 'Tiyatro', kicker: 'Kıyıda', at: [34, 3, -13], source: SRC.kure,
    text: 'Kazılarda yaklaşık 5 bin kişilik bir tiyatro ortaya çıkarıldı; tiyatro kazısında iki heykel parçası da bulundu. (Tiyatronun ölçüleri temsilîdir.)' },
  { id: 'nehir', name: 'Filyos Çayı\'nın ağzı', kicker: 'Doğuda', at: [99, 0, -40], source: SRC.belleten,
    text: 'Kent, antik çağda Billaios diye bilinen Filyos Çayı\'nın denize döküldüğü yerin yakınında kuruldu. (Nehrin konumu temsilîdir.)' },
  { id: 'kemer', name: 'Su kemeri', kicker: 'Güneyde', at: [25, 6, 60], source: SRC.belleten,
    text: 'Kente su getiren bir su kemeri, kazılarda ortaya çıkan yapılar arasındadır. (Kemerin yönü ve uzunluğu temsilîdir.)' },
  { id: 'nekropol', name: 'Nekropol', kicker: 'Güneydoğuda', at: [70, 1, 40], source: SRC.kure,
    text: 'Kentin mezarlık alanı (nekropol) da kazılan alanlar arasındadır. (Mezarların yeri ve biçimi temsilîdir.)' },
];
/** Bakış yönü hedefe yeterince yakın mı: en yakın bulunmamış hedefin indeksi ve açısı (radyan) */
export function aimAt(yaw: number, pitch: number, found: string[], from: V3 = eyeAt(yaw)) {
  const fx = -Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = -Math.cos(yaw) * Math.cos(pitch);
  let best = -1, ba = Infinity;
  TARGETS.forEach((t, i) => { if (found.includes(t.id)) return; const dx = t.at[0] - from[0], dy = t.at[1] - from[1], dz = t.at[2] - from[2], l = Math.hypot(dx, dy, dz);
    const a = Math.acos(Math.max(-1, Math.min(1, (fx * dx + fy * dy + fz * dz) / l))); if (a < ba) { ba = a; best = i; } });
  return { k: best, angle: ba };
}
export const AIM_TOL = 0.12;   // ≈ 7°
export const nearDoor = (x: number, z: number) => Math.hypot(x - TOWER_DOOR[0], z - TOWER_DOOR[1]) < 1.8;

/* ===================== duraklar ===================== */
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source }
export const SPOTS: Spot[] = [
  { id: 'koloni', name: 'Milet kolonisi', kicker: 'MÖ 7. yüzyıl', at: [6, 6], reach: 4, source: SRC.belleten,
    text: 'Tios, MÖ 7. yüzyılın ikinci yarısında Miletoslu koloniciler tarafından kuruldu; kurucusunun Tios adlı bir rahip olduğu anlatılır. Akropolde bulunan İon seramikleri bu bağlantıyı destekler.' },
  { id: 'sur', name: 'Surlar', kicker: 'Akropol kapısı', at: [-3, -5], reach: 4, source: SRC.savunma,
    text: 'Akropolün savunma duvarları farklı dönemlerde onarılıp eklemeler yapılarak kullanıldı; bir çalışmaya göre son evre Ceneviz dönemine aittir. (Surun planı temsilîdir.)' },
  { id: 'sarnic', name: 'Sarnıç', kicker: 'Akropol', at: [-22.5, -17.5], reach: 3.5, source: SRC.kure,
    text: 'Akropolde bir su sarnıcı bulundu. Kuşatma ya da kuraklıkta suyun saklanması için kullanılırdı. (Biçimi temsilîdir.)' },
  { id: 'kripta', name: 'Tapınak terası ve kripta', kicker: 'Akropol', at: [-9, -21.5], reach: 3.5, source: SRC.ht,
    text: 'Akropolde bir tapınak terası bulunur; haberlere göre kazılarda bir tapınağa ait kripta (yeraltı odası) ve adak eşyaları ortaya çıkarıldı. (Yapının biçimi temsilîdir.)' },
  { id: 'hamam', name: 'Hamam ve nymphaeum', kicker: 'Kent merkezi', at: [31, 26], reach: 4, source: SRC.kure,
    text: 'Kent merkezinde bir hamam, bir çeşme anıtı (nymphaeum) ve taş döşeli yollar kısmen açığa çıkarıldı. Kazılar 2006\'da Sümer Atasoy başkanlığında başladı. (Yapıların biçimi temsilîdir.)' },
];
export const CARD_ALL = { id: 'gozcu', name: 'Gözcünün haritası', kicker: 'Beş yer',
  text: 'Kuleden limanı, tiyatroyu, nehir ağzını, su kemerini ve nekropolü buldun. Akropol, limanı ve nehir ağzını aynı anda görebilen bir yerdeydi. (Gözcü noktası ve yerleşim temsilîdir.)', source: SRC.belleten };
export const START: { at: V2; yaw: number } = { at: [20, 50], yaw: 0.6 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
