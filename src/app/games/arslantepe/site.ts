/**
 * Malatya — Arslantepe Höyüğü: "Mühür ve Kapı" (detaylı). Saf veri (three.js'siz, test edilir).
 *
 * Eksenler: +x doğu, +z güney. Höyüğün güney eteğinde Geç Hitit dönemine ait aslanlı kapının ve kral heykelinin kopyaları; yokuştan
 * höyüğün düzlüğüne çıkılır. Düzlükte koruma çatısının altında kerpiç saray (MÖ 3350 dolayı): doğudan girilen koridor, kuzeyinde dört
 * depo (mühürlü kapılar), güneyinde dağıtım salonu ve tören salonu. Batı eteğinde "kral mezarı" (sandık mezar).
 *
 * Mekanik: sarayda depo kapıları kil mühürlerle (cretula) kapatılırdı. Her kapının mührünün üstündeki baskı, bir mührün AYNA
 * görüntüsüdür ve döndürülmüş olabilir. Görevlinin masasındaki altı mühürden doğrusunu seç; kapı açılır. Desenler TEMSİLÎDİR.
 */
export type V2 = [number, number];

/* ===================== höyük ===================== */
export const MOUND = { rx: 130, rz: 95, h: 24, top: 10 };
export function terrain(x: number, z: number): number { const r2 = (x / MOUND.rx) ** 2 + (z / MOUND.rz) ** 2; if (r2 >= 1) return 0; const raw = MOUND.h * (1 - r2) ** 1.4; return raw > MOUND.top ? MOUND.top + (raw - MOUND.top) * 0.04 : raw; }

/* ===================== saray ===================== */
export const PAL = { x0: -24, x1: 24, z0: -12, z1: 8, t: 0.8, h: 2.6 };
export const COR = { z0: -2, z1: 2 };
export const FLOOR_Y = MOUND.top + 0.15;
export interface Room { id: string; x0: number; x1: number; z0: number; z1: number; door: number; side: 'n' | 's' }
export const ROOMS: Room[] = [
  { id: 'd1', x0: -24, x1: -12, z0: -12, z1: -2, door: -18, side: 'n' },
  { id: 'd2', x0: -12, x1: 0, z0: -12, z1: -2, door: -6, side: 'n' },
  { id: 'd3', x0: 0, x1: 12, z0: -12, z1: -2, door: 6, side: 'n' },
  { id: 'd4', x0: 12, x1: 24, z0: -12, z1: -2, door: 18, side: 'n' },
  { id: 'dagitim', x0: -24, x1: 0, z0: 2, z1: 8, door: -12, side: 's' },
  { id: 'toren', x0: 0, x1: 24, z0: 2, z1: 8, door: 12, side: 's' },
];
export const DOOR_W = 1.4;
/** Koruma çatısı */
export const ROOF = { x0: -32, x1: 32, z0: -18, z1: 14, y: 8 };

/* ===================== mühürler ===================== */
/** Mühür deseni: birim kare içinde (−1…1) kırık çizgiler; hepsi asimetrik (aynada farkı görünsün diye) */
export type Stroke = [number, number][];
export interface Seal { id: string; name: string; strokes: Stroke[] }
export const SEALS: Seal[] = [
  { id: 'kanca', name: 'Kanca', strokes: [[[-0.6, 0.7], [0.5, 0.7], [0.5, -0.2], [-0.1, -0.2]], [[-0.6, -0.6], [0.2, -0.6]]] },
  { id: 'bayrak', name: 'Bayrak', strokes: [[[-0.5, -0.8], [-0.5, 0.8], [0.6, 0.5], [-0.5, 0.2]], [[0.2, -0.7], [0.6, -0.3]]] },
  { id: 'sarmal', name: 'Sarmal', strokes: [[[0, 0], [0.3, 0], [0.3, 0.35], [-0.35, 0.35], [-0.35, -0.4], [0.65, -0.4], [0.65, 0.7]]] },
  { id: 'basak', name: 'Başak', strokes: [[[0, -0.8], [0, 0.8]], [[0, 0.5], [0.5, 0.8]], [[0, 0.1], [0.5, 0.4]], [[0, -0.3], [-0.5, 0]]] },
  { id: 'dag', name: 'Dağ', strokes: [[[-0.8, -0.5], [-0.3, 0.6], [0.1, -0.1], [0.4, 0.3], [0.8, -0.5]], [[-0.6, -0.75], [0.3, -0.75]]] },
  { id: 'boynuz', name: 'Boynuz', strokes: [[[-0.6, -0.6], [-0.2, 0.2], [-0.4, 0.7]], [[-0.2, 0.2], [0.5, 0.4], [0.7, 0.8]], [[0.1, -0.7], [0.1, -0.3]]] },
];
/** Kapı mühürleri: hangi mühür, baskının dönme açısı (derece) */
export const LOCKS: { room: string; seal: string; rot: number }[] = [
  { room: 'd1', seal: 'kanca', rot: 90 },
  { room: 'd2', seal: 'sarmal', rot: 180 },
  { room: 'd3', seal: 'basak', rot: 270 },
  { room: 'd4', seal: 'boynuz', rot: 45 },
];
/** Baskı = mührün ayna görüntüsü (x → −x), sonra döndürülmüş */
export function impression(seal: Seal, rotDeg: number): Stroke[] { const a = (rotDeg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return seal.strokes.map((st) => st.map(([x, y]) => { const mx = -x; return [mx * c - y * s, mx * s + y * c] as [number, number]; })); }
export const sealFits = (room: string, sealId: string) => LOCKS.find((l) => l.room === room)?.seal === sealId;
/** İki desenin (sıra dahil) aynı olup olmadığı */
export function sameShape(a: Stroke[], b: Stroke[], eps = 1e-6) { return a.length === b.length && a.every((s, i) => s.length === b[i].length && s.every((p, j) => Math.abs(p[0] - b[i][j][0]) < eps && Math.abs(p[1] - b[i][j][1]) < eps)); }

/* ===================== yürüyüş ===================== */
export const BOUNDS = { x0: -110, x1: 110, z0: -80, z1: 100 };
export const GATE = { z: 82, x: 0, w: 4 };
export const TOMB: V2 = [-72, 16];
const inPal = (x: number, z: number, m: number) => x > PAL.x0 - m && x < PAL.x1 + m && z > PAL.z0 - m && z < PAL.z1 + m;
/** Saray içi: odalar ve koridor; duvar payı m */
function inside(x: number, z: number, open: string[]): boolean {
  const m = 0.75;
  if (x > PAL.x0 + m && x < PAL.x1 + PAL.t + 0.4 && z > COR.z0 + 0.4 && z < COR.z1 - 0.4) return x < PAL.x1 + 0.6 || Math.abs(z) < 1.4;   // koridor (doğu ucu açık)
  for (const r of ROOMS) {
    const inRoom = x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
    const wallZ = r.side === 'n' ? COR.z0 : COR.z1, inDoor = Math.abs(x - r.door) < DOOR_W / 2 - 0.2 && Math.abs(z - wallZ) <= 0.8;
    if (inRoom) return r.side === 's' || open.includes(r.id);
    if (inDoor) return r.side === 's' || open.includes(r.id);
  }
  return false;
}
export function walkable(x: number, z: number, open: string[] = []): boolean {
  if (x < BOUNDS.x0 + 1 || x > BOUNDS.x1 - 1 || z < BOUNDS.z0 + 1 || z > BOUNDS.z1 - 1) return false;
  if (inPal(x, z, 0.4)) return inside(x, z, open);
  if (Math.abs(x - GATE.x) > GATE.w / 2 - 0.3 && Math.abs(x - GATE.x) < GATE.w / 2 + 3.2 && z > GATE.z - 1.8 && z < GATE.z + 4.4) return false;   // kapı ayakları ve aslanlar
  if (Math.hypot(x - TOMB[0], z - TOMB[1]) < 2.6) return false;
  if (Math.hypot(x - 7, z - (GATE.z - 4)) < 1.2) return false;   // kral heykeli
  return true;
}
export function groundY(x: number, z: number): number { return inPal(x, z, 0.4) ? FLOOR_Y : terrain(x, z); }
export function slide(p: V2, dx: number, dz: number, open: string[] = []): V2 {
  let [x, z] = p; const y = groundY(x, z);
  if (walkable(x + dx, z, open) && Math.abs(groundY(x + dx, z) - y) < 0.6) x += dx;
  if (walkable(x, z + dz, open) && Math.abs(groundY(x, z + dz) - groundY(x, z)) < 0.6) z += dz;
  return [x, z];
}
/** Kapı başı (koridorda, kapının önü) */
export const doorFront = (r: Room): V2 => [r.door, r.side === 'n' ? COR.z0 + 0.9 : COR.z1 - 0.9];
export const LOCK_REACH = 1.4;
export function nearestLock(x: number, z: number, open: string[]): Room | null { for (const r of ROOMS) { if (r.side !== 'n' || open.includes(r.id)) continue; const [fx, fz] = doorFront(r); if (Math.hypot(x - fx, z - fz) < LOCK_REACH) return r; } return null; }
/** Görevlinin masası (mühürler burada): koridorun doğu girişinde */
export const DESK: V2 = [20.5, 1.2];

/* ===================== duraklar ve kartlar ===================== */
export interface Source { title: string; url: string }
export interface Spot { id: string; name: string; kicker: string; at: V2; reach: number; text: string; source: Source; mark: [number, number, number] }
const SRC = {
  unesco: { title: 'UNESCO — Arslantepe Mound', url: 'https://whc.unesco.org/en/list/1622' },
  dossier: { title: 'UNESCO — Arslantepe adaylık dosyası', url: 'https://whc.unesco.org/document/172312' },
  ktb: { title: 'Kültür ve Turizm Bakanlığı — Arslantepe Açık Hava Müzesi', url: 'https://ktb.gov.tr/EN-327324/arslantepe-open-air-museum.html' },
  sabah: { title: 'Daily Sabah — Arslantepe UNESCO listesinde', url: 'https://www.dailysabah.com/arts/turkeys-eastern-site-of-arslantepe-on-unesco-list/news' },
  arch: { title: 'Archaeology — Arslantepe seals and bureaucracy', url: 'https://archaeology.org/news/2021/09/07/210908-arslantepe-seals-bureaucracy/' },
  whs: { title: 'World Heritage Site — Arslantepe Mound', url: 'https://www.worldheritagesite.org/list/id/1622' },
  arkeonews: { title: 'Arkeonews — Arslantepe kılıçları', url: 'https://arkeonews.net/forged-5000-years-ago-the-worlds-oldest-swords-discovered-at-arslantepe-mound-turkiye/' },
};
const mk = (id: string, name: string, kicker: string, at: V2, mark: [number, number, number], text: string, source: Source, reach = 3.5): Spot => ({ id, name, kicker, at, reach, text, source, mark });
export const SPOTS: Spot[] = [
  mk('aslan', 'Aslanlı kapı', 'Geç Hitit', [0, GATE.z + 5], [0, 4.6, GATE.z],
    'Höyüğe adını veren aslanlar, Geç Hitit döneminde kentin kapısının iki yanında duruyordu; yakında bir kral heykeli (Tarhunza) de bulundu. Asılları Ankara\'dadır; burada kopyaları görülür.', SRC.sabah),
  mk('unesco', 'Devletin doğuşu', 'UNESCO 2021', [12, 40], [12, 7.5, 36],
    'Arslantepe 2021\'de UNESCO Dünya Mirası Listesi\'ne girdi. Yakın Doğu\'da devlet düzenine geçişin en erken izlerini taşıyan yerlerden biri sayılır: yönetim, depolama ve tören işlevleri aynı yapı topluluğunda bir araya gelir.', SRC.unesco),
  mk('muze', 'Açık hava müzesi', 'Bugün', [28, 0], [26, 4, 0],
    'Kazı alanı 2011\'den beri açık hava müzesi olarak gezilebiliyor: kerpiç saray, koruma çatısı altında yerinde korunuyor. Buluntular Malatya Müzesi\'nde sergileniyor. (Çatının biçimi temsilîdir.)', SRC.ktb),
  mk('saray', 'Kerpiç saray', 'MÖ 3350', [16, -0.2], [10, FLOOR_Y + 3, -2],
    'MÖ 3350 dolayında 4.000 m²\'yi aşan bir alana kurulan yapı topluluğu, bilinen en eski saraylardan biri sayılır: depolar, dağıtım ve yönetim alanları, tören yerleri ve seçkinlerin konutları bir aradadır. (Oyundaki oda düzeni temsilîdir.)', SRC.dossier),
  mk('dagitim', 'Dağıtım salonu ve kâseler', 'Ekonomi', [-12, 4.6], [-12, FLOOR_Y + 1.6, 7],
    'Sarayda bulunan yüzlerce seri üretim kâse, yiyeceğin düzenli olarak ve bir yönetimin denetiminde dağıtıldığını gösterir. Bu tek tip kâseler, belki de çalışanlara verilen gündelik payların ölçüsüydü.', SRC.arch),
  mk('mezar', '"Kral mezarı"', 'MÖ 3100–3000', [TOMB[0] + 4.5, TOMB[1]], [TOMB[0], terrain(TOMB[0], TOMB[1]) + 2, TOMB[1]],
    'Höyüğün kenarındaki taş sandık mezar MÖ 3100–3000\'e tarihlenir ve içinden 75 metal eşya çıkmıştır. Zenginliği nedeniyle "kral mezarı" diye anılır; üstünde bulunan gençlerin kurban edilmiş olabileceği düşünülür.', SRC.whs),
];
/** Açılan depoların kartları */
export const ROOM_CARDS: Record<string, { name: string; kicker: string; text: string; source: Source }> = {
  d1: { name: 'Erzak deposu', kicker: 'Mühür açıldı · 1/4', text: 'Kapıları ve kapları kapatan kil mühürler (cretula) kimin neyi ne zaman açtığını kayda geçirirdi. Sarayda binlerce kırık mühür bulundu; çoğu, açıldıktan sonra belirli yerlerde biriktirilmişti. (Oyundaki küpler temsilîdir.)', source: SRC.arch },
  d2: { name: 'Mühür yığını', kicker: 'Mühür açıldı · 2/4', text: 'Kırılan mühürler atılmadan toplanıyordu: araştırmacılar bu yığınlardaki baskılardan kapı mandalına sarılan ip ve kil ile kurulan kapatma düzenini yeniden çizebildi. Mühür baskısı, mührün ayna görüntüsüdür.', source: SRC.dossier },
  d3: { name: 'Kâse deposu', kicker: 'Mühür açıldı · 3/4', text: 'Seri üretim kâseler üst üste dizilirdi. Kapıyı mühürleyen görevli, deponun içindekilerden sorumluydu; mühür kırılmadan kapı açılamazdı. (Oda ve istif biçimi temsilîdir.)', source: SRC.arch },
  d4: { name: 'Kılıçlar', kicker: 'Mühür açıldı · 4/4', text: 'Sarayda arsenikli bakırdan yapılmış silahlar bulundu; bazılarında gümüş kakma vardır. Aralarındaki dokuz kılıç MÖ 3300 dolayına tarihlenir ve UNESCO dosyasında bilinen en erken kılıç örnekleri olarak geçer.', source: SRC.dossier },
};
export const START: { at: V2; yaw: number } = { at: [0, 94], yaw: 0 };
export function nearestSpot(x: number, z: number): Spot | null {
  let best: Spot | null = null, bd = Infinity;
  for (const s of SPOTS) { const d = Math.hypot(s.at[0] - x, s.at[1] - z); if (d < s.reach && d < bd) { bd = d; best = s; } }
  return best;
}
